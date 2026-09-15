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
  return (configuration?.allowedBranches || []).reduce((total, branch) => {
    const seats = configuration?.branchSeats?.[branch];
    if (seats && typeof seats === "object") {
      return total + seatCount(seats.paid) + seatCount(seats.unpaid);
    }
    return total + seatCount(seats);
  }, 0);
}

function calculateAvailableSeats(configuredSeats, allocatedStudents) {
  return Math.max(0, seatCount(configuredSeats) - seatCount(allocatedStudents));
}

function calculateUtilization(allocatedStudents, configuredSeats) {
  const capacity = seatCount(configuredSeats);
  return capacity ? (seatCount(allocatedStudents) / capacity) * 100 : 0;
}

const { normalizeBranch } = require("./studentImportService");

async function validateDivisionCapacity({ Student, studentId, division, branch, internshipType = "Unpaid" }) {
  const administration = await getAdministration();
  if (!administration.divisions.includes(division)) return "Select a valid division.";
  const configuration = administration.divisionConfigurations[division];
  const normalizedBranch = normalizeBranch(branch) || branch || "";
  const normalizedType = internshipType === "Paid" ? "Paid" : "Unpaid";
  const typeKey = normalizedType.toLowerCase();

  // Find branch seats object with case-insensitive / normalized lookup
  let branchSeatObj = configuration?.branchSeats?.[normalizedBranch];
  if (branchSeatObj === undefined && configuration?.branchSeats) {
    for (const [key, value] of Object.entries(configuration.branchSeats)) {
      if (key.toLowerCase() === normalizedBranch.toLowerCase() || normalizeBranch(key).toLowerCase() === normalizedBranch.toLowerCase()) {
        branchSeatObj = value;
        break;
      }
    }
  }

  const acceptsBranch = (configuration?.allowedBranches || []).some(b => b.toLowerCase() === normalizedBranch.toLowerCase() || normalizeBranch(b).toLowerCase() === normalizedBranch.toLowerCase()) || branchSeatObj !== undefined;

  let branchSeats = 0;
  if (branchSeatObj && typeof branchSeatObj === "object") {
    branchSeats = seatCount(branchSeatObj[typeKey]);
    if (branchSeats === 0 && seatCount(branchSeatObj.paid) > 0) {
      branchSeats = seatCount(branchSeatObj.paid);
    } else if (branchSeats === 0 && seatCount(branchSeatObj.unpaid) > 0) {
      branchSeats = seatCount(branchSeatObj.unpaid);
    }
  } else if (typeof branchSeatObj === "number" || (typeof branchSeatObj === "string" && branchSeatObj !== "")) {
    branchSeats = seatCount(branchSeatObj);
  } else if (acceptsBranch) {
    branchSeats = seatCount(configuration?.totalVacancy || 10);
  }

  if (!acceptsBranch || branchSeats === 0) {
    return `No seats are configured for ${normalizedBranch || branch} in ${division}.`;
  }

  const assigned = await Student.find({
    status: "Approved",
    "trainingManagement.division": division,
    completedStatus: { $ne: "Yes" },
  }).lean();
  const otherStudents = assigned.filter((assignedStudent) => String(assignedStudent._id) !== String(studentId));

  let paidCapacity = 0;
  let unpaidCapacity = 0;
  (configuration?.allowedBranches || []).forEach((b) => {
    const seats = configuration?.branchSeats?.[b];
    if (seats && typeof seats === "object") {
      paidCapacity += seatCount(seats.paid);
      unpaidCapacity += seatCount(seats.unpaid);
    } else {
      unpaidCapacity += seatCount(seats);
    }
  });

  const totalCapacity = paidCapacity + unpaidCapacity || seatCount(configuration?.totalVacancy);
  const typeCapacity = normalizedType === "Paid" ? (paidCapacity > 0 ? paidCapacity : totalCapacity) : (unpaidCapacity > 0 ? unpaidCapacity : totalCapacity);
  const allocatedForType = otherStudents.filter((assignedStudent) => (assignedStudent.internshipType || "Unpaid") === normalizedType).length;

  if (typeCapacity > 0 && calculateAvailableSeats(typeCapacity, allocatedForType) === 0) {
    return `${division} has no available ${normalizedType.toLowerCase()} internship seats. The student cannot be assigned to this division.`;
  }

  const allocatedForBranch = otherStudents.filter((assignedStudent) => {
    const sBranch = normalizeBranch(assignedStudent.trainingManagement?.branch || assignedStudent.branch || assignedStudent.discipline || assignedStudent.department || "") || assignedStudent.branch || "";
    return sBranch.toLowerCase() === normalizedBranch.toLowerCase();
  }).length;

  if (calculateAvailableSeats(branchSeats, allocatedForBranch) === 0) {
    return `No available seat for ${normalizedBranch || branch} in ${division}. Please assign the student to another division.`;
  }

  return "";
}

async function validateBranchHasAvailableDivision({ Student, studentId, branch, internshipType }) {
  const administration = await getAdministration();
  for (const division of administration.divisions) {
    const capacityError = await validateDivisionCapacity({ Student, studentId, division, branch, internshipType });
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
