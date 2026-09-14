import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { clearAdminToken, getAdminProfile, getAdminToken } from "../services/adminService";
import { AdminAuthContext } from "./AdminAuthContext";

export function AdminAuthProvider({ children }) {
  const [state, setState] = useState({ checking: true, authenticated: false, admin: null });
  const isValidating = useRef(false);

  const validateSession = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      setState({ checking: false, authenticated: false, admin: null });
      return;
    }

    if (isValidating.current) return;
    isValidating.current = true;

    setState((current) => ({ ...current, checking: true }));
    try {
      if (import.meta.env.DEV) console.log("[AdminAuth] Validating session via /auth/me...");
      const response = await getAdminProfile();
      setState({ checking: false, authenticated: true, admin: response.admin });
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[AdminAuth] Session validation failed:", err.message);
      clearAdminToken(false);
      setState({ checking: false, authenticated: false, admin: null });
    } finally {
      isValidating.current = false;
    }
  }, []);

  useEffect(() => {
    validateSession();
    const onAuthChange = () => {
      validateSession();
    };
    window.addEventListener("admin-auth-changed", onAuthChange);
    return () => window.removeEventListener("admin-auth-changed", onAuthChange);
  }, [validateSession]);

  const value = useMemo(() => ({ ...state, validateSession }), [state, validateSession]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
