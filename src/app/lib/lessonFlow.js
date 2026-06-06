export function isQuizUnlocked({ activeWordIndex = 0, vocabItems = [], hasQuiz = false }) {
  if (!hasQuiz) return false;
  const totalWords = Array.isArray(vocabItems) ? vocabItems.length : 0;
  if (totalWords <= 0) return true;
  return activeWordIndex >= totalWords;
}

export function isQuizPassed(quizResult) {
  return Boolean(quizResult?.passed);
}

export function buildLessonFlowItems({ activeWordIndex = 0, vocabItems = [], hasQuiz = false, quizResult = null, quizTitle = 'Quiz cuối bài', showAiPracticeStep = false }) {
  const words = Array.isArray(vocabItems) ? vocabItems : [];
  const activeQuiz = isQuizUnlocked({ activeWordIndex, vocabItems: words, hasQuiz });
  const passedQuiz = isQuizPassed(quizResult);
  const items = words.map((item, index) => ({
    id: `word-${item?.id || index}`,
    type: 'word',
    label: item?.word || `Tu vung ${index + 1}`,
    status: index < activeWordIndex ? 'completed' : index === activeWordIndex && !activeQuiz ? 'active' : 'upcoming',
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
    const aiUnlocked = hasQuiz ? passedQuiz : words.length === 0 || activeWordIndex >= Math.max(words.length - 1, 0);
    items.push({
      id: 'ai-practice',
      type: 'ai',
      label: 'Thực hành bằng AI (optional)',
      status: aiUnlocked ? 'active' : 'upcoming',
      explanation: 'Sau khi qua quiz, ban co the sang AI de luyen them.',
    });
  }

  return items;
}
