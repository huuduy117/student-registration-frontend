/**
 * Frontend utility checks that run without installing dependencies.
 *
 *   npm run verify:utils
 *
 * These cover the pure helpers introduced while fixing the schedule, class
 * request and enrollment screens. Component tests need Vitest + jsdom, which
 * are not installed yet; keep those for a separate setup.
 */

import assert from "node:assert/strict";

const schedule = await import("../src/utils/schedule.js");
const classRequest = await import("../src/utils/classRequest.js");
const apiPayload = await import("../src/utils/apiPayload.js");
const roleUtils = await import("../src/utils/roleUtils.js");

// ─── schedule ───────────────────────────────────────────────────────────────
const full = {
  scheduleId: "SS_1",
  courseName: "Lập trình web",
  sectionId: "12345678-aaaa-bbbb-cccc-ddddeeeeffff",
  courseId: "CRS_1",
  periodStart: 1,
  periodEnd: 3,
  room: "A101",
  teacherName: "Nguyễn Văn A",
  sessionType: "Lecture",
};

assert.equal(schedule.getCourseName(full), "Lập trình web");
assert.equal(schedule.getSectionCode(full), "12345678…");
assert.equal(schedule.getCourseCode(full), "CRS_1");
assert.equal(schedule.getRoom(full), "A101");
assert.equal(schedule.getTeacherName(full), "Nguyễn Văn A");
assert.equal(schedule.formatPeriods(full), "Tiết: 1 - 3");

// Legacy payloads must still render.
const legacy = {
  tenMH: "Toán",
  maLopHP: "L1",
  maMH: "M1",
  tietBD: "Tiet7",
  tietKT: "Tiet9",
  phongHoc: "B2",
  tenGiangVien: "Trần B",
};
assert.equal(schedule.getCourseName(legacy), "Toán");
assert.equal(schedule.getSectionCode(legacy), "L1");
assert.equal(schedule.formatPeriods(legacy), "Tiết: 7 - 9");
assert.equal(schedule.getSectionCode({}), "");
assert.equal(schedule.getRoom({}), "—");

// Empty periods used to crash with `undefined.includes`.
assert.equal(schedule.formatPeriods({}), "Chưa xếp tiết");
assert.equal(schedule.formatPeriods({ periodStart: null, periodEnd: null }), "Chưa xếp tiết");
assert.equal(schedule.formatPeriods({ tietBD: "", tietKT: "" }), "Chưa xếp tiết");

// Time strings still bucket like before.
assert.equal(schedule.getPeriodStart({ periodStart: "07:30" }), 1);
assert.equal(schedule.getPeriodStart({ periodStart: "13:00" }), 7);
assert.equal(schedule.getPeriodStart({ periodStart: "18:00" }), 13);

const grouped = schedule.groupByTimePeriod([
  { periodStart: 2 },
  { periodStart: 8 },
  { periodStart: 13 },
  {},
]);
assert.equal(grouped.morning.length, 1);
assert.equal(grouped.afternoon.length, 1);
assert.equal(grouped.evening.length, 1);
assert.equal(grouped.unscheduled.length, 1);

const items = [{ sessionType: "Lecture" }, { sessionType: "Exam" }, {}];
assert.equal(schedule.filterByViewMode(items, "all").length, 3);
assert.equal(schedule.filterByViewMode(items, "exams").length, 1);
assert.equal(schedule.filterByViewMode(items, "classes").length, 2);
assert.equal(schedule.isExamSession({ sessionType: "Final Exam" }), true);
assert.equal(schedule.isExamSession({ sessionType: "Thi cuối kỳ" }), true);

assert.deepEqual(schedule.normalizeWeekSchedule(undefined), schedule.createEmptyWeek());
assert.deepEqual(schedule.normalizeWeekSchedule({ monday: [1], bogus: 2 }).monday, [1]);
assert.equal(schedule.normalizeWeekSchedule({ monday: [1] }).tuesday.length, 0);

// Local date helpers must not shift the day (old `toISOString` bug).
const d = new Date(2026, 9, 22); // Thursday 22 Oct 2026, local time
assert.equal(schedule.toDateInputValue(d), "2026-10-22");
assert.equal(schedule.toDateInputValue(schedule.getStartOfWeek(d)), "2026-10-19");
assert.equal(schedule.getDayName(d), "Thứ 5");

const roundTrip = schedule.parseDateInput("2026-10-19");
assert.equal(roundTrip.getFullYear(), 2026);
assert.equal(roundTrip.getMonth(), 9);
assert.equal(roundTrip.getDate(), 19);
assert.equal(roundTrip.getDay(), 1); // Monday, local time
assert.equal(schedule.generateWeekDates(schedule.getStartOfWeek(d)).length, 7);
assert.equal(
  schedule.toDateInputValue(schedule.generateWeekDates(schedule.getStartOfWeek(d))[6]),
  "2026-10-25",
);

// ─── class request ──────────────────────────────────────────────────────────
const courseRows = [
  { id: "CRS_B", name: "Cơ sở dữ liệu", credits: 3 },
  { id: "CRS_A", name: "Lập trình web", credits: 4 },
  { id: null, name: "Thiếu id" },
];
const coursesOnly = classRequest.normalizeAvailableCourses(courseRows);
assert.deepEqual(
  coursesOnly.map((course) => course.courseName),
  ["Cơ sở dữ liệu", "Lập trình web"],
);
assert.deepEqual(coursesOnly[0], {
  courseId: "CRS_B",
  courseName: "Cơ sở dữ liệu",
  credits: 3,
  sectionCount: 0,
  capacity: 0,
  enrolledCount: 0,
});

// The legacy section-shaped payload is still tolerated.
const sections = [
  {
    id: "SEC_1",
    capacity: 40,
    enrolled_count: 10,
    courses: { id: "CRS_B", name: "Cơ sở dữ liệu", credits: 3 },
  },
  {
    id: "SEC_2",
    capacity: 30,
    enrolled_count: 5,
    courses: { id: "CRS_A", name: "Lập trình web", credits: 4 },
  },
  {
    id: "SEC_3",
    capacity: 20,
    enrolled_count: 1,
    courses: { id: "CRS_B", name: "Cơ sở dữ liệu", credits: 3 },
  },
  { id: "SEC_4", courses: null },
];
const merged = classRequest.normalizeAvailableCourses(sections);
const databaseCourse = merged.find((course) => course.courseId === "CRS_B");
assert.equal(databaseCourse.sectionCount, 2);
assert.equal(databaseCourse.capacity, 60);
assert.equal(databaseCourse.enrolledCount, 11);

assert.deepEqual(classRequest.normalizeAvailableCourses(undefined), []);
assert.deepEqual(classRequest.normalizeAvailableCourses({ data: sections }), []);

assert.deepEqual(
  classRequest.buildSubmitPayload({
    courseId: "CRS_A",
    participantCount: "15",
    description: "  cần mở lớp  ",
  }),
  { course_id: "CRS_A", participant_count: 15, description: "cần mở lớp" },
);
assert.deepEqual(
  classRequest.buildSubmitPayload({ courseId: "CRS_A", participantCount: 1, description: "   " }),
  { course_id: "CRS_A", participant_count: 1, description: null },
);
assert.deepEqual(
  classRequest.buildSubmitPayload({ courseId: "CRS_A", participantCount: 1 }),
  { course_id: "CRS_A", participant_count: 1, description: null },
);

assert.equal(
  classRequest.extractApiError({
    response: {
      data: {
        success: false,
        message: "Invalid request payload",
        context: {
          errors: [
            { field: "course_id", actual: null },
            { field: "participant_count", actual: 0 },
          ],
        },
      },
    },
  }),
  "Invalid request payload: course_id (null), participant_count (0)",
);
assert.equal(
  classRequest.extractApiError({ response: { data: { message: "Student status is not Enrolled" } } }),
  "Student status is not Enrolled",
);
assert.equal(classRequest.extractApiError(new Error("network")), "Lỗi khi tạo yêu cầu mở lớp");

// ─── api payload ────────────────────────────────────────────────────────────
assert.deepEqual(apiPayload.unwrapPayload({ success: true, action: "x", data: [1, 2] }), [1, 2]);
assert.deepEqual(apiPayload.unwrapPayload([1, 2]), [1, 2]);
assert.equal(apiPayload.unwrapPayload(null), null);

assert.deepEqual(apiPayload.unwrapList({ success: true, data: [1, 2] }), [1, 2]);
assert.deepEqual(apiPayload.unwrapList([1, 2]), [1, 2]);
assert.deepEqual(apiPayload.unwrapList({ data: [1, 2] }), [1, 2]);
assert.deepEqual(apiPayload.unwrapList({ success: true, data: null }), []);
assert.deepEqual(apiPayload.unwrapList(null), []);

// ─── roles ──────────────────────────────────────────────────────────────────
assert.equal(roleUtils.normalizeRole("SinhVien"), "Student");
assert.equal(roleUtils.normalizeRole("Student"), "Student");
assert.equal(roleUtils.normalizeRole("GiangVien"), "Teacher");
assert.equal(roleUtils.normalizeRole(undefined), null);
assert.equal(roleUtils.roleDisplayName("SinhVien"), "Sinh viên");

console.log(`frontend utils OK (TZ=${process.env.TZ || "system"})`);
