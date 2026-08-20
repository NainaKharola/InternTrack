const pool = require("../db");
const crypto = require("crypto");
const { encrypt, decrypt } = require("../utils/encryption");

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

const mapping = {
    "students.json": { table: "students", column: "student_data" },
    "admins.json": { table: "admins", column: "admin_data" },
    "gyapan.json": { table: "gyapan", column: "data" },
    "activityLogs.json": { table: "activity_logs", column: "data" },
    "durations.json": { table: "durations", column: "data" },
    "colleges.json": { table: "colleges", column: "name" }
};

function encryptDocument(record, fileName) {
    if (!record) return record;
    const cloned = clone(record);
    if (fileName === "students.json") {
        if (cloned.aadhaarNumber) {
            cloned.aadhaarNumber = encrypt(cloned.aadhaarNumber);
        }
        if (cloned.bankDetails && typeof cloned.bankDetails === "object") {
            cloned.bankDetails = encrypt(JSON.stringify(cloned.bankDetails));
        }
    }
    return cloned;
}

function decryptDocument(record, fileName) {
    if (!record) return record;
    const cloned = clone(record);
    if (fileName === "students.json") {
        if (cloned.aadhaarNumber) {
            cloned.aadhaarNumber = decrypt(cloned.aadhaarNumber);
        }
        if (cloned.bankDetails) {
            try {
                const decryptedStr = decrypt(cloned.bankDetails);
                cloned.bankDetails = JSON.parse(decryptedStr);
            } catch (e) {
                // If it starts with '{' but decryption didn't apply, try parsing direct
                if (typeof cloned.bankDetails === "string" && cloned.bankDetails.trim().startsWith("{")) {
                    try { cloned.bankDetails = JSON.parse(cloned.bankDetails); } catch (err) {}
                }
            }
        }
    }
    return cloned;
}

async function readTable(fileName) {
    const map = mapping[fileName];
    if (!map) throw new Error("Unknown storage filename: " + fileName);
    try {
        const res = await pool.query(`SELECT ${map.column} FROM ${map.table}`);
        return res.rows.map(row => decryptDocument(row[map.column], fileName));
    } catch (error) {
        console.error(`Error reading from table ${map.table}:`, error);
        return [];
    }
}

class PostgresQuery {
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

function createPostgresModel(fileName, defaults = {}, methods = {}) {
    class PostgresDocument {
        constructor(data = {}) { Object.assign(this, clone({ ...defaults, ...data })); this._id ||= crypto.randomBytes(12).toString("hex"); }
        toObject() { return clone(this); }
        async save() {
            if (methods.beforeSave) await methods.beforeSave(this);
            const record = encryptDocument(this.toObject(), fileName);
            const map = mapping[fileName];

            const checkRes = await pool.query(
                `SELECT id FROM ${map.table} WHERE ${map.column}->>'_id' = $1`,
                [this._id]
            );

            if (checkRes.rows.length > 0) {
                let updateQuery;
                if (map.table === "students" || map.table === "admins") {
                    updateQuery = `UPDATE ${map.table} SET ${map.column} = $1, updated_at = NOW() WHERE ${map.column}->>'_id' = $2`;
                } else {
                    updateQuery = `UPDATE ${map.table} SET ${map.column} = $1 WHERE ${map.column}->>'_id' = $2`;
                }
                await pool.query(updateQuery, [record, this._id]);
            } else {
                await pool.query(
                    `INSERT INTO ${map.table} (${map.column}) VALUES ($1)`,
                    [record]
                );
            }
            return this;
        }
    }
    Object.assign(PostgresDocument.prototype, methods);
    const Model = function Model(data) { return new PostgresDocument(data); };
    const records = () => readTable(fileName);
    Model.find = (filter = {}, projection) => new PostgresQuery(async () => (await records()).filter((record) => matches(record, filter)), PostgresDocument).select(projection);
    Model.findOne = (filter = {}) => {
        const query = new PostgresQuery(async () => (await records()).filter((item) => matches(item, filter)), PostgresDocument);
        query.lean = async () => (await query.records())[0] || null;
        query.then = (resolve, reject) => query.records().then((items) => resolve(items[0] ? new PostgresDocument(items[0]) : null), reject);
        return query;
    };
    Model.findById = (id) => Model.findOne({ _id: id });
    Model.create = async (data) => new PostgresDocument(data).save();
    Model.exists = async (filter = {}) => Boolean((await records()).find((record) => matches(record, filter)));
    Model.countDocuments = async (filter = {}) => (await records()).filter((record) => matches(record, filter)).length;
    Model.findByIdAndUpdate = async (id, update) => { const document = await Model.findById(id); if (!document) return null; Object.assign(document, applyUpdate(document.toObject(), update)); return document.save(); };
    Model.deleteMany = async (filter = {}) => {
        const all = await records();
        const matching = all.filter((record) => matches(record, filter));
        const matchingIds = matching.map(r => r._id);
        if (matchingIds.length > 0) {
            const map = mapping[fileName];
            await pool.query(
                `DELETE FROM ${map.table} WHERE ${map.column}->>'_id' = ANY($1)`,
                [matchingIds]
            );
        }
        return { deletedCount: matching.length };
    };
    return Model;
}

module.exports = { createPostgresModel };
