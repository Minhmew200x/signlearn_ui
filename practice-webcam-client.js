const DEFAULT_RECORD_DURATION_MS = 4000;
const DEFAULT_COUNTDOWN_SECONDS = 3;
const DEFAULT_FRAME_INTERVAL_MS = 90;
const DEFAULT_MEDIAPIPE_WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';

export class PracticeWebcamClient {
    constructor(options) {
        if (!options || !options.signSlug) {
            throw new Error("signSlug is required");
        }

        this.options = {
            apiBaseUrl: "",
            countdownSeconds: DEFAULT_COUNTDOWN_SECONDS,
            frameIntervalMs: DEFAULT_FRAME_INTERVAL_MS,
            mediaRecorderMimeType: "video/webm;codecs=vp8,opus",
            recordDurationMs: DEFAULT_RECORD_DURATION_MS,
            uploadArtifacts: true,
            uploadEndpoint: "/api/v1/practice/uploads",
            videoConstraints: {
                video: {
                    facingMode: "user",
                    width: { ideal: 960 },
                    height: { ideal: 540 },
                },
                audio: false,
            },
            wasmBaseUrl: DEFAULT_MEDIAPIPE_WASM_BASE_URL,
            workerUrl: new URL("./practice-worker.js", import.meta.url).toString(),
            ...options,
        };

        this.videoElement = this.options.videoElement || this.#createHiddenVideoElement();
        this.statusElement = this.options.statusElement || null;
        this.scoreElements = {
            total: this.options.scoreElements?.total || null,
            dtw: this.options.scoreElements?.dtw || null,
            pose: this.options.scoreElements?.pose || null,
            motion: this.options.scoreElements?.motion || null,
            tracking: this.options.scoreElements?.tracking || null,
        };

        this.worker = null;
        this.workerReady = false;
        this.stream = null;
        this.busy = false;
        this.recordedBlob = null;
        this.recordedChunks = [];
        this.mediaRecorder = null;
        this.reference = null;
        this.modelAsset = null;
        this.scoringConfig = null;
        this.latestResult = null;
        this.captureStartedAt = 0;
        this.lastFrameSentAt = 0;
        this.animationFrameId = 0;
        this.isRecording = false;
        this.captureResolve = null;
        this.captureReject = null;
        this.finalizeResolve = null;
        this.finalizeReject = null;
        this.phase = 'idle';
    }

    async init() {
        this.#setPhase('loading_resources');
        this.#setStatus("Loading reference, model, and scoring config...");

        const [reference, modelAsset, scoringConfig] = await Promise.all([
            this.#fetchReferenceKeypoints(),
            this.#fetchModelAsset(),
            this.#fetchScoringConfig(),
        ]);

        this.reference = reference;
        this.modelAsset = modelAsset;
        this.scoringConfig = scoringConfig;

        await this.#resetWorker();
        this.#setPhase('worker_ready');
        this.#setStatus(`Ready for ${reference.label}.`);
        this.options.onReady?.({
            reference: this.reference,
            modelAsset: this.modelAsset,
            scoringConfig: this.scoringConfig,
        });
        return this;
    }

    async startPreview() {
        if (this.stream) {
            return;
        }
        if (!this.workerReady) {
            throw new Error("Worker is not ready. Call init() first.");
        }

        this.stream = await navigator.mediaDevices.getUserMedia(this.options.videoConstraints);
        this.videoElement.srcObject = this.stream;
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;
        await this.videoElement.play();
        this.#setPhase('camera_preview_on');
        this.#setStatus("Camera preview is running.");
    }

    stopPreview() {
        if (this.animationFrameId) {
            window.cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = 0;
        }

        if (this.stream) {
            for (const track of this.stream.getTracks()) {
                track.stop();
            }
        }

        this.stream = null;
        this.isRecording = false;
        this.busy = false;
        this.captureStartedAt = 0;
        this.lastFrameSentAt = 0;
        this.recordedBlob = null;
        this.recordedChunks = [];
        this.mediaRecorder = null;
        this.videoElement.srcObject = null;
        this.#setPhase(this.workerReady ? 'worker_ready' : 'idle');
    }

    async scoreOnce() {
        if (!this.workerReady) {
            throw new Error("Worker is not ready. Call init() first.");
        }
        if (!this.stream) {
            await this.startPreview();
        }

        this.#renderScore(null);
        this.recordedBlob = null;
        this.latestResult = null;

        await this.#runCountdown();
        this.#setPhase('recording');
        this.#startVideoRecording();
        await this.#captureForDuration();
        await this.#stopVideoRecording();

        this.#setPhase('processing');
        this.#setStatus("Scoring 4-second attempt...");
        const result = await this.#requestFinalScore();
        this.latestResult = result;
        this.#renderScore(result);

        let uploadResponse = null;
        let uploadError = null;
        if (this.options.uploadArtifacts) {
            this.#setStatus("Uploading score and practice artifacts...");
            try {
                uploadResponse = await this.#uploadPracticeArtifacts(result);
            } catch (error) {
                uploadError = error instanceof Error ? error : new Error(String(error));
                this.options.onArtifactUploadError?.(uploadError);
            }
        }

        this.#setPhase('done');
        this.#setStatus(`Done. Final score: ${this.#roundNumber(result.finalScore, 2)}.`);
        const payload = { result, uploadResponse, uploadError };
        this.options.onResult?.(payload);
        return payload;
    }

    async destroy() {
        this.stopPreview();
        this.#teardownWorker();
        if (this.videoElement.dataset.practiceWebcamClientOwned === "1") {
            this.videoElement.remove();
        }
    }

    #createHiddenVideoElement() {
        const video = document.createElement("video");
        video.dataset.practiceWebcamClientOwned = "1";
        video.style.position = "fixed";
        video.style.left = "-99999px";
        video.style.top = "-99999px";
        video.style.width = "1px";
        video.style.height = "1px";
        document.body.appendChild(video);
        return video;
    }

    async #fetchReferenceKeypoints() {
        return this.#fetchJson(`/api/v1/signs/${encodeURIComponent(this.options.signSlug)}/reference-keypoints`);
    }

    async #fetchModelAsset() {
        try {
            return await this.#fetchJson("/api/v1/ai/model");
        } catch (_error) {
            return {
                storage: "local",
                modelFile: "holistic_landmarker.task",
                signedUrl: null,
            };
        }
    }

    async #fetchScoringConfig() {
        try {
            return await this.#fetchJson(`/api/v1/ai/signs/${encodeURIComponent(this.options.signSlug)}/config`);
        } catch (_error) {
            return {
                algorithm: "dtw-cosine",
                handWeight: 0.45,
                poseWeight: 0.35,
                speedWeight: 0.2,
                missingHandPenalty: 1.5,
                excellentThreshold: 90,
                goodThreshold: 75,
                passThreshold: 60,
            };
        }
    }

    async #resetWorker() {
        this.#teardownWorker();
        this.workerReady = false;
        this.worker = new Worker(this.options.workerUrl);
        this.worker.onmessage = (event) => this.#handleWorkerMessage(event);
        this.worker.onerror = (event) => {
            const message = event?.message || "Worker runtime error";
            this.#rejectPendingWork(new Error(message));
            this.workerReady = false;
            this.#setPhase('error');
            this.#setStatus(`Worker error: ${message}`, true);
            this.options.onError?.(new Error(message));
        };

        const readyPromise = new Promise((resolve, reject) => {
            const readyHandler = (event) => {
                if (event.data?.type === "ready") {
                    this.worker.removeEventListener("message", readyHandler);
                    resolve();
                }
                if (event.data?.type === "error") {
                    this.worker.removeEventListener("message", readyHandler);
                    reject(new Error(event.data.message || "Worker initialization failed"));
                }
            };
            this.worker.addEventListener("message", readyHandler);
        });

        this.worker.postMessage({
            type: "init",
            payload: {
                reference: this.reference,
                modelUrl: this.#resolveModelUrl(this.modelAsset),
                scoringConfig: this.scoringConfig,
                wasmBaseUrl: this.options.wasmBaseUrl,
            },
        });

        await readyPromise;

        this.workerReady = true;
    }

    #resolveModelUrl(modelAsset) {
        if (this.options.modelUrl) {
            return this.options.modelUrl;
        }
        if (modelAsset?.signedUrl) {
            return modelAsset.signedUrl;
        }
        if (typeof modelAsset?.objectKey === "string" && modelAsset.objectKey.trim()) {
            return new URL(modelAsset.objectKey, this.options.modelBaseUrl || window.location.origin).toString();
        }
        if (modelAsset?.storage === "s3" || modelAsset?.storage === "minio") {
            throw new Error("Model storage is remote but backend did not provide signedUrl.");
        }

        const modelBaseUrl = this.options.modelBaseUrl || window.location.origin;
        return new URL(`/models/${modelAsset?.modelFile || 'holistic_landmarker.task'}`, modelBaseUrl).toString();
    }

    #startVideoRecording() {
        if (!this.stream || typeof MediaRecorder === "undefined") {
            return;
        }
        if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
            return;
        }

        this.recordedChunks = [];
        this.recordedBlob = null;
        this.mediaRecorder = new MediaRecorder(this.stream, {
            mimeType: this.options.mediaRecorderMimeType,
        });
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };
        this.mediaRecorder.start(250);
    }

    #stopVideoRecording() {
        if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const recorder = this.mediaRecorder;
            recorder.onstop = () => {
                this.recordedBlob = this.recordedChunks.length
                    ? new Blob(this.recordedChunks, { type: recorder.mimeType || "video/webm" })
                    : null;
                resolve();
            };
            recorder.stop();
        });
    }

    async #runCountdown() {
        const countdown = Math.max(Number(this.options.countdownSeconds) || 0, 0);
        for (let value = countdown; value >= 1; value -= 1) {
            this.#setPhase('countdown', { remaining: value });
            this.#setStatus(`Starting in ${value}...`);
            this.options.onCountdown?.({ remaining: value });
            await this.#waitMs(1000);
        }
    }

    #captureForDuration() {
        if (!this.worker) {
            throw new Error("Worker is not initialized.");
        }

        this.isRecording = true;
        this.captureStartedAt = 0;
        this.lastFrameSentAt = 0;
        this.busy = false;
        this.worker.postMessage({ type: "captureStart" });

        return new Promise((resolve, reject) => {
            this.captureResolve = resolve;
            this.captureReject = reject;
            this.animationFrameId = window.requestAnimationFrame((timestamp) => this.#capturePump(timestamp));
        });
    }

    #capturePump(timestamp) {
        if (!this.isRecording || !this.stream) {
            return;
        }

        if (!this.captureStartedAt) {
            this.captureStartedAt = timestamp;
        }

        const elapsed = Math.min(timestamp - this.captureStartedAt, this.options.recordDurationMs);
        const finished = elapsed >= this.options.recordDurationMs;

        if (
            this.workerReady &&
            !this.busy &&
            this.videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            !finished &&
            (timestamp - this.lastFrameSentAt) >= this.options.frameIntervalMs
        ) {
            this.busy = true;
            this.lastFrameSentAt = timestamp;
            createImageBitmap(this.videoElement)
                .then((bitmap) => {
                    this.worker.postMessage({
                        type: "frame",
                        bitmap,
                        timestamp,
                    }, [bitmap]);
                })
                .catch((error) => this.#failCapture(error));
        }

        if (finished && !this.busy) {
            this.isRecording = false;
            if (this.captureResolve) {
                const resolve = this.captureResolve;
                this.captureResolve = null;
                this.captureReject = null;
                resolve();
            }
            return;
        }

        this.animationFrameId = window.requestAnimationFrame((nextTimestamp) => this.#capturePump(nextTimestamp));
    }

    #failCapture(error) {
        this.isRecording = false;
        this.busy = false;
        if (this.captureReject) {
            const reject = this.captureReject;
            this.captureResolve = null;
            this.captureReject = null;
            reject(error instanceof Error ? error : new Error(String(error)));
        }
    }

    #requestFinalScore() {
        if (!this.worker) {
            throw new Error("Worker is not initialized.");
        }

        return new Promise((resolve, reject) => {
            this.finalizeResolve = resolve;
            this.finalizeReject = reject;
            this.worker.postMessage({ type: "captureFinalize" });
        });
    }

    async #uploadPracticeArtifacts(result) {
        if (!this.reference || !this.recordedBlob || !result?.keypointsPayload) {
            return null;
        }

        const payload = new FormData();
        payload.append("file", this.recordedBlob, `${this.reference.sign_slug}-${Date.now()}.webm`);
        payload.append("sign_slug", this.reference.sign_slug);
        payload.append("label", this.reference.label);
        payload.append("reference_video", this.reference.reference_video);
        payload.append("score", String(this.#roundNumber(result.finalScore, 2)));
        payload.append("tracking_ratio", String(this.#roundNumber(result.trackingRatio, 4)));
        payload.append("keypoints_json", JSON.stringify(result.keypointsPayload));

        return this.#fetchJson(this.options.uploadEndpoint, {
            method: "POST",
            body: payload,
        });
    }

    #handleWorkerMessage(event) {
        const { type, payload, message } = event.data;

        if (type === "ready") {
            this.workerReady = true;
            return;
        }

        if (type === "frameResult") {
            this.busy = false;
            return;
        }

        if (type === "captureResult") {
            this.busy = false;
            if (this.finalizeResolve) {
                const resolve = this.finalizeResolve;
                this.finalizeResolve = null;
                this.finalizeReject = null;
                resolve(payload);
            }
            return;
        }

        if (type === "error") {
            const error = new Error(message || "Worker error");
            this.busy = false;
            this.#rejectPendingWork(error);
            this.#setPhase('error');
            this.#setStatus(error.message, true);
            this.options.onError?.(error);
        }
    }

    #setPhase(phase, meta = undefined) {
        this.phase = phase;
        this.options.onPhase?.({ phase, meta: meta || null });
    }

    #rejectPendingWork(error) {
        if (this.captureReject) {
            const reject = this.captureReject;
            this.captureResolve = null;
            this.captureReject = null;
            reject(error);
        }

        if (this.finalizeReject) {
            const reject = this.finalizeReject;
            this.finalizeResolve = null;
            this.finalizeReject = null;
            reject(error);
        }
    }

    #teardownWorker() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.workerReady = false;
        this.busy = false;
        this.#rejectPendingWork(new Error("Worker closed"));
    }

    async #fetchJson(path, options = undefined) {
        const url = new URL(path, this.options.apiBaseUrl || window.location.origin).toString();
        const headers = new Headers(options?.headers || undefined);
        if (this.options.accessToken) {
            headers.set("Authorization", `Bearer ${this.options.accessToken}`);
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
    }

    #renderScore(result) {
        if (!result) {
            this.#setText(this.scoreElements.total, "--");
            this.#setText(this.scoreElements.dtw, "--");
            this.#setText(this.scoreElements.pose, "--");
            this.#setText(this.scoreElements.motion, "--");
            this.#setText(this.scoreElements.tracking, "--");
            return;
        }

        this.#setText(this.scoreElements.total, result.finalScore.toFixed(1));
        this.#setText(this.scoreElements.dtw, result.componentScores.dtw_score.toFixed(1));
        this.#setText(this.scoreElements.pose, result.componentScores.pose_score.toFixed(1));
        this.#setText(this.scoreElements.motion, result.componentScores.motion_score.toFixed(1));
        this.#setText(this.scoreElements.tracking, `${(result.trackingRatio * 100).toFixed(0)}%`);
    }

    #setText(element, value) {
        if (element) {
            element.textContent = value;
        }
    }

    #setStatus(message, isError = false) {
        if (this.statusElement) {
            this.statusElement.textContent = message;
            this.statusElement.dataset.error = isError ? "1" : "0";
        }
        this.options.onStatus?.({ message, isError });
    }

    #roundNumber(value, digits) {
        const factor = 10 ** digits;
        return Math.round(Number(value) * factor) / factor;
    }

    #waitMs(ms) {
        return new Promise((resolve) => {
            window.setTimeout(resolve, ms);
        });
    }
}

export async function createPracticeWebcamClient(options) {
    const client = new PracticeWebcamClient(options);
    await client.init();
    return client;
}
