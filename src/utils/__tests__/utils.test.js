import { describe, expect, it } from "vitest";
import {
  buildSubmitPayload,
  extractApiError,
  normalizeAvailableCourses,
} from "../classRequest.js";
import { unwrapList, unwrapPayload } from "../apiPayload.js";
import { normalizeRole, roleDisplayName } from "../roleUtils.js";

describe("normalizeAvailableCourses", () => {
  it("maps course-shaped rows from /available-courses", () => {
    const courses = normalizeAvailableCourses([
      { id: "CRS_B", name: "Cơ sở dữ liệu", credits: 3 },
      { id: "CRS_A", name: "Lập trình web", credits: 4 },
      { id: null, name: "Thiếu id" },
    ]);

    expect(courses.map((course) => course.courseName)).toEqual([
      "Cơ sở dữ liệu",
      "Lập trình web",
    ]);
    expect(courses[0]).toEqual({
      courseId: "CRS_B",
      courseName: "Cơ sở dữ liệu",
      credits: 3,
      sectionCount: 0,
      capacity: 0,
      enrolledCount: 0,
    });
  });

  it("still tolerates the legacy section-shaped payload", () => {
    const merged = normalizeAvailableCourses([
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
    ]);

    const databaseCourse = merged.find((course) => course.courseId === "CRS_B");
    expect(databaseCourse.sectionCount).toBe(2);
    expect(databaseCourse.capacity).toBe(60);
    expect(databaseCourse.enrolledCount).toBe(11);
  });

  it("returns [] for anything that is not an array", () => {
    expect(normalizeAvailableCourses(undefined)).toEqual([]);
    expect(normalizeAvailableCourses({ data: [] })).toEqual([]);
  });
});

describe("buildSubmitPayload", () => {
  it("matches POST /api/class-requests/submit", () => {
    expect(
      buildSubmitPayload({
        courseId: "CRS_A",
        participantCount: "15",
        description: "  cần mở lớp  ",
      }),
    ).toEqual({
      course_id: "CRS_A",
      participant_count: 15,
      description: "cần mở lớp",
    });
  });

  it("sends null for an empty description", () => {
    expect(
      buildSubmitPayload({ courseId: "CRS_A", participantCount: 1, description: "   " }),
    ).toEqual({ course_id: "CRS_A", participant_count: 1, description: null });

    expect(buildSubmitPayload({ courseId: "CRS_A", participantCount: 1 })).toEqual({
      course_id: "CRS_A",
      participant_count: 1,
      description: null,
    });
  });
});

describe("extractApiError", () => {
  it("flattens structured field errors", () => {
    expect(
      extractApiError({
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
    ).toBe("Invalid request payload: course_id (null), participant_count (0)");
  });

  it("falls back to the message or the default", () => {
    expect(
      extractApiError({ response: { data: { message: "Student status is not Enrolled" } } }),
    ).toBe("Student status is not Enrolled");
    expect(extractApiError(new Error("network"))).toBe(
      "Lỗi khi tạo yêu cầu mở lớp",
    );
  });
});

describe("api payload unwrapping", () => {
  it("unwraps the structured envelope", () => {
    expect(unwrapPayload({ success: true, action: "x", data: [1, 2] })).toEqual([1, 2]);
    expect(unwrapPayload([1, 2])).toEqual([1, 2]);
  });

  it("returns an array in every supported shape", () => {
    expect(unwrapList({ success: true, data: [1, 2] })).toEqual([1, 2]);
    expect(unwrapList([1, 2])).toEqual([1, 2]);
    expect(unwrapList({ data: [1, 2] })).toEqual([1, 2]);
    expect(unwrapList({ success: true, data: null })).toEqual([]);
    expect(unwrapList(null)).toEqual([]);
  });
});

describe("role normalisation", () => {
  it("maps Vietnamese role names to the backend ones", () => {
    expect(normalizeRole("SinhVien")).toBe("Student");
    expect(normalizeRole("Student")).toBe("Student");
    expect(normalizeRole("GiangVien")).toBe("Teacher");
    expect(normalizeRole(undefined)).toBeNull();
  });

  it("provides display names", () => {
    expect(roleDisplayName("SinhVien")).toBe("Sinh viên");
  });
});
