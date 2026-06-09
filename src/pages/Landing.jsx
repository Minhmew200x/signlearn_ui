import React from "react";
import logo from "../app/assets/logo.png";

const PRIMARY_LINKS = [
  { label: "Lộ trình", href: "#lo-trinh" },
  { label: "Lợi ích", href: "#loi-ich" },
  { label: "Ứng dụng", href: "#ung-dung" },
  { label: "Cộng đồng", href: "#cong-dong" },
];

const FEATURE_CARDS = [
  {
    title: "Lộ trình học có cấu trúc",
    description: "Chủ đề, video minh họa, quiz và AI practice được nối thành một đường học dễ theo dõi.",
    tone: "light",
  },
  {
    title: "Luôn biết mình đang ở đâu",
    description: "Tiến độ lesson, bài đang học và hoạt động gần nhất luôn hiện rõ ngay khi quay lại.",
    tone: "dark",
  },
  {
    title: "Thực hành đều tay mỗi ngày",
    description: "Từ video mẫu đến luyện phản xạ bằng AI, SignLearn giúp việc ôn tập bớt đứt quãng.",
    tone: "dark",
  },
];

const TRUST_ITEMS = ["Video minh họa", "Quiz", "AI Practice", "Blog cộng đồng", "Tiến độ học", "Khu vực quản trị"];

const USE_CASES = [
  {
    eyebrow: "Người học",
    title: "Bắt đầu nhanh, quay lại còn nhanh hơn",
    description: "Mở đúng bài đang học, xem lộ trình theo chủ đề và tiếp tục từ phần còn dở mà không phải tìm lại từ đầu.",
    accent: "blue",
  },
  {
    eyebrow: "Giảng viên và quản trị",
    title: "Quản lý nội dung học trong cùng một hệ thống",
    description: "Course, lesson, blog và trạng thái xuất bản có thể được vận hành trong cùng luồng SignLearn.",
    accent: "amber",
  },
];

function Logo() {
  return (
    <div className="flex items-center gap-3 px-1 py-1">
      <img src={logo} alt="Signlearn" className="h-14 w-14 shrink-0 object-contain" />
      <div className="leading-tight">
        <div className="flex items-baseline text-[1.7rem] font-black tracking-tight text-slate-900">
          <span className="text-blue-700">Sign</span>
          <span className="text-amber-500">Learn</span>
        </div>
        <div className="text-sm font-semibold text-slate-500">Ký hiệu kết nối</div>
      </div>
    </div>
  );
}

function HeroOrb({ className }) {
  return <div aria-hidden="true" className={className} />;
}

function FloatingPill({ title, description, className }) {
  return (
    <div className={`rounded-[1.6rem] border border-white/70 bg-white/90 p-4 shadow-lg shadow-blue-100/60 backdrop-blur ${className}`}>
      <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">{title}</div>
      <div className="mt-2 text-sm font-semibold leading-6 text-slate-600">{description}</div>
    </div>
  );
}

function FeatureCard({ title, description, tone, children }) {
  const baseClassName = tone === "dark"
    ? "rounded-[2rem] bg-[linear-gradient(145deg,_#192847,_#253e6c)] p-6 text-white shadow-xl shadow-slate-200"
    : "rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-6 text-slate-900 shadow-sm";

  return (
    <article className={baseClassName}>
      <h3 className="max-w-xs text-2xl font-black leading-tight">{title}</h3>
      <p className={`mt-4 max-w-sm text-sm font-semibold leading-7 ${tone === "dark" ? "text-slate-300" : "text-slate-600"}`}>
        {description}
      </p>
      {children}
    </article>
  );
}

export default function Landing({ onLogin }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28rem),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.14),_transparent_28rem),linear-gradient(145deg,_#ffffff_0%,_#f8fbff_54%,_#fffdf8_100%)] text-slate-900">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/png" href="/src/app/assets/logo.png" />
        <title>Signlearn</title>
      </head>
      <header className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-5 py-5 md:px-8 md:py-6">
        <div className="flex items-center gap-3">
          <Logo />
        </div>

        <nav className="hidden items-center gap-8 lg:flex">
          {PRIMARY_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-bold text-slate-600 transition hover:text-blue-700">
              {link.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          onClick={onLogin}
          className="min-h-12 rounded-full bg-[#1d2e52] px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:-translate-y-0.5 hover:bg-[#284274]"
        >
          Đăng nhập
        </button>
      </header>

      <section className="mx-auto w-full max-w-[1600px] px-5 pb-8 md:px-8 md:pb-10">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(239,246,255,0.94)_52%,_rgba(255,251,235,0.92)_100%)] px-6 py-8 shadow-[0_30px_90px_rgba(148,163,184,0.18)] ring-1 ring-blue-100/70 md:px-10 md:py-10 lg:px-12 lg:py-12">
          <HeroOrb className="absolute -left-24 bottom-[-7rem] h-72 w-72 rounded-full bg-blue-300/35 blur-3xl" />
          <HeroOrb className="absolute -right-24 top-[-5rem] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl" />
          <HeroOrb className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60 blur-3xl" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-end">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center lg:mx-0 lg:items-start lg:text-left">
              <div className="inline-flex rounded-full border border-blue-100 bg-white/90 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-blue-700 shadow-sm">
                Học ký hiệu theo lộ trình
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-slate-900 md:text-7xl">
                Nơi việc học ký hiệu
                <span className="block text-blue-700">rõ ràng và dễ tiếp tục mỗi ngày.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-600 md:text-lg">
                SignLearn kết hợp lesson, video minh họa, quiz, AI practice và blog trong một trải nghiệm học tập sáng, gọn và có tiến độ thật.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                <button
                  type="button"
                  onClick={onLogin}
                  className="min-h-12 rounded-full bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  Bắt đầu học
                </button>
                <a
                  href="#lo-trinh"
                  className="min-h-12 rounded-full border border-blue-100 bg-white/90 px-6 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  Xem lộ trình
                </a>
              </div>
            </div>

            <div className="relative min-h-[360px] md:min-h-[440px] lg:min-h-[520px]">
              <div className="absolute inset-x-[6%] bottom-0 h-[46%] rounded-[2.4rem] bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.95),_transparent_32%),radial-gradient(circle_at_70%_35%,_rgba(96,165,250,0.55),_transparent_28%),linear-gradient(180deg,_rgba(37,99,235,0.28)_0%,_rgba(15,23,42,0.18)_100%)] blur-[1px]" />
              <div className="absolute bottom-4 left-[8%] h-44 w-44 rounded-full border-[10px] border-blue-200/80 bg-[radial-gradient(circle_at_30%_30%,_#ffffff_0%,_#dbeafe_38%,_#60a5fa_82%)] shadow-[0_20px_60px_rgba(96,165,250,0.35)] md:h-52 md:w-52" />
              <div className="absolute bottom-8 right-[10%] h-52 w-52 rounded-full border-[10px] border-slate-200/80 bg-[radial-gradient(circle_at_40%_30%,_#ffffff_0%,_#e0f2fe_36%,_#1d4ed8_86%)] shadow-[0_25px_70px_rgba(30,64,175,0.25)] md:h-64 md:w-64" />
              <div className="absolute bottom-0 left-[4%] right-[4%] h-[40%] rounded-[2.4rem] bg-[radial-gradient(circle_at_15%_20%,_rgba(255,255,255,0.9),_transparent_20%),radial-gradient(circle_at_35%_30%,_rgba(191,219,254,0.9),_transparent_18%),radial-gradient(circle_at_55%_18%,_rgba(254,243,199,0.9),_transparent_16%),radial-gradient(circle_at_72%_35%,_rgba(96,165,250,0.9),_transparent_18%),radial-gradient(circle_at_88%_20%,_rgba(255,255,255,0.92),_transparent_18%),linear-gradient(180deg,_rgba(191,219,254,0.4)_0%,_rgba(30,41,59,0.12)_100%)]" />

              <FloatingPill
                title="Bài đang học"
                description="Mở lại đúng lesson, xem tiến độ và học tiếp mà không phải tìm lại từ đầu."
                className="absolute left-0 top-4 max-w-[250px] md:left-4"
              />
              <FloatingPill
                title="AI Practice"
                description="Luyện phản xạ ký hiệu, xem lại lịch sử và giữ nhịp học đều mỗi ngày."
                className="absolute right-0 top-24 max-w-[250px] md:right-4"
              />
              <div className="absolute bottom-6 left-1/2 w-[min(92%,340px)] -translate-x-1/2 rounded-[1.8rem] border border-slate-200/80 bg-white/92 p-5 shadow-xl shadow-slate-200/60 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Tiến độ học</div>
                    <div className="mt-2 text-3xl font-black text-slate-900">72%</div>
                  </div>
                  <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-800">Quiz + Video + AI</div>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[72%] rounded-full bg-blue-600" />
                </div>
                <div className="mt-3 text-sm font-semibold leading-6 text-slate-500">Một hành trình học duy nhất, nhưng nhiều cách để tiếp tục.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="lo-trinh" className="mx-auto w-full max-w-[1600px] px-5 py-10 md:px-8 md:py-14">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.88fr] lg:items-start">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">SignLearn là gì?</div>
            <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-6xl">
              Một ứng dụng học ngôn ngữ ký hiệu do người Việt và cho người Việt.
            </h2>
          </div>
          <div className="lg:pt-3">
            <p className="max-w-2xl text-lg font-semibold leading-9 text-slate-600">
              SignLearn dành cho người học cần một nơi để xem lộ trình, mở lesson, luyện bằng AI và theo dõi tiến độ thật. Giao diện mới giữ tone sáng của hệ thống hiện tại nhưng nâng nhịp thị giác để trang gốc bớt giống một màn giới thiệu tĩnh.
            </p>
            <a href="#loi-ich" className="mt-6 inline-flex rounded-full bg-[#1d2e52] px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:bg-[#284274]">
              Khám phá lợi ích
            </a>
          </div>
        </div>

        <div id="loi-ich" className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr_0.85fr]">
          <FeatureCard title={FEATURE_CARDS[0].title} description={FEATURE_CARDS[0].description} tone={FEATURE_CARDS[0].tone}>
            <div className="mt-8 overflow-hidden rounded-[1.6rem] border border-white/70 bg-white/90 p-5">
              <div className="flex items-end gap-4">
                <div className="h-28 w-28 rounded-full border-[8px] border-blue-200 bg-[radial-gradient(circle_at_35%_35%,_#ffffff_0%,_#bfdbfe_38%,_#3b82f6_85%)] shadow-lg shadow-blue-100" />
                <div className="flex-1">
                  <div className="text-sm font-black text-slate-900">Học theo từng bước</div>
                  <div className="mt-2 text-sm font-semibold leading-6 text-slate-500">Bắt đầu từ chủ đề, đi tới lesson, rồi chuyển sang luyện tập mà không mất ngữ cảnh.</div>
                </div>
              </div>
            </div>
          </FeatureCard>

          <FeatureCard title={FEATURE_CARDS[1].title} description={FEATURE_CARDS[1].description} tone={FEATURE_CARDS[1].tone}>
            <div className="mt-8 flex items-center justify-between rounded-[1.6rem] bg-white/6 p-4 ring-1 ring-white/10">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">Dashboard</div>
                <div className="mt-2 text-2xl font-black text-white">Continue lesson</div>
              </div>
              <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-blue-100">Streak 5 ngày</div>
            </div>
          </FeatureCard>

          <FeatureCard title={FEATURE_CARDS[2].title} description={FEATURE_CARDS[2].description} tone={FEATURE_CARDS[2].tone}>
            <div className="mt-8 rounded-[1.6rem] bg-gradient-to-br from-blue-500/20 to-amber-300/10 p-4 ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-lg font-black text-white">AI</div>
                <div>
                  <div className="text-sm font-black text-white">Thực hành phản xạ</div>
                  <div className="mt-1 text-sm font-semibold text-slate-300">Luyện đều, xem lại phiên gần nhất, giữ nhịp học liên tục.</div>
                </div>
              </div>
            </div>
          </FeatureCard>
        </div>

        <div id="cong-dong" className="mt-8 rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm md:p-6">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Các mảnh ghép trong hệ thống</div>
          <div className="mt-5 flex flex-wrap gap-3">
            {TRUST_ITEMS.map((item) => (
              <div key={item} className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-black text-blue-800">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ung-dung" className="mx-auto w-full max-w-[1600px] px-5 pb-16 md:px-8 md:pb-20">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] bg-transparent px-0 py-1 lg:px-1">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">SignLearn trong thực tế</div>
            <h2 className="mt-3 max-w-xl text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-6xl">
              Dùng cho học cá nhân, lớp học, và vận hành nội dung.
            </h2>
            <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-slate-600">
              Landing mới không chỉ để giới thiệu. Nó cần dẫn đúng kỳ vọng: vào học, theo dõi tiến độ, mở blog, hoặc đi tới khu vực quản trị tùy vai trò tài khoản.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {USE_CASES.map((card) => (
              <article
                key={card.title}
                className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-sm ${card.accent === "blue" ? "border-blue-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(239,246,255,0.94)_100%)]" : "border-amber-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(255,251,235,0.94)_100%)]"}`}
              >
                <div className={`absolute -right-10 -top-8 h-28 w-28 rounded-full blur-2xl ${card.accent === "blue" ? "bg-blue-200/70" : "bg-amber-200/70"}`} />
                <div className="relative z-10">
                  <div className={`text-xs font-black uppercase tracking-[0.18em] ${card.accent === "blue" ? "text-blue-700" : "text-amber-700"}`}>{card.eyebrow}</div>
                  <h3 className="mt-3 max-w-sm text-3xl font-black leading-tight text-slate-900">{card.title}</h3>
                  <p className="mt-4 max-w-sm text-sm font-semibold leading-7 text-slate-600">{card.description}</p>
                  <div className="mt-10 flex items-end justify-between gap-4">
                    <div className={`h-24 w-24 rounded-[2rem] border-[8px] ${card.accent === "blue" ? "border-blue-100 bg-[radial-gradient(circle_at_35%_35%,_#ffffff_0%,_#bfdbfe_42%,_#2563eb_88%)]" : "border-amber-100 bg-[radial-gradient(circle_at_35%_35%,_#ffffff_0%,_#fde68a_42%,_#f59e0b_88%)]"}`} />
                    <div className="text-3xl font-black text-slate-300">↗</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-[2.4rem] border border-slate-200 bg-[linear-gradient(145deg,_#182640,_#223a66)] px-6 py-8 text-white shadow-[0_25px_70px_rgba(15,23,42,0.16)] md:px-8 md:py-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">Sẵn sàng bắt đầu?</div>
              <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight md:text-5xl">
                Vào SignLearn để mở lộ trình học, quiz và AI practice trong cùng một luồng.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onLogin}
                className="min-h-12 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                Đăng nhập ngay
              </button>
              <a
                href="#lo-trinh"
                className="min-h-12 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Xem lại lộ trình
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
