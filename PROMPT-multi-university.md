# DynForge — Mở rộng đa trường: bộ prompt triển khai

> Tài liệu này chứa các prompt để đưa cho AI coding assistant (Claude Code / Cursor),
> chạy **ở thư mục gốc `DynForge-`**. Chạy từng giai đoạn một, review + commit
> xong mới sang giai đoạn kế. Không dán nhiều giai đoạn cùng lúc.

## Phạm vi

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Data model đa trường + migration | có prompt (bên dưới) |
| 2 | Xác minh email tên miền trường + filter xuống DB + FE | có prompt (bên dưới) |
| 3 | `UNIVERSITY_MODERATOR` + trang riêng mỗi trường + waitlist | chưa viết |
| 4 | Ngưỡng mở trường mới + vận hành | không phải việc code |

**Nằm ngoài phạm vi tài liệu này** (xử lý riêng, đừng gộp vào):
- Thu hồi secret đang lộ trong `application.properties` trên GitHub public
- Gỡ 132 MB `recordings/*.webm` khỏi git history
- Lỗi race condition ví tiền (`WalletService.withdraw`, `EscrowService.pay`)
- IDOR ở `GET /api/recordings/{id}/file`
- Thiếu `.gitattributes` gốc khiến cả repo hiện "modified" vì CRLF

---

## GIAI ĐOẠN 1 — Data model đa trường

```
Bạn đang làm việc trong repo DynForge — nền tảng mentoring đại học.
Cấu trúc: BE/ (Spring Boot 4.1.0, Java 17, MongoDB, package com.dynforge.be)
và FE/ (React 18 + Vite 6 + TypeScript + Tailwind 4 + Radix UI).

MỤC TIÊU GIAI ĐOẠN NÀY
Chuyển hệ thống từ một trường duy nhất (FPT University HCM Campus) sang mô
hình nhiều trường, MỖI TRƯỜNG CÓ MENTOR RIÊNG là sinh viên/cựu sinh viên
của chính trường đó. Giai đoạn này CHỈ làm data model + migration. Chưa làm
xác minh email, chưa đổi UI.

HIỆN TRẠNG ĐÃ KIỂM CHỨNG — đọc kỹ trước khi sửa
- MentorProfile (BE/src/main/java/com/dynforge/be/model/entity/MentorProfile.java)
  đã có field `String university` nhưng là TEXT TỰ DO, và `String major`.
- User.java KHÔNG có field trường nào. Fields hiện có: id, fullName, email,
  phone, passwordHash, Set<Role> roles, studentId, major, year, avatarUrl,
  walletBalance, status, createdAt.
- Course.java là POJO EMBED trong MentorProfile (không có @Document):
  code, name, grade, ratePrivate, rateGroup.
- VerificationRequest.java có `String course` là chuỗi trần, không gắn trường.
- FE/src/app/data/mockData.ts: `universities` chỉ có đúng 1 phần tử
  'FPT University HCM Campus'.
- FE/src/app/services/mentorService.ts, hàm backendToMentor() đang hardcode
  fallback: `university: p.university?.trim() ? p.university : 'FPT University HCM'`.

VIỆC CẦN LÀM

1) Entity mới `University` — BE/.../model/entity/University.java, @Document("universities")
   - String id
   - String code            // slug viết HOA, duy nhất: "FPTU-HCM", "UTH". @Indexed(unique = true)
   - String name            // tên hiển thị đầy đủ
   - String shortName       // "FPTU HCM"
   - List<String> aliases   // để search: ["ĐH FPT", "FPT University", "FPTU"]
   - List<String> emailDomains  // ["fpt.edu.vn"] — giai đoạn 2 sẽ dùng
   - String logoUrl
   - UniversityStatus status
   - Instant createdAt
   Theo đúng convention của các entity khác: Lombok @Getter @Setter @Builder
   @NoArgsConstructor @AllArgsConstructor.

2) Enum mới `UniversityStatus` — model/enums/UniversityStatus.java
   WAITLIST, LAUNCHING, ACTIVE
   (WAITLIST = chưa đủ mentor, chỉ cho đăng ký chờ; LAUNCHING = mở giới hạn;
   ACTIVE = mở công khai)

3) Thêm field vào các entity có sẵn
   - User: thêm `@Field(targetType = FieldType.OBJECT_ID) ObjectId universityId`
   - MentorProfile: thêm `ObjectId universityId` (cùng kiểu annotation như trên)
     GIỮ NGUYÊN field `String university` cũ — đổi thành tên trường denormalize
     để FE hiện tại không vỡ. Thêm comment giải thích nó là bản sao đọc-nhanh
     của University.name.
   - VerificationRequest: thêm `ObjectId universityId` (copy từ user lúc submit)
   - Course (POJO embed): thêm `boolean generalEducation` mặc định false.
     Ý nghĩa: môn đại cương (Toán cao cấp, Triết, Vật lý đại cương) — mentor
     trường khác vẫn dạy được, nên KHÔNG bị lọc theo trường ở giai đoạn 2.

4) `UniversityRepository extends MongoRepository<University, String>`
   - Optional<University> findByCode(String code)
   - List<University> findByStatusIn(Collection<UniversityStatus> statuses)
   - boolean existsByCode(String code)

5) Index compound cho truy vấn danh sách mentor
   Trên MentorProfile, thêm:
   @CompoundIndex(name = "uni_verified_major_idx",
                  def = "{'universityId': 1, 'verified': 1, 'major': 1}")
   Đây là index phục vụ filter ở giai đoạn 2, thêm ngay từ bây giờ.

6) Migration — BE/.../seeder/UniversityMigration.java
   implements CommandLineRunner, @Order(0) để CHẠY TRƯỚC DataSeeder (@Order(1)).
   Logic phải IDEMPOTENT (chạy lại nhiều lần không hỏng):
   a. Nếu chưa có University code "FPTU-HCM" thì tạo:
      name "FPT University HCM Campus", shortName "FPTU HCM",
      aliases ["ĐH FPT", "FPT University", "FPTU", "FPT University HCM"],
      emailDomains ["fpt.edu.vn"], status ACTIVE.
   b. Mọi User có universityId == null → gán về FPTU-HCM.
   c. Mọi MentorProfile có universityId == null → gán universityId = FPTU-HCM
      và university = "FPT University HCM Campus".
   d. Mọi VerificationRequest có universityId == null → gán theo universityId
      của user tương ứng.
   e. Log số document đã cập nhật ở từng bước (dùng @Slf4j như DataSeeder).

7) DTO + mapper + endpoint đọc
   - record UniversityResponse(String id, String code, String name,
     String shortName, String logoUrl, UniversityStatus status,
     long mentorCount) — mentorCount đếm mentor verified của trường đó.
   - UniversityMapper trong package mapper/, cùng style với MentorMapper.
   - UniversityService: listPublic() trả các trường status ACTIVE hoặc LAUNCHING,
     sắp xếp mentorCount giảm dần; getByCode(String code).
   - UniversityController @RequestMapping("/api/universities"):
       GET /api/universities        → list công khai
       GET /api/universities/{code} → chi tiết theo code slug
   - SecurityConfig: thêm
       .requestMatchers(HttpMethod.GET, "/api/universities/**").permitAll()
     đặt CÙNG CHỖ với các dòng permitAll GET khác (gần /api/mentors/**).

8) DataSeeder — cập nhật để seed thêm trường thứ hai làm dữ liệu demo:
   University "UTH" = "Trường Đại học Giao thông Vận tải TP. Hồ Chí Minh",
   shortName "UTH", emailDomains ["ut.edu.vn"], status WAITLIST.
   Tạo 2 mentor demo thuộc UTH (dùng lại helper seedMentor có sẵn, thêm tham số
   university). GIỮ NGUYÊN cơ chế guard hiện tại (kiểm tra existsByEmail
   "khoa.tran@dynforge.vn") để không seed trùng.

9) FE — chỉ làm phần tối thiểu để không vỡ, chưa đụng UI:
   - Tạo FE/src/app/services/universityService.ts theo đúng style các service
     khác (import api from './api', đọc data.data):
       export interface UniversityResponse { id, code, name, shortName,
         logoUrl?, status, mentorCount }
       export async function listUniversities(): Promise<UniversityResponse[]>
       export async function getUniversity(code: string): Promise<UniversityResponse>
   - mentorService.ts: thêm `universityId?: string` và `universityCode?: string`
     vào interface MentorProfileResponse. GIỮ NGUYÊN field `university`.
   - mockData.ts: bỏ mảng `universities` hardcode (hoặc đánh dấu @deprecated),
     nhưng KHÔNG xoá `majors`, `subjects`, `academicLevels`, `formatCurrency` —
     nhiều trang vẫn đang import.

RÀNG BUỘC BẮT BUỘC
- KHÔNG sửa BE/src/main/resources/application.properties. File này đang chứa
  secret và sẽ được xử lý riêng — đừng đụng vào.
- KHÔNG reformat file. Repo đã có .gitattributes ở gốc (`* text=auto eol=lf`,
  commit 36f70c5) — giữ nguyên LF, chỉ sửa đúng dòng cần sửa.
- KHÔNG sửa logic ví/escrow (WalletService, EscrowService). Chúng có lỗi race
  condition đã biết, đang được xử lý ở nhánh khác.
- Giữ đúng convention sẵn có: DTO là Java record, entity dùng Lombok @Builder,
  response luôn bọc trong ApiResponse<T>, lỗi ném BadRequestException /
  ResourceNotFoundException (GlobalExceptionHandler đã map sẵn).
- Tương thích ngược: API hiện tại không được đổi signature. Mọi field mới phải
  nullable/optional để FE cũ vẫn chạy.

SAU KHI XONG
- Chạy `cd BE && mvnw.cmd clean compile` để chắc chắn build được.
- In ra danh sách file đã tạo / đã sửa.
- Viết 1 đoạn ngắn hướng dẫn cách kiểm tra migration chạy đúng bằng mongosh.
```

---

## GIAI ĐOẠN 2 — Xác minh email trường + lọc theo trường

> Chạy sau khi Giai đoạn 1 đã merge.

```
Tiếp tục repo DynForge. Giai đoạn 1 (entity University, universityId trên
User/MentorProfile/VerificationRequest, migration) đã xong và đã merge.

MỤC TIÊU
(a) Xác minh mentor thật sự thuộc trường nào bằng email tên miền trường.
(b) Đưa filter theo trường xuống tầng database thay vì lọc ở trình duyệt.
(c) Cho mentee chọn trường và thấy đúng mentor trường mình.

BỐI CẢNH ĐÃ KIỂM CHỨNG
- Luồng OTP đã tồn tại và chạy được: PasswordResetService.java dùng
  SecureRandom sinh mã 6 số, lưu entity PasswordResetToken (email, otp,
  verified, expiresAt, createdAt), gọi mailService.sendOtpEmail(to, otp,
  validMinutes), thời hạn lấy từ app.otp.expiration-ms. HÃY COPY ĐÚNG MẪU NÀY.
- MailService có sẵn method isConfigured().
- MentorService.listMentors(String courseCode, String format, Boolean verified)
  hiện gọi mentorRepository.findByVerifiedTrue() — tức KÉO TOÀN BỘ mentor về
  rồi lọc trong Java. Đây là thứ cần thay.
- FE/src/app/pages/MentorListing.tsx lọc client-side bằng useMemo trên
  selectedMajor / selectedRole, import `majors` từ mockData. Chưa có filter trường.
- i18n: FE/src/app/i18n/translations.ts có dạng `const t = { en: {...}, vi: {...} }`
  với key phẳng. MỌI key mới phải thêm vào CẢ HAI ngôn ngữ.
- AuthContext.tsx: AuthRole = 'mentee' | 'mentor' | 'admin',
  map từ backend qua roleFromBackend(roles: string[]).

VIỆC CẦN LÀM

── A. Xác minh email tên miền trường ─────────────────────────────────────

1) Thêm vào User.java:
   - String schoolEmail           // email trường đã xác minh
   - boolean schoolVerified       // mặc định false
   (universityId đã có từ giai đoạn 1)

2) Entity SchoolEmailToken — @Document("school_email_tokens"), copy cấu trúc
   PasswordResetToken nhưng thêm ObjectId userId và ObjectId universityId.
   Repository tương ứng: findByUserId, deleteByUserId.

3) SchoolEmailService — copy pattern PasswordResetService:
   - requestVerification(User user, String schoolEmail):
     * Tách domain từ schoolEmail (phần sau @, lowercase).
     * Tìm University có emailDomains chứa domain đó. Không tìm thấy →
       BadRequestException("Email domain chưa thuộc trường nào trên DynForge.
       Vui lòng dùng email trường hoặc gửi minh chứng cựu sinh viên.")
     * Chặn nếu schoolEmail đã được User khác xác minh (unique).
     * Sinh OTP 6 số, xoá token cũ của user, lưu token mới, gửi mail.
     * Rate limit: tối đa 3 lần gửi / 15 phút / user → BadRequestException.
   - confirmVerification(User user, String otp):
     * Kiểm tra OTP hợp lệ + chưa hết hạn (giống requireValidOtp).
     * Set user.universityId, user.schoolEmail, user.schoolVerified = true.
     * Nếu user có MentorProfile → đồng bộ universityId + university (tên trường).
     * Xoá token.

4) Endpoint trong UserController (@RequestMapping("/api/users") — kiểm tra
   prefix thật trong file rồi dùng đúng):
     POST /api/users/me/school-email/request  { "email": "..." }
     POST /api/users/me/school-email/verify   { "otp": "123456" }
   Cả hai yêu cầu đăng nhập (SecurityConfig đã có anyRequest().authenticated()
   nên không cần thêm rule).

5) UserResponse DTO: thêm universityId, universityName, universityCode,
   schoolVerified để FE hiển thị badge "Đã xác minh sinh viên <trường>".

6) Cựu sinh viên không còn email trường: KHÔNG code luồng riêng ở giai đoạn này.
   Thay vào đó, trong VerificationRequest thêm field
   `String alumniProofUrl` và enum value mới cho loại đơn, để admin duyệt tay
   bằng màn hình AdminVerification có sẵn. Ghi rõ TODO trong code.

── B. Đưa filter xuống database ──────────────────────────────────────────

7) MentorRepository — thay các method findByVerifiedTrue* bằng query có phân trang:
   Page<MentorProfile> search(...) dùng @Query hoặc Criteria với các điều kiện
   optional: universityId, major, courseCode, format, verified.
   Quy tắc lọc theo trường QUAN TRỌNG:
     - Nếu có universityId → trả mentor của trường đó
       HOẶC mentor có ít nhất một Course với generalEducation = true
       (môn đại cương liên trường).
     - Nếu không truyền universityId → trả tất cả.
   Giữ lại findByUserId.

8) MentorService.listMentors(...): nhận thêm tham số university (nhận cả code
   slug lẫn ObjectId — nếu không phải 24 ký tự hex thì tra theo code), page, size.
   Trả về kiểu phân trang: record PageResponse<T>(List<T> items, int page,
   int size, long total, int totalPages), bọc trong ApiResponse như bình thường.

9) MentorController: KHÔNG đổi `GET /api/mentors` đang có (Home.tsx và
   DynForgeCinematicHome.tsx vẫn gọi nó và mong nhận về List — đổi shape sẽ làm
   vỡ trang chủ). Thay vào đó THÊM endpoint mới:
       GET /api/mentors/search
   nhận `university`, `major`, `course`, `format`, `verified`, `page` (mặc định 0),
   `size` (mặc định 20), trả ApiResponse<PageResponse<MentorProfileResponse>>.
   Chỉ MentorListing.tsx chuyển sang dùng endpoint mới ở bước 11.
   LƯU Ý thứ tự khai báo: `/api/mentors/search` phải đặt TRƯỚC `/api/mentors/{id}`
   trong SecurityConfig và trong controller, nếu không "search" sẽ bị khớp nhầm
   thành path variable id.

── C. Frontend ───────────────────────────────────────────────────────────

10) Context chọn trường: FE/src/app/context/UniversityContext.tsx
    - Lưu trường đang chọn vào localStorage key 'dynforge_university'.
    - Nếu user đã đăng nhập và có universityId → mặc định lấy trường đó.
    - Nếu chưa → mặc định null (xem tất cả).
    - Bọc Provider trong App.tsx, bên trong AuthProvider.

11) MentorListing.tsx:
    - Thêm <Select> chọn trường ở đầu hàng filter, load từ listUniversities().
      Dùng đúng component Select của Radix đang dùng cho filter ngành, giữ
      nguyên class styling hiện tại (bg-white/5 border-white/10 ...).
    - BỎ lọc client-side bằng useMemo; gọi API với params university/major/
      course/page và render kết quả trả về.
    - Thêm nút "Xem cả mentor ngoài trường" — bỏ filter trường, giải thích
      ngắn rằng môn đại cương thì mentor trường khác vẫn dạy được.
    - Có state rỗng riêng: nếu trường được chọn có status WAITLIST hoặc chưa
      có mentor nào → hiện thông điệp "DynForge sắp mở tại <trường>" kèm nút
      đăng ký nhận thông báo, KHÔNG hiện danh sách trống trơn.

12) Route theo trường: thêm vào App.tsx
      { path: '/truong/:code', element: <MentorListing /> }
    MentorListing đọc useParams().code, nếu có thì khoá filter về trường đó.

13) Đăng ký / onboarding: thêm bước chọn trường vào Auth.tsx (form đăng ký)
    và vào TeacherVerification.tsx (luồng trở thành mentor) — với mentor thì
    hiện luôn nút "Xác minh bằng email trường" gọi luồng ở mục A.

14) i18n: thêm key mới vào CẢ en và vi trong translations.ts.
    Tối thiểu: selectUniversity, allUniversities, verifiedStudentOf,
    verifySchoolEmail, schoolEmailSent, comingSoonAtUniversity,
    joinWaitlist, showMentorsFromOtherSchools.

RÀNG BUỘC BẮT BUỘC
- KHÔNG sửa application.properties.
- KHÔNG reformat file. Repo đã có .gitattributes ở gốc (`* text=auto eol=lf`,
  commit 36f70c5) — giữ nguyên LF, chỉ sửa đúng dòng cần sửa.
- KHÔNG đụng WalletService / EscrowService.
- Tái dùng MailService + pattern OTP có sẵn, ĐỪNG viết cơ chế mail mới.
- Mọi endpoint mới trả ApiResponse<T>; lỗi ném BadRequestException /
  ResourceNotFoundException.
- Email trường phải so sánh domain ở dạng lowercase và chỉ khớp phần sau ký tự
  @ cuối cùng. Không dùng String.contains() — "fpt.edu.vn.evil.com" phải bị từ chối.

SAU KHI XONG
- `cd BE && mvnw.cmd clean compile` và `cd FE && npm run build` phải pass.
- Liệt kê file đã tạo/sửa.
- Viết hướng dẫn test luồng xác minh email trường từ đầu đến cuối bằng curl
  hoặc script Python, kèm cách đọc OTP từ log nếu MailService chưa cấu hình.
```

---

## Lưu ý khi chạy

**Giai đoạn 2 cố ý KHÔNG đổi `GET /api/mentors`.** `Home.tsx` và
`DynForgeCinematicHome.tsx` đang gọi nó và mong nhận về một List — đổi shape là
vỡ trang chủ. Endpoint phân trang là `GET /api/mentors/search` mới, chỉ
`MentorListing.tsx` dùng. Khi nào rảnh thì chuyển nốt các trang còn lại rồi bỏ
endpoint cũ.

**Không gộp chung với việc sửa lỗi ví.** Ràng buộc "KHÔNG đụng
WalletService/EscrowService" là cố ý — để lúc review tách được diff nào thuộc
việc nào.
