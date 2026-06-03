import React, { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../app/lib/api.js";

const AVATAR_STORAGE_KEY = "signlearn.profile.avatar_asset_id";

const AVATAR_PRESETS = [
  { id: 101, emoji: "🐻", name: "Gấu Mật" },
  { id: 102, emoji: "🐰", name: "Thỏ Mây" },
  { id: 103, emoji: "🐼", name: "Panda Bông" },
  { id: 104, emoji: "🐱", name: "Mèo Kem" },
  { id: 105, emoji: "🦊", name: "Cáo Cam" },
  { id: 106, emoji: "🐸", name: "Ếch Cốm" },
  { id: 107, emoji: "🐯", name: "Hổ Sữa" },
  { id: 108, emoji: "🐨", name: "Koala Bụi" },
];

const AVATAR_BG_BY_ID = {
  101: ["#fef3c7", "#f59e0b"],
  102: ["#fee2e2", "#fb7185"],
  103: ["#e0f2fe", "#38bdf8"],
  104: ["#ede9fe", "#8b5cf6"],
  105: ["#ffedd5", "#f97316"],
  106: ["#dcfce7", "#22c55e"],
  107: ["#fef9c3", "#eab308"],
  108: ["#dbeafe", "#3b82f6"],
};

function formatRole(role) {
  if (role === "admin") return "Quản trị";
  if (role === "student") return "Học viên";
  return role || "--";
}

function formatDate(value) {
  if (!value) return "--";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function getAvatarPreset(avatarAssetId) {
  return AVATAR_PRESETS.find((item) => item.id === Number(avatarAssetId)) || AVATAR_PRESETS[0];
}

function buildAvatarDataUrl(avatarAssetId) {
  const preset = getAvatarPreset(avatarAssetId);
  const [bgStart, bgEnd] = AVATAR_BG_BY_ID[preset.id] || ["#dbeafe", "#60a5fa"];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bgStart}" />
          <stop offset="100%" stop-color="${bgEnd}" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="28" fill="url(#g)" />
      <circle cx="48" cy="48" r="27" fill="rgba(255,255,255,0.32)" />
      <text x="48" y="58" text-anchor="middle" font-size="36">${preset.emoji}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

function AvatarImage({ avatarAssetId, alt, className = "" }) {
  return <img src={buildAvatarDataUrl(avatarAssetId)} alt={alt} className={className} />;
}

function getStoredAvatarAssetId(userId) {
  if (typeof window === "undefined" || !userId) return null;

  try {
    const raw = window.localStorage.getItem(`${AVATAR_STORAGE_KEY}:${userId}`);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function setStoredAvatarAssetId(userId, avatarAssetId) {
  if (typeof window === "undefined" || !userId) return;

  try {
    if (!avatarAssetId) {
      window.localStorage.removeItem(`${AVATAR_STORAGE_KEY}:${userId}`);
      return;
    }

    window.localStorage.setItem(`${AVATAR_STORAGE_KEY}:${userId}`, String(avatarAssetId));
  } catch {
    // Ignore storage failures.
  }
}

function ProfileEditor({
  displayName,
  displayUser,
  displayAvatarId,
  selectedAvatar,
  selectedAvatarId,
  loadingProfile,
  savingProfile,
  profileDraft,
  profileError,
  profileSuccess,
  setProfileDraft,
  saveProfile,
  loadProfile,
  onBackToLearning,
}) {
  return (
    <section className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <AvatarImage avatarAssetId={displayAvatarId} alt={displayName} className="h-24 w-24 rounded-[2rem] object-cover md:h-28 md:w-28" />
          <div>
            <div className="inline-flex rounded-full bg-blue-600 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-blue-100">
              Hồ sơ học tập
            </div>
            <h1 className="mt-3 text-3xl font-black text-slate-900">{displayName}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">Chỉnh tên hiển thị, avatar và xem thông tin tài khoản.</p>
          </div>
        </div>

        {onBackToLearning && (
          <button
            type="button"
            onClick={onBackToLearning}
            className="min-h-12 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
          >
            Về học tập
          </button>
        )}
      </div>

      {profileError && <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{profileError}</div>}
      {profileSuccess && <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{profileSuccess}</div>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr),320px]">
        <div className="space-y-5 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-4 rounded-[1.5rem] bg-white p-4 ring-1 ring-slate-100 sm:flex-row sm:items-center">
            <AvatarImage avatarAssetId={selectedAvatarId} alt={selectedAvatar.name} className="h-24 w-24 rounded-[1.75rem] object-cover" />
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">Avatar đã chọn</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{selectedAvatar.name}</div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Chọn avatar bên dưới rồi lưu thay đổi.</div>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Tên hiển thị</span>
            <input
              value={profileDraft.full_name}
              onChange={(event) => setProfileDraft((prev) => ({ ...prev, full_name: event.target.value }))}
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none ring-blue-200 transition focus:ring-4"
              placeholder="Nhập họ và tên"
              disabled={loadingProfile || savingProfile}
            />
          </label>

          <div>
            <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Chọn avatar có sẵn</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {AVATAR_PRESETS.map((avatar) => {
                const active = avatar.id === selectedAvatarId;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setProfileDraft((prev) => ({ ...prev, avatar_asset_id: avatar.id }))}
                    disabled={loadingProfile || savingProfile}
                    className={`rounded-[1.5rem] border p-3 text-center transition ${
                      active
                        ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300"
                    }`}
                  >
                    <AvatarImage avatarAssetId={avatar.id} alt={avatar.name} className="mx-auto h-16 w-16 rounded-2xl object-cover" />
                    <div className="mt-2 text-sm font-black text-slate-900">{avatar.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveProfile}
              disabled={loadingProfile || savingProfile}
              className="min-h-12 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {savingProfile ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            <button
              type="button"
              onClick={loadProfile}
              disabled={loadingProfile || savingProfile}
              className="min-h-12 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              {loadingProfile ? "Đang tải..." : "Tải lại"}
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-5">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Email</div>
            <div className="mt-1 text-sm font-semibold text-slate-900 break-all">{displayUser?.email || "--"}</div>
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Vai trò</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{formatRole(displayUser?.role)}</div>
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Avatar hiện tại</div>
            <div className="mt-2 flex items-center gap-3">
              <AvatarImage avatarAssetId={displayAvatarId} alt={displayName} className="h-14 w-14 rounded-2xl object-cover" />
              <div>
                <div className="text-sm font-black text-slate-900">{getAvatarPreset(displayAvatarId).name}</div>
                <div className="text-xs font-semibold text-slate-500">ID: {displayAvatarId}</div>
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Tạo lúc</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{formatDate(displayUser?.created_at)}</div>
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Cập nhật lúc</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{formatDate(displayUser?.updated_at)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HoSo({
  mode = "compact",
  currentUser,
  accessToken,
  progress,
  topics,
  moocsByTopic,
  courseProgressByCourseId = {},
  onLogout,
  onUserUpdate,
  onOpenProfilePage,
  onBackToLearning,
}) {
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileDraft, setProfileDraft] = useState({
    full_name: currentUser?.full_name || "",
    avatar_asset_id: currentUser?.avatar_asset_id ?? AVATAR_PRESETS[0].id,
  });
  const [profileData, setProfileData] = useState(currentUser || null);

  useEffect(() => {
    const storedAvatarId = getStoredAvatarAssetId(currentUser?.id);
    setProfileData(currentUser || null);
    setProfileDraft({
      full_name: currentUser?.full_name || "",
      avatar_asset_id: storedAvatarId ?? currentUser?.avatar_asset_id ?? AVATAR_PRESETS[0].id,
    });
  }, [currentUser]);

  const data = useMemo(() => {
    const allMoocs = topics.flatMap((topic) => moocsByTopic[topic.id] || []);
    const totalMoocs = allMoocs.length;

    let completedMoocs = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    let backendCompletionRate = 0;
    let backendCourseCount = 0;

    for (const topic of topics) {
      const topicProgress = progress?.[topic.id] || {};
      const completed = topicProgress.completedMoocs || {};
      const scores = topicProgress.bestScores || {};
      const backendProgress = courseProgressByCourseId[topic.courseId];

      if (backendProgress?.lessons?.length) {
        completedMoocs += backendProgress.lessons.filter((lesson) => lesson.status === "completed").length;
        backendCompletionRate += Number(backendProgress.progress?.progress_percent || 0);
        backendCourseCount += 1;
      } else {
        completedMoocs += Object.values(completed).filter(Boolean).length;
      }

      for (const value of Object.values(scores)) {
        const score = Number(value || 0);
        if (score > 0) {
          scoreSum += score;
          scoreCount += 1;
        }
      }
    }

    const completionRate = backendCourseCount
      ? Math.round(backendCompletionRate / backendCourseCount)
      : totalMoocs
        ? Math.round((completedMoocs / totalMoocs) * 100)
        : 0;
    const avgAiScore = scoreCount ? Math.round(scoreSum / scoreCount) : 0;

    return { totalMoocs, completedMoocs, completionRate, avgAiScore };
  }, [courseProgressByCourseId, moocsByTopic, progress, topics]);

  const displayUser = profileData || currentUser;
  const displayName = displayUser?.full_name || displayUser?.name || displayUser?.email || "Học viên";
  const displayAvatarId = getStoredAvatarAssetId(displayUser?.id) ?? displayUser?.avatar_asset_id ?? AVATAR_PRESETS[0].id;
  const selectedAvatarId = Number(profileDraft.avatar_asset_id) || AVATAR_PRESETS[0].id;
  const selectedAvatar = getAvatarPreset(selectedAvatarId);
  const level = currentUser?.level || (data.completionRate >= 70 ? "Nâng cao" : data.completionRate >= 35 ? "Trung bình" : "Cơ bản");

  async function loadProfile() {
    if (!accessToken) return;

    setLoadingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const me = await apiRequest("/api/v1/users/me", { accessToken });
      setProfileData(me);
      setProfileDraft({
        full_name: me?.full_name || "",
        avatar_asset_id: getStoredAvatarAssetId(me?.id) ?? me?.avatar_asset_id ?? AVATAR_PRESETS[0].id,
      });
    } catch (error) {
      setProfileError(error?.message || "Không tải được hồ sơ người dùng.");
    } finally {
      setLoadingProfile(false);
    }
  }

  useEffect(() => {
    if (mode === "standalone") {
      loadProfile();
    }
  }, [mode]);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const fullName = String(profileDraft.full_name || "").trim() || null;
      let updated;

      try {
        updated = await apiRequest("/api/v1/users/me", {
          method: "PATCH",
          accessToken,
          body: {
            full_name: fullName,
            avatar_asset_id: selectedAvatarId,
          },
        });
        setStoredAvatarAssetId(updated?.id, updated?.avatar_asset_id ?? selectedAvatarId);
      } catch (error) {
        if (error?.status !== 500) throw error;

        updated = await apiRequest("/api/v1/users/me", {
          method: "PATCH",
          accessToken,
          body: { full_name: fullName },
        });
        setStoredAvatarAssetId(updated?.id, selectedAvatarId);
      }

      setProfileData(updated ? { ...updated, avatar_asset_id: selectedAvatarId } : null);
      setProfileDraft({
        full_name: updated?.full_name || "",
        avatar_asset_id: selectedAvatarId,
      });
      setProfileSuccess("Đã cập nhật hồ sơ.");
      onUserUpdate?.(updated ? { ...updated, avatar_asset_id: selectedAvatarId } : updated);
    } catch (error) {
      setProfileError(error?.message || "Không cập nhật được hồ sơ.");
    } finally {
      setSavingProfile(false);
    }
  }

  if (mode === "standalone") {
    return (
      <div className="space-y-5">
        <ProfileEditor
          displayName={displayName}
          displayUser={displayUser}
          displayAvatarId={displayAvatarId}
          selectedAvatar={selectedAvatar}
          selectedAvatarId={selectedAvatarId}
          loadingProfile={loadingProfile}
          savingProfile={savingProfile}
          profileDraft={profileDraft}
          profileError={profileError}
          profileSuccess={profileSuccess}
          setProfileDraft={setProfileDraft}
          saveProfile={saveProfile}
          loadProfile={loadProfile}
          onBackToLearning={onBackToLearning}
        />

        <div className="rounded-[2rem] border border-rose-100 bg-white p-5 shadow-sm">
          <div className="text-xs font-black uppercase tracking-wide text-rose-500">Tài khoản</div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-[1.5rem] bg-rose-600 px-5 py-4 text-center text-base font-black text-white transition hover:bg-rose-700"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <aside className="rounded-[2rem] border border-blue-100 bg-gradient-to-b from-blue-50 via-white to-amber-50 p-6 shadow-sm">
        <div className="inline-flex rounded-full bg-blue-600 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-blue-100">
          Hồ sơ học tập
        </div>

        <button
          type="button"
          onClick={onOpenProfilePage}
          className="mt-4 flex w-full items-center gap-4 rounded-[1.75rem] bg-white px-4 py-4 text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-50"
        >
          <AvatarImage avatarAssetId={displayAvatarId} alt={displayName} className="h-20 w-20 rounded-[1.75rem] object-cover" />
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-black text-slate-900">{displayName}</div>
            <div className="mt-1 text-sm font-semibold text-slate-600">Cấp độ hiện tại: {level}</div>
          </div>
        </button>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm font-bold text-slate-700">
            <span>Tiến độ tổng</span>
            <span>{data.completionRate}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-amber-400 transition-all duration-500"
              style={{ width: `${data.completionRate}%` }}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Hoàn thành</div>
            <div className="mt-1 text-xl font-black text-slate-900">
              {data.completedMoocs}/{data.totalMoocs}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">AI trung bình</div>
            <div className="mt-1 text-xl font-black text-slate-900">{data.avgAiScore || "--"}</div>
          </div>
        </div>
      </aside>

      <button
        type="button"
        onClick={onLogout}
        className="flex min-h-12 w-full items-center justify-center rounded-[1.5rem] bg-rose-600 px-5 py-4 text-center text-base font-black text-white transition hover:bg-rose-700"
      >
        Đăng xuất
      </button>
    </div>
  );
}






