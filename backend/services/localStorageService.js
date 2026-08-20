const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const dataDirectory = path.join(__dirname, "..", "data");
const uploadsDirectory = path.join(__dirname, "..", "uploads");

const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const getValue = (object, key) => key.split(".").reduce((value, part) => value?.[part], object);

function matchesCondition(value, condition) {
  if (condition && typeof condition === "object" && !Array.isArray(condition)) {
    return Object.entries(condition).every(([operator, expected]) => {
      if (operator === "$in") return expected.map(String).includes(String(value));
      if (operator === "$ne") return String(value) !== String(expected);
      if (operator === "$exists") return expected ? value !== undefined : value === undefined;
      if (operator === "$regex") return new RegExp(expected, condition.$options || "").test(String(value || ""));
      if (operator === "$options") return true;
      if (operator === "$gte") return new Date(value).getTime() >= new Date(expected).getTime();
      if (operator === "$lte") return new Date(value).getTime() <= new Date(expected).getTime();
      if (operator === "$gt") return new Date(value).getTime() > new Date(expected).getTime();
      if (operator === "$lt") return new Date(value).getTime() < new Date(expected).getTime();
      return false;
    });
  }
  return String(value) === String(condition);
}


function matches(record, filter = {}) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$or") return condition.some((entry) => matches(record, entry));
    if (key === "$and") return condition.every((entry) => matches(record, entry));
    return matchesCondition(getValue(record, key), condition);
  });
}

async function ensureJsonFile(fileName) {
  await fs.mkdir(dataDirectory, { recursive: true });
  const filePath = path.join(dataDirectory, fileName);
  try { await fs.access(filePath); } catch { await fs.writeFile(filePath, "[]\n", "utf8"); }
  return filePath;
}

async function readJson(fileName) {
  const filePath = await ensureJsonFile(fileName);
  try {
    const data = JSON.parse(await fs.readFile(filePath, "utf8") || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(`Unable to read local data file ${fileName}: ${error.message}`);
  }
}

async function writeJson(fileName, records) {
  const filePath = await ensureJsonFile(fileName);
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  await fs.rename(temporaryPath, filePath);
}

function applyUpdate(record, update = {}) {
  const next = { ...record, ...clone(update) };
  delete next.$set;
  Object.entries(update.$set || {}).forEach(([key, value]) => {
    const parts = key.split("."); let target = next;
    while (parts.length > 1) { const part = parts.shift(); target[part] ||= {}; target = target[part]; }
    target[parts[0]] = value;
  });
  return next;
}

function project(record, projection) {
  if (!projection) return record;
  const tokens = String(projection).split(/\s+/).filter(Boolean);
  const includeAll = tokens.some((token) => token.startsWith("+"));
  const keys = tokens.map((key) => key.replace(/^\+/, ""));
  if (includeAll) {
    return { ...record };
  }
  const result = { _id: record._id };
  keys.forEach((key) => { if (record[key] !== undefined) result[key] = record[key]; });
  return result;
}

class LocalQuery {
  constructor(loader, Document) { this.loader = loader; this.Document = Document; this.projection = null; this.sortSpec = null; }
  select(value) { this.projection = value; return this; }
  sort(value) { this.sortSpec = value; return this; }
  async records() {
    const records = await this.loader();
    if (this.sortSpec) {
      const entries = Object.entries(this.sortSpec);
      records.sort((a, b) => entries.reduce((result, [key, direction]) => {
        if (result) return result; const left = getValue(a, key) ?? ""; const right = getValue(b, key) ?? "";
        return (left > right ? 1 : left < right ? -1 : 0) * (direction === -1 ? -1 : 1);
      }, 0));
    }
    return records.map((record) => project(record, this.projection));
  }
  lean() { return this.records(); }
  then(resolve, reject) { return this.records().then(resolve, reject); }
}

function createLocalModel(fileName, defaults = {}, methods = {}) {
  class LocalDocument {
    constructor(data = {}) { Object.assign(this, clone({ ...defaults, ...data })); this._id ||= crypto.randomBytes(12).toString("hex"); }
    toObject() { return clone(this); }
    async save() {
      if (methods.beforeSave) await methods.beforeSave(this);
      const records = await readJson(fileName); const record = this.toObject();
      const index = records.findIndex((item) => String(item._id) === String(this._id));
      if (index < 0) records.push(record); else records[index] = record;
      await writeJson(fileName, records); return this;
    }
  }
  Object.assign(LocalDocument.prototype, methods);
  const Model = function Model(data) { return new LocalDocument(data); };
  const records = () => readJson(fileName);
  Model.find = (filter = {}, projection) => new LocalQuery(async () => (await records()).filter((record) => matches(record, filter)), LocalDocument).select(projection);
  Model.findOne = (filter = {}) => {
    const query = new LocalQuery(async () => (await records()).filter((item) => matches(item, filter)), LocalDocument);
    query.lean = async () => (await query.records())[0] || null;
    query.then = (resolve, reject) => query.records().then((items) => resolve(items[0] ? new LocalDocument(items[0]) : null), reject);
    return query;
  };
  Model.findById = (id) => Model.findOne({ _id: id });
  Model.create = async (data) => new LocalDocument(data).save();
  Model.exists = async (filter = {}) => Boolean((await records()).find((record) => matches(record, filter)));
  Model.countDocuments = async (filter = {}) => (await records()).filter((record) => matches(record, filter)).length;
  Model.findByIdAndUpdate = async (id, update) => { const document = await Model.findById(id); if (!document) return null; Object.assign(document, applyUpdate(document.toObject(), update)); return document.save(); };
  Model.deleteMany = async (filter = {}) => { const all = await records(); const retained = all.filter((record) => !matches(record, filter)); await writeJson(fileName, retained); return { deletedCount: all.length - retained.length }; };
  return Model;
}

async function saveLocalFile(buffer, folder, originalName = "document.pdf") {
  const extension = path.extname(originalName) || ".pdf";
  const filename = `${Date.now()}-${crypto.randomBytes(5).toString("hex")}${extension.toLowerCase()}`;
  const directory = path.join(uploadsDirectory, folder);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, filename), buffer);
  return { filename, localPath: path.join(directory, filename), url: `/uploads/${folder}/${filename}` };
}

async function removeLocalFile(file) {
  const url = file?.url || file?.pdfUrl || file;
  if (!url) return;

  // 1. Delete from S3/MinIO
  try {
    const { deleteFile } = require("./s3StorageService");
    await deleteFile(url);
  } catch (s3Error) {
    console.error("Failed to delete file from S3:", s3Error);
  }

  // 2. Delete from local storage (if it exists)
  if (String(url).startsWith("/uploads/")) {
    const localPath = path.join(__dirname, "..", String(url).replace(/^\/+/, ""));
    try {
      await fs.unlink(localPath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("Failed to delete local file:", error);
      }
    }
  }
}

module.exports = { createLocalModel, readJson, writeJson, saveLocalFile, removeLocalFile };