import test from "node:test";
import assert from "node:assert/strict";

import { getQuizQuestions } from "../src/app/lib/quiz.js";
import { buildQuizSubmitPayload } from "../src/app/lib/quizSubmission.js";
import {
  buildQuizCreatePayload,
  buildQuizLinkPayload,
  buildQuizQuestionPayload,
} from "../src/app/lib/quizAdmin.js";

globalThis.window = { location: { origin: "https://example.com" } };

test("getQuizQuestions normalizes current backend quiz types and media fields", () => {
  const questions = getQuizQuestions({
    quiz: {
      detail: {
        questions: [
          {
            id: 11,
            question_type: "multiple_choice",
            question_text: null,
            order_index: 2,
            video_slug: "xin-chao",
            video_url: "/api/v1/signs/xin-chao/video",
            options: [
              { option_key: "option-2", option_text: "Cam on", order_index: 2, is_correct: false },
              { option_key: "option-1", option_text: "Xin chao", order_index: 1, is_correct: true },
            ],
          },
          {
            id: 12,
            question_type: "video_choice",
            question_text: "Chon video dung",
            order_index: 1,
            options: [
              { option_key: "option-a", video_slug: "xin-chao", video_url: "/videos/a.mp4", is_correct: true },
            ],
          },
          {
            id: 13,
            question_type: "sign_to_text",
            question_text: "Nhap noi dung",
            order_index: 3,
            video_slug: "cam-on",
            video_url: "/api/v1/signs/cam-on/video",
            answer: "cam on",
            options: [],
          },
        ],
      },
    },
  }, (slug) => `/fallback/${slug}.mp4`);

  assert.deepEqual(questions.map((question) => question.id), [12, 11, 13]);
  assert.equal(questions[0].inputKind, "choice");
  assert.equal(questions[0].options[0].resolvedVideoUrl, "/videos/a.mp4");
  assert.equal(questions[1].resolvedVideoUrl, "/api/v1/signs/xin-chao/video");
  assert.equal(questions[1].options[0].submitValue, "option-1");
  assert.equal(questions[2].inputKind, "text");
  assert.equal(questions[2].resolvedVideoUrl, "/api/v1/signs/cam-on/video");
});

test("buildQuizSubmitPayload requires every answer and uses backend answer fields", () => {
  const questions = [
    { id: 21, question_type: "multiple_choice", inputKind: "choice" },
    { id: 22, question_type: "sign_to_text", inputKind: "text" },
  ];

  assert.throws(
    () => buildQuizSubmitPayload(questions, { 21: { selectedOptionKey: "option-1" } }),
    /Con 1 cau chua tra loi\./,
  );

  assert.deepEqual(
    buildQuizSubmitPayload(questions, {
      21: { selectedOptionKey: "option-1" },
      22: { answerText: "xin chao" },
    }),
    {
      answers: [
        { question_id: 21, selected_option_key: "option-1" },
        { question_id: 22, answer_text: "xin chao" },
      ],
    },
  );
});

test("buildQuizQuestionPayload matches backend requirements for each question type", () => {
  assert.deepEqual(
    buildQuizQuestionPayload({
      question_type: "multiple_choice",
      question_text: "",
      video_slug: "xin-chao",
      options: [
        { option_key: "option-1", option_text: "Xin chao", is_correct: true },
        { option_key: "option-2", option_text: "Cam on", is_correct: false },
      ],
    }),
    {
      question_text: null,
      video_slug: "xin-chao",
      options: [
        { option_key: "option-1", option_text: "Xin chao", video_slug: null, is_correct: true },
        { option_key: "option-2", option_text: "Cam on", video_slug: null, is_correct: false },
      ],
    },
  );

  assert.deepEqual(
    buildQuizQuestionPayload({
      question_type: "video_choice",
      question_text: "Chon video dung",
      options: [
        { option_key: "option-a", video_slug: "xin-chao", is_correct: true },
        { option_key: "option-b", video_slug: "cam-on", is_correct: false },
      ],
    }),
    {
      question_text: "Chon video dung",
      options: [
        { option_key: "option-a", option_text: null, video_slug: "xin-chao", is_correct: true },
        { option_key: "option-b", option_text: null, video_slug: "cam-on", is_correct: false },
      ],
    },
  );

  assert.deepEqual(
    buildQuizQuestionPayload({
      question_type: "multiple_choice",
      question_text: "",
      video_slug: "xin-chao",
      options: [
        { option_text: "Xin chao", is_correct: true },
        { option_text: "Cam on", is_correct: false },
      ],
    }),
    {
      question_text: null,
      video_slug: "xin-chao",
      options: [
        { option_key: "option-1", option_text: "Xin chao", video_slug: null, is_correct: true },
        { option_key: "option-2", option_text: "Cam on", video_slug: null, is_correct: false },
      ],
    },
  );

  assert.deepEqual(
    buildQuizQuestionPayload({
      question_type: "sign_to_text",
      question_text: "Mo ta",
      video_slug: "xin-chao",
      answer: "xin chao",
    }),
    {
      question_text: "Mo ta",
      video_slug: "xin-chao",
      answer: "xin chao",
    },
  );
});

test("admin quiz helpers preserve quiz metadata and link payload shape", () => {
  assert.deepEqual(
    buildQuizCreatePayload({
      lesson_id: "15",
      title: "Quiz bai 1",
      description: "Tong hop",
      passing_score: 75,
      time_limit_seconds: "300",
    }),
    {
      lesson_id: 15,
      title: "Quiz bai 1",
      description: "Tong hop",
      passing_score: 75,
      time_limit_seconds: 300,
    },
  );

  assert.deepEqual(
    buildQuizLinkPayload({ question_type: "video_choice", order_index: 3, points: 2 }, { id: 101, question_type: "video_choice" }),
    { question_type: "video_choice", question_id: 101, order_index: 3, points: 2 },
  );
});
