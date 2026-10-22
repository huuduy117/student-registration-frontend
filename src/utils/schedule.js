/**
 * Helpers shared by the student (Schedule.jsx) and teacher
 * (Teacher_Schedule.jsx) weekly schedule views.
 *
 * The backend schedule contract uses camelCase keys:
 *   { scheduleId, classDate, periodStart, periodEnd, room, sessionType,
 *     courseId, courseName, sectionId, teacherId, teacherName, enrolledCount }
 * The deprecated Vietnamese aliases are still accepted as a fallback.
 */

export const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_NAMES = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

export const createEmptyWeek = () => ({
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
});

const pad = (value) => String(value).padStart(2, "0");

/** Local `YYYY-MM-DD`, safe to send to the API (`toISOString` shifts by TZ). */
export const toDateInputValue = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Parse a `<input type="date">` value as a *local* date. */
export const parseDateInput = (value) => {
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
};

/** Monday of the week containing `date` (local time). */
export const getStartOfWeek = (date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const generateWeekDates = (startDate) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + index);
    return date;
  });

export const formatDate = (date) =>
  date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const getDayName = (date) => DAY_NAMES[date.getDay()];

// ─── Item field accessors ────────────────────────────────────────────────────

export const getCourseName = (item) => item.courseName || item.tenMH || "—";

/** Section/course identifiers are UUIDs today; show a short readable form. */
const shortenId = (value) => {
  const text = value == null ? "" : String(value);
  if (!text) return "";
  return text.length > 12 ? `${text.slice(0, 8)}…` : text;
};

export const getSectionCode = (item) => shortenId(item.sectionId ?? item.maLopHP);
export const getCourseCode = (item) => shortenId(item.courseId ?? item.maMH);
export const getRoom = (item) => item.room ?? item.phongHoc ?? "—";
export const getTeacherName = (item) => item.teacherName ?? item.tenGiangVien ?? "—";
export const getEnrolledCount = (item) => item.enrolledCount ?? item.siSoHienTai ?? 0;

/**
 * Period numbers may arrive as numbers, `"3"`, `"Tiet3"` or a `"07:30"` time.
 * Returns null when the item has no usable period.
 */
const parsePeriod = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const text = String(value).trim();
  if (text.includes(":")) {
    const hour = Number.parseInt(text.split(":")[0], 10);
    if (Number.isNaN(hour)) return null;
    if (hour < 12) return 1;
    if (hour < 17) return 7;
    return 13;
  }

  const match = /\d+/.exec(text);
  return match ? Number.parseInt(match[0], 10) : null;
};

export const getPeriodStart = (item) => parsePeriod(item.periodStart ?? item.tietBD);
export const getPeriodEnd = (item) => parsePeriod(item.periodEnd ?? item.tietKT);

export const formatPeriods = (item) => {
  const start = getPeriodStart(item);
  const end = getPeriodEnd(item);
  if (start === null && end === null) return "Chưa xếp tiết";
  return `Tiết: ${start ?? "?"} - ${end ?? "?"}`;
};

// ─── Filtering & grouping ────────────────────────────────────────────────────

const EXAM_RE = /(exam|thi)/i;

export const isExamSession = (item) => EXAM_RE.test(String(item.sessionType ?? ""));

/** viewMode: "all" | "classes" | "exams" */
export const filterByViewMode = (items, viewMode) => {
  if (viewMode === "exams") return items.filter(isExamSession);
  if (viewMode === "classes") return items.filter((item) => !isExamSession(item));
  return items;
};

/**
 * Bucket a day's items into morning (1-6), afternoon (7-12), evening (13+).
 * Items without any period information go to `unscheduled` instead of being
 * silently shown under a wrong time of day.
 */
export const groupByTimePeriod = (items) =>
  items.reduce(
    (acc, item) => {
      const period = getPeriodStart(item);
      if (period === null) {
        acc.unscheduled.push(item);
      } else if (period >= 1 && period <= 6) {
        acc.morning.push(item);
      } else if (period >= 7 && period <= 12) {
        acc.afternoon.push(item);
      } else {
        acc.evening.push(item);
      }
      return acc;
    },
    { morning: [], afternoon: [], evening: [], unscheduled: [] },
  );

/** Normalise the weekly payload into the seven day buckets. */
export const normalizeWeekSchedule = (schedule) => {
  const empty = createEmptyWeek();
  if (!schedule || typeof schedule !== "object") return empty;
  return DAY_KEYS.reduce((acc, key) => {
    acc[key] = Array.isArray(schedule[key]) ? schedule[key] : [];
    return acc;
  }, {});
};
