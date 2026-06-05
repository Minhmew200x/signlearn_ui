function normalizeAnswerText(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function getQuestionInputKind(question) {
  if (question?.inputKind) return question.inputKind;
  return question?.question_type === 'sign_to_text' ? 'text' : 'choice';
}

export function getUnansweredQuizQuestionIds(questions, answersByQuestionId) {
  return (Array.isArray(questions) ? questions : [])
    .filter((question) => {
      const answer = answersByQuestionId?.[question.id];
      if (getQuestionInputKind(question) === 'text') return !normalizeAnswerText(answer?.answerText);
      return !normalizeAnswerText(answer?.selectedOptionKey);
    })
    .map((question) => question.id);
}

export function buildQuizSubmitPayload(questions, answersByQuestionId) {
  const unresolvedQuestionIds = getUnansweredQuizQuestionIds(questions, answersByQuestionId);
  if (unresolvedQuestionIds.length > 0) {
    throw new Error(`Còn ${unresolvedQuestionIds.length} câu chưa trả lời.`);
  }

  return {
    answers: (Array.isArray(questions) ? questions : []).map((question) => {
      const answer = answersByQuestionId?.[question.id] || {};
      if (getQuestionInputKind(question) === 'text') {
        return {
          question_id: question.id,
          answer_text: normalizeAnswerText(answer.answerText),
        };
      }

      return {
        question_id: question.id,
        selected_option_key: normalizeAnswerText(answer.selectedOptionKey),
      };
    }),
  };
}
