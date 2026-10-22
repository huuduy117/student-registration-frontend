/**
 * Helpers for the "create class request" flow (Workflow 1, step 0).
 *
 * Backend contract (verified in controllers/classRequestController.js):
 *   GET  /api/class-requests/available-courses
 *        -> { success, action, data: [{ id, name, credits }] }
 *        (only courses without an Active section)
 *   POST /api/class-requests/submit
 *        body { course_id, participant_count, description }
 *        -> { success, action, data: <class_request>, affected_tables }
 * `student_id` is taken from the JWT, never from the body.
 */

/**
 * `available-courses` returns one row per course:
 *   { id, name, credits }
 * (Older versions returned sections, so section-shaped rows are still
 * tolerated: `{ id, capacity, enrolled_count, courses: {...} }`.)
 */
export const normalizeAvailableCourses = (payload) => {
  const rows = Array.isArray(payload) ? payload : [];
  const byCourse = new Map();

  rows.forEach((row) => {
    const isSection = Boolean(row?.courses);
    const course = isSection
      ? row.courses
      : row?.id && row?.name
        ? row
        : null;
    if (!course?.id) return;

    const capacity = Number(row.capacity) || 0;
    const enrolledCount = Number(row.enrolled_count) || 0;

    const existing = byCourse.get(course.id);
    if (existing) {
      existing.sectionCount += isSection ? 1 : 0;
      existing.capacity += capacity;
      existing.enrolledCount += enrolledCount;
      return;
    }

    byCourse.set(course.id, {
      courseId: course.id,
      courseName: course.name || "—",
      credits: course.credits ?? null,
      sectionCount: isSection ? 1 : 0,
      capacity,
      enrolledCount,
    });
  });

  return [...byCourse.values()].sort((a, b) =>
    a.courseName.localeCompare(b.courseName, "vi"),
  );
};

/** Build the exact body expected by POST /api/class-requests/submit. */
export const buildSubmitPayload = ({ courseId, participantCount, description }) => ({
  course_id: courseId,
  participant_count: Number(participantCount),
  description: typeof description === "string" ? description.trim() || null : null,
});

/** Pull a readable message out of the backend's structured error envelope. */
export const extractApiError = (error, fallback = "Lỗi khi tạo yêu cầu mở lớp") => {
  const payload = error?.response?.data;
  if (!payload) return fallback;

  const details = payload.context?.errors;
  if (Array.isArray(details) && details.length > 0) {
    const fields = details
      .map((item) => `${item.field} (${item.actual ?? "null"})`)
      .join(", ");
    return `${payload.message || "Dữ liệu không hợp lệ"}: ${fields}`;
  }

  return payload.message || fallback;
};
