import { createContext, useContext, useState, useEffect } from "react";
import { logout, getMe } from "../services/api";
import { useLocation } from "react-router-dom";
const PUBLIC_ROUTES = ["/login", "/admin/login", "/"] 

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [ready, setReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
     if (PUBLIC_ROUTES.includes(location.pathname)) {
      setReady(true);
      return;
    }
    getMe()
      .then((d) => {
        setUser(d.data.user);
        setRole(d.data.role);
      })
      .catch(() => {
        setUser(null);
        setRole(null);
      })
      .finally(() => setReady(true));
  }, []);

  const login = (token, userData, userRole) => {
    setUser(userData);
    setRole(userRole);
  };

  const Logout = () => {
    logout().catch((err) => {
      console.error("Failed to logout from server", err);
    });
    setUser(null);
    setRole(null);
  };

  const isAdmin = role && role !== "author";
  const isAuthor = role === "author";

  return (
    <AuthCtx.Provider
      value={{ user, role, isAdmin, isAuthor, login, Logout, ready }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
