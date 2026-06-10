import React, { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../app/lib/api.js";
import { makeBlogPath } from "../app/lib/routing.js";

const BLOG_POSTS_ENDPOINT = "/api/v1/blog/posts";
const BLOG_CATEGORIES_ENDPOINT = "/api/v1/blog/categories";

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "active" || value === "published") return "published";
  if (value === "reject") return "rejected";
  return "draft";
}

function normalizePosts(payload) {
  const list = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
  return list
    .map((item) => {
      const id = Number(item?.id);
      if (!id) return null;
      return {
        id,
        slug: String(item?.slug || `post-${id}`),
        title: String(item?.title || "Bài viết chưa có tiêu đề"),
        summary: String(item?.summary || "").replace(/\[topic:[a-z-]+\]/gi, "").trim(),
        content: String(item?.content || ""),
        status: normalizeStatus(item?.status),
        rawStatus: item?.status || "pending",
        publishedAt: item?.published_at,
        createdAt: item?.created_at,
        updatedAt: item?.updated_at,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.publishedAt || b.createdAt || 0).getTime() - new Date(a.publishedAt || a.createdAt || 0).getTime());
}

function normalizeCategories(payload) {
  const list = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
  return list
    .map((item) => {
      const id = Number(item?.id);
      if (!id) return null;
      return {
        id,
        name: String(item?.name || item?.slug || `Category ${id}`),
        slug: String(item?.slug || `category-${id}`),
        description: String(item?.description || ""),
      };
    })
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(parsed);
}

function getPostCategoryNames(post, categoriesById, postCategoriesById) {
  const categoryIds = postCategoriesById[post.id] || [];
  return categoryIds.map((id) => categoriesById[id]?.name).filter(Boolean);
}

function StatusBadge({ status }) {
  const isPublished = status === "published";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      {isPublished ? "Đã đăng" : "Bản nháp"}
    </span>
  );
}

function SignLearnWordmark({ className = "" }) {
  return (
    <span className={`inline-flex items-baseline font-black tracking-tight ${className}`}>
      <span className="text-blue-700">Sign</span>
      <span className="text-amber-500">Learn</span>
    </span>
  );
}

function BlogCard({ post, categoryNames, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex min-h-[220px] w-full cursor-pointer flex-col rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <span className="flex flex-wrap items-center gap-2">
        <StatusBadge status={post.status} />
        {categoryNames.slice(0, 2).map((name) => (
          <span key={name} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">{name}</span>
        ))}
      </span>
      <span className="mt-3 text-xl font-black leading-snug text-slate-900 transition group-hover:text-blue-700">{post.title}</span>
      <span className="mt-2 flex-1 text-sm font-medium leading-6 text-slate-600">{post.summary || "Bài viết chưa có tóm tắt."}</span>
      <span className="mt-4 border-t border-slate-100 pt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {formatDate(post.publishedAt || post.createdAt)}
      </span>
    </button>
  );
}

function BlogSidebar({ posts, selectedSlug, onOpen, onBack }) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <button
        type="button"
        onClick={onBack}
        className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
      >
        ← Quay lại danh sách
      </button>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Bài khác</div>
        <div className="mt-3 space-y-2">
          {posts.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => onOpen(post)}
              className={`w-full rounded-[1.15rem] px-3.5 py-2.5 text-left transition ${selectedSlug === post.slug ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
            >
              <div className="text-sm font-black leading-6">{post.title}</div>
              <div className={`mt-1 text-xs font-semibold ${selectedSlug === post.slug ? "text-blue-50" : "text-slate-500"}`}>{formatDate(post.publishedAt || post.createdAt)}</div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function Blogs({ currentUser = null, accessToken = "", blogSlug = "", navigateTo }) {
  const isAdmin = currentUser?.role === "admin";
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [postCategoriesById, setPostCategoriesById] = useState({});
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");

  const categoriesById = useMemo(() => Object.fromEntries(categories.map((category) => [category.id, category])), [categories]);
  const publishedPosts = useMemo(() => (isAdmin ? posts : posts.filter((post) => post.status === "published")), [isAdmin, posts]);
  const filteredPosts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return publishedPosts.filter((post) => {
      const categoryMatch = activeCategoryId === "all" || (postCategoriesById[post.id] || []).includes(Number(activeCategoryId));
      if (!categoryMatch) return false;
      if (!normalizedSearch) return true;
      return `${post.title} ${post.summary} ${post.content}`.toLowerCase().includes(normalizedSearch);
    });
  }, [activeCategoryId, postCategoriesById, publishedPosts, searchTerm]);

  async function fetchPostPayload() {
    const baseQuery = { skip: 0, limit: 200 };
    if (!isAdmin) return apiRequest(BLOG_POSTS_ENDPOINT, { accessToken, query: baseQuery });

    try {
      return await apiRequest(BLOG_POSTS_ENDPOINT, { accessToken, query: { ...baseQuery, include_drafts: true } });
    } catch (err) {
      if (![400, 404, 422, 500].includes(err?.status)) throw err;
      return apiRequest(BLOG_POSTS_ENDPOINT, { accessToken, query: baseQuery });
    }
  }

  async function openPost(post, { replace = false } = {}) {
    if (!post?.slug) return;
    if (typeof navigateTo === "function") {
      navigateTo(makeBlogPath(post.slug), { replace });
    }
  }

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    if (typeof navigateTo === "function") navigateTo(makeBlogPath(), { replace: true });
  }

  async function loadPosts() {
    if (!accessToken) {
      setPosts([]);
      setCategories([]);
      setPostCategoriesById({});
      setLoading(false);
      setError("Bạn cần đăng nhập để xem blog.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [postPayload, categoryPayload] = await Promise.all([
        fetchPostPayload(),
        apiRequest(BLOG_CATEGORIES_ENDPOINT, { accessToken, query: { skip: 0, limit: 200 } }),
      ]);

      const nextPosts = normalizePosts(postPayload);
      const nextCategories = normalizeCategories(categoryPayload);
      setPosts(nextPosts);
      setCategories(nextCategories);

      const categoryResults = await Promise.allSettled(
        nextPosts.map(async (post) => {
          const payload = await apiRequest(`/api/v1/blog/posts/${post.id}/categories`, { accessToken });
          const categoryIds = normalizeCategories(payload).map((category) => category.id);
          return [post.id, categoryIds];
        })
      );
      const nextPostCategoryMap = {};
      categoryResults.forEach((result) => {
        if (result.status === "fulfilled") {
          const [postId, categoryIds] = result.value;
          nextPostCategoryMap[postId] = categoryIds;
        }
      });
      setPostCategoriesById(nextPostCategoryMap);
    } catch (err) {
      setError(err?.message || "Không tải được blog từ API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, [accessToken, isAdmin]);

  useEffect(() => {
    if (!blogSlug) {
      setSelectedPost(null);
      setDetailError("");
      return;
    }

    let cancelled = false;
    async function loadDetail() {
      const post = posts.find((item) => item.slug === blogSlug);
      if (post) {
        setSelectedPost(post);
        setDetailError("");
        return;
      }

      setDetailLoading(true);
      setDetailError("");
      try {
        const detailPayload = await apiRequest(`${BLOG_POSTS_ENDPOINT}/${encodeURIComponent(blogSlug)}`, { accessToken });
        const [detail] = normalizePosts([detailPayload]);
        if (!cancelled) setSelectedPost(detail || null);
      } catch (err) {
        if (!cancelled) {
          setSelectedPost(null);
          setDetailError(err?.message || "Không tải được chi tiết bài viết.");
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [accessToken, blogSlug, posts]);

  const selectedCategoryNames = selectedPost ? getPostCategoryNames(selectedPost, categoriesById, postCategoriesById) : [];
  const detailPosts = selectedPost ? filteredPosts.filter((post) => post.id !== selectedPost.id) : filteredPosts;
  const isDetailRoute = Boolean(blogSlug);

  return (
    <main className="mx-auto w-full max-w-[1360px] px-4 py-6 md:px-6 md:py-8">
      {!isDetailRoute && (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-amber-700 ring-1 ring-amber-100">
              Blog cộng đồng
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-900 md:text-4xl">
              Bài viết mới từ cộng đồng <SignLearnWordmark className="text-inherit" />
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600">
              Giao diện được giữ gọn để ưu tiên danh sách bài viết, lọc nhanh và chuyển thẳng vào nội dung.
            </p>
          </div>
        </section>
      )}

      {error && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}

      {!isDetailRoute && (
        <section className="mt-6 grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Tìm bài</span>
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nhập tiêu đề hoặc nội dung"
                  className="mt-3 min-h-11 w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none ring-blue-100 transition focus:bg-white focus:ring-4"
                />
              </label>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Danh mục</div>
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveCategoryId("all")}
                  className={`w-full rounded-[1.15rem] px-3.5 py-2.5 text-left text-sm font-black ${activeCategoryId === "all" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                >
                  Tất cả bài viết ({publishedPosts.length})
                </button>
                {categories.map((category) => {
                  const count = publishedPosts.filter((post) => (postCategoriesById[post.id] || []).includes(category.id)).length;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setActiveCategoryId(String(category.id))}
                      className={`w-full rounded-[1.15rem] px-3.5 py-2.5 text-left text-sm font-black ${activeCategoryId === String(category.id) ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                    >
                      {category.name} ({count})
                    </button>
                  );
                })}
              </div>
              {!categories.length && !loading && <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">Chưa có danh mục.</div>}
            </div>
          </aside>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {loading && <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500 shadow-sm">Đang tải bài viết...</div>}
            {!loading && filteredPosts.length === 0 && (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-5 text-sm font-semibold text-slate-500">
                Không có bài viết phù hợp bộ lọc hiện tại.
              </div>
            )}
            {filteredPosts.map((post) => {
              const categoryNames = getPostCategoryNames(post, categoriesById, postCategoriesById);
              return <BlogCard key={post.id} post={post} categoryNames={categoryNames} onOpen={() => openPost(post)} />;
            })}
          </div>
        </section>
      )}

      {isDetailRoute && (
        <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <BlogSidebar posts={detailPosts} selectedSlug={selectedPost?.slug || blogSlug} onOpen={openPost} onBack={goBack} />

          <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-amber-400 p-5 text-white md:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selectedPost?.status || "draft"} />
                {selectedCategoryNames.map((name) => (
                  <span key={name} className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-100">{name}</span>
                ))}
              </div>
              <h2 className="mt-4 text-2xl font-black leading-tight md:text-4xl">{selectedPost?.title || "Bài viết chưa có tiêu đề"}</h2>
              <div className="mt-3 text-sm font-semibold text-slate-300">Cập nhật {formatDate(selectedPost?.updatedAt || selectedPost?.publishedAt || selectedPost?.createdAt)}</div>
            </div>
            <div className="p-5 md:p-7">
              {detailError && <div className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">{detailError}</div>}
              {detailLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">Đang tải chi tiết...</div>
              ) : (
                <>
                  <p className="text-base font-semibold leading-7 text-slate-600">{selectedPost?.summary || "Bài viết chưa có tóm tắt."}</p>
                  <div className="mt-5 whitespace-pre-wrap text-[15px] leading-8 text-slate-700">{selectedPost?.content || "Bài viết chưa có nội dung."}</div>
                </>
              )}
            </div>
          </article>
        </section>
      )}
    </main>
  );
}
