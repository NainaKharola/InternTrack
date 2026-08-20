require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Admin = require("./models/Admin");

async function seedAdmins() {
  try {
    const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL;
    if (!mainAdminEmail) {
      console.error("❌ MAIN_ADMIN_EMAIL is not configured in the .env file.");
      process.exit(1);
    }
    
    // Check if the main admin already exists
    const existingAdmin = await Admin.findOne({ email: mainAdminEmail });
    
    if (!existingAdmin) {
      // Generate secure random password
      const plainPassword = crypto.randomBytes(16).toString("hex");
      
      const adminData = {
        name: "Vaibhav Gupta",
        email: mainAdminEmail,
        password: plainPassword,
        role: "MAIN_ADMIN",
      };
      
      await Admin.create(adminData);
      
      // Save password to git-ignored text file
      const passwordFilePath = path.join(__dirname, "seed_password.txt");
      fs.writeFileSync(passwordFilePath, `Email: ${mainAdminEmail}\nPassword: ${plainPassword}\n`, "utf8");
      
      console.log(`✅ Main Admin created successfully.`);
      console.log(`🔑 Credentials saved securely to: backend/seed_password.txt`);
    } else {
      console.log(`ℹ️ Main Admin (${mainAdminEmail}) already exists.`);
    }

    console.log("🎉 Seeding check completed.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
}

seedAdmins();
