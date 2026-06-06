import { useEffect, useMemo, useRef, useState } from "react";

import { apiRequest, assertListResponseShape } from "../app/lib/api.js";
import { buildPracticeAttemptPayload, getLessonPracticeTargets, getPracticeReferenceVideoUrl } from "../app/lib/practice.js";
import { AppButton } from "../components/app/AppShell.jsx";
import { createPracticeWebcamClient } from "../../practice-webcam-client.js";

const STATUS_LABELS = {
  idle: "idle",
  loading_resources: "loading resources",
  worker_ready: "worker ready",
  camera_preview_on: "camera preview on",
  countdown: "countdown",
  recording: "recording",
  processing: "processing",
  done: "done",
  error: "error",
};

const VERDICT_TONE = {
  excellent: "bg-emerald-600 text-white",
  good: "bg-blue-600 text-white",
  pass: "bg-amber-500 text-white",
  retry: "bg-rose-600 text-white",
};

function ScoreBar({ label, value }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(Number(value || 0))));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-black text-slate-700">
        <span>{label}</span>
        <span>{safeValue}/100</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100">
        <div className="h-3 rounded-full bg-blue-600" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <span className="font-black text-slate-900">{value}</span>
    </div>
  );
}

export default function AIPracticePage({
  topic,
  mooc,
  lessonMaterial,
  accessToken,
  onBack,
  onBackToMoocList,
  onScore,
  onGoNext,
  onPracticeSaved,
}) {
  const videoRef = useRef(null);
  const clientRef = useRef(null);

  const [signs, setSigns] = useState([]);
  const [signsLoading, setSignsLoading] = useState(false);
  const [signsError, setSignsError] = useState("");

  const [selectedTargetSlug, setSelectedTargetSlug] = useState("");
  const [practiceStatus, setPracticeStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("Chọn từ vựng trong lesson để nạp worker chấm điểm AI.");
  const [cameraOn, setCameraOn] = useState(false);
  const [countdownValue, setCountdownValue] = useState(0);
  const [resourceBundle, setResourceBundle] = useState(null);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [persistedAttempt, setPersistedAttempt] = useState(null);
  const [persistError, setPersistError] = useState("");

  const practiceTargets = useMemo(
    () => getLessonPracticeTargets({ mooc, lessonMaterial, signs }),
    [lessonMaterial, mooc, signs],
  );
  const selectedTarget = useMemo(
    () => practiceTargets.find((item) => item.signSlug === selectedTargetSlug) || practiceTargets[0] || null,
    [practiceTargets, selectedTargetSlug],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSigns() {
      setSignsLoading(true);
      setSignsError("");

      try {
        const payload = await apiRequest("/api/v1/signs");
        if (cancelled) return;
        setSigns(assertListResponseShape(payload, "SignListResponse"));
      } catch (error) {
        if (cancelled) return;
        setSigns([]);
        setSignsError(error?.message || "Không tải được danh sách sign từ backend.");
      } finally {
        if (!cancelled) {
          setSignsLoading(false);
        }
      }
    }

    loadSigns();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!practiceTargets.length) {
      setSelectedTargetSlug("");
      return;
    }

    if (!practiceTargets.some((item) => item.signSlug === selectedTargetSlug)) {
      setSelectedTargetSlug(practiceTargets[0].signSlug);
    }
  }, [practiceTargets, selectedTargetSlug]);

  useEffect(() => {
    let cancelled = false;
    let nextClient = null;

    async function prepareTarget() {
      if (!selectedTarget?.signSlug || !videoRef.current) return;

      if (clientRef.current) {
        await clientRef.current.destroy();
        clientRef.current = null;
      }

      setPracticeStatus("loading_resources");
      setStatusMessage(`Đang tải reference, model và config cho ${selectedTarget.word}...`);
      setCameraOn(false);
      setCountdownValue(0);
      setReferenceVideoUrl(selectedTarget.videoUrl || null);
      setResourceBundle(null);
      setResult(null);
      setPersistedAttempt(null);
      setPersistError("");

      try {
        const [createdClient, referenceVideo] = await Promise.all([
          createPracticeWebcamClient({
            signSlug: selectedTarget.signSlug,
            videoElement: videoRef.current,
            uploadArtifacts: true,
            onReady: ({ reference, modelAsset, scoringConfig }) => {
              if (cancelled) return;
              setResourceBundle({ reference, modelAsset, scoringConfig });
            },
            onStatus: ({ message }) => {
              if (!cancelled) setStatusMessage(message);
            },
            onPhase: ({ phase, meta }) => {
              if (cancelled) return;
              setPracticeStatus(phase);
              if (phase === "worker_ready") setCameraOn(false);
              if (phase === "camera_preview_on") setCameraOn(true);
              if (phase === "countdown") setCountdownValue(Number(meta?.remaining || 0));
              if (phase !== "countdown") setCountdownValue(0);
            },
            onError: (error) => {
              if (cancelled) return;
              setPracticeStatus("error");
              setStatusMessage(error?.message || "Worker chấm điểm AI bị lỗi.");
            },
            onArtifactUploadError: (error) => {
              if (cancelled) return;
              setPersistError(error?.message || "Upload artifact thất bại, nhưng điểm AI vẫn được giữ local.");
            },
          }),
          Promise.resolve(getPracticeReferenceVideoUrl(selectedTarget) || selectedTarget.videoUrl || null),
        ]);

        if (cancelled) {
          await createdClient.destroy();
          return;
        }

        nextClient = createdClient;
        clientRef.current = createdClient;
        setReferenceVideoUrl(referenceVideo || selectedTarget.videoUrl || null);
      } catch (error) {
        if (cancelled) return;
        setPracticeStatus("error");
        setStatusMessage(error?.message || "Không nạp được worker AI cho từ vựng này.");
      }
    }

    prepareTarget();

    return () => {
      cancelled = true;
      if (nextClient) {
        if (clientRef.current === nextClient) {
          clientRef.current = null;
        }
        nextClient.destroy();
      }
    };
  }, [accessToken, selectedTarget?.signSlug, selectedTarget?.videoUrl, selectedTarget?.word]);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        const activeClient = clientRef.current;
        clientRef.current = null;
        activeClient.destroy();
      }
    };
  }, []);

  async function startCamera() {
    if (!clientRef.current) return;

    try {
      await clientRef.current.startPreview();
    } catch (error) {
      setPracticeStatus("error");
      setStatusMessage(error?.message || "Không mở được camera.");
    }
  }

  function stopCamera() {
    clientRef.current?.stopPreview();
    setCameraOn(false);
  }

  async function persistAttempt(nextResult) {
    if (!accessToken || !selectedTarget?.signId) {
      return null;
    }

    const payload = buildPracticeAttemptPayload({
      target: selectedTarget,
      result: nextResult,
      sessionId: null,
      referenceExampleId: null,
      submittedVideoAssetId: null,
      extractedKeypointAssetId: null,
    });

    return apiRequest("/api/v1/practice/attempts", {
      method: "POST",
      accessToken,
      body: payload,
    });
  }

  async function scoreSelectedTarget() {
    if (!clientRef.current) return;
    if (!cameraOn) {
      setStatusMessage("Bật camera sau khi worker sẵn sàng rồi mới chấm điểm.");
      return;
    }

    setPersistError("");
    setPersistedAttempt(null);
    setResult(null);

    try {
      const payload = await clientRef.current.scoreOnce();
      setResult(payload.result);
      onScore?.(Number(payload.result?.finalScore || 0));

      try {
        const savedAttempt = await persistAttempt(payload.result);
        setPersistedAttempt(savedAttempt);
        await onPracticeSaved?.(savedAttempt, payload);
      } catch (error) {
        setPersistError(error?.message || "Không lưu được lịch sử practice attempt lên backend.");
      }
    } catch (error) {
      setPracticeStatus("error");
      setStatusMessage(error?.message || "Không chấm điểm được video webcam.");
    }
  }

  if (!topic || !mooc) return null;

  const verdictTone = VERDICT_TONE[result?.verdict] || VERDICT_TONE.retry;
  const referenceMeta = resourceBundle?.reference || null;
  const componentScores = result?.componentScores || {};

  return (
    <main className="mx-auto w-full max-w-[1600px] px-5 py-10">
      <div className="mb-6 flex flex-wrap gap-3">
        <AppButton onClick={onBack} variant="ghost">
          {"<-"} Quay lại MOOC cuối
        </AppButton>
        <AppButton onClick={onBackToMoocList} variant="ghost">
          Danh sách MOOC
        </AppButton>
      </div>

      <section className="rounded-[2.4rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-6 text-slate-900 shadow-sm md:p-10">
        <div className="inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-blue-100">
          AI scoring bằng webcam
        </div>
        <h1 className="mt-4 text-4xl font-black md:text-6xl">{`MOOC ${mooc?.moocNumber || ""}: ${mooc?.lessonTitle || topic.title}`}</h1>
        <p className="mt-3 max-w-4xl text-xl font-semibold text-slate-600">
          Chấm điểm trực tiếp trong trình duyệt bằng worker + MediaPipe WASM. Từ vựng dùng để luyện là các sign đang có trong lesson này.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          <span className="rounded-full bg-white px-3 py-1">{practiceTargets.length} từ trong lesson</span>
          <span className="rounded-full bg-white px-3 py-1">Status: {STATUS_LABELS[practiceStatus] || practiceStatus}</span>
          <span className="rounded-full bg-white px-3 py-1">Camera {cameraOn ? "on" : "off"}</span>
        </div>
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black uppercase tracking-wide text-blue-700">Target đang chọn</div>
              <h2 className="mt-2 text-2xl font-black text-slate-900">{selectedTarget?.word || "Chưa có target"}</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {selectedTarget?.signSlug ? `sign_slug: ${selectedTarget.signSlug}` : "Lesson này chưa có sign slug hợp lệ để chấm AI."}
              </p>
            </div>
            {referenceMeta?.version ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-100">
                Reference version: <span className="font-black text-slate-900">{referenceMeta.version}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-5 relative grid aspect-video overflow-hidden rounded-[1.5rem] bg-blue-950 text-white">
            <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${cameraOn ? "block" : "hidden"}`} />

            {!cameraOn ? (
              <div className="grid place-items-center p-8 text-center">
                <div>
                  <div className="text-3xl font-black">Worker webcam preview</div>
                  <p className="mt-3 text-base font-semibold text-slate-300">
                    {practiceStatus === "loading_resources"
                      ? "Đang nạp worker và practice resources trước khi mở camera."
                      : "Mở camera sau khi worker ready để bắt đầu countdown 3 giây và record khoảng 4 giây."}
                  </p>
                </div>
              </div>
            ) : null}

            {practiceStatus === "countdown" ? (
              <div className="absolute inset-0 grid place-items-center bg-blue-950/70">
                <div className="rounded-[2rem] bg-white px-8 py-6 text-center text-slate-900 shadow-xl">
                  <div className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">Countdown</div>
                  <div className="mt-2 text-6xl font-black">{countdownValue}</div>
                </div>
              </div>
            ) : null}

            {practiceStatus === "recording" ? (
              <div className="absolute left-5 top-5 rounded-full bg-rose-600 px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-white">
                Recording
              </div>
            ) : null}

            {practiceStatus === "processing" ? (
              <div className="absolute inset-0 grid place-items-center bg-blue-950/70">
                <div className="rounded-2xl bg-white px-6 py-5 text-xl font-black text-slate-900">Worker đang finalize DTW score...</div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <AppButton onClick={startCamera} disabled={practiceStatus === "loading_resources" || !selectedTarget?.signSlug}>
              Bật camera
            </AppButton>
            <AppButton onClick={stopCamera} variant="ghost" disabled={!cameraOn}>
              Tắt camera
            </AppButton>
            <AppButton onClick={scoreSelectedTarget} variant="soft" disabled={!cameraOn || practiceStatus === "processing" || practiceStatus === "recording"}>
              Chấm điểm target
            </AppButton>
          </div>

          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-base font-semibold leading-7 text-slate-700">{statusMessage}</p>
          {persistError ? <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">{persistError}</div> : null}
          {signsError ? <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">{signsError}</div> : null}
        </section>

        <aside className="space-y-5">
          <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">Từ vựng trong lesson</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              {signsLoading ? "Đang tải sign catalog..." : "Chọn một từ trong lesson. Worker sẽ nạp reference-keypoints, model và config cho sign đó trước khi mở camera."}
            </p>
            <div className="mt-4 flex max-h-80 flex-wrap gap-2 overflow-auto rounded-2xl bg-blue-50 p-4">
              {practiceTargets.map((item) => {
                const active = item.signSlug === selectedTarget?.signSlug;
                return (
                  <button
                    key={item.signSlug}
                    type="button"
                    onClick={() => setSelectedTargetSlug(item.signSlug)}
                    className={`rounded-full px-3 py-2 text-sm font-black transition ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white text-blue-900 hover:bg-blue-100"}`}
                  >
                    {item.word}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">Reference</h2>
            {referenceVideoUrl ? (
              <div className="mt-4 overflow-hidden rounded-2xl bg-blue-950">
                <div className="aspect-video overflow-hidden">
                  <video className="h-full w-full object-cover bg-blue-950" src={referenceVideoUrl} controls muted playsInline preload="metadata" />
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Không có reference video riêng, đang dùng metadata từ lesson/sign.</div>
            )}

            <div className="mt-4 space-y-3">
              <MetricRow label="reference_video" value={referenceMeta?.reference_video || selectedTarget?.referenceVideo || "--"} />
              <MetricRow label="version" value={referenceMeta?.version || selectedTarget?.referenceVersion || "--"} />
              <MetricRow label="algorithm" value={resourceBundle?.scoringConfig?.algorithm || "dtw-cosine"} />
              <MetricRow label="model asset" value={resourceBundle?.modelAsset?.modelFile || "holistic_landmarker.task"} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">Kết quả AI</h2>
            {!result ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-center text-base font-semibold text-slate-500">Chưa có kết quả. Flow chuẩn: worker ready → camera preview on → countdown → recording → processing → done.</div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className={`rounded-2xl p-5 text-center ${verdictTone}`}>
                  <div className="text-sm font-black uppercase tracking-[0.16em]">{result.verdict}</div>
                  <div className="mt-2 text-5xl font-black">{result.finalScore}/100</div>
                  <div className="mt-2 text-sm font-semibold">{selectedTarget?.word} • {result.frameCount} frame • tracking {(Number(result.trackingRatio || 0) * 100).toFixed(0)}%</div>
                </div>

                <MetricRow label="dtw_score" value={componentScores.dtw_score ?? "--"} />
                <MetricRow label="hand_score" value={componentScores.hand_score ?? "--"} />
                <MetricRow label="pose_score" value={componentScores.pose_score ?? "--"} />
                <MetricRow label="motion_score" value={componentScores.motion_score ?? "--"} />
                <MetricRow label="trackingRatio" value={result.trackingRatio ?? "--"} />
                {result.referenceVersion ? <MetricRow label="reference version" value={result.referenceVersion} /> : null}

                <ScoreBar label="Hand" value={componentScores.hand_score} />
                <ScoreBar label="Pose" value={componentScores.pose_score} />
                <ScoreBar label="Motion / Speed" value={componentScores.speed_score ?? componentScores.motion_score} />

                {persistedAttempt ? (
                  <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                    Đã lưu practice attempt #{persistedAttempt.id} lên backend.
                  </div>
                ) : null}

                <AppButton onClick={onGoNext} className="w-full">
                  Hoàn tất MOOC
                </AppButton>
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
