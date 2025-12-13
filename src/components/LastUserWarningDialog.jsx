import { AlertTriangle, LogOut, ArrowLeft, Download, Clock, Users } from "lucide-react";

/**
 * Dialog cảnh báo người dùng cuối cùng
 * Hiển thị 2 cảnh báo quan trọng:
 * 1. Dữ liệu sẽ bị mất
 * 2. Không ai còn có thể truy cập phòng
 */
const LastUserWarningDialog = ({ isOpen, onConfirm, onCancel, pendingAction }) => {
  if (!isOpen) return null;

  const isTabClose = pendingAction === 'tab_close';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header - Warning style */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Bạn là người cuối cùng!</h2>
              <p className="text-xs text-white/80">Có 2 điều quan trọng bạn cần biết</p>
            </div>
          </div>
        </div>

        {/* Content - 2 Warnings */}
        <div className="p-6 space-y-4">
          {/* Warning 1: Data loss */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800 mb-1">⚠️ Cảnh báo 1: Mất dữ liệu</h3>
                <p className="text-sm text-red-700 leading-relaxed">
                  Khi bạn rời đi, <strong>tất cả dữ liệu báo giá</strong> sẽ bị xóa vĩnh viễn 
                  và <strong>không thể khôi phục</strong>. Hãy xuất file Excel trước!
                </p>
              </div>
            </div>
          </div>

          {/* Warning 2: Room closes */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">⚠️ Cảnh báo 2: Phòng đóng cửa</h3>
                <p className="text-sm text-amber-700 leading-relaxed">
                  Đường link chia sẻ sẽ <strong>không còn hoạt động</strong>. 
                  Bất kỳ ai có link cũ sẽ được chuyển đến phòng mới rỗng.
                </p>
              </div>
            </div>
          </div>

          {/* Suggestion */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Download className="w-5 h-5" />
              <p className="text-sm font-medium">
                💡 Gợi ý: Xuất file Excel trước khi rời đi để lưu giữ dữ liệu!
              </p>
            </div>
          </div>

          {/* Tab close specific warning */}
          {isTabClose && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <p className="text-sm text-purple-800 text-center">
                🖥️ Bạn đang cố gắng đóng tab/trình duyệt
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-primary-blue text-white rounded-xl font-medium
                       hover:bg-primary-navy transition-colors flex items-center justify-center gap-2
                       shadow-lg shadow-primary-blue/25"
            >
              <ArrowLeft className="w-4 h-4" />
              Ở lại
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium
                       hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Rời đi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LastUserWarningDialog;
