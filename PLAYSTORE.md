# DynForge — đưa app lên Google Play

Bản sao `DynForge-playstore` (nhánh `feature/playstore`) đã được sửa để đáp ứng yêu cầu của Google Play.
Tài liệu này là **thứ tự việc phải làm**, từ thu hồi key tới nộp bản `.aab`.

> Đọc hết mục **"Rủi ro còn lại"** ở cuối trước khi mở app cho người dùng thật.

---

## 0. Đã thay đổi gì trong code

| Yêu cầu | Đã làm |
|---|---|
| Không còn secret trong repo | `application.properties` đọc toàn bộ key từ biến môi trường. Thiếu `JWT_SECRET`/`WEBHOOK_SECRET` thì app không khởi động |
| Backend có địa chỉ cố định | `BE/Dockerfile` + `render.yaml` để deploy lên Render |
| CORS | Đọc từ `CORS_ALLOWED_ORIGINS`, không còn hardcode localhost |
| Tài khoản demo mật khẩu công khai | Tắt ở production (`SEED_DEMO_ACCOUNTS=false`). Admin đầu tiên tạo từ `ADMIN_EMAIL` + `ADMIN_PASSWORD` |
| **Xoá tài khoản** (bắt buộc) | `POST /api/users/me/delete-account` + trang `/delete-account` + nút trong Cài đặt |
| **Chính sách bảo mật** (bắt buộc) | Trang `/privacy`, `/terms`, link ở footer |
| Thanh toán đúng chính sách Play | App Android: trả từng buổi 1:1 qua PayOS (`POST /api/bookings/{id}/checkout`), **ẩn nạp ví, ẩn đặt lịch nhóm, ẩn voucher**. Web giữ nguyên |
| PayOS quay về app | Trang `/payment-return` + deep link `dynforge://payment-return` |
| Video buổi học | Chỉ ADMIN tải được (`GET /api/recordings/**`); bị xoá khi người dùng xoá tài khoản |
| Race condition tiền | Trừ/cộng ví bằng `$inc` nguyên tử; đổi trạng thái booking/escrow/giao dịch PayOS bằng compare-and-set → không thể rút 2 lần, trả 2 lần, giải ngân 2 lần |
| AI theo buổi học | `/api/ai/sessions/**` bắt buộc đăng nhập (trước đây lỗi 500 khi gọi ẩn danh) |
| Ký app | `FE/build-aab.ps1` tạo upload key, build `.aab` đã ký |
| Tài nguyên store | `store-assets/play-icon-512.png`, `store-assets/play-feature-graphic-1024x500.png` |

---

## 1. Thu hồi key cũ — làm đầu tiên

Key cũ vẫn nằm trong lịch sử git public. Làm phần **A** của `PROMPT-security-cleanup.md`
(Brevo, Gemini, PayOS, JWT, webhook). Key **mới** chỉ được dán vào:

- Render → Environment (production)
- `BE/src/main/resources/application-local.properties` (máy bạn, đã gitignore — đã tạo sẵn với JWT secret ngẫu nhiên)

Chạy thử local sau khi đổi:

```powershell
cd BE
.\mvnw.cmd clean compile
.\mvnw.cmd spring-boot:run
```

> `mvnw.cmd clean compile` **bắt buộc phải chạy**: code backend mới chưa được compile trong quá trình sửa
> (môi trường sửa code không tải được thư viện Maven). Có lỗi thì dán lỗi cho Claude.

---

## 2. MongoDB Atlas (database thật)

1. Tạo tài khoản tại mongodb.com/atlas → **Create cluster** → chọn **M0 Free**, region **Singapore**.
2. **Database Access** → Add user (username + password mạnh).
3. **Network Access** → Add IP → `0.0.0.0/0` (Render không có IP cố định ở gói free).
4. **Connect → Drivers** → copy chuỗi `mongodb+srv://...` → thêm tên database: `...mongodb.net/dynforge?retryWrites=true&w=majority`.

Atlas là replica set, nên sau này muốn dùng `@Transactional` cũng được.

---

## 3. Deploy backend lên Render

1. Đẩy nhánh `feature/playstore` lên GitHub (repo của nhóm hoặc fork).
2. render.com → **New → Blueprint** → chọn repo → Render đọc `render.yaml`.
3. Điền các biến Render hỏi:

| Biến | Giá trị |
|---|---|
| `MONGODB_URI` | chuỗi Atlas ở bước 2 |
| `FRONTEND_BASE_URL` | URL web ở bước 4 (vd `https://dyn-forge.vercel.app`) |
| `CORS_ALLOWED_ORIGINS` | `https://dyn-forge.vercel.app,https://localhost` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | tài khoản admin đầu tiên (mật khẩu ≥ 12 ký tự) |
| `PAYOS_*`, `BREVO_*`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID` | **key mới** |

`JWT_SECRET`, `WEBHOOK_SECRET` do Render tự sinh. `SEED_DEMO_ACCOUNTS=false` đã đặt sẵn.

4. Chờ build xong → mở `https://<ten-service>.onrender.com/api/universities` → phải thấy JSON có `FPTU-HCM`.
5. Đăng nhập admin một lần cho chắc, rồi **xoá biến `ADMIN_PASSWORD`** khỏi Render.

---

## 4. Deploy web (Vercel)

Các trang `/privacy`, `/terms`, `/delete-account`, `/payment-return` phải có trên **web public** —
Google Play và PayOS sẽ mở chúng bằng trình duyệt.

- Cách A: merge nhánh này vào `main` → project Vercel hiện có tự deploy.
- Cách B: vercel.com → Import fork của bạn → Root Directory `FE`.

Vercel → Settings → Environment Variables: `VITE_API_URL = https://<ten-service>.onrender.com` → Redeploy.

Kiểm tra: `https://<web>/privacy` và `https://<web>/delete-account` mở được.

---

## 5. Thử app trên điện thoại

```powershell
cd D:\CN8\EXE201\EXE201\DynForge-playstore
powershell -ExecutionPolicy Bypass -File FE\build-apk.ps1 -ApiUrl https://<ten-service>.onrender.com
```

Kiểm tra trên máy thật:

- [ ] Đăng ký / đăng nhập bằng email
- [ ] Chọn trường, xem mentor
- [ ] Đặt 1 buổi 1:1 → nút **"Thanh toán … qua PayOS"** → trả tiền → quay lại app → màn hình ký quỹ
- [ ] Không thấy nút Nạp tiền, không có lựa chọn Nhóm, không có ô voucher
- [ ] Cài đặt → Xoá tài khoản → xoá được
- [ ] Footer có link Chính sách bảo mật

---

## 6. Build bản nộp Play

```powershell
powershell -ExecutionPolicy Bypass -File FE\build-aab.ps1 -ApiUrl https://<ten-service>.onrender.com -VersionCode 1 -VersionName 1.0
```

Lần đầu script hỏi mật khẩu và tạo **upload key** ở `%USERPROFILE%\dynforge-keys\dynforge-upload.jks`.
**Sao lưu thư mục đó và mật khẩu** (Drive riêng, USB). Mất key thì phải xin Google reset mới cập nhật app được.

Mỗi lần nộp bản mới: tăng `-VersionCode` (2, 3, …).

Nếu lỡ có `.jks` mà mất `FE\android\keystore.properties`, tạo lại file đó:

```
storeFile=C:/Users/KHOA/dynforge-keys/dynforge-upload.jks
storePassword=<mat khau>
keyAlias=upload
keyPassword=<mat khau>
```

---

## 7. Play Console

**Tài khoản:** $25. Tài khoản **cá nhân** mở sau 13/11/2023 phải chạy **closed testing ≥ 12 tester liên tục ≥ 14 ngày** rồi mới xin production. Tài khoản **tổ chức** không bị (cần số D-U-N-S).

**Tạo app:** tên `DynForge`, ngôn ngữ mặc định Tiếng Việt, App, Free.

**App content** (menu trái → Policy → App content):

| Mục | Trả lời |
|---|---|
| Privacy policy | `https://<web>/privacy` |
| App access | "All or some functionality is restricted" → cung cấp 1 tài khoản mentee để reviewer đăng nhập (tạo trên production) |
| Ads | Không có quảng cáo |
| Content rating | Làm bảng câu hỏi; chọn có tương tác giữa người dùng (chat, gọi video) |
| Target audience | 18+ |
| Data safety | Xem bảng dưới |
| Account deletion | `https://<web>/delete-account` |
| Financial features | Trả lời đúng thực tế: người dùng trả tiền dịch vụ học qua cổng PayOS; mentor rút thu nhập; không phải ngân hàng/cho vay/crypto |

**Data safety — gợi ý** (đối chiếu lại đúng câu chữ trên form):

| Loại dữ liệu | Thu thập | Bắt buộc? | Mục đích |
|---|---|---|---|
| Name, Email address | Có | Bắt buộc | App functionality, Account management |
| Phone number, User IDs (mã SV) | Có | Tuỳ chọn | App functionality |
| Other info (trường, ngành, năm học) | Có | Tuỳ chọn | App functionality |
| Photos (ảnh đại diện) | Có | Tuỳ chọn | App functionality |
| Purchase history (buổi học, giao dịch) | Có | Bắt buộc | App functionality, Fraud prevention |
| Other financial info (tài khoản ngân hàng khi rút) | Có | Tuỳ chọn | App functionality |
| Other in-app messages (chat) | Có | Tuỳ chọn | App functionality |
| Videos, Voice recordings (ghi hình buổi học — chỉ trên web) | Có | Tuỳ chọn | Fraud prevention / dispute |
| Other user-generated content (đánh giá, hồ sơ mentor, câu hỏi AI) | Có | Tuỳ chọn | App functionality |

- Dữ liệu **không** được "chia sẻ" theo định nghĩa của Google (PayOS, Brevo, Gemini, Atlas… là nhà cung cấp xử lý thay mặt DynForge).
- Mã hoá khi truyền: **Có** (HTTPS). Người dùng yêu cầu xoá được: **Có**.

**Store listing:**

- Tên: `DynForge`
- Mô tả ngắn (≤ 80 ký tự): `Học 1:1 với mentor là sinh viên giỏi cùng trường. Thanh toán ký quỹ an toàn.`
- Mô tả đầy đủ: giới thiệu mentor cùng trường, xác minh bằng email trường, ký quỹ, khiếu nại, trợ lý AI.
- Icon: `store-assets/play-icon-512.png`
- Feature graphic: `store-assets/play-feature-graphic-1024x500.png`
- Ảnh chụp màn hình: **tự chụp 2–8 ảnh trên điện thoại thật** (trang chủ, danh sách mentor, hồ sơ mentor, đặt lịch, ký quỹ).
- Danh mục: Education.

**Testing → Closed testing** → tạo track → upload `.aab` → thêm email 12 tester → gửi link opt-in. Đếm đủ 14 ngày → **Apply for production**.

---

## 8. Rủi ro còn lại — đọc trước khi mở cho người thật

1. **Chưa compile backend trong quá trình sửa** — phải chạy `mvnw.cmd clean compile` (bước 1).
2. **Video ghi hình trên Render free bị mất** mỗi lần deploy/khởi động lại (ổ đĩa tạm). Cần Render Disk (trả phí) hoặc lưu lên S3/R2 trước khi dựa vào video làm bằng chứng.
3. **Render free "ngủ" sau 15 phút** không có truy cập → request đầu mất 30–60 giây, app trông như treo. Người dùng thật: nên lên gói trả phí.
4. **Lưu hồ sơ người dùng** (đổi tên, đổi mật khẩu…) vẫn ghi đè cả document; nếu trùng đúng mili-giây với một khoản cộng/trừ ví thì có thể mất thay đổi số dư đó. Xác suất rất thấp; sửa triệt để = chuyển mọi lệnh lưu user sang update từng trường.
5. **Voucher trên web** chỉ hiển thị, không giảm tiền thật (đã ẩn trong app). Nên bỏ hoặc làm thật.
6. **`/api/ai/chat` vẫn public** → người lạ có thể dùng hết quota Gemini. Nên thêm giới hạn theo IP.
7. **Đăng nhập Google bị ẩn trong app** (Google chặn OAuth trong WebView). Muốn có: dùng plugin native.
8. **Lịch sử git** vẫn chứa key cũ và 132 MB video → phần C của `PROMPT-security-cleanup.md`.
9. **Văn bản pháp lý là bản nháp**: đọc lại `/privacy`, `/terms`; các cam kết như "phản hồi trong 15 ngày" phải làm được.
10. Thư mục `.tmp-claude/` (đã gitignore) là file tạm, xoá được.
