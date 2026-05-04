const UnauthorizedPage = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "var(--color-background)",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-md)",
          padding: "48px 40px",
          textAlign: "center",
          maxWidth: "440px",
          width: "100%",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "var(--color-danger-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            fontSize: "28px",
          }}
        >
          🚫
        </div>
        <h1
          style={{
            color: "var(--color-text-primary)",
            fontSize: "22px",
            fontWeight: "700",
            marginBottom: "12px",
          }}
        >
          Không có quyền truy cập
        </h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "15px",
            lineHeight: "1.6",
            marginBottom: "28px",
          }}
        >
          Bạn không có quyền truy cập trang này.
        </p>
        <a
          href="/login"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "var(--color-primary)",
            color: "white",
            textDecoration: "none",
            borderRadius: "var(--radius-md)",
            fontWeight: "600",
            fontSize: "14px",
            transition: "background-color 0.15s",
          }}
          onMouseOver={(e) => (e.target.style.background = "var(--color-primary-dark)")}
          onMouseOut={(e) => (e.target.style.background = "var(--color-primary)")}
        >
          Quay về trang đăng nhập
        </a>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
