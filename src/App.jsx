import { HashRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import QuotationForm from "./components/QuotationForm";
import RemoteCursors from "./components/RemoteCursors";
import { CollaborationProvider, generateRoomCode } from "./contexts/CollaborationContext";

// Component wrapper để cung cấp collaboration context
const CollaborativeQuotation = () => {
  const { roomId } = useParams();
  
  return (
    <CollaborationProvider roomId={roomId}>
      <QuotationForm />
      <RemoteCursors />
    </CollaborationProvider>
  );
};

// Component tạo phòng mới
const CreateRoom = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(true);

  useEffect(() => {
    // Tạo mã phòng mới và redirect
    const newRoomId = generateRoomCode();
    navigate(`/room/${newRoomId}`, { replace: true });
    setIsCreating(false);
  }, [navigate]);

  if (isCreating) {
    return (
      <div className="min-h-screen bg-primary-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto mb-4"></div>
          <p className="text-primary-dark">Đang tạo phòng báo giá mới...</p>
        </div>
      </div>
    );
  }

  return null;
};

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Trang chính - tạo phòng mới */}
        <Route path="/" element={<CreateRoom />} />
        
        {/* Trang phòng báo giá với mã */}
        <Route path="/room/:roomId" element={<CollaborativeQuotation />} />
        
        {/* Redirect các route không hợp lệ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
