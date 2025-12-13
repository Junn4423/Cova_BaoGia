import { useEffect, useCallback, useRef, memo } from "react";
import { useCollaboration } from "../contexts/CollaborationContext";
import { getNameInitials } from "../data/username-randomData";

// Throttle helper để giới hạn tần suất update cursor
const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Component hiển thị một cursor của người dùng khác
 */
const CursorIcon = memo(({ x, y, color, name }) => {
  return (
    <div
      className="fixed pointer-events-none z-[9999] transition-all duration-75 ease-out"
      style={{
        left: x,
        top: y,
        transform: "translate(-2px, -2px)",
      }}
    >
      {/* Cursor pointer */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="drop-shadow-md"
      >
        {/* Shadow */}
        <path
          d="M5.5 3.21V20.8C5.5 21.78 6.68 22.33 7.42 21.67L11.26 18.22H18.5C19.35 18.22 20.03 17.54 20.03 16.69V5.75C20.03 4.9 19.35 4.22 18.5 4.22H7.02C6.17 4.22 5.5 4.36 5.5 3.21Z"
          fill="rgba(0,0,0,0.2)"
          transform="translate(1, 1)"
        />
        {/* Main cursor */}
        <path
          d="M5.5 3.21V20.8C5.5 21.78 6.68 22.33 7.42 21.67L11.26 18.22H18.5C19.35 18.22 20.03 17.54 20.03 16.69V5.75C20.03 4.9 19.35 4.22 18.5 4.22H7.02C6.17 4.22 5.5 4.36 5.5 3.21Z"
          fill={color}
        />
        {/* Border */}
        <path
          d="M5.5 3.21V20.8C5.5 21.78 6.68 22.33 7.42 21.67L11.26 18.22H18.5C19.35 18.22 20.03 17.54 20.03 16.69V5.75C20.03 4.9 19.35 4.22 18.5 4.22H7.02C6.17 4.22 5.5 4.36 5.5 3.21Z"
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* Name label */}
      <div
        className="absolute left-5 top-4 px-2 py-0.5 rounded-md text-xs font-medium 
                   text-white whitespace-nowrap shadow-lg flex items-center gap-1"
        style={{ 
          backgroundColor: color,
          maxWidth: '150px',
        }}
      >
        <span className="truncate">{name}</span>
      </div>
    </div>
  );
});

CursorIcon.displayName = "CursorIcon";

/**
 * Component hiển thị tất cả cursors của collaborators
 * Figma-style real-time cursor tracking
 */
const RemoteCursors = () => {
  const { 
    remoteCursors, 
    updateCursorPosition, 
    clearCursorPosition,
    isConnected,
    currentUser,
    connectionStatus,
  } = useCollaboration();
  
  const lastPositionRef = useRef({ x: 0, y: 0 });

  // Throttled mouse move handler - giảm throttle xuống 30ms để mượt hơn
  const handleMouseMove = useCallback(
    throttle((e) => {
      if (!isConnected) {
        console.log('[RemoteCursors] Not connected, skipping cursor update');
        return;
      }
      
      const x = e.clientX;
      const y = e.clientY;
      
      // Chỉ update nếu vị trí thay đổi đáng kể (> 2px)
      const dx = Math.abs(x - lastPositionRef.current.x);
      const dy = Math.abs(y - lastPositionRef.current.y);
      
      if (dx > 2 || dy > 2) {
        lastPositionRef.current = { x, y };
        updateCursorPosition({ x, y });
      }
    }, 30), // Giảm throttle xuống 30ms (33 updates/giây)
    [isConnected, updateCursorPosition]
  );

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    clearCursorPosition();
  }, [clearCursorPosition]);

  // Setup event listeners
  useEffect(() => {
    console.log('[RemoteCursors] Setting up mouse listeners, isConnected:', isConnected);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    
    // Clear cursor khi component unmount
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      clearCursorPosition();
    };
  }, [handleMouseMove, handleMouseLeave, clearCursorPosition, isConnected]);

  // Log khi có remote cursors
  useEffect(() => {
    console.log('[RemoteCursors] Remote cursors updated:', remoteCursors);
  }, [remoteCursors]);

  // Không render gì nếu chưa kết nối
  if (!isConnected) {
    console.log('[RemoteCursors] Not rendering - not connected. Status:', connectionStatus);
    return null;
  }

  const cursorEntries = Object.entries(remoteCursors);
  
  // Log khi không có cursors
  if (cursorEntries.length === 0) {
    console.log('[RemoteCursors] No remote cursors to display');
    return null;
  }
  
  console.log('[RemoteCursors] Rendering', cursorEntries.length, 'cursors');

  return (
    <>
      {cursorEntries.map(([clientId, cursor]) => {
        // Bỏ qua cursor đã cũ quá 5 giây
        if (cursor.timestamp && Date.now() - cursor.timestamp > 5000) {
          return null;
        }

        return (
          <CursorIcon
            key={clientId}
            x={cursor.x}
            y={cursor.y}
            color={cursor.user?.color || "#888888"}
            name={cursor.user?.name || "Anonymous"}
          />
        );
      })}
    </>
  );
};

export default RemoteCursors;
