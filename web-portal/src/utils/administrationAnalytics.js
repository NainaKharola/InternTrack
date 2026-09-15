import { normalizeBranch } from "../data/branches.js";

export function getAllocatedStudents(students, divisions) {
  const divisionSet = new Set(divisions);
  return (students || []).filter((student) => student.status === "Approved" && divisionSet.has(student.trainingManagement?.division));
}

const nonNegativeNumber = (value) => Math.max(0, Number(value) || 0);

export function getBranchSeatCapacity(configuration, branch) {
  const targetBranch = normalizeBranch(branch) || branch;
  let configuredSeats = configuration?.branchSeats?.[targetBranch];
  if (configuredSeats === undefined && configuration?.branchSeats) {
    for (const [key, value] of Object.entries(configuration.branchSeats)) {
      if (key.toLowerCase() === targetBranch.toLowerCase() || normalizeBranch(key).toLowerCase() === targetBranch.toLowerCase()) {
        configuredSeats = value;
        break;
      }
    }
  }
  if (configuredSeats && typeof configuredSeats === "object") {
    return nonNegativeNumber(configuredSeats.paid) + nonNegativeNumber(configuredSeats.unpaid);
  }
  if (Number.isFinite(Number(configuredSeats))) return nonNegativeNumber(configuredSeats);
  return configuration?.allowedBranches?.includes(targetBranch) ? nonNegativeNumber(configuration.totalVacancy) : 0;
}

export function calculateTotalVacancy(configuration) {
  return (configuration?.allowedBranches || []).reduce((sum, branch) => {
    const seats = configuration?.branchSeats?.[branch];
    if (seats && typeof seats === "object") {
      return sum + nonNegativeNumber(seats.paid) + nonNegativeNumber(seats.unpaid);
    }
    return sum + getBranchSeatCapacity(configuration, branch);
  }, 0);
}

export function calculateAvailableSeats(configuredSeats, allocatedStudents) {
  return Math.max(0, nonNegativeNumber(configuredSeats) - nonNegativeNumber(allocatedStudents));
}

export function calculateUtilization(allocatedStudents, configuredSeats) {
  const capacity = nonNegativeNumber(configuredSeats);
  return capacity ? (nonNegativeNumber(allocatedStudents) / capacity) * 100 : 0;
}

export function formatUtilization(utilization) {
  return `${Number(Number(utilization || 0).toFixed(1))}%`;
}

export function sortRecommendations(rows) {
  return [...rows].sort((left, right) => left.division.localeCompare(right.division));
}

export function getAllocatedStudentCount(students, division, divisions) {
  return getAllocatedStudents(students, divisions).filter((student) => student.trainingManagement?.division === division).length;
}

export function getBranchDivisionRecommendations(divisions, configurations, students, branch, student) {
  const targetBranch = normalizeBranch(branch || student?.trainingManagement?.branch || student?.branch || student?.discipline || student?.department || "") || branch || "";
  const normalizedType = student?.internshipType === "Paid" ? "Paid" : "Unpaid";
  const isPaidStudent = normalizedType === "Paid";

  const rows = (divisions || []).map((division) => {
    const config = configurations?.[division];
    const allowedBranches = config?.allowedBranches || [];
    
    // Find matching branch seats
    let seats = config?.branchSeats?.[targetBranch];
    if (seats === undefined && config?.branchSeats) {
      for (const [key, value] of Object.entries(config.branchSeats)) {
        if (key.toLowerCase() === targetBranch.toLowerCase() || normalizeBranch(key).toLowerCase() === targetBranch.toLowerCase()) {
          seats = value;
          break;
        }
      }
    }

    const acceptsBranch = allowedBranches.some(b => b.toLowerCase() === targetBranch.toLowerCase() || normalizeBranch(b).toLowerCase() === targetBranch.toLowerCase()) || seats !== undefined;

    let paidConfiguredSeats = 0;
    let unpaidConfiguredSeats = 0;

    if (seats && typeof seats === "object") {
      paidConfiguredSeats = nonNegativeNumber(seats.paid);
      unpaidConfiguredSeats = nonNegativeNumber(seats.unpaid);
    } else if (typeof seats === "number" || (typeof seats === "string" && seats !== "")) {
      unpaidConfiguredSeats = nonNegativeNumber(seats);
    } else if (acceptsBranch) {
      paidConfiguredSeats = nonNegativeNumber(config?.paidSeats || 0);
      unpaidConfiguredSeats = nonNegativeNumber(config?.unpaidSeats || config?.totalVacancy || 0);
    }

    const totalConfigured = paidConfiguredSeats + unpaidConfiguredSeats;

    // Allocated students
    const allocated = getAllocatedStudents(students, divisions);
    const branchAllocated = allocated.filter((s) => {
      const sBranch = normalizeBranch(s.trainingManagement?.branch || s.branch || s.discipline || s.department || "") || s.branch || "";
      return s.trainingManagement?.division === division && sBranch.toLowerCase() === targetBranch.toLowerCase();
    });

    const paidAllocated = branchAllocated.filter(s => s.internshipType === "Paid").length;
    const unpaidAllocated = branchAllocated.filter(s => (s.internshipType || "Unpaid") !== "Paid").length;
    const totalAllocated = paidAllocated + unpaidAllocated;

    const availablePaidSeats = Math.max(0, paidConfiguredSeats - paidAllocated);
    const availableUnpaidSeats = Math.max(0, unpaidConfiguredSeats - unpaidAllocated);

    const relevantConfigured = isPaidStudent ? paidConfiguredSeats : (unpaidConfiguredSeats > 0 ? unpaidConfiguredSeats : totalConfigured);
    const relevantAllocated = isPaidStudent ? paidAllocated : unpaidAllocated;
    const relevantAvailable = isPaidStudent ? availablePaidSeats : (unpaidConfiguredSeats > 0 ? availableUnpaidSeats : (availablePaidSeats + availableUnpaidSeats));

    const isNull = totalConfigured === 0 && !acceptsBranch;

    return {
      division,
      configuredSeats: relevantConfigured,
      allocatedStudents: relevantAllocated,
      availableSeats: relevantAvailable,
      availablePaidSeats,
      availableUnpaidSeats,
      utilization: calculateUtilization(totalAllocated, totalConfigured || 1),
      isNull,
      acceptsBranch,
      totalConfigured
    };
  });

  // Filter divisions: include any division that accepts the branch or has configured seats for this branch
  const filteredRows = rows.filter((row) => row.acceptsBranch || row.totalConfigured > 0);

  return filteredRows.sort((left, right) => {
    if (left.availableSeats !== right.availableSeats) {
      return right.availableSeats - left.availableSeats;
    }
    return left.division.localeCompare(right.division);
  });
}

export function getDivisionAllocationRows(divisions, configurations, students) {
  const allocated = getAllocatedStudents(students, divisions);
  const allocations = allocated.reduce((counts, student) => ({ ...counts, [student.trainingManagement?.division]: (counts[student.trainingManagement?.division] || 0) + 1 }), {});
  return sortRecommendations((divisions || []).map((division) => {
    const allocatedStudents = allocations[division] || 0;
    const totalVacancy = calculateTotalVacancy(configurations?.[division]);
    const availableSeats = calculateAvailableSeats(totalVacancy, allocatedStudents);
    return {
      division,
      totalVacancy,
      allocatedStudents,
      availableSeats,
      utilization: calculateUtilization(allocatedStudents, totalVacancy),
      isFull: totalVacancy > 0 && availableSeats === 0,
      isUnconfigured: totalVacancy === 0 && allocatedStudents === 0
    };
  }));
}

export function getGeneralDivisionRecommendations(divisions, configurations, students) {
  const allocated = getAllocatedStudents(students, divisions);

  const rows = (divisions || []).map((division) => {
    const configuration = configurations?.[division];
    const typeCapacity = (typeKey) => (configuration?.allowedBranches || []).reduce((total, branch) => {
      const seats = configuration?.branchSeats?.[branch];
      if (seats && typeof seats === "object") return total + nonNegativeNumber(seats[typeKey]);
      return total + (typeKey === "unpaid" ? nonNegativeNumber(seats) : 0);
    }, 0);
    const paidConfiguredSeats = typeCapacity("paid");
    const unpaidConfiguredSeats = typeCapacity("unpaid");
    const paidAllocatedStudents = allocated.filter((student) => student.trainingManagement?.division === division && student.internshipType === "Paid").length;
    const unpaidAllocatedStudents = allocated.filter((student) => student.trainingManagement?.division === division && student.internshipType !== "Paid").length;
    const availablePaidSeats = calculateAvailableSeats(paidConfiguredSeats, paidAllocatedStudents);
    const availableUnpaidSeats = calculateAvailableSeats(unpaidConfiguredSeats, unpaidAllocatedStudents);
    const configuredSeats = paidConfiguredSeats + unpaidConfiguredSeats;
    const allocatedStudents = paidAllocatedStudents + unpaidAllocatedStudents;
    const availableSeats = availablePaidSeats + availableUnpaidSeats;
    const isNull = configuredSeats === 0;
    return {
      division,
      configuredSeats,
      allocatedStudents,
      availableSeats,
      paidConfiguredSeats,
      unpaidConfiguredSeats,
      paidAllocatedStudents,
      unpaidAllocatedStudents,
      availablePaidSeats,
      availableUnpaidSeats,
      utilization: calculateUtilization(allocatedStudents, configuredSeats),
      isNull
    };
  });

  return rows.sort((left, right) => {
    if (left.isNull !== right.isNull) {
      return left.isNull ? 1 : -1;
    }
    if (!left.isNull) {
      if (left.availableSeats !== right.availableSeats) {
        return right.availableSeats - left.availableSeats;
      }
    }
    return left.division.localeCompare(right.division);
  });
}
