import { useState } from "react";
import { fetchAdministration, fetchAdminStudents } from "../../services/adminService";
import { formatUtilization, getBranchDivisionRecommendations, getGeneralDivisionRecommendations } from "../../utils/administrationAnalytics";
import { normalizeBranch } from "../../data/branches";

export default function StudentDivisionRecommendation({ student, students: propStudents, administration: propAdministration }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [showAllDivisions, setShowAllDivisions] = useState(false);

  const targetBranch = normalizeBranch(
    student?.trainingManagement?.branch ||
    student?.branch ||
    student?.discipline ||
    student?.department ||
    ""
  ) || student?.branch || "";

  const showRecommendations = async (overrideShowAll = false) => {
    setOpen(true);
    setShowAllDivisions(overrideShowAll);

    if (propStudents && propAdministration) {
      const activeStudents = propStudents.filter((s) => {
        const comp = String(s.completedStatus || s.trainingManagement?.completed || "").trim().toLowerCase();
        return comp !== "yes";
      });
      if (student && targetBranch && !overrideShowAll) {
        const branchRecs = getBranchDivisionRecommendations(
          propAdministration.divisions,
          propAdministration.divisionConfigurations,
          activeStudents,
          targetBranch,
          student
        );
        setRecommendations(branchRecs);
      } else {
        setRecommendations(
          getGeneralDivisionRecommendations(
            propAdministration.divisions,
            propAdministration.divisionConfigurations,
            activeStudents
          )
        );
      }
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [{ administration }, { students }] = await Promise.all([
        fetchAdministration(),
        fetchAdminStudents({ sortBy: "submittedAt", sortOrder: "desc" }),
      ]);
      const activeStudents = (students || []).filter((s) => {
        const comp = String(s.completedStatus || s.trainingManagement?.completed || "").trim().toLowerCase();
        return comp !== "yes";
      });
      if (student && targetBranch && !overrideShowAll) {
        const branchRecs = getBranchDivisionRecommendations(
          administration.divisions,
          administration.divisionConfigurations,
          activeStudents,
          targetBranch,
          student
        );
        setRecommendations(branchRecs);
      } else {
        setRecommendations(
          getGeneralDivisionRecommendations(
            administration.divisions,
            administration.divisionConfigurations,
            activeStudents
          )
        );
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to load division recommendations.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="admin-secondary-btn" type="button" onClick={() => showRecommendations(false)}>
        Suggest Division
      </button>

      {open && (
        <div
          className="administration-dialog-backdrop recommendation-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section className="recommendation-modal" role="dialog" aria-modal="true" aria-labelledby="division-recommendation-title">
            <div className="recommendation-modal__heading">
              <div>
                <p className="portal-eyebrow">
                  {student && !showAllDivisions ? "Branch-based recommendation" : "Live vacancy overview"}
                </p>
                <h2 id="division-recommendation-title">Suggest Division</h2>
                {student && !showAllDivisions ? (
                  <p>
                    Live capacity for <strong>{targetBranch || "Selected Branch"}</strong>. Full branches are marked as unavailable and cannot be assigned.
                  </p>
                ) : (
                  <p>Live capacity across all divisions.</p>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {student && (
                  <button
                    className="admin-secondary-btn"
                    type="button"
                    onClick={() => showRecommendations(!showAllDivisions)}
                    style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                  >
                    {showAllDivisions ? `Show for ${targetBranch}` : "Show All Divisions"}
                  </button>
                )}
                <button className="admin-secondary-btn" type="button" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
            </div>

            {loading ? (
              <div className="analytics-skeleton">
                <span />
                <span />
                <span />
              </div>
            ) : error ? (
              <p className="admin-error">{error}</p>
            ) : recommendations.length > 0 ? (
              <div className="recommendation-table-wrap">
                <table className="recommendation-table">
                  <thead>
                    <tr>
                      <th>Division</th>
                      <th>Utilization %</th>
                      <th>Students Allocated</th>
                      <th>Available Paid Seats</th>
                      <th>Available Unpaid Seats</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.map((row, index) => {
                      const isFull = row.configuredSeats > 0 && row.availableSeats === 0;
                      const displayText = isFull ? `${row.division} (Seats Full)` : row.division;
                      return (
                        <tr
                          className={student && !showAllDivisions && index === 0 && row.availableSeats > 0 ? "recommendation-table__best" : ""}
                          key={row.division}
                        >
                          <td>
                            <strong>{displayText}</strong>
                            {student && !showAllDivisions && index === 0 && row.availableSeats > 0 && (
                              <span className="recommendation-badge">Best match</span>
                            )}
                          </td>
                          <td>
                            <span className="recommendation-utilization">
                              <i style={{ width: `${Math.min(100, row.utilization || 0)}%` }} />
                              {formatUtilization(row.utilization)}
                            </span>
                          </td>
                          <td>
                            {row.allocatedStudents} / {row.configuredSeats || row.totalConfigured || 0}
                          </td>
                          <td>{row.isNull ? "NULL" : row.availablePaidSeats}</td>
                          <td>{row.isNull ? "NULL" : row.availableUnpaidSeats}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="analytics-empty">
                <p>
                  {student && !showAllDivisions
                    ? `No divisions have seat configuration for ${targetBranch}.`
                    : "No divisions configured."}
                </p>
                {student && !showAllDivisions && (
                  <button
                    className="admin-primary-btn"
                    type="button"
                    onClick={() => showRecommendations(true)}
                    style={{ marginTop: "12px" }}
                  >
                    View All Division Vacancies
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
