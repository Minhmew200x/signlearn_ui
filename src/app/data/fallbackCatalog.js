const TOPIC_THEME_POOL = [
  { icon: "👋", color: "from-blue-100 to-sky-50" },
  { icon: "🏡", color: "from-emerald-100 to-teal-50" },
  { icon: "📚", color: "from-amber-100 to-orange-50" },
  { icon: "🌍", color: "from-blue-100 to-amber-50" },
  { icon: "🙂", color: "from-rose-100 to-pink-50" },
  { icon: "🩺", color: "from-lime-100 to-green-50" },
  { icon: "💼", color: "from-indigo-100 to-slate-50" },
  { icon: "🚌", color: "from-yellow-100 to-amber-50" },
  { icon: "🚨", color: "from-red-100 to-rose-50" },
];

export const fallbackTopics = [
  { id: "basic", title: "Giao tiếp cơ bản", level: "Cơ bản", desc: "Chào hỏi, câu hỏi và trao đổi ngắn.", color: TOPIC_THEME_POOL[0].color, icon: "👋" },
  { id: "family", title: "Gia đình", level: "Cơ bản", desc: "Thành viên và sinh hoạt gia đình.", color: TOPIC_THEME_POOL[2].color, icon: "🏡" },
  { id: "school", title: "Học tập", level: "Trung bình", desc: "Lớp học, bài tập, kiểm tra.", color: TOPIC_THEME_POOL[3].color, icon: "📚" },
  { id: "social", title: "Xã hội", level: "Trung bình", desc: "Bạn bè và giao tiếp cộng đồng.", color: TOPIC_THEME_POOL[4].color, icon: "🌍" },
  { id: "emotion", title: "Cảm xúc", level: "Trung bình", desc: "Vui, buồn, lo lắng, ngạc nhiên.", color: TOPIC_THEME_POOL[5].color, icon: "🙂" },
  { id: "health", title: "Sức khỏe", level: "Trung bình", desc: "Triệu chứng, khám bệnh, chăm sóc.", color: TOPIC_THEME_POOL[6].color, icon: "🩺" },
  { id: "updates", title: "Khóa học cập nhật", level: "Trung bình", desc: "Thông tin, tin tức, chủ đề mới.", color: TOPIC_THEME_POOL[7].color, icon: "🆕" },
  { id: "work", title: "Công việc", level: "Nâng cao", desc: "Họp, báo cáo, lịch làm việc.", color: TOPIC_THEME_POOL[8].color, icon: "💼" },
  { id: "travel", title: "Di chuyển", level: "Nâng cao", desc: "Phương tiện, bến xe, mua vé.", color: TOPIC_THEME_POOL[8].color, icon: "🚌" },
];

const fallbackLessonTitlesByTopic = {
  basic: ["Chào hỏi", "Hỏi tên", "Gặp gỡ", "Câu hỏi thông dụng", "Xưng hô cơ bản"],
  family: ["Người lớn trong nhà", "Anh chị em", "Con cái", "Sinh hoạt gia đình", "Họ hàng"],
  school: ["Hoạt động học", "Người trong trường", "Tài liệu học", "Đồ dùng lớp học", "Viết và ghi chép"],
  social: ["Cộng đồng", "Giúp đỡ và hợp tác", "Người xung quanh", "Bạn bè", "Quan hệ xã hội"],
  emotion: ["Cảm xúc tích cực", "Cảm xúc buồn", "Bất ngờ và lo sợ", "Giữ bình tĩnh", "Trạng thái vui"],
  health: ["Chăm sóc sức khỏe", "Đi khám", "Triệu chứng", "Sơ cứu cơ bản", "Cơ thể và bệnh lý"],
  updates: ["Thông tin mới", "Tin tức và chủ đề", "Bài báo và báo cáo", "Biểu đồ dữ liệu", "Hỏi đáp cập nhật"],
  work: ["Công việc hằng ngày", "Họp và hợp đồng", "Lịch làm việc", "Báo cáo bán hàng", "Người làm việc"],
  travel: ["Phương tiện", "Nhà ga và bến xe", "Tàu xe", "Lưu thông", "Chuyến đi"],
};

const fallbackVocabWordMap = {
  updates: ["Thông tin", "Tin tức", "Chủ đề", "Chương trình", "Môn khoa học", "Bài báo", "Báo cáo", "Biểu thị", "Biểu đồ", "Biểu đồ hình quạt", "Bao nhiêu", "Bao giờ"],
  basic: ["Giao tiếp", "Chào", "Xin lỗi", "Tạm biệt", "Tên là gì", "Không có chi", "Gặp gỡ", "Bao giờ", "Bao nhiêu", "Bạn", "Ai", "Ai cho"],
  family: ["Bố", "Bố mẹ", "Cha mẹ", "Ông bà", "Anh chị em", "Anh em", "Em trai", "Con trai", "Con gái", "Bé em", "Anh ruột", "Anh rể", "Bé gái", "Bé trai", "Anh họ"],
  school: ["Học tập", "Lớp", "Làm bài tập", "Kiểm tra", "Cô giáo", "Thầy giáo", "Sách giáo khoa", "Đi học", "Ban giám hiệu", "Bảng học sinh", "Bảng đen", "Bút bi", "Bút màu", "Bút máy", "Bụi phấn"],
  social: ["Xã hội", "Công cộng", "Giao tiếp", "Hàng xóm", "Giúp đỡ", "Hợp tác", "Người quen", "Người lạ", "Bạn", "Bạn gái", "Bạn trai", "Con người", "Môn lịch sử", "Quan hệ", "Giao lưu"],
  emotion: ["Vui mừng", "Buồn thảm", "Ngạc nhiên", "Lo sợ", "Hoảng sợ", "Nổi giận", "Hồi hộp", "Bình an", "Bực mình", "Vui sướng", "Niềm vui", "Vui tính"],
  health: ["Chăm sóc sức khỏe", "Bệnh nhân", "Bệnh tật", "Khám bệnh", "Hiệu thuốc", "Đau bụng", "Ốm đau", "Khỏi bệnh", "Buồn nôn", "Thuốc bắc", "Băng bó", "Bụng", "Bỏng", "Buồng trứng"],
  work: ["Công việc", "Làm việc", "Việc làm", "Nhân viên", "Họp nhóm", "Hợp đồng", "Thời gian biểu", "Vấn đề", "Báo cáo", "Bán hàng", "Bồi bàn", "Hợp tác", "Họp", "Bưu tá", "Bản lề"],
  travel: ["Phương tiện", "Phương tiện giao thông", "Mua vé", "Bến xe", "Bến tàu", "Ga tàu", "Tàu hỏa", "Ô tô", "Xe máy", "Trạm xe buýt", "Lên xe", "Kẹt xe tắc đường", "Cao tốc", "Ca nô", "Bay"],
};

const fallbackVocabByTopic = Object.fromEntries(
  Object.entries(fallbackVocabWordMap).map(([topicId, words]) => [
    topicId,
    words.map((word) => ({
      word,
      slug: word
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      explanation: `Video ký hiệu cho từ "${word}" trong chủ đề này.`,
    })),
  ])
);

function splitVocabularyIntoMoocs(vocab, totalMoocs = 5) {
  const words = Array.isArray(vocab) ? vocab.filter(Boolean) : [];
  const result = [];
  let cursor = 0;

  for (let index = 0; index < totalMoocs; index += 1) {
    const remainingWords = words.length - cursor;
    const remainingMoocs = totalMoocs - index;
    let groupSize = Math.ceil(remainingWords / remainingMoocs);
    groupSize = Math.max(2, Math.min(3, groupSize));

    const minNeededAfterThis = Math.max(0, remainingMoocs - 1) * 2;
    if (remainingWords - groupSize < minNeededAfterThis) {
      groupSize = Math.max(1, remainingWords - minNeededAfterThis);
    }

    const group = words.slice(cursor, cursor + groupSize);
    cursor += groupSize;
    result.push(group.length ? group : words.slice(0, 1));
  }

  return result;
}

function buildFallbackMoocsForTopic(topicId) {
  const lessonTitles = fallbackLessonTitlesByTopic[topicId] || [];
  const vocabGroups = splitVocabularyIntoMoocs(fallbackVocabByTopic[topicId] || [], 5);

  return vocabGroups.map((vocabItems, index) => {
    const firstItem = vocabItems[0] || {};
    const wordList = vocabItems.map((item) => item.word).filter(Boolean).join(", ");

    return {
      id: `${topicId}-mooc-${index + 1}`,
      lessonId: null,
      moocIndex: index,
      moocNumber: index + 1,
      lessonTitle: lessonTitles[index] || `MOOC ${index + 1}`,
      description: `${vocabItems.length} từ vựng trong MOOC này.`,
      videoTitle: `Video MOOC ${index + 1}`,
      word: wordList || firstItem.word || `Từ vựng ${index + 1}`,
      explanation: "Chọn từng từ để xem video ký hiệu tương ứng.",
      signSlug: firstItem.slug || null,
      vocabItems,
    };
  });
}

export const fallbackMoocsByTopic = Object.fromEntries(
  fallbackTopics.map((topic) => [topic.id, buildFallbackMoocsForTopic(topic.id)])
);

export { TOPIC_THEME_POOL };
