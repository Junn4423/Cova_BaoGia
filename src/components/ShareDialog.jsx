import { useState, useRef } from "react";
import { X, Copy, Check, Share2, Users, Link2 } from "lucide-react";
import { useCollaboration } from "../contexts/CollaborationContext";

/**
 * Dialog chia sẻ báo giá
 */
const ShareDialog = ({ isOpen, onClose }) => {
  const { getShareUrl, roomId, collaborators, currentUser } = useCollaboration();
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  if (!isOpen) return null;

  const shareUrl = getShareUrl();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback cho các trình duyệt không hỗ trợ clipboard API
      if (inputRef.current) {
        inputRef.current.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Báo giá COVASOL",
          text: "Mời bạn cùng chỉnh sửa báo giá",
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled hoặc không hỗ trợ
        console.log("Share cancelled");
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-blue to-primary-navy px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Chia sẻ báo giá</h2>
                <p className="text-xs text-white/80">Mã phòng: {roomId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* URL Copy Section */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Đường link chia sẻ
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Link2 className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg
                           text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-blue/20"
                />
              </div>
              <button
                onClick={handleCopy}
                className={`px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200
                          flex items-center gap-2 min-w-[100px] justify-center
                          ${
                            copied
                              ? "bg-green-500 text-white"
                              : "bg-primary-blue text-white hover:bg-primary-navy"
                          }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Đã copy!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-primary-light rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-blue/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="w-4 h-4 text-primary-blue" />
              </div>
              <div>
                <h4 className="font-medium text-primary-dark text-sm">
                  Cộng tác thời gian thực
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  Chia sẻ link này để mời người khác cùng chỉnh sửa báo giá.
                  Mọi thay đổi sẽ được đồng bộ ngay lập tức.
                </p>
              </div>
            </div>
          </div>

          {/* Online Users */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                Đang online
              </span>
              <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded-full">
                {collaborators.length + 1} người
              </span>
            </div>

            <div className="space-y-2">
              {/* Current user */}
              <div className="flex items-center gap-3 p-3 bg-primary-light rounded-lg border-2 border-primary-blue/20">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: currentUser.color }}
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary-dark">
                    {currentUser.name}
                  </p>
                  <p className="text-xs text-gray-500">Bạn</p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>

              {/* Other collaborators */}
              {collaborators.map((user) => (
                <div
                  key={user.clientId}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">
                      {user.name}
                    </p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Share Button (Mobile) */}
          {navigator.share && (
            <button
              onClick={handleShare}
              className="w-full py-3 bg-gradient-to-r from-primary-green to-accent-green
                       text-white rounded-lg font-medium text-sm
                       hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Chia sẻ qua ứng dụng khác
            </button>
          )}

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Lưu ý:</strong> Nếu tất cả người dùng rời khỏi phòng, dữ liệu
              sẽ bị xóa. Hãy xuất file Excel trước khi rời đi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
