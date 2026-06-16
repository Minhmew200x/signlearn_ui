export function isQuizUnlocked({ activeWordIndex = 0, vocabItems = [], hasQuiz = false, lessonCompleted = false }) {
  if (!hasQuiz) return false;
  if (lessonCompleted) return true;
  const totalWords = Array.isArray(vocabItems) ? vocabItems.length : 0;
  if (totalWords <= 0) return true;
  return activeWordIndex >= totalWords;
}

export function isQuizPassed(quizResult, persistedQuizPassed = false) {
  return Boolean(persistedQuizPassed || quizResult?.passed);
}

export function isAiPracticeUnlocked({ activeWordIndex = 0, vocabItems = [], hasQuiz = false, quizResult = null, lessonCompleted = false, persistedQuizPassed = false }) {
  if (lessonCompleted) return true;
  const words = Array.isArray(vocabItems) ? vocabItems : [];
  return hasQuiz ? isQuizPassed(quizResult, persistedQuizPassed) : words.length === 0 || activeWordIndex >= Math.max(words.length - 1, 0);
}

export function getLessonInitialActiveWordIndex({ vocabItems = [], hasQuiz = false, lessonCompleted = false }) {
  if (!lessonCompleted) return 0;
  const words = Array.isArray(vocabItems) ? vocabItems : [];
  return hasQuiz ? words.length : Math.max(words.length - 1, 0);
}

export function getFlowItemTargetIndex({ item = null, index = 0, vocabItems = [], hasQuiz = false }) {
  if (!item) return null;
  if (item.type === 'word') return index;
  if (item.type === 'quiz' && hasQuiz) return Array.isArray(vocabItems) ? vocabItems.length : 0;
  return null;
}

export function buildLessonFlowItems({ activeWordIndex = 0, vocabItems = [], hasQuiz = false, quizResult = null, quizTitle = 'Quiz cuối bài', showAiPracticeStep = false, lessonCompleted = false, persistedQuizPassed = false }) {
  const words = Array.isArray(vocabItems) ? vocabItems : [];
  const activeQuiz = isQuizUnlocked({ activeWordIndex, vocabItems: words, hasQuiz, lessonCompleted });
  const passedQuiz = isQuizPassed(quizResult, persistedQuizPassed);
  const items = words.map((item, index) => ({
    id: `word-${item?.id || index}`,
    type: 'word',
    label: item?.word || `Tu vung ${index + 1}`,
    status: lessonCompleted || index < activeWordIndex ? 'completed' : index === activeWordIndex && !activeQuiz ? 'active' : 'upcoming',
    explanation: item?.explanation || null,
  }));

  if (hasQuiz) {
    items.push({
      id: 'quiz',
      type: 'quiz',
      label: quizTitle,
      status: passedQuiz ? 'completed' : activeQuiz ? 'active' : 'upcoming',
      explanation: 'Ôn tập lại những gì đã học',
    });
  }

  if (showAiPracticeStep) {
    const aiUnlocked = isAiPracticeUnlocked({ activeWordIndex, vocabItems: words, hasQuiz, quizResult, lessonCompleted, persistedQuizPassed });
    items.push({
      id: 'ai-practice',
      type: 'ai',
      label: 'Thực hành bằng AI (optional)',
      status: aiUnlocked ? 'active' : 'upcoming',
      explanation: lessonCompleted ? 'Bai hoc da duoc danh dau hoan thanh, ban co the sang AI de luyen them.' : 'Sau khi qua quiz, ban co the sang AI de luyen them.',
    });
  }

  return items;
}
