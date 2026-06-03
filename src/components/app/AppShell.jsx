import React from "react";
import { brandButton, brandRing } from "../../app/lib/brandTheme.js";

export function AppButton({ children, onClick, variant = "primary", className = "", disabled = false }) {
  const base = `min-h-12 rounded-2xl px-5 py-3 text-base font-black transition active:scale-[0.98] disabled:cursor-not-allowed ${brandRing.focus}`;
  const styles = {
    primary: `${brandButton.primary} disabled:bg-slate-200 disabled:text-slate-400`,
    soft: `${brandButton.soft} disabled:bg-slate-100 disabled:text-slate-400`,
    ghost: `${brandButton.ghost} disabled:text-slate-400`,
    dark: "bg-amber-400 text-slate-900 shadow-lg shadow-amber-100 hover:bg-amber-500 disabled:bg-slate-200 disabled:text-slate-400",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white/90 px-2 py-1 shadow-sm ring-1 ring-blue-100">
      <svg viewBox="0 0 64 64" className="h-12 w-12 shrink-0 drop-shadow-sm" aria-hidden="true">
        <defs>
          <linearGradient id="signlearn-bubble" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FBBF24" />
            <stop offset="1" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="signlearn-hand" x1="18" y1="14" x2="42" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0F4FB6" />
            <stop offset="1" stopColor="#2B6FD8" />
          </linearGradient>
        </defs>
        <path
          d="M14 34c0-11 9-20 20-20s20 9 20 20-5 16-12 20l-2 2-5-2c-3 1-6 1-9 1-11 0-12-9-12-21Z"
          fill="none"
          stroke="url(#signlearn-bubble)"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24 46 28 29c.4-1.7 2-2.8 3.7-2.6 1.6.2 2.9 1.5 3.1 3.2l.5 4.2 4.4-11.3c.7-1.9 2.8-2.8 4.7-2 1.8.8 2.7 2.9 2 4.8L41.5 37l3.2-1.8c1.8-1 4.1-.4 5.2 1.3l2.7 4.5c.9 1.4.7 3.2-.4 4.4l-4.1 4.4c-.7.7-1.6 1.1-2.5 1.1H38c-1.1 0-2.1.3-3 1l-1.6 1.2"
          fill="none"
          stroke="url(#signlearn-hand)"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
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

export function Header({ page, setPage }) {
  const nav = [
    ["home", "Tổng quan"],
    ["blogs", "Blog"],
    ["learning", "Học tập"],
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <button onClick={() => setPage("home")} className={`rounded-2xl text-left ${brandRing.focus}`}>
          <Logo />
        </button>
        <nav className="grid w-full max-w-md grid-cols-3 gap-2 lg:w-auto lg:min-w-[360px]">
          {nav.map(([id, label]) => {
            const learningChild = id === "learning" && ["topic", "lesson", "ai"].includes(page);
            const active = page === id || learningChild;
            return (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={`min-h-12 w-full rounded-2xl px-4 py-2 text-base font-black transition ${brandRing.focus} ${
                  active ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white text-slate-800 ring-1 ring-blue-100 hover:bg-blue-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
