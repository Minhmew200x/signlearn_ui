import { useEffect, useMemo, useState } from 'react';

import { apiRequest } from '../app/lib/api.js';
import { getLessonVideoPlaybackProps } from '../app/lib/videoPlayback.js';
import { getQuizQuestions } from '../app/lib/quiz.js';
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

function QuizQuestionCard({ question, index, selectedOptionId, onSelect, playbackProps }) {
  const hasQuestionVideo = question.question_type === 'video_to_text' && question.resolvedVideoUrl;
  const hasOptionVideo = question.question_type === 'text_to_video';

  return (
    <div className={`rounded-2xl bg-white p-4 ring-1 ring-blue-100`}>
      <div className={`text-sm font-black uppercase tracking-wide text-slate-500`}>Câu {index + 1}</div>
      <div className={`mt-2 text-lg font-black text-slate-900`}>{question.prompt}</div>

      {hasQuestionVideo && (
        <div className={`mt-4 overflow-hidden rounded-2xl bg-slate-950`}>
          <div className={`aspect-video overflow-hidden`}>
            <video
              key={question.resolvedVideoUrl}
              className={`h-full w-full scale-[1.25] object-cover bg-slate-950`}
              src={question.resolvedVideoUrl}
              {...playbackProps}
            />
          </div>
        </div>
      )}

      {!hasQuestionVideo && question.resolvedSlug && (
        <div className={`mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400`}>
          Sign slug: {question.resolvedSlug}
        </div>
      )}

      <div className={`mt-3 ${hasOptionVideo ? 'grid gap-3 md:grid-cols-2' : 'space-y-2'}`}>
        {(question.options || []).map((option) => {
          const checked = String(selectedOptionId || '') === String(option.id);
          return (
            <label
              key={option.id}
              className={`${hasOptionVideo ? 'block' : 'flex items-center'} cursor-pointer gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition ${checked ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <input
                type={`radio`}
                name={`question-${question.id}`}
                checked={checked}
                onChange={() => onSelect(option.id)}
                className={`${hasOptionVideo ? 'mb-3' : ''}`}
              />

              {hasOptionVideo && option.resolvedVideoUrl ? (
                <div>
                  <div className={`overflow-hidden rounded-xl bg-slate-950`}>
                    <div className={`aspect-video overflow-hidden`}>
                      <video
                        key={option.resolvedVideoUrl}
                        className={`h-full w-full scale-[1.25] object-cover bg-slate-950`}
                        src={option.resolvedVideoUrl}
                        {...playbackProps}
                      />
                    </div>
                  </div>
                  <div className={`mt-3`}>{option.option_text || `Đáp án ${option.order_index || 1}`}</div>
                </div>
              ) : (
                <span>{option.option_text || `Đáp án ${option.order_index || 1}`}</span>
              )}
            </label>
          );
        })}
      </div>
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
  const unansweredQuestionIds = quizQuestions.filter((question) => !selectedAnswers[question.id]).map((question) => question.id);

  if (!topic || !mooc) return null;

  const vocabItems = getLessonVocabItems(mooc, lessonMaterial, makeSignVideoEndpoint);
  const activeWord = vocabItems[Math.min(activeWordIndex, vocabItems.length - 1)] || vocabItems[0];
  const displayVideoUrl = activeWord?.videoUrl || null;
  const displayVideoTitle = `Video: ${activeWord?.word || mooc.lessonTitle || 'MOOC'}`;
  const lessonVideoPlaybackProps = getLessonVideoPlaybackProps();
  const isLastWord = activeWordIndex >= vocabItems.length - 1;
  const hasNextMooc = moocIndex < moocs.length - 1;
  const hasQuiz = quizQuestions.length > 0;

  async function handleToggleConfirm() {
    if (savingProgress) return;
    setSavingProgress(true);
    try {
      const nextValue = !isMoocConfirmed;
      setIsMoocConfirmed(nextValue);
      if (nextValue) {
        await onConfirmCompleteMooc?.();
      }
    } finally {
      setSavingProgress(false);
    }
  }

  async function submitQuiz() {
    if (!lessonMaterial?.quiz?.quizId || !accessToken) return;
    if (unansweredQuestionIds.length > 0) {
      setQuizError(`Còn ${unansweredQuestionIds.length} câu chưa chọn đáp án.`);
      return;
    }

    setQuizError('');
    setSubmittingQuiz(true);

    try {
      const answers = quizQuestions.map((question) => ({
        question_id: question.id,
        selected_option_id: selectedAnswers[question.id] ? Number(selectedAnswers[question.id]) : null,
      }));

      const startAttempt = await apiRequest(`/api/v1/quizzes/${lessonMaterial.quiz.quizId}/start`, {
        method: 'POST',
        accessToken,
      });

      const result = await apiRequest(`/api/v1/quiz-attempts/${startAttempt.attempt_id}/submit`, {
        method: 'POST',
        accessToken,
        body: { answers },
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
    <main className={`mx-auto w-full max-w-[1600px] px-5 py-10`}>
      <AppButton onClick={onBack} variant={`ghost`} className={`mb-6`}>
        {'<-'} Quay lại danh sách MOOC
      </AppButton>

      <section className={`mb-7 rounded-[2.4rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-6 shadow-sm md:min-h-[280px] md:p-10`}>
        <div className={`inline-flex rounded-full bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm ring-1 ring-blue-100`}>
          MOOC {mooc.moocNumber}
        </div>
        <h1 className={`mt-5 text-4xl font-black tracking-tight text-slate-900 md:text-6xl`}>{mooc.lessonTitle}</h1>
      </section>

      <div className={`grid gap-6 lg:grid-cols-[1.2fr_0.8fr]`}>
        <section className={`rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm`}>
          <div className={`grid aspect-video place-items-center overflow-hidden rounded-[1.5rem] bg-blue-950 text-center text-white`}>
            {displayVideoUrl ? (
              <video
                key={displayVideoUrl}
                className={`lesson-video h-full w-full object-contain bg-blue-950`}
                src={displayVideoUrl}
                {...lessonVideoPlaybackProps}
              />
            ) : (
              <div>
                <div className={`text-7xl`}>Video</div>
                <div className={`mt-4 text-3xl font-black`}>{displayVideoTitle}</div>
                <div className={`mt-2 text-lg font-semibold text-slate-300`}>
                  {loadingMaterial ? 'Đang tải video từ API...' : 'Chưa có video từ backend'}
                </div>
              </div>
            )}
          </div>

          {hasQuiz && (
            <div className={`mt-6 rounded-[1.6rem] border border-blue-100 bg-blue-50 p-5`}>
              <div className={`text-sm font-black uppercase tracking-wide text-blue-700`}>Quiz cuối bài</div>
              <h2 className={`mt-2 text-2xl font-black text-slate-900`}>{lessonMaterial.quiz.title}</h2>
              {lessonMaterial.quiz.description && <p className={`mt-2 text-base font-semibold text-slate-600`}>{lessonMaterial.quiz.description}</p>}

              <div className={`mt-5 space-y-4`}>
                {quizQuestions.map((question, index) => (
                  <QuizQuestionCard
                    key={question.id}
                    question={question}
                    index={index}
                    selectedOptionId={selectedAnswers[question.id]}
                    onSelect={(optionId) => setSelectedAnswers((prev) => ({ ...prev, [question.id]: optionId }))}
                    playbackProps={lessonVideoPlaybackProps}
                  />
                ))}
              </div>

              {unansweredQuestionIds.length > 0 && !quizResult && (
                <div className={`mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800`}>
                  Cần trả lời hết {quizQuestions.length} câu hỏi trước khi nộp quiz.
                </div>
              )}

              {quizError && <div className={`mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700`}>{quizError}</div>}

              {quizResult && (
                <div className={`mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-black text-emerald-800`}>
                  Điểm quiz: {quizResult.score}/100 | Đúng {quizResult.correct_count}/{quizResult.total_questions}
                </div>
              )}

              <div className={`mt-4 flex flex-wrap gap-3`}>
                <AppButton onClick={submitQuiz} disabled={submittingQuiz || quizResult}>
                  {submittingQuiz ? 'Đang nộp...' : quizResult ? 'Đã nộp quiz' : 'Nộp quiz'}
                </AppButton>
                {quizResult && hasNextMooc && <AppButton onClick={onGoNextMooc} variant={`dark`}>{'2) Sang MOOC tiếp theo'}</AppButton>}
                {quizResult && <AppButton onClick={onCompleteMooc} variant={`soft`}>Mở AI practice</AppButton>}
              </div>
            </div>
          )}
        </section>

        <aside className={`space-y-5`}>
          <section className={`rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm`}>
            <h2 className={`text-2xl font-black text-slate-900`}>Từ vựng đang học</h2>
            <div className={`mt-4 rounded-2xl bg-blue-50 p-5`}>
              <div className={`text-3xl font-black text-blue-900`}>{activeWord?.word || 'Từ vựng'}</div>
              <p className={`mt-3 text-lg font-semibold leading-8 text-blue-900`}>{activeWord?.explanation || 'Chưa có giải thích.'}</p>
            </div>
          </section>

          <section className={`rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm`}>
            <h2 className={`text-2xl font-black text-slate-900`}>Điều hướng MOOC</h2>
            <div className={`mt-4 grid gap-3`}>
              {!isLastWord ? (
                <AppButton onClick={() => setActiveWordIndex((prev) => Math.min(prev + 1, vocabItems.length - 1))}>Từ tiếp theo</AppButton>
              ) : (
                <>
                  <button
                    onClick={handleToggleConfirm}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${isMoocConfirmed ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                  >
                    {isMoocConfirmed ? 'Đã xác nhận hoàn thành MOOC này' : '1) Xác nhận hoàn thành MOOC này'}
                  </button>

                  {isMoocConfirmed && hasNextMooc && !hasQuiz && <AppButton onClick={onGoNextMooc} variant={`dark`}>{'2) Sang MOOC tiếp theo'}</AppButton>}

                  {!hasQuiz && (
                    <AppButton onClick={onCompleteMooc} disabled={!isMoocConfirmed}>
                      {'2) Mở camera AI chấm điểm'}
                    </AppButton>
                  )}
                </>
              )}
            </div>

            <p className={`mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800`}>
              {hasQuiz ? 'Hoàn thành quiz xong mới được xem là hoàn thành lesson.' : 'Bạn đã xem hết từ trong MOOC này. Mở camera để AI chấm điểm rồi mở MOOC tiếp theo.'}
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
