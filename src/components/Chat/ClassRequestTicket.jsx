"use client";

import { useState } from "react";

const ClassRequestTicket = ({
  request,
  onJoin,
  onViewParticipants,
  onViewDetails,
  currentUser,
  isPinned,
  onTogglePin,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return (
      date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }) +
      " " +
      date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    );
  };

  // Check if current user is already a participant
  const isParticipant = request.participants?.some(
    (p) => p.studentId === currentUser || p.fullName === currentUser
  );

  return (
    <div className={`class-request-ticket ${isPinned ? "pinned" : ""}`}>
      <div className="ticket-header" onClick={toggleExpand}>
        <div className="ticket-title">
          <span className="course-name">{request.courseName}</span>
          <span className="semester-batch">
            {request.semester && `HK${request.semester}`} {request.batch}
          </span>
        </div>
        <div className="ticket-meta">
          <span
            className="participant-count"
            title="Số lượng sinh viên dự kiến khi tạo yêu cầu"
          >
            👥 {request.participantCount ?? 0} dự kiến
          </span>
          {request.enrolledCount != null && (
            <span
              className="participant-count"
              title="Số sinh viên đã đăng ký thực tế"
            >
              ✅ {request.enrolledCount} đã ĐK
            </span>
          )}
          <span className="created-at">{formatDate(request.createdAt)}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="ticket-details">
          <div className="creator-info">
            <span className="label">Người tạo:</span>
            <span className="value">
              {request.creatorName}{" "}
              {request.creatorStudentId && `(${request.creatorStudentId})`}{" "}
              {request.creatorClass && `- ${request.creatorClass}`}
            </span>
          </div>

          {request.description && (
            <div className="request-description">
              <span className="label">Mô tả:</span>
              <p>{request.description}</p>
            </div>
          )}

          <div className="ticket-actions">
            {!isParticipant && (
              <button
                onClick={() => onJoin(request.id)}
                className="join-button"
              >
                Tham gia
              </button>
            )}
            <button
              onClick={() => onViewParticipants(request.id)}
              className="view-participants-button"
            >
              👥 Xem danh sách
            </button>
            <button
              onClick={() => onViewDetails(request.id)}
              className="view-details-button"
            >
              👁️ Chi tiết
            </button>
            {onTogglePin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(request.id);
                }}
                className={`pin-ticket-button ${isPinned ? "pinned" : ""}`}
                title={isPinned ? "Bỏ ghim" : "Ghim yêu cầu"}
              >
                📌
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassRequestTicket;
