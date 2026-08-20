import { useCallback, useEffect, useState, useMemo } from "react";
import {
  addDivision,
  fetchAdministration,
  fetchAdminStudents,
  removeDivision,
  renameDivision,
  updateTotalAllocatedSeats,
  updateNextCertificateNumber,
} from "../services/adminService";
import DivisionBranchVacancyConfiguration from "../components/Admin/DivisionBranchVacancyConfiguration";
import DivisionBranchAnalytics from "../components/Admin/DivisionBranchAnalytics";
import DivisionStudentDistribution from "../components/Admin/DivisionStudentDistribution";
import "../styles/admin.css";

function Administration() {
  const [administration, setAdministration] = useState(null);
  const [divisionName, setDivisionName] = useState("");
  const [paidSeatLimit, setPaidSeatLimit] = useState("");
  const [unpaidSeatLimit, setUnpaidSeatLimit] = useState("");
  const [nextCertificateNumber, setNextCertificateNumber] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDivisions, setShowDivisions] = useState(false);
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState("");
  const [analyticsMode, setAnalyticsMode] = useState("branch");
  const [studentTypeFilter, setStudentTypeFilter] = useState("all");

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (student.status !== "Approved") return false;
      const type = (student.internshipType || "Unpaid").toLowerCase();
      if (studentTypeFilter === "paid") return type === "paid";
      if (studentTypeFilter === "unpaid") return type === "unpaid";
      return true;
    });
  }, [students, studentTypeFilter]);

  const totalStudents = useMemo(() => filteredStudents.length, [filteredStudents]);
  const paidStudents = useMemo(() => filteredStudents.filter(s => (s.internshipType || "").toLowerCase() === "paid").length, [filteredStudents]);
  const unpaidStudents = useMemo(() => filteredStudents.filter(s => (s.internshipType || "Unpaid").toLowerCase() === "unpaid").length, [filteredStudents]);
  const totalBranches = useMemo(() => new Set(filteredStudents.map(s => s.branch).filter(Boolean)).size, [filteredStudents]);
  const totalDivisions = useMemo(() => administration?.divisions?.length || 0, [administration]);

  const applyAdministration = useCallback((next, successMessage = "") => {
    setAdministration(next);
    setPaidSeatLimit(next.paidSeatLimit === undefined ? "" : String(next.paidSeatLimit));
    setUnpaidSeatLimit(next.unpaidSeatLimit === undefined ? "" : String(next.unpaidSeatLimit));
    setNextCertificateNumber(next.nextCertificateNumber === undefined ? "" : String(next.nextCertificateNumber));
    setError("");
    setMessage(successMessage);
    window.dispatchEvent(new CustomEvent("administration-updated", { detail: next }));
  }, []);


  useEffect(() => {
    let active = true;
    fetchAdministration()
      .then(({ administration: config }) => active && applyAdministration(config))
      .catch((requestError) => active && setError(requestError.message));
    return () => { active = false; };
  }, [applyAdministration]);

  useEffect(() => {
    let active = true;
    const loadStudents = async () => {
      try {
        const { students: records } = await fetchAdminStudents();
        if (active) { setStudents(records); setStudentsError(""); }
      } catch (requestError) {
        if (active) setStudentsError(requestError.message);
      } finally {
        if (active) setStudentsLoading(false);
      }
    };
    loadStudents();
    const refresh = window.setInterval(loadStudents, 30000);
    window.addEventListener("administration-updated", loadStudents);
    window.addEventListener("student-division-updated", loadStudents);
    return () => { active = false; window.clearInterval(refresh); window.removeEventListener("administration-updated", loadStudents); window.removeEventListener("student-division-updated", loadStudents); };
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const timeout = window.setTimeout(() => setMessage(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const runAction = async (action, successMessage) => {
    setSaving(true);
    setError("");
    try {
      const { administration: config } = await action();
      applyAdministration(config, successMessage);
      return true;
    } catch (requestError) {
      setMessage("");
      setError(requestError.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    const added = await runAction(() => addDivision(divisionName), "Division added successfully.");
    if (added) {
      setDivisionName("");
      setShowDivisions(true);
    }
  };

  const handleSeatUpdate = async (event) => {
    event.preventDefault();
    await runAction(() => updateTotalAllocatedSeats(paidSeatLimit, unpaidSeatLimit), "Seat allocation updated successfully.");
  };

  const handleCertificateNumberUpdate = async (event) => {
    event.preventDefault();
    await runAction(() => updateNextCertificateNumber(Number(nextCertificateNumber)), "Certificate number updated successfully.");
  };

  const toggleDivisions = async () => {
    if (showDivisions) {
      setShowDivisions(false);
      return;
    }

    setLoadingDivisions(true);
    setError("");
    try {
      const { administration: config } = await fetchAdministration();
      applyAdministration(config);
      setShowDivisions(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingDivisions(false);
    }
  };

  const navigateBack = () => {
    window.history.pushState({}, "", "/admin/dashboard");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  const saveDivisionConfiguration = (divisionConfigurations) => {
    applyAdministration({ ...administration, divisionConfigurations }, "Division configuration updated successfully.");
  };

  return (
    <main className="admin-console admin-shell administration-page">
      <header className="admin-topbar administration-topbar">
        <div>
          <p className="portal-eyebrow">System management</p>
          <h1>Administration</h1>
          <p className="administration-subtitle">Manage system configuration, divisions, and administrative settings.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="admin-secondary-btn" type="button" onClick={() => { window.history.pushState({}, "", "/admin/approved-students"); window.dispatchEvent(new PopStateEvent("popstate")); }}>Back to Dashboard</button>
          <button className="admin-secondary-btn" type="button" onClick={() => { window.history.pushState({}, "", "/admin/dashboard"); window.dispatchEvent(new PopStateEvent("popstate")); }}>🏠 Home</button>
        </div>
      </header>

      {message && <div className="administration-toast administration-toast--success" role="status">✓ {message}</div>}
      {error && <div className="administration-toast administration-toast--error" role="alert">{error}</div>}

      {!administration ? (
        <div className="administration-loading"><span className="administration-spinner" /> Loading administration settings...</div>
      ) : (
        <div className="administration-grid">
          <div className="administration-top-grid">
            <section className="administration-card administration-card--divisions">
              <div className="administration-card__heading">
                <span className="administration-icon" aria-hidden="true">⌘</span>
                <div><h2>Edit Divisions</h2><p>Maintain the division list used by the portal.</p></div>
              </div>
              <form className="administration-add-form" onSubmit={handleAdd}>
                <label className="admin-field"><span>Division Name</span><input value={divisionName} onChange={(event) => setDivisionName(event.target.value)} placeholder="Enter division name" maxLength="100" /></label>
                <button className="admin-primary-btn" disabled={saving} type="submit">+ Add Division</button>
              </form>
              <button
                className="division-disclosure-button"
                type="button"
                aria-expanded={showDivisions}
                aria-controls="division-list"
                onClick={toggleDivisions}
                disabled={loadingDivisions}
              >
                <span className="division-disclosure-button__arrow" aria-hidden="true">▼</span>
                {loadingDivisions ? "Loading Divisions..." : showDivisions ? "Hide Divisions" : "Display Divisions"}
              </button>
              <div className={`division-disclosure ${showDivisions ? "division-disclosure--open" : ""}`}>
                <div className="division-disclosure__inner">
                  <div className="division-list" id="division-list" aria-live="polite">
                    {[...administration.divisions].sort((a, b) => a.localeCompare(b)).map((division) => (
                      <article className="division-row" key={division}>
                        <span className="division-row__mark" aria-hidden="true">◈</span>
                        <strong>{division}</strong>
                        <div className="division-row__actions">
                          <button className="admin-secondary-btn admin-icon-button" type="button" aria-label={`Edit ${division}`} onClick={() => setEditing({ name: division, value: division })}>✎ <span>Edit</span></button>
                          <button className="admin-danger-btn admin-icon-button" type="button" aria-label={`Delete ${division}`} onClick={() => setDeleting(division)}>⌫ <span>Delete</span></button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>
            <section className="administration-card administration-card--seats">
              <div className="administration-card__heading">
                <span className="administration-icon" aria-hidden="true">◫</span>
                <div><h2>Overall Seat Limit</h2><p>Set the portal-wide maximum. Configure separate Paid and Unpaid seats for each division below.</p></div>
              </div>
              <form className="seat-allocation-form" onSubmit={handleSeatUpdate}>
                <label className="admin-field"><span>Paid Seats</span><input type="number" min="0" step="1" inputMode="numeric" value={paidSeatLimit} onChange={(event) => setPaidSeatLimit(event.target.value)} required /></label>
                <label className="admin-field"><span>Unpaid Seats</span><input type="number" min="0" step="1" inputMode="numeric" value={unpaidSeatLimit} onChange={(event) => setUnpaidSeatLimit(event.target.value)} required /></label>
                <label className="admin-field"><span>Total Seats</span><input type="number" readOnly value={(Number(paidSeatLimit) || 0) + (Number(unpaidSeatLimit) || 0)} /></label>
                <button className="admin-primary-btn" disabled={saving} type="submit">Update</button>
              </form>
              <div className="future-ready-note"><span aria-hidden="true">✦</span><div><strong>Future-ready configuration</strong><p>Individual division seat limits can be added here without changing the saved configuration structure.</p></div></div>
              <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <span style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>Paid Students</span>
                  <strong style={{ display: "block", fontSize: "1.75rem", color: "var(--primary)", marginTop: "4px" }}>
                    {students.filter(s => s.status === "Approved" && s.internshipType === "Paid").length}
                  </strong>
                </div>
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <span style={{ display: "block", fontSize: "0.85rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>Unpaid Students</span>
                  <strong style={{ display: "block", fontSize: "1.75rem", color: "var(--primary)", marginTop: "4px" }}>
                    {students.filter(s => s.status === "Approved" && (s.internshipType === "Unpaid" || !s.internshipType)).length}
                  </strong>
                </div>
              </div>
            </section>

            <section className="administration-card administration-card--seats">
              <div className="administration-card__heading">
                <span className="administration-icon" aria-hidden="true">✎</span>
                <div><h2>Certificate Number</h2><p>Configure starting or next sequence number of generated internship certificates.</p></div>
              </div>
              <form className="seat-allocation-form" onSubmit={handleCertificateNumberUpdate}>
                <label className="admin-field"><span>Starting/Next Certificate Number</span><input type="number" min="1" step="1" inputMode="numeric" value={nextCertificateNumber} onChange={(event) => setNextCertificateNumber(event.target.value)} required /></label>
                <button className="admin-primary-btn" disabled={saving} type="submit">Update Number</button>
              </form>
            </section>
          </div>

          <DivisionBranchVacancyConfiguration key={JSON.stringify(administration.divisionConfigurations)} administration={administration} onSaved={saveDivisionConfiguration} onError={(requestError) => { setMessage(""); setError(requestError); }} />

          {/* Student Type Filter & Summary Cards */}
          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "20px", marginTop: "24px", width: "100%" }}>
            <div className="admin-field" style={{ maxWidth: "260px" }}>
              <span>Student Type</span>
              <select value={studentTypeFilter} onChange={(e) => setStudentTypeFilter(e.target.value)}>
                <option value="all">All Students</option>
                <option value="paid">Paid Internship</option>
                <option value="unpaid">Unpaid Internship</option>
              </select>
            </div>

            <div className="admin-summary-grid" style={{ width: "100%", margin: "0" }}>
              <div className="admin-summary-card">
                <span>Total Students</span>
                <strong>{totalStudents}</strong>
              </div>
              <div className="admin-summary-card">
                <span>Paid Students</span>
                <strong>{paidStudents}</strong>
              </div>
              <div className="admin-summary-card">
                <span>Unpaid Students</span>
                <strong>{unpaidStudents}</strong>
              </div>
              <div className="admin-summary-card">
                <span>Total Branches</span>
                <strong>{totalBranches}</strong>
              </div>
              <div className="admin-summary-card">
                <span>Total Divisions</span>
                <strong>{totalDivisions}</strong>
              </div>
            </div>
          </div>

          <DivisionBranchAnalytics administration={administration} students={filteredStudents} loading={studentsLoading} error={studentsError} onModeChange={setAnalyticsMode} />
          <DivisionStudentDistribution administration={administration} students={filteredStudents} loading={studentsLoading} error={studentsError} />
        </div>
      )}

      {editing && <div className="administration-dialog-backdrop" role="presentation"><form className="administration-dialog" onSubmit={async (event) => { event.preventDefault(); const updated = await runAction(() => renameDivision(editing.name, editing.value), "Division updated successfully."); if (updated) setEditing(null); }}><h2>Edit division</h2><p>Choose a clear, unique name for this division.</p><label className="admin-field"><span>Division Name</span><input autoFocus value={editing.value} onChange={(event) => setEditing({ ...editing, value: event.target.value })} maxLength="100" /></label><div className="administration-dialog__actions"><button className="admin-secondary-btn" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="admin-primary-btn" disabled={saving} type="submit">Save changes</button></div></form></div>}
      {deleting && <div className="administration-dialog-backdrop" role="presentation"><div className="administration-dialog"><h2>Delete division?</h2><p>Are you sure you want to delete <strong>“{deleting}”</strong>? This removes it from the administration list.</p><div className="administration-dialog__actions"><button className="admin-secondary-btn" type="button" onClick={() => setDeleting(null)}>Cancel</button><button className="admin-danger-btn" disabled={saving} type="button" onClick={async () => { const deleted = await runAction(() => removeDivision(deleting), "Division deleted successfully."); if (deleted) setDeleting(null); }}>Delete</button></div></div></div>}
    </main>
  );
}

export default Administration;
