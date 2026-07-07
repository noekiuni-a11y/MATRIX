import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=checking, false=guest, obj=user
  const [ready, setReady] = useState(false);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("matrix_token");
    if (!token) {
      setUser(false);
      setReady(true);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      localStorage.removeItem("matrix_token");
      setUser(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = (token, userObj) => {
    localStorage.setItem("matrix_token", token);
    setUser(userObj);
  };

  const logout = () => {
    localStorage.removeItem("matrix_token");
    setUser(false);
  };

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, ready, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
