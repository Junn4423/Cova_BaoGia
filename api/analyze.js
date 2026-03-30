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
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 50000);

// Danh sách model free được phép sử dụng (cập nhật 2026)
const ALLOWED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-3-flash',
];

// System prompt tối ưu tốc độ: ngắn, rõ ràng, JSON-only
const SYSTEM_PROMPT = `Bạn là chuyên gia báo giá phần mềm của COVASOL Studio.

Mục tiêu: từ nội dung user, tạo báo giá chi tiết dạng JSON.

Quy tắc:
1) Chia nhỏ 8-14 dòng modules, không gộp nhiều việc vào 1 dòng.
2) Scope mỗi module ngắn gọn (1 câu), rõ tiêu chí nghiệm thu.
3) Đơn giá nhỏ, hợp lý theo thị trường Việt Nam.
4) Tạo paymentTerms thực tế, tổng percentage phải bằng 100.
5) Nếu có fixedBudget: totalEstimate phải bằng đúng fixedBudget.
6) Nếu có minBudget/maxBudget: totalEstimate phải nằm trong khoảng đó.

Chỉ trả JSON hợp lệ, không markdown, không giải thích.

Schema bắt buộc:
{
  "projectName": "string",
  "projectDescription": "string",
  "modules": [
    {
      "name": "string",
      "scope": "string",
      "unit": "Trang/Module/Endpoint/Section/Bộ",
      "quantity": 1,
      "unitPrice": 400000,
      "acceptanceCriteria": "string",
      "excludes": "string"
    }
  ],
  "paymentTerms": [
    {
      "milestone": "string",
      "time": "string",
      "percentage": 30,
      "description": "string"
    }
  ],
  "totalEstimate": 7000000,
  "timeline": "string",
  "notes": "string"
}`;

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    let geminiResponse;
    try {
      geminiResponse = await fetch(`${geminiUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.25,
            topK: 20,
            topP: 0.9,
            maxOutputTokens: 4096,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      });
    } catch (fetchError) {
      if (fetchError?.name === 'AbortError') {
        return res.status(504).json({
          error: 'GEMINI_TIMEOUT',
          message: `Gemini xử lý quá lâu (>${Math.floor(GEMINI_TIMEOUT_MS / 1000)}s). Hãy thử model Flash/Flash-Lite hoặc rút gọn nội dung.`
        });
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    let geminiData = {};
    try {
      geminiData = await geminiResponse.json();
    } catch {
      geminiData = {};
    }

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
