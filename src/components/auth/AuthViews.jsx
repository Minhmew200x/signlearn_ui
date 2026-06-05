import React, { useState } from 'react';

function cx(...values) {
  return values.filter(Boolean).join(' ');
}

function SignlearnBadge() {
  return (
    <div className={'inline-flex items-center gap-3 rounded-full border border-white/16 bg-white/12 px-4 py-3 text-sm font-semibold text-white/92 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur-xl'}>
      <span className={'grid h-8 w-8 place-items-center rounded-full bg-white text-blue-700 shadow-[0_10px_24px_rgba(255,255,255,0.28)]'}>
        <span className={'h-2.5 w-2.5 rounded-full bg-amber-400'} />
      </span>
      <span>Cổng xác thực SignLearn</span>
    </div>
  );
}

function Input({ className = '', ...props }) {
  return <input {...props} className={cx('min-h-14 w-full rounded-[20px] border border-slate-200/80 bg-slate-50 px-5 py-4 text-[15px] font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)]', className)} />;
}

function TabButton({ active, children, ...props }) {
  return (
    <button
      {...props}
      className={cx('min-h-14 rounded-[20px] px-5 text-base font-semibold transition duration-200', active ? 'bg-white text-blue-700 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80' : 'bg-transparent text-slate-500 hover:text-slate-900')}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, className = '', ...props }) {
  return <button {...props} className={cx('min-h-14 w-full rounded-[20px] bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_52%,#3b82f6_100%)] px-6 text-base font-semibold text-white shadow-[0_18px_40px_rgba(37,99,235,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(37,99,235,0.34)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60', className)}>{children}</button>;
}

function SecondaryButton({ children, className = '', ...props }) {
  return <button {...props} className={cx('min-h-14 w-full rounded-[20px] border border-slate-200 bg-white px-6 text-base font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-60', className)}>{children}</button>;
}

function GoogleIcon() {
  return (
    <svg aria-hidden={'true'} viewBox={'0 0 24 24'} className={'h-5 w-5'}>
      <path fill={'#4285F4'} d={'M21.81 12.23c0-.72-.06-1.25-.19-1.8H12.2v3.56h5.53c-.11.88-.7 2.2-2.01 3.09l-.02.12 2.91 2.21.2.02c1.86-1.68 2.99-4.14 2.99-7.2Z'} />
      <path fill={'#34A853'} d={'M12.2 21.9c2.71 0 4.99-.87 6.65-2.37l-3.17-2.35c-.85.58-1.99.99-3.48.99-2.65 0-4.91-1.68-5.71-4.02l-.12.01-3.02 2.29-.04.11A10.06 10.06 0 0 0 12.2 21.9Z'} />
      <path fill={'#FBBC05'} d={'M6.49 14.15A5.87 5.87 0 0 1 6.15 12c0-.75.13-1.48.33-2.15l-.01-.14-3.06-2.33-.1.05A9.7 9.7 0 0 0 2.2 12c0 1.57.39 3.06 1.11 4.39l3.18-2.24Z'} />
      <path fill={'#EA4335'} d={'M12.2 5.83c1.88 0 3.14.79 3.86 1.45l2.82-2.69C17.18 3.02 14.91 2.1 12.2 2.1a10.06 10.06 0 0 0-8.89 5.44l3.17 2.42c.81-2.34 3.07-4.13 5.72-4.13Z'} />
    </svg>
  );
}

export function AuthForm({ mode, onModeChange, onSubmit, onGoogleLogin, isSubmitting, errorMessage }) {
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const isRegister = mode === 'register';

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className={'min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(250,204,21,0.18),_transparent_24%),linear-gradient(180deg,_#f4f8ff_0%,_#ffffff_52%,_#f9fbff_100%)] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8'}>
      <div className={'mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1540px] overflow-hidden rounded-[34px] border border-white/60 bg-white/78 shadow-[0_32px_90px_rgba(15,23,42,0.12)] backdrop-blur-sm lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.18fr_0.82fr] xl:grid-cols-[1.22fr_0.78fr]'}>
        <section className={'relative flex min-h-[420px] items-center bg-[linear-gradient(135deg,#0f4ad7_0%,#2563eb_48%,#60a5fa_100%)] px-6 py-8 text-white sm:px-10 sm:py-10 lg:min-h-full lg:px-16 lg:py-14 xl:px-20'}>
          <div className={'absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,_rgba(255,255,255,0.18),_transparent_22%),radial-gradient(circle_at_78%_85%,_rgba(250,204,21,0.92),_transparent_14%),radial-gradient(circle_at_62%_74%,_rgba(250,204,21,0.20),_transparent_30%),radial-gradient(circle_at_70%_76%,_rgba(15,23,42,0.32),_transparent_26%)]'} />
          <div className={'relative z-10 max-w-2xl'}>
            <SignlearnBadge />
            <div className={'mt-8 inline-flex items-center rounded-full border border-white/16 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/78'}>Modern SaaS education</div>
            <h1 className={'mt-7 max-w-[11.5ch] text-[clamp(3.6rem,5.8vw,6.1rem)] font-extrabold leading-[0.94] tracking-[-0.07em] text-balance'}>{isRegister ? 'Tạo tài khoản để học cùng SignLearn' : 'Đăng nhập để vào học cùng SignLearn'}</h1>
            <p className={'mt-7 max-w-xl text-base font-medium leading-8 text-white/84 sm:text-lg'}>Học ký hiệu theo từng chủ đề, xem video minh họa và luyện tập lại bất cứ lúc nào.</p>
          </div>
        </section>

        <section className={'relative flex items-center justify-center px-4 py-6 sm:px-8 sm:py-10 lg:px-10 lg:py-12 xl:px-12'}>
          <div className={'absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(248,250,252,0.98))]'} />
          <div className={'relative z-10 w-full max-w-[540px] rounded-[32px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_64px_rgba(148,163,184,0.18)] sm:p-8 lg:p-9'}>
            <div className={'grid grid-cols-2 rounded-[24px] bg-slate-100 p-1.5'}>
              <TabButton active={!isRegister} onClick={() => onModeChange('login')} disabled={isSubmitting}>Đăng nhập</TabButton>
              <TabButton active={isRegister} onClick={() => onModeChange('register')} disabled={isSubmitting}>Đăng ký</TabButton>
            </div>
            <div className={'mt-7'}>
              <h2 className={'text-3xl font-semibold tracking-[-0.04em] text-slate-900'}>{isRegister ? 'Bắt đầu học cùng SignLearn' : 'Chào mừng quay lại'}</h2>
              <p className={'mt-2 text-sm leading-6 text-slate-500'}>{isRegister ? 'Tạo tài khoản để lưu tiến độ học và thực hành ký hiệu mỗi ngày.' : 'Đăng nhập để tiếp tục lộ trình học ngôn ngữ ký hiệu của bạn.'}</p>
            </div>
            {errorMessage ? <div className={'mt-5 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700'}>{errorMessage}</div> : null}
            <div className={'mt-7 space-y-5'}>
              {isRegister ? <label className={'block'}><span className={'mb-3 block text-sm font-semibold text-slate-700'}>Họ và tên</span><Input value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} placeholder={'Nguyen Van A'} autoComplete={'name'} /></label> : null}
              <label className={'block'}><span className={'mb-3 block text-sm font-semibold text-slate-700'}>Email</span><Input type={'email'} value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder={'minhmew@gmail.com'} autoComplete={'email'} /></label>
              <label className={'block'}><span className={'mb-3 block text-sm font-semibold text-slate-700'}>Mật khẩu</span><Input type={'password'} value={form.password} onChange={(e) => updateField('password', e.target.value)} placeholder={'Nhap mat khau'} autoComplete={isRegister ? 'new-password' : 'current-password'} /></label>
            </div>
            <div className={'mt-7 space-y-4'}>
              <PrimaryButton onClick={() => onSubmit(form)} disabled={isSubmitting}>{isSubmitting ? 'Đang xử lý...' : isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}</PrimaryButton>
              <SecondaryButton onClick={onGoogleLogin} disabled={isSubmitting} className={'inline-flex items-center justify-center gap-3'}><GoogleIcon /><span>Đăng nhập với Google</span></SecondaryButton>
            </div>
            <p className={'mt-7 text-center text-sm font-medium text-slate-500'}>{isRegister ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}<button type={'button'} onClick={() => onModeChange(isRegister ? 'login' : 'register')} className={'font-semibold text-blue-700 transition hover:text-blue-800'} disabled={isSubmitting}>{isRegister ? 'Đăng nhập' : 'Đăng ký miễn phí'}</button></p>
          </div>
        </section>
      </div>
    </div>
  );
}

function ActionButton({ children, className = '', ...props }) {
  return <button {...props} className={cx('min-h-11 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500', className)}>{children}</button>;
}

export function HeaderActions({ user, onAdminView }) {
  if (user?.role !== 'admin') return null;
  return <div className={'fixed bottom-5 right-5 z-40'}><ActionButton className={'shadow-lg shadow-blue-200'} onClick={onAdminView}>Admin</ActionButton></div>;
}
