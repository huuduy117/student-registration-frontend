"use client"

import { useState, useEffect } from "react"
import SideBar from "../components/sideBar"
import axios from "axios"
import "../assets/Schedule.css"
import { useSessionMonitor } from "../hook/useSession"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import "jspdf-autotable"
import { saveAs } from "file-saver"

const Schedule = () => {
  const [schedule, setSchedule] = useState({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [userId, setUserId] = useState(null)
  const [viewMode, setViewMode] = useState("all") // 'all', 'classes', 'exams'

  // Use the session monitor
  useSessionMonitor()

  // Helper function to format dates
  const formatDate = (date) => {
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Helper function to get day name
  const getDayName = (date) => {
    const days = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]
    return days[date.getDay()]
  }

  // Get start of week (Monday)
  const getStartOfWeek = (date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  // Generate week dates
  const generateWeekDates = (startDate) => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      return date
    })
  }

  useEffect(() => {
    // Get user info from session storage
    const tabId = sessionStorage.getItem("tabId")
    const authData = JSON.parse(sessionStorage.getItem(`auth_${tabId}`) || "{}")
    if (authData.userId) {
      setUserId(authData.userId)
    }
  }, [])

  useEffect(() => {
    if (!userId) return

    const fetchSchedule = async () => {
      setLoading(true)
      setError(null)

      try {
        const weekStart = getStartOfWeek(currentWeek).toISOString().split("T")[0]
        const response = await axios.get(`/api/schedule/${userId}/week`, {
          params: { weekStart },
          headers: {
            Authorization: `Bearer ${JSON.parse(sessionStorage.getItem(`auth_${sessionStorage.getItem("tabId")}`)).token}`,
          },
        })
        setSchedule(response.data.schedule)
      } catch (err) {
        console.error("Error fetching schedule:", err)
        setError("Không thể lấy thời khóa biểu")
      } finally {
        setLoading(false)
      }
    }

    fetchSchedule()
  }, [userId, currentWeek])

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeek(newDate)
  }

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeek(newDate)
  }

  const handleCurrentWeek = () => {
    setCurrentWeek(new Date())
  }

  // Convert period numbers to time slots
  const getTietDisplay = (tietBD, tietKT) => {
    // Extract numbers from tiet strings if they contain "Tiet"
    const startNum = tietBD.includes("Tiet") ? tietBD.replace("Tiet", "") : tietBD
    const endNum = tietKT.includes("Tiet") ? tietKT.replace("Tiet", "") : tietKT
    return `Tiết: ${startNum} - ${endNum}`
  }

  // Group schedule items by time period
  const groupByTimePeriod = (items) => {
    return items.reduce(
      (acc, item) => {
        const timeStr = item.tietBD
        let tietNum

        if (timeStr.includes(":")) {
          // If it's time format, convert to period number
          const hour = Number.parseInt(timeStr.split(":")[0])
          if (hour < 12) tietNum = 1
          else if (hour < 17) tietNum = 7
          else tietNum = 13
        } else {
          // If it's already period format
          tietNum = Number.parseInt(timeStr.replace("Tiet", "")) || Number.parseInt(timeStr)
        }

        if (tietNum >= 1 && tietNum <= 6) {
          acc.morning.push(item)
        } else if (tietNum >= 7 && tietNum <= 12) {
          acc.afternoon.push(item)
        } else {
          acc.evening.push(item)
        }
        return acc
      },
      { morning: [], afternoon: [], evening: [] },
    )
  }

  // Generate the week dates
  const weekStart = getStartOfWeek(currentWeek)
  const weekDates = generateWeekDates(weekStart)

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  const groupedSchedule = days.map((day) => groupByTimePeriod(schedule[day] || []))

  // Export schedule to Excel
  const exportToExcel = () => {
    const weekStart = getStartOfWeek(currentWeek)
    const weekDates = generateWeekDates(weekStart)
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    const data = []
    days.forEach((day, i) => {
      (schedule[day] || []).forEach((item) => {
        data.push({
          Ngay: formatDate(weekDates[i]),
          Thu: getDayName(weekDates[i]),
          MonHoc: item.tenMH,
          MaLop: item.maLopHP,
          MaMH: item.maMH,
          Tiet: getTietDisplay(item.tietBD, item.tietKT),
          Phong: item.phongHoc,
          GiangVien: item.tenGiangVien,
        })
      })
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Schedule")
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), `lich_tuan_${formatDate(weekStart)}.xlsx`)
  }

  // Export schedule to PDF
  const exportToPDF = () => {
    const weekStart = getStartOfWeek(currentWeek)
    const weekDates = generateWeekDates(weekStart)
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    const data = []
    days.forEach((day, i) => {
      (schedule[day] || []).forEach((item) => {
        data.push([
          formatDate(weekDates[i]),
          getDayName(weekDates[i]),
          item.tenMH,
          item.maLopHP,
          item.maMH,
          getTietDisplay(item.tietBD, item.tietKT),
          item.phongHoc,
          item.tenGiangVien,
        ])
      })
    })
    const doc = new jsPDF()
    doc.text(`Lịch tuần bắt đầu từ ${formatDate(weekStart)}`, 10, 10)
    doc.autoTable({
      head: [["Ngày", "Thứ", "Môn học", "Mã lớp", "Mã MH", "Tiết", "Phòng", "Giảng viên"]],
      body: data,
      startY: 20,
      styles: { font: "Times" },
    })
    doc.save(`lich_tuan_${formatDate(weekStart)}.pdf`)
  }

  // Dropdown for export format
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const handleExportClick = () => setExportMenuOpen((open) => !open)
  const handleExportFormat = (format) => {
    setExportMenuOpen(false)
    if (format === "excel") exportToExcel()
    if (format === "pdf") exportToPDF()
  }

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
                  value={currentWeek.toISOString().split("T")[0]}
                  onChange={(e) => setCurrentWeek(new Date(e.target.value))}
                  className="date-input"
                />
                <button className="control-button" onClick={handleCurrentWeek}>Hiện tại</button>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <button className="control-button" onClick={handleExportClick}>🖨️ In lịch</button>
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
                  {/* Morning */}
                  <tr>
                    <td className="time-period">Sáng</td>
                    {groupedSchedule.map((dayGroup, dayIndex) => (
                      <td key={dayIndex} className="schedule-cell">
                        {dayGroup.morning.map((item, itemIndex) => (
                          <div key={itemIndex} className="class-item">
                            <div className="class-name">{item.tenMH}</div>
                            <div className="class-code">
                              {item.maLopHP} - {item.maMH}
                            </div>
                            <div className="class-time">{getTietDisplay(item.tietBD, item.tietKT)}</div>
                            <div className="class-location">Phòng: {item.phongHoc}</div>
                            <div className="class-teacher">GV: {item.tenGiangVien}</div>
                          </div>
                        ))}
                      </td>
                    ))}
                  </tr>
                  {/* Afternoon */}
                  <tr>
                    <td className="time-period">Chiều</td>
                    {groupedSchedule.map((dayGroup, dayIndex) => (
                      <td key={dayIndex} className="schedule-cell">
                        {dayGroup.afternoon.map((item, itemIndex) => (
                          <div key={itemIndex} className="class-item">
                            <div className="class-name">{item.tenMH}</div>
                            <div className="class-code">
                              {item.maLopHP} - {item.maMH}
                            </div>
                            <div className="class-time">{getTietDisplay(item.tietBD, item.tietKT)}</div>
                            <div className="class-location">Phòng: {item.phongHoc}</div>
                            <div className="class-teacher">GV: {item.tenGiangVien}</div>
                          </div>
                        ))}
                      </td>
                    ))}
                  </tr>
                  {/* Evening */}
                  <tr>
                    <td className="time-period">Tối</td>
                    {groupedSchedule.map((dayGroup, dayIndex) => (
                      <td key={dayIndex} className="schedule-cell">
                        {dayGroup.evening.map((item, itemIndex) => (
                          <div key={itemIndex} className="class-item">
                            <div className="class-name">{item.tenMH}</div>
                            <div className="class-code">
                              {item.maLopHP} - {item.maMH}
                            </div>
                            <div className="class-time">{getTietDisplay(item.tietBD, item.tietKT)}</div>
                            <div className="class-location">Phòng: {item.phongHoc}</div>
                            <div className="class-teacher">GV: {item.tenGiangVien}</div>
                          </div>
                        ))}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Schedule
