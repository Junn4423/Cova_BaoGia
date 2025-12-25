import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/**
 * Format số tiền theo định dạng VND
 * @param {number} amount - Số tiền cần format
 * @returns {string} Chuỗi đã format
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN").format(amount);
};

/**
 * Parse số tiền từ chuỗi định dạng VND về số
 * @param {string} formattedAmount - Chuỗi số tiền đã format (VD: "1.500.000")
 * @returns {number} Số tiền
 */
const parseCurrency = (formattedAmount) => {
  if (typeof formattedAmount === "number") return formattedAmount;
  if (!formattedAmount) return 0;
  // Loại bỏ tất cả các ký tự không phải số (dấu chấm, dấu phẩy, khoảng trắng, VND...)
  const cleaned = String(formattedAmount).replace(/[^\d]/g, "");
  return parseInt(cleaned, 10) || 0;
};

/**
 * Import báo giá từ file Excel đã export
 * @param {File} file - File Excel cần import
 * @returns {Promise<Object>} Dữ liệu báo giá đã parse
 */
export const importFromExcel = async (file) => {
  const workbook = new ExcelJS.Workbook();
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    
    const worksheet = workbook.getWorksheet("Báo giá");
    
    if (!worksheet) {
      throw new Error("Sai định dạng file");
    }

    // Kiểm tra định dạng file - xác nhận đây là file báo giá đã export
    const companyNameCell = worksheet.getCell("C1");
    const headerRow = worksheet.getRow(9);
    const sttHeader = headerRow.getCell(2).value;
    const hangMucHeader = headerRow.getCell(3).value;
    
    // Validate format: kiểm tra header bảng báo giá
    if (sttHeader !== "STT" || hangMucHeader !== "Hạng mục") {
      throw new Error("Sai định dạng file");
    }

    // Parse thông tin khách hàng
    const customerNameCell = worksheet.getCell("D5");
    const customerName = customerNameCell.value || "";

    // Parse mô tả dự án
    const projectDescriptionCell = worksheet.getCell("C7");
    const projectDescription = projectDescriptionCell.value || "";

    // Parse thông tin công ty
    const companyName = companyNameCell.value || "";
    const websiteCell = worksheet.getCell("D2");
    const phoneCell = worksheet.getCell("D3");
    const emailCell = worksheet.getCell("D4");
    
    const companyInfo = {
      name: companyName,
      website: websiteCell.value || "",
      phone: phoneCell.value || "",
      email: emailCell.value || "",
    };

    // Parse các hạng mục báo giá (bắt đầu từ dòng 10)
    const quotationItems = [];
    let currentRow = 10; // Dòng đầu tiên của data
    
    while (true) {
      const row = worksheet.getRow(currentRow);
      const sttValue = row.getCell(2).value;
      
      // Dừng khi gặp dòng trống hoặc dòng TỔNG CỘNG
      if (!sttValue || sttValue === "" || 
          (typeof sttValue === "string" && sttValue.includes("TỔNG CỘNG"))) {
        break;
      }
      
      // Kiểm tra xem có phải là số STT không (bỏ qua nếu là merge cell từ dòng tổng)
      const sttNum = parseInt(sttValue, 10);
      if (isNaN(sttNum)) {
        break;
      }

      const item = {
        id: Date.now() + currentRow, // Tạo ID unique
        name: row.getCell(3).value || "",
        scope: row.getCell(4).value || "",
        unit: row.getCell(5).value || "",
        quantity: parseFloat(row.getCell(6).value) || 0,
        unitPrice: parseCurrency(row.getCell(7).value),
        acceptanceCriteria: row.getCell(9).value || "",
        excludes: row.getCell(10).value || "",
      };

      quotationItems.push(item);
      currentRow++;
    }

    if (quotationItems.length === 0) {
      throw new Error("Sai định dạng file");
    }

    // Tìm phần điều khoản thanh toán
    // Tìm dòng có "MỐC & PHƯƠNG THỨC THANH TOÁN"
    let paymentStartRow = currentRow + 3; // Thường là sau dòng TỔNG CỘNG + 3
    const paymentTerms = [];
    
    // Tìm dòng header của bảng thanh toán (có "Thời gian", "Mốc thanh toán", etc.)
    for (let i = currentRow; i < currentRow + 10; i++) {
      const row = worksheet.getRow(i);
      const cellB = row.getCell(2).value;
      if (cellB && String(cellB).includes("Thời gian")) {
        paymentStartRow = i + 1;
        break;
      }
    }

    // Parse điều khoản thanh toán
    let paymentRow = paymentStartRow;
    while (true) {
      const row = worksheet.getRow(paymentRow);
      const timeValue = row.getCell(2).value;
      
      // Dừng khi gặp dòng trống hoặc footer
      if (!timeValue || timeValue === "" || 
          (typeof timeValue === "string" && timeValue.includes("*"))) {
        break;
      }

      const percentStr = row.getCell(4).value;
      let percentage = 0;
      if (percentStr) {
        // Parse "30%" -> 30
        const match = String(percentStr).match(/(\d+)/);
        if (match) {
          percentage = parseInt(match[1], 10);
        }
      }

      const term = {
        id: Date.now() + paymentRow,
        time: timeValue || "",
        milestone: row.getCell(3).value || "",
        percentage: percentage,
        description: row.getCell(7).value || "",
      };

      paymentTerms.push(term);
      paymentRow++;
    }

    return {
      success: true,
      data: {
        customerName,
        projectDescription,
        quotationItems,
        paymentTerms: paymentTerms.length > 0 ? paymentTerms : undefined,
        companyInfo,
      },
    };
  } catch (error) {
    console.error("Import error:", error);
    return {
      success: false,
      error: error.message || "Sai định dạng file",
    };
  }
};

/**
 * Tính chiều cao dòng dựa trên nội dung và độ rộng cột
 * @param {string} text - Nội dung văn bản
 * @param {number} columnWidth - Độ rộng cột (characters)
 * @param {number} fontSize - Kích thước font
 * @returns {number} Chiều cao tính toán
 */
const calculateRowHeight = (text, columnWidth, fontSize = 10) => {
  if (!text) return 20;
  const textLength = String(text).length;
  const avgCharPerLine = columnWidth * 0.9; // Ước tính ký tự trên 1 dòng
  const lines = Math.ceil(textLength / avgCharPerLine);
  const lineHeight = fontSize * 1.5; // Line height tương đối
  return Math.max(20, lines * lineHeight + 10); // Padding 10px
};

/**
 * Fetch image từ URL và convert sang base64
 * @param {string} url - URL của ảnh
 * @returns {Promise<string>} Base64 string
 */
const fetchImageAsBase64 = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error fetching image:", error);
    return null;
  }
};

/**
 * Xuất báo giá ra file Excel với định dạng chuyên nghiệp
 * @param {Object} params - Tham số đầu vào
 * @param {string} params.customerName - Tên khách hàng
 * @param {string} params.projectDescription - Mô tả dự án
 * @param {Array} params.quotationItems - Danh sách các hạng mục báo giá
 * @param {Object} params.companyInfo - Thông tin công ty
 * @param {Array} params.paymentTerms - Điều khoản thanh toán
 */
export const exportToExcel = async ({
  customerName,
  projectDescription,
  quotationItems,
  companyInfo,
  paymentTerms,
}) => {
  // Tạo workbook mới
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "COVASOL";
  workbook.created = new Date();

  // Tạo worksheet
  const worksheet = workbook.addWorksheet("Báo giá", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
    },
  });

  // Thiết lập độ rộng cột
  worksheet.columns = [
    { key: "A", width: 3 }, // Lề trái
    { key: "B", width: 12 }, // Logo / STT
    { key: "C", width: 25 }, // Hạng mục
    { key: "D", width: 35 }, // Phạm vi tóm tắt
    { key: "E", width: 12 }, // Đơn vị
    { key: "F", width: 8 }, // Số lượng
    { key: "G", width: 18 }, // Đơn giá
    { key: "H", width: 20 }, // Thành tiền
    { key: "I", width: 30 }, // Tiêu chí nghiệm thu
    { key: "J", width: 25 }, // Không bao gồm
  ];

  // ==================== LOGO SECTION ====================
  
  // Merge cells B1:B3 cho vị trí logo
  worksheet.mergeCells("B1:B3");
  
  // Thêm logo vào cột B (row 1-3)
  try {
    const logoBase64 = await fetchImageAsBase64(companyInfo.logo);
    if (logoBase64) {
      const logoId = workbook.addImage({
        base64: logoBase64,
        extension: "jpeg",
      });
      
      // Đặt logo vào vị trí B1 (merged B1:B3), kích thước phù hợp
      worksheet.addImage(logoId, {
        tl: { col: 1, row: 0 }, // Top-left: B1
        ext: { width: 80, height: 80 }, // Kích thước 80x80 pixels
      });
    }
  } catch (error) {
    console.error("Error adding logo:", error);
  }

  // ==================== HEADER SECTION ====================

  // Dòng 1: Tên công ty (Merge C1:H1)
  worksheet.mergeCells("C1:H1");
  const companyNameCell = worksheet.getCell("C1");
  companyNameCell.value = companyInfo.name;
  companyNameCell.font = {
    name: "Arial",
    size: 16,
    bold: true,
    color: { argb: "FF124E66" }, // Primary dark
  };
  companyNameCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 30;

  // Dòng 2: Website
  worksheet.getCell("C2").value = "Website:";
  worksheet.getCell("C2").font = { bold: true, name: "Arial", size: 11 };
  worksheet.getCell("D2").value = companyInfo.website;
  worksheet.getCell("D2").font = {
    name: "Arial",
    size: 11,
    color: { argb: "FF1C6E8C" },
    underline: true,
  };

  // Dòng 3: SĐT
  worksheet.getCell("C3").value = "SĐT:";
  worksheet.getCell("C3").font = { bold: true, name: "Arial", size: 11 };
  worksheet.getCell("D3").value = companyInfo.phone;
  worksheet.getCell("D3").font = { name: "Arial", size: 11 };

  // Dòng 4: Email
  worksheet.getCell("C4").value = "Email:";
  worksheet.getCell("C4").font = { bold: true, name: "Arial", size: 11 };
  worksheet.getCell("D4").value = companyInfo.email;
  worksheet.getCell("D4").font = {
    name: "Arial",
    size: 11,
    color: { argb: "FF1C6E8C" },
  };

  // Dòng 5: Khách hàng
  worksheet.getCell("C5").value = "Khách hàng:";
  worksheet.getCell("C5").font = { bold: true, name: "Arial", size: 11 };
  worksheet.mergeCells("D5:H5");
  worksheet.getCell("D5").value = customerName || "Chưa có thông tin";
  worksheet.getCell("D5").font = {
    name: "Arial",
    size: 11,
    bold: true,
    color: { argb: "FF124E66" },
  };

  // Dòng 6-7: Mô tả chung
  worksheet.getCell("C6").value = "Mô tả chung:";
  worksheet.getCell("C6").font = { bold: true, name: "Arial", size: 11 };
  worksheet.mergeCells("C7:J7");
  const descCell = worksheet.getCell("C7");
  descCell.value = projectDescription || "Không có mô tả";
  descCell.font = { name: "Arial", size: 10, italic: true };
  descCell.alignment = { wrapText: true, vertical: "top" };
  worksheet.getRow(7).height = 40;

  // ==================== TABLE HEADER (Dòng 9) ====================

  const tableStartRow = 9;
  const headerRow = worksheet.getRow(tableStartRow);

  const headers = [
    "", // A - Lề
    "STT",
    "Hạng mục",
    "Phạm vi tóm tắt",
    "Đơn vị",
    "SL",
    "Đơn giá (VND)",
    "Thành tiền (VND)",
    "Tiêu chí nghiệm thu",
    "Không bao gồm",
  ];

  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    if (index > 0) {
      // Bỏ qua cột A (lề)
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF124E66" }, // Primary dark
      };
      cell.font = {
        name: "Arial",
        size: 10,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
    }
  });
  headerRow.height = 25;

  // ==================== TABLE DATA ====================

  let currentRow = tableStartRow + 1;
  let totalAmount = 0;

  quotationItems.forEach((item, index) => {
    const row = worksheet.getRow(currentRow);
    const itemTotal = item.quantity * item.unitPrice;
    totalAmount += itemTotal;

    const rowData = [
      "", // A - Lề
      index + 1, // STT
      item.name, // Hạng mục
      item.scope, // Phạm vi
      item.unit, // Đơn vị
      item.quantity, // Số lượng
      formatCurrency(item.unitPrice), // Đơn giá
      formatCurrency(itemTotal), // Thành tiền
      item.acceptanceCriteria, // Tiêu chí nghiệm thu
      item.excludes, // Không bao gồm
    ];

    // Tính chiều cao tối ưu cho dòng này
    let maxRowHeight = 30;
    
    rowData.forEach((value, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      cell.value = value;

      if (colIndex > 0) {
        // Bỏ qua cột A
        cell.font = { name: "Arial", size: 10 };
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };

        // Alignment tùy theo cột
        if (colIndex === 1) {
          // STT
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (colIndex === 4) {
          // Đơn vị - căn giữa
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          maxRowHeight = Math.max(maxRowHeight, calculateRowHeight(value, 12));
        } else if (colIndex === 5) {
          // SL - căn giữa
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (colIndex === 6 || colIndex === 7) {
          // Đơn giá, Thành tiền - căn giữa
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          maxRowHeight = Math.max(maxRowHeight, calculateRowHeight(value, colIndex === 6 ? 18 : 20));
        } else if (colIndex === 2) {
          // Hạng mục
          cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
          maxRowHeight = Math.max(maxRowHeight, calculateRowHeight(value, 25));
        } else if (colIndex === 3) {
          // Phạm vi tóm tắt
          cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
          maxRowHeight = Math.max(maxRowHeight, calculateRowHeight(value, 35));
        } else if (colIndex === 8) {
          // Tiêu chí nghiệm thu
          cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
          maxRowHeight = Math.max(maxRowHeight, calculateRowHeight(value, 30));
        } else if (colIndex === 9) {
          // Không bao gồm
          cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
          maxRowHeight = Math.max(maxRowHeight, calculateRowHeight(value, 25));
        } else {
          // Các cột còn lại
          cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
        }

        // Background xen kẽ cho dễ đọc
        if (index % 2 === 1) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE6EBEE" }, // Primary light
          };
        }
      }
    });

    // Set chiều cao dòng dựa trên nội dung
    row.height = maxRowHeight;
    currentRow++;
  });

  // ==================== TỔNG TIỀN ====================

  currentRow++; // Dòng trống
  const totalRow = worksheet.getRow(currentRow);

  worksheet.mergeCells(`B${currentRow}:F${currentRow}`);
  const totalLabelCell = totalRow.getCell(2);
  totalLabelCell.value = "TỔNG CỘNG";
  totalLabelCell.font = {
    name: "Arial",
    size: 12,
    bold: true,
  };
  totalLabelCell.alignment = { horizontal: "right", vertical: "middle" };

  worksheet.mergeCells(`G${currentRow}:H${currentRow}`);
  const totalValueCell = totalRow.getCell(7);
  totalValueCell.value = `${formatCurrency(totalAmount)} VND`;
  totalValueCell.font = {
    name: "Arial",
    size: 14,
    bold: true,
    color: { argb: "FFDC2626" }, // Màu đỏ
  };
  totalValueCell.alignment = { horizontal: "right", vertical: "middle" };
  totalValueCell.border = {
    top: { style: "double", color: { argb: "FF000000" } },
    bottom: { style: "double", color: { argb: "FF000000" } },
  };

  totalRow.height = 30;

  // ==================== ĐIỀU KHOẢN THANH TOÁN ====================

  currentRow += 3; // Cách 2 dòng

  // Tiêu đề phần thanh toán
  worksheet.mergeCells(`B${currentRow}:J${currentRow}`);
  const paymentTitleCell = worksheet.getCell(`B${currentRow}`);
  paymentTitleCell.value = "MỐC & PHƯƠNG THỨC THANH TOÁN";
  paymentTitleCell.font = {
    name: "Arial",
    size: 12,
    bold: true,
    color: { argb: "FF124E66" },
  };
  paymentTitleCell.alignment = { horizontal: "left", vertical: "middle" };
  worksheet.getRow(currentRow).height = 25;

  currentRow += 2;

  // Header bảng thanh toán
  const paymentHeaderRow = worksheet.getRow(currentRow);
  const paymentHeaders = ["", "Thời gian", "Mốc thanh toán", "Tỷ lệ (%)", "Số tiền (VND)", "Ghi chú"];

  // Cột B: Thời gian, C: Mốc, D: Tỷ lệ, E-F: Số tiền, G-J: Ghi chú
  const colMapping = [0, 2, 3, 4, 5, 7];
  
  paymentHeaders.forEach((header, index) => {
    if (index === 0) return;
    const cell = paymentHeaderRow.getCell(colMapping[index]);
    cell.value = header;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1C6E8C" }, // Primary blue
    };
    cell.font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Merge cells cho header
  worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
  worksheet.mergeCells(`G${currentRow}:J${currentRow}`);
  paymentHeaderRow.height = 22;

  currentRow++;

  // Dữ liệu bảng thanh toán
  paymentTerms.forEach((term) => {
    const row = worksheet.getRow(currentRow);
    const termAmount = (totalAmount * term.percentage) / 100;

    // Thời gian
    const timeCell = row.getCell(2);
    timeCell.value = term.time;
    timeCell.font = { name: "Arial", size: 10, bold: true };
    timeCell.alignment = { horizontal: "center", vertical: "middle" };
    timeCell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // Mốc thanh toán
    const milestoneCell = row.getCell(3);
    milestoneCell.value = term.milestone;
    milestoneCell.font = { name: "Arial", size: 10 };
    milestoneCell.alignment = { horizontal: "left", vertical: "middle" };
    milestoneCell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // Tỷ lệ %
    const percentCell = row.getCell(4);
    percentCell.value = `${term.percentage}%`;
    percentCell.font = { name: "Arial", size: 10, bold: true };
    percentCell.alignment = { horizontal: "center", vertical: "middle" };
    percentCell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // Số tiền (merge E:F)
    worksheet.mergeCells(`E${currentRow}:F${currentRow}`);
    const amountCell = row.getCell(5);
    amountCell.value = formatCurrency(termAmount);
    amountCell.font = { name: "Arial", size: 10, bold: true };
    amountCell.alignment = { horizontal: "right", vertical: "middle" };
    amountCell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    // Ghi chú (merge G:J)
    worksheet.mergeCells(`G${currentRow}:J${currentRow}`);
    const noteCell = row.getCell(7);
    noteCell.value = term.description;
    noteCell.font = { name: "Arial", size: 10, italic: true };
    noteCell.alignment = { horizontal: "left", vertical: "middle" };
    noteCell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    row.height = 22;
    currentRow++;
  });

  // ==================== FOOTER NOTE ====================

  currentRow += 2;
  worksheet.mergeCells(`B${currentRow}:J${currentRow}`);
  const footerCell = worksheet.getCell(`B${currentRow}`);
  footerCell.value =
    "* Báo giá có hiệu lực trong vòng 30 ngày kể từ ngày gửi. Giá trên chưa bao gồm VAT (nếu có).";
  footerCell.font = {
    name: "Arial",
    size: 9,
    italic: true,
    color: { argb: "FF666666" },
  };

  currentRow += 2;
  worksheet.mergeCells(`B${currentRow}:J${currentRow}`);
  const signatureCell = worksheet.getCell(`B${currentRow}`);
  signatureCell.value = `Ngày xuất báo giá: ${new Date().toLocaleDateString("vi-VN")}`;
  signatureCell.font = {
    name: "Arial",
    size: 10,
    color: { argb: "FF333333" },
  };
  signatureCell.alignment = { horizontal: "right" };

  // ==================== XUẤT FILE ====================

  // Tạo tên file
  const sanitizedCustomerName = customerName
    ? customerName.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s]/g, "").trim()
    : "KhachHang";
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fileName = `BaoGia_${sanitizedCustomerName}_${dateStr}.xlsx`;

  // Xuất file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, fileName);

  return { success: true, fileName };
};

export default exportToExcel;
