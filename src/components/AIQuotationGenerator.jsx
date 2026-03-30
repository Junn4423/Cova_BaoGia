import { useState, useCallback, useEffect } from "react";
import {
  Sparkles,
  Key,
  ChevronDown,
  Loader2,
  AlertCircle,
  Check,
  DollarSign,
  Target,
  Sliders,
  X,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  generateQuotation,
  getApiKey,
  setApiKey,
  BUDGET_PRESETS,
} from "../utils/aiService";

/**
 * Component: AI Quotation Generator
 * Cho phép user mô tả dự án, chọn khoảng giá, và AI sẽ tạo báo giá chi tiết
 */
const AIQuotationGenerator = ({ onGenerated, projectDescription, customerName }) => {
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const [showApiKey, setShowApiKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Budget mode: "none" | "range" | "fixed"
  const [budgetMode, setBudgetMode] = useState("none");
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [minBudget, setMinBudget] = useState(0);
  const [maxBudget, setMaxBudget] = useState(0);
  const [fixedBudget, setFixedBudget] = useState(0);
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState("");

  // Load saved API key
  useEffect(() => {
    setApiKeyState(getApiKey());
  }, []);

  const handleApiKeyChange = useCallback((val) => {
    setApiKeyState(val);
    setApiKey(val);
  }, []);

  const handlePresetSelect = useCallback((preset) => {
    setSelectedPreset(preset);
    setMinBudget(preset.min);
    setMaxBudget(preset.max);
    setBudgetMode("range");
    setShowBudgetDropdown(false);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!projectDescription?.trim()) {
      setError("Vui lòng nhập mô tả dự án trước khi tạo báo giá.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await generateQuotation({
        projectDescription,
        customerName,
        budgetMode,
        minBudget,
        maxBudget,
        fixedBudget,
      });

      if (result.estimatedDuration) {
        setEstimatedDuration(result.estimatedDuration);
      }

      onGenerated(result);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi khi tạo báo giá.");
    } finally {
      setIsGenerating(false);
    }
  }, [projectDescription, customerName, budgetMode, minBudget, maxBudget, fixedBudget, onGenerated]);

  const formatCurrency = (amount) => new Intl.NumberFormat("vi-VN").format(amount);

  return (
    <section className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl shadow-sm border border-indigo-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-primary-dark mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-500" />
        AI Tạo báo giá chi tiết
        <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-normal">
          Gemini AI
        </span>
      </h2>

      <div className="space-y-4">
        {/* API Key Input */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
            <Key className="w-4 h-4 text-indigo-500" />
            Gemini API Key
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-500 hover:text-indigo-700 underline ml-1"
            >
              (Lấy key miễn phí)
            </a>
          </label>
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="Nhập Gemini API Key..."
              className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm
                       focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              type="button"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Budget Mode Selector */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="w-4 h-4 text-indigo-500" />
            Ngân sách / Khoảng giá
          </label>

          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => { setBudgetMode("none"); setSelectedPreset(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                budgetMode === "none"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                AI tự định giá
              </span>
            </button>
            <button
              onClick={() => setBudgetMode("range")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                budgetMode === "range"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Khoảng giá
              </span>
            </button>
            <button
              onClick={() => setBudgetMode("fixed")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                budgetMode === "fixed"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Chọn giá cố định
              </span>
            </button>
          </div>

          {/* Range Budget */}
          {budgetMode === "range" && (
            <div className="space-y-3 animate-fadeIn">
              {/* Preset Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowBudgetDropdown(!showBudgetDropdown)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-left
                           flex items-center justify-between hover:border-indigo-400 transition-all"
                >
                  <span className={selectedPreset ? "text-gray-900" : "text-gray-400"}>
                    {selectedPreset ? selectedPreset.label : "Chọn khoảng giá nhanh..."}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showBudgetDropdown ? "rotate-180" : ""}`} />
                </button>
                {showBudgetDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowBudgetDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                      {BUDGET_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => handlePresetSelect(preset)}
                          className="w-full px-4 py-2.5 text-sm text-left hover:bg-indigo-50 transition-colors
                                   flex items-center justify-between border-b border-gray-50 last:border-0"
                        >
                          <span className="font-medium">{preset.label}</span>
                          <span className="text-xs text-gray-400">
                            {formatCurrency(preset.min)} - {formatCurrency(preset.max)} VND
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Custom range inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tối thiểu (VND)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000000"
                    value={minBudget}
                    onChange={(e) => setMinBudget(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                    placeholder="VD: 5000000"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tối đa (VND)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000000"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                             focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                    placeholder="VD: 10000000"
                  />
                </div>
              </div>
              {minBudget > 0 && maxBudget > 0 && (
                <p className="text-xs text-indigo-600 font-medium">
                  AI sẽ báo giá trong khoảng {formatCurrency(minBudget)} - {formatCurrency(maxBudget)} VND
                </p>
              )}
            </div>
          )}

          {/* Fixed Budget */}
          {budgetMode === "fixed" && (
            <div className="space-y-3 animate-fadeIn">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tổng ngân sách cố định (VND)</label>
                <input
                  type="number"
                  min="0"
                  step="1000000"
                  value={fixedBudget}
                  onChange={(e) => setFixedBudget(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                           focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                  placeholder="VD: 7000000"
                />
              </div>
              {fixedBudget > 0 && (
                <p className="text-xs text-indigo-600 font-medium">
                  AI sẽ chia nhỏ sao cho tổng báo giá = {formatCurrency(fixedBudget)} VND
                </p>
              )}
            </div>
          )}

          {budgetMode === "none" && (
            <p className="text-xs text-gray-500 italic">
              AI sẽ tự phân tích và định giá hợp lý theo thị trường Việt Nam.
            </p>
          )}
        </div>

        {/* Generate Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !apiKey || !projectDescription?.trim()}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm
                       transition-all duration-200 shadow-md ${
              isGenerating
                ? "bg-indigo-400 text-white cursor-wait"
                : success
                ? "bg-green-600 text-white"
                : !apiKey || !projectDescription?.trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                AI đang phân tích...
              </>
            ) : success ? (
              <>
                <Check className="w-4 h-4" />
                Đã tạo thành công!
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Tạo báo giá bằng AI
              </>
            )}
          </button>

          {estimatedDuration && (
            <span className="text-sm text-indigo-600 font-medium">
              ⏱ Thời gian ước tính: {estimatedDuration}
            </span>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs text-red-500 hover:text-red-700 underline mt-1"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* Info note */}
        <p className="text-xs text-gray-400">
          💡 AI sẽ phân tích yêu cầu từ &quot;Mô tả chung cho dự án&quot; phía trên và tạo báo giá chi tiết nhiều dòng.
          Sau khi tạo, bạn có thể chỉnh sửa từng dòng.
        </p>
      </div>
    </section>
  );
};

export default AIQuotationGenerator;
