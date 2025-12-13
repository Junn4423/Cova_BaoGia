import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  Building2,
  Phone,
  Mail,
  Globe,
  User,
  FileText,
  Package,
  ChevronDown,
  ChevronRight,
  Loader2,
  Check,
  AlertCircle,
  Edit3,
  CreditCard,
  PlusCircle,
  Share2,
  Users,
} from "lucide-react";
import {
  COMPANY_INFO,
  SERVICE_PACKAGES,
  DEFAULT_PAYMENT_TERMS,
  EMPTY_QUOTATION_ROW,
  EMPTY_PAYMENT_TERM,
  getCategories,
  getPackagesByCategory,
} from "../data/sampleData";
import { exportToExcel } from "../utils/exportToExcel";
import { useCollaboration } from "../contexts/CollaborationContext";
import ShareDialog from "./ShareDialog";
import CollaboratorsAvatars from "./CollaboratorsAvatars";
import LastUserWarningDialog from "./LastUserWarningDialog";

/**
 * Component chính: Form tạo báo giá
 */
const QuotationForm = () => {
  // State quản lý thông tin công ty (có thể chỉnh sửa SĐT)
  const [companyInfo, setCompanyInfo] = useState({ ...COMPANY_INFO });

  // State quản lý thông tin khách hàng
  const [customerName, setCustomerName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  // State quản lý danh sách hạng mục báo giá
  const [quotationItems, setQuotationItems] = useState([]);

  // State quản lý điều khoản thanh toán
  const [paymentTerms, setPaymentTerms] = useState(
    DEFAULT_PAYMENT_TERMS.map((term, index) => ({ ...term, id: index + 1 }))
  );

  // State quản lý UI
  const [showPackageSelector, setShowPackageSelector] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Collaboration context
  const {
    roomId,
    collaborators,
    currentUser,
    isLastUser,
    showLastUserWarning,
    pendingLeaveAction,
    sharedCustomerName,
    sharedProjectDescription,
    sharedQuotationItems,
    sharedPaymentTerms,
    sharedCompanyInfo,
    updateCustomerName,
    updateProjectDescription,
    updateQuotationItems,
    updatePaymentTerms,
    updateCompanyInfo,
    handleLastUserLeave,
    confirmLeave,
    cancelLeave,
  } = useCollaboration();

  // Đồng bộ dữ liệu từ collaboration context
  useEffect(() => {
    if (sharedCustomerName !== undefined && sharedCustomerName !== customerName) {
      setCustomerName(sharedCustomerName);
    }
  }, [sharedCustomerName]);

  useEffect(() => {
    if (sharedProjectDescription !== undefined && sharedProjectDescription !== projectDescription) {
      setProjectDescription(sharedProjectDescription);
    }
  }, [sharedProjectDescription]);

  useEffect(() => {
    if (sharedQuotationItems && sharedQuotationItems.length > 0) {
      setQuotationItems(sharedQuotationItems);
    }
  }, [sharedQuotationItems]);

  useEffect(() => {
    if (sharedPaymentTerms && sharedPaymentTerms.length > 0) {
      setPaymentTerms(sharedPaymentTerms);
    }
  }, [sharedPaymentTerms]);

  useEffect(() => {
    if (sharedCompanyInfo && Object.keys(sharedCompanyInfo).length > 0) {
      setCompanyInfo((prev) => ({ ...prev, ...sharedCompanyInfo }));
    }
  }, [sharedCompanyInfo]);

  // Cảnh báo khi đóng tab - beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (quotationItems.length > 0 || customerName || projectDescription) {
        e.preventDefault();
        e.returnValue = "Bạn có chắc chắn muốn rời đi? Dữ liệu báo giá chưa được lưu sẽ bị mất!";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [quotationItems, customerName, projectDescription]);

  // Kiểm tra người cuối cùng khi chuẩn bị rời đi
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isLastUser) {
        // Có thể thêm logic cảnh báo ở đây
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isLastUser]);

  // Lấy danh sách categories
  const categories = useMemo(() => getCategories(), []);

  // Tính tổng tiền
  const totalAmount = useMemo(() => {
    return quotationItems.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice;
    }, 0);
  }, [quotationItems]);

  // Tính tổng % thanh toán
  const totalPaymentPercentage = useMemo(() => {
    return paymentTerms.reduce((sum, term) => sum + (term.percentage || 0), 0);
  }, [paymentTerms]);

  // Format số tiền VND
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat("vi-VN").format(amount);
  }, []);

  // Toggle expand category
  const toggleCategory = useCallback((category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  // Thêm dòng từ gói mẫu
  const addFromTemplate = useCallback((template) => {
    const newItem = {
      id: Date.now(),
      name: template.name,
      scope: template.scope,
      unit: template.unit,
      quantity: 1,
      unitPrice: template.unitPrice,
      acceptanceCriteria: template.acceptanceCriteria,
      excludes: template.excludes,
    };
    const newItems = [...quotationItems, newItem];
    setQuotationItems(newItems);
    updateQuotationItems(newItems);
  }, [quotationItems, updateQuotationItems]);

  // Thêm dòng mới (trống)
  const addEmptyRow = useCallback(() => {
    const newItem = {
      id: Date.now(),
      ...EMPTY_QUOTATION_ROW,
    };
    const newItems = [...quotationItems, newItem];
    setQuotationItems(newItems);
    updateQuotationItems(newItems);
    setShowPackageSelector(false);
  }, [quotationItems, updateQuotationItems]);

  // Xóa dòng báo giá
  const removeRow = useCallback((id) => {
    const newItems = quotationItems.filter((item) => item.id !== id);
    setQuotationItems(newItems);
    updateQuotationItems(newItems);
  }, [quotationItems, updateQuotationItems]);

  // Cập nhật giá trị của một field trong báo giá
  const updateItem = useCallback((id, field, value) => {
    const newItems = quotationItems.map((item) => {
      if (item.id === id) {
        if (field === "quantity" || field === "unitPrice") {
          const numValue = parseFloat(value) || 0;
          return { ...item, [field]: numValue };
        }
        return { ...item, [field]: value };
      }
      return item;
    });
    setQuotationItems(newItems);
    updateQuotationItems(newItems);
  }, [quotationItems, updateQuotationItems]);

  // Tự động điều chỉnh chiều cao textarea
  const handleTextareaResize = useCallback((e) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  }, []);

  // Auto-resize tất cả textareas khi quotationItems thay đổi
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    });
  }, [quotationItems]);

  // Thêm mốc thanh toán mới
  const addPaymentTerm = useCallback(() => {
    const newTerm = {
      id: Date.now(),
      ...EMPTY_PAYMENT_TERM,
    };
    const newTerms = [...paymentTerms, newTerm];
    setPaymentTerms(newTerms);
    updatePaymentTerms(newTerms);
  }, [paymentTerms, updatePaymentTerms]);

  // Xóa mốc thanh toán
  const removePaymentTerm = useCallback((id) => {
    const newTerms = paymentTerms.filter((term) => term.id !== id);
    setPaymentTerms(newTerms);
    updatePaymentTerms(newTerms);
  }, [paymentTerms, updatePaymentTerms]);

  // Cập nhật mốc thanh toán
  const updatePaymentTermLocal = useCallback((id, field, value) => {
    const newTerms = paymentTerms.map((term) => {
      if (term.id === id) {
        if (field === "percentage") {
          const numValue = parseFloat(value) || 0;
          return { ...term, [field]: numValue };
        }
        return { ...term, [field]: value };
      }
      return term;
    });
    setPaymentTerms(newTerms);
    updatePaymentTerms(newTerms);
  }, [paymentTerms, updatePaymentTerms]);

  // Cập nhật thông tin khách hàng với sync
  const handleCustomerNameChange = useCallback((value) => {
    setCustomerName(value);
    updateCustomerName(value);
  }, [updateCustomerName]);

  // Cập nhật mô tả dự án với sync
  const handleProjectDescriptionChange = useCallback((value) => {
    setProjectDescription(value);
    updateProjectDescription(value);
  }, [updateProjectDescription]);

  // Cập nhật thông tin công ty với sync
  const handleCompanyInfoChange = useCallback((field, value) => {
    const newInfo = { ...companyInfo, [field]: value };
    setCompanyInfo(newInfo);
    updateCompanyInfo(newInfo);
  }, [companyInfo, updateCompanyInfo]);

  // Xuất file Excel
  const handleExport = async () => {
    if (quotationItems.length === 0) {
      setExportStatus("error");
      setTimeout(() => setExportStatus(null), 3000);
      return;
    }

    setIsExporting(true);
    setExportStatus(null);

    try {
      await exportToExcel({
        customerName,
        projectDescription,
        quotationItems,
        companyInfo,
        paymentTerms,
      });
      setExportStatus("success");
    } catch (error) {
      console.error("Export error:", error);
      setExportStatus("error");
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-primary-light">
      {/* Share Dialog */}
      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
      />

      {/* Last User Warning Dialog */}
      <LastUserWarningDialog
        isOpen={showLastUserWarning}
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
        pendingAction={pendingLeaveAction}
      />

      {/* Header */}
      <header className="bg-primary-dark border-b border-primary-navy sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 flex-wrap h-auto py-3 sm:h-16">
            <div className="flex items-center gap-3">
              <img
                src={COMPANY_INFO.logo}
                alt="COVASOL Logo"
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div>
                <h1 className="text-lg font-bold text-white">
                  Hệ thống Báo giá
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-primary-light opacity-80">COVASOL Studio</p>
                  {roomId && (
                    <span className="text-xs bg-primary-blue/30 text-white px-2 py-0.5 rounded-full">
                      #{roomId}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Collaborators + Share + Export */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Collaborators Avatars */}
              <CollaboratorsAvatars />

              {/* Share Button */}
              <button
                onClick={() => setShowShareDialog(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium
                         bg-primary-blue text-white hover:bg-primary-navy
                         transition-all duration-200 active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Chia sẻ</span>
              </button>

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={isExporting || quotationItems.length === 0}
                className={`
                  inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium
                  transition-all duration-200 
                  ${
                    quotationItems.length === 0
                      ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                      : isExporting
                      ? "bg-primary-blue text-white cursor-wait"
                      : exportStatus === "success"
                      ? "bg-primary-green text-white"
                      : exportStatus === "error"
                      ? "bg-red-600 text-white"
                      : "bg-accent-green text-primary-navy hover:bg-opacity-90 active:scale-95"
                  }
                `}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xuất...</span>
                  </>
                ) : exportStatus === "success" ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Đã xuất file!</span>
                  </>
                ) : exportStatus === "error" ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>Thêm hạng mục!</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Xuất File Excel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section: Thông tin cấu hình */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary-dark mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-blue" />
            Thông tin cấu hình
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Thông tin công ty */}
            <div className="bg-primary-light rounded-lg p-4">
              <h3 className="text-sm font-medium text-primary-dark mb-3">
                Thông tin công ty
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-primary-blue" />
                  <span className="font-medium text-primary-dark">
                    {companyInfo.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-primary-blue" />
                  <span className="text-primary-dark">{companyInfo.website}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-primary-blue" />
                  <input
                    type="text"
                    value={companyInfo.phone}
                    onChange={(e) => handleCompanyInfoChange("phone", e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded
                             focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
                    placeholder="Số điện thoại"
                  />
                  <Edit3 className="w-3 h-3 text-gray-400" />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-primary-blue" />
                  <span className="text-primary-dark">{companyInfo.email}</span>
                </div>
              </div>
            </div>

            {/* Thông tin khách hàng */}
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-primary-dark mb-1.5">
                  <User className="w-4 h-4 text-primary-blue" />
                  Tên khách hàng
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  placeholder="Nhập tên khách hàng hoặc công ty..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-primary-blue focus:border-primary-blue
                           transition-all duration-200 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Mô tả dự án */}
          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-primary-dark mb-1.5">
              <FileText className="w-4 h-4 text-primary-blue" />
              Mô tả chung cho dự án
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => handleProjectDescriptionChange(e.target.value)}
              placeholder="Nhập mô tả tổng quan về dự án, yêu cầu đặc biệt..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-primary-blue focus:border-primary-blue
                       transition-all duration-200 text-sm resize-none"
            />
          </div>
        </section>

        {/* Section: Bảng báo giá */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-primary-dark flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-blue" />
              Bảng báo giá
              {quotationItems.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary-blue text-white text-xs rounded-full">
                  {quotationItems.length} hạng mục
                </span>
              )}
            </h2>

            <div className="flex items-center gap-2">
              {/* Button thêm dòng tùy ý */}
              <button
                onClick={addEmptyRow}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-green text-white
                         rounded-lg font-medium text-sm hover:bg-opacity-90 
                         transition-all duration-200 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Thêm tùy ý</span>
              </button>

              {/* Dropdown thêm từ mẫu */}
              <div className="relative">
                <button
                  onClick={() => setShowPackageSelector(!showPackageSelector)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-dark text-white
                           rounded-lg font-medium text-sm hover:bg-primary-navy 
                           transition-all duration-200 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm từ mẫu</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      showPackageSelector ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown menu - Grouped by Category */}
                {showPackageSelector && (
                  <div
                    className="absolute right-0 mt-2 w-[calc(100vw-32px)] sm:w-[480px] lg:w-[500px] bg-white rounded-xl shadow-xl 
                                border border-gray-200 z-50 overflow-hidden"
                  >
                    <div className="p-3 border-b border-gray-100 bg-primary-light">
                      <p className="text-xs font-medium text-primary-dark uppercase tracking-wide">
                        Chọn từ gói dịch vụ mẫu ({SERVICE_PACKAGES.length} hạng mục)
                      </p>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                      {categories.map((category) => (
                        <div key={category} className="border-b border-gray-100 last:border-0">
                          {/* Category Header */}
                          <button
                            onClick={() => toggleCategory(category)}
                            className="w-full px-4 py-3 flex items-center justify-between
                                     bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <span className="font-medium text-primary-dark text-sm">
                              {category}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {getPackagesByCategory(category).length} mục
                              </span>
                              {expandedCategories[category] ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </button>

                          {/* Category Items */}
                          {expandedCategories[category] && (
                            <div className="bg-white">
                              {getPackagesByCategory(category).map((pkg) => (
                                <button
                                  key={pkg.id}
                                  onClick={() => addFromTemplate(pkg)}
                                  className="w-full px-6 py-3 text-left hover:bg-primary-light 
                                           border-b border-gray-50 last:border-0
                                           transition-colors duration-150"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900 text-sm">
                                      {pkg.name}
                                    </span>
                                    <span className="text-xs font-semibold text-primary-green">
                                      {formatCurrency(pkg.unitPrice)}đ/{pkg.unit}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                    {pkg.scope}
                                  </p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table (desktop & large screens) */}
          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full">
              <thead>
                <tr className="bg-primary-dark text-white">
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-12">
                    STT
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider min-w-[150px]">
                    Hạng mục
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider min-w-[200px]">
                    Phạm vi tóm tắt
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-24">
                    Đơn vị
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-20">
                    SL
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider w-32">
                    Đơn giá
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider w-36">
                    Thành tiền
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider min-w-[180px]">
                    Tiêu chí nghiệm thu
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider min-w-[150px]">
                    Không bao gồm
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-16">
                    Xóa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quotationItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-primary-blue" />
                        </div>
                        <p className="text-gray-500 text-sm">
                          Chưa có hạng mục nào
                        </p>
                        <p className="text-gray-400 text-xs">
                          Bấm &quot;Thêm từ mẫu&quot; hoặc &quot;Thêm tùy ý&quot; để bắt đầu
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  quotationItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-primary-light transition-colors duration-150"
                    >
                      <td className="px-3 py-3 text-center text-sm font-medium text-primary-dark">
                        {index + 1}
                      </td>
                      <td className="px-3 py-3">
                        <textarea
                          value={item.name}
                          onChange={(e) => {
                            updateItem(item.id, "name", e.target.value);
                            handleTextareaResize(e);
                          }}
                          onInput={handleTextareaResize}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded
                                   focus:ring-1 focus:ring-primary-blue focus:border-primary-blue
                                   resize-none overflow-hidden"
                          placeholder="Tên hạng mục (Ctrl+Enter để xuống dòng)"
                          rows={1}
                          style={{ minHeight: '38px' }}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <textarea
                          value={item.scope}
                          onChange={(e) => {
                            updateItem(item.id, "scope", e.target.value);
                            handleTextareaResize(e);
                          }}
                          onInput={handleTextareaResize}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded
                                   focus:ring-1 focus:ring-primary-blue focus:border-primary-blue
                                   resize-none overflow-hidden"
                          placeholder="Mô tả phạm vi (Ctrl+Enter để xuống dòng)"
                          rows={1}
                          style={{ minHeight: '38px' }}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) =>
                            updateItem(item.id, "unit", e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded
                                   text-center focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
                          placeholder="Đơn vị"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, "quantity", e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded
                                   text-center focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="100000"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(item.id, "unitPrice", e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded
                                   text-right focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm font-semibold text-primary-dark">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">đ</span>
                      </td>
                      <td className="px-3 py-3">
                        <textarea
                          value={item.acceptanceCriteria}
                          onChange={(e) => {
                            updateItem(
                              item.id,
                              "acceptanceCriteria",
                              e.target.value
                            );
                            handleTextareaResize(e);
                          }}
                          onInput={handleTextareaResize}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded
                                   focus:ring-1 focus:ring-primary-blue focus:border-primary-blue
                                   resize-none overflow-hidden"
                          placeholder="Tiêu chí nghiệm thu (Ctrl+Enter để xuống dòng)"
                          rows={1}
                          style={{ minHeight: '38px' }}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <textarea
                          value={item.excludes}
                          onChange={(e) => {
                            updateItem(item.id, "excludes", e.target.value);
                            handleTextareaResize(e);
                          }}
                          onInput={handleTextareaResize}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded
                                   focus:ring-1 focus:ring-primary-blue focus:border-primary-blue
                                   resize-none overflow-hidden"
                          placeholder="Không bao gồm (Ctrl+Enter để xuống dòng)"
                          rows={1}
                          style={{ minHeight: '38px' }}
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => removeRow(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50
                                   rounded transition-all duration-150"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Stacked cards (mobile & tablet) */}
          <div className="block lg:hidden px-3 pb-4">
            {quotationItems.length === 0 ? (
              <div className="py-10 text-center">
                <div className="inline-flex flex-col items-center gap-3">
                  <div className="w-14 h-14 bg-primary-light rounded-full flex items-center justify-center">
                    <Package className="w-7 h-7 text-primary-blue" />
                  </div>
                  <p className="text-gray-600 text-sm">Chưa có hạng mục nào</p>
                  <p className="text-gray-400 text-xs">
                    Bấm "Thêm từ mẫu" hoặc "Thêm tùy ý" để bắt đầu
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {quotationItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-primary-light text-primary-dark text-xs font-semibold rounded-full">
                          #{index + 1}
                        </span>
                        <span className="text-xs text-gray-500">Hạng mục</span>
                      </div>
                      <button
                        onClick={() => removeRow(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-150"
                        title="Xóa dòng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium text-primary-dark">Hạng mục</label>
                        <textarea
                          value={item.name}
                          onChange={(e) => {
                            updateItem(item.id, "name", e.target.value);
                            handleTextareaResize(e);
                          }}
                          onInput={handleTextareaResize}
                          className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-blue focus:border-primary-blue resize-none overflow-hidden"
                          placeholder="Tên hạng mục"
                          rows={1}
                          style={{ minHeight: "38px" }}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-primary-dark">Phạm vi tóm tắt</label>
                        <textarea
                          value={item.scope}
                          onChange={(e) => {
                            updateItem(item.id, "scope", e.target.value);
                            handleTextareaResize(e);
                          }}
                          onInput={handleTextareaResize}
                          className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-blue focus:border-primary-blue resize-none overflow-hidden"
                          placeholder="Mô tả phạm vi"
                          rows={1}
                          style={{ minHeight: "38px" }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-primary-dark">Đơn vị</label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                            className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
                            placeholder="Đơn vị"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-primary-dark">Số lượng</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                            className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg text-center focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-primary-dark">Đơn giá (VND)</label>
                          <input
                            type="number"
                            min="0"
                            step="100000"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                            className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg text-right focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
                          />
                        </div>
                        <div className="flex items-center justify-between sm:items-end sm:justify-end sm:flex-col">
                          <span className="text-xs text-gray-500">Thành tiền</span>
                          <span className="text-lg font-bold text-red-600">
                            {formatCurrency(item.quantity * item.unitPrice)}
                            <span className="text-xs font-medium ml-1">đ</span>
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-primary-dark">Tiêu chí nghiệm thu</label>
                        <textarea
                          value={item.acceptanceCriteria}
                          onChange={(e) => {
                            updateItem(item.id, "acceptanceCriteria", e.target.value);
                            handleTextareaResize(e);
                          }}
                          onInput={handleTextareaResize}
                          className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-blue focus:border-primary-blue resize-none overflow-hidden"
                          placeholder="Tiêu chí nghiệm thu"
                          rows={1}
                          style={{ minHeight: "38px" }}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-primary-dark">Không bao gồm</label>
                        <textarea
                          value={item.excludes}
                          onChange={(e) => {
                            updateItem(item.id, "excludes", e.target.value);
                            handleTextareaResize(e);
                          }}
                          onInput={handleTextareaResize}
                          className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-blue focus:border-primary-blue resize-none overflow-hidden"
                          placeholder="Không bao gồm"
                          rows={1}
                          style={{ minHeight: "38px" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total */}
          {quotationItems.length > 0 && (
            <div className="p-4 bg-primary-light border-t border-gray-200">
              <div className="flex items-center justify-end gap-6">
                <span className="text-sm font-medium text-primary-dark">
                  TỔNG CỘNG:
                </span>
                <span className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalAmount)}
                  <span className="text-base font-medium ml-1">VND</span>
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Section: Điều khoản thanh toán (Có thể chỉnh sửa) */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary-dark flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-blue" />
              Mốc & Phương thức thanh toán
              {totalPaymentPercentage !== 100 && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                  Tổng: {totalPaymentPercentage}% (cần = 100%)
                </span>
              )}
              {totalPaymentPercentage === 100 && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">
                  ✓ 100%
                </span>
              )}
            </h2>
            <button
              onClick={addPaymentTerm}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-blue text-white
                       rounded-lg font-medium text-sm hover:bg-opacity-90 
                       transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Thêm mốc
            </button>
          </div>

          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full">
              <thead>
                <tr className="bg-primary-blue text-white">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase w-32">
                    Thời gian
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase">
                    Mốc thanh toán
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase w-24">
                    Tỷ lệ (%)
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase w-40">
                    Số tiền (VND)
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase">
                    Ghi chú
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase w-16">
                    Xóa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentTerms.map((term) => (
                  <tr key={term.id} className="hover:bg-primary-light">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={term.time}
                        onChange={(e) =>
                          updatePaymentTermLocal(term.id, "time", e.target.value)
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded
                                 focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
                        placeholder="VD: T0, T+2 tuần"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={term.milestone}
                        onChange={(e) =>
                          updatePaymentTermLocal(term.id, "milestone", e.target.value)
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded
                                 focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
                        placeholder="Mốc thanh toán"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={term.percentage}
                        onChange={(e) =>
                          updatePaymentTermLocal(term.id, "percentage", e.target.value)
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded
                                 text-center font-semibold focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-primary-dark">
                      {formatCurrency((totalAmount * (term.percentage || 0)) / 100)}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={term.description}
                        onChange={(e) =>
                          updatePaymentTermLocal(term.id, "description", e.target.value)
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded
                                 focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
                        placeholder="Ghi chú"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removePaymentTerm(term.id)}
                        disabled={paymentTerms.length <= 1}
                        className={`p-1.5 rounded transition-all duration-150 ${
                          paymentTerms.length <= 1
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                        }`}
                        title="Xóa mốc"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile & tablet card view */}
          <div className="block lg:hidden space-y-3">
            {paymentTerms.map((term) => (
              <div
                key={term.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary-dark">Mốc thanh toán</span>
                  <button
                    onClick={() => removePaymentTerm(term.id)}
                    disabled={paymentTerms.length <= 1}
                    className={`p-1.5 rounded transition-all duration-150 ${
                      paymentTerms.length <= 1
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                    }`}
                    title="Xóa mốc"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-primary-dark">Thời gian</label>
                    <input
                      type="text"
                      value={term.time}
                      onChange={(e) => updatePaymentTermLocal(term.id, "time", e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
                      placeholder="VD: T0, T+2 tuần"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-primary-dark">Tỷ lệ (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={term.percentage}
                      onChange={(e) => updatePaymentTermLocal(term.id, "percentage", e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg text-center font-semibold focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-primary-dark">Mốc</label>
                  <input
                    type="text"
                    value={term.milestone}
                    onChange={(e) => updatePaymentTermLocal(term.id, "milestone", e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
                    placeholder="Mốc thanh toán"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-primary-dark">Số tiền dự kiến</label>
                  <div className="mt-1 flex items-center justify-between bg-primary-light border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-500">VND</span>
                    <span className="text-base font-bold text-primary-dark">
                      {formatCurrency((totalAmount * (term.percentage || 0)) / 100)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-primary-dark">Ghi chú</label>
                  <input
                    type="text"
                    value={term.description}
                    onChange={(e) => updatePaymentTermLocal(term.id, "description", e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary-blue focus:border-primary-blue"
                    placeholder="Ghi chú"
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-gray-500 italic">
            * Báo giá có hiệu lực trong vòng 30 ngày kể từ ngày gửi. Giá trên
            chưa bao gồm VAT (nếu có).
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-primary-dark border-t border-primary-navy mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-primary-light opacity-80">
            © {new Date().getFullYear()} {COMPANY_INFO.name} | {COMPANY_INFO.website}
          </p>
        </div>
      </footer>

      {/* Click outside to close dropdown */}
      {showPackageSelector && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowPackageSelector(false)}
        />
      )}
    </div>
  );
};

export default QuotationForm;
