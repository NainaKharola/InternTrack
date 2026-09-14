require("dotenv").config();
const pool = require("../db");

const branchMap = {
  "SEED003": "Computer Science and Engineering",
  "SEED004": "Computer Science and Engineering",
  "SEED005": "Information Technology",
  "SEED007": "Mechanical Engineering",
  "SEED008": "Aerospace Engineering",
  "8V95NVM": "Electronics and Communication",
  "9OSTS0A": "Computer Science and Engineering",
  "ZT7ZFM6": "Computer Science and Engineering",
  "18GN7T7": "Civil Engineering"
};

async function fixBranches() {
  try {
    const res = await pool.query("SELECT id, student_data FROM students");
    for (const row of res.rows) {
      const data = row.student_data || {};
      const ref = data.referenceId;
      const assignedBranch = branchMap[ref] || data.branch || "Computer Science and Engineering";
      
      data.branch = assignedBranch;
      if (!data.trainingManagement) data.trainingManagement = {};
      data.trainingManagement.branch = assignedBranch;
      if (data.offerLetter) data.offerLetter.branch = assignedBranch;

      await pool.query(
        "UPDATE students SET student_data = $1 WHERE id = $2",
        [data, row.id]
      );
      console.log(`Updated student [${ref}] ${data.name} -> branch: "${assignedBranch}"`);
    }
    console.log("All student branches updated successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Failed to update branches:", err);
    process.exit(1);
  }
}

fixBranches();
