export function getAllocatedStudents(students, divisions) {
  const divisionSet = new Set(divisions);
  return students.filter((student) => student.status === "Approved" && divisionSet.has(student.trainingManagement?.division));
}

const nonNegativeNumber = (value) => Math.max(0, Number(value) || 0);

export function getBranchSeatCapacity(configuration, branch) {
  const configuredSeats = configuration?.branchSeats?.[branch];
  if (Number.isFinite(Number(configuredSeats))) return nonNegativeNumber(configuredSeats);
  return configuration?.allowedBranches?.includes(branch) ? nonNegativeNumber(configuration.totalVacancy) : 0;
}

export function calculateTotalVacancy(configuration) {
  return (configuration?.allowedBranches || []).reduce((sum, branch) => sum + getBranchSeatCapacity(configuration, branch), 0);
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

export function getBranchDivisionRecommendations(divisions, configurations, students, branch) {
  const rows = divisions.map((division) => {
    const configuredSeats = getBranchSeatCapacity(configurations?.[division], branch);
    const allocatedStudents = getAllocatedStudents(students, divisions).filter((student) => (
      student.trainingManagement?.division === division && student.branch === branch
    )).length;
    const divisionCapacity = calculateTotalVacancy(configurations?.[division]);
    const divisionAllocated = getAllocatedStudentCount(students, division, divisions);
    const availableSeats = Math.min(
      calculateAvailableSeats(configuredSeats, allocatedStudents),
      calculateAvailableSeats(divisionCapacity, divisionAllocated),
    );
    const isNull = configuredSeats === 0;
    return {
      division,
      configuredSeats,
      allocatedStudents,
      availableSeats,
      utilization: calculateUtilization(allocatedStudents, configuredSeats),
      isNull
    };
  });

  const filteredRows = rows.filter((row) => row.configuredSeats > 0);

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
  return sortRecommendations(divisions.map((division) => {
    const allocatedStudents = allocations[division] || 0;
    const totalVacancy = calculateTotalVacancy(configurations?.[division]);
    const availableSeats = calculateAvailableSeats(totalVacancy, allocatedStudents);
    return { division, totalVacancy, allocatedStudents, availableSeats, utilization: calculateUtilization(allocatedStudents, totalVacancy), isFull: totalVacancy > 0 && availableSeats === 0, isUnconfigured: totalVacancy === 0 && allocatedStudents === 0 };
  }));
}

export function getGeneralDivisionRecommendations(divisions, configurations, students) {
  const allocated = getAllocatedStudents(students, divisions);
  const allocations = allocated.reduce((counts, student) => ({ ...counts, [student.trainingManagement?.division]: (counts[student.trainingManagement?.division] || 0) + 1 }), {});

  const rows = divisions.map((division) => {
    const configuredSeats = calculateTotalVacancy(configurations?.[division]);
    const allocatedStudents = allocations[division] || 0;
    const availableSeats = calculateAvailableSeats(configuredSeats, allocatedStudents);
    const isNull = configuredSeats === 0;
    return {
      division,
      configuredSeats,
      allocatedStudents,
      availableSeats,
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
