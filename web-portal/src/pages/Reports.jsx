import { useEffect, useMemo, useState } from "react";
import { fetchAdministration, fetchAdminStudents } from "../services/adminService";
import { printPdf } from "../services/documentFileService";
import "../styles/admin.css";

const REPORT_COLUMNS = [
  ["serial", "S.No."], ["name", "Name"], ["course", "Course"], ["branch", "Branch"], ["division", "Division"], ["year", "Year"], ["cgpa", "CGPA"],
  ["college", "College"], ["location", "College Location"], ["joinedDate", "Joined Date"], ["endDate", "End Date"],
  ["duration", "Duration"], ["projectTitle", "Project Title"], ["projectGuide", "Project Guide"], ["designation", "Designation"],
];

const escapeHtml = (value) => String(value ?? "-").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN");
}

function dateValue(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function reportValue(student, key, index) {
  const training = student.trainingManagement || {};
  const values = {
    serial: index + 1, name: student.name, course: training.courseName || student.course,
    branch: training.branch || student.branch, division: training.division || student.division || "-", year: training.courseYear || student.year, cgpa: student.cgpa,
    college: training.collegeName || student.collegeName, location: training.collegeLocation || student.location,
    joinedDate: formatDate(training.joinedDate), endDate: formatDate(training.toDate),
    duration: training.trainingDuration || student.internshipDuration, projectTitle: training.projectTitle,
    projectGuide: training.projectGuide, designation: training.designation,
  };
  return values[key] || "-";
}

function Reports() {
  const [students, setStudents] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ fromDate: "", toDate: "", status: "", division: "", internshipType: "Paid" });
  const [selectedFields, setSelectedFields] = useState([]);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(null);
  const [sort, setSort] = useState({ sortBy: "serial", sortOrder: "asc" });

  useEffect(() => {
    let active = true;
    Promise.all([fetchAdminStudents(), fetchAdministration()])
      .then(([studentResponse, administrationResponse]) => {
        if (!active) return;
        setStudents(studentResponse.students || []);
        setDivisions(administrationResponse.administration?.divisions || []);
      })
      .catch((requestError) => active && setError(requestError.message || "Unable to load report data."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => {
    if (!filters.status) return [];
    return students.filter((student) => {
      const training = student.trainingManagement || {};
      const statusMatch = filters.status === "Pending"
        ? student.status === "Pending" || !student.status
        : filters.status === "Approved"
          ? student.status === "Approved"
          : filters.status === "Joined"
            ? training.joined === "Yes"
            : training.completed === "Yes";
      if (!statusMatch || (filters.division && training.division !== filters.division)) return false;
      if (filters.internshipType) {
        const type = student.internshipType === "Paid" ? "Paid" : "Unpaid";
        if (type !== filters.internshipType) return false;
      }
      const relevantDate = filters.status === "Pending" ? student.submittedAt : filters.status === "Approved" ? student.approvedDate : filters.status === "Joined" ? training.joinedDate : training.completionDate;
      const normalizedDate = dateValue(relevantDate);
      return (!filters.fromDate || (normalizedDate && normalizedDate >= filters.fromDate)) && (!filters.toDate || (normalizedDate && normalizedDate <= filters.toDate));
    });
  }, [filters, students]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    if (!sort.sortBy) return sorted;

    sorted.sort((a, b) => {
      let valA, valB;
      const tA = a.trainingManagement || {};
      const tB = b.trainingManagement || {};

      switch (sort.sortBy) {
        case "serial":
          valA = rows.indexOf(a);
          valB = rows.indexOf(b);
          break;
        case "name":
          valA = a.name;
          valB = b.name;
          break;
        case "course":
          valA = tA.courseName || a.course;
          valB = tB.courseName || b.course;
          break;
        case "branch":
          valA = tA.branch || a.branch;
          valB = tB.branch || b.branch;
          break;
        case "division":
          valA = tA.division || a.division;
          valB = tB.division || b.division;
          break;
        case "year":
          valA = tA.courseYear || a.year;
          valB = tB.courseYear || b.year;
          break;
        case "cgpa":
          valA = Number(a.cgpa);
          valB = Number(b.cgpa);
          break;
        case "college":
          valA = tA.collegeName || a.collegeName;
          valB = tB.collegeName || b.collegeName;
          break;
        case "location":
          valA = tA.collegeLocation || a.location;
          valB = tB.collegeLocation || b.location;
          break;
        case "joinedDate":
          valA = tA.joinedDate ? new Date(tA.joinedDate).getTime() : 0;
          valB = tB.joinedDate ? new Date(tB.joinedDate).getTime() : 0;
          break;
        case "endDate":
          valA = tA.toDate ? new Date(tA.toDate).getTime() : 0;
          valB = tB.toDate ? new Date(tB.toDate).getTime() : 0;
          break;
        case "duration":
          valA = tA.trainingDuration || a.internshipDuration;
          valB = tB.trainingDuration || b.internshipDuration;
          break;
        case "projectTitle":
          valA = tA.projectTitle;
          valB = tB.projectTitle;
          break;
        case "projectGuide":
          valA = tA.projectGuide;
          valB = tB.projectGuide;
          break;
        case "designation":
          valA = tA.designation;
          valB = tB.designation;
          break;
        default:
          valA = "";
          valB = "";
      }

      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sort.sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sort.sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rows, sort]);

  const handleHeaderClick = (columnKey) => {
    setSort((current) => {
      if (current.sortBy === columnKey) {
        return { sortBy: columnKey, sortOrder: current.sortOrder === "asc" ? "desc" : "asc" };
      }
      return { sortBy: columnKey, sortOrder: "asc" };
    });
  };

  const renderSortArrow = (columnKey) => {
    if (sort.sortBy !== columnKey) return " ▲▼";
    return sort.sortOrder === "asc" ? " ▲" : " ▼";
  };

  const visibleColumns = selectedFields.length ? REPORT_COLUMNS.filter(([key]) => selectedFields.includes(key)) : REPORT_COLUMNS;
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const toggleField = (key) => setSelectedFields((current) => {
    const selection = current.length ? current : REPORT_COLUMNS.map(([columnKey]) => columnKey);
    return selection.includes(key) ? selection.filter((value) => value !== key) : [...selection, key];
  });

  const reportHtml = () => `<!doctype html><html><head><meta charset="utf-8"><title>DRDO Internship Report</title><style>
    body, table, th, td, span, div, p, h1, h2, h3, h4, h5, h6 {
      color: #000 !important;
      opacity: 1 !important;
      -webkit-text-fill-color: #000 !important;
    }
    body {
      font-family: Arial, sans-serif;
      padding: 24px;
      background: #fff !important;
    }
    h1 {
      margin: 0 0 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      background: #dcecff !important;
      color: #000 !important;
      font-weight: bold;
      border: 1px solid #666 !important;
      padding: 8px;
    }
    td {
      color: #000 !important;
      border: 1px solid #999 !important;
      padding: 8px;
      vertical-align: top;
      word-break: break-word;
    }
    @media print {
      * {
        color: #000 !important;
        opacity: 1 !important;
        -webkit-text-fill-color: #000 !important;
      }
      body {
        padding: 0;
        background: #fff !important;
      }
    }
  </style></head><body><h1>DRDO Internship Report</h1><p>Status: ${escapeHtml(filters.status)}${filters.division ? ` | Division: ${escapeHtml(filters.division)}` : ""} | Students: ${sortedRows.length}</p><table><thead><tr>${visibleColumns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}</tr></thead><tbody>${sortedRows.map((student, index) => `<tr>${visibleColumns.map(([key]) => `<td>${escapeHtml(reportValue(student, key, index))}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;

  const exportExcel = () => {
    const csv = [visibleColumns.map(([, label]) => `"${label.replace(/"/g, '""')}"`).join(","), ...sortedRows.map((student, index) => visibleColumns.map(([key]) => `"${String(reportValue(student, key, index)).replace(/"/g, '""')}"`).join(","))].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    link.download = "DRDO-Internship-Report.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const reportPdf = () => {
    const isLandscape = visibleColumns.length > 7;
    const pageWidth = isLandscape ? 842 : 595;
    const pageHeight = isLandscape ? 595 : 842;

    const pdfEsc = (val) => {
      return String(val ?? "-")
        .replace(/[^\x20-\x7e]/g, "?")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
    };

    const relativeWidths = {
      serial: 30, name: 75, course: 50, branch: 65, division: 55, year: 35, cgpa: 35,
      college: 100, location: 70, joinedDate: 55, endDate: 55,
      duration: 50, projectTitle: 90, projectGuide: 80, designation: 60
    };
    const totalRelWidth = visibleColumns.reduce((sum, [key]) => sum + (relativeWidths[key] || 60), 0);
    const usableWidth = pageWidth - 60;
    const colWidths = visibleColumns.map(([key]) => ((relativeWidths[key] || 60) / totalRelWidth) * usableWidth);

    const wrapText = (text, maxWidth) => {
      const avgCharWidth = 7.5 * 0.52;
      const charsPerLine = Math.floor(maxWidth / avgCharWidth);
      if (charsPerLine <= 4) return [String(text || "-")];
      const words = String(text || "-").split(/\s+/);
      const lines = [];
      let currentLine = "";
      words.forEach((word) => {
        if ((currentLine ? currentLine + " " : "") + word.length <= charsPerLine || (currentLine + " " + word).length <= charsPerLine) {
          currentLine = currentLine ? currentLine + " " : "";
          currentLine += word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
          while (currentLine.length > charsPerLine) {
            lines.push(currentLine.slice(0, charsPerLine));
            currentLine = currentLine.slice(charsPerLine);
          }
        }
      });
      if (currentLine) lines.push(currentLine);
      return lines.length ? lines : ["-"];
    };

    const rowDataList = sortedRows.map((student, rowIndex) => {
      const cells = visibleColumns.map(([key]) => {
        const val = reportValue(student, key, rowIndex);
        const colIdx = visibleColumns.findIndex(([k]) => k === key);
        return wrapText(val, colWidths[colIdx]);
      });
      const maxLines = Math.max(...cells.map((lines) => lines.length));
      const height = maxLines * 10 + 8;
      return { student, cells, height };
    });

    const pages = [];
    let currentPageRows = [];
    let currentY = pageHeight - 110;
    const limitY = 55;
    const tableHeaderHeight = 18;

    rowDataList.forEach((rowObj) => {
      if (currentY - rowObj.height < limitY) {
        pages.push(currentPageRows);
        currentPageRows = [rowObj];
        currentY = pageHeight - 45 - tableHeaderHeight - rowObj.height;
      } else {
        currentPageRows.push(rowObj);
        currentY -= rowObj.height;
      }
    });
    if (currentPageRows.length || pages.length === 0) {
      pages.push(currentPageRows);
    }

    const fontNormalObj = 3 + pages.length * 2;
    const fontBoldObj = fontNormalObj + 1;
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`
    ];

    pages.forEach((pageRows, pageIdx) => {
      let stream = "";

      const drawCenteredText = (text, y, font, size) => {
        const avgCharWidth = size * (font === "/F2" ? 0.55 : 0.5);
        const textWidth = text.length * avgCharWidth;
        const x = (pageWidth - textWidth) / 2;
        return `BT\n0 g\n${font} ${size} Tf\n${x} ${y} Td\n(${pdfEsc(text)}) Tj\nET\n`;
      };

      if (pageIdx === 0) {
        stream += drawCenteredText("DRDO Internship Management Portal", pageHeight - 25, "/F2", 12);
        stream += drawCenteredText("Student Report", pageHeight - 38, "/F1", 10);

        const statusText = `Status: ${filters.status || "All"}`;
        const dateRangeText = `Period: ${formatDate(filters.fromDate)} to ${formatDate(filters.toDate)}`;
        const divisionText = filters.division ? `Division: ${filters.division}` : "All Divisions";
        const genOnText = `Generated On: ${new Date().toLocaleString("en-IN")}`;
        const totalText = `Total Students: ${sortedRows.length}`;

        const metaY = pageHeight - 55;
        stream += `BT\n0 g\n/F1 8.5 Tf\n30 ${metaY} Td\n(${pdfEsc(statusText)}) Tj\nET\n`;
        stream += `BT\n0 g\n/F1 8.5 Tf\n200 ${metaY} Td\n(${pdfEsc(dateRangeText)}) Tj\nET\n`;
        stream += `BT\n0 g\n/F1 8.5 Tf\n420 ${metaY} Td\n(${pdfEsc(divisionText)}) Tj\nET\n`;

        const metaY2 = pageHeight - 68;
        stream += `BT\n0 g\n/F1 8.5 Tf\n30 ${metaY2} Td\n(${pdfEsc(genOnText)}) Tj\nET\n`;
        stream += `BT\n0 g\n/F1 8.5 Tf\n420 ${metaY2} Td\n(${pdfEsc(totalText)}) Tj\nET\n`;

        stream += `0.5 w 0.7 0.7 0.7 RG 30 ${pageHeight - 78} m ${pageWidth - 30} ${pageHeight - 78} l S\n`;
      }

      const drawTableHeader = (y) => {
        let hStr = "";
        hStr += `0.86 0.92 0.99 rg 30 ${y - 18} ${pageWidth - 60} 18 re f\n`;
        hStr += `0.5 w 0.5 0.5 0.5 RG\n`;
        hStr += `30 ${y} m ${pageWidth - 30} ${y} l S\n`;
        hStr += `30 ${y - 18} m ${pageWidth - 30} ${y - 18} l S\n`;

        let currentX = 30;
        visibleColumns.forEach(([key, label], colIdx) => {
          const w = colWidths[colIdx];
          hStr += `${currentX} ${y} m ${currentX} ${y - 18} l S\n`;
          if (colIdx === visibleColumns.length - 1) {
            hStr += `${currentX + w} ${y} m ${currentX + w} ${y - 18} l S\n`;
          }

          hStr += `BT\n0 g\n/F2 7.5 Tf\n${currentX + 4} ${y - 12} Td\n(${pdfEsc(label)}) Tj\nET\n`;
          currentX += w;
        });
        return hStr;
      };

      let tableY = (pageIdx === 0) ? (pageHeight - 95) : (pageHeight - 45);
      stream += drawTableHeader(tableY);
      tableY -= 18;

      pageRows.forEach((rowObj, rowIdx) => {
        const h = rowObj.height;

        if (rowIdx % 2 === 1) {
          stream += `0.97 0.98 0.99 rg 30 ${tableY - h} ${pageWidth - 60} ${h} re f\n`;
        }

        stream += `0.5 w 0.5 0.5 0.5 RG\n`;
        stream += `30 ${tableY - h} m ${pageWidth - 30} ${tableY - h} l S\n`;

        let currentX = 30;
        visibleColumns.forEach((col, colIdx) => {
          const w = colWidths[colIdx];
          stream += `${currentX} ${tableY} m ${currentX} ${tableY - h} l S\n`;
          if (colIdx === visibleColumns.length - 1) {
            stream += `${currentX + w} ${tableY} m ${currentX + w} ${tableY - h} l S\n`;
          }

          const lines = rowObj.cells[colIdx];
          lines.forEach((line, lineIdx) => {
            stream += `BT\n0 g\n/F1 7.5 Tf\n${currentX + 4} ${tableY - 11 - (lineIdx * 10)} Td\n(${pdfEsc(line)}) Tj\nET\n`;
          });

          currentX += w;
        });

        tableY -= h;
      });

      const footerY = 25;
      stream += `0.5 w 0.7 0.7 0.7 RG 30 35 m ${pageWidth - 30} 35 l S\n`;
      stream += `BT\n0 g\n/F1 8 Tf\n30 ${footerY} Td\n(${pdfEsc("DRDO Internship Management Portal")}) Tj\nET\n`;
      const centerText = `Generated on: ${new Date().toLocaleString("en-IN")}`;
      const centerTextWidth = centerText.length * 4;
      stream += `BT\n0 g\n/F1 8 Tf\n${(pageWidth - centerTextWidth) / 2} ${footerY} Td\n(${pdfEsc(centerText)}) Tj\nET\n`;
      const rightText = `Page ${pageIdx + 1} of ${pages.length}`;
      const rightTextWidth = rightText.length * 4.5;
      stream += `BT\n0 g\n/F1 8 Tf\n${pageWidth - 30 - rightTextWidth} ${footerY} Td\n(${pdfEsc(rightText)}) Tj\nET\n`;

      const pageObject = 3 + pageIdx * 2;
      const contentObject = pageObject + 1;
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontNormalObj} 0 R /F2 ${fontBoldObj} 0 R >> >> /Contents ${contentObject} 0 R >>`);
      objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    });

    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
  };

  const downloadPdf = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(reportPdf());
    link.download = "DRDO-Internship-Report.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const printHtmlReport = () => {
    const htmlContent = reportHtml();
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    document.body.appendChild(printFrame);

    printFrame.contentWindow.document.write(htmlContent);
    printFrame.contentWindow.document.close();
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();

    document.body.removeChild(printFrame);
  };

  const printPdf = async () => {
    try {
      const pdfBlob = reportPdf();
      console.log("PDF RESPONSE STATUS: 200");
      console.log("PDF CONTENT TYPE: application/pdf");
      console.log("PDF DATA TYPE: Blob");
      console.log("PDF BLOB SIZE:", pdfBlob.size);

      printPdf(pdfBlob);
    } catch (err) {
      setError(err.message || "Failed to print PDF report.");
    }
  };

  const handleExport = (format) => {
    const action = exportOpen;
    setExportOpen(null);
    if (action === "download") {
      if (format === "Excel") exportExcel();
      else downloadPdf();
      return;
    }
    if (format === "PDF") printPdf();
    else printHtmlReport();
  };
  const checkedFields = selectedFields.length ? selectedFields : REPORT_COLUMNS.map(([key]) => key);

  return <main className="admin-console admin-shell reports-page">
    <header className="admin-topbar"><div><p className="portal-eyebrow">Admin Panel</p><h1>View Reports</h1></div><button className="admin-secondary-btn" type="button" onClick={() => window.history.back()}>Back to Dashboard</button></header>
    <section className="admin-panel">
      <div className="reports-filter-row">
        <label className="admin-field"><span>From Date</span><input type="date" value={filters.fromDate} onChange={(event) => updateFilter("fromDate", event.target.value)} /></label>
        <label className="admin-field"><span>To Date</span><input type="date" value={filters.toDate} onChange={(event) => updateFilter("toDate", event.target.value)} /></label>
        <label className="admin-field"><span>Status</span><select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}><option value="">Select Status</option><option>Pending</option><option>Approved</option><option>Joined</option><option>Completed</option></select></label>
        <label className="admin-field"><span>Division</span><select value={filters.division} onChange={(event) => updateFilter("division", event.target.value)}><option value="">All Divisions</option>{divisions.map((division) => <option key={division} value={division}>{division}</option>)}</select></label>
        <label className="admin-field"><span>Number of Students</span><input readOnly value={sortedRows.length} aria-label="Number of Students" /></label>
      </div>
      <div className="admin-actions-row" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <select
          value={filters.internshipType || "Paid"}
          onChange={(event) => updateFilter("internshipType", event.target.value)}
          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-color, #cbd5e1)", background: "#fff", fontWeight: "600" }}
        >
          <option value="Paid">Paid Internship</option>
          <option value="Unpaid">Unpaid Internship</option>
        </select>
        <button className="admin-secondary-btn" type="button" onClick={() => setFieldsOpen(true)}>Select Fields</button>
      </div>
      {error && <p className="admin-error">{error}</p>}
      {loading ? <div className="admin-loading">Loading report data...</div> : <div className="admin-table-wrap"><table className="admin-table reports-table"><thead><tr>{visibleColumns.map(([key, label]) => <th key={key} style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleHeaderClick(key)}>{label}{renderSortArrow(key)}</th>)}</tr></thead><tbody>{sortedRows.map((student, index) => <tr key={student._id}>{visibleColumns.map(([key]) => <td key={key}>{reportValue(student, key, index)}</td>)}</tr>)}</tbody></table>{!sortedRows.length && <div className="admin-empty-state">{filters.status ? "No students match the selected report filters." : "Select a status to view the report."}</div>}</div>}
      <div className="reports-export-actions"><button className="admin-primary-btn" type="button" disabled={!sortedRows.length} onClick={() => setExportOpen("download")}>Download</button><button className="admin-secondary-btn" type="button" disabled={!sortedRows.length} onClick={() => setExportOpen("print")}>Print</button></div>
    </section>
    {fieldsOpen && <div className="reports-dialog-backdrop" role="presentation"><section className="reports-dialog" role="dialog" aria-modal="true" aria-label="Select report fields"><h2>Select Fields</h2><div className="reports-field-list">{REPORT_COLUMNS.map(([key, label]) => <label key={key}><input type="checkbox" checked={checkedFields.includes(key)} onChange={() => toggleField(key)} /> {label}</label>)}</div><div className="reports-dialog-actions"><button className="admin-secondary-btn" type="button" onClick={() => setSelectedFields([])}>Show All Fields</button><button className="admin-primary-btn" type="button" onClick={() => setFieldsOpen(false)}>Done</button></div></section></div>}
    {exportOpen && <div className="reports-dialog-backdrop" role="presentation"><section className="reports-dialog reports-dialog--small" role="dialog" aria-modal="true" aria-label={`${exportOpen === "download" ? "Download" : "Print"} report`}><h2>{exportOpen === "download" ? "Download Report" : "Print Report"}</h2><p>Select a format.</p><div className="reports-dialog-actions"><button className="admin-primary-btn" type="button" onClick={() => handleExport("PDF")}>PDF</button><button className="admin-secondary-btn" type="button" onClick={() => handleExport("Excel")}>Excel</button><button className="admin-secondary-btn" type="button" onClick={() => setExportOpen(null)}>Cancel</button></div></section></div>}
  </main>;
}

export default Reports;
