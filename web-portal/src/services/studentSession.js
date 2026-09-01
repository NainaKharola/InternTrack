const STUDENT_SESSION_KEY = "webPortalStudentSession";

export function getStudentSession() {
  const value = sessionStorage.getItem(STUDENT_SESSION_KEY);
  return value ? JSON.parse(value) : null;
}

export function setStudentSession(credentials) {
  sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(credentials));
}

export function clearStudentSession() {
  sessionStorage.removeItem(STUDENT_SESSION_KEY);
  const API_URL = import.meta.env.VITE_API_URL || "/api";
  fetch(`${API_URL}/students/logout`, { method: "POST" }).catch(() => {});
}
