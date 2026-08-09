const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Admin = require("../models/Admin");
const { logActivity } = require("../utils/activityLogger");
const ActivityLog = require("../models/ActivityLog");
const { generatePdfFromHtml } = require("../services/pdfService");

function signToken(admin) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  const role = admin.email === "vaibhav.drdo@gmail.com" ? "MAIN_ADMIN" : (admin.role || "SUB_ADMIN");

  return jwt.sign({ id: admin._id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

function sanitizeAdmin(admin) {
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.email === "vaibhav.drdo@gmail.com" ? "MAIN_ADMIN" : (admin.role || "SUB_ADMIN"),
    recoverySetup: !!admin.recoverySetup || !!admin.secretQuestion,
    secretQuestion: admin.secretQuestion,
  };
}

async function registerAdmin(req, res) {
  try {
    const { name, email, password, setupKey } = req.body;
    const adminCount = await Admin.countDocuments();

    if (
      adminCount > 0 &&
      (!process.env.ADMIN_SETUP_KEY || setupKey !== process.env.ADMIN_SETUP_KEY)
    ) {
      return res.status(403).json({
        success: false,
        message: "Admin setup key is required.",
      });
    }

    if (!email || !password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Email and a password of at least 8 characters are required.",
      });
    }

    if (await Admin.exists({ email })) {
      const duplicate = new Error("An admin with this email already exists.");
      duplicate.code = 11000;
      throw duplicate;
    }

    const admin = await Admin.create({ name, email, password });
    const token = signToken(admin);

    return res.status(201).json({
      success: true,
      admin: sanitizeAdmin(admin),
      token,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An admin with this email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to create admin.",
    });
  }
}

async function loginAdmin(req, res) {
  try {
    const { email, password } = req.body;

    console.log("=================================");
    console.log("Login Request");
    console.log("Email:", email);
    console.log("Password Entered:", password);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const admin = await Admin.findOne({ email }).select("+password");

    console.log("Admin Found:", admin);

    if (!admin) {
      console.log("❌ Admin not found.");
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!admin.password || admin.password === "") {
      return res.status(401).json({
        success: false,
        message: "Your account password is not set. Please ask a Main Admin to set it.",
      });
    }

    console.log("Stored Hash:", admin.password);

    const isMatch = await admin.matchPassword(password);

    console.log("Password Match:", isMatch);

    if (!isMatch) {
      console.log("❌ Password does not match.");
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = signToken(admin);

    console.log("✅ Login Successful");

    return res.status(200).json({
      success: true,
      admin: sanitizeAdmin(admin),
      token,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to login.",
    });
  }
}

async function getAdminProfile(req, res) {
  return res.status(200).json({
    success: true,
    admin: sanitizeAdmin(req.admin),
  });
}

async function changeAdminPassword(req, res) {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const admin = await Admin.findById(req.admin._id).select("+password");

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters long." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    const isMatch = await admin.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect old password." });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({ success: false, message: "New password cannot be the same as the old password." });
    }

    admin.password = newPassword;
    await admin.save();

    await logActivity({
      req,
      module: "Profile",
      action: "Changed Own Password",
      description: "Changed own account password successfully.",
      status: "Success",
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully."
    });
  } catch (error) {
    await logActivity({
      req,
      module: "Profile",
      action: "Changed Own Password",
      description: `Failed to change own password. Error: ${error.message}`,
      status: "Failed",
    });

    return res.status(500).json({ success: false, message: error.message || "Failed to change password." });
  }
}

async function setupRecoveryInfo(req, res) {
  try {
    const { secretQuestion, secretAnswer } = req.body;
    if (!secretQuestion || !secretAnswer) {
      return res.status(400).json({ success: false, message: "Secret question and secret answer are required." });
    }
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }

    admin.secretQuestion = secretQuestion;
    admin.secretAnswer = secretAnswer;
    admin.recoverySetup = true;

    await admin.save();

    await logActivity({
      req,
      module: "Profile",
      action: "Setup Recovery Info",
      description: "Setup recovery information (secret question and secret answer) successfully.",
      status: "Success",
    });

    return res.status(200).json({
      success: true,
      message: "Recovery information saved successfully."
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to save recovery info." });
  }
}

async function resetPasswordRecovery(req, res) {
  try {
    const { email, birthPlace, birthDate, newPassword, confirmPassword } = req.body;
    if (!email || !birthPlace || !birthDate || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    const admin = await Admin.findOne({ email }).select("+password +birthPlace +birthDate");
    if (!admin || !admin.recoverySetup) {
      return res.status(400).json({ success: false, message: "Invalid recovery information." });
    }

    const bcrypt = require("bcryptjs");
    const isPlaceMatch = await bcrypt.compare(birthPlace.toLowerCase().trim(), admin.birthPlace);
    const isDateMatch = await bcrypt.compare(birthDate.trim(), admin.birthDate);

    if (!isPlaceMatch || !isDateMatch) {
      return res.status(400).json({ success: false, message: "Invalid recovery information." });
    }

    admin.password = newPassword;
    await admin.save();

    await logActivity({
      req: { ...req, admin },
      module: "Profile",
      action: "Reset Password via Recovery",
      description: `Reset password via recovery info for email ${email}.`,
      status: "Success",
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully."
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to reset password." });
  }
}

async function createSubUser(req, res) {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required." });
    }

    if (await Admin.exists({ email })) {
      return res.status(400).json({ success: false, message: "An admin user with this email already exists." });
    }

    const newAdmin = await Admin.create({
      name,
      email,
      role: "SUB_ADMIN",
      status: "Active",
      password: ""
    });

    await logActivity({
      req,
      module: "Profile",
      action: "Added User",
      description: `Added new sub-user: ${email}.`,
      status: "Success",
    });

    return res.status(201).json({
      success: true,
      message: "Sub-user created successfully.",
      user: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: "SUB_ADMIN",
        passwordStatus: "Not Set"
      }
    });
  } catch (error) {
    await logActivity({
      req,
      module: "Profile",
      action: "Added User",
      description: `Failed to add sub-user. Error: ${error.message}`,
      status: "Failed",
    });

    return res.status(500).json({ success: false, message: error.message || "Failed to create user." });
  }
}

async function listSubUsers(req, res) {
  try {
    const admins = await Admin.find({});
    const sanitized = admins.map(admin => {
      const isMain = admin.email === "vaibhav.drdo@gmail.com";
      return {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: isMain ? "MAIN_ADMIN" : (admin.role || "SUB_ADMIN"),
        passwordStatus: admin.password && admin.password.startsWith("$2") ? "Password Created" : "Not Set"
      };
    });
    return res.status(200).json({
      success: true,
      users: sanitized
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to list users." });
  }
}

async function deleteSubUser(req, res) {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isMain = admin.email === "vaibhav.drdo@gmail.com";
    if (isMain) {
      return res.status(400).json({ success: false, message: "Permanent Main Administrators cannot be deleted." });
    }

    await Admin.deleteMany({ _id: id });

    await logActivity({
      req,
      module: "Profile",
      action: "Deleted User",
      description: `Deleted sub-user: ${admin.email}.`,
      status: "Success",
    });

    return res.status(200).json({
      success: true,
      message: "User deleted successfully."
    });
  } catch (error) {
    await logActivity({
      req,
      module: "Profile",
      action: "Deleted User",
      description: `Failed to delete user. Error: ${error.message}`,
      status: "Failed",
    });

    return res.status(500).json({ success: false, message: error.message || "Failed to delete user." });
  }
}

async function createSubUserPassword(req, res) {
  try {
    const { id } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isMain = admin.email === "naina@gmail.com" || admin.email === "vaibhav@gmail.com";
    if (isMain && req.admin.email !== admin.email) {
      return res.status(403).json({ success: false, message: "Cannot modify password of other Main Administrators." });
    }

    admin.password = newPassword;
    await admin.save();

    await logActivity({
      req,
      module: "Profile",
      action: "Create Password for Users",
      description: `Created/updated password for user ${admin.email}.`,
      status: "Success",
    });

    return res.status(200).json({
      success: true,
      message: "Password created/updated successfully."
    });
  } catch (error) {
    await logActivity({
      req,
      module: "Profile",
      action: "Create Password for Users",
      description: `Failed to set password for user ID ${req.params.id}. Error: ${error.message}`,
      status: "Failed",
    });

    return res.status(500).json({ success: false, message: error.message || "Failed to set password." });
  }
}

async function getUserActivityLog(req, res) {
  try {
    const { id } = req.params;
    const user = await Admin.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const logs = await ActivityLog.find({ userId: id }).sort({ timestamp: -1 });

    return res.status(200).json({
      success: true,
      logs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch activity log." });
  }
}

async function exportUserActivityLog(req, res) {
  try {
    const { id } = req.params;
    const { format } = req.query;
    const user = await Admin.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const logs = await ActivityLog.find({ userId: id }).sort({ timestamp: -1 });

    // Format timestamps to local strings for display
    const formattedLogs = logs.map((log) => {
      const dt = new Date(log.timestamp);
      // Format to 30-07-2026 09:10 AM style
      const dateStr = dt.toLocaleDateString("en-GB").replace(/\//g, "-"); // DD-MM-YYYY
      const timeStr = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      return {
        ...log,
        date: dateStr,
        time: timeStr,
      };
    });

    if (format === "excel") {
      // Generate CSV
      let csv = "\uFEFF"; // UTF-8 BOM so Excel opens it with proper encoding
      csv += "Serial No.,Date,Time,Module,Action,Description,Status\n";
      formattedLogs.forEach((log, index) => {
        const serialNo = index + 1;
        const date = log.date;
        const time = log.time;
        const module = log.module || "";
        const action = log.action || "";
        const description = (log.description || "").replace(/"/g, '""'); // escape quotes
        const status = log.status || "";
        csv += `${serialNo},"${date}","${time}","${module}","${action}","${description}","${status}"\n`;
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Activity-Log-${user.name.replace(/\s+/g, "_")}.csv"`
      );
      return res.status(200).send(csv);
    } else {
      // Generate PDF
      const rowsHtml = formattedLogs.map((log, index) => {
        const statusClass = `status-${log.status ? log.status.toLowerCase() : "success"}`;
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${log.date}</td>
            <td>${log.time}</td>
            <td>${log.module || ""}</td>
            <td>${log.action || ""}</td>
            <td>${log.description || ""}</td>
            <td><span class="${statusClass}">${log.status || "Success"}</span></td>
          </tr>
        `;
      }).join("\n");

      const generatedDate = new Date().toLocaleString("en-US", { hour12: true });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            h1 { color: #1a365d; font-size: 24px; margin-bottom: 5px; }
            h2 { color: #4a5568; font-size: 14px; margin-bottom: 20px; font-weight: normal; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f1f5f9; color: #1a365d; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .status-success { color: #15803d; font-weight: bold; }
            .status-failed { color: #b91c1c; font-weight: bold; }
            .status-warning { color: #b45309; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>User Activity Log</h1>
          <h2>User: ${user.name} (${user.email}) | Generated on: ${generatedDate}</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">S.No.</th>
                <th style="width: 15%;">Date</th>
                <th style="width: 12%;">Time</th>
                <th style="width: 18%;">Module</th>
                <th style="width: 20%;">Action</th>
                <th style="width: 20%;">Description</th>
                <th style="width: 10%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const pdfBuffer = await generatePdfFromHtml(html);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Activity-Log-${user.name.replace(/\s+/g, "_")}.pdf"`
      );
      return res.status(200).send(pdfBuffer);
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to export activity log." });
  }
}

async function getSecurityQuestions(req, res) {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }
    const questions = (admin.securityQuestions || []).map(q => ({
      id: q.id,
      question: q.question,
      answer: "••••••••"
    }));
    return res.status(200).json({ success: true, questions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function saveSecurityQuestion(req, res) {
  try {
    const { id, question, answer } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, message: "Question is required." });
    }
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }
    
    admin.securityQuestions ||= [];
    
    const bcrypt = require("bcryptjs");
    let hashedAnswer = "";
    if (answer && answer !== "••••••••") {
      hashedAnswer = await bcrypt.hash(answer.toLowerCase().trim(), 12);
    }
    
    if (id) {
      const existing = admin.securityQuestions.find(q => q.id === id);
      if (!existing) {
        return res.status(404).json({ success: false, message: "Question not found." });
      }
      existing.question = question;
      if (hashedAnswer) {
        existing.answer = hashedAnswer;
      }
    } else {
      if (!answer) {
        return res.status(400).json({ success: false, message: "Answer is required." });
      }
      admin.securityQuestions.push({
        id: crypto.randomBytes(8).toString("hex"),
        question,
        answer: hashedAnswer
      });
    }
    
    await admin.save();
    return res.status(200).json({ success: true, message: "Security question saved successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteSecurityQuestion(req, res) {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }
    admin.securityQuestions = (admin.securityQuestions || []).filter(q => q.id !== id);
    await admin.save();
    return res.status(200).json({ success: true, message: "Security question deleted successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getForgotPasswordQuestions(req, res) {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }
    if (!admin.secretQuestion) {
      return res.status(400).json({ success: false, message: "Admin does not have a secret question set up." });
    }
    
    return res.status(200).json({
      success: true,
      questions: [{ id: "secret", question: admin.secretQuestion }]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function resetPasswordQuestions(req, res) {
  try {
    const { email, answers, newPassword, confirmPassword } = req.body;
    if (!email || !answers || !answers[0] || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }
    
    const admin = await Admin.findOne({ email }).select("+password +secretAnswer");
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }
    
    const isMatch = await admin.matchSecretAnswer(answers[0].answer);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect answer." });
    }
    
    admin.password = newPassword;
    await admin.save();
    
    await logActivity({
      req: { ...req, admin },
      module: "Profile",
      action: "Reset Password via Secret Question",
      description: `Reset password via secret question for email ${email}.`,
      status: "Success",
    });
    
    return res.status(200).json({ success: true, message: "Password reset successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  changeAdminPassword,
  setupRecoveryInfo,
  resetPasswordRecovery,
  createSubUser,
  listSubUsers,
  deleteSubUser,
  createSubUserPassword,
  getUserActivityLog,
  exportUserActivityLog,
  getSecurityQuestions,
  saveSecurityQuestion,
  deleteSecurityQuestion,
  getForgotPasswordQuestions,
  resetPasswordQuestions
};