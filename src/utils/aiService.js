import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY_STORAGE = "covasol_gemini_api_key";

export const getApiKey = () => localStorage.getItem(API_KEY_STORAGE) || "";
export const setApiKey = (key) => localStorage.setItem(API_KEY_STORAGE, key);

const SYSTEM_PROMPT = `Bạn là chuyên gia báo giá phần mềm cho COVASOL Studio. Nhiệm vụ: phân tích yêu cầu dự án và TẠO BÁO GIÁ CHI TIẾT với nhiều dòng nhỏ, chia nhỏ từng module.

## QUY TẮC QUAN TRỌNG:
1. LUÔN chia nhỏ thành NHIỀU dòng chi tiết (tối thiểu 8-15 dòng). KHÔNG gộp nhiều việc vào 1 dòng.
2. Mỗi dòng phải có giá hợp lý và nhỏ:
   - Mỗi trang Frontend: 300,000 - 500,000 VND/trang
   - Mỗi module CRUD (4 tính năng: Create, Read, Update, Delete): 1,000,000 - 1,500,000 VND/module
   - Thiết kế UI/UX 1 trang: 200,000 - 400,000 VND/trang
   - Tích hợp API đơn giản: 300,000 - 500,000 VND/endpoint
   - Responsive cho 1 trang: 150,000 - 250,000 VND/trang
   - Setup hosting/deploy: 300,000 - 500,000 VND
   - SEO cơ bản 1 trang: 200,000 - 300,000 VND/trang
   - Form liên hệ/đăng ký: 400,000 - 600,000 VND
   - Animation/hiệu ứng: 200,000 - 400,000 VND/section
   - Testing & QA: 300,000 - 500,000 VND/module
   - Backend API endpoint: 400,000 - 800,000 VND/endpoint
   - Database design 1 bảng: 200,000 - 400,000 VND/bảng
3. Phạm vi tóm tắt (scope) phải NGẮN GỌN (1-2 câu), không viết dài.
4. Tổng tiền phải nằm trong ngân sách được chỉ định.
5. Ước tính thời gian thực hiện thực tế và tạo mốc thanh toán phù hợp.

## VÍ DỤ PHÂN TÍCH CHO "Landing Page Y Tế":
Thay vì 3 mục lớn, hãy chia thành:
- Thiết kế UI/UX trang chủ (Hero + CTA) -> 400k
- Thiết kế UI/UX section Dịch vụ -> 300k  
- Thiết kế UI/UX section Đội ngũ bác sĩ -> 300k
- Thiết kế UI/UX section Testimonial -> 250k
- Thiết kế UI/UX trang Liên hệ -> 250k
- Code Frontend trang chủ (Hero, Navigation, Footer) -> 500k
- Code Frontend section Dịch vụ -> 400k
- Code Frontend section Đội ngũ bác sĩ -> 400k
- Code Frontend section Testimonial + Slider -> 350k
- Code Frontend trang Liên hệ + Google Maps -> 400k
- Responsive toàn bộ (Desktop, Tablet, Mobile) -> 500k (5 section x 100k)
- Form liên hệ + gửi email/Google Sheet -> 500k
- Animation & hiệu ứng scroll -> 400k
- SEO on-page (meta, heading, schema) -> 300k
- Cấu hình hosting & deploy -> 400k
- Testing cross-browser & QA -> 300k

## FORMAT TRẢ VỀ (JSON):
{
  "quotationItems": [
    {
      "name": "Tên hạng mục ngắn gọn",
      "scope": "Mô tả ngắn 1-2 câu",
      "unit": "Trang/Module/Endpoint/Section/Bộ/Dự án",
      "quantity": 1,
      "unitPrice": 400000,
      "acceptanceCriteria": "Tiêu chí nghiệm thu ngắn gọn",
      "excludes": "Không bao gồm gì"
    }
  ],
  "paymentTerms": [
    {
      "milestone": "Tên mốc (VD: Ký hợp đồng, Bàn giao thiết kế, Demo giữa kỳ, Nghiệm thu)",
      "time": "T0 / T + 1 tuần / T + 2 tuần / ...",
      "percentage": 30,
      "description": "Mô tả mốc thanh toán"
    }
  ],
  "estimatedDuration": "VD: 3-4 tuần"
}

## LƯU Ý VỀ NGÂN SÁCH:
- Nếu có ngân sách cố định (fixedBudget), tổng tất cả items PHẢI BẰNG ĐÚNG số đó.
- Nếu có khoảng giá (minBudget - maxBudget), tổng phải nằm trong khoảng đó.
- Nếu không có ngân sách, tự ước tính giá hợp lý theo thị trường Việt Nam.
- Mốc thanh toán: chia thời gian thực tế, tổng % = 100%.`;

/**
 * Generate detailed quotation using Gemini AI
 * @param {Object} params
 * @param {string} params.projectDescription - Mô tả dự án
 * @param {string} params.customerName - Tên khách hàng (optional)
 * @param {string} params.budgetMode - "none" | "range" | "fixed"
 * @param {number} params.minBudget - Ngân sách tối thiểu (for range)
 * @param {number} params.maxBudget - Ngân sách tối đa (for range)
 * @param {number} params.fixedBudget - Ngân sách cố định (for fixed)
 * @returns {Promise<Object>} AI generated quotation data
 */
export async function generateQuotation({
  projectDescription,
  customerName = "",
  budgetMode = "none",
  minBudget = 0,
  maxBudget = 0,
  fixedBudget = 0,
}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Vui lòng nhập API Key của Gemini AI để sử dụng tính năng này.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  });

  let budgetInstruction = "";
  if (budgetMode === "fixed" && fixedBudget > 0) {
    budgetInstruction = `\n\n⚠️ NGÂN SÁCH CỐ ĐỊNH: Tổng báo giá PHẢI BẰNG ĐÚNG ${new Intl.NumberFormat("vi-VN").format(fixedBudget)} VND. Hãy điều chỉnh số lượng và đơn giá để tổng = ${fixedBudget} VND.`;
  } else if (budgetMode === "range" && minBudget > 0 && maxBudget > 0) {
    budgetInstruction = `\n\n⚠️ KHOẢNG GIÁ: Tổng báo giá phải nằm trong khoảng ${new Intl.NumberFormat("vi-VN").format(minBudget)} - ${new Intl.NumberFormat("vi-VN").format(maxBudget)} VND.`;
  }

  const userPrompt = `Hãy tạo báo giá CHI TIẾT cho dự án sau:

Khách hàng: ${customerName || "(Chưa có)"}
Mô tả dự án: ${projectDescription}
${budgetInstruction}

Yêu cầu:
- Chia nhỏ tối đa thành nhiều dòng (8-20 dòng), mỗi dòng giá nhỏ.
- Phạm vi tóm tắt ngắn gọn, không viết dài.
- Ước tính timeline thực tế và tạo mốc thanh toán.
- Trả về đúng format JSON đã chỉ định.`;

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: userPrompt },
  ]);

  const responseText = result.response.text();
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    // Try to extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("AI trả về dữ liệu không hợp lệ. Vui lòng thử lại.");
    }
  }

  // Validate structure
  if (!parsed.quotationItems || !Array.isArray(parsed.quotationItems)) {
    throw new Error("AI trả về dữ liệu thiếu quotationItems.");
  }

  // Add IDs to items
  const now = Date.now();
  parsed.quotationItems = parsed.quotationItems.map((item, idx) => ({
    id: now + idx,
    name: item.name || "",
    scope: item.scope || "",
    unit: item.unit || "Mục",
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice || 0,
    acceptanceCriteria: item.acceptanceCriteria || "",
    excludes: item.excludes || "",
  }));

  if (parsed.paymentTerms && Array.isArray(parsed.paymentTerms)) {
    parsed.paymentTerms = parsed.paymentTerms.map((term, idx) => ({
      id: now + 1000 + idx,
      milestone: term.milestone || "",
      time: term.time || "",
      percentage: term.percentage || 0,
      description: term.description || "",
    }));
  }

  // If fixed budget, adjust to match exactly
  if (budgetMode === "fixed" && fixedBudget > 0) {
    const currentTotal = parsed.quotationItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    if (currentTotal !== fixedBudget && currentTotal > 0) {
      const ratio = fixedBudget / currentTotal;
      parsed.quotationItems = parsed.quotationItems.map((item) => ({
        ...item,
        unitPrice: Math.round((item.unitPrice * ratio) / 1000) * 1000,
      }));
      // Fix rounding error on last item
      const newTotal = parsed.quotationItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const diff = fixedBudget - newTotal;
      if (diff !== 0 && parsed.quotationItems.length > 0) {
        const lastItem = parsed.quotationItems[parsed.quotationItems.length - 1];
        lastItem.unitPrice += diff / lastItem.quantity;
      }
    }
  }

  return parsed;
}

// Preset budget ranges for quick selection
export const BUDGET_PRESETS = [
  { label: "3 - 5 triệu", min: 3000000, max: 5000000 },
  { label: "5 - 10 triệu", min: 5000000, max: 10000000 },
  { label: "10 - 20 triệu", min: 10000000, max: 20000000 },
  { label: "20 - 50 triệu", min: 20000000, max: 50000000 },
  { label: "50 - 100 triệu", min: 50000000, max: 100000000 },
  { label: "100 - 200 triệu", min: 100000000, max: 200000000 },
];
