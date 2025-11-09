# Đặc tả Kỹ thuật Backend cho Trình quản lý Mật khẩu

## 1. Tổng quan

Mục tiêu của dự án này là xây dựng một hệ thống backend an toàn cho ứng dụng "Trình quản lý Mật khẩu". Backend sẽ chịu trách nhiệm quản lý người dùng và lưu trữ dữ liệu đã được mã hóa của họ.

**Kiến trúc cốt lõi: Zero-Knowledge.** Backend **KHÔNG BAO GIỜ** được phép truy cập vào Mật khẩu chính (Master Password) ở dạng văn bản thuần hoặc có khả năng giải mã dữ liệu của người dùng. Mọi quá trình mã hóa và giải mã đều được thực hiện ở phía client (frontend).

## 2. Công nghệ đề xuất

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Ngôn ngữ:** TypeScript
- **Cơ sở dữ liệu:** PostgreSQL
- **Xác thực:** JSON Web Tokens (JWT)
- **Hashing Mật khẩu:** bcrypt.js

## 3. Schema Cơ sở dữ liệu

Cần tạo một bảng duy nhất tên là `users` trong cơ sở dữ liệu PostgreSQL.

**Câu lệnh SQL để tạo bảng:**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    encrypted_vault TEXT
);
```

**Mô tả các cột:**
- `id`: Khóa chính, định danh duy nhất cho mỗi người dùng.
- `username`: Tên đăng nhập của người dùng. Phải là duy nhất.
- `password_hash`: Mật khẩu của người dùng sau khi đã được hash bằng bcrypt. **KHÔNG BAO GIỜ lưu mật khẩu gốc.**
- `encrypted_vault`: Một chuỗi văn bản lớn (TEXT) chứa toàn bộ dữ liệu tài khoản của người dùng. Dữ liệu này được mã hóa từ phía frontend bằng thuật toán AES-GCM và được lưu dưới dạng Base64. Backend chỉ lưu trữ chuỗi này mà không cần biết nội dung.

## 4. Đặc tả API Endpoints

Tất cả các endpoint phải có tiền tố là `/api`. Cần cấu hình CORS để cho phép các request từ frontend.

---

### **4.1. Đăng ký người dùng**

- **Endpoint:** `POST /api/register`
- **Mô tả:** Tạo một tài khoản người dùng mới.
- **Xác thực:** Không yêu cầu.
- **Request Body:**
  ```json
  {
    "username": "someuser",
    "password": "their_master_password"
  }
  ```
- **Logic xử lý:**
  1. Kiểm tra xem `username` đã tồn tại trong bảng `users` chưa.
  2. Nếu tồn tại, trả về lỗi.
  3. Nếu chưa, hash `password` từ request body bằng `bcrypt` (khuyến nghị salt round = 12).
  4. Lưu `username` và `password_hash` vào bảng `users`. Cột `encrypted_vault` có thể để giá trị `NULL` hoặc chuỗi rỗng.
- **Phản hồi thành công (Success Response):**
  - **Code:** `201 Created`
  - **Body:**
    ```json
    {
      "message": "User registered successfully"
    }
    ```
- **Phản hồi lỗi (Error Response):**
  - **Code:** `409 Conflict` (Nếu username đã tồn tại)
  - **Body:**
    ```json
    {
      "message": "Username already exists"
    }
    ```

---

### **4.2. Đăng nhập người dùng**

- **Endpoint:** `POST /api/login`
- **Mô tả:** Xác thực người dùng và trả về một JWT.
- **Xác thực:** Không yêu cầu.
- **Request Body:**
  ```json
  {
    "username": "someuser",
    "password": "their_master_password"
  }
  ```
- **Logic xử lý:**
  1. Tìm người dùng trong CSDL bằng `username`.
  2. Nếu không tìm thấy, trả về lỗi.
  3. Dùng `bcrypt.compare` để so sánh `password` từ request với `password_hash` trong CSDL.
  4. Nếu không khớp, trả về lỗi.
  5. Nếu khớp, tạo một JWT. Payload của token phải chứa `userId` (là `id` của người dùng trong CSDL). Thiết lập thời gian hết hạn cho token (ví dụ: 1 ngày).
- **Phản hồi thành công (Success Response):**
  - **Code:** `200 OK`
  - **Body:**
    ```json
    {
      "token": "your.jwt.token.here"
    }
    ```
- **Phản hồi lỗi (Error Response):**
  - **Code:** `401 Unauthorized` (Sai username hoặc password)
  - **Body:**
    ```json
    {
      "message": "Invalid username or password"
    }
    ```

---

### **4.3. Lấy dữ liệu tài khoản**

- **Endpoint:** `GET /api/accounts`
- **Mô tả:** Lấy "két sắt" dữ liệu đã được mã hóa của người dùng đã đăng nhập.
- **Xác thực:** **Yêu cầu JWT.** Token phải được gửi trong header `Authorization` theo dạng `Bearer <token>`.
- **Logic xử lý:**
  1. Xác thực JWT. Nếu không hợp lệ hoặc thiếu, trả về lỗi.
  2. Lấy `userId` từ payload của token.
  3. Truy vấn CSDL để lấy giá trị của cột `encrypted_vault` tương ứng với `userId`.
- **Phản hồi thành công (Success Response):**
  - **Code:** `200 OK`
  - **Body:** (Giá trị của `encrypted_vault` có thể là `null` nếu người dùng chưa lưu gì)
    ```json
    {
      "encrypted_vault": "base64encodedstringfromdb..."
    }
    ```
- **Phản hồi lỗi (Error Response):**
  - **Code:** `401 Unauthorized` (Token không hợp lệ)
  - **Body:**
    ```json
    {
      "message": "Authentication failed"
    }
    ```

---

### **4.4. Lưu dữ liệu tài khoản**

- **Endpoint:** `POST /api/accounts`
- **Mô tả:** Cập nhật "két sắt" dữ liệu đã được mã hóa của người dùng.
- **Xác thực:** **Yêu cầu JWT.** (Tương tự `GET /api/accounts`).
- **Request Body:**
  ```json
  {
    "encrypted_vault": "newbase64encodedstringfromfrontend..."
  }
  ```
- **Logic xử lý:**
  1. Xác thực JWT và lấy `userId`.
  2. Cập nhật cột `encrypted_vault` trong bảng `users` với dữ liệu từ request body cho `userId` tương ứng.
- **Phản hồi thành công (Success Response):**
  - **Code:** `200 OK`
  - **Body:**
    ```json
    {
      "message": "Vault updated successfully"
    }
    ```
- **Phản hồi lỗi (Error Response):**
  - **Code:** `401 Unauthorized` (Token không hợp lệ)
  - **Body:**
    ```json
    {
      "message": "Authentication failed"
    }
    ```

## 5. Yêu cầu Bảo mật và Triển khai

- Sử dụng biến môi trường (qua file `.env`) để quản lý các thông tin nhạy cảm như chuỗi kết nối CSDL, secret key của JWT.
- Cài đặt middleware xử lý lỗi chung để trả về các lỗi ở định dạng JSON nhất quán.
- Triển khai nên được thực hiện trên một nền tảng hỗ trợ Node.js (ví dụ: VPS, Heroku, Render) và CSDL PostgreSQL.
- Cần có SSL/TLS (HTTPS) cho môi trường production.
