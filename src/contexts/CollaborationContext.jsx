import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket"; // Đã đổi từ y-webrtc sang y-websocket
import { generateRandomName } from "../data/username-randomData";

// Danh sách màu sắc random cho collaborators
const CURSOR_COLORS = [
  "#FF6B6B", // Đỏ
  "#4ECDC4", // Xanh ngọc
  "#45B7D1", // Xanh dương
  "#96CEB4", // Xanh lá nhạt
  "#FFEAA7", // Vàng
  "#DDA0DD", // Tím nhạt
  "#98D8C8", // Mint
  "#F7DC6F", // Vàng đậm
  "#BB8FCE", // Tím
  "#85C1E9", // Xanh nhạt
  "#F8B500", // Cam
  "#00CED1", // Cyan
];

// Cấu hình
const HEARTBEAT_INTERVAL = 2000; // 2 giây
const CONNECTION_TIMEOUT = 8000; // 8 giây
const PRESENCE_CHECK_INTERVAL = 1500; // 1.5 giây

// Tạo mã phòng random (tối đa 7 ký tự)
export const generateRoomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Tạo thông tin user random
const generateRandomUser = () => {
  const color = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
  const name = generateRandomName();
  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return { id, name, color, isCustomName: false };
};

const CollaborationContext = createContext(null);

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error(
      "useCollaboration must be used within a CollaborationProvider"
    );
  }
  return context;
};

export const CollaborationProvider = ({ children, roomId }) => {
  // Tạo ydoc một lần duy nhất
  const ydocRef = useRef(null);
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
  }
  const ydoc = ydocRef.current;

  const [provider, setProvider] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [collaborators, setCollaborators] = useState([]);
  const [currentUser] = useState(() => generateRandomUser());
  const [userState, setUserState] = useState(() => generateRandomUser());
  const [isLastUser, setIsLastUser] = useState(false);
  const [showLastUserWarning, setShowLastUserWarning] = useState(false);
  const [pendingLeaveAction, setPendingLeaveAction] = useState(null);

  // Shared states
  const [sharedCustomerName, setSharedCustomerName] = useState("");
  const [sharedProjectDescription, setSharedProjectDescription] = useState("");
  const [sharedQuotationItems, setSharedQuotationItems] = useState([]);
  const [sharedPaymentTerms, setSharedPaymentTerms] = useState([]);
  const [sharedCompanyInfo, setSharedCompanyInfo] = useState(null);

  // Remote cursors
  const [remoteCursors, setRemoteCursors] = useState({});

  const awarenessRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const presenceCheckIntervalRef = useRef(null);
  const isLeavingRef = useRef(false);
  const providerRef = useRef(null);
  const userStateRef = useRef(currentUser);

  // Cập nhật ref khi userState thay đổi
  useEffect(() => {
    userStateRef.current = userState;
  }, [userState]);

  // Đổi tên người dùng
  const updateUserName = useCallback((newName) => {
    setUserState((prev) => {
      const updated = { ...prev, name: newName, isCustomName: true };
      userStateRef.current = updated;
      if (awarenessRef.current) {
        awarenessRef.current.setLocalStateField("user", updated);
      }
      return updated;
    });
  }, []);

  // Tạo tên random mới
  const regenerateRandomName = useCallback(() => {
    const newName = generateRandomName();
    setUserState((prev) => {
      const updated = { ...prev, name: newName, isCustomName: false };
      userStateRef.current = updated;
      if (awarenessRef.current) {
        awarenessRef.current.setLocalStateField("user", updated);
      }
      return updated;
    });
  }, []);

  // Gửi heartbeat
  const sendHeartbeat = useCallback(() => {
    if (awarenessRef.current && !isLeavingRef.current) {
      awarenessRef.current.setLocalStateField("heartbeat", {
        timestamp: Date.now(),
        isActive: document.visibilityState === "visible",
      });
    }
  }, []);

  // Kiểm tra presence và cập nhật remote cursors
  const checkCollaboratorsPresence = useCallback(() => {
    if (!awarenessRef.current) return;

    const now = Date.now();
    const states = awarenessRef.current.getStates();
    const myClientId = awarenessRef.current.clientID;
    const activeUsers = [];
    const cursors = {};

    states.forEach((state, clientId) => {
      if (clientId === myClientId) return;

      if (state.user) {
        const heartbeat = state.heartbeat;
        const lastSeen = heartbeat?.timestamp || now;
        const isTimedOut = now - lastSeen > CONNECTION_TIMEOUT;

        if (!isTimedOut) {
          activeUsers.push({
            ...state.user,
            clientId,
            cursor: state.cursor,
            lastSeen,
            isActive: heartbeat?.isActive ?? true,
          });

          if (state.cursor?.x !== undefined && state.cursor?.y !== undefined) {
            cursors[clientId] = {
              ...state.cursor,
              user: state.user,
              clientId,
            };
          }
        }
      }
    });

    setCollaborators(activeUsers);
    setRemoteCursors(cursors);
    setIsLastUser(activeUsers.length === 0);
  }, []);

  // Khởi tạo WebSocket Provider
  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;
    isLeavingRef.current = false;

    const roomName = `baogia-cova-${roomId}`;
    // Link server của bạn trên Render (đổi https -> wss)
    const serverUrl = "wss://baogia-socket-server.onrender.com";

    console.log(`[Collab] Connecting to WebSocket room: ${roomName} at ${serverUrl}`);

    // Tạo WebsocketProvider
    const websocketProvider = new WebsocketProvider(
      serverUrl,
      roomName,
      ydoc
    );

    providerRef.current = websocketProvider;
    awarenessRef.current = websocketProvider.awareness;
    setProvider(websocketProvider);

    // Set initial user state
    websocketProvider.awareness.setLocalStateField("user", userStateRef.current);
    websocketProvider.awareness.setLocalStateField("heartbeat", {
      timestamp: Date.now(),
      isActive: true,
    });

    // Xử lý trạng thái kết nối
    const handleStatus = (event) => {
      if (!isMounted) return;
      console.log(`[Collab] Status: ${event.status}`);
      if (event.status === 'connected') {
        setIsConnected(true);
        setConnectionStatus("connected");
        // Kiểm tra collaborators khi vừa kết nối lại
        checkCollaboratorsPresence();
      } else {
        setIsConnected(false);
        setConnectionStatus("disconnected");
      }
    };

    const handleAwarenessChange = ({ added, updated, removed }) => {
      if (!isMounted) return;
      // console.log(`[Collab] Awareness change`);
      checkCollaboratorsPresence();
    };

    websocketProvider.on('status', handleStatus);
    websocketProvider.awareness.on("change", handleAwarenessChange);

    // Setup heartbeat và presence check
    heartbeatIntervalRef.current = setInterval(
      sendHeartbeat,
      HEARTBEAT_INTERVAL
    );
    presenceCheckIntervalRef.current = setInterval(
      checkCollaboratorsPresence,
      PRESENCE_CHECK_INTERVAL
    );

    return () => {
      isMounted = false;
      isLeavingRef.current = true;

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (presenceCheckIntervalRef.current) {
        clearInterval(presenceCheckIntervalRef.current);
      }

      if (websocketProvider.awareness) {
        websocketProvider.awareness.setLocalState(null);
      }

      websocketProvider.off('status', handleStatus);
      websocketProvider.awareness.off("change", handleAwarenessChange);
      websocketProvider.destroy();

      providerRef.current = null;
      awarenessRef.current = null;
    };
  }, [roomId, ydoc, sendHeartbeat, checkCollaboratorsPresence]);

  // Cập nhật user trong awareness khi thay đổi
  useEffect(() => {
    if (awarenessRef.current && isConnected) {
      awarenessRef.current.setLocalStateField("user", userState);
    }
  }, [userState, isConnected]);

  // Xử lý visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
        checkCollaboratorsPresence();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sendHeartbeat, checkCollaboratorsPresence]);

  // Xử lý beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isLastUser && !isLeavingRef.current) {
        e.preventDefault();
        e.returnValue =
          "Bạn là người cuối cùng trong phòng. Dữ liệu sẽ bị mất nếu bạn rời đi.";
        return e.returnValue;
      }
    };

    const handleUnload = () => {
      isLeavingRef.current = true;
      if (awarenessRef.current) {
        awarenessRef.current.setLocalState(null);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("unload", handleUnload);
    };
  }, [isLastUser]);

  // Đồng bộ dữ liệu với Yjs
  useEffect(() => {
    if (!ydoc) return;

    const yCustomerName = ydoc.getText("customerName");
    const yProjectDescription = ydoc.getText("projectDescription");
    const yQuotationItems = ydoc.getArray("quotationItems");
    const yPaymentTerms = ydoc.getArray("paymentTerms");
    const yCompanyInfo = ydoc.getMap("companyInfo");

    const customerNameObserver = () => {
      setSharedCustomerName(yCustomerName.toString());
    };

    const projectDescriptionObserver = () => {
      setSharedProjectDescription(yProjectDescription.toString());
    };

    const quotationItemsObserver = () => {
      setSharedQuotationItems(yQuotationItems.toArray());
    };

    const paymentTermsObserver = () => {
      setSharedPaymentTerms(yPaymentTerms.toArray());
    };

    const companyInfoObserver = () => {
      const info = {};
      yCompanyInfo.forEach((value, key) => {
        info[key] = value;
      });
      if (Object.keys(info).length > 0) {
        setSharedCompanyInfo(info);
      }
    };

    yCustomerName.observe(customerNameObserver);
    yProjectDescription.observe(projectDescriptionObserver);
    yQuotationItems.observeDeep(quotationItemsObserver);
    yPaymentTerms.observeDeep(paymentTermsObserver);
    yCompanyInfo.observe(companyInfoObserver);

    customerNameObserver();
    projectDescriptionObserver();
    quotationItemsObserver();
    paymentTermsObserver();
    companyInfoObserver();

    return () => {
      yCustomerName.unobserve(customerNameObserver);
      yProjectDescription.unobserve(projectDescriptionObserver);
      yQuotationItems.unobserveDeep(quotationItemsObserver);
      yPaymentTerms.unobserveDeep(paymentTermsObserver);
      yCompanyInfo.unobserve(companyInfoObserver);
    };
  }, [ydoc]);

  // Update functions
  const updateCustomerName = useCallback(
    (value) => {
      const yText = ydoc.getText("customerName");
      ydoc.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, value);
      });
    },
    [ydoc]
  );

  const updateProjectDescription = useCallback(
    (value) => {
      const yText = ydoc.getText("projectDescription");
      ydoc.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, value);
      });
    },
    [ydoc]
  );

  const updateQuotationItems = useCallback(
    (items) => {
      const yArray = ydoc.getArray("quotationItems");
      ydoc.transact(() => {
        yArray.delete(0, yArray.length);
        items.forEach((item) => {
          yArray.push([item]);
        });
      });
    },
    [ydoc]
  );

  const updatePaymentTerms = useCallback(
    (terms) => {
      const yArray = ydoc.getArray("paymentTerms");
      ydoc.transact(() => {
        yArray.delete(0, yArray.length);
        terms.forEach((term) => {
          yArray.push([term]);
        });
      });
    },
    [ydoc]
  );

  const updateCompanyInfo = useCallback(
    (info) => {
      const yMap = ydoc.getMap("companyInfo");
      ydoc.transact(() => {
        Object.entries(info).forEach(([key, value]) => {
          yMap.set(key, value);
        });
      });
    },
    [ydoc]
  );

  // Cập nhật cursor position
  const updateCursorPosition = useCallback((position) => {
    if (awarenessRef.current && !isLeavingRef.current) {
      awarenessRef.current.setLocalStateField("cursor", {
        x: position.x,
        y: position.y,
        timestamp: Date.now(),
      });
    }
  }, []);

  // Xóa cursor
  const clearCursorPosition = useCallback(() => {
    if (awarenessRef.current && !isLeavingRef.current) {
      awarenessRef.current.setLocalStateField("cursor", null);
    }
  }, []);

  // Lấy URL chia sẻ
  const getShareUrl = useCallback(() => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/room/${roomId}`;
  }, [roomId]);

  // Xử lý khi người cuối cùng rời đi
  const handleLastUserLeave = useCallback(
    (action = "navigate") => {
      if (isLastUser) {
        setPendingLeaveAction(action);
        setShowLastUserWarning(true);
        return true;
      }
      return false;
    },
    [isLastUser]
  );

  const confirmLeave = useCallback(() => {
    isLeavingRef.current = true;
    setShowLastUserWarning(false);

    if (awarenessRef.current) {
      awarenessRef.current.setLocalState(null);
    }

    setPendingLeaveAction(null);
    return true;
  }, []);

  const cancelLeave = useCallback(() => {
    setShowLastUserWarning(false);
    setPendingLeaveAction(null);
    sendHeartbeat();
  }, [sendHeartbeat]);

  // Force reconnect
  const forceReconnect = useCallback(() => {
    if (providerRef.current) {
      setConnectionStatus("reconnecting");
      providerRef.current.disconnect();
      setTimeout(() => {
        if (providerRef.current) {
          providerRef.current.connect();
        }
      }, 1000);
    }
  }, []);

  // Check connection health
  const checkConnectionHealth = useCallback(() => {
    return isConnected;
  }, [isConnected]);

  const value = {
    // Connection
    isConnected,
    connectionStatus,
    roomId,
    provider,
    ydoc,

    // User info
    currentUser: userState,
    collaborators,
    isLastUser,
    showLastUserWarning,
    pendingLeaveAction,

    // User actions
    updateUserName,
    regenerateRandomName,

    // Shared data
    sharedCustomerName,
    sharedProjectDescription,
    sharedQuotationItems,
    sharedPaymentTerms,
    sharedCompanyInfo,

    // Update functions
    updateCustomerName,
    updateProjectDescription,
    updateQuotationItems,
    updatePaymentTerms,
    updateCompanyInfo,

    // Remote cursors
    remoteCursors,
    updateCursorPosition,
    clearCursorPosition,

    // Utils
    getShareUrl,
    handleLastUserLeave,
    confirmLeave,
    cancelLeave,
    forceReconnect,
    checkConnectionHealth,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

export default CollaborationContext;