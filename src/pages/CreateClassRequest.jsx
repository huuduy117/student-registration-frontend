"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SideBar from "../components/sideBar";
import axiosInstance from "../services/axios";
import "../assets/CreateClassRequest.css";
import { useSessionMonitor } from "../hook/useSession";
import SimpleCaptcha from "../components/SimpleCaptcha";
import { normalizeRole } from "../utils/roleUtils";
import {
  buildSubmitPayload,
  extractApiError,
  normalizeAvailableCourses,
} from "../utils/classRequest";

const CreateClassRequest = () => {
  const [formData, setFormData] = useState({
    courseId: "",
    participantCount: "1",
    description: "",
  });
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Use the session monitor
  useSessionMonitor();

  useEffect(() => {
    // Get user info from session storage
    const tabId = sessionStorage.getItem("tabId");
    const authData = JSON.parse(
      sessionStorage.getItem(`auth_${tabId}`) || "{}",
    );

    if (!authData.userId || normalizeRole(authData.userRole) !== "Student") {
      // Redirect non-students to home page
      navigate("/home");
      return;
    }

    // Fetch student information
    const fetchStudentInfo = async () => {
      try {
        const response = await axiosInstance.get(
          `/api/students/${authData.userId}`,
        );
        setStudentInfo(response.data?.data || null);
      } catch (error) {
        // Non-fatal: submitting only needs the JWT, so keep the form usable.
        console.error("Error fetching student info:", error);
      }
    };

    // Fetch courses that can be requested. The endpoint returns sections, so
    // they are collapsed into distinct courses here.
    const fetchAvailableCourses = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(
          "/api/class-requests/available-courses",
        );
        setAvailableCourses(normalizeAvailableCourses(response.data?.data));
      } catch (error) {
        console.error("Error fetching available courses:", error);
        setPageError("Không thể lấy danh sách môn học");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentInfo();
    fetchAvailableCourses();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setSubmitError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!captchaVerified) {
      setSubmitError("Vui lòng xác nhận CAPTCHA");
      return;
    }

    if (!formData.courseId) {
      setSubmitError("Vui lòng chọn môn học");
      return;
    }

    const participantCount = Number(formData.participantCount);
    if (!Number.isInteger(participantCount) || participantCount < 1) {
      setSubmitError("Số lượng sinh viên dự kiến phải là số nguyên ≥ 1");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      await axiosInstance.post(
        "/api/class-requests/submit",
        buildSubmitPayload({
          courseId: formData.courseId,
          participantCount,
          description: formData.description,
        }),
      );

      // Redirect to chat page after successful creation
      navigate("/chat-page");
    } catch (error) {
      console.error("Error creating class request:", error);
      setSubmitError(extractApiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCaptchaVerify = (verified) => {
    setCaptchaVerified(verified);
  };

  // Get selected course details
  const selectedCourse = availableCourses.find(
    (course) => course.courseId === formData.courseId,
  );

  return (
    <div className="dashboard-container">
      <SideBar />
      <main className="dashboard-main">
        <div className="create-request-container">
          <h1 className="page-title">Tạo yêu cầu mở lớp học phần</h1>

          {loading ? (
            <div className="loading-message">Đang tải dữ liệu...</div>
          ) : pageError ? (
            <div className="error-message">{pageError}</div>
          ) : (
            <form onSubmit={handleSubmit} className="create-request-form">
              {studentInfo && (
                <div className="student-info-section">
                  <h2>Thông tin sinh viên</h2>
                  <div className="info-row">
                    <div className="info-item">
                      <span className="info-label">Họ tên:</span>
                      <span className="info-value">
                        {studentInfo.fullName || "—"}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Lớp:</span>
                      <span className="info-value">
                        {studentInfo.className || "—"}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Email:</span>
                      <span className="info-value">
                        {studentInfo.email || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="courseId">Môn học cần mở lớp</label>
                <select
                  id="courseId"
                  name="courseId"
                  value={formData.courseId}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="">-- Chọn môn học --</option>
                  {availableCourses.map((course) => (
                    <option key={course.courseId} value={course.courseId}>
                      {course.courseName}
                      {course.credits != null ? ` (${course.credits} tín chỉ)` : ""}
                    </option>
                  ))}
                </select>
                {availableCourses.length === 0 && (
                  <p className="form-hint">
                    Hiện không có môn học nào đang mở để gửi yêu cầu.
                  </p>
                )}
              </div>

              {selectedCourse && (
                <div className="course-details">
                  <h2>Thông tin môn học</h2>
                  <div className="info-row">
                    <div className="info-item">
                      <span className="info-label">Môn học:</span>
                      <span className="info-value">
                        {selectedCourse.courseName}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Số tín chỉ:</span>
                      <span className="info-value">
                        {selectedCourse.credits ?? "—"}
                      </span>
                    </div>
                    {selectedCourse.sectionCount > 0 && (
                      <div className="info-item">
                        <span className="info-label">Lớp đang mở:</span>
                        <span className="info-value">
                          {selectedCourse.sectionCount}
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedCourse.sectionCount > 0 && (
                    <div className="info-row">
                      <div className="info-item">
                        <span className="info-label">Sĩ số hiện tại:</span>
                        <span className="info-value">
                          {selectedCourse.enrolledCount}/{selectedCourse.capacity}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="info-row">
                    <div className="info-item">
                      <span className="info-label">Trạng thái:</span>
                      <span className="info-value status-open">
                        {selectedCourse.sectionCount > 0
                          ? "Đang mở đăng ký"
                          : "Chưa có lớp — có thể gửi yêu cầu"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="participantCount">
                  Số lượng sinh viên dự kiến
                </label>
                <input
                  id="participantCount"
                  name="participantCount"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.participantCount}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">
                  Mô tả yêu cầu (không bắt buộc)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-input textarea"
                  placeholder="Nhập mô tả hoặc lý do yêu cầu mở lớp..."
                  rows={4}
                />
              </div>

              <div className="form-group captcha-group">
                <SimpleCaptcha onVerify={handleCaptchaVerify} />
              </div>

              {submitError && (
                <div className="error-message" role="alert">
                  {submitError}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => navigate("/chat-page")}
                  className="cancel-button"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={submitting || !captchaVerified}
                >
                  {submitting ? "Đang xử lý..." : "Tạo yêu cầu"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreateClassRequest;
