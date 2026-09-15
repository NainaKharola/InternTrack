const bcrypt = require("bcryptjs");
const { createPostgresModel } = require("../services/postgresStore");

module.exports = createPostgresModel("admins.json", {}, {
  async beforeSave(admin) {
    if (admin.password && !admin.password.startsWith("$2")) {
      admin.password = await bcrypt.hash(admin.password, 12);
    }
    if (admin.secretAnswer && !admin.secretAnswer.startsWith("$2")) {
      admin.secretAnswer = await bcrypt.hash(admin.secretAnswer.trim().toLowerCase(), 12);
    }
  },
  async matchPassword(candidate) {
    if (!this.password || !candidate) return false;
    return bcrypt.compare(candidate, this.password);
  },
  async matchSecretAnswer(candidate) {
    if (!this.secretAnswer || !candidate) return false;
    return bcrypt.compare(candidate.trim().toLowerCase(), this.secretAnswer);
  },
  async matchSecurityQuestionAnswer(questionId, candidateAnswer) {
    if (!candidateAnswer) return false;
    const questions = this.securityQuestions || [];
    const q = questions.find((x) => x.id === questionId);
    if (!q) {
      if (questionId === "secret" && this.secretAnswer) {
        return this.matchSecretAnswer(candidateAnswer);
      }
      return false;
    }
    const hash = q.answer_hash || q.answer;
    if (!hash) return false;
    return bcrypt.compare(candidateAnswer.trim().toLowerCase(), hash);
  },
});
