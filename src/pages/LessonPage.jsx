import { useEffect, useMemo, useState } from 'react';

import { apiRequest } from '../app/lib/api.js';
import { getQuizQuestions } from '../app/lib/quiz.js';
import { buildQuizSubmitPayload, getUnansweredQuizQuestionIds } from '../app/lib/quizSubmission.js';
import { buildLessonFlowItems, isQuizPassed, isQuizUnlocked } from '../app/lib/lessonFlow.js';
import { getLessonQuizTitle } from '../app/lib/practice.js';
import { getLessonVideoPlaybackProps } from '../app/lib/videoPlayback.js';
import { AppButton } from '../components/app/AppShell.jsx';

function getLessonVocabItems(mooc, lessonMaterial, makeSignVideoEndpoint) {
  if (Array.isArray(lessonMaterial?.vocabItems) && lessonMaterial.vocabItems.length > 0) {
    return lessonMaterial.vocabItems.map((item, index) => ({
      id: item.id || item.slug || `${mooc?.id || 'lesson'}-word-${index}`,
      word: item.word || `Từ vựng ${index + 1}`,
      explanation: item.explanation || 'Chọn từ này để xem video ký hiệu.',
      slug: item.slug || null,
      videoUrl: item.videoUrl || (item.slug ? makeSignVideoEndpoint(item.slug) : null),
    }));
  }

  if (Array.isArray(mooc?.vocabItems) && mooc.vocabItems.length > 0) {
    return mooc.vocabItems.map((item, index) => ({
      id: item.slug || `${mooc.id}-word-${index}`,
      word: item.word || `Từ vựng ${index + 1}`,
      explanation: item.explanation || 'Chọn từ này để xem video ký hiệu.',
      slug: item.slug || null,
      videoUrl: item.videoUrl || (item.slug ? makeSignVideoEndpoint(item.slug) : null),
    }));
  }

  const slug = lessonMaterial?.signSlug || mooc?.signSlug || null;
  return [{
    id: slug || mooc?.id || 'single-word',
    word: lessonMaterial?.word || mooc?.word || 'Từ vựng',
    explanation: lessonMaterial?.explanation || mooc?.explanation || 'Chưa có giải thích.',
    slug,
    videoUrl: lessonMaterial?.videoUrl || (slug ? makeSignVideoEndpoint(slug) : null),
  }];
}

function getQuestionResultById(quizResult) {
  return new Map((quizResult?.answers || []).map((answer) => [Number(answer.question_id), answer]));
}

function QuizQuestionCard({ question, index, answerState, onSelectOption, onChangeText, playbackProps, resultAnswer }) {
  const showQuestionVideo = question.question_type !== 'video_choice' && question.resolvedVideoUrl;
  const hasOptionVideo = question.question_type === 'video_choice';
  const questionVideoZoomClass = question.question_type === 'sign_to_text' ? 'scale-[1.4]' : 'scale-[1.4]';
  const selectedOptionKey = answerState?.selectedOptionKey || '';
  const answerText = answerState?.answerText || '';

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-blue-100">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-black uppercase tracking-wide text-slate-500">Câu {index + 1}</div>
        {resultAnswer ? (
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${resultAnswer.is_correct ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {resultAnswer.is_correct ? 'Đúng' : 'Sai'}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-lg font-black text-slate-900">{question.prompt}</div>

      {showQuestionVideo ? (
        <div className="mt-4 overflow-hidden rounded-2xl bg-blue-950">
          <div className="aspect-video overflow-hidden">
            <video
              key={question.resolvedVideoUrl}
              className={`h-full w-full ${questionVideoZoomClass} object-cover bg-blue-950`}
              src={question.resolvedVideoUrl}
              {...playbackProps}
            />
          </div>
        </div>
      ) : null}

      {!showQuestionVideo && question.resolvedSlug ? (
        <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Sign slug: {question.resolvedSlug}
        </div>
      ) : null}

      {question.inputKind === 'text' ? (
        <div className="mt-4">
          <input
            type="text"
            value={answerText}
            onChange={(event) => onChangeText(event.target.value)}
            placeholder="Nhập câu trả lời"
            className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500"
          />
        </div>
      ) : (
        <div className={`mt-3 ${hasOptionVideo ? 'grid gap-3 md:grid-cols-2' : 'space-y-2'}`}>
          {(question.options || []).map((option, optionIndex) => {
            const checked = selectedOptionKey === String(option.submitValue || '');
            return (
              <label
                key={option.id || option.submitValue || optionIndex}
                className={`${hasOptionVideo ? 'block' : 'flex items-center'} cursor-pointer gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition ${checked ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={checked}
                  onChange={() => onSelectOption(String(option.submitValue || ''))}
                  className={hasOptionVideo ? 'mb-3' : ''}
                />

                {hasOptionVideo && option.resolvedVideoUrl ? (
                  <div>
                    <div className="overflow-hidden rounded-xl bg-blue-950">
                      <div className="aspect-video overflow-hidden">
                        <video
                          key={option.resolvedVideoUrl}
                          className={`h-full w-full ${questionVideoZoomClass} object-cover bg-blue-950`}
                          src={option.resolvedVideoUrl}
                          {...playbackProps}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // <span>{option.option_text || `Đáp án ${optionIndex + 1}`}</span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {resultAnswer ? (
        <div className="mt-3 text-xs font-semibold text-slate-500">
          {resultAnswer.is_correct ? `+${resultAnswer.earned_points} điểm` : '0 điểm'}
        </div>
      ) : null}
    </div>
  );
}

export default function LessonPage({
  topic,
  moocs,
  moocIndex,
  onBack,
  onConfirmCompleteMooc,
  onQuizCompleted,
  onGoNextMooc,
  onCompleteMooc,
  lessonMaterial,
  loadingMaterial,
  makeSignVideoEndpoint,
  accessToken,
}) {
  const mooc = moocs[moocIndex];
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [isMoocConfirmed, setIsMoocConfirmed] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [quizError, setQuizError] = useState('');
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  useEffect(() => {
    setActiveWordIndex(0);
    setIsMoocConfirmed(false);
    setSelectedAnswers({});
    setQuizResult(null);
    setQuizError('');
    setSubmittingQuiz(false);
    setSavingProgress(false);
  }, [mooc?.id]);

  const quizQuestions = useMemo(
    () => getQuizQuestions(lessonMaterial, makeSignVideoEndpoint),
    [lessonMaterial, makeSignVideoEndpoint],
  );
  const unansweredQuestionIds = useMemo(
    () => getUnansweredQuizQuestionIds(quizQuestions, selectedAnswers),
    [quizQuestions, selectedAnswers],
  );
  const quizResultByQuestionId = useMemo(() => getQuestionResultById(quizResult), [quizResult]);

  if (!topic || !mooc) return null;

  const vocabItems = getLessonVocabItems(mooc, lessonMaterial, makeSignVideoEndpoint);
  const hasNextMooc = moocIndex < moocs.length - 1;
  const hasQuiz = quizQuestions.length > 0;
  const lastWordIndex = Math.max(vocabItems.length - 1, 0);
  const quizStepIndex = vocabItems.length;
  const isQuizStep = hasQuiz && activeWordIndex >= quizStepIndex;
  const activeWord = isQuizStep ? null : (vocabItems[Math.min(activeWordIndex, lastWordIndex)] || vocabItems[0]);
  const displayVideoUrl = activeWord?.videoUrl || null;
  const displayVideoTitle = `Video: ${activeWord?.word || mooc.lessonTitle || 'MOOC'}`;
  const lessonVideoPlaybackProps = getLessonVideoPlaybackProps();
  const isLastWord = !isQuizStep && activeWordIndex >= lastWordIndex;
  const totalSteps = Math.max(vocabItems.length + (hasQuiz ? 1 : 0), 1);
  const currentStep = Math.min(activeWordIndex + 1, totalSteps);
  const passedQuiz = isQuizPassed(quizResult);
  const quizTitle = getLessonQuizTitle(lessonMaterial);
  const flowItems = buildLessonFlowItems({ activeWordIndex, vocabItems, hasQuiz, quizResult, quizTitle, showAiPracticeStep: true });
  const nextActionLabel = !isLastWord ? 'Từ tiếp theo' : hasQuiz ? 'Sang quiz cuối bài' : 'Sang luyện AI';

  async function ensureMoocConfirmed() {
    if (isMoocConfirmed) return true;
    if (savingProgress) return false;

    setSavingProgress(true);
    try {
      await onConfirmCompleteMooc?.();
      setIsMoocConfirmed(true);
      return true;
    } finally {
      setSavingProgress(false);
    }
  }

  async function handleNextStep() {
    if (isQuizStep) return;

    if (!isLastWord) {
      setActiveWordIndex((prev) => Math.min(prev + 1, lastWordIndex));
      return;
    }

    if (hasQuiz) {
      setActiveWordIndex(quizStepIndex);
      ensureMoocConfirmed().catch(() => {});
      return;
    }

    const confirmed = await ensureMoocConfirmed();
    if (!confirmed) return;

    onCompleteMooc?.();
  }

  function resetQuizState() {
    setSelectedAnswers({});
    setQuizResult(null);
    setQuizError('');
  }

  async function submitQuiz() {
    if (!lessonMaterial?.quiz?.quizId || !accessToken) return;

    setQuizError('');
    setSubmittingQuiz(true);

    try {
      const payload = buildQuizSubmitPayload(quizQuestions, selectedAnswers);
      const startAttempt = await apiRequest(`/api/v1/quizzes/${lessonMaterial.quiz.quizId}/start`, {
        method: 'POST',
        accessToken,
      });

      const result = await apiRequest(`/api/v1/quiz-attempts/${startAttempt.attempt_id}/submit`, {
        method: 'POST',
        accessToken,
        body: payload,
      });

      setQuizResult(result);
      await onQuizCompleted?.(result);
    } catch (error) {
      setQuizError(error?.message || 'Không gửi được quiz.');
    } finally {
      setSubmittingQuiz(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-5 py-10">
      <AppButton onClick={onBack} variant="ghost" className="mb-6">
        {'<-'} Quay lại danh sách MOOC
      </AppButton>

      <section className="mb-6 flex flex-col gap-4 rounded-[1.6rem] border border-blue-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">MOOC {mooc.moocNumber}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{topic.title}</span>
            <span className={`rounded-full px-3 py-1 ${isQuizStep ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>
              {isQuizStep ? 'Bước quiz' : 'Bước từ vựng'}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">{mooc.lessonTitle}</h1>
        </div>

        <div className="rounded-[1.4rem] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-100">
          Bước {currentStep}/{totalSteps}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          {isQuizStep ? (
            <div className="rounded-[1.6rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-6">
              <div className="text-sm font-black uppercase tracking-wide text-blue-700">Xong từ vựng</div>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Bắt đầu quiz cuối bài</h2>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-600">
                Phần video từ vựng đã tách riêng. Qua quiz này để hoàn thành bài, sau đó bạn có thể qua MOOC tiếp theo hoặc luyện thêm bằng AI.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                <span className="rounded-full bg-white px-3 py-1">{quizQuestions.length} câu hỏi</span>
                <span className="rounded-full bg-white px-3 py-1">Pass {lessonMaterial?.quiz?.passing_score}</span>
                <span className="rounded-full bg-white px-3 py-1">{lessonMaterial?.quiz?.time_limit_seconds ? `${lessonMaterial.quiz.time_limit_seconds}s` : 'Không giới hạn'}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="grid aspect-video place-items-center overflow-hidden rounded-[1.5rem] bg-blue-950 text-center text-white">
                {displayVideoUrl ? (
                  <video
                    key={displayVideoUrl}
                    className="lesson-video h-full w-full object-contain bg-blue-950"
                    src={displayVideoUrl}
                    {...lessonVideoPlaybackProps}
                  />
                ) : (
                  <div>
                    <div className="text-7xl">Video</div>
                    <div className="mt-4 text-3xl font-black">{displayVideoTitle}</div>
                    <div className="mt-2 text-lg font-semibold text-slate-300">
                      {loadingMaterial ? 'Đang tải video từ API...' : 'Chưa có video từ backend'}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5">
                <div className="text-sm font-black uppercase tracking-wide text-slate-500">Từ đang học</div>
                <h2 className="mt-2 text-2xl font-black text-slate-900">{activeWord?.word || mooc.lessonTitle}</h2>
                <p className="mt-2 text-base font-semibold leading-7 text-slate-600">{activeWord?.explanation || 'Chưa có giải thích.'}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <AppButton onClick={handleNextStep} disabled={savingProgress}>
                  {savingProgress ? 'Đang lưu...' : nextActionLabel}
                </AppButton>
              </div>
            </>
          )}

          {hasQuiz && isQuizUnlocked({ activeWordIndex, vocabItems, hasQuiz }) ? (
            <div className="mt-6 rounded-[1.6rem] border border-blue-100 bg-blue-50 p-5">
              <div className="text-sm font-black uppercase tracking-wide text-blue-700">Quiz cuối bài</div>
              <h2 className="mt-2 text-2xl font-black text-slate-900">{quizTitle}</h2>
              {lessonMaterial.quiz.description ? <p className="mt-2 text-base font-semibold text-slate-600">{lessonMaterial.quiz.description}</p> : null}

              <div className="mt-5 space-y-4">
                {quizQuestions.map((question, index) => (
                  <QuizQuestionCard
                    key={question.id}
                    question={question}
                    index={index}
                    answerState={selectedAnswers[question.id]}
                    onSelectOption={(selectedOptionKey) => setSelectedAnswers((prev) => ({
                      ...prev,
                      [question.id]: { ...(prev[question.id] || {}), selectedOptionKey },
                    }))}
                    onChangeText={(answerText) => setSelectedAnswers((prev) => ({
                      ...prev,
                      [question.id]: { ...(prev[question.id] || {}), answerText },
                    }))}
                    playbackProps={lessonVideoPlaybackProps}
                    resultAnswer={quizResultByQuestionId.get(question.id)}
                  />
                ))}
              </div>

              {unansweredQuestionIds.length > 0 && !quizResult ? (
                <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                  Cần trả lời hết {quizQuestions.length} câu hỏi trước khi nộp quiz.
                </div>
              ) : null}

              {quizError ? <div className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{quizError}</div> : null}

              {quizResult ? (
                <div className={`mt-4 rounded-2xl p-3 text-sm font-black ${quizResult.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                  Điểm quiz: {quizResult.score}/100 | Đúng {quizResult.correct_count}/{quizResult.total_questions} | {quizResult.passed ? 'Bạn đã hoàn thành quiz và qua màn.' : 'Chưa qua, hãy làm lại quiz.'}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-3">
                <AppButton onClick={submitQuiz} disabled={submittingQuiz}>
                  {submittingQuiz ? 'Đang nộp...' : 'Nộp quiz'}
                </AppButton>
                {quizResult ? <AppButton onClick={resetQuizState} variant="soft">Làm lại quiz</AppButton> : null}
                {passedQuiz && hasNextMooc ? <AppButton onClick={onGoNextMooc} variant="dark">Sang MOOC tiếp theo</AppButton> : null}
              </div>

              {passedQuiz ? (
                <div className="mt-4 rounded-[1.4rem] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-5">
                  <div className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">Luyện thêm chút nhé</div>
                  <h3 className="mt-2 text-xl font-black text-slate-900">Thực hành bằng AI (tùy chọn)</h3>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                    Quiz đã qua. Bạn có thể sang box AI để luyện thêm trước khi qua MOOC tiếp theo.
                  </p>
                  <div className="mt-4">
                    <AppButton onClick={onCompleteMooc} variant="soft">Mở AI practice</AppButton>
                  </div>
                </div>
              ) : null}
            </div>
          ) : hasQuiz ? (
            <div className="mt-6 rounded-[1.6rem] border border-amber-100 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
              {isLastWord ? 'Đã đến từ cuối cùng. Bấm nút tiếp theo để sang quiz cuối bài.' : `Học hết ${vocabItems.length} từ trong MOOC này để mở quiz cuối bài.`}
            </div>
          ) : null}
        </section>

        <aside className="space-y-5">
          <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-slate-900">Lộ trình đang học</h2>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                {currentStep}/{totalSteps} bước
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {flowItems.map((item, index) => {
                const isCompleted = item.status === 'completed';
                const isActive = item.status === 'active';
                const marker = item.type === 'quiz'
                  ? (isCompleted ? '✓' : 'Q')
                  : item.type === 'ai'
                    ? 'AI'
                    : (isCompleted ? '✓' : `${Math.min(index + 1, vocabItems.length)}`);

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border px-4 py-4 transition ${isCompleted ? 'border-emerald-200 bg-emerald-50' : isActive ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black ${isCompleted ? 'bg-emerald-600 text-white' : isActive ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
                        {marker}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-black text-slate-900">{item.label}</div>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${isCompleted ? 'bg-white text-emerald-700' : isActive ? 'bg-white text-blue-700' : 'bg-white text-slate-500'}`}>
                            {isCompleted ? 'Xong' : isActive ? 'Đang học' : 'Sắp tới'}
                          </span>
                        </div>
                        {isActive && item.explanation ? <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">{item.explanation}</p> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
