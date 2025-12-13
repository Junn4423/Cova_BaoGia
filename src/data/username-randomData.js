/**
 * Bộ data tên random theo cấu trúc: Tính từ + Tính từ 2 (nếu cần) + Động vật
 * Ví dụ: "Sư Tử Dũng Mãnh", "Cáo Tinh Ranh", "Đại Bàng Oai Phong"
 */

// Danh sách động vật (tiếng Việt)
export const ANIMALS = [
  "Sư Tử",
  "Hổ",
  "Báo",
  "Rồng",
  "Đại Bàng",
  "Cáo",
  "Sói",
  "Gấu",
  "Voi",
  "Ngựa",
  "Phượng Hoàng",
  "Rùa",
  "Thỏ",
  "Hươu",
  "Cú Mèo",
  "Chim Ưng",
  "Cá Voi",
  "Cá Heo",
  "Bướm",
  "Ong",
  "Mèo",
  "Chó",
  "Khỉ",
  "Vượn",
  "Gà Trống",
  "Công",
  "Thiên Nga",
  "Én",
  "Sếu",
  "Hạc",
];

// Tính từ chính (tính cách, phẩm chất)
export const ADJECTIVES_PRIMARY = [
  "Dũng Mãnh",
  "Tinh Ranh",
  "Thông Thái",
  "Nhanh Nhẹn",
  "Kiên Cường",
  "Hùng Vĩ",
  "Oai Phong",
  "Bền Bỉ",
  "Lanh Lợi",
  "Uyên Bác",
  "Hiền Hòa",
  "Dịu Dàng",
  "Mạnh Mẽ",
  "Can Đảm",
  "Tài Ba",
  "Sáng Tạo",
  "Linh Hoạt",
  "Khéo Léo",
  "Nhiệt Huyết",
  "Bình Tĩnh",
  "Vui Vẻ",
  "Năng Động",
  "Cần Cù",
  "Chăm Chỉ",
  "Thân Thiện",
];

// Tính từ bổ sung (màu sắc, đặc điểm phụ) - có thể dùng hoặc không
export const ADJECTIVES_SECONDARY = [
  "Xanh",
  "Đỏ",
  "Vàng",
  "Tím",
  "Bạc",
  "Vàng Óng",
  "Trắng",
  "Đen",
  "Hồng",
  "Cam",
  "Lam",
  "Lục",
  "Nhỏ Nhắn",
  "To Lớn",
  "Bé Xinh",
  "Huyền Bí",
  "Lấp Lánh",
  "Rực Rỡ",
  "Lung Linh",
  "Sáng Ngời",
];

/**
 * Tạo tên random theo cấu trúc
 * @param {boolean} includeSecondaryAdjective - Có thêm tính từ phụ không (30% chance mặc định)
 * @returns {string} Tên random
 */
export const generateRandomName = (includeSecondaryAdjective = null) => {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const primaryAdj = ADJECTIVES_PRIMARY[Math.floor(Math.random() * ADJECTIVES_PRIMARY.length)];
  
  // 30% chance để có tính từ phụ nếu không được chỉ định
  const shouldIncludeSecondary = includeSecondaryAdjective !== null 
    ? includeSecondaryAdjective 
    : Math.random() < 0.3;
  
  if (shouldIncludeSecondary) {
    const secondaryAdj = ADJECTIVES_SECONDARY[Math.floor(Math.random() * ADJECTIVES_SECONDARY.length)];
    return `${animal} ${secondaryAdj} ${primaryAdj}`;
  }
  
  return `${animal} ${primaryAdj}`;
};

/**
 * Tạo tên ngắn gọn (chỉ động vật + 1 tính từ)
 * @returns {string} Tên ngắn
 */
export const generateShortName = () => {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const adj = ADJECTIVES_PRIMARY[Math.floor(Math.random() * ADJECTIVES_PRIMARY.length)];
  return `${animal} ${adj}`;
};

/**
 * Lấy chữ viết tắt từ tên (để hiển thị trên avatar)
 * @param {string} name - Tên đầy đủ
 * @returns {string} Chữ viết tắt (2-3 ký tự)
 */
export const getNameInitials = (name) => {
  if (!name) return "?";
  
  const words = name.trim().split(" ");
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  
  // Lấy chữ cái đầu của từ đầu tiên và từ cuối cùng
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

/**
 * Kiểm tra tên có hợp lệ không
 * @param {string} name - Tên cần kiểm tra
 * @returns {boolean} Hợp lệ hay không
 */
export const isValidCustomName = (name) => {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 30;
};

export default {
  ANIMALS,
  ADJECTIVES_PRIMARY,
  ADJECTIVES_SECONDARY,
  generateRandomName,
  generateShortName,
  getNameInitials,
  isValidCustomName,
};
