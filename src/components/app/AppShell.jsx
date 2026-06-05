import React from "react";
import logo from "../../app/assets/logo.png";
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
