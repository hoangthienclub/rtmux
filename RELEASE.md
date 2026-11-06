# 🚀 Hướng Dẫn Phát Hành Tự Động (CI/CD Multi-OS & Portable Release)

Hệ thống CI/CD của RTMUX Desktop được thiết lập hoàn toàn tự động bằng **GitHub Actions** tại file [`.github/workflows/release.yml`](.github/workflows/release.yml).

---

## 1. Cơ Chế Hoạt Động (How It Works)

Mỗi khi bạn:
- **Push code trực tiếp lên nhánh `main`** (`git push origin main`)
- Hoặc **Merge Pull Request vào `main`**
- Hoặc bấm chạy thủ công qua tab **Actions -> Release Multi-OS -> Run workflow** trên GitHub

Hệ thống sẽ tự động kích hoạt 2 công đoạn:

### Bước 1: Tạo Release & Sinh Changelog (`create-release`)
- Đọc phiên bản từ `package.json` (ví dụ `0.1.0`).
- Tự động kiểm tra Git Tag:
  - Nếu tag `v0.1.0` chưa có, tạo tag `v0.1.0`.
  - Nếu đã có (push nhiều commit trong cùng version), tự động gắn `v0.1.0-b<run_number>` để không bị xung đột tag.
- Phân tích toàn bộ commit log kể từ bản phát hành trước để tự động sinh **Changelog** phân loại rõ ràng (Features, Bug Fixes, Improvements, Other Changes).
- Tạo GitHub Release tương ứng.

### Bước 2: Ma Trận Biên Dịch Song Song (`build-tauri`)
3 runner máy chủ GitHub chạy song song để đóng gói cả **Bản Cài Đặt (Installers)** và **Bản Portable Chạy Ngay (Portable Releases)**:

1. **🪟 Windows (`windows-latest`):**
   - 🚀 **`rtmux-portable.exe`**: Bản Portable Tiêu Chuẩn (~5MB), siêu nhẹ, bấm chạy ngay (không kèm engine VPN).
   - 🛡️ **`rtmux-portable-vpn.exe`**: Bản Portable Đầy Đủ Tích Hợp VPN (~14MB), kèm sẵn OpenVPN engine + Wintun driver ngầm.
   - 📦 **`rtmux-windows-portable.zip`** & **`rtmux-windows-portable-vpn.zip`**: Bản Portable dạng thư mục nén zip tương ứng.
   - 💿 File cài đặt chuẩn: `.exe` (NSIS Setup) và `.msi` (WiX Enterprise Installer).
2. **🍏 macOS (`macos-latest`):**
   - 🚀 **`rtmux-macos-portable.zip`**: Bản Portable nén `.app` chạy ngay (kèm script `Open-App-If-Blocked.command` tự động gỡ cờ Gatekeeper).
   - 📦 **`rtmux-macos-portable.tar.gz`**: Bản nén tarball bảo toàn symlink và unix permissions.
   - 💿 File cài đặt chuẩn: `.dmg` (kéo thả vào Applications) và `.app.tar.gz` (Universal Binary cho cả Apple Silicon M1/M2/M3/M4 và Intel).
   - 💡 **Mẹo mở app trên macOS:** Nếu macOS hiện cảnh báo *"App is damaged and can't be opened. You should move it to the trash"*, chỉ cần chạy 1 lệnh trong Terminal:
     ```bash
     xattr -cr "/Applications/rtmux-desktop.app"
     ```
3. **🐧 Linux (`ubuntu-22.04`):**
   - 🚀 **`rtmux-desktop.AppImage`**: File Portable chạy ngay trên mọi distro Linux (Ubuntu, Debian, Fedora, Arch...).
   - 📦 **`rtmux-linux-x86_64-portable.tar.gz`**: Bản nén portable nhị phân x86_64 đã set quyền thực thi `chmod +x`.
   - 💿 Gói cài đặt chuẩn: `.deb` (cho Ubuntu, Debian, Mint...).

Tất cả các file thành phẩm sẽ được tự động đính kèm trực tiếp vào mục **Assets** của GitHub Release để người dùng tải về!

---

## 2. Quy Ước Viết Commit Để Sinh Changelog Đẹp

Để Changelog trong mỗi bản phát hành tự động gom nhóm chuyên nghiệp, hãy viết commit message theo chuẩn **Conventional Commits**:

| Tiền tố (Prefix) | Nhóm trong Changelog | Ví dụ |
|---|---|---|
| `feat:` hoặc `feature:` | 🚀 **Tính Năng Mới (Features)** | `feat: thêm runner bash và python trong script` |
| `fix:` hoặc `bug:` | 🐛 **Sửa Lỗi (Bug Fixes)** | `fix: sửa lỗi react hook #310 trong env setup` |
| `refactor:`, `perf:`, `update:` | ⚡ **Cải Tiến & Tối Ưu (Improvements)** | `refactor: tối ưu chuẩn hóa badge running và stopped` |
| `chore:`, `docs:`, khác | 📝 **Thay Đổi Khác (Other Changes)** | `docs: cập nhật tài liệu phát hành đa nền tảng` |

---

## 3. Cách Tăng Phiên Bản (Bump Version)

Khi chuẩn bị ra mắt một phiên bản mới (ví dụ từ `0.1.0` lên `0.2.0` hoặc `1.0.0`):

1. Mở `package.json` và đổi `"version": "0.2.0"`
2. Mở `src-tauri/tauri.conf.json` và đổi `"version": "0.2.0"`
3. Mở `src-tauri/Cargo.toml` và đổi `version = "0.2.0"`
4. Commit và push lên `main`:
   ```bash
   git commit -am "chore: bump version to 0.2.0"
   git push origin main
   ```
5. GitHub Actions sẽ tự động tạo Release **`RTMUX Desktop v0.2.0`** kèm changelog và toàn bộ file Portable + Installers cho 3 hệ điều hành Windows, Mac, Linux.
