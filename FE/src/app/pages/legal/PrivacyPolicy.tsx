import { Link } from 'react-router';
import { useLanguage } from '../../context/LanguageContext';
import { LegalPage, SUPPORT_EMAIL, type LegalSection } from './LegalPage';

const UPDATED = '27/09/2026';

const vi: LegalSection[] = [
  {
    heading: 'Chúng tôi là ai',
    body: (
      <p>
        DynForge là nền tảng kết nối sinh viên với mentor là sinh viên hoặc cựu sinh viên cùng trường, do nhóm phát
        triển DynForge vận hành. Chính sách này áp dụng cho website và ứng dụng Android DynForge. Mọi câu hỏi về dữ liệu
        cá nhân, vui lòng gửi tới <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    ),
  },
  {
    heading: 'Dữ liệu chúng tôi thu thập',
    body: (
      <ul>
        <li><strong>Tài khoản:</strong> họ tên, email, mật khẩu (chỉ lưu dạng đã mã hoá bcrypt), số điện thoại (không bắt buộc), mã số sinh viên, ngành, năm học, ảnh đại diện, trường.</li>
        <li><strong>Đăng nhập bằng Google:</strong> họ tên, email và ảnh đại diện do Google cung cấp.</li>
        <li><strong>Xác minh sinh viên:</strong> email trường và mã OTP gửi tới email đó.</li>
        <li><strong>Hồ sơ mentor:</strong> giới thiệu, môn dạy, học phí, lịch rảnh; yêu cầu xác minh gồm môn học, điểm và đường dẫn bảng điểm hoặc minh chứng cựu sinh viên do bạn cung cấp.</li>
        <li><strong>Buổi học:</strong> lịch đặt, trạng thái, đánh giá và nhận xét, tin nhắn giữa mentee và mentor.</li>
        <li><strong>Thanh toán:</strong> lịch sử giao dịch, mã đơn hàng PayOS; khi mentor rút tiền: tên ngân hàng và số tài khoản. Chúng tôi <strong>không</strong> lưu thông tin thẻ; việc thanh toán do PayOS xử lý.</li>
        <li><strong>Video ghi lại buổi học:</strong> chỉ khi một bên chủ động bấm ghi hình trên máy tính. Video dùng làm bằng chứng giải quyết tranh chấp và <strong>chỉ quản trị viên</strong> xem được.</li>
        <li><strong>Trợ lý AI:</strong> câu hỏi bạn gửi cho chatbot, ghi chú bạn nhờ AI viết lại.</li>
        <li><strong>Trên thiết bị:</strong> mã đăng nhập, ngôn ngữ và trường bạn chọn được lưu trong bộ nhớ trình duyệt/ứng dụng. Chúng tôi không dùng cookie quảng cáo hay công cụ theo dõi hành vi.</li>
      </ul>
    ),
  },
  {
    heading: 'Chúng tôi dùng dữ liệu để làm gì',
    body: (
      <ul>
        <li>Tạo và bảo vệ tài khoản, xác minh bạn là sinh viên của trường đã chọn.</li>
        <li>Hiển thị mentor phù hợp, tổ chức buổi học, nhắn tin.</li>
        <li>Giữ tiền ký quỹ, trả tiền cho mentor, hoàn tiền và giải quyết tranh chấp.</li>
        <li>Gửi email mã OTP (đặt lại mật khẩu, xác minh email trường).</li>
        <li>Trả lời câu hỏi qua trợ lý AI.</li>
      </ul>
    ),
  },
  {
    heading: 'Bên thứ ba nhận dữ liệu',
    body: (
      <>
        <p>Chúng tôi không bán dữ liệu cá nhân. Dữ liệu chỉ được chia sẻ với các nhà cung cấp cần thiết để vận hành dịch vụ:</p>
        <ul>
          <li><strong>PayOS</strong> — xử lý thanh toán (số tiền, mã đơn hàng).</li>
          <li><strong>Google</strong> — đăng nhập bằng Google; <strong>Google Gemini</strong> nhận nội dung câu hỏi gửi cho trợ lý AI.</li>
          <li><strong>Brevo</strong> — gửi email OTP (địa chỉ email, mã OTP).</li>
          <li><strong>Jitsi Meet (meet.jit.si)</strong> — cuộc gọi video trực tuyến; nội dung cuộc gọi không đi qua máy chủ DynForge trừ khi bạn chủ động ghi hình.</li>
          <li><strong>MongoDB Atlas, Render, Vercel</strong> — lưu trữ cơ sở dữ liệu, chạy máy chủ và website.</li>
        </ul>
        <p>Chúng tôi có thể cung cấp dữ liệu khi cơ quan nhà nước có thẩm quyền yêu cầu theo quy định pháp luật.</p>
      </>
    ),
  },
  {
    heading: 'Lưu trữ và xoá dữ liệu',
    body: (
      <>
        <p>Dữ liệu được lưu khi tài khoản còn hoạt động. Bạn có thể <Link to="/delete-account">xoá tài khoản</Link> bất cứ lúc nào ngay trong ứng dụng hoặc website. Khi xoá:</p>
        <ul>
          <li><strong>Bị xoá:</strong> hồ sơ mentor, yêu cầu xác minh và bảng điểm, tin nhắn (cả phía người nhận), video ghi hình, email trường, mã đăng nhập.</li>
          <li><strong>Được ẩn danh và giữ lại:</strong> lịch sử buổi học đã thanh toán và giao dịch ví — cần cho đối soát kế toán và giải quyết khiếu nại. Họ tên, email, số điện thoại bị xoá khỏi các bản ghi này; tên hiển thị thành "Tài khoản đã xoá".</li>
          <li>Đánh giá bạn đã viết vẫn được giữ để điểm của mentor không bị sai lệch, nhưng không còn gắn với tên bạn.</li>
        </ul>
        <p>Để tránh thất thoát tiền, bạn cần rút hết số dư ví và hoàn tất các buổi học đã thanh toán trước khi xoá.</p>
      </>
    ),
  },
  {
    heading: 'Bảo mật',
    body: (
      <p>
        Kết nối được mã hoá HTTPS, mật khẩu được băm bằng bcrypt, video buổi học chỉ quản trị viên truy cập được và
        mọi thay đổi số dư ví được ghi nhận bằng giao dịch nguyên tử. Không hệ thống nào an toàn tuyệt đối; nếu phát
        hiện sự cố, chúng tôi sẽ thông báo cho người dùng bị ảnh hưởng.
      </p>
    ),
  },
  {
    heading: 'Quyền của bạn',
    body: (
      <ul>
        <li>Xem và sửa thông tin cá nhân trong trang Hồ sơ.</li>
        <li>Xoá tài khoản trong Cài đặt hoặc tại <Link to="/delete-account">/delete-account</Link>.</li>
        <li>Yêu cầu bản sao dữ liệu, rút lại sự đồng ý hoặc khiếu nại qua <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Chúng tôi phản hồi trong vòng 15 ngày.</li>
      </ul>
    ),
  },
  {
    heading: 'Độ tuổi',
    body: <p>DynForge dành cho sinh viên từ 18 tuổi trở lên. Chúng tôi không cố ý thu thập dữ liệu của người dưới 18 tuổi.</p>,
  },
  {
    heading: 'Thay đổi chính sách',
    body: <p>Khi chính sách thay đổi, ngày cập nhật ở đầu trang sẽ thay đổi; thay đổi quan trọng sẽ được thông báo trong ứng dụng.</p>,
  },
];

const en: LegalSection[] = [
  {
    heading: 'Who we are',
    body: (
      <p>
        DynForge connects university students with mentors who are students or alumni of the same university. It is
        operated by the DynForge development team. This policy covers the DynForge website and Android app. Privacy
        questions: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    ),
  },
  {
    heading: 'Data we collect',
    body: (
      <ul>
        <li><strong>Account:</strong> name, email, password (stored only as a bcrypt hash), phone (optional), student ID, major, year, avatar, university.</li>
        <li><strong>Google sign-in:</strong> the name, email and avatar Google provides.</li>
        <li><strong>Student verification:</strong> your school email and the one-time code sent to it.</li>
        <li><strong>Mentor profile:</strong> bio, courses, rates, availability; verification requests with course, grade and the transcript or alumni-proof link you provide.</li>
        <li><strong>Sessions:</strong> bookings, status, ratings and reviews, messages between mentee and mentor.</li>
        <li><strong>Payments:</strong> transaction history and PayOS order codes; for mentor withdrawals, bank name and account number. We do <strong>not</strong> store card data — PayOS processes payments.</li>
        <li><strong>Session recordings:</strong> only when a participant starts recording on a computer. Used as dispute evidence and viewable <strong>by administrators only</strong>.</li>
        <li><strong>AI assistant:</strong> questions you send to the chatbot and notes you ask it to rewrite.</li>
        <li><strong>On your device:</strong> login tokens, language and university preference in browser/app storage. No advertising cookies or behavioural tracking.</li>
      </ul>
    ),
  },
  {
    heading: 'How we use it',
    body: (
      <ul>
        <li>Create and secure your account; verify you study at the university you chose.</li>
        <li>Show relevant mentors, run sessions and messaging.</li>
        <li>Hold escrow payments, pay mentors, refund and resolve disputes.</li>
        <li>Send one-time codes by email (password reset, school email verification).</li>
        <li>Answer questions through the AI assistant.</li>
      </ul>
    ),
  },
  {
    heading: 'Who receives data',
    body: (
      <>
        <p>We do not sell personal data. It is shared only with providers needed to run the service:</p>
        <ul>
          <li><strong>PayOS</strong> — payment processing (amount, order code).</li>
          <li><strong>Google</strong> — Google sign-in; <strong>Google Gemini</strong> receives questions sent to the AI assistant.</li>
          <li><strong>Brevo</strong> — sends one-time-code emails (email address, code).</li>
          <li><strong>Jitsi Meet (meet.jit.si)</strong> — video calls; call content does not pass through DynForge servers unless you record it.</li>
          <li><strong>MongoDB Atlas, Render, Vercel</strong> — database, server and website hosting.</li>
        </ul>
        <p>We may disclose data when required by competent authorities under applicable law.</p>
      </>
    ),
  },
  {
    heading: 'Retention and deletion',
    body: (
      <>
        <p>Data is kept while your account is active. You can <Link to="/delete-account">delete your account</Link> at any time in the app or on the website. On deletion:</p>
        <ul>
          <li><strong>Deleted:</strong> mentor profile, verification requests and transcripts, messages (for both sides), session recordings, school email, login tokens.</li>
          <li><strong>Anonymised and kept:</strong> paid session history and wallet transactions, needed for accounting and complaints. Your name, email and phone are removed; the display name becomes "Deleted account".</li>
          <li>Reviews you wrote remain so mentor ratings stay accurate, but are no longer linked to your name.</li>
        </ul>
        <p>To protect your money, withdraw your wallet balance and finish any paid sessions before deleting.</p>
      </>
    ),
  },
  {
    heading: 'Security',
    body: (
      <p>
        Connections use HTTPS, passwords are bcrypt-hashed, session recordings are admin-only, and wallet balance
        changes are atomic. No system is perfectly secure; if an incident occurs we will notify affected users.
      </p>
    ),
  },
  {
    heading: 'Your rights',
    body: (
      <ul>
        <li>View and edit your personal information on your Profile page.</li>
        <li>Delete your account in Settings or at <Link to="/delete-account">/delete-account</Link>.</li>
        <li>Request a copy of your data, withdraw consent or complain at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We reply within 15 days.</li>
      </ul>
    ),
  },
  {
    heading: 'Age',
    body: <p>DynForge is for students aged 18 and over. We do not knowingly collect data from anyone under 18.</p>,
  },
  {
    heading: 'Changes',
    body: <p>When this policy changes, the date at the top changes; significant changes are announced in the app.</p>,
  },
];

export function PrivacyPolicy() {
  const { lang } = useLanguage();
  return (
    <LegalPage
      title={lang === 'vi' ? 'Chính sách bảo mật' : 'Privacy Policy'}
      updated={UPDATED}
      sections={lang === 'vi' ? vi : en}
    />
  );
}
