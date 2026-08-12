const fs = require("fs/promises");
const path = require("path");

const filePath = path.join(__dirname, "..", "data", "administration.json");
const defaultConfiguration = {
  totalAllocatedSeats: 250,
  paidSeatLimit: undefined,
  unpaidSeatLimit: undefined,
  totalSeatLimit: undefined,
  divisions: [
    "Servo System", "ABS", "SS & ST", "NS (Naval System)", "OD (Optical Design)", "CS & S", "ALTDS", "LI", "LS", "LPF", "Photonics", "EAD", "LIDAR", "FTIR", "HR", "MS", "ISO", "AI", "VI", "IRST", "OME", "LIC", "ENV", "Reprography", "MT", "P & C", "AV", "CMD", "DIR", "HRD", "WORKS", "MI", "SECURITY",
  ],
  divisionConfigurations: {},
};

const clone = (value) => JSON.parse(JSON.stringify(value));

async function getAdministration() {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    const value = JSON.parse(await fs.readFile(filePath, "utf8"));
    if (!Array.isArray(value.divisions) || !Number.isInteger(value.totalAllocatedSeats)) throw new Error("Invalid administration configuration");
    value.divisions.sort((left, right) => left.localeCompare(right));
    value.divisionConfigurations = value.divisionConfigurations && typeof value.divisionConfigurations === "object" ? value.divisionConfigurations : {};
    // Legacy installations have only totalAllocatedSeats. Keep it intact and
    // leave the new type-specific limits unset until an administrator chooses
    // a split, rather than inventing one.
    value.paidSeatLimit = Number.isSafeInteger(value.paidSeatLimit) && value.paidSeatLimit >= 0 ? value.paidSeatLimit : undefined;
    value.unpaidSeatLimit = Number.isSafeInteger(value.unpaidSeatLimit) && value.unpaidSeatLimit >= 0 ? value.unpaidSeatLimit : undefined;
    value.totalSeatLimit = value.paidSeatLimit !== undefined && value.unpaidSeatLimit !== undefined
      ? value.paidSeatLimit + value.unpaidSeatLimit
      : undefined;
    value.divisions.forEach((division) => {
      const entry = value.divisionConfigurations[division];
      value.divisionConfigurations[division] = {
        allowedBranches: Array.isArray(entry?.allowedBranches) ? entry.allowedBranches : [],
        // Legacy configurations had one total. Treat it as Unpaid capacity
        // (the historical/default internship type) until an admin configures
        // separate Paid seats; no existing allocation is removed or reset.
        paidSeats: Number.isSafeInteger(entry?.paidSeats) && entry.paidSeats >= 0 ? entry.paidSeats : undefined,
        unpaidSeats: Number.isSafeInteger(entry?.unpaidSeats) && entry.unpaidSeats >= 0 ? entry.unpaidSeats : undefined,
        totalVacancy: Number.isSafeInteger(entry?.paidSeats) && entry.paidSeats >= 0 && Number.isSafeInteger(entry?.unpaidSeats) && entry.unpaidSeats >= 0
          ? entry.paidSeats + entry.unpaidSeats
          : (Number.isSafeInteger(entry?.totalVacancy) && entry.totalVacancy >= 0 ? entry.totalVacancy : 0),
        branchSeats: entry?.branchSeats && typeof entry.branchSeats === "object" && !Array.isArray(entry.branchSeats)
          ? Object.fromEntries(Object.entries(entry.branchSeats).map(([branch, seats]) => {
              if (seats && typeof seats === "object") {
                return [branch, {
                  paid: Number.isSafeInteger(seats.paid) && seats.paid >= 0 ? seats.paid : 0,
                  unpaid: Number.isSafeInteger(seats.unpaid) && seats.unpaid >= 0 ? seats.unpaid : 0
                }];
              }
              return [branch, { paid: 0, unpaid: Number.isSafeInteger(seats) && seats >= 0 ? seats : 0 }];
            }))
          : {},
      };
    });
    Object.keys(value.divisionConfigurations).forEach((division) => {
      if (!value.divisions.includes(division)) delete value.divisionConfigurations[division];
    });
    return value;
  } catch (error) {
    if (error.code !== "ENOENT" && error.name !== "SyntaxError") throw error;
    const config = clone(defaultConfiguration);
    await saveAdministration(config);
    return config;
  }
}

async function saveAdministration(configuration) {
  configuration.divisions = [...configuration.divisions].sort((left, right) => left.localeCompare(right));
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(configuration, null, 2)}\n`, "utf8");
  await fs.rename(temporaryPath, filePath);
  return configuration;
}

module.exports = { getAdministration, saveAdministration };
