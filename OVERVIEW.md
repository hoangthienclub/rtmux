# TỔNG QUAN DỰ ÁN SERVICE TOOL (RTMUX-DESKTOP)
> **Dành cho lập trình viên phát triển & bảo trì sản phẩm**  
> *Phiên bản: 0.1.0 | Tech Stack: Tauri (Rust) + React 18 + Vite + Tailwind CSS + xterm.js*

---

## 1. GIỚI THIỆU SẢN PHẨM

**Service Tool (rtmux-desktop)** là bộ công cụ Desktop toàn diện dành cho DevOps và Software Engineer, giúp tối ưu hóa luồng làm việc trên máy trạm Windows / WSL2 và hạ tầng máy chủ từ xa.

### Các năng lực cốt lõi:
1. **Terminal Đa Môi Trường (Dual Environment):** Tích hợp xterm.js với backend PTY thuần (`portable-pty`), hỗ trợ chuyển đổi mượt mà giữa **Windows Native** (PowerShell/CMD/Git Bash) và **WSL2 Linux** (Ubuntu/tmux).
2. **Gợi ý lệnh thông minh (Smart Auto-Suggestions):** Hiển thị Ghost text mờ trực tiếp trong terminal, phím tắt `Tab` / `Mũi tên phải` để tự động hoàn thành lệnh, thanh gợi ý nổi, hỗ trợ từ điển DevOps phong phú (Docker, Git, K8s, System) và lịch sử lệnh người dùng.
3. **Quản lý Hạ tầng & SSH:** Tự động quét cấu hình `~/.ssh/config` và SSH keys (độc lập giữa Windows và WSL2), kiểm tra sức khỏe server (Ping, CPU, RAM, Disk, Uptime).
4. **Quản lý Docker:** Theo dõi và điều khiển các container cục bộ hoặc trên máy chủ từ xa qua kết nối SSH (Start, Stop, Restart, xem Logs, thông số RAM/CPU/Network).
5. **Truyền tệp SFTP (Dual-Pane Explorer):** Giao diện quản lý file 2 cột (Local vs Remote Server) với cả 2 chế độ hiển thị Danh sách (List) và Lưới (Grid), hỗ trợ Upload/Download/Xóa/Sửa file.
6. **Chuyển cổng (Port Forwarding / SSH Tunnel):** Hỗ trợ Local (-L), Dynamic SOCKS5 (-D), Remote (-R) Forwarding. Mặc định ở trạng thái `STOPPED` an toàn khi mở ứng dụng, kích hoạt 1-click.
7. **Mạng VPN Tích Hợp:** Hỗ trợ OpenVPN Portable (kèm sẵn binary `openvpn.exe` và `wintun.dll`, không bắt buộc cài OpenVPN vào hệ điều hành) và WireGuard.
8. **Giám sát Microservices Cục bộ:** Quản lý tiến trình backend (Node.js, Python...), giải phóng port bị chiếm dụng (Kill Port) và xem live logs với bộ render mã màu ANSI.
9. **Command Palette & Theme System:** Bấm `Ctrl+K` để tìm kiếm và chuyển màn hình nhanh, hỗ trợ đa theme (Zinc, Emerald, Violet...) và đa ngôn ngữ (Tiếng Việt / English).

---

## 2. KIẾN TRÚC HỆ THỐNG (ARCHITECTURE)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND (Webview2 / React 18)                      │
│                                                                        │
│   App.jsx (Main Orchestrator & Global State)                           │
│   ├── TopBar & Sidebar (Điều hướng, môi trường WSL / Windows)          │
│   ├── Views:                                                           │
│   │   ├── DashboardView / KeychainView / ProxyView                     │
│   │   ├── TerminalView (xterm.js + SuggestionBar + Ghost Text)         │
│   │   ├── DockerView (Container Data Table + Remote Monitoring)        │
│   │   ├── SftpView (Local & Remote Dual Explorer)                      │
│   │   ├── PortForwardView (SSH Tunnels List/Card)                      │
│   │   └── ServiceMonitorView / ManageServicesView (Microservices)      │
│   └── Services:                                                        │
│       ├── sshDiscovery.js (Quét ~/.ssh/config & keys qua IPC)          │
│       └── sshClient.js (Giao tiếp PTY, SFTP, Docker, VPN qua IPC)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Tauri IPC (invoke & events)
┌───────────────────────────────────┴────────────────────────────────────┐
│                   BACKEND (Tauri Core / Rust)                          │
│                                                                        │
│   src-tauri/src/main.rs                                                │
│   ├── PTY Manager: portable-pty (Spawns conpty/winpty/wsl processes)   │
│   ├── SSH Parser: Quét regex ~/.ssh/config & id_* keys                │
│   ├── SSH Commands: Thực thi ssh.exe hoặc wsl.exe ssh                  │
│   ├── SFTP Engine: list_dir, upload, download qua SFTP/SCP             │
│   ├── Port Forwarding: Spawns ssh -N -L ... không hiện cửa sổ cmd      │
│   ├── VPN Manager: openvpn_portable service controller + Wintun        │
│   └── Credential Vault: Lưu mật khẩu an toàn                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CẤU TRÚC THƯ MỤC DỰ ÁN

```
rtmux-desktop/
├── bin/
│   └── openvpn_portable/          # Bộ binary OpenVPN + Wintun driver đóng gói sẵn cho Windows
│       ├── openvpn.exe
│       ├── wintun.dll
│       ├── libcrypto-3-x64.dll
│       ├── libssl-3-x64.dll
│       └── ...
├── dist/                          # Output sau khi chạy `npm run build` (HTML, JS, CSS)
├── dist-build/                    # Thư mục chứa sản phẩm release cuối cùng
│   └── windows/
│       ├── service-tool.exe               # File binary native chính
│       ├── service-tool-portable.exe      # File EXE 1-click chạy ngay (tự bung runtime)
│       ├── WebView2Loader.dll
│       └── service-tool-windows-portable.zip
├── public/                        # Static assets (favicons, fonts...)
├── scripts/
│   ├── build.ps1                  # Script Build & Đóng gói hoàn chỉnh trên Windows (PowerShell)
│   └── build.sh                   # Script Build trên Linux / WSL
├── src-tauri/                     # SOURCE CODE RUST BACKEND
│   ├── Cargo.toml                 # Khai báo crate dependencies (tauri, portable-pty, tokio...)
│   ├── tauri.conf.json            # Cấu hình cửa sổ, icon, permissions của Tauri
│   └── src/
│       └── main.rs                # TOÀN BỘ LOGIC BACKEND RUST (~2300 lines)
├── src/                           # SOURCE CODE FRONTEND REACT
│   ├── App.jsx                    # Root component, router điều hướng, state chính
│   ├── main.jsx                   # Entry point React
│   ├── index.css                  # Tailwind styles & theme variables
│   ├── components/
│   │   ├── TopBar.jsx             # Thanh tiêu đề: Environment badge (WSL/Win), Terminal tabs, Theme/Lang
│   │   ├── Sidebar.jsx            # Menu điều hướng nhóm tính năng (Dashboard, Máy chủ, SFTP, Docker...)
│   │   ├── TerminalView.jsx       # Terminal xterm.js, quản lý PTY session, ghost text gợi ý
│   │   ├── SettingsModal.jsx      # Modal cài đặt chung
│   │   ├── common/
│   │   │   ├── DataTable.jsx      # Bảng dữ liệu dùng chung (hỗ trợ loading, sort, actions)
│   │   │   ├── ConfirmModal.jsx   # Modal xác nhận xóa / nguy hiểm
│   │   │   └── CommandPaletteModal.jsx # Thanh tìm kiếm nhanh (Ctrl+K)
│   │   ├── settings/
│   │   │   └── SettingsView.jsx   # Màn hình cài đặt (Môi trường WSL2, Terminal, Appearance...)
│   │   ├── ssh/
│   │   │   ├── DashboardView.jsx  # Tổng quan hệ thống & server cards
│   │   │   ├── DockerView.jsx     # Quản lý Docker containers
│   │   │   ├── SftpView.jsx       # Giao diện truyền file SFTP
│   │   │   ├── PortForwardView.jsx# Quản lý chuyển cổng SSH Tunnel
│   │   │   ├── IdentityView.jsx   # Quản lý tài khoản SSH
│   │   │   ├── KeychainView.jsx   # Quản lý SSH Keys
│   │   │   ├── ProxyView.jsx      # Quản lý VPN / Proxy
│   │   │   └── SnippetsView.jsx   # Quản lý đoạn lệnh nhanh
│   │   └── services/
│   │       ├── ServiceMonitorView.jsx # Giám sát Microservices cục bộ
│   │       ├── ManageServicesView.jsx # Quản lý thêm/sửa service
│   │       ├── ServiceLogView.jsx     # Xem live log của microservice
│   │       └── EnvModal.jsx           # Quản lý file biến môi trường .env
│   ├── constants/
│   │   ├── commandSuggestions.js  # Từ điển DevOps gợi ý lệnh & thuật toán tìm kiếm ghost text
│   │   └── palettes.js            # Bảng màu các theme giao diện
│   ├── hooks/
│   │   └── useKeyboardShortcuts.js# Hook bắt phím tắt toàn cục (Ctrl+K, Ctrl+`, F5...)
│   ├── i18n/
│   │   └── translations.js        # Bản dịch đa ngôn ngữ (Tiếng Việt & English)
│   └── services/
│       ├── sshClient.js           # API Client gọi xuống Rust Tauri qua invoke()
│       └── sshDiscovery.js        # API Client đọc SSH configs & keys
├── package.json                   # Dependencies frontend (React, Vite, Lucide, Tailwind...)
└── vite.config.js                 # Cấu hình Vite bundler
```

---

## 4. CHI TIẾT CÁC TÍNH NĂNG VÀ CƠ CHẾ HOẠT ĐỘNG

### 4.1. Terminal PTY & Chế độ Kép (WSL2 vs Windows Native)
- **Cơ chế PTY Backend:** Sử dụng crate `portable-pty`.
  - Nếu `enableWsl = true`: Gọi `wsl.exe -d <distro> --cd <path> bash` hoặc attach vào session `tmux`.
  - Nếu `enableWsl = false`: Gọi `powershell.exe` hoặc `cmd.exe` trên Windows Native.
- **IPC Events:**
  - `pty_spawn`: Tạo tiến trình PTY mới, cấp `session_id`.
  - `pty_write`: Gửi keystrokes từ xterm.js xuống PTY.
  - `pty_resize`: Điều chỉnh rows/cols khi user resize cửa sổ hoặc sidebar.
  - Event `pty-output-<id>`: Rust stream byte dữ liệu trả về cho frontend xterm.
- **Smart Suggestions (Ghost text):**
  - Tích hợp trực tiếp trong `TerminalView.jsx` và `SuggestionBar.jsx`.
  - Lắng nghe sự kiện `onKey` của xterm, tự động tìm kiếm tiền tố trong `DEV_SUGGESTION_DICT` (`commandSuggestions.js`) và lịch sử lệnh gần nhất.
  - Nhấn `Tab` hoặc `ArrowRight` để tự điền phần còn lại của lệnh.

### 4.2. SSH Auto-Discovery
- Backend Rust đọc trực tiếp file cấu hình:
  - Windows: `%USERPROFILE%\.ssh\config` và các private/public key trong thư mục đó.
  - WSL: `\\wsl$\<distro>\home\<user>\.ssh\config` khi kích hoạt chế độ WSL.
- Tự động tách:
  - `Host`: Danh sách máy chủ kết nối.
  - `IdentityFile`: Khóa SSH tương ứng.
  - `LocalForward`: Tự động chuyển đổi thành các quy tắc Port Forwarding.

### 4.3. Quản lý Chuyển Cổng (Port Forwarding)
- Các quy tắc từ file ssh config hoặc do người dùng tạo mới đều **mặc định ở trạng thái `STOPPED`** khi mở ứng dụng để tránh chiếm dụng port ngoài ý muốn.
- Khi người dùng nhấn nút **Bật (Play)**:
  - Gọi Tauri command `start_ssh_tunnel`.
  - Rust thực thi lệnh `ssh -N -L <local_port>:<remote_host>:<remote_port> <server>` với cờ ẩn cửa sổ (`CREATE_NO_WINDOW = 0x08000000`).
  - Lưu PID vào `RUNNING_TUNNELS` mutex map. Khi tắt, gọi `stop_ssh_tunnel` để terminate tiến trình an toàn.

### 4.4. SFTP File Manager
- **Dual Pane:** Cột bên trái hiển thị thư mục cục bộ (`list_local_directory`), cột bên phải hiển thị thư mục trên máy chủ từ xa (`list_remote_directory`).
- Hỗ trợ thao tác file qua IPC: `transfer_sftp_file` (Upload/Download), `remote_fs_action` (Delete, Rename, Mkdir).
- Hỗ trợ 2 chế độ xem: **List View** (dạng bảng chi tiết) và **Grid View** (dạng lưới icon trực quan).

### 4.5. VPN Portable & WireGuard
- Ứng dụng tích hợp sẵn bộ binary trong thư mục `bin/openvpn_portable`:
  - `openvpn.exe`, `wintun.dll`, `libcrypto-3-x64.dll`, `libssl-3-x64.dll`.
- Khi đóng gói, các file này được copy cùng cấp với `service-tool.exe`, cho phép ứng dụng kết nối VPN OpenVPN mà không cần người dùng phải cài đặt thêm driver từ bên ngoài.

---

## 5. HƯỚNG DẪN CÀI ĐẶT & CHẠY MÔI TRƯỜNG DEV

### 5.1. Yêu cầu tiên quyết (Prerequisites)
1. **Node.js:** Phiên bản `>= 18.x` (khuyên dùng Node 20 LTS).
2. **Rust & Cargo:** Phiên bản `>= 1.75`.
   - Nếu phát triển trên Windows: Cần cài đặt [Rust for Windows](https://rustup.rs/) (MSVC hoặc MinGW).
   - Nếu phát triển qua WSL2 (Ubuntu 24.04): Chạy `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`.
3. **MinGW-w64 (Nếu cross-compile từ WSL sang Windows):**
   ```bash
   sudo apt update
   sudo apt install -y mingw-w64 gcc build-essential
   rustup target add x86_64-pc-windows-gnu
   ```

### 5.2. Chạy ứng dụng ở chế độ Web Dev (Giao diện nhanh)
Dành cho việc chỉnh sửa giao diện React, CSS và logic frontend:
```bash
cd rtmux-desktop
npm install
npm run dev
```
Truy cập qua trình duyệt tại: `http://localhost:5173`

### 5.3. Chạy toàn bộ ứng dụng Desktop (Frontend + Rust Core)
```bash
cd rtmux-desktop
npm run tauri dev
```

---

## 6. HƯỚNG DẪN BUILD & ĐÓNG GÓI SẢN PHẨM (RELEASE)

Dự án đã được thiết kế sẵn script tự động hóa toàn bộ quy trình build từ frontend, compile mã máy Rust, nhúng binary phụ trợ đến tạo file **Single-File Portable EXE**.

### Cách 1: Build trên Windows (Khuyên dùng)
Mở PowerShell (Run as Administrator nếu cần) và chạy:
```powershell
cd rtmux-desktop
powershell -ExecutionPolicy Bypass -File scripts/build.ps1
```

**Quy trình `build.ps1` tự động thực hiện:**
1. Chạy `npm run build` để đóng gói giao diện React vào thư mục `dist/`.
2. Dùng Cargo biên dịch Rust backend với profile release tối ưu (`opt-level = "s"`, `lto = true`, `strip = true`).
3. Copy các thư viện OpenVPN portable (`openvpn.exe`, `wintun.dll`...) vào thư mục `dist-build/windows/`.
4. Biên dịch launcher C# (`csc.exe`) để tạo file **`service-tool-portable.exe`** độc lập: Nhúng toàn bộ file cần thiết vào 1 file EXE duy nhất, người dùng chỉ cần nhấp đúp là chạy ngay không cần cài đặt.

### Cách 2: Build trên Linux / WSL
```bash
cd rtmux-desktop
bash scripts/build.sh
```

### Kết quả xuất ra tại `dist-build/windows/`:
- **`service-tool-portable.exe`**: File Portable 1 file duy nhất (khuyên dùng để phân phối cho người dùng cuối).
- **`service-tool.exe`**: File thực thi native kèm folder thư viện dll.
- **`service-tool-windows-portable.zip`**: Bản zip giải nén chạy ngay.

---

## 7. QUY ƯỚC LƯU TRỮ VÀ DỮ LIỆU (STATE STORAGE)

Ứng dụng lưu trạng thái cấu hình của người dùng tại `localStorage` trình duyệt WebView:

| Key LocalStorage | Mục đích |
| :--- | :--- |
| `service_tool_settings` | Cấu hình hệ thống (enableWsl, wslDistro, defaultShell, accentColor, autoSuggestion...) |
| `service_tool_machines` | Danh sách máy chủ SSH đã quét hoặc thêm thủ công |
| `service_tool_ssh_keys` | Danh sách SSH keys đã phát hiện |
| `service_tool_ssh_tunnels` | Danh sách quy tắc chuyển cổng (mặc định trạng thái STOPPED) |
| `service_tool_proxies` | Cấu hình VPN & WireGuard |
| `service_tool_theme` | Giao diện hiện tại (Zinc, Cyberpunk...) |
| `service_tool_language` | Ngôn ngữ giao diện (`vi` hoặc `en`) |
| `service_tool_sftp_view_mode` | Chế độ xem SFTP (`list` hoặc `grid`) |
| `service_tool_portforward_view_mode` | Chế độ xem Port Forwarding (`list` hoặc `grid`) |
| `service_tool_custom_cmd_history` | Lịch sử các lệnh đã gõ trong terminal để phục vụ Auto-Suggestion |

---

## 8. HƯỚNG DẪN MỞ RỘNG TÍNH NĂNG MỚI (FOR CONTRIBUTORS)

Nếu bạn muốn tiếp tục nâng cấp hoặc thêm tính năng mới:

### 1. Thêm một màn hình mới (New View)
1. Tạo component mới trong `src/components/...` (ví dụ `src/components/k8s/K8sView.jsx`).
2. Trong `src/components/Sidebar.jsx`: Thêm mục menu điều hướng và icon tương ứng.
3. Trong `src/App.jsx`:
   - Khai báo state điều hướng (`currentNav === 'k8s'`).
   - Render component trong vùng nội dung chính.

### 2. Thêm lệnh tương tác hệ thống mới (New Rust IPC Command)
1. Mở `src-tauri/src/main.rs`:
   - Khai báo hàm Rust với macro `#[tauri::command]`:
     ```rust
     #[tauri::command]
     fn my_new_command(arg: String) -> Result<String, String> {
         // Logic xử lý hệ thống
         Ok(format!("Result: {}", arg))
     }
     ```
   - Đăng ký hàm vào danh sách `tauri::generate_handler![..., my_new_command]` ở hàm `main()`.
2. Mở `src/services/sshClient.js`:
   - Viết wrapper function gọi xuống Rust:
     ```javascript
     export async function myNewCommand(arg) {
       if (window.__TAURI__?.invoke) {
         return await window.__TAURI__.invoke('my_new_command', { arg });
       }
       return null;
     }
     ```
3. Gọi hàm `myNewCommand()` từ bất kỳ React component nào.

---
*Tài liệu được cập nhật tự động phục vụ bàn giao và duy trì sản phẩm dài hạn.*
