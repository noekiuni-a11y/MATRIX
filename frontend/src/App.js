import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Catalog from "@/pages/Catalog";
import ItemDetail from "@/pages/ItemDetail";
import AvatarEditor from "@/pages/AvatarEditor";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import { Loader2 } from "lucide-react";

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center matrix-bg">
      <Loader2 className="animate-spin text-slate-400" size={48} />
    </div>
  );
}

function Protected({ children, admin }) {
  const { user, ready } = useAuth();
  if (!ready || user === null) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "admin") return <Navigate to="/catalog" replace />;
  return children;
}

function Shell({ children }) {
  const { user } = useAuth();
  return (
    <>
      {user && <Navbar />}
      {children}
    </>
  );
}

function AppRoutes() {
  const { user, ready } = useAuth();
  return (
    <Shell>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/catalog" replace /> : <Landing />} />
        <Route path="/login" element={user ? <Navigate to="/catalog" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/catalog" replace /> : <Register />} />
        <Route path="/catalog" element={<Protected><Catalog /></Protected>} />
        <Route path="/item/:id" element={<Protected><ItemDetail /></Protected>} />
        <Route path="/avatar" element={<Protected><AvatarEditor /></Protected>} />
        <Route path="/u/:username" element={<Protected><Profile /></Protected>} />
        <Route path="/admin" element={<Protected admin><Admin /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                border: "3px solid #0F172A",
                borderRadius: "12px",
                fontWeight: 800,
                boxShadow: "4px 4px 0px #0F172A",
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
