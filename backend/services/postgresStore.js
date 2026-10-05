const crypto = require("crypto");
const pool = require("../db");
const { encrypt, decrypt } = require("../utils/encryption");


function clone(value) {
    if (value === undefined || value === null) return value;
    return JSON.parse(JSON.stringify(value));
}


function getValue(record, path) {
    return String(path)
        .split(".")
        .reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), record);
}


function matchesCondition(value, condition) {
    if (condition instanceof RegExp) return condition.test(String(value ?? ""));
    if (condition && typeof condition === "object") {
        return Object.entries(condition).every(([operator, expected]) => {
            if (operator === "$in") return Array.isArray(expected) && expected.map(String).includes(String(value));
            if (operator === "$nin") return Array.isArray(expected) && !expected.map(String).includes(String(value));
            if (operator === "$ne") return String(value) !== String(expected);
            if (operator === "$regex") return new RegExp(expected, condition.$options || "").test(String(value ?? ""));
            if (operator === "$gte") return new Date(value).getTime() >= new Date(expected).getTime();
            if (operator === "$lte") return new Date(value).getTime() <= new Date(expected).getTime();
            if (operator === "$gt") return new Date(value).getTime() > new Date(expected).getTime();
            if (operator === "$lt") return new Date(value).getTime() < new Date(expected).getTime();
            if (operator === "$exists") return expected ? value !== undefined : value === undefined;
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
    Object.entries(update.$set || {}).setForEach(([key, value]) => {
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
    const keys = tokens.map((key) => key.replace(/^+/, ""));
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
    if (!map) throw new Error("unknown storage filename: " + fileName);
    try {
        const res = await pool.query(`SELECT id, ${map.column} FROM ${map.table}`);
        return res.rows.map(row => {
            const doc = decryptDocument(row[map.column], fileName);
            if (doc && typeof doc === "object" && !Array.isArray(doc)) {
                doc._id = doc._id || String(row.id);
            }
            return doc;
        });
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
                `SELECT id FROM ${map.table} WHERE ${map.column}->>'_id' = $1 OR id::text = $1`,
                [this._id]
            );


            if (checkRes.rows.length > 0) {
                const rowId = checkRes.rows[0].id;
                let updateQuery;
                if (map.table === "students" || map.table === "admins") {
                    updateQuery = `UPDATE ${map.table} SEU ${map.column} = $1, updated_at = NOW() WHERE id = $2`;
                } else {
                    updateQuery = `UAQ�������х����MT����������յ���ā]!I�����ɀ�(�����������������(�����������������݅�Ё������Օ������ѕEՕ�䰁mɕ��ɐ��ɽ�%�t��(������������􁕱͔��(�����������������݅�Ё������Օ��(���������������������%9MIP�%9Q<�������х���􀠑��������յ����Y1UL���ĥ��(��������������������mɕ��ɑt(������������������(�������������(������������ɕ��ɸ�ѡ���(���������(�����(����=����й��ͥ���A��ѝɕ���յ��й�ɽѽ��������ѡ��̤�(��������Ё5������չ�ѥ���5�������ф���ɕ��ɸ���܁A��ѝɕ���յ��С��ф����(��������Ёɕ��ɑ̀􀠤����ɕ��Q���������9�����(����5����������􀡙��ѕȀ������ɽ���ѥ���������܁A��ѝɕ�EՕ�䡅�幌���������݅�Ёɕ��ɑ̠������ѕȠ�ɕ��ɐ�������э��̡ɕ��ɐ�����ѕȤ���A��ѝɕ���յ��Ф�͕���С�ɽ���ѥ����(����5���������=���􀡙��ѕȀ���������(������������Ё�Օ��􁹕܁A��ѝɕ�EՕ�䡅�幌���������݅�Ёɕ��ɑ̠������ѕȠ��ѕ��������э��̡�ѕ������ѕȤ���A��ѝɕ���յ��Ф�(���������Օ�乱������幌���������݅�Ё�Օ��ɕ��ɑ̠��l�t�����ձ��(���������Օ��ѡ����ɕͽ�ٔ��ɕ���Ф�����Օ��ɕ��ɑ̠��ѡ�����ѕ�̤����ɕͽ�ٔ��ѕ��l�t�����܁A��ѝɕ���յ��С�ѕ��l�t��聹ձ����ɕ���Ф�(��������ɕ��ɸ��Օ���(������(����5���������	�%��􀡥������5���������=����}��聥�����(����5������ɕ�є���幌����ф�������܁A��ѝɕ���յ��С��ф��ٔͅ���(����5���������̀��幌�����ѕȀ��������	���������݅�Ёɕ��ɑ̠���������ɕ��ɐ�������э��̡ɕ��ɐ�����ѕȤ���(����5�������չ���յ���̀��幌�����ѕȀ����������݅�Ёɕ��ɑ̠������ѕȠ�ɕ��ɐ�������э��̡ɕ��ɐ�����ѕȤ������Ѡ�(����5���������	�%���U���є���幌����������є�����쁍���Ё���յ��Ѐ�݅�Ё5���������	�%�����쁥�������յ��Ф�ɕ��ɸ��ձ��=����й��ͥ������յ��а������U���є����յ��йѽ=����Р�������є���ɕ��ɸ����յ��йٔͅ�����(����5���������ѕ5�����幌�����ѕȀ���������(������������Ё�����݅�Ёɕ��ɑ̠��(������������Ё��э�����􁅱�����ѕȠ�ɕ��ɐ�������э��̡ɕ��ɐ�����ѕȤ��(������������Ё��э����%�̀􁵅э���������Ȁ���ȹ}�������ѕȡ	��������(��������������э����%�̹����Ѡ�������(����������������Ё����􁵅�����m����9���t�(�������������݅�Ё������Օ��(�����������������1Q�I=4�������х����]!I���ф����}�����9d��Ĥ�=H�����ѕ�Ѐ�9d��ĥ��(����������������m��э����%��t(��������������(���������(��������ɕ��ɸ�쁑���ѕ��չ�聵�э���������Ѡ���(������(����ɕ��ɸ�5�����)�(()���ձ��������̀�쁍ɕ�ѕA��ѝɕ�5�������(