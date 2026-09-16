import { useEffect, useState } from "react";

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

function FileInput({ label, name, onChange, error, required = false, accept }) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    return () => {
      if (preview && typeof preview === "string" && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleChange = (event) => {
    const file = event.target.files?.[0];
    if (preview && typeof preview === "string" && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    if (name === "photo" && file && ALLOWED_PHOTO_TYPES.includes(file.type?.toLowerCase())) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
    } else {
      setPreview("");
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
      {preview && typeof preview === "string" && preview.startsWith("blob:") && (
        <img className="file-field__preview" src={preview} alt="Passport photograph preview" />
      )}
      {error && (
        <span className="field__error" id={`${name}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}

export default FileInput;
