import TextInput from "../Inputs/TextInput";

function PersonalForm({ form, errors, onChange }) {
  return (
    <section className="form-section">
      <h2>Personal Details</h2>
      <div className="form-grid">
        <TextInput label="Name" name="name" value={form.name} onChange={onChange} error={errors.name} required />
        <label className={`field ${errors.gender ? "field--error" : ""}`}>
          <select className="field__control" name="gender" value={form.gender} onChange={onChange} aria-invalid={Boolean(errors.gender)} required>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <span className="field__label">Gender</span>
          {errors.gender && <span className="field__error">{errors.gender}</span>}
        </label>
        <TextInput
          label="Phone Number"
          name="phone"
          value={form.phone}
          onChange={onChange}
          error={errors.phone}
          required
        />
        <TextInput label="Email" name="email" value={form.email} onChange={onChange} error={errors.email} required />
        <TextInput
          label="Date of Birth"
          name="dob"
          type="date"
          value={form.dob}
          onChange={onChange}
          error={errors.dob}
          required
        />
        <TextInput
          label="Aadhaar Card Number"
          name="aadhaarNumber"
          value={form.aadhaarNumber}
          onChange={onChange}
          error={errors.aadhaarNumber}
          required
        />
        {/* Removed duplicate internshipType select field as it is set via selection modal */}
      </div>
    </section>
  );
}

export default PersonalForm;
