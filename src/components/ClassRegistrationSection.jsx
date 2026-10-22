import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../services/axios";
import { unwrapList } from "../utils/apiPayload";
import ClassRequestTicket from "./Chat/ClassRequestTicket";
import JoinClassForm from "./Chat/JoinClassForm";
import ParticipantsList from "./Chat/ParticipantsList";
import RequestDetails from "./Chat/RequestDetails";

const ClassRegistrationSection = ({ userId, userRole }) => {
  const [classRequests, setClassRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showParticipantsList, setShowParticipantsList] = useState(false);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [pinnedRequests, setPinnedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Load pinned requests from localStorage
    const savedPinnedRequests = localStorage.getItem("pinnedRequests");
    if (savedPinnedRequests) {
      setPinnedRequests(JSON.parse(savedPinnedRequests));
    }

    // Fetch class requests
    fetchClassRequests();
  }, []);

  const fetchClassRequests = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/api/class-requests");
      setClassRequests(unwrapList(response.data));
    } catch (error) {
      console.error("Error fetching class requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const joinSection = async (sectionId) => {
    if (!userId) {
      setErrorMessage("Không tìm thấy thông tin sinh viên");
      console.error("Missing userId when attempting to join class");
      return;
    }

    if (!sectionId) {
      alert("Lớp học phần chưa được khởi tạo");
      return;
    }

    try {
      await axiosInstance.post("/api/students/enroll", { sectionId });

      // Refresh the class requests
      fetchClassRequests();
      setShowJoinForm(false);
      setErrorMessage("");

      alert("Tham gia lớp học thành công!");
    } catch (error) {
      const code = error.response?.data?.error_code;
      const enrollmentMessages = {
        DUPLICATE_ENROLLMENT: "Bạn đã đăng ký hoặc đã học học phần này rồi.",
        SECTION_FULL: "Lớp học phần đã đầy.",
        SCHEDULE_CONFLICT: "Lịch học bị trùng với môn đã đăng ký.",
        PREREQUISITE_NOT_MET: "Bạn chưa hoàn thành môn học tiên quyết.",
        SECTION_NOT_ACTIVE: "Lớp học phần chưa mở đăng ký.",
        STUDENT_NOT_ENROLLED: "Tài khoản sinh viên chưa ở trạng thái đang học.",
      };
      const msg =
        enrollmentMessages[code] ||
        error.response?.data?.message ||
        "Lỗi khi tham gia lớp học";
      setErrorMessage(msg);
      console.error("Error joining class request:", error);
      alert(msg);
    }
  };

  const handleJoinRequest = async (requestId) => {
    const request = classRequests.find((req) => req.id === requestId);
    const section = request?.course_sections;
    if (section?.status && section.status !== "Active") {
      alert("Lớp học phần chưa mở đăng ký.");
      return;
    }
    await joinSection(section?.id);
  };

  const handleViewParticipants = async (requestId) => {
    try {
      const request = classRequests.find((req) => req.id === requestId);
      const sectionId = request?.course_sections?.id;
      if (!sectionId) return alert("Lớp học phần chưa được khởi tạo");

      const response = await axiosInstance.get(
        `/api/class-requests/${sectionId}/participants`,
      );

      if (request) {
        setSelectedRequest({
          id: request.id,
          courseName: request.courses?.name || request.course_id,
          participantCount: request.participant_count,
          participants: unwrapList(response.data).map((p) => ({
            studentId: p.studentId,
            fullName: p.fullName,
            class: p.className,
            joinDate: p.registeredAt,
          })),
        });
        setShowParticipantsList(true);
      }
    } catch (error) {
      console.error("Error fetching participants:", error);
      alert("Lỗi khi lấy danh sách sinh viên tham gia");
    }
  };

  const handleViewDetails = async (requestId) => {
    try {
      const request = classRequests.find((req) => req.id === requestId);
      const sectionId = request?.course_sections?.id;
      if (!sectionId) return alert("Lớp học phần chưa được khởi tạo");

      const participantsResponse = await axiosInstance.get(
        `/api/class-requests/${sectionId}/participants`,
      );

      if (request) {
        setSelectedRequest({
          id: request.id,
          sectionId: sectionId,
          courseName: request.courses?.name || request.course_id,
          creatorName: request.students?.full_name || request.student_id,
          creatorStudentId: request.student_id,
          creatorClass: request.students?.classes?.name,
          semester: request.course_sections?.semester || "",
          batch: request.course_sections?.academic_year || "",
          participantCount: request.participant_count,
          description: request.description,
          createdAt: request.submitted_at,
          participants: unwrapList(participantsResponse.data).map((p) => ({
            studentId: p.studentId,
            fullName: p.fullName,
            class: p.className,
            joinDate: p.registeredAt,
          })),
        });
        setShowRequestDetails(true);
      }
    } catch (error) {
      console.error("Error fetching request details:", error);
      alert("Lỗi khi lấy thông tin chi tiết yêu cầu");
    }
  };

  const handleJoinClassRequest = async (joinData) => {
    const sectionId = selectedRequest?.sectionId || joinData.id || joinData.maLopHP;
    await joinSection(sectionId);
  };

  const handleTogglePin = (requestId) => {
    const isPinned = pinnedRequests.includes(requestId);
    let newPinnedRequests;

    if (isPinned) {
      newPinnedRequests = pinnedRequests.filter((id) => id !== requestId);
    } else {
      newPinnedRequests = [...pinnedRequests, requestId];
    }

    setPinnedRequests(newPinnedRequests);
    localStorage.setItem("pinnedRequests", JSON.stringify(newPinnedRequests));
  };

  const handleCreateRequest = () => {
    navigate("/create-class-request");
  };

  return (
    <div className="dashboard-section">
      {errorMessage && (
        <div
          className="error-message"
          style={{ color: "red", marginBottom: 8 }}
        >
          {errorMessage}
        </div>
      )}
      <div className="section-header-with-link">
        <h2>Yêu cầu mở lớp học phần</h2>
        {userRole === "SinhVien" && (
          <button className="view-all-link" onClick={handleCreateRequest}>
            ➕ Tạo yêu cầu mới
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-message">Đang tải dữ liệu...</div>
      ) : (
        <>
          {pinnedRequests.length > 0 && (
            <div className="pinned-requests-list">
              <h3>Yêu cầu đã ghim</h3>
              {classRequests
                .filter((req) => pinnedRequests.includes(req.id))
                .map((request) => (
                  <ClassRequestTicket
                    key={`pinned-${request.id}`}
                    request={{
                      id: request.id,
                      courseName: request.courses?.name || request.course_id,
                      creatorName:
                        request.students?.full_name || request.student_id,
                      creatorStudentId: request.student_id,
                      semester: request.course_sections?.semester || "",
                      batch: request.course_sections?.academic_year || "",
                      participantCount: request.participant_count,
                      enrolledCount: request.course_sections?.enrolled_count,
                      createdAt: request.submitted_at,
                    }}
                    onJoin={handleJoinRequest}
                    onViewParticipants={handleViewParticipants}
                    onViewDetails={handleViewDetails}
                    currentUser={userId}
                    isPinned={true}
                    onTogglePin={handleTogglePin}
                  />
                ))}
            </div>
          )}

          <div className="class-requests-list">
            {classRequests.length > 0 ? (
              classRequests.map((request) => (
                <ClassRequestTicket
                  key={request.id}
                  request={{
                    id: request.id,
                    courseName: request.courses?.name || request.course_id,
                    creatorName:
                      request.students?.full_name || request.student_id,
                    creatorStudentId: request.student_id,
                    semester: request.course_sections?.semester || "",
                    batch: request.course_sections?.academic_year || "",
                    participantCount: request.participant_count,
                    enrolledCount: request.course_sections?.enrolled_count,
                    createdAt: request.submitted_at,
                  }}
                  onJoin={handleJoinRequest}
                  onViewParticipants={handleViewParticipants}
                  onViewDetails={handleViewDetails}
                  currentUser={userId}
                  isPinned={pinnedRequests.includes(request.id)}
                  onTogglePin={handleTogglePin}
                />
              ))
            ) : (
              <div className="empty-message">Không có yêu cầu mở lớp nào</div>
            )}
          </div>
        </>
      )}

      {showParticipantsList && (
        <div className="modal-overlay">
          <ParticipantsList
            request={selectedRequest}
            onClose={() => setShowParticipantsList(false)}
          />
        </div>
      )}

      {showRequestDetails && (
        <div className="modal-overlay">
          <RequestDetails
            request={selectedRequest}
            onClose={() => setShowRequestDetails(false)}
            onJoin={handleJoinRequest}
            currentUser={userId}
          />
        </div>
      )}

      {showJoinForm && (
        <div className="modal-overlay">
          <JoinClassForm
            request={selectedRequest}
            onSubmit={handleJoinClassRequest}
            onCancel={() => setShowJoinForm(false)}
          />
        </div>
      )}
    </div>
  );
};

export default ClassRegistrationSection;
