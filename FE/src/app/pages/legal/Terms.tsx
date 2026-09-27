import { Link } from 'react-router';
import { useLanguage } from '../../context/LanguageContext';
import { LegalPage, SUPPORT_EMAIL, type LegalSection } from './LegalPage';

const UPDATED = '27/09/2026';

const vi: LegalSection[] = [
  {
    heading: 'Dịch vụ',
    body: (
      <p>
        DynForge giúp sinh viên tìm và đặt buổi học 1:1 trực tuyến với mentor là sinh viên hoặc cựu sinh viên. DynForge
        là nền tảng trung gian: nội dung giảng dạy do mentor chịu trách nhiệm.
      </p>
    ),
  },
  {
    heading: 'Tài khoản',
    body: (
      <ul>
        <li>Bạn phải từ 18 tuổi trở lên và cung cấp thông tin trung thực.</li>
        <li>Bạn chịu trách nhiệm giữ bí mật mật khẩu và mọi hoạt động trên tài khoản của mình.</li>
        <li>Mentor cam kết thông tin về trường, môn học và điểm số là đúng sự thật. Khai gian có thể bị khoá tài khoản.</li>
      </ul>
    ),
  },
  {
    heading: 'Thanh toán và ký quỹ',
    body: (
      <ul>
        <li>Tiền học được giữ ký quỹ khi đặt lịch và chỉ chuyển cho mentor sau khi buổi học hoàn tất.</li>
        <li>DynForge thu phí nền tảng trên mỗi buổi học (hiện là 15%, hiển thị trước khi thanh toán).</li>
        <li>Sau khi mentor đánh dấu đã dạy, mentee có 24 giờ để xác nhận hoặc khiếu nại; quá thời hạn, hệ thống tự xác nhận.</li>
        <li>Mentor từ chối buổi học: mentee được hoàn đủ tiền vào ví.</li>
        <li>Thanh toán được xử lý qua PayOS. DynForge không lưu thông tin thẻ.</li>
      </ul>
    ),
  },
  {
    heading: 'Khiếu nại',
    body: (
      <p>
        Mentee có thể mở khiếu nại với buổi học đã thanh toán nhưng chưa hoàn tất. Quản trị viên xem xét bằng chứng (kể cả
        video ghi hình nếu có) và quyết định chuyển tiền cho mentor hoặc hoàn tiền cho mentee.
      </p>
    ),
  },
  {
    heading: 'Ghi hình buổi học',
    body: (
      <p>
        Chỉ ghi hình khi cả hai bên đã được thông báo. Video chỉ dùng làm bằng chứng giải quyết khiếu nại, chỉ quản trị
        viên xem được, và bị xoá khi bạn xoá tài khoản. Chi tiết xem <Link to="/privacy">Chính sách bảo mật</Link>.
      </p>
    ),
  },
  {
    heading: 'Hành vi bị cấm',
    body: (
      <ul>
        <li>Làm bài hộ, thi hộ hoặc gian lận học thuật dưới mọi hình thức.</li>
        <li>Quấy rối, xúc phạm, phát tán nội dung trái pháp luật.</li>
        <li>Giao dịch ngoài nền tảng để né phí, lừa đảo, dùng tài khoản của người khác.</li>
      </ul>
    ),
  },
  {
    heading: 'Chấm dứt',
    body: (
      <p>
        Bạn có thể <Link to="/delete-account">xoá tài khoản</Link> bất cứ lúc nào. DynForge có thể khoá tài khoản vi phạm
        các điều khoản này.
      </p>
    ),
  },
  {
    heading: 'Giới hạn trách nhiệm',
    body: (
      <p>
        DynForge không bảo đảm kết quả học tập. Trong phạm vi pháp luật cho phép, trách nhiệm của DynForge với mỗi buổi học
        không vượt quá số tiền bạn đã trả cho buổi học đó.
      </p>
    ),
  },
  {
    heading: 'Luật áp dụng và liên hệ',
    body: (
      <p>
        Điều khoản này tuân theo pháp luật Việt Nam. Liên hệ: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    ),
  },
];

const en: LegalSection[] = [
  {
    heading: 'The service',
    body: (
      <p>
        DynForge helps students find and book live 1:1 online sessions with mentors who are students or alumni.
        DynForge is an intermediary platform: mentors are responsible for their teaching content.
      </p>
    ),
  },
  {
    heading: 'Accounts',
    body: (
      <ul>
        <li>You must be 18 or older and provide truthful information.</li>
        <li>You are responsible for keeping your password secret and for all activity on your account.</li>
        <li>Mentors confirm that their university, course and grade information is true. False claims may lead to suspension.</li>
      </ul>
    ),
  },
  {
    heading: 'Payments and escrow',
    body: (
      <ul>
        <li>Session fees are held in escrow when you book and released to the mentor only after the session is completed.</li>
        <li>DynForge charges a platform fee per session (currently 15%, shown before you pay).</li>
        <li>After the mentor marks a session as taught, the mentee has 24 hours to confirm or dispute; after that it is confirmed automatically.</li>
        <li>If a mentor declines a session, the mentee is fully refunded to their wallet.</li>
        <li>Payments are processed by PayOS. DynForge does not store card data.</li>
      </ul>
    ),
  },
  {
    heading: 'Disputes',
    body: (
      <p>
        Mentees can dispute a paid session that is not completed. An administrator reviews the evidence (including a
        recording if one exists) and either releases the payment to the mentor or refunds the mentee.
      </p>
    ),
  },
  {
    heading: 'Session recordings',
    body: (
      <p>
        Only record when both participants have been told. Recordings are used solely as dispute evidence, are visible to
        administrators only, and are deleted when you delete your account. See the <Link to="/privacy">Privacy Policy</Link>.
      </p>
    ),
  },
  {
    heading: 'Prohibited conduct',
    body: (
      <ul>
        <li>Doing assignments or exams for others, or any other academic dishonesty.</li>
        <li>Harassment, abuse, or sharing unlawful content.</li>
        <li>Paying outside the platform to avoid fees, fraud, or using someone else's account.</li>
      </ul>
    ),
  },
  {
    heading: 'Termination',
    body: (
      <p>
        You can <Link to="/delete-account">delete your account</Link> at any time. DynForge may suspend accounts that
        break these terms.
      </p>
    ),
  },
  {
    heading: 'Limitation of liability',
    body: (
      <p>
        DynForge does not guarantee academic results. To the extent permitted by law, DynForge's liability for a session
        is limited to the amount you paid for that session.
      </p>
    ),
  },
  {
    heading: 'Governing law and contact',
    body: (
      <p>
        These terms are governed by the laws of Vietnam. Contact: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    ),
  },
];

export function Terms() {
  const { lang } = useLanguage();
  return (
    <LegalPage
      title={lang === 'vi' ? 'Điều khoản sử dụng' : 'Terms of Use'}
      updated={UPDATED}
      sections={lang === 'vi' ? vi : en}
    />
  );
}
