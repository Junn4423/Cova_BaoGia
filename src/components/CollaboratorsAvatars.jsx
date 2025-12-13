import { useState, useRef, useEffect } from "react";
import { useCollaboration } from "../contexts/CollaborationContext";
import { getNameInitials, isValidCustomName } from "../data/username-randomData";
import { Edit2, RefreshCw, Check, X, User, WifiOff } from "lucide-react";

/**
 * Component hiển thị avatar các collaborators đang online
 */
const CollaboratorsAvatars = () => {
  const { 
    collaborators, 
    currentUser, 
    isConnected, 
    connectionStatus,
    updateUserName, 
    regenerateRandomName 
  } = useCollaboration();

  const [showEditName, setShowEditName] = useState(false);
  const [newName, setNewName] = useState("");
  const [hoveredUser, setHoveredUser] = useState(null);
  const inputRef = useRef(null);
  const tooltipTimeoutRef = useRef(null);

  const allUsers = [
    { ...currentUser, isCurrentUser: true },
    ...collaborators.map((c) => ({ ...c, isCurrentUser: false })),
  ];

  const displayedUsers = allUsers.slice(0, 5);
  const remainingCount = allUsers.length - 5;

  // Focus input khi mở edit
  useEffect(() => {
    if (showEditName && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showEditName]);

  const handleSaveName = () => {
    if (isValidCustomName(newName)) {
      updateUserName(newName.trim());
      setShowEditName(false);
      setNewName("");
    }
  };

  const handleCancelEdit = () => {
    setShowEditName(false);
    setNewName("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleMouseEnter = (user, index) => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setHoveredUser({ ...user, index });
  };

  const handleMouseLeave = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setHoveredUser(null);
    }, 100);
  };

  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case "connected":
        return { color: "bg-green-500", text: "Đã kết nối", showText: false, animate: true };
      case "connecting":
        return { color: "bg-yellow-500", text: "Đang kết nối", showText: false, animate: true };
      case "reconnecting":
        return { color: "bg-orange-500", text: "Đang kết nối lại", showText: false, animate: true };
      case "disconnected":
        return { color: "bg-red-500", text: "Mất kết nối", showText: true, animate: false };
      default:
        return { color: "bg-gray-500", text: "Không xác định", showText: false, animate: false };
    }
  };

  const statusInfo = getConnectionStatusInfo();

  return (
    <div className="flex items-center gap-2">
      {/* Connection status - chỉ hiện text khi mất kết nối */}
      <div className="flex items-center gap-1.5 mr-2" title={statusInfo.text}>
        <div
          className={`w-2 h-2 rounded-full ${statusInfo.color} ${statusInfo.animate ? "animate-pulse" : ""}`}
        />
        {statusInfo.showText && (
          <span className="text-xs text-gray-300 flex items-center gap-1">
            <WifiOff className="w-3 h-3" />
            {statusInfo.text}
          </span>
        )}
      </div>

      {/* User avatars */}
      <div className="flex -space-x-2 relative">
        {displayedUsers.map((user, index) => (
          <div
            key={user.id || user.clientId || index}
            className="relative"
            onMouseEnter={() => handleMouseEnter(user, index)}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className={`relative w-8 h-8 rounded-full flex items-center justify-center
                         text-white text-xs font-bold border-2 border-primary-dark
                         transition-transform hover:scale-110 hover:z-10 cursor-pointer
                         ${user.isCurrentUser ? "ring-2 ring-white ring-offset-1 ring-offset-primary-dark" : ""}`}
              style={{ backgroundColor: user.color, zIndex: displayedUsers.length - index }}
            >
              {getNameInitials(user.name)}
              {/* Online indicator */}
              <div 
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-primary-dark
                           ${user.isActive !== false ? "bg-green-500" : "bg-yellow-500"}`} 
              />
            </div>

            {/* Tooltip khi hover */}
            {hoveredUser && hoveredUser.index === index && (
              <div 
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 
                          bg-gray-900 text-white rounded-lg shadow-xl p-3 min-w-[180px]
                          animate-in fade-in slide-in-from-top-1 duration-150"
              >
                {/* Arrow */}
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 
                               bg-gray-900 rotate-45" />
                
                <div className="relative">
                  {/* User name */}
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: user.color }}
                    >
                      {getNameInitials(user.name)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm leading-tight">{user.name}</p>
                      <p className="text-xs text-gray-400">
                        {user.isCurrentUser ? "(Bạn)" : "Cộng tác viên"}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <div className={`w-2 h-2 rounded-full ${user.isActive !== false ? "bg-green-500" : "bg-yellow-500"}`} />
                    <span>{user.isActive !== false ? "Đang hoạt động" : "Không hoạt động"}</span>
                  </div>

                  {/* Actions cho current user */}
                  {user.isCurrentUser && (
                    <div className="border-t border-gray-700 pt-2 mt-2 flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewName(currentUser.name);
                          setShowEditName(true);
                          setHoveredUser(null);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 
                                  bg-primary-blue/20 hover:bg-primary-blue/30 rounded text-xs 
                                  text-primary-blue transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                        Đổi tên
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          regenerateRandomName();
                          setHoveredUser(null);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 
                                  bg-gray-600/50 hover:bg-gray-600/70 rounded text-xs 
                                  text-gray-300 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Random
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Show +N if more users */}
        {remainingCount > 0 && (
          <div
            className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center
                       text-white text-xs font-bold border-2 border-primary-dark"
            style={{ zIndex: 0 }}
          >
            +{remainingCount}
          </div>
        )}
      </div>

      {/* Edit name button (icon nhỏ) */}
      <button
        onClick={() => {
          setNewName(currentUser.name);
          setShowEditName(true);
        }}
        className="ml-1 p-1.5 rounded-full bg-gray-700/50 hover:bg-gray-600 
                   text-gray-300 hover:text-white transition-colors"
        title="Đổi tên hiển thị"
      >
        <User className="w-4 h-4" />
      </button>

      {/* Edit name modal */}
      {showEditName && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleCancelEdit}
          />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4
                         animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-blue" />
              Đổi tên hiển thị
            </h3>
            
            <div className="mb-4">
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập tên của bạn..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg 
                          focus:outline-none focus:ring-2 focus:ring-primary-blue/50
                          focus:border-primary-blue transition-all"
                maxLength={30}
              />
              <p className="text-xs text-gray-500 mt-1">
                {newName.length}/30 ký tự (tối thiểu 2)
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 
                          rounded-lg hover:bg-gray-50 transition-colors flex items-center 
                          justify-center gap-1"
              >
                <X className="w-4 h-4" />
                Hủy
              </button>
              <button
                onClick={handleSaveName}
                disabled={!isValidCustomName(newName)}
                className="flex-1 px-4 py-2 bg-primary-blue text-white rounded-lg 
                          hover:bg-primary-navy transition-colors flex items-center 
                          justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                Lưu
              </button>
            </div>

            {/* Quick random button */}
            <button
              onClick={() => {
                regenerateRandomName();
                setShowEditName(false);
              }}
              className="w-full mt-3 px-4 py-2 border border-dashed border-gray-300 
                        text-gray-600 rounded-lg hover:bg-gray-50 hover:border-gray-400
                        transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Tạo tên ngẫu nhiên mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaboratorsAvatars;
