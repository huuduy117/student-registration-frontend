import { useState } from "react";
import {
  FaChevronDown,
  FaChevronUp,
  FaCopy,
  FaArrowRight,
} from "react-icons/fa";
import "./DemoAccountCard.css";

const DEMO_ACCOUNTS = [
  {
    role: "Admin",
    email: "admin@example.com",
    password: "admin123",
  },
  {
    role: "Student",
    email: "student@example.com",
    password: "student123",
  },
  {
    role: "Teacher",
    email: "teacher@example.com",
    password: "teacher123",
  },
];

const DemoAccountCard = ({ onAutoFill }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Check if demo accounts should be shown (environment variable)
  const showDemo = import.meta.env.VITE_SHOW_DEMO === "true";

  if (!showDemo) return null;

  const handleCopyAccount = (email, password, index) => {
    const text = `${email}\n${password}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleAutoFill = (email, password) => {
    onAutoFill(email, password);
  };

  return (
    <div className={`demo-card ${isExpanded ? "expanded" : "minimized"}`}>
      <button
        className="demo-card-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label="Toggle demo accounts"
        title="For HR testing only"
      >
        <span className="demo-card-title">Demo Accounts</span>
        {isExpanded ? <FaChevronDown /> : <FaChevronUp />}
      </button>

      {isExpanded && (
        <div className="demo-card-content">
          {DEMO_ACCOUNTS.map((account, index) => (
            <div key={index} className="demo-account-item">
              <div className="demo-account-header">
                <span className="demo-account-role">{account.role}</span>
              </div>
              <div className="demo-account-credentials">
                <div className="demo-credential-row">
                  <span className="demo-label">Email:</span>
                  <span className="demo-value">{account.email}</span>
                </div>
                <div className="demo-credential-row">
                  <span className="demo-label">Password:</span>
                  <span className="demo-value">••••••••</span>
                </div>
              </div>
              <div className="demo-account-actions">
                <button
                  className={`demo-btn demo-btn-copy ${
                    copiedIndex === index ? "copied" : ""
                  }`}
                  onClick={() =>
                    handleCopyAccount(account.email, account.password, index)
                  }
                  aria-label={`Copy ${account.role} credentials`}
                  title={copiedIndex === index ? "Copied!" : "Copy credentials"}
                >
                  <FaCopy />
                  {copiedIndex === index ? "Copied" : "Copy"}
                </button>
                <button
                  className="demo-btn demo-btn-autofill"
                  onClick={() =>
                    handleAutoFill(account.email, account.password)
                  }
                  aria-label={`Auto-fill ${account.role} credentials`}
                  title="Auto-fill login form"
                >
                  <FaArrowRight />
                  Auto Fill
                </button>
              </div>
            </div>
          ))}
          <div className="demo-card-footer">
            <p className="demo-card-note">⚠️ For HR testing only</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoAccountCard;
