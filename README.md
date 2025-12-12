# Hệ thống Báo giá COVASOL

Ứng dụng web tạo và xuất báo giá tự động, được phát triển bởi đội ngũ COVASOL.

## 🚀 Tính năng

- ✅ Tạo báo giá với giao diện trực quan
- ✅ Thêm hạng mục từ danh sách mẫu hoặc tùy chỉnh
- ✅ Tự động tính toán thành tiền và tổng cộng
- ✅ Xuất file Excel (.xlsx) với định dạng chuyên nghiệp
- ✅ Điều khoản thanh toán tự động theo tỷ lệ %
- ✅ Giao diện responsive, hiện đại

## 🛠️ Công nghệ sử dụng

- **React** + **Vite** - Framework & Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **ExcelJS** - Xử lý file Excel
- **FileSaver.js** - Download file

## 📦 Cài đặt

```bash
# Clone repository (nếu có)
cd BaoGia_Cova

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build cho production
npm run build
```

## 📁 Cấu trúc thư mục

```
src/
├── components/
│   └── QuotationForm.jsx    # Component chính
├── data/
│   └── sampleData.js        # Dữ liệu mẫu các gói dịch vụ
├── utils/
│   └── exportToExcel.js     # Logic xuất file Excel
├── App.jsx                  # Root component
├── main.jsx                 # Entry point
└── index.css                # Global styles
```

## 📝 Hướng dẫn sử dụng

1. Nhập thông tin khách hàng và mô tả dự án
2. Thêm các hạng mục báo giá (chọn từ mẫu hoặc tùy chỉnh)
3. Điều chỉnh số lượng, đơn giá nếu cần
4. Bấm "Xuất File Excel" để tải file báo giá

## 📄 License

© 2024 ĐỘI NGŨ PHÁT TRIỂN COVASOL. All rights reserved.
