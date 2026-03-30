import { useState, useRef, useCallback } from 'react';
import {
  Sparkles,
  Upload,
  FileText,
  Image,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Key,
  Wand2,
  Trash2,
  FileUp,
  ClipboardPaste,
  DollarSign,
  Sliders,
  Target,
  Zap,
  ChevronDown,
} from 'lucide-react';

// Danh sách model Gemini miễn phí
const FREE_GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Cân bằng hiệu suất & tốc độ (Khuyên dùng)' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', description: 'Nhanh nhất, tiết kiệm nhất' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Mạnh nhất, giới hạn ~500-1000 lượt/ngày' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', description: 'Mới nhất, đa phương thức, phản hồi nhanh' },
];

// Giới hạn file size (4MB để an toàn với Vercel 4.5MB limit)
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const SUPPORTED_FILE_TYPES = {
  'image/png': 'Hình ảnh PNG',
  'image/jpeg': 'Hình ảnh JPEG',
  'image/webp': 'Hình ảnh WebP',
  'image/gif': 'Hình ảnh GIF',
  'application/pdf': 'PDF',
  'text/plain': 'Text',
  'text/markdown': 'Markdown',
};

// API Key Dialog Component
const ApiKeyDialog = ({ isOpen, onClose, onSubmit, error, currentKey }) => {
  const [apiKey, setApiKey] = useState(currentKey || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSubmit(apiKey.trim());
    }
  };

  const handleRemoveKey = () => {
    onSubmit('');
  };

  const maskedKey = currentKey ? `${currentKey.slice(0, 6)}...${currentKey.slice(-4)}` : '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-blue to-primary-navy p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Key className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {currentKey ? 'Quản lý API Key' : 'Nhập Gemini API Key'}
              </h3>
              <p className="text-white/80 text-sm">API key miễn phí từ Google AI Studio</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {currentKey && !error && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Đang dùng key: <code className="font-mono bg-green-100 px-1 rounded">{maskedKey}</code></span>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {currentKey ? 'Nhập API Key mới' : 'API Key'}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste API key của bạn vào đây..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 
                       focus:ring-primary-blue focus:border-primary-blue transition-all"
              autoFocus
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Cách lấy API key miễn phí:</strong>
            </p>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Truy cập <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Google AI Studio</a></li>
              <li>Đăng nhập bằng tài khoản Google</li>
              <li>Click &quot;Create API Key&quot;</li>
              <li>Copy và paste vào đây</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg
                       hover:bg-gray-50 transition-colors font-medium"
            >
              Hủy
            </button>
            {currentKey && (
              <button
                type="button"
                onClick={handleRemoveKey}
                className="px-4 py-3 border border-red-300 text-red-600 rounded-lg
                         hover:bg-red-50 transition-colors font-medium text-sm"
              >
                Xóa key
              </button>
            )}
            <button
              type="submit"
              disabled={!apiKey.trim()}
              className="flex-1 px-4 py-3 bg-primary-blue text-white rounded-lg
                       hover:bg-primary-navy transition-colors font-medium
                       disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {currentKey ? 'Cập nhật' : 'Xác nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Preset budget ranges
const BUDGET_PRESETS = [
  { label: '3 - 5 triệu', min: 3000000, max: 5000000 },
  { label: '5 - 10 triệu', min: 5000000, max: 10000000 },
  { label: '10 - 20 triệu', min: 10000000, max: 20000000 },
  { label: '20 - 50 triệu', min: 20000000, max: 50000000 },
  { label: '50 - 100 triệu', min: 50000000, max: 100000000 },
  { label: '100 - 200 triệu', min: 100000000, max: 200000000 },
];

// Main AIAnalyzer Component
const AIAnalyzer = ({ onAnalysisComplete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('gemini_model') || 'gemini-2.5-flash');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const fileInputRef = useRef(null);

  // Budget states
  const [budgetMode, setBudgetMode] = useState('none'); // 'none' | 'range' | 'fixed'
  const [minBudget, setMinBudget] = useState(0);
  const [maxBudget, setMaxBudget] = useState(0);
  const [fixedBudget, setFixedBudget] = useState(0);
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);

  // Lấy API key từ localStorage
  const getStoredApiKey = () => {
    return localStorage.getItem('gemini_api_key') || '';
  };

  // Lưu API key vào localStorage
  const storeApiKey = (key) => {
    if (key) {
      localStorage.setItem('gemini_api_key', key);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  };

  // Lấy stored model
  const getStoredModel = () => {
    return localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
  };

  // Kiểm tra có API key không
  const hasApiKey = !!getStoredApiKey();

  // Xử lý chọn file
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    // Kiểm tra file type
    if (!SUPPORTED_FILE_TYPES[file.type]) {
      setAnalysisError(`Định dạng file không được hỗ trợ. Hỗ trợ: ${Object.values(SUPPORTED_FILE_TYPES).join(', ')}`);
      return;
    }

    // Kiểm tra file size
    if (file.size > MAX_FILE_SIZE) {
      setAnalysisError(`File quá lớn (${(file.size / 1024 / 1024).toFixed(2)}MB). Giới hạn: 4MB. Vui lòng dùng bản tóm tắt hoặc ảnh chụp.`);
      return;
    }

    setAnalysisError(null);
    setSelectedFile(file);

    // Tạo preview cho hình ảnh
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  }, []);

  // Xóa file đã chọn
  const removeFile = useCallback(() => {
    setSelectedFile(null);
    setFilePreview(null);
    setAnalysisError(null);
  }, []);

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove data URL prefix
        const base64 = reader.result?.toString().split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // Gọi API phân tích
  const handleAnalyze = async (customApiKey = null) => {
    if (!textContent.trim() && !selectedFile) {
      setAnalysisError('Vui lòng nhập nội dung hoặc chọn file để phân tích');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const apiKey = customApiKey || getStoredApiKey();
      
      // Xây dựng request body
      const requestBody = {
        content: textContent.trim() || undefined,
        budgetMode,
        minBudget: budgetMode === 'range' ? minBudget : undefined,
        maxBudget: budgetMode === 'range' ? maxBudget : undefined,
        fixedBudget: budgetMode === 'fixed' ? fixedBudget : undefined,
      };

      // Nếu có file, convert sang base64
      if (selectedFile) {
        const base64 = await fileToBase64(selectedFile);
        requestBody.fileBase64 = base64;
        requestBody.fileName = selectedFile.name;
        requestBody.mimeType = selectedFile.type;
      }

      // Gọi API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'X-Gemini-Api-Key': apiKey }),
          'X-Gemini-Model': selectedModel,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        // Xử lý các loại lỗi
        if (data.error === 'API_KEY_REQUIRED' || data.error === 'INVALID_API_KEY') {
          setApiKeyError(data.message);
          setShowApiKeyDialog(true);
          return;
        }

        if (data.error === 'QUOTA_EXCEEDED') {
          setApiKeyError(data.message);
          setShowApiKeyDialog(true);
          // Xóa API key cũ không còn quota
          localStorage.removeItem('gemini_api_key');
          return;
        }

        throw new Error(data.message || 'Có lỗi xảy ra');
      }

      // Thành công
      setAnalysisResult(data.data);
      
      // Callback để thêm vào báo giá
      if (onAnalysisComplete && data.data) {
        onAnalysisComplete(data.data);
      }

    } catch (error) {
      setAnalysisError(error.message || 'Có lỗi xảy ra khi phân tích');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Xử lý submit API key
  const handleApiKeySubmit = (key) => {
    storeApiKey(key);
    setShowApiKeyDialog(false);
    setApiKeyError('');
    if (key) {
      // Retry phân tích với key mới
      handleAnalyze(key);
    }
  };

  // Reset toàn bộ
  const handleReset = () => {
    setTextContent('');
    setSelectedFile(null);
    setFilePreview(null);
    setAnalysisError(null);
    setAnalysisResult(null);
  };

  // Format số tiền
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  return (
    <>
      {/* API Key Dialog */}
      <ApiKeyDialog
        isOpen={showApiKeyDialog}
        onClose={() => {
          setShowApiKeyDialog(false);
          setApiKeyError('');
        }}
        onSubmit={handleApiKeySubmit}
        error={apiKeyError}
        currentKey={getStoredApiKey()}
      />

      {/* Main Component */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        {/* Header - Always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-blue to-primary-navy rounded-xl 
                          flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold text-primary-dark">
                AI Phân tích dự án
              </h2>
              <p className="text-sm text-gray-500">
                Tự động tạo báo giá từ tài liệu dự án
              </p>
            </div>
          </div>
          <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-200 p-6">
            {/* Input Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Text Input */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <ClipboardPaste className="w-4 h-4 text-primary-blue" />
                  Paste nội dung mô tả dự án
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste nội dung yêu cầu dự án, spec, brief... vào đây.

Ví dụ:
- Xây dựng website bán hàng online
- Tích hợp thanh toán VNPay
- Quản lý kho, đơn hàng
- App mobile cho khách hàng..."
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-primary-blue focus:border-primary-blue
                           transition-all text-sm resize-none"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <FileUp className="w-4 h-4 text-primary-blue" />
                  Hoặc upload file (PDF, ảnh)
                </label>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept={Object.keys(SUPPORTED_FILE_TYPES).join(',')}
                  className="hidden"
                />

                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8
                             flex flex-col items-center justify-center cursor-pointer
                             hover:border-primary-blue hover:bg-blue-50/50 transition-all
                             min-h-[200px]"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 text-center mb-2">
                      <span className="font-medium text-primary-blue">Click để chọn file</span>
                      <br />hoặc kéo thả vào đây
                    </p>
                    <p className="text-xs text-gray-400 text-center">
                      PDF, PNG, JPG, WebP, GIF (tối đa 4MB)
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      {/* Preview */}
                      {filePreview ? (
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                          {selectedFile.type === 'application/pdf' ? (
                            <FileText className="w-8 h-8 text-red-500" />
                          ) : (
                            <Image className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                      )}

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {SUPPORTED_FILE_TYPES[selectedFile.type]} • {(selectedFile.size / 1024 / 1024).toFixed(2)}MB
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={removeFile}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* API Key & Model Settings */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Key className="w-4 h-4 text-primary-blue" />
                Cấu hình AI
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* API Key */}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">API Key</label>
                  <button
                    onClick={() => { setApiKeyError(''); setShowApiKeyDialog(true); }}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm text-left flex items-center justify-between transition-all ${
                      hasApiKey
                        ? 'bg-white border-green-300 hover:border-green-400'
                        : 'bg-white border-gray-300 hover:border-primary-blue'
                    }`}
                  >
                    <span className={hasApiKey ? 'text-green-700' : 'text-gray-400'}>
                      {hasApiKey
                        ? `${getStoredApiKey().slice(0, 6)}...${getStoredApiKey().slice(-4)}`
                        : 'Chưa có key — Click để nhập'}
                    </span>
                    <Key className={`w-4 h-4 ${hasApiKey ? 'text-green-500' : 'text-gray-400'}`} />
                  </button>
                  {hasApiKey && (
                    <p className="text-xs text-green-600 mt-1">Đang dùng API key cá nhân</p>
                  )}
                </div>

                {/* Model Selector */}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Model</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowModelDropdown(!showModelDropdown)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-left
                               flex items-center justify-between hover:border-primary-blue transition-all"
                    >
                      <span className="text-gray-900 truncate">
                        {FREE_GEMINI_MODELS.find(m => m.id === selectedModel)?.name || selectedModel}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${showModelDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showModelDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowModelDropdown(false)} />
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                          {FREE_GEMINI_MODELS.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => {
                                setSelectedModel(model.id);
                                localStorage.setItem('gemini_model', model.id);
                                setShowModelDropdown(false);
                              }}
                              className={`w-full px-4 py-2.5 text-sm text-left hover:bg-blue-50 transition-colors
                                       flex items-center justify-between border-b border-gray-50 last:border-0 ${
                                         selectedModel === model.id ? 'bg-blue-50 font-medium' : ''
                                       }`}
                            >
                              <div>
                                <span className="block font-medium text-gray-900">{model.name}</span>
                                <span className="block text-xs text-gray-500">{model.description}</span>
                              </div>
                              {selectedModel === model.id && (
                                <CheckCircle className="w-4 h-4 text-primary-blue flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Tất cả đều miễn phí với Gemini API</p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {analysisError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{analysisError}</p>
              </div>
            )}

            {/* Budget / Price Selection */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <DollarSign className="w-4 h-4 text-primary-blue" />
                Ngân sách / Khoảng giá
              </label>

              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => { setBudgetMode('none'); setMinBudget(0); setMaxBudget(0); setFixedBudget(0); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    budgetMode === 'none'
                      ? 'bg-primary-blue text-white shadow-md'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    AI tự định giá
                  </span>
                </button>
                <button
                  onClick={() => setBudgetMode('range')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    budgetMode === 'range'
                      ? 'bg-primary-blue text-white shadow-md'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    Khoảng giá
                  </span>
                </button>
                <button
                  onClick={() => setBudgetMode('fixed')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    budgetMode === 'fixed'
                      ? 'bg-primary-blue text-white shadow-md'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    Giá cố định
                  </span>
                </button>
              </div>

              {budgetMode === 'range' && (
                <div className="space-y-3">
                  <div className="relative">
                    <button
                      onClick={() => setShowBudgetDropdown(!showBudgetDropdown)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-left
                               flex items-center justify-between hover:border-primary-blue transition-all"
                    >
                      <span className={minBudget > 0 && maxBudget > 0 ? 'text-gray-900' : 'text-gray-400'}>
                        {minBudget > 0 && maxBudget > 0
                          ? `${formatCurrency(minBudget)} - ${formatCurrency(maxBudget)} VND`
                          : 'Chọn khoảng giá nhanh...'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showBudgetDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showBudgetDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowBudgetDropdown(false)} />
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                          {BUDGET_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setMinBudget(preset.min);
                                setMaxBudget(preset.max);
                                setShowBudgetDropdown(false);
                              }}
                              className="w-full px-4 py-2.5 text-sm text-left hover:bg-blue-50 transition-colors
                                       flex items-center justify-between border-b border-gray-50 last:border-0"
                            >
                              <span className="font-medium">{preset.label}</span>
                              <span className="text-xs text-gray-400">
                                {formatCurrency(preset.min)} - {formatCurrency(preset.max)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tối thiểu (VND)</label>
                      <input
                        type="number"
                        min="0"
                        step="1000000"
                        value={minBudget || ''}
                        onChange={(e) => setMinBudget(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                 focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
                        placeholder="VD: 5000000"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tối đa (VND)</label>
                      <input
                        type="number"
                        min="0"
                        step="1000000"
                        value={maxBudget || ''}
                        onChange={(e) => setMaxBudget(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                 focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
                        placeholder="VD: 10000000"
                      />
                    </div>
                  </div>
                  {minBudget > 0 && maxBudget > 0 && (
                    <p className="text-xs text-primary-blue font-medium">
                      AI sẽ báo giá trong khoảng {formatCurrency(minBudget)} - {formatCurrency(maxBudget)} VND
                    </p>
                  )}
                </div>
              )}

              {budgetMode === 'fixed' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Tổng ngân sách cố định (VND)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000000"
                      value={fixedBudget || ''}
                      onChange={(e) => setFixedBudget(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm
                               focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
                      placeholder="VD: 7000000"
                    />
                  </div>
                  {fixedBudget > 0 && (
                    <p className="text-xs text-primary-blue font-medium">
                      AI sẽ chia nhỏ sao cho tổng báo giá = {formatCurrency(fixedBudget)} VND
                    </p>
                  )}
                </div>
              )}

              {budgetMode === 'none' && (
                <p className="text-xs text-gray-500 italic">
                  AI sẽ tự phân tích và định giá hợp lý theo thị trường Việt Nam.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => handleAnalyze()}
                disabled={isAnalyzing || (!textContent.trim() && !selectedFile)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 
                         px-6 py-3 bg-gradient-to-r from-primary-blue to-primary-navy text-white 
                         rounded-lg font-medium hover:from-primary-navy hover:to-primary-dark 
                         transition-all disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-lg hover:shadow-xl"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang phân tích...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    <span>Phân tích & Tạo báo giá</span>
                  </>
                )}
              </button>

              {(textContent || selectedFile || analysisResult) && (
                <button
                  onClick={handleReset}
                  className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg
                           hover:bg-gray-50 transition-colors font-medium"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Analysis Result Preview */}
            {analysisResult && (
              <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium text-green-800">Phân tích thành công!</h3>
                </div>

                {analysisResult.projectName && (
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Dự án:</strong> {analysisResult.projectName}
                  </p>
                )}

                {analysisResult.modules && analysisResult.modules.length > 0 && (
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Số module:</strong> {analysisResult.modules.length} hạng mục
                  </p>
                )}

                {analysisResult.totalEstimate && (
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Tổng dự toán:</strong>{' '}
                    <span className="text-green-600 font-semibold">
                      {formatCurrency(analysisResult.totalEstimate)} VNĐ
                    </span>
                  </p>
                )}

                {analysisResult.timeline && (
                  <p className="text-sm text-gray-700">
                    <strong>Timeline:</strong> {analysisResult.timeline}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
};

export default AIAnalyzer;
