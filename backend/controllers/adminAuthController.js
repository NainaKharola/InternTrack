const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Admin = require("../models/Admin");
const { logActivity } = require("../utils/activityLogger");
const { getCookieOptions } = require("../utils/cookieOptions");
const ActivityLog = require("../models/ActivityLog");
const { generatePdfFromHtml } = require("../services/pdfService");

function signToken(admin) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL;
  const role = (admin.email === mainAdminEmail || admin.role === "MAIN_ADMIN") ? "MAIN_ADMIN" : "SUB_ADMIN";

  return jwt.sign({ id: admin._id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

function sanitizeAdmin(admin) {
  const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL;
  const role = (admin.email === mainAdminEmail || admin.role === "MAIN_ADMIN") ? "MAIN_ADMIN" : "SUB_ADMIN";
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role,
    recoverySetup: !!admin.recoverySetup || !!admin.secretQuestion,
    secretQuestion: admin.secretQuestion,
  };
}

async function registerAdmin(req, res) {
  try {
    const { name, email, password, setupKey } = req.body;
    const adminCount = await Admin.countDocuments();

    const requiredSetupKey = process.env.ADMIN_SETUP_KEY;
    if (requiredSetupKey) {
      if (setupKey !== requiredSetupKey) {
        return res.status(403).json({
          success: false,
          message: "Admin setup key is incorrect or required.",
        });
      }
    } else if (process.env.NODE_ENV === "production") {
      return res.status(500).json({
        success: false,
        message: "Server configuration error: ADMIN_SETUP_KEY is not configured.",
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

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const admin = await Admin.findOne({ email }).select("+password");

    if (!admin) {
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

    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = signToken(admin);

    res.cookie("token", token, getCookieOptions({
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    }));

    return res.status(200).json({
      success: true,
      admin: sanitizeAdmin(admin),
      token,
    });
  } catch (error) {
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

async function logoutAdmin(req, res) {
  res.clearCookie("token", getCookieOptions());
  return res.status(200).json({ success: true, message: "Logged out successfully." });
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
    const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL;
    const sanitized = admins.map(admin => {
      const isMain = admin.email === mainAdminEmail || admin.role === "MAIN_ADMIN";
      return {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: isMain ? "MAIN_ADMIN" : "SUB_ADMIN",
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

    const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL;
    const isMain = admin.email === mainAdminEmail || admin.role === "MAIN_ADMIN";
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

    const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL;
    const isMain = admin.email === mainAdminEmail || admin.role === "MAIN_ADMIN";
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

function signResetToken(admin) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }
  const jti = crypto.randomBytes(16).toString("hex");
  const token = jwt.sign(
    {
      id: admin._id,
      email: admin.email,
      purpose: "password_reset",
      jti,
    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );
  return { token, jti };
}

async function getSecurityQuestions(req, res) {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }
    const list = Array.isArray(admin.securityQuestions) ? admin.securityQuestions : [];
    // Migration fallback if legacy secretQuestion exists
    if (list.length === 0 && admin.secretQuestion) {
      list.push({
        id: "default-1",
        question: admin.secretQuestion,
        answer_hash: admin.secretAnswer,
        answer: admin.secretAnswer,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      admin.securityQuestions = list;
      await admin.save();
    }

    const questions = list.map((q) => ({
      id: q.id,
      question: q.question,
      answer: "••••••••",
      created_at: q.created_at,
      updated_at: q.updated_at,
    }));
    return res.status(200).json({ success: true, questions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to load security questions." });
  }
}

async function saveSecurityQuestion(req, res) {
  try {
    const { id, question, answer } = req.body;
    if (!question || String(question).trim().length < 3) {
      return res.status(400).json({ success: false, message: "Question must be at least 3 characters long." });
    }
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }

    admin.securityQuestions = Array.isArray(admin.securityQuestions) ? admin.securityQuestions : [];

    const bcrypt = require("bcryptjs");
    let hashedAnswer = "";
    if (answer && answer !== "••••••••") {
      hashedAnswer = await bcrypt.hash(answer.toLowerCase().trim(), 12);
    }

    if (id) {
      const existing = admin.securityQuestions.find((q) => q.id === id);
      if (!existing) {
        return res.status(404).json({ success: false, message: "Security question not found." });
      }
      existing.question = question.trim();
      existing.updated_at = new Date().toISOString();
      if (hashedAnswer) {
        existing.answer_hash = hashedAnswer;
        existing.answer = hashedAnswer;
      }

      await admin.save();

      await logActivity({
        req,
        module: "Profile",
        action: "Updated Security Question",
        description: `Updated security question: "${existing.question}".`,
        status: "Success",
      });

      return res.status(200).json({ success: true, message: "Security question updated successfully." });
    } else {
      if (!answer || !answer.trim()) {
        return res.status(400).json({ success: false, message: "Answer is required when creating a new question." });
      }
      const newQuestion = {
        id: crypto.randomBytes(8).toString("hex"),
        question: question.trim(),
        answer_hash: hashedAnswer,
        answer: hashedAnswer,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      admin.securityQuestions.push(newQuestion);
      admin.recoverySetup = true;
      admin.secretQuestion = newQuestion.question;
      admin.secretAnswer = hashedAnswer;

      await admin.save();

      await logActivity({
        req,
        module: "Profile",
        action: "Created Security Question",
        description: `Added new security question: "${newQuestion.question}".`,
        status: "Success",
      });

      return res.status(201).json({ success: true, message: "Security question created successfully.", question: { id: newQuestion.id, question: newQuestion.question, answer: "••••••••" } });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to save security question." });
  }
}

async function deleteSecurityQuestion(req, res) {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }

    const currentQuestions = Array.isArray(admin.securityQuestions) ? admin.securityQuestions : [];
    if (currentQuestions.length <= 1) {
      return res.status(400).json({
        success: false,
        message: "You must keep at least one recovery question configured to use password recovery.",
      });
    }

    const target = currentQuestions.find((q) => q.id === id);
    if (!target) {
      return res.status(404).json({ success: false, message: "Security question not found." });
    }

    admin.securityQuestions = currentQuestions.filter((q) => q.id !== id);
    if (admin.securityQuestions.length === 0) {
      admin.recoverySetup = false;
      admin.secretQuestion = "";
      admin.secretAnswer = "";
    } else {
      admin.secretQuestion = admin.securityQuestions[0].question;
      admin.secretAnswer = admin.securityQuestions[0].answer_hash || admin.securityQuestions[0].answer;
    }

    await admin.save();

    await logActivity({
      req,
      module: "Profile",
      action: "Deleted Security Question",
      description: `Deleted security question: "${target.question}".`,
      status: "Success",
    });

    return res.status(200).json({ success: true, message: "Security question deleted successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to delete security question." });
  }
}

async function getForgotPasswordQuestions(req, res) {
  try {
    const email = String(req.query.email || req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: "Email address is required." });
    }
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ success: false, message: "No recovery questions configured for this email." });
    }

    const list = Array.isArray(admin.securityQuestions) ? admin.securityQuestions : [];
    if (list.length > 0) {
      return res.status(200).json({
        success: true,
        questions: list.map((q) => ({ id: q.id, question: q.question })),
      });
    }

    if (admin.secretQuestion) {
      return res.status(200).json({
        success: true,
        questions: [{ id: "secret", question: admin.secretQuestion }],
      });
    }

    return res.status(404).json({ success: false, message: "No recovery questions configured for this email." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to look up recovery questions." });
  }
}

async function verifyRecoveryAnswer(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const questionId = String(req.body.questionId || (req.body.answers?.[0]?.id) || "").trim();
    const answer = String(req.body.answer || (req.body.answers?.[0]?.answer) || "").trim();

    if (!email || !questionId || !answer) {
      return res.status(400).json({ success: false, message: "Email, question ID, and answer are required." });
    }

    const admin = await Admin.findOne({ email }).select("+password +secretAnswer");
    if (!admin) {
      return res.status(400).json({ success: false, message: "Invalid recovery attempt." });
    }

    const isMatch = await admin.matchSecurityQuestionAnswer(questionId, answer);
    if (!isMatch) {
      await logActivity({
        req: { ...req, admin },
        module: "Authentication",
        action: "Recovery Verification Failed",
        description: `Failed recovery answer verification for email ${admin.email}.`,
        status: "Failed",
      });
      return res.status(400).json({ success: false, message: "Incorrect answer. Please check and try again." });
    }

    const { token, jti } = signResetToken(admin);
    admin.pendingResetJti = jti;
    await admin.save();

    await logActivity({
      req: { ...req, admin },
      module: "Authentication",
      action: "Recovery Verification Succeeded",
      description: `Successfully verified recovery question for email ${admin.email}.`,
      status: "Success",
    });

    return res.status(200).json({
      success: true,
      message: "Answer verified successfully.",
      resetToken: token,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to verify recovery answer." });
  }
}

async function resetPasswordWithToken(req, res) {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;
    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "Reset authorization token, new password, and confirm password are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ success: false, message: "Reset token has expired or is invalid. Please verify your answer again." });
    }

    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({ success: false, message: "Invalid reset token purpose." });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin account not found." });
    }

    if (admin.pendingResetJti && admin.pendingResetJti !== decoded.jti) {
      return res.status(400).json({ success: false, message: "This reset authorization has already been used. Please verify again." });
    }

    admin.password = newPassword;
    admin.pendingResetJti = null;
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();

    await logActivity({
      req: { ...req, admin },
      module: "Authentication",
      action: "Password Reset Completed",
      description: `Password reset successfully via secret question recovery for email ${admin.email}.`,
      status: "Success",
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to reset password." });
  }
}

// Backward-compatible wrapper for any existing reset callers
async function resetPasswordQuestions(req, res) {
  if (req.body.resetToken) {
    return resetPasswordWithToken(req, res);
  }
  const verifyRes = await verifyRecoveryAnswer(req, {
    status: (code) => ({
      json: (data) => ({ code, data })
    })
  });
  if (verifyRes?.code && verifyRes.code !== 200) {
    return res.status(verifyRes.code).json(verifyRes.data);
  }
  if (verifyRes?.data?.resetToken) {
    req.body.resetToken = verifyRes.data.resetToken;
    return resetPasswordWithToken(req, res);
  }
  return res.status(400).json({ success: false, message: "Recovery verification failed." });
}

module.exports = {
  registerAdmin,
  loginAdmin,
  logoutAdmin,
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
  verifyRecoveryAnswer,
  resetPasswordWithToken,
  resetPasswordQuestions
};
