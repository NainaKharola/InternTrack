const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ExcelJS = require('exceljs');
const template = require('../services/templateService');

function load(relativePath, mocks) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const originalRequire = createRequire(filename);
  const module = { exports: {} };
  vm.runInThisContext(`(function(require, module, exports) {${fs.readFileSync(filename, 'utf8')}\n})`, { filename })(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : originalRequire(name), module, module.exports,
  );
  return module.exports;
}

function response() {
  return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

function approvalController(records) {
  const Student = {
    async findById(id) {
      const record = records.find((s) => s._id === id);
      if (!record) return null;
      const copy = structuredClone(record);
      copy.save = async () => {
        const { save, ...data } = copy;
        Object.assign(record, data);
      };
      return copy;
    },
    find(query) {
      return { lean: async () => records.filter((s) => s.status === query.status && s.trainingManagement?.division === query['trainingManagement.division'] && s.completedStatus !== 'Yes') };
    },
  };
  const capacity = load('services/divisionCapacityService.js', {
    './administrationService': { getAdministration: async () => ({
      divisions: ['AI'], divisionConfigurations: { AI: { allowedBranches: ['Computer Science and Engineering'], branchSeats: { 'Computer Science and Engineering': { paid: 1, unpaid: 1 } } } },
    }) },
    './studentImportService': { normalizeBranch: (branch) => branch },
  });
  return load('controllers/adminStudentController.js', {
    '../models/Student': Student,
    '../services/divisionCapacityService': capacity,
    '../services/pdfService': {},
    '../services/certificateService': {},
    '../services/localStorageService': {},
    '../services/emailService': {},
    '../utils/activityLogger': { logActivity: async () => {} },
  }).updateStudentReview;
}

const pending = (id, trainingManagement) => ({ _id: id, status: 'Pending', name: 'Test', branch: 'Computer Science and Engineering', internshipType: 'Paid', division: 'AI', recommendedBy: 'Unknown', trainingManagement });
const approve = (controller, id) => controller({ params: { id }, body: { status: 'Approved' }, admin: { email: 'admin@example.test' } }, response());

for (const training of [undefined, { division: '' }]) {
  test(`approval rejects a full division before saving (${training ? 'empty training division' : 'no training'})`, async () => {
    const records = [pending('new', training), { ...pending('allocated', { division: 'AI' }), status: 'Approved' }];
    const before = structuredClone(records[0]);
    const result = await approve(approvalController(records), 'new');
    assert.equal(result.code, 400);
    assert.match(result.body.message, /no available/i);
    assert.deepEqual(records[0], before);
  });
  test(`approval prefers root division and allocates available seat (${training ? 'empty training division' : 'no training'})`, async () => {
    const records = [pending('new', training)];
    assert.equal((await approve(approvalController(records), 'new')).code, 200);
    assert.equal(records[0].trainingManagement.division, 'AI');
  });
}

test('concurrent approvals cannot claim the same final seat', async () => {
  const records = [pending('first'), pending('second', { division: '' })];
  const controller = approvalController(records);
  const results = await Promise.all(records.map((s) => approve(controller, s._id)));
  assert.deepEqual(results.map((r) => r.code).sort(), [200, 400]);
  assert.equal(records.filter((s) => s.status === 'Approved').length, 1);
});

test('approval retains an empty division when neither fallback exists', async () => {
  const records = [{ ...pending('new'), division: '', recommendedBy: '' }];
  assert.equal((await approve(approvalController(records), 'new')).code, 200);
  assert.equal(records[0].trainingManagement.division, '');
});

test('spreadsheet addresses and locations stay separate on create, update, and blank updates', async () => {
  const records = [];
  const Student = {
    findOne: async (query) => records.find((s) => query.$or.some((part) => part.referenceId === s.referenceId)),
    exists: async () => false,
    create: async (data) => { records.push({ _id: 'student', ...data }); },
    findByIdAndUpdate: async (id, updates) => Object.assign(records.find((s) => s._id === id), updates),
  };
  const { importStudentsFromExcel } = load('services/studentImportService.js', { '../models/Student': Student });
  async function importRow(address, location) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Students');
    sheet.addRow(['Reference ID', 'Student Name', 'College Location', 'College Address']);
    sheet.addRow(['ADDR001', 'Test Student', location, address]);
    const result = await importStudentsFromExcel(await workbook.xlsx.writeBuffer());
    assert.equal(result.summary.failed, 0, JSON.stringify(result.errors));
  }
  await importRow('12 Campus Road', 'Dehradun');
  assert.equal(records.length, 1);
  assert.equal(records[0].collegeAddress, '12 Campus Road');
  assert.equal(records[0].trainingManagement.collegeAddress, '12 Campus Road');
  assert.equal(records[0].location, 'Dehradun');
  await importRow('34 College Road', 'Delhi');
  assert.equal(records[0].collegeAddress, '34 College Road');
  assert.equal(records[0].trainingManagement.collegeAddress, '34 College Road');
  assert.equal(records[0].location, 'Delhi');
  await importRow('  ', 'Mumbai');
  assert.equal(records[0].collegeAddress, '34 College Road');
  assert.equal(records[0].trainingManagement.collegeAddress, '34 College Road');
  assert.equal(records[0].location, 'Mumbai');
});

test('explicit empty address clears generated and persisted offer letter addresses', async () => {
  const student = { _id: 'letter', status: 'Approved', collegeAddress: 'Root address', location: 'City', trainingManagement: { collegeAddress: 'Training address' }, offerLetter: { collegeAddress: 'Old offer address' }, save: async () => {} };
  assert.equal(template.buildTemplateData(student).collegeAddress, 'Training address');
  assert.equal(template.buildTemplateData(student, { collegeAddress: '' }).collegeAddressBlock, 'City');
  const { updateOfferLetter } = load('controllers/offerLetterController.js', {
    '../models/Student': { findById: async () => student },
    '../services/pdfService': { generatePdfFromHtml: async () => {} },
    '../services/emailService': {},
    '../utils/activityLogger': { logActivity: async () => {} },
  });
  const result = await updateOfferLetter({ params: { studentId: 'letter' }, body: { studentName: 'Test', collegeName: 'College', course: 'B.Tech', collegeAddress: '' }, admin: { email: 'admin@example.test' } }, response());
  assert.equal(result.code, 200);
  assert.equal(student.collegeAddress, '');
  assert.equal(student.trainingManagement.collegeAddress, '');
  assert.equal(student.offerLetter.collegeAddress, '');
  for (const oldAddress of ['Root address', 'Training address', 'Old offer address']) assert.ok(!result.body.html.includes(oldAddress));
  assert.equal(template.buildTemplateData(student).collegeAddress, '');
});
