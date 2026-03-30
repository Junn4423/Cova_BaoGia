# AI Analysis API - Gemini Integration

## Tổng quan

API serverless để phân tích dự án và tự động tạo báo giá sử dụng Google Gemini AI.

## Cách hoạt động

1. **Upload file hoặc paste nội dung** - Người dùng có thể upload PDF, ảnh, hoặc paste text mô tả dự án
2. **AI phân tích** - Gemini AI phân tích nội dung và đề xuất các module, tính năng, giá
3. **Tự động thêm vào báo giá** - Kết quả được thêm vào bảng báo giá

## API Endpoints

### POST /api/analyze

Phân tích nội dung dự án và tạo báo giá.

**Headers:**
```
Content-Type: application/json
X-Gemini-Api-Key: YOUR_API_KEY (optional - sử dụng env nếu không có)
```

**Request Body:**
```json
{
  "content": "Mô tả dự án dạng text...",
  "fileBase64": "base64_encoded_file_content",
  "fileName": "document.pdf",
  "mimeType": "application/pdf"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "projectName": "Website bán hàng ABC",
    "projectDescription": "Xây dựng website thương mại điện tử...",
    "modules": [
      {
        "name": "Giao diện Landing Page",
        "scope": "Thiết kế 5 trang chính...",
        "unit": "Trang",
        "quantity": 5,
        "unitPrice": 3000000,
        "acceptanceCriteria": "Responsive, SEO...",
        "excludes": "Hosting, domain..."
      }
    ],
    "totalEstimate": 50000000,
    "timeline": "4-6 tuần",
    "notes": "Ghi chú thêm..."
  }
}
```

**Response (Error):**
```json
{
  "error": "QUOTA_EXCEEDED",
  "message": "API key đã hết quota. Vui lòng nhập API key mới."
}
```

## Error Codes

- `API_KEY_REQUIRED` - Cần cung cấp API key
- `INVALID_API_KEY` - API key không hợp lệ
- `QUOTA_EXCEEDED` - Hết quota, cần API key mới
- `NO_CONTENT` - Không có nội dung để phân tích
- `GEMINI_ERROR` - Lỗi từ Gemini API
- `SERVER_ERROR` - Lỗi server

## Giới hạn

- **File size:** Tối đa 4MB (Vercel giới hạn 4.5MB)
- **Định dạng hỗ trợ:** PNG, JPEG, WebP, GIF, PDF, Text, Markdown
- **Rate limit:** Phụ thuộc vào Gemini API quota

## Lấy API Key miễn phí

1. Truy cập [Google AI Studio](https://aistudio.google.com/apikey)
2. Đăng nhập bằng tài khoản Google
3. Click "Create API Key"
4. Copy và sử dụng

## Development

```bash
# Cài đặt dependencies
npm install

# Chạy frontend + API server
npm run dev:all

# Hoặc chạy riêng
npm run dev      # Frontend (port 3000)
npm run dev:api  # API server (port 3001)
```

## Deploy lên Vercel

1. Push code lên GitHub
2. Connect repo với Vercel
3. (Optional) Thêm `GEMINI_API_KEY` vào Environment Variables
4. Deploy

Khi không có GEMINI_API_KEY trong env, người dùng sẽ được yêu cầu nhập API key của riêng họ.
