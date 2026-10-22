import { describe, expect, it } from "vitest";
import {
  createEmptyWeek,
  filterByViewMode,
  formatPeriods,
  generateWeekDates,
  getCourseCode,
  getCourseName,
  getDayName,
  getPeriodStart,
  getRoom,
  getSectionCode,
  getStartOfWeek,
  getTeacherName,
  groupByTimePeriod,
  isExamSession,
  normalizeWeekSchedule,
  parseDateInput,
  toDateInputValue,
} from "../schedule.js";

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

describe("schedule item formatting", () => {
  it("reads canonical fields", () => {
    expect(getCourseName(full)).toBe("Lập trình web");
    expect(getSectionCode(full)).toBe("12345678…");
    expect(getCourseCode(full)).toBe("CRS_1");
    expect(getRoom(full)).toBe("A101");
    expect(getTeacherName(full)).toBe("Nguyễn Văn A");
    expect(formatPeriods(full)).toBe("Tiết: 1 - 3");
  });

  it("still renders legacy aliases", () => {
    const legacy = {
      tenMH: "Toán",
      maLopHP: "L1",
      maMH: "M1",
      tietBD: "Tiet7",
      tietKT: "Tiet9",
      phongHoc: "B2",
      tenGiangVien: "Trần B",
    };

    expect(getCourseName(legacy)).toBe("Toán");
    expect(getSectionCode(legacy)).toBe("L1");
    expect(formatPeriods(legacy)).toBe("Tiết: 7 - 9");
    expect(getSectionCode({})).toBe("");
    expect(getRoom({})).toBe("—");
  });

  it("does not crash on missing periods", () => {
    expect(formatPeriods({})).toBe("Chưa xếp tiết");
    expect(formatPeriods({ periodStart: null, periodEnd: null })).toBe("Chưa xếp tiết");
    expect(formatPeriods({ tietBD: "", tietKT: "" })).toBe("Chưa xếp tiết");
  });
});

describe("period bucketing", () => {
  it("maps time strings to period indexes", () => {
    expect(getPeriodStart({ periodStart: "07:30" })).toBe(1);
    expect(getPeriodStart({ periodStart: "13:00" })).toBe(7);
    expect(getPeriodStart({ periodStart: "18:00" })).toBe(13);
  });

  it("groups items by time of day", () => {
    const grouped = groupByTimePeriod([
      { periodStart: 2 },
      { periodStart: 8 },
      { periodStart: 13 },
      {},
    ]);

    expect(grouped.morning).toHaveLength(1);
    expect(grouped.afternoon).toHaveLength(1);
    expect(grouped.evening).toHaveLength(1);
    expect(grouped.unscheduled).toHaveLength(1);
  });
});

describe("view filters", () => {
  const items = [{ sessionType: "Lecture" }, { sessionType: "Exam" }, {}];

  it("filters by view mode", () => {
    expect(filterByViewMode(items, "all")).toHaveLength(3);
    expect(filterByViewMode(items, "exams")).toHaveLength(1);
    expect(filterByViewMode(items, "classes")).toHaveLength(2);
  });

  it("detects exam sessions in both languages", () => {
    expect(isExamSession({ sessionType: "Final Exam" })).toBe(true);
    expect(isExamSession({ sessionType: "Thi cuối kỳ" })).toBe(true);
  });
});

describe("weekly payload", () => {
  it("normalises missing buckets", () => {
    expect(normalizeWeekSchedule(undefined)).toEqual(createEmptyWeek());
    expect(normalizeWeekSchedule({ monday: [1], bogus: 2 }).monday).toEqual([1]);
    expect(normalizeWeekSchedule({ monday: [1] }).tuesday).toHaveLength(0);
  });
});

describe("local date helpers", () => {
  it("does not shift the day (old toISOString bug)", () => {
    const date = new Date(2026, 9, 22); // Thursday 22 Oct 2026, local time

    expect(toDateInputValue(date)).toBe("2026-10-22");
    expect(toDateInputValue(getStartOfWeek(date))).toBe("2026-10-19");
    expect(getDayName(date)).toBe("Thứ 5");
  });

  it("round-trips date inputs in local time", () => {
    const parsed = parseDateInput("2026-10-19");

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(19);
    expect(parsed.getDay()).toBe(1); // Monday
  });

  it("generates seven days per week", () => {
    const date = new Date(2026, 9, 22);
    const week = generateWeekDates(getStartOfWeek(date));

    expect(week).toHaveLength(7);
    expect(toDateInputValue(week[6])).toBe("2026-10-25");
  });
});
