#!/usr/bin/env bash
set -e

# ==============================================================================
# Service Tool Multi-Platform Build Script
# Generates release artifacts inside rtmux-desktop/dist-build
# ==============================================================================

DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$DIR/dist-build"

echo "=========================================================="
echo " [1/3] Building Vite + React + Tailwind Frontend..."
echo "=========================================================="
cd "$DIR"
npm run build

echo "=========================================================="
echo " [2/3] Building Tauri Rust Backend (Release)..."
echo "=========================================================="
cd "$DIR/src-tauri"
export WEBKIT_DISABLE_COMPOSITING_MODE=1
source ~/.cargo/env 2>/dev/null || true
cargo build --release
cargo build --release --target x86_64-pc-windows-gnu

echo "=========================================================="
echo " [3/3] Packaging Release Artifacts inside dist-build..."
echo "=========================================================="
mkdir -p "$OUTPUT_DIR/windows"
mkdir -p "$OUTPUT_DIR/linux"
mkdir -p "$OUTPUT_DIR/macos"

BINARY_SRC="$DIR/src-tauri/target/release/rtmux-desktop"
WIN_EXE_SRC="$DIR/src-tauri/target/x86_64-pc-windows-gnu/release/rtmux-desktop.exe"
WIN_DLL_SRC="$DIR/src-tauri/target/x86_64-pc-windows-gnu/release/WebView2Loader.dll"

# 1. Windows Native Artifacts
if [ -f "$WIN_EXE_SRC" ]; then
    cp "$WIN_EXE_SRC" "$OUTPUT_DIR/windows/rtmux-desktop.exe"
    cp "$WIN_EXE_SRC" "$OUTPUT_DIR/windows/rtmux.exe" 2>/dev/null || true
    cp "$WIN_DLL_SRC" "$OUTPUT_DIR/windows/WebView2Loader.dll"
    echo "  [OK] Windows PE binary: dist-build/windows/rtmux-desktop.exe"
fi

# 1. Linux Artifact
cp "$BINARY_SRC" "$OUTPUT_DIR/linux/rtmux-desktop"
chmod +x "$OUTPUT_DIR/linux/rtmux-desktop"
echo "  [OK] Linux binary: dist-build/linux/rtmux-desktop"

# 2. macOS App Bundle Artifact
MACOS_BUNDLE="$OUTPUT_DIR/macos/RTMUX Desktop.app"
mkdir -p "$MACOS_BUNDLE/Contents/MacOS"
mkdir -p "$MACOS_BUNDLE/Contents/Resources"

cp "$BINARY_SRC" "$MACOS_BUNDLE/Contents/MacOS/rtmux-desktop"
chmod +x "$MACOS_BUNDLE/Contents/MacOS/rtmux-desktop"

if [ -f "$DIR/src-tauri/icons/icon.icns" ]; then
    cp "$DIR/src-tauri/icons/icon.icns" "$MACOS_BUNDLE/Contents/Resources/icon.icns"
fi

cat <<EOF > "$MACOS_BUNDLE/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>rtmux-desktop</string>
    <key>CFBundleIdentifier</key>
    <string>com.thientran.rtmux</string>
    <key>CFBundleName</key>
    <string>RTMUX Desktop</string>
    <key>CFBundleIconFile</key>
    <string>icon.icns</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF
echo "  [OK] macOS App Bundle: dist-build/macos/RTMUX Desktop.app"

echo "=========================================================="
echo " BUILD SUCCESSFUL! All OS artifacts in rtmux-desktop/dist-build/:"
echo " - Windows: dist-build/windows/rtmux-desktop.exe"
echo " - Linux:   dist-build/linux/rtmux-desktop"
echo " - macOS:   dist-build/macos/RTMUX Desktop.app"
echo "=========================================================="
