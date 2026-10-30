$RootDir = "z:\home\thientran\projects\tools\rtmux-desktop"
$OutputDir = Join-Path $RootDir "dist-build"
$WinExeSrc = Join-Path $RootDir "src-tauri\target\x86_64-pc-windows-gnu\release\rtmux-desktop.exe"
$WinDllSrc = Join-Path $RootDir "src-tauri\target\x86_64-pc-windows-gnu\release\WebView2Loader.dll"
$icon = Join-Path $RootDir "src-tauri\icons\icon.ico"
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

New-Item -ItemType Directory -Path "$OutputDir\windows" -Force | Out-Null

Copy-Item $WinExeSrc "$OutputDir\windows\rtmux-desktop.exe" -Force
Copy-Item $WinExeSrc "$OutputDir\windows\rtmux.exe" -Force
if (Test-Path $WinDllSrc) {
    Copy-Item $WinDllSrc "$OutputDir\windows\WebView2Loader.dll" -Force
}

$OpenVpnPortable = Join-Path $RootDir "bin\openvpn_portable"
if (Test-Path $OpenVpnPortable) {
    Copy-Item "$OpenVpnPortable\*" "$OutputDir\windows\" -Force
}

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

Write-Host "Compiling portable single-file exe..." -ForegroundColor Yellow
& $csc /target:winexe /optimize+ /win32icon:$icon $resArgs /out:$portableExe $launcherFile /r:System.Windows.Forms.dll
Remove-Item $launcherFile -Force -ErrorAction SilentlyContinue

Write-Host "Compressing portable zip package..." -ForegroundColor Yellow
$zipPath = "$OutputDir\windows\rtmux-windows-portable.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$zipFiles = @(
    "$OutputDir\windows\rtmux-desktop.exe",
    "$OutputDir\windows\WebView2Loader.dll"
)
if (Test-Path "$OutputDir\windows\openvpn.exe") {
    $zipFiles += "$OutputDir\windows\openvpn.exe"
    $zipFiles += "$OutputDir\windows\libcrypto-3-x64.dll"
    $zipFiles += "$OutputDir\windows\libssl-3-x64.dll"
    $zipFiles += "$OutputDir\windows\libpkcs11-helper-1.dll"
    $zipFiles += "$OutputDir\windows\vcruntime140.dll"
}
Compress-Archive -Path $zipFiles -DestinationPath $zipPath -Force

Write-Host "BUILD COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Get-Item "$OutputDir\windows\rtmux-portable.exe", "$OutputDir\windows\rtmux-windows-portable.zip" | Select-Object FullName, Length, LastWriteTime
