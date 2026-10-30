# Service Tool (rtmux-desktop)
> **DevOps & Server Management Suite (Tauri + Rust + React 18 + Vite + Tailwind CSS)**

> 📖 **Xem tài liệu chi tiết toàn diện dành cho lập trình viên kế thừa/phát triển tiếp tại: [OVERVIEW.md](file:///z:/home/thientran/projects/tools/rtmux-desktop/OVERVIEW.md)**

---

## ⚡ Ưu điểm kiến trúc (Tauri + Rust thay thế Electron)

| Chỉ số | Electron cũ | **Tauri + Vite + Rust (`rtmux-desktop`)** |
| :--- | :--- | :--- |
| **Giao diện** | React + Tailwind | **React + Tailwind + Lucide Icons + xterm.js** |
| **Engine** | Chromium + Node.js | **Native OS WebView2 + Rust Core PTY** |
| **Dung lượng App** | ~180MB | **~8.7 MB** (Giảm hơn 20 lần) |
| **Mức tiêu thụ RAM** | **~800MB - 1.2GB** 🐢 | **~35MB - 50MB** 🚀 (Nhẹ hơn 20 lần!) |
| **Tốc độ khởi động** | 3 - 5 giây | **< 0.4 giây** (Mở tức thì) |

---

## 🚀 Mở ứng dụng nhanh trên Windows (1-Click)

Bạn có thể chạy ngay bản portable độc lập không cần cài đặt tại:
👉 `dist-build\windows\service-tool-portable.exe`

---

## 🛠 Lệnh phát triển & Build

### 1. Chạy chế độ Web Dev (UI Preview):
```bash
cd rtmux-desktop
npm run dev
```

### 2. Chạy chế độ Desktop Dev (Full Tauri + Rust PTY):
```bash
cd rtmux-desktop
npm run tauri dev
```

### 3. Build & Đóng gói Release 1-Click (Tạo file Portable EXE):
Mở PowerShell và chạy:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

*Chi tiết toàn bộ kiến trúc, luồng IPC, giải thích code và cách viết thêm tính năng xem tại [OVERVIEW.md](file:///z:/home/thientran/projects/tools/rtmux-desktop/OVERVIEW.md).*
