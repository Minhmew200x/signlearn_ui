export function isQuizUnlocked({ activeWordIndex = 0, vocabItems = [], hasQuiz = false }) {
  if (!hasQuiz) return false;
  const totalWords = Array.isArray(vocabItems) ? vocabItems.length : 0;
  if (totalWords <= 0) return true;
  return activeWordIndex >= totalWords;
}

export function buildLessonFlowItems({ activeWordIndex = 0, vocabItems = [], hasQuiz = false, quizResult = null }) {
  const words = Array.isArray(vocabItems) ? vocabItems : [];
  const activeQuiz = isQuizUnlocked({ activeWordIndex, vocabItems: words, hasQuiz });
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
      label: 'Quiz cuoi bai',
      status: quizResult ? 'completed' : activeQuiz ? 'active' : 'upcoming',
      explanation: 'Tra loi quiz sau khi hoc xong cac tu.',
    });
  }

  return items;
}
