// Vercel Serverless Function - Gemini AI Analysis
// Endpoint: /api/analyze

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4.5mb',
    },
  },
};

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// System prompt cho việc phân tích dự án
const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích và báo giá dự án phần mềm của COVASOL Studio.

Nhiệm vụ: Phân tích nội dung dự án được cung cấp và đưa ra báo giá chi tiết.

Bạn PHẢI trả về JSON với cấu trúc CHÍNH XÁC như sau:
{
  "projectName": "Tên dự án",
  "projectDescription": "Mô tả tổng quan dự án",
  "modules": [
    {
      "name": "Tên module/tính năng",
      "scope": "Phạm vi công việc chi tiết",
      "unit": "Đơn vị tính (Module/Trang/API/...)",
      "quantity": 1,
      "unitPrice": 5000000,
      "acceptanceCriteria": "Tiêu chí nghiệm thu",
      "excludes": "Hạng mục không bao gồm"
    }
  ],
  "totalEstimate": 50000000,
  "timeline": "Thời gian dự kiến",
  "notes": "Ghi chú thêm"
}

Quy tắc định giá (VND):
- Landing Page cơ bản: 3,000,000 - 5,000,000
- Landing Page nâng cao: 5,000,000 - 8,000,000
- Website giới thiệu (5-10 trang): 8,000,000 - 15,000,000
- Website WordPress: 10,000,000 - 25,000,000
- E-commerce cơ bản: 15,000,000 - 35,000,000
- E-commerce nâng cao: 35,000,000 - 80,000,000
- Web App đơn giản (5-10 màn hình): 12,000,000 - 25,000,000
- Web App trung bình (15-25 màn hình): 25,000,000 - 45,000,000
- Web App phức tạp (30+ màn hình): 45,000,000 - 100,000,000+
- Mobile App (React Native/Flutter): 30,000,000 - 150,000,000
- API RESTful cơ bản: 8,000,000 - 18,000,000
- API nâng cao: 18,000,000 - 35,000,000
- UI/UX Design: 5,000,000 - 20,000,000/bộ
- Tích hợp thanh toán: 5,000,000 - 10,000,000
- Authentication/Authorization: 3,000,000 - 8,000,000
- Admin Dashboard: 15,000,000 - 30,000,000
- Chatbot AI: 10,000,000 - 30,000,000
- SEO cơ bản: 3,000,000 - 8,000,000

Hãy phân tích kỹ và chia nhỏ thành các module rõ ràng, dễ hiểu. Mỗi module nên có scope chi tiết.
CHỈ trả về JSON, không thêm text hay markdown.`;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Gemini-Api-Key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, fileBase64, fileName, mimeType } = req.body;
    
    // Lấy API key từ header hoặc env
    const apiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API_KEY_REQUIRED',
        message: 'Vui lòng cung cấp Gemini API Key'
      });
    }

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

    // Gọi Gemini API
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
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
