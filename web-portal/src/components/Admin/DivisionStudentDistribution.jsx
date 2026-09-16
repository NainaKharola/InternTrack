import { useMemo, useState } from "react";
import { getAllocatedStudents } from "../../utils/administrationAnalytics";

// ── colour palette ─────────────────────────────────────────────────────────
const PALETTE = [
  "#155eaa", "#2f8bd5", "#4da3e8", "#37a779", "#e4a33a",
  "#8b6bd9", "#df6b6b", "#2e8b8b", "#f07c3a", "#b45fc8",
  "#4cad8f", "#c45b5b", "#6d9eeb", "#f4b400", "#0f9d58",
  "#db4437", "#ab47bc", "#00acc1", "#43a047", "#fb8c00",
];

// ── SVG Donut Pie Chart ────────────────────────────────────────────────────
function PieChart({ rows, total }) {
  const [hovered, setHovered] = useState(null);

  if (!total) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "280px" }}>
        <p style={{ color: "var(--text-muted, #94a3b8)", textAlign: "center", fontSize: "0.95rem" }}>
          No division allocation data available.
        </p>
      </div>
    );
  }

  const SIZE = 280;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 108;
  const R_INNER = 58;

  let cursor = -Math.PI / 2;
  const slices = rows.map((row, idx) => {
    const angle = (row.total / total) * 2 * Math.PI;
    const x1 = CX + R * Math.cos(cursor);
    const y1 = CY + R * Math.sin(cursor);
    cursor += angle;
    const x2 = CX + R * Math.cos(cursor);
    const y2 = CY + R * Math.sin(cursor);
    const midAngle = cursor - angle / 2;
    const largeArc = angle > Math.PI ? 1 : 0;
    const d =
      rows.length === 1
        ? `M ${CX},${CY - R} A ${R},${R} 0 1,1 ${CX - 0.001},${CY - R} Z`
        : `M ${x1},${y1} A ${R},${R} 0 ${largeArc},1 ${x2},${y2} L ${CX},${CY} Z`;
    return {
      ...row,
      d,
      color: PALETTE[idx % PALETTE.length],
      pct: ((row.total / total) * 100).toFixed(1),
      midAngle,
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: "visible" }}>
          <defs>
            <mask id="dsd-donut-mask">
              <rect width={SIZE} height={SIZE} fill="white" />
              <circle cx={CX} cy={CY} r={R_INNER} fill="black" />
            </mask>
          </defs>
          <g mask="url(#dsd-donut-mask)">
            {slices.map((slice, idx) => (
              <path
                key={slice.division}
                d={slice.d}
                fill={slice.color}
                stroke="#fff"
                strokeWidth={hovered === idx ? 0 : 2}
                style={{
                  transform: hovered === idx
                    ? `translate(${5 * Math.cos(slice.midAngle)}px, ${5 * Math.sin(slice.midAngle)}px)`
                    : "none",
                  transition: "transform 0.18s ease",
                  cursor: "pointer",
                  filter:
                    hovered === idx
                      ? "brightness(1.15) drop-shadow(0 2px 6px rgba(0,0,0,0.2))"
                      : "none",
                }}
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </g>
          <text x={CX} y={CY - 9} textAnchor="middle" fontSize="24" fontWeight="700"
            fill="var(--text, #1e293b)" fontFamily="inherit">{total}</text>
          <text x={CX} y={CY + 13} textAnchor="middle" fontSize="11"
            fill="var(--text-muted, #64748b)" fontFamily="inherit">Students</text>
        </svg>

        {hovered !== null && slices[hovered] && (
          <div style={{
            position: "absolute",
            top: "calc(50% + 72px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15,23,42,0.9)",
            color: "#f8fafc",
            borderRadius: "10px",
            padding: "10px 16px",
            fontSize: "0.82rem",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            textAlign: "center",
            zIndex: 20,
            lineHeight: "1.7",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}>
            <div style={{ fontWeight: "700", color: slices[hovered].color, marginBottom: "2px" }}>
              {slices[hovered].division}
            </div>
            <div>Paid: {slices[hovered].paid} &nbsp;|&nbsp; Unpaid: {slices[hovered].unpaid}</div>
            <div>Total: {slices[hovered].total} Student{slices[hovered].total !== 1 ? "s" : ""}</div>
            <div style={{ color: "#94a3b8" }}>{slices[hovered].pct}%</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px", justifyContent: "center", maxWidth: "340px" }}>
        {slices.map((slice) => (
          <div key={slice.division} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.78rem" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: slice.color, flexShrink: 0, display: "inline-block" }} />
            <span style={{ color: "var(--text, #334155)", fontWeight: 500 }}>{slice.division}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export default function DivisionStudentDistribution({ administration, students, loading, error }) {

  const rows = useMemo(() => {
    if (!administration?.divisions?.length || !students) return [];
    const counts = {};
    administration.divisions.forEach((div) => { counts[div] = { paid: 0, unpaid: 0, total: 0 }; });
    getAllocatedStudents(students, administration.divisions).forEach((student) => {
      const div = student.trainingManagement?.division || student.division || student.recommendedBy;
      if (div && Object.prototype.hasOwnProperty.call(counts, div)) {
        const type = (student.internshipType || "Unpaid").toLowerCase();
        if (type === "paid") {
          counts[div].paid++;
        } else {
          counts[div].unpaid++;
        }
        counts[div].total++;
      }
    });
    return Object.entries(counts)
      .map(([division, details]) => ({ division, ...details }))
      .sort((a, b) => b.total - a.total);
  }, [administration, students]);

  const total = useMemo(() => rows.reduce((s, r) => s + r.total, 0), [rows]);
  const totalPaid = useMemo(() => rows.reduce((s, r) => s + r.paid, 0), [rows]);
  const totalUnpaid = useMemo(() => rows.reduce((s, r) => s + r.unpaid, 0), [rows]);

  return (
    <section
      className="administration-card"
      style={{
        borderRadius: "12px",
        border: "1px solid var(--border-color, #e2e8f0)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        padding: "28px 32px",
        marginTop: "24px",
        background: "var(--card-bg, #fff)",
      }}
    >
      <div className="administration-card__heading" style={{ marginBottom: "28px" }}>
        <span className="administration-icon" aria-hidden="true">⬡</span>
        <div>
          <h2 style={{ margin: 0 }}>Division Student Distribution</h2>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted, #64748b)", fontSize: "0.9rem" }}>
            Live breakdown of students currently allocated across all configured divisions.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="analytics-skeleton"><span /><span /><span /></div>
      ) : error ? (
        <div className="analytics-empty" style={{ padding: "32px", textAlign: "center" }}>
          <span aria-hidden="true" style={{ marginRight: "6px" }}>!</span>{error}
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "40px", alignItems: "flex-start" }}>

          {/* LEFT 60% – Pie Chart */}
          <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", justifyContent: "center" }}>
            <PieChart rows={rows} total={total} />
          </div>

          {/* RIGHT 40% – Summary Table */}
          <div style={{ flex: "0 1 280px", minWidth: 220 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color, #e2e8f0)" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: "var(--text-muted, #64748b)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Division</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600, color: "var(--text-muted, #64748b)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Paid</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600, color: "var(--text-muted, #64748b)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Unpaid</th>
                  <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600, color: "var(--text-muted, #64748b)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "24px 8px", textAlign: "center", color: "var(--text-muted, #94a3b8)", fontStyle: "italic" }}>
                      No division allocation data available.
                    </td>
                  </tr>
                ) : rows.map((row, idx) => (
                  <tr key={row.division} style={{ borderBottom: "1px solid var(--border-color, #f1f5f9)" }}>
                    <td style={{ padding: "9px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: PALETTE[idx % PALETTE.length], flexShrink: 0, display: "inline-block" }} />
                        <span style={{ fontWeight: 500, color: "var(--text, #1e293b)" }}>{row.division}</span>
                      </div>
                    </td>
                    <td style={{ padding: "9px 8px", textAlign: "right", color: "var(--text, #334155)", fontVariantNumeric: "tabular-nums" }}>
                      {row.paid}
                    </td>
                    <td style={{ padding: "9px 8px", textAlign: "right", color: "var(--text, #334155)", fontVariantNumeric: "tabular-nums" }}>
                      {row.unpaid}
                    </td>
                    <td style={{ padding: "9px 8px", textAlign: "right", fontWeight: 600, color: "var(--text, #334155)", fontVariantNumeric: "tabular-nums" }}>
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {rows.length > 0 && (
              <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border-color, #e2e8f0)", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "var(--text-muted, #64748b)" }}>
                  <span>Total Paid</span>
                  <strong style={{ color: "var(--text, #1e293b)" }}>{totalPaid}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "var(--text-muted, #64748b)" }}>
                  <span>Total Unpaid</span>
                  <strong style={{ color: "var(--text, #1e293b)" }}>{totalUnpaid}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "var(--text-muted, #64748b)" }}>
                  <span>Total Students</span>
                  <strong style={{ color: "var(--text, #1e293b)" }}>{total}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted, #64748b)" }}>
                  <span>Total Divisions</span>
                  <strong style={{ color: "var(--text, #1e293b)" }}>{rows.length}</strong>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </section>
  );
}
