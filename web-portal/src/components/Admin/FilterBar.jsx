function uniqueOptions(students, key) {
  return [...new Set(students.map((student) => student[key]).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b)));
}

function uniqueDivisions(students) {
  return [...new Set(students.map((student) => student.trainingManagement?.division).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b)));
}

function FilterBar({ filters, onChange, students }) {
  const updateFilter = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <section className="admin-control-grid">
      <label className="admin-field">
        <span>College / University</span>
        <select
          value={filters.collegeName}
          onChange={(event) => updateFilter("collegeName", event.target.value)}
        >
          <option value="">All Colleges</option>
          {uniqueOptions(students, "collegeName").map((college) => (
            <option key={college} value={college}>
              {college}
            </option>
          ))}
        </select>
      </label>

      <label className="admin-field">
        <span>Branch</span>
        <select
          value={filters.branch}
          onChange={(event) => updateFilter("branch", event.target.value)}
        >
          <option value="">All Branches</option>
          {uniqueOptions(students, "branch").map((branch) => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
      </label>

      <label className="admin-field">
        <span>Year</span>
        <select
          value={filters.year}
          onChange={(event) => updateFilter("year", event.target.value)}
        >
          <option value="">All Years</option>
          {uniqueOptions(students, "year").map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>

      <label className="admin-field">
        <span>Status</span>
        <select
          value={filters.status}
          onChange={(event) => updateFilter("status", event.target.value)}
        >
          <option value="">All Students</option>
          <option value="Completed">Completed</option>
          <option value="Not Completed">Not Completed</option>
        </select>
      </label>

      <label className="admin-field">
        <span>Registration Date</span>
        <input
          type="date"
          value={filters.registrationDate}
          onChange={(event) =>
            updateFilter("registrationDate", event.target.value)
          }
        />
      </label>

      <label className="admin-field">
        <span>Division</span>
        <select
          value={filters.division || ""}
          onChange={(event) => updateFilter("division", event.target.value)}
        >
          <option value="">All Divisions</option>
          {uniqueDivisions(students).map((division) => (
            <option key={division} value={division}>
              {division}
            </option>
          ))}
        </select>
      </label>

      {window.location.pathname.startsWith("/admin/approved-students") && (
        <label className="admin-field">
          <span>Resignation</span>
          <select
            value={filters.resignation || ""}
            onChange={(event) => updateFilter("resignation", event.target.value)}
          >
            <option value="">All</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </label>
      )}
    </section>
  );
}

export default FilterBar;
