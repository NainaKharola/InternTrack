import { getUploadUrl } from "./uploadUrl";

export async function openAdminDocument(fileUrl) {
  // Open synchronously from the click event so browsers do not block the preview.
  const previewWindow = window.open("", "_blank");
  if (previewWindow) previewWindow.opener = null;

  try {
    const response = await fetch(getUploadUrl(fileUrl), {
      credentials: "same-origin",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || "Unable to open the document.");
    }

    const documentBlob = await response.blob();
    if (!documentBlob.size) throw new Error("The document is empty.");

    const objectUrl = URL.createObjectURL(documentBlob);
    if (previewWindow) {
      previewWindow.location.replace(objectUrl);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } else {
      throw new Error("The document preview was blocked by the browser. Allow pop-ups for this site and try again.");
    }
  } catch (error) {
    previewWindow?.close();
    throw error;
  }
}
