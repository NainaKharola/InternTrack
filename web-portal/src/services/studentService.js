import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// -------------------- Colleges --------------------

export async function fetchColleges() {
  const response = await axios.get(`${API_URL}/colleges`);
  return response.data;
}

// -------------------- Common --------------------

async function parseResponse(response) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.success === false) {
    throw new Error(body.message || "Student request failed.");
  }

  return body;
}

// -------------------- Student Registration --------------------

export async function submitStudentRegistration(formData) {
  const response = await fetch(`${API_URL}/students`, {
    method: "POST",
    body: formData,
  });

  return parseResponse(response);
}

export async function loginStudent(credentials) {
  const response = await fetch(`${API_URL}/students/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  return parseResponse(response);
}

export async function fetchStudentDashboard(credentials) {
  const params = new URLSearchParams(credentials);

  const response = await fetch(
    `${API_URL}/students/dashboard?${params}`
  );

  return parseResponse(response);
}

export function studentDocumentUrl(type, credentials) {
  const params = new URLSearchParams(credentials);

  return `${API_URL}/students/documents/${type}?${params}`;
}

export async function uploadCompletedDocuments(credentials, file) {
  const formData = new FormData();

  formData.append("email", credentials.email);
  formData.append("referenceId", credentials.referenceId);
  formData.append("completedDocuments", file);

  const response = await fetch(
    `${API_URL}/students/completed-documents`,
    {
      method: "POST",
      body: formData,
    }
  );

  return parseResponse(response);
}

export async function savePaidInternshipProjectDetails(credentials, details) {
  const response = await fetch(`${API_URL}/students/paid-project-details`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...credentials, ...details }),
  });

  return parseResponse(response);
}
