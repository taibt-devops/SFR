// Bắt lỗi render của cây component → tránh trắng màn hình (mất phiên học).
// Error boundary BẮT BUỘC là class component (React chưa có hook tương đương).
import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Log để debug; không có telemetry ngoài (app all-local).
    console.error("UI error:", error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="app">
          <div className="done-check" style={{ color: "var(--red)" }}>!</div>
          <div className="done-title">Đã xảy ra lỗi</div>
          <div className="done-sub">
            Giao diện gặp sự cố. Tiến độ học của bạn vẫn được lưu (localStorage).
          </div>
          <p className="empty-msg" style={{ color: "var(--text2)", marginTop: 8 }}>
            {String(this.state.error?.message || this.state.error)}
          </p>
          <div className="spacer" />
          <button className="cta" onClick={this.handleReset}>
            <span className="cta-main">Thử lại</span>
          </button>
          <button className="link-exit" style={{ marginTop: 12 }} onClick={() => location.reload()}>
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
