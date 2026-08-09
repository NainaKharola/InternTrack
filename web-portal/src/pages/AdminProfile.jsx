import { useState, useEffect } from "react";
import { useAdminAuth } from "../auth/useAdminAuth";
import {
  changeAdminPassword,
  createSubUser,
  listSubUsers,
  deleteSubUser,
  createSubUserPassword,
  fetchUserActivityLog,
  downloadUserActivityExport,
  setupRecoveryInfo,
} from "../services/adminService";
import "../styles/admin.css";

export default function AdminProfile() {
  const { admin, checking, validateSession } = useAdminAuth();

  // Load User List
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  const isMainAdmin = admin?.role === "MAIN_ADMIN";

  // Banners / Toast Notifications
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Modals Visibility
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isCreatePassOpen, setIsCreatePassOpen] = useState(false);
  const [userToReset, setUserToReset] = useState(null);
  const [resetPassForm, setResetPassForm] = useState({ newPassword: "", confirmPassword: "" });
  const [resetPassError, setResetPassError] = useState("");
  const [resetPassLoading, setResetPassLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Form States - Change Password
  const [changePassForm, setChangePassForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [changePassLoading, setChangePassLoading] = useState(false);
  const [changePassError, setChangePassError] = useState("");

  // Secret Recovery States
  const [secretQuestion, setSecretQuestion] = useState("");
  const [secretAnswer, setSecretAnswer] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Form States - Add User
  const [addUserForm, setAddUserForm] = useState({
    name: "",
    email: ""
  });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState("");

  // Form States - Create User Password
  const [createPassForm, setCreatePassForm] = useState({
    userId: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showCreateNewPass, setShowCreateNewPass] = useState(false);
  const [showCreateConfirmPass, setShowCreateConfirmPass] = useState(false);
  const [createPassLoading, setCreatePassLoading] = useState(false);
  const [createPassError, setCreatePassError] = useState("");

  // Activity Log States
  const [selectedLogUser, setSelectedLogUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [activityDateFilter, setActivityDateFilter] = useState("");
  const [activityModuleFilter, setActivityModuleFilter] = useState("");
  const [activityActionFilter, setActivityActionFilter] = useState("");
  const [exportBusy, setExportBusy] = useState("");

  const handleOpenActivityLog = async (row) => {
    setSelectedLogUser(row);
    setActivityLoading(true);
    setActivityError("");
    setActivities([]);
    setActivitySearch("");
    setActivityDateFilter("");
    setActivityModuleFilter("");
    setActivityActionFilter("");
    try {
      const response = await fetchUserActivityLog(row.id || row._id);
      setActivities(response.logs || []);
    } catch (err) {
      setActivityError(err.message || "Failed to load activity logs.");
    } finally {
      setActivityLoading(false);
    }
  };

  const handleExportActivity = async (format) => {
    if (!selectedLogUser) return;
    setExportBusy(format);
    try {
      const blob = await downloadUserActivityExport(selectedLogUser.id || selectedLogUser._id, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Activity-Log-${selectedLogUser.name.replace(/\s+/g, "_")}.${format === "excel" ? "csv" : "pdf"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || "Failed to export activity logs.");
    } finally {
      setExportBusy("");
    }
  };

  const formatLogTimestamp = (isoString) => {
    if (!isoString) return { date: "-", time: "-" };
    const dt = new Date(isoString);
    if (isNaN(dt.getTime())) return { date: "-", time: "-" };
    const dateStr = dt.toLocaleDateString("en-GB").replace(/\//g, "-");
    const timeStr = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return { date: dateStr, time: timeStr };
  };

  const uniqueModules = [...new Set(activities.map(log => log.module).filter(Boolean))];
  const uniqueActions = [...new Set(activities.map(log => log.action).filter(Boolean))];

  const filteredActivities = activities.filter((log) => {
    const { date } = formatLogTimestamp(log.timestamp);
    const matchesSearch =
      (log.description || "").toLowerCase().includes(activitySearch.toLowerCase()) ||
      (log.action || "").toLowerCase().includes(activitySearch.toLowerCase()) ||
      (log.module || "").toLowerCase().includes(activitySearch.toLowerCase());

    const matchesDate = !activityDateFilter || date === activityDateFilter.split("-").reverse().join("-");
    const matchesModule = !activityModuleFilter || log.module === activityModuleFilter;
    const matchesAction = !activityActionFilter || log.action === activityActionFilter;

    return matchesSearch && matchesDate && matchesModule && matchesAction;
  });

  // Load User List
  const loadUsers = async () => {
    if (!isMainAdmin) return;
    setUsersLoading(true);
    setUsersError("");
    try {
      const response = await listSubUsers();
      setUsers(response.users || []);
    } catch (err) {
      setUsersError(err.message || "Failed to load user list.");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [isMainAdmin]);

  // Clean messages after a few seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  if (checking || !admin) {
    return (
      <main className="admin-console admin-shell administration-page">
        <div className="administration-loading">
          <span className="administration-spinner" /> Loading profile...
        </div>
      </main>
    );
  }

  if (admin.role !== "MAIN_ADMIN") {
    return (
      <main className="admin-console admin-shell administration-page">
        <div className="admin-error" style={{ margin: "40px auto", maxWidth: "500px", padding: "20px", borderRadius: "8px", border: "1px solid var(--border)", background: "#fff", textAlign: "center" }}>
          <h2 style={{ color: "#d32f2f", marginBottom: "10px" }}>Access Denied</h2>
          <p>You are not authorized to access this resource.</p>
          <button className="admin-secondary-btn" onClick={navigateBack} style={{ marginTop: "20px" }}>
            Go back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  // Handle Change Password Form
  const handleChangePassSubmit = async (e) => {
    e.preventDefault();
    setChangePassError("");

    const { oldPassword, newPassword, confirmPassword } = changePassForm;

    if (!oldPassword || !newPassword || !confirmPassword) {
      setChangePassError("All fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setChangePassError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePassError("New password and confirm password do not match.");
      return;
    }
    if (oldPassword === newPassword) {
      setChangePassError("New password cannot be the same as the old password.");
      return;
    }

    setChangePassLoading(true);
    try {
      await changeAdminPassword({ oldPassword, newPassword, confirmPassword });
      setSuccessMsg("Password updated successfully.");
      setIsChangePassOpen(false);
      setChangePassForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setChangePassError(err.message || "Failed to update password.");
    } finally {
      setChangePassLoading(false);
    }
  };

    useEffect(() => {
    if (admin?.secretQuestion) {
      setSecretQuestion(admin.secretQuestion);
    }
  }, [admin]);

  const handleSaveRecovery = async (e) => {
    e.preventDefault();
    if (!secretQuestion.trim()) {
      setErrorMsg("Secret question is required.");
      return;
    }
    if (!admin?.recoverySetup && !secretAnswer.trim()) {
      setErrorMsg("Secret answer is required.");
      return;
    }
    setRecoveryLoading(true);
    try {
      await setupRecoveryInfo({ secretQuestion, secretAnswer });
      setSuccessMsg("Password recovery settings updated successfully.");
      setSecretAnswer("");
      await validateSession();
    } catch (err) {
      setErrorMsg(err.message || "Failed to save password recovery settings.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Handle Add User Form
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setAddUserError("");

    const { name, email } = addUserForm;

    if (!name || !email) {
      setAddUserError("All fields are required.");
      return;
    }

    setAddUserLoading(true);
    try {
      await createSubUser({ name, email });
      setSuccessMsg("Sub-user created successfully.");
      setIsAddUserOpen(false);
      setAddUserForm({ name: "", email: "" });
      loadUsers();
    } catch (err) {
      setAddUserError(err.message || "Failed to create user.");
    } finally {
      setAddUserLoading(false);
    }
  };

  // Handle Create User Password Form
  const handleCreatePassSubmit = async (e) => {
    e.preventDefault();
    setCreatePassError("");

    const { userId, newPassword, confirmPassword } = createPassForm;

    if (!userId || !newPassword || !confirmPassword) {
      setCreatePassError("All fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setCreatePassError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setCreatePassError("Passwords do not match.");
      return;
    }

    setCreatePassLoading(true);
    try {
      await createSubUserPassword(userId, { newPassword, confirmPassword });
      setSuccessMsg("Password created successfully for the user.");
      setIsCreatePassOpen(false);
      setCreatePassForm({ userId: "", newPassword: "", confirmPassword: "" });
      loadUsers();
    } catch (err) {
      setCreatePassError(err.message || "Failed to set password.");
    } finally {
      setCreatePassLoading(false);
    }
  };

  const handleResetPassSubmit = async (event) => {
    event.preventDefault();
    setResetPassError("");
    if (!resetPassForm.newPassword || !resetPassForm.confirmPassword) return setResetPassError("All fields are required.");
    if (resetPassForm.newPassword.length < 8) return setResetPassError("Password must be at least 8 characters long.");
    if (resetPassForm.newPassword !== resetPassForm.confirmPassword) return setResetPassError("Passwords do not match.");
    setResetPassLoading(true);
    try {
      await createSubUserPassword(userToReset.id || userToReset._id, resetPassForm);
      setSuccessMsg("Password reset successfully for the user.");
      setUserToReset(null);
      setResetPassForm({ newPassword: "", confirmPassword: "" });
      loadUsers();
    } catch (err) { setResetPassError(err.message || "Failed to reset password."); }
    finally { setResetPassLoading(false); }
  };

  // Handle Delete Sub User
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await deleteSubUser(userToDelete._id || userToDelete.id);
      setSuccessMsg("User deleted successfully.");
      setUserToDelete(null);
      loadUsers();
    } catch (err) {
      setErrorMsg(err.message || "Failed to delete user.");
      setUserToDelete(null);
    }
  };

  const navigateBack = () => {
    window.history.pushState({}, "", "/admin/administration");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <main className="admin-console admin-shell administration-page">
      <header className="admin-topbar administration-topbar">
        <div>
          <p className="portal-eyebrow">Admin Panel</p>
          <h1>Admin Profile</h1>
          <p className="administration-subtitle">Manage your account settings and user access controls.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="admin-secondary-btn" type="button" onClick={navigateBack}>Back to Dashboard</button>
          <button className="admin-secondary-btn" type="button" onClick={() => { window.history.pushState({}, "", "/admin/dashboard"); window.dispatchEvent(new PopStateEvent("popstate")); }}>🏠 Home</button>
        </div>
      </header>

      {successMsg && <div className="administration-toast administration-toast--success" role="status">✓ {successMsg}</div>}
      {errorMsg && <div className="administration-toast administration-toast--error" role="alert">{errorMsg}</div>}

      <div className="administration-grid" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

        {/* Profile Card */}
        <section className="administration-card">
          <div className="administration-card__heading">
            <span className="administration-icon" aria-hidden="true">👤</span>
            <div>
              <h2>Profile Details</h2>
              <p>Your admin account identification.</p>
            </div>
          </div>
          <div className="admin-control-grid" style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            <label className="admin-field">
              <span>Full Name</span>
              <input value={admin?.name || ""} disabled style={{ background: "#f5f8fb", cursor: "not-allowed" }} />
            </label>
            <label className="admin-field">
              <span>Email Address</span>
              <input value={admin?.email || ""} disabled style={{ background: "#f5f8fb", cursor: "not-allowed" }} />
            </label>
          </div>
          <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
            <button className="admin-primary-btn" type="button" onClick={() => setIsChangePassOpen(true)}>
              Change Password
            </button>
          </div>
        </section>

        {/* Security Recovery Card */}
        <section className="administration-card">
          <div className="administration-card__heading">
            <span className="administration-icon" aria-hidden="true">🔒</span>
            <div>
              <h2>Password Recovery Setup</h2>
              <p>Configure a secret question and answer to recover your password if forgotten.</p>
            </div>
          </div>
          <form onSubmit={handleSaveRecovery} style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "16px", maxWidth: "500px" }}>
            <label className="admin-field">
              <span>Secret Question</span>
              <input
                type="text"
                placeholder="e.g. What was the name of your first school?"
                value={secretQuestion}
                onChange={(e) => setSecretQuestion(e.target.value)}
                required
              />
            </label>
            <label className="admin-field">
              <span>Secret Answer</span>
              <input
                type="password"
                placeholder={admin?.recoverySetup ? "Leave blank to keep existing or enter new answer" : "Enter answer"}
                value={secretAnswer}
                onChange={(e) => setSecretAnswer(e.target.value)}
                required={!admin?.recoverySetup}
              />
            </label>
            <div>
              <button className="admin-primary-btn" type="submit" disabled={recoveryLoading}>
                {recoveryLoading ? "Saving..." : "Save Recovery Details"}
              </button>
            </div>
          </form>
        </section>

        {isMainAdmin && (
          <>
            {/* User Management Card */}
            <section className="administration-card">
              <div className="administration-card__heading">
                <span className="administration-icon" aria-hidden="true">👥</span>
                <div>
                  <h2>User Management</h2>
                  <p>Create and manage sub-users with administrative access.</p>
                </div>
              </div>

              <div className="recommendation-toolbar" style={{ marginTop: "20px" }}>
                <p>Register additional sub-user admin accounts to delegate application reviews.</p>
                <button className="admin-primary-btn" type="button" onClick={() => setIsAddUserOpen(true)}>
                  + Add User
                </button>
              </div>

              {usersLoading ? (
                <div className="administration-loading"><span className="administration-spinner" /> Loading users...</div>
              ) : usersError ? (
                <div className="analytics-empty"><span aria-hidden="true">!</span><p>{usersError}</p></div>
              ) : (
                <div className="recommendation-table-wrap" style={{ marginTop: "16px" }}>
                  <table className="recommendation-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th>Serial No.</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Password Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((row, index) => {
                        const isPermanent = row.email === "naina@gmail.com" || row.email === "vaibhav@gmail.com";
                        return (
                          <tr key={row.id || row.email}>
                            <td>{index + 1}</td>
                            <td><strong>{row.name}</strong></td>
                            <td>{row.email}</td>
                            <td>{row.role === "MAIN_ADMIN" ? "Main Admin" : "Sub Admin"}</td>
                            <td>
                              <span style={{
                                color: row.passwordStatus === "Password Created" ? "#17633f" : "#a86c00",
                                background: row.passwordStatus === "Password Created" ? "#d7f0e1" : "#fdf3d7",
                                padding: "2px 8px",
                                borderRadius: "999px",
                                fontSize: "0.78rem",
                                fontWeight: "bold"
                              }}>
                                {row.passwordStatus}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                {row.role !== "MAIN_ADMIN" && (
                                  <button className="admin-secondary-btn admin-icon-button" style={{ padding: "4px 8px", fontSize: "0.85rem" }} type="button" onClick={() => { setUserToReset(row); setResetPassError(""); }}>
                                    Reset Password
                                  </button>
                                )}
                                {row.role !== "MAIN_ADMIN" && (
                                  <button
                                    className="admin-secondary-btn admin-icon-button"
                                    style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                                    type="button"
                                    onClick={() => handleOpenActivityLog(row)}
                                  >
                                    View Activity
                                  </button>
                                )}
                                {!isPermanent ? (
                                  <button
                                    className="admin-danger-btn admin-icon-button"
                                    style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                                    type="button"
                                    onClick={() => setUserToDelete(row)}
                                  >
                                    Delete
                                  </button>
                                ) : (
                                  <span style={{ color: "#7a94b5", fontSize: "0.85rem", fontStyle: "italic" }}>Permanent</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center" }}>No admin users registered.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Create Password Card */}
            <section className="administration-card">
              <div className="administration-card__heading">
                <span className="administration-icon" aria-hidden="true">🔑</span>
                <div>
                  <h2>Create Password for Users</h2>
                  <p>Set or update credentials for active sub-user accounts.</p>
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <button className="admin-primary-btn" type="button" onClick={() => setIsCreatePassOpen(true)}>
                  Create Password for User
                </button>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Change Password Modal */}
      {isChangePassOpen && (
        <div className="administration-dialog-backdrop" role="presentation">
          <form className="administration-dialog" onSubmit={handleChangePassSubmit} style={{ maxWidth: "420px" }}>
            <h2>Change Password</h2>
            <p>Update your personal account credentials.</p>

            {changePassError && <p className="admin-error" style={{ marginBottom: "12px" }}>{changePassError}</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label className="admin-field" style={{ position: "relative" }}>
                <span>Old Password</span>
                <input
                  type={showOldPass ? "text" : "password"}
                  value={changePassForm.oldPassword}
                  onChange={(e) => setChangePassForm({ ...changePassForm, oldPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  style={{ position: "absolute", right: "12px", bottom: "8px", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}
                  aria-label={showOldPass ? "Hide password" : "Show password"}
                >
                  {showOldPass ? "👁️" : "👁️‍🗨️"}
                </button>
              </label>

              <label className="admin-field" style={{ position: "relative" }}>
                <span>New Password</span>
                <input
                  type={showNewPass ? "text" : "password"}
                  value={changePassForm.newPassword}
                  onChange={(e) => setChangePassForm({ ...changePassForm, newPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  style={{ position: "absolute", right: "12px", bottom: "8px", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}
                  aria-label={showNewPass ? "Hide password" : "Show password"}
                >
                  {showNewPass ? "👁️" : "👁️‍🗨️"}
                </button>
              </label>

              <label className="admin-field" style={{ position: "relative" }}>
                <span>Confirm New Password</span>
                <input
                  type={showConfirmPass ? "text" : "password"}
                  value={changePassForm.confirmPassword}
                  onChange={(e) => setChangePassForm({ ...changePassForm, confirmPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  style={{ position: "absolute", right: "12px", bottom: "8px", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}
                  aria-label={showConfirmPass ? "Hide password" : "Show password"}
                >
                  {showConfirmPass ? "👁️" : "👁️‍🗨️"}
                </button>
              </label>
            </div>

            <div className="administration-dialog__actions" style={{ marginTop: "20px" }}>
              <button className="admin-secondary-btn" type="button" onClick={() => { setIsChangePassOpen(false); setChangePassError(""); }}>
                Cancel
              </button>
              <button className="admin-primary-btn" type="submit" disabled={changePassLoading}>
                {changePassLoading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="administration-dialog-backdrop" role="presentation">
          <form className="administration-dialog" onSubmit={handleAddUserSubmit} style={{ maxWidth: "420px" }}>
            <h2>Add Sub-User</h2>
            <p>Register a new administrator. Password configuration is done separately.</p>

            {addUserError && <p className="admin-error" style={{ marginBottom: "12px" }}>{addUserError}</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label className="admin-field">
                <span>Full Name</span>
                <input
                  type="text"
                  value={addUserForm.name}
                  onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  required
                />
              </label>

              <label className="admin-field">
                <span>Email Address</span>
                <input
                  type="email"
                  value={addUserForm.email}
                  onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                  required
                />
              </label>
            </div>

            <div className="administration-dialog__actions" style={{ marginTop: "20px" }}>
              <button className="admin-secondary-btn" type="button" onClick={() => { setIsAddUserOpen(false); setAddUserError(""); }}>
                Cancel
              </button>
              <button className="admin-primary-btn" type="submit" disabled={addUserLoading}>
                {addUserLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Password Modal */}
      {isCreatePassOpen && (
        <div className="administration-dialog-backdrop" role="presentation">
          <form className="administration-dialog" onSubmit={handleCreatePassSubmit} style={{ maxWidth: "420px" }}>
            <h2>Create Password for User</h2>
            <p>Set a new password for active sub-user accounts.</p>

            {createPassError && <p className="admin-error" style={{ marginBottom: "12px" }}>{createPassError}</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label className="admin-field">
                <span>Select User</span>
                <select
                  value={createPassForm.userId}
                  onChange={(e) => setCreatePassForm({ ...createPassForm, userId: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #dbe7f4" }}
                  required
                >
                  <option value="">-- Choose Active Sub-User --</option>
                  {users
                    .filter(u => u.role === "SUB_ADMIN")
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))
                  }
                </select>
              </label>

              <label className="admin-field" style={{ position: "relative" }}>
                <span>Password</span>
                <input
                  type={showCreateNewPass ? "text" : "password"}
                  value={createPassForm.newPassword}
                  onChange={(e) => setCreatePassForm({ ...createPassForm, newPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCreateNewPass(!showCreateNewPass)}
                  style={{ position: "absolute", right: "12px", bottom: "8px", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}
                  aria-label={showCreateNewPass ? "Hide password" : "Show password"}
                >
                  {showCreateNewPass ? "👁" : "👁️‍🗨️"}
                </button>
              </label>

              <label className="admin-field" style={{ position: "relative" }}>
                <span>Confirm Password</span>
                <input
                  type={showCreateConfirmPass ? "text" : "password"}
                  value={createPassForm.confirmPassword}
                  onChange={(e) => setCreatePassForm({ ...createPassForm, confirmPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCreateConfirmPass(!showCreateConfirmPass)}
                  style={{ position: "absolute", right: "12px", bottom: "8px", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}
                  aria-label={showCreateConfirmPass ? "Hide password" : "Show password"}
                >
                  {showCreateConfirmPass ? "👁" : "👁️‍🗨️"}
                </button>
              </label>
            </div>

            <div className="administration-dialog__actions" style={{ marginTop: "20px" }}>
              <button className="admin-secondary-btn" type="button" onClick={() => { setIsCreatePassOpen(false); setCreatePassError(""); }}>
                Cancel
              </button>
              <button className="admin-primary-btn" type="submit" disabled={createPassLoading}>
                {createPassLoading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {userToReset && <div className="administration-dialog-backdrop" role="presentation"><form className="administration-dialog" onSubmit={handleResetPassSubmit} style={{ maxWidth: "420px" }}><h2>Reset Password for Users</h2><p>Reset the password for <strong>{userToReset.name}</strong>.</p>{resetPassError && <p className="admin-error">{resetPassError}</p>}<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}><label className="admin-field"><span>New Password</span><input type="password" value={resetPassForm.newPassword} onChange={(event) => setResetPassForm({ ...resetPassForm, newPassword: event.target.value })} required /></label><label className="admin-field"><span>Confirm Password</span><input type="password" value={resetPassForm.confirmPassword} onChange={(event) => setResetPassForm({ ...resetPassForm, confirmPassword: event.target.value })} required /></label></div><div className="administration-dialog__actions" style={{ marginTop: "20px" }}><button className="admin-secondary-btn" type="button" onClick={() => setUserToReset(null)}>Cancel</button><button className="admin-primary-btn" type="submit" disabled={resetPassLoading}>{resetPassLoading ? "Saving..." : "Reset Password"}</button></div></form></div>}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="administration-dialog-backdrop" role="presentation">
          <div className="administration-dialog" style={{ maxWidth: "400px" }}>
            <h2>Are you sure?</h2>
            <p>You are about to delete sub-user <strong>{userToDelete.name}</strong> ({userToDelete.email}). This action cannot be undone, and they will immediately lose access.</p>
            <div className="administration-dialog__actions" style={{ marginTop: "20px" }}>
              <button className="admin-secondary-btn" type="button" onClick={() => setUserToDelete(null)}>
                Cancel
              </button>
              <button className="admin-danger-btn" type="button" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Modal */}
      {selectedLogUser && (
        <div className="administration-dialog-backdrop" role="presentation">
          <div className="administration-dialog" style={{ maxWidth: "1000px", width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0 }}>User Activity Log</h2>
                <p style={{ margin: "4px 0 0 0", color: "#5c7594", fontSize: "0.9rem" }}>
                  Viewing activity history for <strong>{selectedLogUser.name}</strong> ({selectedLogUser.email})
                </p>
              </div>
              <button
                className="admin-secondary-btn"
                type="button"
                onClick={() => setSelectedLogUser(null)}
                style={{ padding: "4px 12px" }}
              >
                Close
              </button>
            </div>

            {/* Toolbar for Search & Filters & Export */}
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "flex-end",
              backgroundColor: "#f5f8fb",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "16px"
            }}>
              <label className="admin-field" style={{ flex: "1 1 200px" }}>
                <span>Search Description/Action/Module</span>
                <input
                  type="text"
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Type to search..."
                />
              </label>

              <label className="admin-field" style={{ width: "150px" }}>
                <span>Filter by Date</span>
                <input
                  type="date"
                  value={activityDateFilter}
                  onChange={(e) => setActivityDateFilter(e.target.value)}
                />
              </label>

              <label className="admin-field" style={{ width: "180px" }}>
                <span>Filter by Module</span>
                <select
                  value={activityModuleFilter}
                  onChange={(e) => setActivityModuleFilter(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #dbe7f4" }}
                >
                  <option value="">All Modules</option>
                  {uniqueModules.map(mod => (
                    <option key={mod} value={mod}>{mod}</option>
                  ))}
                </select>
              </label>

              <label className="admin-field" style={{ width: "180px" }}>
                <span>Filter by Action</span>
                <select
                  value={activityActionFilter}
                  onChange={(e) => setActivityActionFilter(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #dbe7f4" }}
                >
                  <option value="">All Actions</option>
                  {uniqueActions.map(act => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </label>

              <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
                <button
                  className="admin-primary-btn"
                  type="button"
                  disabled={!!exportBusy || activities.length === 0}
                  onClick={() => handleExportActivity("pdf")}
                >
                  {exportBusy === "pdf" ? "Exporting..." : "Export PDF"}
                </button>
                <button
                  className="admin-secondary-btn"
                  type="button"
                  disabled={!!exportBusy || activities.length === 0}
                  onClick={() => handleExportActivity("excel")}
                >
                  {exportBusy === "excel" ? "Exporting..." : "Export Excel"}
                </button>
              </div>
            </div>

            {/* Activities Table */}
            <div style={{ flex: 1, overflowY: "auto", minHeight: "300px" }}>
              {activityLoading ? (
                <div className="administration-loading" style={{ padding: "60px 0" }}>
                  <span className="administration-spinner" /> Loading activities...
                </div>
              ) : activityError ? (
                <div className="admin-error" style={{ margin: "20px 0" }}>{activityError}</div>
              ) : filteredActivities.length === 0 ? (
                <div className="admin-empty-state" style={{ padding: "60px 0" }}>
                  No activities found matching the filters.
                </div>
              ) : (
                <div className="recommendation-table-wrap">
                  <table className="recommendation-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "5%" }}>S.No.</th>
                        <th style={{ width: "12%" }}>Date</th>
                        <th style={{ width: "10%" }}>Time</th>
                        <th style={{ width: "15%" }}>Module</th>
                        <th style={{ width: "18%" }}>Action</th>
                        <th style={{ width: "30%" }}>Description</th>
                        <th style={{ width: "10%" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivities.map((log, index) => {
                        const { date, time } = formatLogTimestamp(log.timestamp);

                        // Status badge colors
                        let statusColor = "#17633f";
                        let statusBg = "#d7f0e1";
                        if (log.status === "Failed") {
                          statusColor = "#b91c1c";
                          statusBg = "#fde8e8";
                        } else if (log.status === "Warning") {
                          statusColor = "#a86c00";
                          statusBg = "#fdf3d7";
                        }

                        return (
                          <tr key={log.id || log._id || index}>
                            <td>{index + 1}</td>
                            <td>{date}</td>
                            <td>{time}</td>
                            <td><strong>{log.module}</strong></td>
                            <td>{log.action}</td>
                            <td>{log.description}</td>
                            <td>
                              <span style={{
                                color: statusColor,
                                background: statusBg,
                                padding: "2px 8px",
                                borderRadius: "999px",
                                fontSize: "0.78rem",
                                fontWeight: "bold"
                              }}>
                                {log.status || "Success"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
