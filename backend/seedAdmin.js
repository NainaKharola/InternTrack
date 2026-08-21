require("dotenv").config();
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
      // The initial password is supplied only through the environment.
      const plainPassword = process.env.MAIN_ADMIN_INITIAL_PASSWORD;
      if (!plainPassword) {
        throw new Error("MAIN_ADMIN_INITIAL_PASSWORD is required when creating the initial admin.");
      }
      
      const adminData = {
        name: process.env.MAIN_ADMIN_NAME || "Main Administrator",
        email: mainAdminEmail,
        password: plainPassword,
        role: "MAIN_ADMIN",
      };
      
      await Admin.create(adminData);
      
      // Never write credentials to disk.
      console.log(`✅ Main Admin created successfully.`);
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
