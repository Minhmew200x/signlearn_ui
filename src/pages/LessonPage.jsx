import { useEffect, useMemo, useState } from 'react';

import { apiRequest } from '../app/lib/api.js';
import { getLessonVideoPlaybackProps } from '../app/lib/videoPlayback.js';
import { getQuizQuestions } from '../app/lib/quiz.js';
import { AppButton } from '../components/app/AppShell.jsx';

function getLessonVocabItems(mooc, lessonMaterial, makeSignVideoEndpoint) {
  if (Array.isArray(lessonMaterial?.vocabItems) && lessonMaterial.vocabItems.length > 0) {
    return lessonMaterial.vocabItems.map((item, index) => ({
      id: item.id || item.slug || `${mooc?.id || 'lesson'}-word-${index}`,
      word: item.word || `Tu vung ${index + 1}`,
      explanation: item.explanation || 'Chon tu nay de xem video ky hieu.',
      slug: item.slug || null,
      videoUrl: item.videoUrl || (item.slug ? makeSignVideoEndpoint(item.slug) : null),
    }));
  }

  if (Array.isArray(mooc?.vocabItems) && mooc.vocabItems.length > 0) {
    return mooc.vocabItems.map((item, index) => ({
      id: item.slug || `${mooc.id}-word-${index}`,
      word: item.word || `Tu vung ${index + 1}`,
      explanation: item.explanation || 'Chon tu nay de xem video ky hieu.',
      slug: item.slug || null,
      videoUrl: item.videoUrl || (item.slug ? makeSignVideoEndpoint(item.slug) : null),
    }));
  }

  const slug = lessonMaterial?.signSlug || mooc?.signSlug || null;
  return [{
    id: slug || mooc?.id || 'single-word',
    word: lessonMaterial?.word || mooc?.word || 'Tu vung',
    explanation: lessonMaterial?.explanation || mooc?.explanation || 'Ch\\u01b0a c\\u00f3 gi\\u1ea3i th\\u00edch.',
    slug,
    videoUrl: lessonMaterial?.videoUrl || (slug ? makeSignVideoEndpoint(slug) : null),
  }];
}

function QuizQuestionCard({ question, index, selectedOptionId, onSelect, playbackProps }) {
  const hasQuestionVideo = question.question_type === 'video_to_text' && question.resolvedVideoUrl;
  const hasOptionVideo = question.question_type === 'text_to_video';

  return (
    <div className={`rounded-2xl bg-white p-4 ring-1 ring-blue-100`}>
      <div className={`text-sm font-black uppercase tracking-wide text-slate-500`}>Cau {index + 1}</div>
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
                  <div className={`mt-3`}>{option.option_text || `Dap an ${option.order_index || 1}`}</div>
                </div>
              ) : (
                <span>{option.option_text || `Dap an ${option.order_index || 1}`}</span>
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
      setQuizError(`Con ${unansweredQuestionIds.length} cau chua chon dap an.`);
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
      setQuizError(error?.message || 'Khong gui duoc quiz.');
    } finally {
      setSubmittingQuiz(false);
    }
  }

  return (
    <main className={`mx-auto w-full max-w-[1600px] px-5 py-10`}>
      <AppButton onClick={onBack} variant={`ghost`} className={`mb-6`}>
        {'<-'} Quay lai danh sach MOOC
      </AppButton>

      <section className={`mb-7 rounded-[2.4rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-6 shadow-sm md:min-h-[280px] md:p-10`}>
        <div className={`inline-flex rounded-full bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm ring-1 ring-blue-100`}>
          Mooc {mooc.moocNumber}
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
                  {loadingMaterial ? 'Dang tai video tu API...' : 'Chua co video tu backend'}
                </div>
              </div>
            )}
          </div>

          {hasQuiz && (
            <div className={`mt-6 rounded-[1.6rem] border border-blue-100 bg-blue-50 p-5`}>
              <div className={`text-sm font-black uppercase tracking-wide text-blue-700`}>Quiz cuoi bai</div>
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
                  Can tra loi het {quizQuestions.length} cau hoi truoc khi nop quiz.
                </div>
              )}

              {quizError && <div className={`mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700`}>{quizError}</div>}

              {quizResult && (
                <div className={`mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-black text-emerald-800`}>
                  Diem quiz: {quizResult.score}/100 | Dung {quizResult.correct_count}/{quizResult.total_questions}
                </div>
              )}

              <div className={`mt-4 flex flex-wrap gap-3`}>
                <AppButton onClick={submitQuiz} disabled={submittingQuiz || quizResult}>
                  {submittingQuiz ? 'Dang nop...' : quizResult ? 'Da nop quiz' : 'Nop quiz'}
                </AppButton>
                {quizResult && hasNextMooc && <AppButton onClick={onGoNextMooc} variant={`dark`}>{'2) Sang MOOC ti\u1ebfp theo'}</AppButton>}
                {quizResult && <AppButton onClick={onCompleteMooc} variant={`soft`}>Mo AI practice</AppButton>}
              </div>
            </div>
          )}
        </section>

        <aside className={`space-y-5`}>
          <section className={`rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm`}>
            <h2 className={`text-2xl font-black text-slate-900`}>{'T\u1eeb v\u1ef1ng \u0111ang h\u1ecdc'}</h2>
            <div className={`mt-4 rounded-2xl bg-blue-50 p-5`}>
              <div className={`text-3xl font-black text-blue-900`}>{activeWord?.word || 'T\u1eeb v\u1ef1ng'}</div>
              <p className={`mt-3 text-lg font-semibold leading-8 text-blue-900`}>{activeWord?.explanation || 'Ch\u01b0a c\u00f3 gi\u1ea3i th\u00edch.'}</p>
            </div>
          </section>

          <section className={`rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm`}>
            <h2 className={`text-2xl font-black text-slate-900`}>{'\u0110i\u1ec1u h\u01b0\u1edbng MOOC'}</h2>
            <div className={`mt-4 grid gap-3`}>
              {!isLastWord ? (
                <AppButton onClick={() => setActiveWordIndex((prev) => Math.min(prev + 1, vocabItems.length - 1))}>{'T\u1eeb ti\u1ebfp theo'}</AppButton>
              ) : (
                <>
                  <button
                    onClick={handleToggleConfirm}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${isMoocConfirmed ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                  >
                    {isMoocConfirmed ? '\u0110\u00e3 x\u00e1c nh\u1eadn ho\u00e0n th\u00e0nh MOOC n\u00e0y' : '1) X\u00e1c nh\u1eadn ho\u00e0n th\u00e0nh MOOC n\u00e0y'}
                  </button>

                  {isMoocConfirmed && hasNextMooc && !hasQuiz && <AppButton onClick={onGoNextMooc} variant={`dark`}>{'2) Sang MOOC ti\u1ebfp theo'}</AppButton>}

                  {!hasQuiz && (
                    <AppButton onClick={onCompleteMooc} disabled={!isMoocConfirmed}>
                      {'2) M\u1edf camera AI ch\u1ea5m \u0111i\u1ec3m'}
                    </AppButton>
                  )}
                </>
              )}
            </div>

            <p className={`mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800`}>
              {hasQuiz ? 'Ho\u00e0n th\u00e0nh quiz xong m\u1edbi \u0111\u01b0\u1ee3c xem l\u00e0 ho\u00e0n th\u00e0nh lesson.' : 'B\u1ea1n \u0111\u00e3 xem h\u1ebft t\u1eeb trong MOOC n\u00e0y. M\u1edf camera \u0111\u1ec3 AI ch\u1ea5m \u0111i\u1ec3m r\u1ed3i m\u1edf MOOC ti\u1ebfp theo.'}
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
