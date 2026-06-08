import React from "react";

const SECTIONS = [
  {
    title: "1. Phạm vi thông tin được thu thập",
    body: "SignLearn có thể lưu các thông tin cần thiết để vận hành tài khoản, đồng bộ tiến độ học, lịch sử quiz, phiên luyện tập và những dữ liệu bạn chủ động gửi trong quá trình sử dụng hệ thống.",
  },
  {
    title: "2. Mục đích sử dụng dữ liệu",
    body: "Dữ liệu được dùng để xác thực tài khoản, hiển thị tiến độ học, cá nhân hóa trải nghiệm, hỗ trợ quản trị nội dung và xử lý các vấn đề kỹ thuật hoặc bảo mật khi phát sinh.",
  },
  {
    title: "3. Lưu trữ và bảo vệ",
    body: "Chúng tôi áp dụng các biện pháp kỹ thuật và quy trình vận hành phù hợp để hạn chế truy cập trái phép, mất mát hoặc sử dụng sai mục đích đối với dữ liệu người dùng trong phạm vi hệ thống.",
  },
  {
    title: "4. Chia sẻ thông tin",
    body: "SignLearn không chia sẻ dữ liệu cá nhân cho bên thứ ba ngoài phạm vi cần thiết để cung cấp dịch vụ, tuân thủ yêu cầu pháp lý hoặc bảo vệ quyền lợi hợp pháp của nền tảng và người dùng.",
  },
  {
    title: "5. Quyền của người dùng",
    body: "Bạn có thể yêu cầu xem lại, cập nhật hoặc xóa thông tin tài khoản trong phạm vi mà hệ thống và quy định hiện hành cho phép. Một số dữ liệu vận hành có thể cần được giữ lại để đảm bảo tính toàn vẹn lịch sử học tập và nhật ký bảo mật.",
  },
  {
    title: "6. Cập nhật chính sách",
    body: "Nội dung chính sách có thể được điều chỉnh khi sản phẩm, quy trình vận hành hoặc yêu cầu pháp lý thay đổi. Phiên bản mới sẽ có hiệu lực kể từ thời điểm được công bố trên hệ thống.",
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

export default function PrivacyPolicy({ onBack }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">SignLearn</div>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">Chính sách bảo mật</h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600 md:text-base">
              Trang này mô tả cách SignLearn thu thập, sử dụng và bảo vệ dữ liệu cần thiết để cung cấp trải nghiệm học tập, quản trị và đồng bộ tiến độ trong hệ thống.
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

        <div className="rounded-[2rem] border border-blue-100 bg-white/80 p-6 shadow-sm backdrop-blur md:p-7">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Cập nhật gần nhất</div>
          <div className="mt-2 text-lg font-black text-slate-900">08/06/2026</div>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 md:text-base">
            Khi tiếp tục sử dụng SignLearn, bạn đồng ý để hệ thống xử lý dữ liệu ở mức cần thiết cho việc xác thực, phân phối nội dung học, lưu tiến độ và bảo vệ an toàn vận hành.
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
