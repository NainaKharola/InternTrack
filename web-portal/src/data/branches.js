export const branches = [
  "Computer Science and Engineering",
  "Information Technology",
  "Electronics and Communication",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Aerospace Engineering",
  "Artificial Intelligence and Data Science",
];

export function normalizeBranch(branch) {
  if (!branch || typeof branch !== "string") return "";
  const raw = branch.trim();
  if (!raw || raw === "-" || raw.toLowerCase() === "null" || raw.toLowerCase() === "undefined") return "";

  const exact = branches.find(b => b.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;

  // Strip branch codes / numbers in parentheses / brackets like (01), [01], (CSE), (02), (CS)
  let clean = raw
    .replace(/\s*\([0-9a-zA-Z\s_-]+\)\s*/g, " ")
    .replace(/\s*\[[0-9a-zA-Z\s_-]+\]\s*/g, " ")
    // Strip leading code patterns: "01 - ", "01-", "01. ", "01: ", "01 "
    .replace(/^\s*\d+\s*[-_.:]\s*/, "")
    // Strip trailing code patterns: " - 01", "-01", " 01"
    .replace(/\s*[-_.:]\s*\d+\s*$/, "")
    // Replace "&" with "and"
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();

  const lower = (clean || raw).toLowerCase();

  if (
    lower === "01" ||
    lower === "cs" ||
    lower === "cse" ||
    lower.includes("computer") ||
    lower.includes("comp sci") ||
    lower.includes("software")
  ) {
    return "Computer Science and Engineering";
  }

  if (
    lower === "02" ||
    lower === "it" ||
    lower.includes("information tech") ||
    lower.includes("info tech")
  ) {
    return "Information Technology";
  }

  if (
    lower === "03" ||
    lower === "04" ||
    lower === "ece" ||
    lower === "ec" ||
    lower.includes("electronics") ||
    lower.includes("telecom") ||
    lower.includes("communication")
  ) {
    return "Electronics and Communication";
  }

  if (
    lower === "05" ||
    lower === "ee" ||
    lower === "eee" ||
    lower.includes("electrical")
  ) {
    return "Electrical Engineering";
  }

  if (
    lower === "06" ||
    lower === "me" ||
    lower === "mech" ||
    lower.includes("mechanical")
  ) {
    return "Mechanical Engineering";
  }

  if (
    lower === "07" ||
    lower === "ce" ||
    lower === "civil" ||
    lower.includes("civil")
  ) {
    return "Civil Engineering";
  }

  if (
    lower === "08" ||
    lower === "ae" ||
    lower.includes("aero") ||
    lower.includes("space")
  ) {
    return "Aerospace Engineering";
  }

  if (
    lower === "09" ||
    lower === "ai" ||
    lower === "aids" ||
    lower === "ai&ds" ||
    lower === "ds" ||
    lower.includes("artificial intelligence") ||
    lower.includes("data science")
  ) {
    return "Artificial Intelligence and Data Science";
  }

  for (const std of branches) {
    if (std.toLowerCase().includes(lower) || lower.includes(std.toLowerCase())) {
      return std;
    }
  }

  return clean || raw;
}

