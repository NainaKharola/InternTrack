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
    if (this.password.startsWith("$2")) {
      return bcrypt.compare(candidate, this.password);
    }
    return this.password === candidate;
  },
  async matchSecretAnswer(candidate) {
    if (!this.secretAnswer || !candidate) return false;
    if (this.secretAnswer.startsWith("$2")) {
      return bcrypt.compare(candidate.trim().toLowerCase(), this.secretAnswer);
    }
    return this.secretAnswer.trim().toLowerCase() === candidate.trim().toLowerCase();
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
    if (hash.startsWith("$2")) {
      return bcrypt.compare(candidateAnswer.trim().toLowerCase(), hash);
    }
    return hash.trim().toLowerCase() === candidateAnswer.trim().toLowerCase();
  },
});
