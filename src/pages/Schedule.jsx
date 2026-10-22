"use client";

import { useState, useEffect } from "react";
import SideBar from "../components/sideBar";
import axiosInstance from "../services/axios";
import "../assets/Schedule.css";
import { useSessionMonitor } from "../hook/useSession";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { saveAs } from "file-saver";
import {
  DAY_KEYS,
  createEmptyWeek,
  filterByViewMode,
  formatDate,
  formatPeriods,
  generateWeekDates,
  getCourseCode,
  getCourseName,
  getDayName,
  getRoom,
  getSectionCode,
  getStartOfWeek,
  getTeacherName,
  groupByTimePeriod,
  normalizeWeekSchedule,
  parseDateInput,
  toDateInputValue,
} from "../utils/schedule";

const ClassItem = ({ item }) => {
  const code = [getSectionCode(item), getCourseCode(item)].filter(Boolean).join(" - ");

  return (
    <div className="class-item">
      <div className="class-name">{getCourseName(item)}</div>
      {code && <div className="class-code">{code}</div>}
      <div className="class-time">{formatPeriods(item)}</div>
      <div className="class-location">Phòng: {getRoom(item)}</div>
      <div className="class-teacher">GV: {getTeacherName(item)}</div>
    </div>
  );
};

const Schedule = () => {
  const [schedule, setSchedule] = useState(createEmptyWeek);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [userId, setUserId] = useState(null);
  const [viewMode, setViewMode] = useState("all"); // 'all', 'classes', 'exams'
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Use the session monitor
  useSessionMonitor();

  useEffect(() => {
    // Get user info from session storage
    const tabId = sessionStorage.getItem("tabId");
    const authData = JSON.parse(
      sessionStorage.getItem(`auth_${tabId}`) || "{}",
    );
    if (authData.userId) {
      setUserId(authData.userId);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchSchedule = async () => {
      setLoading(true);
      setError(null);

      try {
        const weekStart = toDateInputValue(getStartOfWeek(currentWeek));
        const response = await axiosInstance.get(
          `/api/schedule/${userId}/week`,
          { params: { weekStart } },
        );
        setSchedule(normalizeWeekSchedule(response.data?.schedule));
      } catch (err) {
        console.error("Error fetching schedule:", err);
        setError("Không thể lấy thời khóa biểu");
        setSchedule(createEmptyWeek());
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [userId, currentWeek]);

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const handleCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  // Generate the week dates
  const weekStart = getStartOfWeek(currentWeek);
  const weekDates = generateWeekDates(weekStart);

  const groupedSchedule = DAY_KEYS.map((day) =>
    groupByTimePeriod(filterByViewMode(schedule[day] || [], viewMode)),
  );

  const timeRows = [
    { label: "Sáng", slot: "morning" },
    { label: "Chiều", slot: "afternoon" },
    { label: "Tối", slot: "evening" },
  ];
  if (groupedSchedule.some((dayGroup) => dayGroup.unscheduled.length > 0)) {
    timeRows.push({ label: "Chưa xếp tiết", slot: "unscheduled" });
  }

  const collectRows = () => {
    const rows = [];
    DAY_KEYS.forEach((day, index) => {
      filterByViewMode(schedule[day] || [], viewMode).forEach((item) => {
        rows.push({ item, date: weekDates[index] });
      });
    });
    return rows;
  };

  // Export schedule to Excel
  const exportToExcel = () => {
    const data = collectRows().map(({ item, date }) => ({
      Ngay: formatDate(date),
      Thu: getDayName(date),
      MonHoc: getCourseName(item),
      MaLop: getSectionCode(item),
      MaMH: getCourseCode(item),
      Tiet: formatPeriods(item),
      Phong: getRoom(item),
      GiangVien: getTeacherName(item),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Schedule");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      `lich_tuan_${formatDate(weekStart)}.xlsx`,
    );
  };

  // Export schedule to PDF
  const exportToPDF = () => {
    const data = collectRows().map(({ item, date }) => [
      formatDate(date),
      getDayName(date),
      getCourseName(item),
      getSectionCode(item),
      getCourseCode(item),
      formatPeriods(item),
      getRoom(item),
      getTeacherName(item),
    ]);
    const doc = new jsPDF();
    doc.text(`Lịch tuần bắt đầu từ ${formatDate(weekStart)}`, 10, 10);
    doc.autoTable({
      head: [
        [
          "Ngày",
          "Thứ",
          "Môn học",
          "Mã lớp",
          "Mã MH",
          "Tiết",
          "Phòng",
          "Giảng viên",
        ],
      ],
      body: data,
      startY: 20,
      styles: { font: "Times" },
    });
    doc.save(`lich_tuan_${formatDate(weekStart)}.pdf`);
  };

  const handleExportClick = () => setExportMenuOpen((open) => !open);
  const handleExportFormat = (format) => {
    setExportMenuOpen(false);
    if (format === "excel") exportToExcel();
    if (format === "pdf") exportToPDF();
  };

  return (
    <div className="dashboard-container">
      <SideBar />
      <main className="dashboard-main">
        <div className="schedule-container">
          <div className="schedule-header">
            <h1>Lịch học, lịch thi theo tuần</h1>

            <div className="schedule-controls">
              <div className="view-mode-buttons">
                <button
                  className={`mode-button ${viewMode === "all" ? "active" : ""}`}
                  onClick={() => setViewMode("all")}
                >
                  Tất cả
                </button>
                <button
                  className={`mode-button ${viewMode === "classes" ? "active" : ""}`}
                  onClick={() => setViewMode("classes")}
                >
                  Lịch học
                </button>
                <button
                  className={`mode-button ${viewMode === "exams" ? "active" : ""}`}
                  onClick={() => setViewMode("exams")}
                >
                  Lịch thi
                </button>
              </div>

              <div className="date-controls">
                <input
                  type="date"
                  value={toDateInputValue(currentWeek)}
                  onChange={(e) => setCurrentWeek(parseDateInput(e.target.value))}
                  className="date-input"
                />
                <button className="control-button" onClick={handleCurrentWeek}>
                  Hiện tại
                </button>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <button
                    className="control-button"
                    onClick={handleExportClick}
                  >
                    🖨️ In lịch
                  </button>
                  {exportMenuOpen && (
                    <div
                      style={{
                        position: "absolute",
                        zIndex: 10,
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        minWidth: 120,
                      }}
                    >
                      <button
                        style={{
                          width: "100%",
                          padding: 8,
                          border: "none",
                          background: "var(--color-surface)",
                          color: "var(--color-text-secondary)",
                          cursor: "pointer",
                        }}
                        onClick={() => handleExportFormat("excel")}
                      >
                        Xuất Excel
                      </button>
                      <button
                        style={{
                          width: "100%",
                          padding: 8,
                          border: "none",
                          background: "var(--color-surface)",
                          color: "var(--color-text-secondary)",
                          cursor: "pointer",
                        }}
                        onClick={() => handleExportFormat("pdf")}
                      >
                        Xuất PDF
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={handlePreviousWeek} className="control-button">
                  ◀ Trở về
                </button>
                <button onClick={handleNextWeek} className="control-button">
                  Tiếp ▶
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-message">Đang tải thời khóa biểu...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <div className="schedule-table-container">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th className="time-column">Ca học</th>
                    {weekDates.map((date, index) => (
                      <th key={index} className="day-column">
                        <div className="day-name">{getDayName(date)}</div>
                        <div className="day-date">{formatDate(date)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeRows.map(({ label, slot }) => (
                    <tr key={slot}>
                      <td className="time-period">{label}</td>
                      {groupedSchedule.map((dayGroup, dayIndex) => (
                        <td key={dayIndex} className="schedule-cell">
                          {dayGroup[slot].map((item, itemIndex) => (
                            <ClassItem
                              key={item.scheduleId || `${slot}-${dayIndex}-${itemIndex}`}
                              item={item}
                            />
                          ))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Schedule;
