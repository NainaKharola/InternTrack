import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAllocatedStudents, getAllocatedStudentCount, getStudentDivision, getDivisionAllocationRows, getGeneralDivisionRecommendations, getBranchDivisionRecommendations } from './administrationAnalytics.js';

const divisions = ['AI', 'Optics'];
const branch = 'Computer Science and Engineering';
const configurations = Object.fromEntries(divisions.map((division) => [division, { allowedBranches: [branch], branchSeats: { [branch]: { paid: 4, unpaid: 4 } } }]));
const students = [
  { status: 'Approved', branch, internshipType: 'Paid', trainingManagement: { division: ' ai ' }, division: 'Optics' },
  { status: 'Approved', branch, division: 'Ai', recommendedBy: 'Optics' },
  { status: 'Approved', branch, internshipType: 'Paid', recommendedBy: ' aI ' },
  { status: 'Pending', branch, division: 'AI' },
  { status: 'Approved', branch, division: 'Unknown', recommendedBy: 'AI' },
];

test('division precedence is consistent, including empty fallback', () => {
  assert.equal(getStudentDivision(students[0]), ' ai ');
  assert.equal(getStudentDivision(students[1]), 'Ai');
  assert.equal(getStudentDivision(students[2]), ' aI ');
  assert.equal(getStudentDivision({}), '');
});

test('configured division identity reconciles filtering, totals, branch counts, and paid/unpaid counts', () => {
  assert.equal(getAllocatedStudents(students, divisions).length, 3);
  assert.equal(getAllocatedStudentCount(students, 'AI', divisions), 3);
  assert.equal(getAllocatedStudentCount(students, 'Optics', divisions), 0);
  const allocation = getDivisionAllocationRows(divisions, configurations, students).find((r) => r.division === 'AI');
  assert.equal(allocation.allocatedStudents, 3);
  assert.equal(allocation.availableSeats, 5);
  const general = getGeneralDivisionRecommendations(divisions, configurations, students).find((r) => r.division === 'AI');
  assert.equal(general.paidAllocatedStudents, 2);
  assert.equal(general.unpaidAllocatedStudents, 1);
  assert.equal(general.allocatedStudents, 3);
  const paid = getBranchDivisionRecommendations(divisions, configurations, students, branch, { internshipType: 'Paid' }).find((r) => r.division === 'AI');
  const unpaid = getBranchDivisionRecommendations(divisions, configurations, students, branch, {}).find((r) => r.division === 'AI');
  assert.equal(paid.allocatedStudents, 2);
  assert.equal(unpaid.allocatedStudents, 1);
  assert.equal(paid.availableSeats, 2);
  assert.equal(unpaid.availableSeats, 3);
});
