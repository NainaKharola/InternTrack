import { useEffect, useState } from "react";
import {
  fetchStudentDashboard,
  savePaidInternshipProjectDetails,
  studentDocumentUrl,
  uploadCompletedDocuments,
} from "../services/studentService";
import {
  clearStudentSession,
  getStudentSession,
} from "../services/studentSession";
import { getUploadUrl } from "../utils/uploadUrl";
import "../styles/admin.css";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN");
}

function DetailGrid({ title, rows }) {
  return (
    <section className="details-section">
      <h2>{title}</h2>
      <div className="details-grid">
        {rows.map(([label, value]) => (
          <div className="detail-item" key={label}>
            <span>{label}</span>
            <strong>{value || "-"}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function FileLink({ label, href, download }) {
  if (!href) return null;

  const handleClick = async (e) => {
    if (!download) return;
    e.preventDefault();
    try {
      const response = await fetch(getUploadUrl(href));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = typeof download === "string" ? download : "document.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <a
      className="student-document-link"
      href={getUploadUrl(href)}
      target={download ? undefined : "_blank"}
      onClick={handleClick}
      rel="noreferrer"
    >
      {label}
    </a>
  );
}

function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [credentials] = useState(getStudentSession());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completedFile, setCompletedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [projectDetails, setProjectDetails] = useState(null);
  const [projectDetailsMessage, setProjectDetailsMessage] = useState("");
  const [savingProjectDetails, setSavingProjectDetails] = useState(false);

  useEffect(() => {
    if (!credentials) {
      window.history.replaceState({}, "", "/student/login");
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }

    let ignore = false;

    async function loadDashboard() {
      try {
        const response = await fetchStudentDashboard(credentials);
        if (!ignore) {
          setStudent(response.student);
          setProjectDetails(response.student.paidInternshipProjectDetails || {
            projectName: "", designationTitle: "", supervisorName: "", projectNameAndPdc: "", achievements: "",
          });
        }
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [credentials]);

  const logout = () => {
    clearStudentSession();
    window.history.pushState({}, "", "/student/login");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleCompletedUpload = async (event) => {
    event.preventDefault();
    setUploadMessage("");

    if (!completedFile) {
      setUploadMessage("Select Upload Form 1 and Form 2 (Single PDF).");
      return;
    }
    if (completedFile.size > 10 * 1024 * 1024) {
      setUploadMessage("Maximum file size allowed is 10 MB.");
      return;
    }

    try {
      const response = await uploadCompletedDocuments(
        credentials,
        completedFile,
      );
      setStudent(response.student);
      setUploadMessage(response.message);
    } catch (err) {
      setUploadMessage(err.message);
    }
  };

  const handleProjectDetailsSave = async (event) => {
    event.preventDefault();
    setSavingProjectDetails(true);
    setProjectDetailsMessage("");
    try {
      const response = await savePaidInternshipProjectDetails(credentials, projectDetails);
      setStudent(response.student);
      setProjectDetails(response.student.paidInternshipProjectDetails);
      setProjectDetailsMessage(response.message);
    } catch (err) {
      setProjectDetailsMessage(err.message);
    } finally {
      setSavingProjectDetails(false);
    }
  };

  if (loading) {
    return (
      <main className="admin-shell">
        <div className="admin-loading">Loading student dashboard...</div>
      </main>
    );
  }

  if (error || !student) {
    return (
      <main className="admin-shell">
        <button className="secondary-button" type="button" onClick={logout}>
          Back to Login
        </button>
        <p className="admin-error">{error || "Student record not found."}</p>
      </main>
    );
  }
  console.log("Student =", student);
  console.log("Offer Letter =", student.offerLetter);
  console.log("Offer Letter URL =", student.offerLetterUrl);
  const approved = student.status === "Approved";

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div>
          <p className="portal-eyebrow">Student Dashboard</p>
          <h1>{student.name}</h1>
          <div className="student-info-box">
            <div className="student-info-item">
              <span className="student-info-label">Email: </span>
              <strong>{student.email}</strong>
            </div>

            <div className="student-info-item">
              <span className="student-info-label">Reference ID: </span>
              <strong>{student.referenceId}</strong>
            </div>
          </div>
        </div>
        <button className="secondary-button" type="button" onClick={logout}>
          Logout
        </button>
      </header>

      <DetailGrid
        title="Personal Details"
        rows={[
          ["Name", student.name],
          ["Email", student.email],
          ["Phone Number", student.phone],
          ["Gender", student.gender],
          ["Date of Birth", student.dob],
          ["Registration Status", student.status],
        ]}
      />

      <DetailGrid
        title="Academic Details"
        rows={[
          ["Course", student.course],
          ["Branch", student.branch],
          ["Year", student.year],
          ["CGPA", student.cgpa],
          ["College Name", student.collegeName],
          ["College Location", student.location],
        ]}
      />

      <DetailGrid
        title="Parent Details"
        rows={[
          ["Father's Name", student.fatherName],
          ["Parent's Contact Number", student.fatherPhone],
          ["Parent's Occupation", student.fatherOccupation],
        ]}
      />

      <DetailGrid
        title="Internship Details"
        rows={[
          ["Training Duration", student.internshipDuration],
          ["Joining Month", student.internshipJoiningMonth],
          ["Submitted On", formatDate(student.submittedAt)],
          ["Remark", student.remark],
        ]}
      />

      <section className="details-section">
        <h2>Student Documents</h2>
        <div className="document-actions">
          <FileLink label="View Photo" href={student.photo?.url} />
          <FileLink label="View Curriculum Vitae" href={student.resume?.url} />
          <FileLink label="View Marksheet" href={student.result?.url} />
          <FileLink
            label="View College Recommendation Letter"
            href={student.permissionLetter?.url}
          />
          <FileLink label="View Aadhaar Card" href={student.aadhaarCard?.url} />
        </div>
      </section>

      <section className="details-section">
        <h2>Documents to be Filled by Students</h2>
        {approved ? (
          <div className="document-actions">
            <FileLink
              label="View Offer Letter"
              href={student.offerLetter?.url || student.offerLetterUrl}
            />
            <FileLink
              label="Download Declaration Form (Form 1)"
              href={studentDocumentUrl("declaration", credentials)}
              download="Declaration-Form.pdf"
            />
            <FileLink
              label="Download Character Certificate (Form 2)"
              href={studentDocumentUrl("character", credentials)}
              download="Character-Certificate.pdf"
            />
          </div>
        ) : (
          <p className="admin-muted">
            Documents to be filled become available after your application is
            approved.
          </p>
        )}
      </section>

      {approved && student.internshipType === "Paid" && projectDetails && (
        <section className="details-section">
          <h2>Paid Internship Project Details</h2>
          <p className="admin-muted">All fields are optional and can be updated later.</p>
          <form className="training-form" onSubmit={handleProjectDetailsSave}>
            {[
              ["projectName", "Name of Project"],
              ["designationTitle", "Title of Designation"],
              ["supervisorName", "Name of Supervisor"],
              ["projectNameAndPdc", "Name & PDC of the Project in which Working"],
              ["achievements", "Achievements"],
            ].map(([name, label]) => (
              <label className="admin-field" key={name}>
                <span>{label}</span>
                <input name={name} value={projectDetails[name] || ""} onChange={(event) => setProjectDetails(current => ({ ...current, [name]: event.target.value }))} />
              </label>
            ))}
            <button className="primary-button" type="submit" disabled={savingProjectDetails}>{savingProjectDetails ? "Saving..." : "Save Project Details"}</button>
          </form>
          {projectDetailsMessage && <p className={projectDetailsMessage.includes("successfully") ? "admin-muted" : "admin-error"}>{projectDetailsMessage}</p>}
        </section>
      )}

      {approved && (
        <section className="details-section">
          <h2>Upload Documents</h2>
          <p className="admin-muted">
            Upload the filled Declaration Form and Character Certificate as a single PDF file (Upload Form 1 and Form 2 together).<br />
            Maximum allowed file size: 10 MB.
          </p>
          <form
            className="offer-letter-upload-inline"
            onSubmit={handleCompletedUpload}
          >
            <label className="admin-field">
              <span>Upload Form 1 and Form 2 (Single PDF)</span>
              <input
                accept="application/pdf"
                type="file"
                onChange={(event) =>
                  setCompletedFile(event.target.files?.[0] || null)
                }
              />
            </label>
            <button className="primary-button" type="submit">
              Upload PDF
            </button>
          </form>
          {student.completedDocuments?.url && (
            <FileLink
              label="View Uploaded Combined PDF"
              href={student.completedDocuments.url}
            />
          )}
          {uploadMessage && <p className="admin-muted">{uploadMessage}</p>}
        </section>
      )}
    </main>
  );
}

export default StudentDashboard;
