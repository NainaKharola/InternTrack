import { clearAdminToken, getAdminToken } from "./adminService";
import { readDocumentResponse } from "./documentFileService";

const API_URL = `${import.meta.env.VITE_API_URL || "/api"}/offer-letter`;

function authHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJsonResponse(response) {
  const body = await response.json().catch(() => ({}));

  if (response.status === 401) clearAdminToken();

  if (!response.ok) {
    throw new Error(body.message || "Offer Letter request failed.");
  }

  return body;
}

export async function generateOfferLetter(studentId) {
  const response = await fetch(`${API_URL}/${studentId}/generate`, {
    method: "POST",
    headers: authHeaders(),
  });

  return parseJsonResponse(response);
}

export async function getOfferLetter(studentId) {
  const response = await fetch(`${API_URL}/${studentId}`, {
    headers: authHeaders(),
  });

  return parseJsonResponse(response);
}

export async function updateOfferLetter(studentId, payload) {
  const response = await fetch(`${API_URL}/${studentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(response);
}

export async function downloadOfferLetterPdf(studentId) {
  const response = await fetch(`${API_URL}/${studentId}/pdf`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) clearAdminToken();
    throw new Error(body.message || "Unable to download PDF.");
  }
  return readDocumentResponse(response);
}

export async function uploadOfferLetterPdf(studentId, file) {
  const formData = new FormData();
  formData.append("offerLetter", file);

  const response = await fetch(`${API_URL}/${studentId}/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  return parseJsonResponse(response);
}

export async function sendOfferLetter(studentId) {
  const response = await fetch(`${API_URL}/${studentId}/send`, {
    method: "POST",
    headers: authHeaders(),
  });

  return parseJsonResponse(response);
}
