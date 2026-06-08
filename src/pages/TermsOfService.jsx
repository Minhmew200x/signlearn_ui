import React from "react";

const SECTIONS = [
  {
    title: "1. Chấp nhận điều khoản",
    body: "Khi truy cập hoặc sử dụng SignLearn, bạn xác nhận đã đọc và đồng ý tuân thủ các điều khoản vận hành hiện hành của nền tảng.",
  },
  {
    title: "2. Tài khoản và quyền truy cập",
    body: "Bạn chịu trách nhiệm với thông tin đăng nhập, hoạt động phát sinh trên tài khoản của mình và việc sử dụng hệ thống đúng vai trò được cấp.",
  },
  {
    title: "3. Nội dung và mục đích sử dụng",
    body: "Tài nguyên học tập, video, quiz, bài luyện tập và nội dung quản trị trên SignLearn được cung cấp để phục vụ việc học và vận hành nội bộ; không được sao chép hoặc khai thác trái phép ngoài phạm vi cho phép.",
  },
  {
    title: "4. Hành vi bị hạn chế",
    body: "Người dùng không được can thiệp trái phép vào hệ thống, phát tán mã độc, lạm dụng tính năng, thu thập dữ liệu ngoài thẩm quyền hoặc sử dụng nền tảng theo cách gây ảnh hưởng tiêu cực đến dịch vụ và cộng đồng.",
  },
  {
    title: "5. Tạm ngưng hoặc thay đổi dịch vụ",
    body: "SignLearn có thể cập nhật, giới hạn, tạm ngưng hoặc điều chỉnh một phần dịch vụ khi cần bảo trì, nâng cấp, xử lý sự cố hoặc đáp ứng yêu cầu vận hành và pháp lý.",
  },
  {
    title: "6. Giới hạn trách nhiệm",
    body: "Chúng tôi nỗ lực duy trì dịch vụ ổn định nhưng không cam kết hệ thống luôn liên tục hoặc không có lỗi trong mọi thời điểm. Người dùng cần tuân thủ hướng dẫn sử dụng và tự bảo vệ thông tin truy cập của mình.",
  },
];

function Section({ title, body }) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-slate-900 md:text-2xl">{title}</h2>
      <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 md:text-base">{body}</p>
    </section>
  );
}

export default function TermsOfService({ onBack }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">SignLearn</div>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">Điều khoản dịch vụ</h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600 md:text-base">
              Điều khoản này mô tả các nguyên tắc sử dụng, quyền hạn truy cập và giới hạn trách nhiệm khi bạn học tập hoặc vận hành nội dung trên SignLearn.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="min-h-12 rounded-2xl border border-blue-100 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:bg-blue-50"
          >
            Quay lại
          </button>
        </div>

        <div className="rounded-[2rem] border border-amber-100 bg-white/80 p-6 shadow-sm backdrop-blur md:p-7">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Hiệu lực từ</div>
          <div className="mt-2 text-lg font-black text-slate-900">08/06/2026</div>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 md:text-base">
            Việc tiếp tục truy cập SignLearn sau khi điều khoản được cập nhật đồng nghĩa với việc bạn chấp nhận phiên bản mới nhất được công bố trên hệ thống.
          </p>
        </div>

        <div className="grid gap-4">
          {SECTIONS.map((section) => (
            <Section key={section.title} title={section.title} body={section.body} />
          ))}
        </div>
      </div>
    </main>
  );
}
