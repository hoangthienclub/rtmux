$RootDir = Split-Path -Parent $PSScriptRoot
$OutputDir = Join-Path $RootDir "dist-build"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [1/3] Building Frontend (Vite + React + Tailwind)..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Set-Location $RootDir
wsl.exe -d Ubuntu-24.04 bash -c "cd ~/projects/tools/rtmux-desktop && npm run build"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [2/3] Building Native Windows Binary (Rust + WebView2 via MinGW)..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
wsl.exe -d Ubuntu-24.04 bash -c "source ~/.cargo/env; cd ~/projects/tools/rtmux-desktop/src-tauri && cargo build --release --target x86_64-pc-windows-gnu && cargo build --release"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [3/3] Packaging Release Artifacts by OS inside rtmux-desktop..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
New-Item -ItemType Directory -Path "$OutputDir\windows" -Force | Out-Null
New-Item -ItemType Directory -Path "$OutputDir\linux" -Force | Out-Null
New-Item -ItemType Directory -Path "$OutputDir\macos" -Force | Out-Null

# 1. Windows Native Artifacts
$WinExeSrc = Join-Path $RootDir "src-tauri\target\x86_64-pc-windows-gnu\release\rtmux-desktop.exe"
$WinDllSrc = Join-Path $RootDir "src-tauri\target\x86_64-pc-windows-gnu\release\WebView2Loader.dll"

Copy-Item $WinExeSrc "$OutputDir\windows\rtmux-desktop.exe" -Force
Copy-Item $WinExeSrc "$OutputDir\windows\rtmux.exe" -Force
Copy-Item $WinDllSrc "$OutputDir\windows\WebView2Loader.dll" -Force

$OpenVpnPortable = Join-Path $RootDir "bin\openvpn_portable"
if (Test-Path $OpenVpnPortable) {
    Copy-Item "$OpenVpnPortable\*" "$OutputDir\windows\" -Force
}

# 1.1 Generate Single-File Portable Executable (.exe độc lập, bấm là chạy ngay không cần setup)
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$icon = Join-Path $RootDir "src-tauri\icons\icon.ico"
$launcherSource = @"
using System;
using System.IO;
using System.Diagnostics;
using System.Reflection;

namespace RtmuxPortable
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                string targetDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "RTMUX", "bin");
                Directory.CreateDirectory(targetDir);

                ExtractResource("rtmux-desktop.exe", Path.Combine(targetDir, "rtmux-desktop.exe"));
                ExtractResource("WebView2Loader.dll", Path.Combine(targetDir, "WebView2Loader.dll"));
                ExtractResource("openvpn.exe", Path.Combine(targetDir, "openvpn.exe"));
                ExtractResource("libcrypto-3-x64.dll", Path.Combine(targetDir, "libcrypto-3-x64.dll"));
                ExtractResource("libssl-3-x64.dll", Path.Combine(targetDir, "libssl-3-x64.dll"));
                ExtractResource("libpkcs11-helper-1.dll", Path.Combine(targetDir, "libpkcs11-helper-1.dll"));
                ExtractResource("vcruntime140.dll", Path.Combine(targetDir, "vcruntime140.dll"));

                string targetExe = Path.Combine(targetDir, "rtmux-desktop.exe");
                ProcessStartInfo psi = new ProcessStartInfo(targetExe);
                psi.WorkingDirectory = targetDir;
                psi.UseShellExecute = true;

                if (args != null && args.Length > 0)
                {
                    psi.Arguments = string.Join(" ", args);
                }

                Process.Start(psi);
            }
            catch (Exception ex)
            {
                System.Windows.Forms.MessageBox.Show("Failed to start RTMUX Desktop: " + ex.Message, "RTMUX Desktop Error", System.Windows.Forms.MessageBoxButtons.OK, System.Windows.Forms.MessageBoxIcon.Error);
            }
        }

        static void ExtractResource(string resName, string destPath)
        {
            Assembly asm = Assembly.GetExecutingAssembly();
            using (Stream s = asm.GetManifestResourceStream(resName))
            {
                if (s == null) return;

                // If updating rtmux-desktop.exe and old process is still running, kill it cleanly
                if (resName.IndexOf("rtmux", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    try
                    {
                        foreach (var proc in Process.GetProcessesByName("rtmux-desktop"))
                        {
                            try { proc.Kill(); proc.WaitForExit(1500); } catch { }
                        }
                    }
                    catch { }
                }

                // Always overwrite with the embedded binary to ensure latest build is applied
                for (int attempt = 0; attempt < 5; attempt++)
                {
                    try
                    {
                        using (FileStream fs = new FileStream(destPath, FileMode.Create, FileAccess.Write, FileShare.None))
                        {
                            s.CopyTo(fs);
                        }
                        break;
                    }
                    catch
                    {
                        System.Threading.Thread.Sleep(300);
                    }
                }
            }
        }
    }
}
"@
$launcherFile = "$OutputDir\windows\Launcher.cs"
Set-Content -Path $launcherFile -Value $launcherSource -Encoding UTF8

if (Test-Path $csc) {
    Write-Host " [1.1] Building Single-File Portable Executable (rtmux-portable.exe)..." -ForegroundColor Yellow
    $portableExe = "$OutputDir\windows\rtmux-portable.exe"
    $resArgs = @(
        "/resource:`"$OutputDir\windows\rtmux-desktop.exe`",rtmux-desktop.exe",
        "/resource:`"$OutputDir\windows\WebView2Loader.dll`",WebView2Loader.dll"
    )
    if (Test-Path "$OutputDir\windows\openvpn.exe") {
        $resArgs += "/resource:`"$OutputDir\windows\openvpn.exe`",openvpn.exe"
        $resArgs += "/resource:`"$OutputDir\windows\libcrypto-3-x64.dll`",libcrypto-3-x64.dll"
        $resArgs += "/resource:`"$OutputDir\windows\libssl-3-x64.dll`",libssl-3-x64.dll"
        $resArgs += "/resource:`"$OutputDir\windows\libpkcs11-helper-1.dll`",libpkcs11-helper-1.dll"
        $resArgs += "/resource:`"$OutputDir\windows\vcruntime140.dll`",vcruntime140.dll"
    }
    & $csc /target:winexe /optimize+ /win32icon:$icon $resArgs /out:$portableExe $launcherFile /r:System.Windows.Forms.dll | Out-Null
    Remove-Item $launcherFile -Force -ErrorAction SilentlyContinue
}

# 1.2 Compress Portable Zip
$zipPath = "$OutputDir\windows\rtmux-windows-portable.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path "$OutputDir\windows\rtmux-desktop.exe", "$OutputDir\windows\WebView2Loader.dll" -DestinationPath $zipPath -Force

# 2. Linux Artifact
$LinuxBinary = Join-Path $RootDir "src-tauri\target\release\rtmux-desktop"
if (Test-Path $LinuxBinary) {
    Copy-Item $LinuxBinary "$OutputDir\linux\rtmux-desktop" -Force
}

# 3. macOS App Bundle Artifact
$MacBundle = "$OutputDir\macos\RTMUX Desktop.app"
New-Item -ItemType Directory -Path "$MacBundle\Contents\MacOS" -Force | Out-Null
New-Item -ItemType Directory -Path "$MacBundle\Contents\Resources" -Force | Out-Null
if (Test-Path $LinuxBinary) {
    Copy-Item $LinuxBinary "$MacBundle\Contents\MacOS\rtmux-desktop" -Force
}
$IconIcns = Join-Path $RootDir "src-tauri\icons\icon.icns"
if (Test-Path $IconIcns) {
    Copy-Item $IconIcns "$MacBundle\Contents\Resources\icon.icns" -Force
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " BUILD COMPLETED! ALL ARTIFACTS IN rtmux-desktop\dist-build:" -ForegroundColor Green
Write-Host " - Windows Portable (1 File duy nhất, bấm chạy): rtmux-desktop\dist-build\windows\rtmux-portable.exe" -ForegroundColor Green
Write-Host " - Windows Executable:                           rtmux-desktop\dist-build\windows\rtmux-desktop.exe" -ForegroundColor Green
Write-Host " - Windows Zip Portable:                         rtmux-desktop\dist-build\windows\rtmux-windows-portable.zip" -ForegroundColor Green
Write-Host " - Linux:                                        rtmux-desktop\dist-build\linux\rtmux-desktop" -ForegroundColor Green
Write-Host " - macOS:                                        rtmux-desktop\dist-build\macos\RTMUX Desktop.app" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
