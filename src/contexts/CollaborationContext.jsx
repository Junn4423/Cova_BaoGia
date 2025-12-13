import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
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

// Cấu hình heartbeat và timeout
const HEARTBEAT_INTERVAL = 3000; // 3 giây
const CONNECTION_TIMEOUT = 10000; // 10 giây không có heartbeat = mất kết nối
const PRESENCE_CHECK_INTERVAL = 2000; // 2 giây kiểm tra presence (giảm từ 5s)
const MAX_RECONNECT_ATTEMPTS = 3; // Số lần thử kết nối tối đa mỗi endpoint
const RECONNECT_DELAY = 3000; // 3 giây chờ trước khi thử lại

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
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting"); // connecting, connected, disconnected, reconnecting
  const [collaborators, setCollaborators] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => generateRandomUser());
  const [isLastUser, setIsLastUser] = useState(false);
  const [showLastUserWarning, setShowLastUserWarning] = useState(false);
  const [pendingLeaveAction, setPendingLeaveAction] = useState(null); // 'tab_close' | 'navigate' | null

  // Shared states
  const [sharedCustomerName, setSharedCustomerName] = useState("");
  const [sharedProjectDescription, setSharedProjectDescription] = useState("");
  const [sharedQuotationItems, setSharedQuotationItems] = useState([]);
  const [sharedPaymentTerms, setSharedPaymentTerms] = useState([]);
  const [sharedCompanyInfo, setSharedCompanyInfo] = useState(null);

  // Cursor positions - remote cursors của các collaborators
  const [remoteCursors, setRemoteCursors] = useState({});

  const awarenessRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const presenceCheckIntervalRef = useRef(null);
  const lastHeartbeatRef = useRef({});
  const isLeavingRef = useRef(false);
  const providerRef = useRef(null);
  const wsEndpointIndexRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const remoteCursorsRef = useRef({});

  // Đổi tên người dùng
  const updateUserName = useCallback((newName) => {
    setCurrentUser(prev => {
      const updated = { ...prev, name: newName, isCustomName: true };
      // Cập nhật awareness nếu đã kết nối
      if (awarenessRef.current) {
        awarenessRef.current.setLocalStateField("user", updated);
      }
      return updated;
    });
  }, []);

  // Tạo tên random mới
  const regenerateRandomName = useCallback(() => {
    const newName = generateRandomName();
    setCurrentUser(prev => {
      const updated = { ...prev, name: newName, isCustomName: false };
      if (awarenessRef.current) {
        awarenessRef.current.setLocalStateField("user", updated);
      }
      return updated;
    });
  }, []);

  // Kiểm tra kết nối còn hoạt động không
  const checkConnectionHealth = useCallback(() => {
    if (!providerRef.current) return false;
    const provider = providerRef.current;
    return Boolean(provider.wsconnected);
  }, []);

  // Cập nhật heartbeat
  const sendHeartbeat = useCallback(() => {
    if (awarenessRef.current && !isLeavingRef.current) {
      const heartbeatData = {
        timestamp: Date.now(),
        isActive: document.visibilityState === "visible",
      };
      awarenessRef.current.setLocalStateField("heartbeat", heartbeatData);
      console.log('[Collab] Sent heartbeat:', heartbeatData);
    }
  }, []);

  // Kiểm tra presence của các collaborators và cập nhật remote cursors
  const checkCollaboratorsPresence = useCallback(() => {
    if (!awarenessRef.current) {
      console.log('[Collab] No awareness ref');
      return;
    }
    
    const now = Date.now();
    const states = awarenessRef.current.getStates();
    const myClientId = awarenessRef.current.clientID;
    const activeUsers = [];
    const cursors = {};
    
    console.log(`[Collab] Checking presence - Total states: ${states.size}, My clientId: ${myClientId}`);
    
    states.forEach((state, clientId) => {
      console.log(`[Collab] State for client ${clientId}:`, state);
      
      if (clientId === myClientId) return;
      
      if (state.user) {
        const heartbeat = state.heartbeat;
        const lastSeen = heartbeat?.timestamp || now; // Default to now for new users
        const timeSinceLastSeen = now - lastSeen;
        const isTimedOut = timeSinceLastSeen > CONNECTION_TIMEOUT;
        
        console.log(`[Collab] User ${state.user.name} - lastSeen: ${timeSinceLastSeen}ms ago, timedOut: ${isTimedOut}`);
        
        if (!isTimedOut) {
          activeUsers.push({
            ...state.user,
            clientId,
            cursor: state.cursor,
            lastSeen,
            isActive: heartbeat?.isActive ?? true,
          });
          
          // Lưu cursor position nếu có
          if (state.cursor && state.cursor.x !== undefined && state.cursor.y !== undefined) {
            cursors[clientId] = {
              ...state.cursor,
              user: state.user,
              clientId,
            };
            console.log(`[Collab] Cursor for ${state.user.name}:`, state.cursor);
          }
        }
      }
    });
    
    console.log(`[Collab] Active users: ${activeUsers.length}`, activeUsers.map(u => u.name));
    console.log(`[Collab] Remote cursors:`, Object.keys(cursors).length);
    
    setCollaborators(activeUsers);
    setRemoteCursors(cursors);
    remoteCursorsRef.current = cursors;
    
    // Kiểm tra nếu là người dùng cuối cùng
    const totalActiveUsers = activeUsers.length + 1; // +1 cho current user
    setIsLastUser(totalActiveUsers <= 1);
  }, []);

  // Khởi tạo WebSocket provider (có fallback endpoint với giới hạn reconnect)
  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;
    let hasConnectedOnce = false;

    const endpoints = [
      import.meta?.env?.VITE_YJS_WS?.trim() || "wss://yjs.mattb.tech",
      "wss://y-websocket.productionready.workers.dev",
      "wss://demos.yjs.dev",
    ];

    const cleanupProvider = () => {
      if (providerRef.current) {
        try {
          // Ngắt kết nối trước khi destroy
          providerRef.current.disconnect();
          providerRef.current.off("status", providerRef.current.__statusHandler);
          providerRef.current.awareness?.off("change", providerRef.current.__awarenessHandler);
          providerRef.current.destroy();
        } catch (e) {
          // ignore
        }
        providerRef.current = null;
      }
    };

    const connect = (index) => {
      // Prevent multiple simultaneous connection attempts
      if (isConnectingRef.current || !isMounted) return;
      
      // Kiểm tra giới hạn reconnect attempts
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS * endpoints.length) {
        console.warn("[Collab] Max reconnect attempts reached, stopping reconnection");
        setConnectionStatus("disconnected");
        setIsConnected(false);
        return;
      }

      isConnectingRef.current = true;
      const url = endpoints[index % endpoints.length];
      wsEndpointIndexRef.current = index % endpoints.length;

      console.log(`[Collab] Attempting to connect to: ${url}, Room: baogia-cova-${roomId}`);

      // Cleanup provider cũ
      cleanupProvider();

      // Đợi một chút trước khi tạo connection mới
      const wsProvider = new WebsocketProvider(
        url,
        `baogia-cova-${roomId}`,
        ydoc,
        { connect: false } // Không connect ngay, để có thể setup handlers trước
      );

      providerRef.current = wsProvider;
      awarenessRef.current = wsProvider.awareness;
      
      console.log(`[Collab] WebSocket provider created, awaiting connection...`);

      const handleStatus = ({ status }) => {
        if (!isMounted) return;
        
        console.log(`[Collab] WebSocket status changed: ${status} (endpoint: ${url})`);
        
        const connected = status === "connected";
        setIsConnected(connected);
        setConnectionStatus(connected ? "connected" : "connecting");

        if (connected) {
          // Reset reconnect attempts khi kết nối thành công
          reconnectAttemptsRef.current = 0;
          hasConnectedOnce = true;
          isConnectingRef.current = false;
          
          console.log(`[Collab] Connected! ClientID: ${wsProvider.awareness.clientID}, Room: baogia-cova-${roomId}`);
          
          // Set user + heartbeat sau khi connected
          // Lấy currentUser mới nhất từ state
          setCurrentUser(prevUser => {
            wsProvider.awareness.setLocalStateField("user", prevUser);
            console.log('[Collab] Set user in awareness:', prevUser);
            return prevUser;
          });
          
          wsProvider.awareness.setLocalStateField("heartbeat", {
            timestamp: Date.now(),
            isActive: true,
          });
          
          // Kiểm tra collaborators ngay khi kết nối
          setTimeout(() => checkCollaboratorsPresence(), 500);
        } else if (status === "disconnected" && hasConnectedOnce) {
          // Chỉ thử reconnect nếu đã từng kết nối thành công
          isConnectingRef.current = false;
          reconnectAttemptsRef.current++;
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          // Exponential backoff với delay tối đa 10 giây
          const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current % MAX_RECONNECT_ATTEMPTS), 10000);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted && !isConnectingRef.current) {
              connect(wsEndpointIndexRef.current + 1);
            }
          }, delay);
        }
      };

      const handleAwarenessChange = ({ added, updated, removed }) => {
        if (!isMounted) return;
        console.log('[Collab] Awareness changed - added:', added, 'updated:', updated, 'removed:', removed);
        checkCollaboratorsPresence();
      };

      // Lưu lại handler để cleanup an toàn
      wsProvider.__statusHandler = handleStatus;
      wsProvider.__awarenessHandler = handleAwarenessChange;

      wsProvider.on("status", handleStatus);
      wsProvider.awareness.on("change", handleAwarenessChange);
      
      // Connect sau khi đã setup handlers
      setProvider(wsProvider);
      wsProvider.connect();
      
      // Timeout cho lần kết nối đầu tiên
      setTimeout(() => {
        if (!wsProvider.wsconnected && isMounted && !hasConnectedOnce) {
          isConnectingRef.current = false;
          reconnectAttemptsRef.current++;
          
          // Thử endpoint tiếp theo
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) {
              connect(wsEndpointIndexRef.current + 1);
            }
          }, RECONNECT_DELAY);
        }
      }, 5000); // 5 giây timeout cho kết nối đầu tiên
    };

    // Heartbeat & presence timers
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    presenceCheckIntervalRef.current = setInterval(checkCollaboratorsPresence, PRESENCE_CHECK_INTERVAL);
    setTimeout(checkCollaboratorsPresence, 1000);

    // Bắt đầu kết nối với endpoint đầu tiên
    reconnectAttemptsRef.current = 0;
    isConnectingRef.current = false;
    connect(wsEndpointIndexRef.current);

    return () => {
      isMounted = false;
      isLeavingRef.current = true;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (presenceCheckIntervalRef.current) {
        clearInterval(presenceCheckIntervalRef.current);
        presenceCheckIntervalRef.current = null;
      }

      cleanupProvider();

      // Không destroy ydoc ở đây vì nó được tạo với useState
    };
  }, [roomId]);

  // Cập nhật thông tin user vào awareness khi đổi tên/màu
  useEffect(() => {
    if (awarenessRef.current) {
      awarenessRef.current.setLocalStateField("user", currentUser);
    }
  }, [currentUser]);

  // Xử lý visibility change (tab hidden/visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Tab được focus lại, gửi heartbeat ngay
        sendHeartbeat();
        checkCollaboratorsPresence();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sendHeartbeat, checkCollaboratorsPresence]);

  // Xử lý beforeunload với logic cải thiện
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Kiểm tra xem người dùng có phải là người cuối cùng không
      if (isLastUser && !isLeavingRef.current) {
        // Hiển thị cảnh báo trình duyệt native
        e.preventDefault();
        e.returnValue = "Bạn là người cuối cùng trong phòng. Dữ liệu sẽ bị mất nếu bạn rời đi.";
        return e.returnValue;
      }
    };

    const handleUnload = () => {
      // Đánh dấu là đang rời đi và clear awareness
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

    // Shared data maps
    const yCustomerName = ydoc.getText("customerName");
    const yProjectDescription = ydoc.getText("projectDescription");
    const yQuotationItems = ydoc.getArray("quotationItems");
    const yPaymentTerms = ydoc.getArray("paymentTerms");
    const yCompanyInfo = ydoc.getMap("companyInfo");

    // Observers
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

    // Initial values
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

  // Cập nhật vị trí cursor (mouse position) cho real-time collaboration
  const updateCursorPosition = useCallback(
    (position) => {
      if (awarenessRef.current && !isLeavingRef.current) {
        const cursorData = {
          x: position.x,
          y: position.y,
          timestamp: Date.now(),
        };
        awarenessRef.current.setLocalStateField("cursor", cursorData);
      }
    },
    []
  );

  // Xóa cursor khi mouse rời khỏi viewport
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
  const handleLastUserLeave = useCallback((action = 'navigate') => {
    if (isLastUser) {
      setPendingLeaveAction(action);
      setShowLastUserWarning(true);
      return true;
    }
    return false;
  }, [isLastUser]);

  const confirmLeave = useCallback(() => {
    isLeavingRef.current = true;
    setShowLastUserWarning(false);
    
    // Clear awareness trước khi rời đi
    if (awarenessRef.current) {
      awarenessRef.current.setLocalState(null);
    }
    
    setPendingLeaveAction(null);
    return true;
  }, []);

  const cancelLeave = useCallback(() => {
    setShowLastUserWarning(false);
    setPendingLeaveAction(null);
    
    // Gửi heartbeat để xác nhận vẫn còn ở đây
    sendHeartbeat();
  }, [sendHeartbeat]);

  // Force disconnect (khi cần kiểm tra lại kết nối)
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

  const value = {
    // Connection
    isConnected,
    connectionStatus,
    roomId,
    provider,
    ydoc,

    // User info
    currentUser,
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

    // Remote cursors tracking (Figma-style)
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
