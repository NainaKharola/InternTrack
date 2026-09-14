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

  // 1. Direct exact match
  const exact = branches.find(b => b.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;

  // Check if string contains branch in parentheses, e.g. "B.Tech (CSE)" or "B.E (ECE)"
  const matchParen = raw.match(/\(([^)]+)\)/);
  if (matchParen && matchParen[1]) {
    const inside = normalizeBranch(matchParen[1]);
    if (inside && inside !== matchParen[1].trim()) return inside;
  }

  // 2. Clean extraneous branch codes or numbers in parentheses / brackets like (01), [CSE]
  let clean = raw
    .replace(/\s*\([0-9a-zA-Z\s_-]+\)\s*/g, " ")
    .replace(/\s*\[[0-9a-zA-Z\s_-]+\]\s*/g, " ")
    .replace(/^\s*\d+\s*[-_.:]\s*/, "")
    .replace(/\s*[-_.:]\s*\d+\s*$/, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();

  const lower = (clean || raw).toLowerCase();

  // 3. Exact word-boundary match for standard branches
  if (/\b(cse|comp(uter)?\s*sci(ence)?(\s*and\s*eng(ineering)?)?|software(\s*eng(ineering)?)?)\b/i.test(lower)) {
    return "Computer Science and Engineering";
  }

  if (/\b(it|info(rmation)?\s*tech(nology)?)\b/i.test(lower)) {
    return "Information Technology";
  }

  if (/\b(ece|telecom(munication)?|electronics(\s*and\s*comm(unication)?)?)\b/i.test(lower)) {
    return "Electronics and Communication";
  }

  if (/\b(eee?|electrical(\s*engineering)?)\b/i.test(lower)) {
    return "Electrical Engineering";
  }

  if (/\b(me|mech(anical)?(\s*engineering)?)\b/i.test(lower)) {
    return "Mechanical Engineering";
  }

  if (/\b(ce|civil(\s*engineering)?)\b/i.test(lower)) {
    return "Civil Engineering";
  }

  if (/\b(ae|aero(space)?(\s*engineering)?)\b/i.test(lower)) {
    return "Aerospace Engineering";
  }

  if (/\b(ai|ds|aids|ai&ds|data\s*science|artificial\s*intelligence)\b/i.test(lower)) {
    return "Artificial Intelligence and Data Science";
  }

  // 4. Case-insensitive standard branch match
  for (const std of branches) {
    if (std.toLowerCase() === lower) {
      return std;
    }
  }

  // 5. Fallback: preserve original string cleanly
  return clean || raw;
}


