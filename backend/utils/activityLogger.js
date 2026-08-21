const ActivityLog = require("../models/ActivityLog");

/**
 * Log user activity in the admin console.
 *
 * @param {Object} params
 * @param {Object} params.req - Express request object
 * @param {string} params.module - E.g. 'Student Review', 'Training Management', etc.
 * @param {string} params.action - E.g. 'Approved Student', 'Changed Division', etc.
 * @param {string} params.description - Details of the action
 * @param {string} params.status - 'Success', 'Failed', or 'Warning'
 */
async function logActivity({ req, module, action, description, status = "Success" }) {
  try {
    const admin = req?.admin || {};
    const userId = admin._id || admin.id || "system";
    const userName = admin.name || "System";
    
    const mainAdminEmail = process.env.MAIN_ADMIN_EMAIL;
    const role = (admin.email === mainAdminEmail || admin.role === "MAIN_ADMIN") ? "MAIN_ADMIN" : "SUB_ADMIN";

    await ActivityLog.create({
      userId,
      userName,
      role,
      module,
      action,
      description,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

module.exports = { logActivity };
