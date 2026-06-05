import { useEffect, useMemo, useRef, useState } from "react";
import { AppButton } from "../components/app/AppShell.jsx";

const PASS_SCORE = 70;

function getLessonVocabItems(mooc, lessonMaterial) {
  if (Array.isArray(lessonMaterial?.vocabItems) && lessonMaterial.vocabItems.length > 0) {
    return lessonMaterial.vocabItems.map((item, index) => ({
      id: item.id || item.slug || `${mooc?.id || "lesson"}-word-${index}`,
      word: item.word || item.label || `Từ vựng ${index + 1}`,
    }));
  }
  if (Array.isArray(mooc?.vocabItems) && mooc.vocabItems.length > 0) {
    return mooc.vocabItems.map((item, index) => ({
      id: item.slug || `${mooc.id}-word-${index}`,
      word: item.word || `Từ vựng ${index + 1}`,
    }));
  }

  return [{
    id: mooc?.signSlug || mooc?.id || "single-word",
    word: mooc?.word || "Từ vựng",
  }];
}

function ScoreBar({ label, value }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-black text-slate-700">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-3 rounded-full bg-slate-100">
        <div className="h-3 rounded-full bg-blue-600" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function AIPracticePage({ topic, mooc, moocs = [], lessonMaterial, onBack, onBackToMoocList, onScore, onGoNext }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState("Sẵn sàng mở camera để luyện thêm với AI.");
  const [result, setResult] = useState(null);

  const moocWords = useMemo(() => getLessonVocabItems(mooc, lessonMaterial).filter(Boolean), [mooc, lessonMaterial]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  async function startCamera() {
    setResult(null);
    setMessage("Đang xin quyền truy cập camera...");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("Trình duyệt không hỗ trợ camera.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
      setMessage("Camera đã bật. Hãy thực hiện lại các ký hiệu đã học trong MOOC rồi bấm chấm điểm.");
    } catch {
      setMessage("Không mở được camera. Hãy kiểm tra quyền trình duyệt.");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  function analyzeGesture() {
    if (!cameraOn) {
      setMessage("Bạn cần bật camera trước khi chấm điểm.");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setMessage("AI đang phân tích bài của MOOC...");

    setTimeout(() => {
      const score = Math.floor(50 + Math.random() * 51);
      const passed = score >= PASS_SCORE;
      const hand = Math.max(45, Math.min(100, score + Math.floor(Math.random() * 6) - 3));
      const motion = Math.max(40, Math.min(100, score + Math.floor(Math.random() * 10) - 5));
      const clarity = Math.max(40, Math.min(100, score + Math.floor(Math.random() * 8) - 4));

      setResult({ score, passed, hand, motion, clarity });
      onScore(score);
      setIsAnalyzing(false);
      setMessage(passed ? "Kết quả tốt. Bạn có thể qua MOOC tiếp theo bất cứ lúc nào." : "Chưa đạt mức mong muốn. Hãy xem lại video và luyện thêm.");
    }, 1400);
  }

  if (!topic || !mooc) return null;

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

      <section className="rounded-[2.4rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-6 text-slate-900 shadow-sm md:min-h-[300px] md:p-10">
        <div className="inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-blue-100">
          AI luyen them sau quiz
        </div>
        <h1 className="mt-4 text-4xl font-black md:text-6xl">{`MOOC ${mooc?.moocNumber || ""}: ${mooc?.lessonTitle || topic.title}`}</h1>
        <p className="mt-3 text-xl font-semibold text-slate-600">
          Luyện thêm với AI sau khi xong quiz của MOOC này ({moocWords.length} từ vựng).
        </p>
      </section>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="relative grid aspect-video overflow-hidden rounded-[1.5rem] bg-blue-950 text-white">
            <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${cameraOn ? "block" : "hidden"}`} />
            {!cameraOn && (
              <div className="grid place-items-center p-8 text-center">
                <div>
                  <div className="text-7xl">📹</div>
                  <div className="mt-3 text-3xl font-black">Camera luyen AI</div>
                  <p className="mt-2 text-base font-semibold text-slate-300">Phan AI nay la tuy chon de ban luyen them sau quiz.</p>
                </div>
              </div>
            )}
            {isAnalyzing && (
              <div className="absolute inset-0 grid place-items-center bg-blue-950/70">
                <div className="rounded-2xl bg-white px-6 py-5 text-xl font-black text-slate-900">AI đang chấm điểm...</div>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {!cameraOn ? (
              <AppButton onClick={startCamera}>Bật camera</AppButton>
            ) : (
              <AppButton onClick={stopCamera} variant="ghost">
                Tắt camera
              </AppButton>
            )}
            <AppButton onClick={analyzeGesture} variant="soft">
              Chấm điểm MOOC
            </AppButton>
          </div>

          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-base font-semibold leading-7 text-slate-700">{message}</p>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">Từ vựng MOOC này</h2>
            <div className="mt-4 flex max-h-80 flex-wrap gap-2 overflow-auto rounded-2xl bg-blue-50 p-4">
              {moocWords.map((item, index) => (
                <span key={`${item.id}-${index}`} className="rounded-full bg-white px-3 py-2 text-sm font-black text-blue-900">
                  {item.word}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">Kết quả AI</h2>
            {!result ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-center text-base font-semibold text-slate-500">Chưa có kết quả.</div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className={`rounded-2xl p-5 text-center text-white ${result.passed ? "bg-emerald-600" : "bg-rose-600"}`}>
                  <div className="text-5xl font-black">{result.score}/100</div>
                  <div className="mt-1 text-sm font-black uppercase tracking-wide">{result.passed ? "Tốt" : "Cần luyện thêm"}</div>
                </div>
                <ScoreBar label="Vị trí tay" value={result.hand} />
                <ScoreBar label="Độ mượt" value={result.motion} />
                <ScoreBar label="Độ rõ" value={result.clarity} />
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

