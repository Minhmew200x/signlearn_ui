import { ApiError, apiRequest, buildApiUrl, extractApiMessage, parseResponseText } from "./api.js";

function getObjectValue(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function pickVideoValue(payload) {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  if (typeof payload !== "object") return null;
  return typeof payload.video_url === "string" ? payload.video_url : null;
}

export function toPlayableVideoUrl(value) {
  if (typeof value !== "string") return null;

  const cleaned = value.trim().replace(/^["']|["']$/g, "");
  if (!cleaned) return null;
  if (/^(https?:|blob:|data:)/i.test(cleaned)) return cleaned;
  if (cleaned.startsWith("/")) return buildApiUrl(cleaned);
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(cleaned)) return buildApiUrl(`/static/videos/${cleaned}`);
  return buildApiUrl(cleaned);
}

export function makeSignVideoEndpoint(signSlug) {
  if (!signSlug) return null;
  return buildApiUrl(`/api/v1/signs/${encodeURIComponent(signSlug)}/video`);
}

function makeSignAssetsEndpoint(signSlug) {
  if (!signSlug) return null;
  return buildApiUrl(`/api/v1/signs/${encodeURIComponent(signSlug)}/assets`);
}

export async function fetchSignVideoUrl(signSlug, { accessToken, signal } = {}) {
  if (!signSlug) return null;

  const assetsUrl = makeSignAssetsEndpoint(signSlug);
  const endpointUrl = makeSignVideoEndpoint(signSlug);
  const headers = { Accept: "application/json, video/mp4, video/*, */*" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  try {
    const assetsResp = await fetch(assetsUrl, { method: "GET", headers, signal });
    if (assetsResp.ok) {
      const assetsPayload = parseResponseText(await assetsResp.text());
      const videoName = typeof assetsPayload?.video?.video_name === "string" ? assetsPayload.video.video_name : null;
      if (videoName) return toPlayableVideoUrl(videoName);

      const embeddedVideoUrl = toPlayableVideoUrl(typeof assetsPayload?.video?.video_url === "string" ? assetsPayload.video.video_url : null);
      if (embeddedVideoUrl) return embeddedVideoUrl;
    }
  } catch (error) {
    console.warn("Không gọi được assets endpoint, fallback video endpoint:", error);
  }

  let response;
  try {
    response = await fetch(endpointUrl, { method: "GET", headers, signal });
  } catch (error) {
    throw new ApiError("Không lấy được video từ API.", 0, error);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    const payload = parseResponseText(await response.text());
    throw new ApiError(extractApiMessage(payload, `API video lỗi ${response.status}`), response.status, payload);
  }

  if (contentType.startsWith("video/")) return endpointUrl;

  const payload = parseResponseText(await response.text());
  const playableUrl = toPlayableVideoUrl(pickVideoValue(payload));
  return playableUrl || endpointUrl;
}

export function getMaterialKeyForMooc(mooc) {
  if (!mooc) return "";
  if (mooc.lessonId) return `lesson:${mooc.lessonId}`;
  if (Array.isArray(mooc.vocabItems) && mooc.vocabItems.length > 0) return `mooc:${mooc.id}`;
  if (mooc.signSlug) return `sign:${mooc.signSlug}`;
  return mooc.id || "";
}

export function extractLessonMaterial(lessonDetail) {
  if (!lessonDetail || typeof lessonDetail !== "object" || !Array.isArray(lessonDetail.items)) {
    throw new ApiError("LessonDetailPublic sai schema: thiếu trường items dạng mảng.", 500, lessonDetail);
  }

  const items = [...lessonDetail.items].sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));
  const signItems = items.filter((item) => item.item_type === "sign" && item.sign);
  const firstSign = signItems[0];
  const firstVideo = items.find((item) => item.item_type === "video");
  const firstText = items.find((item) => item.item_type === "text");
  const firstQuiz = items.find((item) => item.item_type === "quiz" && item.quiz_id);

  const textContent = firstText?.content;
  const videoContent = firstVideo && typeof firstVideo.content === "object" ? firstVideo.content : null;
  const signSlug = firstSign?.sign?.slug || null;

  let explanation = null;
  if (typeof textContent === "string" && textContent.trim()) {
    explanation = textContent.trim();
  } else if (textContent && typeof textContent === "object") {
    explanation = getObjectValue(textContent, ["text", "description", "body", "explanation", "content", "value"]);
  }

  const vocabItems = signItems.map((item, index) => ({
    id: item.id || item.sign?.slug || `${lessonDetail?.id || "lesson"}-sign-${index}`,
    word: item.sign?.title_vi || item.sign?.title_en || `Từ vựng ${index + 1}`,
    explanation: explanation || lessonDetail?.description || "Chưa có giải thích từ vựng cho bài học này.",
    slug: item.sign?.slug || null,
    signId: item.sign?.id || item.sign_id || null,
    orderIndex: Number(item.order_index || index),
  }));

  return {
    word: firstSign?.sign?.title_vi || firstSign?.sign?.title_en || lessonDetail?.title || "Từ vựng",
    explanation: explanation || lessonDetail?.description || "Chưa có giải thích từ vựng cho bài học này.",
    signSlug,
    videoUrl: typeof videoContent?.video_url === "string" ? toPlayableVideoUrl(videoContent.video_url) : null,
    videoTitle: (typeof videoContent?.title === "string" ? videoContent.title : null) || `Video: ${lessonDetail?.title || "MOOC"}`,
    vocabItems,
    quiz: firstQuiz
      ? {
          quizId: firstQuiz.quiz_id,
          itemId: firstQuiz.id,
          title: firstQuiz.quiz?.title || "Quiz cuối bài",
          description: firstQuiz.quiz?.description || null,
        }
      : null,
  };
}

export async function loadLessonMaterial({ mooc, accessToken }) {
  if (!mooc) return null;

  let material;
  if (mooc.lessonId) {
    const lessonDetail = await apiRequest(`/api/v1/lessons/${mooc.lessonId}`, { accessToken });
    material = extractLessonMaterial(lessonDetail);
    if (!material.quiz?.quizId) {
      try {
        const quizSummary = await apiRequest(`/api/v1/lessons/${mooc.lessonId}/quiz`, { accessToken });
        const firstQuiz = Array.isArray(quizSummary?.items) ? quizSummary.items[0] : null;
        if (firstQuiz?.id) {
          material = {
            ...material,
            quiz: {
              quizId: firstQuiz.id,
              itemId: null,
              title: firstQuiz.title || "Quiz cuoi bai",
              description: firstQuiz.description || null,
            },
          };
        }
      } catch (quizSummaryError) {
        console.warn("Khong tai duoc danh sach quiz cua lesson:", quizSummaryError);
      }
    }

    if (material.quiz?.quizId) {
      try {
        const quizDetail = await apiRequest(`/api/v1/quizzes/${material.quiz.quizId}`, { accessToken });
        material = { ...material, quiz: { ...material.quiz, detail: quizDetail } };
      } catch (quizError) {
        console.warn("Không tải được quiz của lesson:", quizError);
      }
    }
  } else {
    material = {
      word: mooc.word || "Từ vựng",
      explanation: mooc.explanation || "Chưa có giải thích từ vựng cho bài học này.",
      signSlug: mooc.signSlug || null,
      videoUrl: null,
      videoTitle: mooc.videoTitle || `Video: ${mooc.lessonTitle || "MOOC"}`,
      vocabItems: Array.isArray(mooc.vocabItems) ? mooc.vocabItems : [],
      quiz: mooc.quiz || null,
    };
  }

  if (!material.signSlug) return material;

  try {
    const resolvedVideoUrl = await fetchSignVideoUrl(material.signSlug, { accessToken });
    if (resolvedVideoUrl && resolvedVideoUrl !== material.videoUrl) {
      return { ...material, videoUrl: resolvedVideoUrl };
    }
  } catch (videoError) {
    console.warn("Không parse được video API, đang dùng endpoint trực tiếp:", videoError);
  }

  return material;
}
