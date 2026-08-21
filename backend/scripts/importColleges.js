const fs = require("fs/promises");
const path = require("path");
const { saveColleges } = require("../services/collegeService");

async function importColleges() {
  const csvPath = path.join(__dirname, "..", "data", "UniversityList.csv");
  const names = (await fs.readFile(csvPath, "utf8"))
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.replace(/^"+|"+$/g, "").replace(/""/g, '"').trim())
    .filter(Boolean);
  const uniqueNames = [...new Map(names.map((name) => [name.toLocaleLowerCase("en-US"), name])).values()];
  await saveColleges(uniqueNames.map((name, index) => ({ id: index + 1, name })));
  console.log(`Imported ${uniqueNames.length} colleges into PostgreSQL.`);
}

importColleges().catch((error) => { console.error(error); process.exitCode = 1; });
