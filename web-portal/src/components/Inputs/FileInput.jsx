import { useEffect, useRef, useState } from "react";

// Allowed photo MIME types for safe local image preview rendering
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB max preview size

function FileInput({ label, name, onChange, error, required = false, accept }) {
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [hasPreview, setHasPreview] = useState(false);
  const canvasRef = useRef(null);

  // Manage safe canvas-based rendering for verified local File instances
  useEffect(() => {
    let activeObjectUrl = "";
    let isMounted = true;

    if (
      name === "photo" &&
      selectedPhotoFile &&
      typeof window !== "undefined" &&
      typeof window.File !== "undefined" &&
      selectedPhotoFile instanceof File &&
      ALLOWED_PHOTO_TYPES.includes(selectedPhotoFile.type?.toLowerCase()) &&
      selectedPhotoFile.size > 0 &&
      selectedPhotoFile.size <= MAX_PHOTO_SIZE_BYTES
    ) {
      try {
        const objectUrl = URL.createObjectURL(selectedPhotoFile);
        activeObjectUrl = objectUrl;

        const img = new Image();
        img.onload = () => {
          if (!isMounted) {
            if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
            return;
          }
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              const maxW = 120;
              const maxH = 150;
              let w = img.naturalWidth || 120;
              let h = img.naturalHeight || 150;
              const ratio = Math.min(maxW / w, maxH / h, 1);
              canvas.width = Math.round(w * ratio);
              canvas.height = Math.round(h * ratio);
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              setHasPreview(true);
            }
          }
          // Immediately revoke the temporary object URL after painting to canvas
          if (activeObjectUrl) {
            URL.revokeObjectURL(activeObjectUrl);
            activeObjectUrl = "";
          }
        };

        img.onerror = () => {
          if (activeObjectUrl) {
            URL.revokeObjectURL(activeObjectUrl);
            activeObjectUrl = "";
          }
          if (isMounted) {
            setHasPreview(false);
          }
        };

        img.src = objectUrl;
      } catch {
        if (isMounted) {
          setHasPreview(false);
        }
      }
    } else {
      setHasPreview(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    return () => {
      isMounted = false;
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
    };
  }, [selectedPhotoFile, name]);

  const handleChange = (event) => {
    const file = event.target.files?.[0];

    if (
      name === "photo" &&
      file &&
      typeof window !== "undefined" &&
      typeof window.File !== "undefined" &&
      file instanceof File &&
      ALLOWED_PHOTO_TYPES.includes(file.type?.toLowerCase()) &&
      file.size <= MAX_PHOTO_SIZE_BYTES
    ) {
      setSelectedPhotoFile(file);
    } else {
      setSelectedPhotoFile(null);
    }

    onChange(event);
  };

  return (
    <label className={`file-field ${error ? "field--error" : ""}`}>
      <span className="file-field__label">{label}</span>
      <input
        className="file-field__control"
        type="file"
        name={name}
        onChange={handleChange}
        required={required}
        accept={accept}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      <canvas
        ref={canvasRef}
        className="file-field__preview"
        style={{
          display: hasPreview ? "block" : "none",
          maxWidth: "120px",
          maxHeight: "150px",
          borderRadius: "6px",
          marginTop: "8px",
          border: "1px solid rgba(10, 78, 163, 0.2)"
        }}
        aria-label="Passport photograph preview"
      />
      {error && (
        <span className="field__error" id={`${name}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}

export default FileInput;
