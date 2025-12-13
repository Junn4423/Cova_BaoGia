import { useEffect, useCallback, useRef, memo, useState } from "react";
import { useCollaboration } from "../contexts/CollaborationContext";

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
 * Sử dụng smooth animation cho cursor movement
 */
const CursorIcon = memo(({ x, y, color, name }) => {
  const [position, setPosition] = useState({ x, y });
  const targetRef = useRef({ x, y });
  const animationRef = useRef(null);

  // Smooth animation với lerp (linear interpolation)
  useEffect(() => {
    targetRef.current = { x, y };

    const animate = () => {
      setPosition((prev) => {
        const dx = targetRef.current.x - prev.x;
        const dy = targetRef.current.y - prev.y;

        // Nếu đã gần đích rồi thì snap
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
          return targetRef.current;
        }

        // Lerp với factor 0.3 cho smooth movement
        return {
          x: prev.x + dx * 0.3,
          y: prev.y + dy * 0.3,
        };
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [x, y]);

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-2px, -2px)",
      }}
    >
      {/* Cursor pointer - Standard arrow style */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        className="drop-shadow-md"
      >
        {/* Shadow */}
        <path
          d="M3 2L3 17L7 13L10 19L12 18L9 12L15 12L3 2Z"
          fill="rgba(0,0,0,0.3)"
          transform="translate(1, 1)"
        />
        {/* Main cursor */}
        <path
          d="M3 2L3 17L7 13L10 19L12 18L9 12L15 12L3 2Z"
          fill={color}
        />
        {/* Border */}
        <path
          d="M3 2L3 17L7 13L10 19L12 18L9 12L15 12L3 2Z"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* Name label */}
      <div
        className="absolute left-4 top-4 px-2 py-0.5 rounded-md text-xs font-medium 
                   text-white whitespace-nowrap shadow-lg"
        style={{
          backgroundColor: color,
          maxWidth: "120px",
        }}
      >
        <span className="truncate block">{name}</span>
      </div>
    </div>
  );
});

CursorIcon.displayName = "CursorIcon";

/**
 * Component hiển thị tất cả cursors của collaborators
 * Real-time cursor tracking giống Google Sheets / Figma
 */
const RemoteCursors = () => {
  const {
    remoteCursors,
    updateCursorPosition,
    clearCursorPosition,
    isConnected,
  } = useCollaboration();

  const lastPositionRef = useRef({ x: 0, y: 0 });

  // Throttled mouse move handler - 50ms để cân bằng giữa mượt và performance
  const handleMouseMove = useCallback(
    throttle((e) => {
      if (!isConnected) return;

      const x = e.clientX;
      const y = e.clientY;

      // Chỉ update nếu vị trí thay đổi đáng kể (> 3px)
      const dx = Math.abs(x - lastPositionRef.current.x);
      const dy = Math.abs(y - lastPositionRef.current.y);

      if (dx > 3 || dy > 3) {
        lastPositionRef.current = { x, y };
        updateCursorPosition({ x, y });
      }
    }, 50),
    [isConnected, updateCursorPosition]
  );

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    clearCursorPosition();
  }, [clearCursorPosition]);

  // Setup event listeners
  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      clearCursorPosition();
    };
  }, [handleMouseMove, handleMouseLeave, clearCursorPosition]);

  // Không render gì nếu chưa kết nối hoặc không có remote cursors
  if (!isConnected) return null;

  const cursorEntries = Object.entries(remoteCursors);
  if (cursorEntries.length === 0) return null;

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
