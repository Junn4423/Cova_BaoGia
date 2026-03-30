// Vercel Serverless Function - Gemini AI Analysis
// Endpoint: /api/analyze

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4.5mb',
    },
  },
};

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';

// Danh sách model free được phép sử dụng (cập nhật 2026)
const ALLOWED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-3-flash',
];

// System prompt cho việc phân tích dự án
const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích và báo giá dự án phần mềm của COVASOL Studio.

Nhiệm vụ: Phân tích nội dung dự án và TẠO BÁO GIÁ CHI TIẾT, CHIA NHỎ thành nhiều dòng với đơn giá nhỏ.

## QUY TẮC BẮT BUỘC:
1. LUÔN chia nhỏ thành NHIỀU dòng (tối thiểu 8-20 dòng). TUYỆT ĐỐI KHÔNG gộp nhiều việc vào 1 dòng.
2. Mỗi dòng phải có đơn giá NHỎ và hợp lý:
   - Code Frontend 1 trang/section: 300,000 - 500,000 VND
   - Thiết kế UI/UX 1 trang: 200,000 - 400,000 VND
   - Mỗi module CRUD (Create/Read/Update/Delete): 1,000,000 - 1,500,000 VND
   - Tích hợp 1 API endpoint: 300,000 - 500,000 VND
   - Responsive 1 trang: 150,000 - 250,000 VND
   - Form liên hệ/đăng ký: 400,000 - 600,000 VND
   - Animation/hiệu ứng 1 section: 200,000 - 400,000 VND
   - SEO on-page 1 trang: 200,000 - 300,000 VND
   - Setup hosting & deploy: 300,000 - 500,000 VND
   - Testing & QA 1 module: 300,000 - 500,000 VND
   - Backend API 1 endpoint: 400,000 - 800,000 VND
   - Database design 1 bảng: 200,000 - 400,000 VND
   - Authentication module: 800,000 - 1,200,000 VND
   - Dashboard admin 1 trang: 500,000 - 800,000 VND
3. Phạm vi (scope) mỗi dòng phải NGẮN GỌN (1-2 câu ngắn), không viết dài.
4. Ước tính thời gian thực tế và tạo mốc thanh toán phù hợp.

## VÍ DỤ: Thay vì "Landing Page Y Tế = 7,000,000", CHIA NHỎ thành:
- Thiết kế UI trang chủ (Hero + CTA) → 400,000
- Thiết kế UI section Dịch vụ → 300,000
- Thiết kế UI section Đội ngũ → 300,000
- Thiết kế UI section Testimonial → 250,000
- Code FE trang chủ (Hero, Nav, Footer) → 500,000
- Code FE section Dịch vụ → 400,000
- Code FE section Đội ngũ → 400,000
- Code FE section Testimonial + Slider → 350,000
- Code FE trang Liên hệ + Google Maps → 400,000
- Responsive (Desktop/Tablet/Mobile) → 500,000
- Form liên hệ + gửi email → 500,000
- Animation hiệu ứng scroll → 400,000
- SEO on-page → 300,000
- Cấu hình hosting & deploy → 400,000
- Testing cross-browser & QA → 300,000

Bạn PHẢI trả về JSON với cấu trúc CHÍNH XÁC như sau:
{
  "projectName": "Tên dự án",
  "projectDescription": "Mô tả tổng quan ngắn gọn",
  "modules": [
    {
      "name": "Tên hạng mục ngắn gọn",
      "scope": "Mô tả ngắn 1-2 câu",
      "unit": "Trang/Module/Endpoint/Section/Bộ",
      "quantity": 1,
      "unitPrice": 400000,
      "acceptanceCriteria": "Tiêu chí nghiệm thu ngắn",
      "excludes": "Không bao gồm"
    }
  ],
  "paymentTerms": [
    {
      "milestone": "Tên mốc (VD: Ký hợp đồng)",
      "time": "T0 / T + 1 tuần / T + 2 tuần",
      "percentage": 30,
      "description": "Mô tả mốc thanh toán"
    }
  ],
  "totalEstimate": 7000000,
  "timeline": "VD: 3-4 tuần",
  "notes": "Ghi chú"
}

## LƯU Ý NGÂN SÁCH:
- Nếu user chỉ định ngân sách cố định (fixedBudget), tổng PHẢI BẰNG ĐÚNG số đó.
- Nếu user chỉ định khoảng giá (minBudget-maxBudget), tổng phải nằm trong khoảng đó.
- Nếu không có ngân sách, tự ước tính hợp lý.
- paymentTerms: chia mốc thanh toán thực tế, tổng percentage = 100%.

CHỈ trả về JSON, không thêm text hay markdown.`;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Gemini-Api-Key, X-Gemini-Model');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, fileBase64, fileName, mimeType, budgetMode, minBudget, maxBudget, fixedBudget } = req.body;
    
    // Lấy API key từ header hoặc env
    const apiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API_KEY_REQUIRED',
        message: 'Vui lòng cung cấp Gemini API Key'
      });
    }

    // Lấy model từ header, validate trong whitelist
    const requestedModel = req.headers['x-gemini-model'] || DEFAULT_MODEL;
    const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : DEFAULT_MODEL;

    // Xây dựng request body cho Gemini
    const parts = [];
    
    // Thêm system prompt
    parts.push({ text: SYSTEM_PROMPT });

    // Nếu có file (hình ảnh, PDF, ...)
    if (fileBase64 && mimeType) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: fileBase64
        }
      });
      parts.push({ text: `\n\nPhân tích nội dung từ file "${fileName}" ở trên và tạo báo giá chi tiết.` });
    }

    // Nếu có text content
    if (content) {
      parts.push({ text: `\n\nNội dung cần phân tích:\n${content}` });
    }

    if (!content && !fileBase64) {
      return res.status(400).json({ 
        error: 'NO_CONTENT',
        message: 'Vui lòng cung cấp nội dung hoặc file để phân tích'
      });
    }

    // Thêm hướng dẫn ngân sách nếu có
    if (budgetMode === 'fixed' && fixedBudget > 0) {
      parts.push({ text: `\n\n⚠️ NGÂN SÁCH CỐ ĐỊNH: Tổng báo giá PHẢI BẰNG ĐÚNG ${fixedBudget} VND. Hãy điều chỉnh số lượng và đơn giá sao cho tổng chính xác = ${fixedBudget} VND.` });
    } else if (budgetMode === 'range' && minBudget > 0 && maxBudget > 0) {
      parts.push({ text: `\n\n⚠️ KHOẢNG GIÁ: Tổng báo giá phải nằm trong khoảng ${minBudget} - ${maxBudget} VND.` });
    }

    // Gọi Gemini API
    const geminiUrl = `${GEMINI_API_BASE}/${model}:generateContent`;
    const geminiResponse = await fetch(`${geminiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    const geminiData = await geminiResponse.json();

    // Xử lý lỗi từ Gemini
    if (!geminiResponse.ok) {
      // Kiểm tra lỗi quota/rate limit
      if (geminiResponse.status === 429 || 
          geminiData.error?.message?.includes('quota') ||
          geminiData.error?.message?.includes('RATE_LIMIT') ||
          geminiData.error?.message?.includes('RESOURCE_EXHAUSTED')) {
        return res.status(429).json({
          error: 'QUOTA_EXCEEDED',
          message: 'API key đã hết quota. Vui lòng nhập API key mới.'
        });
      }

      if (geminiResponse.status === 401 || geminiResponse.status === 403) {
        return res.status(401).json({
          error: 'INVALID_API_KEY',
          message: 'API key không hợp lệ. Vui lòng kiểm tra lại.'
        });
      }

      return res.status(geminiResponse.status).json({
        error: 'GEMINI_ERROR',
        message: geminiData.error?.message || 'Lỗi từ Gemini API'
      });
    }

    // Trích xuất text response
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      return res.status(500).json({
        error: 'EMPTY_RESPONSE',
        message: 'Không nhận được phản hồi từ AI'
      });
    }

    // Parse JSON từ response
    try {
      // Loại bỏ markdown code blocks nếu có
      let cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const analysisResult = JSON.parse(cleanedResponse);
      
      return res.status(200).json({
        success: true,
        data: analysisResult
      });
    } catch (parseError) {
      // Nếu không parse được JSON, trả về raw text
      return res.status(200).json({
        success: true,
        data: {
          projectName: 'Dự án phân tích',
          projectDescription: responseText,
          modules: [],
          rawResponse: responseText
        }
      });
    }

  } catch (error) {
    console.error('Analyze API Error:', error);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Có lỗi xảy ra khi xử lý yêu cầu'
    });
  }
}
