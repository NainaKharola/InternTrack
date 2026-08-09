const { getAdministration } = require("./administrationService");

// Local persistence is file based, so serialise allocation checks with the
// corresponding save. This keeps a seat from being allocated twice when two
// administrators submit at nearly the same time.
let allocationLock = Promise.resolve();

function withDivisionAllocationLock(work) {
  const previous = allocationLock;
  let release;
  allocationLock = new Promise((resolve) => { release = resolve; });
  return previous.then(work).finally(release);
}

const seatCount = (value) => Math.max(0, Number(value) || 0);

function calculateTotalVacancy(configuration) {
  return (configuration?.allowedBranches || []).reduce((total, branch) => total + seatCount(configuration?.branchSeats?.[branch]), 0);
}

function calculateAvailableSeats(configuredSeats, allocatedStudents) {
  return Math.max(0, seatCount(configuredSeats) - seatCount(allocatedStudents));
}

function calculateUtilization(allocatedStudents, configuredSeats) {
  const capacity = seatCount(configuredSeats);
  return capacity ? (seatCount(allocatedStudents) / capacity) * 100 : 0;
}

async function validateDivisionCapacity({ Student, studentId, division, branch }) {
  const administration = await getAdministration();
  if (!administration.divisions.includes(division)) return "Select a valid division.";
  const configuration = administration.divisionConfigurations[division];
  const branchSeats = seatCount(configuration?.branchSeats?.[branch]);
  const totalVacancy = calculateTotalVacancy(configuration);
  if (!configuration?.allowedBranches?.includes(branch) || branchSeats === 0) return `No seats are configured for ${branch} in ${division}.`;

  const assigned = await Student.find({
    status: "Approved",
    "trainingManagement.division": division,
    completedStatus: { $ne: "Yes" },
  }).lean();
  const otherStudents = assigned.filter((assignedStudent) => String(assignedStudent._id) !== String(studentId));
  if (calculateAvailableSeats(totalVacancy, otherStudents.length) === 0) return `${division} has no available seats. The student cannot be assigned to this division.`;
  const allocatedForBranch = otherStudents.filter((assignedStudent) => assignedStudent.branch === branch).length;
  if (calculateAvailableSeats(branchSeats, allocatedForBranch) === 0) return `No available seat for ${branch} in ${division}. Please assign the student to another division.`;
  return "";
}

async function validateBranchHasAvailableDivision({ Student, studentId, branch }) {
  const administration = await getAdministration();
  for (const division of administration.divisions) {
    const capacityError = await validateDivisionCapacity({ Student, studentId, division, branch });
    if (!capacityError) return "";
  }
  return `No available division/seat is currently available for ${branch}.`;
}

module.exports = {
  calculateTotalVacancy,
  calculateAvailableSeats,
  calculateUtilization,
  validateDivisionCapacity,
  validateBranchHasAvailableDivision,
  withDivisionAllocationLock,
};
