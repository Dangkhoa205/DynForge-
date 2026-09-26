# DynForge — Thu hồi secret & dọn git history

> Repo `DynForge-Platform/DynForge-` là **public**. `BE/src/main/resources/application.properties`
> đã được commit từ commit đầu tiên và chứa key thật. 132 MB video buổi học cũng nằm
> trong history. Tài liệu này gồm 3 phần, **làm đúng thứ tự A → B → C**.

---

## PHẦN A — Thu hồi key (làm TRƯỚC, không dùng AI, ~20 phút)

Đây là việc quan trọng nhất. Dọn history mà không thu hồi key thì vô nghĩa:
repo đã public nhiều tháng, ai cũng có thể đã clone.

| # | Key | Nơi thu hồi | Ghi chú |
|---|---|---|---|
| 1 | `spring.mail.password` — Brevo SMTP `xsmtpsib-...` | Brevo → SMTP & API → SMTP keys → xoá key cũ, tạo key mới | Ai có key này gửi mail mạo danh DynForge được |
| 2 | `gemini.api-key` — `AQ.Ab8RN6...` | Google AI Studio → API keys → Delete → Create new | Quota bị đốt là nhẹ; key có thể gắn billing |
| 3 | `payos.api-key` + `payos.checksum-key` | PayOS merchant portal → Kênh thanh toán → tạo lại cặp key | **Nghiêm trọng nhất.** checksum-key dùng để ký/đối soát giao dịch |
| 4 | `app.jwt.secret` | Tự sinh mới (xem lệnh bên dưới) | Đổi = mọi người đang đăng nhập bị đăng xuất. Chấp nhận được |
| 5 | `app.webhook.secret` | Tự đặt chuỗi ngẫu nhiên | Hiện đang là `dynforge-webhook-secret-change-in-prod` |

Sinh JWT secret mới (PowerShell):

```powershell
$b = New-Object byte[] 64
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
[Convert]::ToBase64String($b)
```

**Không cần thu hồi:**
- `google.client-id` — OAuth Web Client ID là thông tin công khai theo thiết kế.
  Nhưng hãy vào Google Cloud Console giới hạn **Authorized JavaScript origins**
  đúng domain thật (`https://dyn-forge.vercel.app`), đừng để mở.
- `spring.data.mongodb.uri` — đang là `localhost`, không phải secret.
  Khi lên Atlas thì connection string MỚI là secret.

Sau khi có key mới, **giữ chúng trong file local, đừng commit**. Phần B lo việc đó.

---

## PHẦN B — Prompt cho AI: tách config ra biến môi trường

> Dán vào Claude Code / Cursor mở ở thư mục gốc `DynForge-`.

```
Repo DynForge — Spring Boot 4.1.0 (Java 17, MongoDB) ở BE/, React + Vite ở FE/.

VẤN ĐỀ
BE/src/main/resources/application.properties đang được commit vào một repo GitHub
PUBLIC và chứa secret thật: Brevo SMTP password, Gemini API key, PayOS api-key và
checksum-key, JWT secret, webhook secret. Các key này ĐANG được thu hồi thủ công.
Việc của bạn là làm cho chúng không bao giờ bị commit lại nữa.

VIỆC CẦN LÀM

1) Sửa BE/src/main/resources/application.properties: thay MỌI giá trị nhạy cảm
   bằng placeholder biến môi trường theo cú pháp Spring ${VAR:default}.
   Cụ thể:
     spring.data.mongodb.uri=${MONGODB_URI:mongodb://localhost:27017/dynforge}
     app.jwt.secret=${JWT_SECRET}
     app.webhook.secret=${WEBHOOK_SECRET}
     spring.mail.username=${BREVO_SMTP_USER:}
     spring.mail.password=${BREVO_SMTP_PASSWORD:}
     google.client-id=${GOOGLE_CLIENT_ID:}
     gemini.api-key=${GEMINI_API_KEY:}
     payos.client-id=${PAYOS_CLIENT_ID:}
     payos.api-key=${PAYOS_API_KEY:}
     payos.checksum-key=${PAYOS_CHECKSUM_KEY:}
     app.frontend.base-url=${FRONTEND_BASE_URL:http://localhost:5173}
     app.payment.base-url=${PAYMENT_BASE_URL:http://localhost:8080}
   JWT_SECRET và WEBHOOK_SECRET CỐ Ý không có giá trị mặc định — app phải chết
   ngay lúc khởi động nếu thiếu, thay vì chạy với secret yếu.
   Các giá trị không nhạy cảm (port, expiration-ms, multipart size, gemini.base-url,
   payos.base-url, app.recordings.dir, app.mail.from, app.mail.sender-name)
   thì GIỮ NGUYÊN hardcode.

2) Tạo BE/.env.example — liệt kê đủ mọi biến ở trên, giá trị để trống hoặc ví dụ
   giả, kèm comment tiếng Việt một dòng cho mỗi biến nói nó lấy ở đâu
   (Brevo dashboard, Google AI Studio, PayOS portal...). File NÀY được commit.

3) Tạo BE/src/main/resources/application-local.properties.example với nội dung
   tương tự dạng key=value để người nào không muốn dùng env var có thể copy thành
   application-local.properties và chạy với -Dspring.profiles.active=local.

4) Cập nhật .gitignore ở thư mục gốc, thêm vào mục 5 (Environment Variables &
   Secret Credentials) đang có sẵn:
     BE/src/main/resources/application-local.properties
     BE/src/main/resources/application-*.properties
     !BE/src/main/resources/application.properties
     !BE/src/main/resources/application-*.properties.example
   Thứ tự dòng phải đúng để phần phủ định (!) có tác dụng.

5) Thêm fail-fast: tạo BE/.../config/SecretsValidator.java implements
   CommandLineRunner với @Order(-1), kiểm tra JWT_SECRET và WEBHOOK_SECRET
   không rỗng và JWT_SECRET giải mã Base64 ra >= 32 byte. Nếu sai thì ném
   IllegalStateException với thông báo tiếng Việt rõ ràng chỉ ra cần set biến nào.
   Lưu ý JwtService đang gọi Base64.getDecoder().decode(secret) nên secret PHẢI
   là Base64 hợp lệ — hãy kiểm tra đúng điều đó.

6) Cập nhật FE/README.md (hiện chỉ có 1 dòng) thành hướng dẫn chạy dự án ngắn gọn:
   biến môi trường cần thiết cho cả BE và FE, lệnh chạy dev, và cảnh báo in đậm
   "KHÔNG commit key thật vào application.properties".

7) Kiểm tra toàn repo còn chỗ nào hardcode secret không: grep các chuỗi
   "xsmtpsib-", "AQ.Ab8RN6", "payos", "checksum" trong cả BE/ và FE/ và báo lại.
   KHÔNG tự sửa file ngoài phạm vi trên — chỉ báo cáo.

RÀNG BUỘC
- KHÔNG reformat file, KHÔNG đổi line ending (repo vừa chuẩn hoá bằng .gitattributes).
- KHÔNG đụng WalletService / EscrowService.
- KHÔNG viết giá trị key thật vào bất kỳ file nào, kể cả .example.

SAU KHI XONG
- `cd BE && mvnw.cmd clean compile` phải pass.
- In ra danh sách biến môi trường cần set để chạy được local.
```

---

## PHẦN C — Xoá khỏi git history (làm SAU khi A và B xong)

> **Ghi rõ:** bước này KHÔNG cứu được các key đã lộ — phần A mới cứu.
> Mục đích ở đây là (1) xoá 132 MB video cá nhân khỏi repo public,
> (2) không để key cũ nằm lại trong history như tài liệu tham khảo cho người khác.

### C1. Sao lưu trước

```powershell
cd D:\CN8\EXE201\EXE201
Copy-Item -Recurse DynForge- DynForge-BACKUP
```

Chép riêng file cấu hình đang chạy được và thư mục video ra ngoài repo:

```powershell
Copy-Item DynForge-\BE\src\main\resources\application.properties $HOME\Desktop\app.properties.bak
Copy-Item -Recurse DynForge-\recordings $HOME\Desktop\recordings-bak
```

### C2. Báo cả nhóm dừng push

Vương và Thọ phải push hết việc đang làm, rồi **không push gì nữa** cho tới khi
bạn báo xong. Sau bước này họ phải **clone lại từ đầu**, không pull được.

### C3. Rewrite

```powershell
pip install git-filter-repo

cd D:\CN8\EXE201\EXE201\DynForge-
git filter-repo --invert-paths `
  --path recordings/ `
  --path BE/src/main/resources/application.properties `
  --force
```

`git filter-repo` xoá remote sau khi chạy — thêm lại:

```powershell
git remote add origin https://github.com/DynForge-Platform/DynForge-.git
git push origin --force --all
git push origin --force --tags
```

### C4. Khôi phục file local để chạy tiếp

```powershell
Copy-Item $HOME\Desktop\app.properties.bak `
  D:\CN8\EXE201\EXE201\DynForge-\BE\src\main\resources\application-local.properties
```

Điền **key mới** từ phần A vào file này. Nó đã được gitignore ở phần B nên
không commit lại được nữa.

### C5. Kiểm tra

```powershell
git count-objects -vH            # size-pack phải tụt từ ~134 MiB xuống vài MiB
git log --all --oneline -- recordings/                     # phải rỗng
git log --all --oneline -- BE/src/main/resources/application.properties   # phải rỗng
```

### Lưu ý về GitHub

Sau khi force-push, GitHub vẫn giữ các object mồ côi truy cập được qua URL commit
SHA trực tiếp trong một thời gian, cho tới khi nó chạy GC. Nếu muốn xoá dứt điểm,
mở ticket với GitHub Support yêu cầu GC repo. Đây là lý do **phần A là việc thật
sự cứu được tình hình**, không phải phần C.

### Phương án thay thế (đơn giản hơn)

History chỉ có 14 commit và không có giá trị lịch sử gì đáng kể. Nếu thấy
`git filter-repo` rắc rối, có thể: xoá repo trên GitHub, tạo repo mới cùng tên,
rồi từ thư mục làm việc sạch chạy `git init` + commit đầu tiên + push. Mất
history và PR cũ, nhưng chắc chắn sạch và không cần force-push.
