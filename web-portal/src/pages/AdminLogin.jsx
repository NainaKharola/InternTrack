import { useState } from "react";
import { loginAdmin, setAdminToken, getForgotPasswordQuestions, resetPasswordQuestions } from "../services/adminService";
import "../styles/admin.css";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password States
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotQuestions, setForgotQuestions] = useState([]);
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await loginAdmin({ email, password });
      setAdminToken(response.token);
      window.history.pushState({}, "", "/admin/dashboard");
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail.trim()) {
      setForgotError("Email address is required.");
      return;
    }
    setForgotBusy(true);
    try {
      const response = await getForgotPasswordQuestions(forgotEmail);
      setForgotQuestions(response.questions || []);
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.message || "Failed to fetch security questions.");
    } finally {
      setForgotBusy(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    if (!answer1.trim() || !newPassword || !confirmPassword) {
      setForgotError("All fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setForgotError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }
    setForgotBusy(true);
    try {
      const payload = {
        email: forgotEmail,
        answers: [
          { id: forgotQuestions[0]?.id || "secret", answer: answer1 }
        ],
        newPassword,
        confirmPassword
      };
      await resetPasswordQuestions(payload);
      setForgotSuccess("Password reset successfully. You can now login with your new password.");
      setForgotEmail("");
      setAnswer1("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setIsForgotOpen(false);
        setForgotSuccess("");
        setForgotStep(1);
      }, 3000);
    } catch (err) {
      setForgotError(err.message || "Failed to reset password.");
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <main className="admin-login-shell">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <img src="/drdo-logo.png" alt="DRDO" />
        <div>
          <p className="portal-eyebrow">Internship Management Portal</p>
          <h1>Admin Login</h1>
        </div>

        <label className="admin-field admin-field--wide">
          <span>Email</span>
          <input
            autoComplete="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="admin-field admin-field--wide">
          <span>Password</span>
          <div className="password-input-wrap">
            <input
              autoComplete="current-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button className="password-toggle" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9.3 4.7 10 8-.3 1.3-1.1 2.8-2.3 4.1M6.7 6.7C4.5 8.2 2.6 10.8 2 12c.7 3.3 4.5 8 10 8 1.4 0 2.7-.3 3.9-.8" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
          </div>
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%", marginTop: "-8px", marginBottom: "16px" }}>
          <button type="button" onClick={() => setIsForgotOpen(true)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "0.9rem", fontWeight: "600" }}>
            Forgot Password?
          </button>
        </div>

        {error && <p className="admin-error">{error}</p>}

        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>

      {isForgotOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(6px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 99999,
        }}>
          {forgotStep === 1 ? (
            <form onSubmit={handleVerifyEmail} style={{
              backgroundColor: "#fff",
              padding: "36px",
              borderRadius: "16px",
              width: "450px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}>
              <h2 style={{ margin: 0, fontSize: "1.5rem", color: "var(--primary)" }}>🔑 Forgot Password</h2>
              <p style={{ margin: 0, color: "#475569", fontSize: "0.88rem" }}>
                Enter your registered admin email address to load your security questions.
              </p>
              {forgotError && <p className="admin-error" style={{ margin: 0 }}>{forgotError}</p>}
              
              <label className="admin-field">
                <span>Email Address</span>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </label>

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button className="admin-secondary-btn" type="button" onClick={() => { setIsForgotOpen(false); setForgotError(""); setForgotSuccess(""); }} style={{ flex: 1, height: "40px" }}>
                  Cancel
                </button>
                <button className="admin-primary-btn" type="submit" disabled={forgotBusy} style={{ flex: 1, height: "40px" }}>
                  {forgotBusy ? "Loading..." : "Next"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotSubmit} style={{
              backgroundColor: "#fff",
              padding: "36px",
              borderRadius: "16px",
              width: "450px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}>
              <h2 style={{ margin: 0, fontSize: "1.5rem", color: "var(--primary)" }}>🔑 Verify Answer</h2>
              <p style={{ margin: 0, color: "#475569", fontSize: "0.88rem" }}>
                Answer your secret recovery question to reset your password.
              </p>
              {forgotError && <p className="admin-error" style={{ margin: 0 }}>{forgotError}</p>}
              {forgotSuccess && <p style={{ margin: 0, color: "green", fontSize: "0.9rem", fontWeight: "600" }}>{forgotSuccess}</p>}
              
              <label className="admin-field">
                <span>Secret Question: {forgotQuestions[0]?.question}</span>
                <input
                  type="text"
                  placeholder="Enter answer"
                  value={answer1}
                  onChange={(e) => setAnswer1(e.target.value)}
                  required
                />
              </label>

              <label className="admin-field">
                <span>New Password</span>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </label>

              <label className="admin-field">
                <span>Confirm Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </label>

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button className="admin-secondary-btn" type="button" onClick={() => { setForgotStep(1); setForgotError(""); }} style={{ flex: 1, height: "40px" }}>
                  Back
                </button>
                <button className="admin-primary-btn" type="submit" disabled={forgotBusy} style={{ flex: 1, height: "40px" }}>
                  {forgotBusy ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </main>
  );
}

export default AdminLogin;
