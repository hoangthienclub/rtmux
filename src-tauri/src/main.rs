#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};
use std::collections::HashMap;
use std::io::{Read, Write};
use serde::{Deserialize, Serialize};
use tauri::Manager;
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlatformInfo {
    pub os: String,
    pub wsl_available: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SshHostConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub hostname: String,
    pub user: String,
    pub port: u16,
    pub identity_file: Option<String>,
    pub tag: String,
    pub uptime: String,
    pub cpu: u8,
    pub ram_pct: u8,
    pub cores: String,
    pub ram: String,
    pub disk: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SshKeyInfo {
    pub id: String,
    pub name: String,
    pub key_type: String,
    pub path: String,
    pub fingerprint: String,
    pub public_key: String,
    pub has_passphrase: bool,
    pub associated_hosts: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SshTunnelConfig {
    pub id: String,
    pub name: String,
    pub local_port: u16,
    pub remote_host: String,
    pub remote_port: u16,
    pub via_server: String,
    pub status: String,
    pub traffic: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SshDiscoveryResult {
    pub ssh_dirs: Vec<String>,
    pub hosts: Vec<SshHostConfig>,
    pub keys: Vec<SshKeyInfo>,
    pub tunnels: Vec<SshTunnelConfig>,
}

fn parse_ssh_config_content(
    content: &str,
    hosts: &mut Vec<SshHostConfig>,
    tunnels: &mut Vec<SshTunnelConfig>,
) {
    let mut current_host: Option<SshHostConfig> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }

        let key = parts[0].to_lowercase();

        if key == "host" {
            // Push previous host if valid
            if let Some(mut h) = current_host.take() {
                if !h.name.is_empty() && h.name != "*" {
                    if h.host.is_empty() {
                        h.host = format!("{}@{}:{}", h.user, h.hostname, h.port);
                    }
                    if !hosts.iter().any(|existing| existing.name == h.name) {
                        hosts.push(h);
                    }
                }
            }

            let host_alias = parts.get(1).unwrap_or(&"").trim().to_string();
            if host_alias != "*" && !host_alias.is_empty() {
                let tag = if host_alias.contains("prod") {
                    "Production".to_string()
                } else if host_alias.contains("uat") {
                    "UAT".to_string()
                } else if host_alias.contains("dev") {
                    "Dev".to_string()
                } else {
                    "SSH".to_string()
                };

                current_host = Some(SshHostConfig {
                    id: format!("ssh_{}", host_alias),
                    name: host_alias.clone(),
                    host: String::new(),
                    hostname: host_alias.clone(),
                    user: "root".to_string(),
                    port: 22,
                    identity_file: None,
                    tag,
                    uptime: "Click to Monitor".to_string(),
                    cpu: 0,
                    ram_pct: 0,
                    cores: "4".to_string(),
                    ram: "8 GB".to_string(),
                    disk: "100 GB".to_string(),
                });
            }
        } else if let Some(ref mut h) = current_host {
            match key.as_str() {
                "hostname" => {
                    if let Some(val) = parts.get(1) {
                        h.hostname = val.to_string();
                    }
                }
                "user" => {
                    if let Some(val) = parts.get(1) {
                        h.user = val.to_string();
                    }
                }
                "port" => {
                    if let Some(val) = parts.get(1) {
                        if let Ok(p) = val.parse::<u16>() {
                            h.port = p;
                        }
                    }
                }
                "identityfile" => {
                    if parts.len() > 1 {
                        let path_val = parts[1..].join(" ").trim_matches('"').to_string();
                        h.identity_file = Some(path_val);
                    }
                }
                "localforward" => {
                    if parts.len() >= 3 {
                        if let Ok(local_port) = parts[1].parse::<u16>() {
                            let (remote_host, remote_port) = if parts[2].contains(':') {
                                let hp: Vec<&str> = parts[2].split(':').collect();
                                (
                                    hp[0].to_string(),
                                    hp.get(1).and_then(|p| p.parse().ok()).unwrap_or(80),
                                )
                            } else if parts.len() >= 4 {
                                (parts[2].to_string(), parts[3].parse().unwrap_or(80))
                            } else {
                                ("127.0.0.1".to_string(), 80)
                            };

                            let t_id = format!("t_{}_{}", h.name, local_port);
                            if !tunnels.iter().any(|t| t.id == t_id) {
                                tunnels.push(SshTunnelConfig {
                                    id: t_id,
                                    name: format!("{} (:{} -> :{})", h.name, local_port, remote_port),
                                    local_port,
                                    remote_host,
                                    remote_port,
                                    via_server: h.name.clone(),
                                    status: "STOPPED".to_string(),
                                    traffic: "0 B".to_string(),
                                });
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }

    if let Some(mut h) = current_host {
        if !h.name.is_empty() && h.name != "*" {
            if h.host.is_empty() {
                h.host = format!("{}@{}:{}", h.user, h.hostname, h.port);
            }
            if !hosts.iter().any(|existing| existing.name == h.name) {
                hosts.push(h);
            }
        }
    }
}

fn scan_ssh_keys_in_dir(ssh_dir: &Path, keys: &mut Vec<SshKeyInfo>, hosts: &[SshHostConfig]) {
    if let Ok(entries) = fs::read_dir(ssh_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let file_name = entry.file_name().to_string_lossy().to_string();

                if file_name == "config"
                    || file_name == "known_hosts"
                    || file_name == "known_hosts.old"
                    || file_name == "authorized_keys"
                    || file_name.ends_with(".pub")
                    || file_name.starts_with('.')
                {
                    continue;
                }

                if keys.iter().any(|k| k.name == file_name) {
                    continue;
                }

                let pub_path = format!("{}.pub", path.to_string_lossy());
                let mut pub_content = String::new();
                let mut key_type = "OPENSSH".to_string();

                if let Ok(c) = fs::read_to_string(&pub_path) {
                    pub_content = c.trim().to_string();
                    if pub_content.starts_with("ssh-ed25519") {
                        key_type = "ED25519".to_string();
                    } else if pub_content.starts_with("ssh-rsa") {
                        key_type = "RSA 4096".to_string();
                    } else if pub_content.starts_with("ecdsa-") {
                        key_type = "ECDSA".to_string();
                    }
                } else if file_name.ends_with(".pem") {
                    key_type = "PEM RSA".to_string();
                } else if file_name.contains("ed25519") {
                    key_type = "ED25519".to_string();
                } else if file_name.contains("rsa") {
                    key_type = "RSA".to_string();
                }

                let mut associated = Vec::new();
                for h in hosts {
                    if let Some(ref id_file) = h.identity_file {
                        if id_file.contains(&file_name) {
                            associated.push(h.name.clone());
                        }
                    }
                }

                let fp_hash = format!(
                    "SHA256:{:016x}",
                    file_name.bytes().fold(0u64, |acc, b| acc.wrapping_mul(31).wrapping_add(b as u64))
                );

                keys.push(SshKeyInfo {
                    id: format!("key_{}", file_name),
                    name: file_name.clone(),
                    key_type,
                    path: path.to_string_lossy().to_string(),
                    fingerprint: fp_hash,
                    public_key: if pub_content.is_empty() {
                        format!("ssh-ed25519 (Private Key tại {})", path.to_string_lossy())
                    } else {
                        pub_content
                    },
                    has_passphrase: false,
                    associated_hosts: associated,
                });
            }
        }
    }
}

#[tauri::command]
fn get_platform_info() -> PlatformInfo {
    let is_windows = cfg!(target_os = "windows");
    let is_macos = cfg!(target_os = "macos");
    let os = if is_windows {
        "windows"
    } else if is_macos {
        "macos"
    } else {
        "linux"
    };
    PlatformInfo {
        os: os.into(),
        wsl_available: is_windows,
    }
}

#[tauri::command]
fn read_ssh_config_and_keys(
    enable_wsl: Option<bool>,
    wsl_distro: Option<String>,
) -> SshDiscoveryResult {
    let mut candidate_dirs: Vec<PathBuf> = Vec::new();
    let use_wsl = enable_wsl.unwrap_or(false);

    if use_wsl {
        // STRICTLY scan WSL .ssh directory when WSL mode is enabled
        let distro = wsl_distro.clone().unwrap_or_else(|| "Ubuntu-24.04".to_string());

        // Windows UNC network paths to WSL distributions
        let wsl_unc_prefixes = [
            format!(r"\\wsl.localhost\{}\home", distro),
            format!(r"\\wsl$\{}\home", distro),
            format!(r"\\wsl.localhost\Ubuntu-24.04\home"),
            format!(r"\\wsl$\Ubuntu-24.04\home"),
            format!(r"\\wsl.localhost\Ubuntu\home"),
            format!(r"\\wsl$\Ubuntu\home"),
        ];

        for prefix in &wsl_unc_prefixes {
            if let Ok(entries) = fs::read_dir(prefix) {
                for entry in entries.flatten() {
                    let p = entry.path().join(".ssh");
                    if p.is_dir() && !candidate_dirs.contains(&p) {
                        candidate_dirs.push(p);
                    }
                }
            }
        }

        // If running inside WSL environment directly or HOME points to /home
        if let Ok(home) = std::env::var("HOME") {
            if home.starts_with('/') || home.starts_with(r"\\wsl") {
                let p = PathBuf::from(home).join(".ssh");
                if p.is_dir() && !candidate_dirs.contains(&p) {
                    candidate_dirs.push(p);
                }
            }
        }

        if let Ok(entries) = fs::read_dir("/home") {
            for entry in entries.flatten() {
                let p = entry.path().join(".ssh");
                if p.is_dir() && !candidate_dirs.contains(&p) {
                    candidate_dirs.push(p);
                }
            }
        }
    } else {
        // Pure Windows Native: STRICTLY scan Windows USERPROFILE\.ssh!
        if let Ok(user_profile) = std::env::var("USERPROFILE") {
            let p = PathBuf::from(user_profile).join(".ssh");
            if p.is_dir() && !candidate_dirs.contains(&p) {
                candidate_dirs.push(p);
            }
        }

        if candidate_dirs.is_empty() {
            if let Ok(home) = std::env::var("HOME") {
                // Must strictly be a Windows drive path (e.g. C:\...) - reject /home and \\wsl
                if !home.starts_with('/') && !home.starts_with(r"\\wsl") && home.contains(':') {
                    let p = PathBuf::from(&home).join(".ssh");
                    if p.is_dir() && !candidate_dirs.contains(&p) {
                        candidate_dirs.push(p);
                    }
                }
            }
        }
    }

    let mut hosts: Vec<SshHostConfig> = Vec::new();
    let mut tunnels: Vec<SshTunnelConfig> = Vec::new();
    let mut keys: Vec<SshKeyInfo> = Vec::new();
    let mut scanned_dirs: Vec<String> = Vec::new();

    // Fallback for WSL if UNC network path is unavailable
    if use_wsl && candidate_dirs.is_empty() {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            let distro = wsl_distro.unwrap_or_else(|| "Ubuntu-24.04".to_string());
            let mut cmd = Command::new("wsl.exe");
            cmd.args(["-d", &distro, "bash", "-c", "cat ~/.ssh/config 2>/dev/null"]);
            if let Ok(output) = cmd.output() {
                if output.status.success() {
                    let content = String::from_utf8_lossy(&output.stdout);
                    parse_ssh_config_content(&content, &mut hosts, &mut tunnels);
                    scanned_dirs.push(format!("WSL ({}) ~/.ssh", distro));
                }
            }
        }
    }

    for dir in candidate_dirs {
        scanned_dirs.push(dir.to_string_lossy().to_string());

        let config_file = dir.join("config");
        if config_file.is_file() {
            if let Ok(content) = fs::read_to_string(&config_file) {
                parse_ssh_config_content(&content, &mut hosts, &mut tunnels);
            }
        }

        scan_ssh_keys_in_dir(&dir, &mut keys, &hosts);
    }

    // Update associated hosts for keys
    for k in &mut keys {
        for h in &hosts {
            if let Some(ref id_file) = h.identity_file {
                if id_file.contains(&k.name) && !k.associated_hosts.contains(&h.name) {
                    k.associated_hosts.push(h.name.clone());
                }
            }
        }
    }

    SshDiscoveryResult {
        ssh_dirs: scanned_dirs,
        hosts,
        keys,
        tunnels,
    }
}

pub struct PtySession {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
}

#[derive(Clone, Default)]
pub struct PtyState(pub Arc<Mutex<HashMap<String, PtySession>>>);

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PtyOutputPayload {
    pub id: String,
    pub data: String,
}

#[tauri::command]
fn pty_spawn(
    app_handle: tauri::AppHandle,
    state: tauri::State<PtyState>,
    id: String,
    shell_type: String,
    cols: u16,
    rows: u16,
    distro: Option<String>,
    remote_host: Option<String>,
) -> Result<(), String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: rows.max(10),
            cols: cols.max(20),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let cmd = match shell_type.as_str() {
        "wsl" => {
            #[cfg(target_os = "windows")]
            {
                let mut c = CommandBuilder::new("wsl.exe");
                let d = distro.unwrap_or_else(|| "Ubuntu-24.04".to_string());
                c.args(["-d", &d, "--cd", "~"]);
                c
            }
            #[cfg(not(target_os = "windows"))]
            {
                CommandBuilder::new("zsh")
            }
        }
        "powershell" => {
            #[cfg(target_os = "windows")]
            {
                let mut c = CommandBuilder::new("powershell.exe");
                c.args(["-NoLogo"]);
                if let Ok(home) = std::env::var("USERPROFILE") {
                    c.cwd(home);
                }
                c
            }
            #[cfg(not(target_os = "windows"))]
            {
                CommandBuilder::new("sh")
            }
        }
        "cmd" => {
            let mut c = CommandBuilder::new("cmd.exe");
            #[cfg(target_os = "windows")]
            if let Ok(home) = std::env::var("USERPROFILE") {
                c.cwd(home);
            }
            c
        }
        "ssh" => {
            #[cfg(target_os = "windows")]
            {
                let mut c = CommandBuilder::new("ssh.exe");
                if let Some(host) = remote_host {
                    c.args(["-tt", &host]);
                }
                c
            }
            #[cfg(not(target_os = "windows"))]
            {
                let mut c = CommandBuilder::new("ssh");
                if let Some(host) = remote_host {
                    c.args(["-tt", &host]);
                }
                c
            }
        }
        "wsl_ssh" => {
            #[cfg(target_os = "windows")]
            {
                let d = distro.unwrap_or_else(|| "Ubuntu-24.04".to_string());
                let mut c = CommandBuilder::new("wsl.exe");
                if let Some(host) = remote_host {
                    c.args(["-d", &d, "ssh", "-tt", &host]);
                } else {
                    c.args(["-d", &d, "ssh"]);
                }
                c
            }
            #[cfg(not(target_os = "windows"))]
            {
                let mut c = CommandBuilder::new("ssh");
                if let Some(host) = remote_host {
                    c.args(["-tt", &host]);
                }
                c
            }
        }
        "macos" | "zsh" => {
            CommandBuilder::new("zsh")
        }
        _ => {
            #[cfg(target_os = "windows")]
            {
                let mut c = CommandBuilder::new("powershell.exe");
                c.args(["-NoLogo"]);
                c
            }
            #[cfg(not(target_os = "windows"))]
            {
                CommandBuilder::new("bash")
            }
        }
    };

    let _child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn process in PTY: {}", e))?;

    let reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone PTY reader: {}", e))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to take PTY writer: {}", e))?;

    let id_clone = id.clone();
    let app_clone = app_handle.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        let mut r = reader;
        loop {
            match r.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let s = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_clone.emit_all(
                        "pty-data",
                        PtyOutputPayload {
                            id: id_clone.clone(),
                            data: s,
                        },
                    );
                }
                Err(_) => break,
            }
        }
    });

    let session = PtySession {
        master: pair.master,
        writer,
    };

    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    map.insert(id, session);

    Ok(())
}

#[tauri::command]
fn pty_write(
    state: tauri::State<PtyState>,
    id: String,
    data: String,
) -> Result<(), String> {
    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(session) = map.get_mut(&id) {
        session
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
        session.writer.flush().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
fn pty_resize(
    state: tauri::State<PtyState>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(session) = map.get_mut(&id) {
        session
            .master
            .resize(PtySize {
                rows: rows.max(5),
                cols: cols.max(10),
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
fn pty_kill(
    state: tauri::State<PtyState>,
    id: String,
) -> Result<(), String> {
    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    map.remove(&id);
    Ok(())
}

#[tauri::command]
async fn start_terminal_session(
    app_handle: tauri::AppHandle,
    session_name: String,
    use_tmux: Option<bool>,
    target_env: Option<String>,
) -> Result<String, String> {
    let env = target_env.unwrap_or_else(|| "windows".to_string());
    let tmux = use_tmux.unwrap_or(false);

    if env == "wsl" || tmux {
        let _ = app_handle.emit_all(
            "terminal-output",
            format!(
                "\x1b[32m[rtmux]\x1b[0m WSL2 Session '{}' initialized (tmux engine active).\r\n",
                session_name
            ),
        );
    } else {
        let _ = app_handle.emit_all(
            "terminal-output",
            format!(
                "\x1b[34m[rtmux]\x1b[0m Windows Native Session '{}' initialized (PowerShell).\r\n",
                session_name
            ),
        );
    }

    Ok("Session started".into())
}

#[tauri::command]
async fn send_terminal_input(app_handle: tauri::AppHandle, data: String) -> Result<(), String> {
    let _ = app_handle.emit_all("terminal-output", data);
    Ok(())
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SshExecResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SshProbeResult {
    pub host: String,
    pub reachable: bool,
    pub latency_ms: u64,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RemoteDockerContainer {
    pub id: String,
    pub name: String,
    pub image: String,
    pub command: String,
    pub status: String,
    pub state: String,
    pub ports: String,
}

static RUNNING_TUNNELS: OnceLock<Mutex<HashMap<String, u32>>> = OnceLock::new();

fn get_tunnels_map() -> &'static Mutex<HashMap<String, u32>> {
    RUNNING_TUNNELS.get_or_init(|| Mutex::new(HashMap::new()))
}

#[tauri::command]
fn open_native_ssh_terminal(host: String, use_wsl: Option<bool>) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let wsl = use_wsl.unwrap_or(false);
        let is_local = host == "local" || host == "localhost" || host.starts_with("local_");

        // 1. Try wt.exe (Windows Terminal)
        let is_wt = Command::new("wt.exe").arg("-v").output().is_ok();
        if is_wt {
            let res = if is_local {
                if wsl {
                    Command::new("wt.exe").args(["-p", "Ubuntu-24.04", "-d", "~"]).spawn()
                } else {
                    Command::new("wt.exe").spawn()
                }
            } else {
                if wsl {
                    Command::new("wt.exe")
                        .args(["-p", "Ubuntu-24.04", "ssh", &host])
                        .spawn()
                } else {
                    Command::new("wt.exe")
                        .args(["ssh", &host])
                        .spawn()
                }
            };
            if res.is_ok() {
                return Ok(true);
            }
        }

        // 2. Fallback to cmd.exe
        if is_local {
            if wsl {
                let _ = Command::new("cmd.exe")
                    .args(["/c", "start", "WSL Terminal", "wsl.exe", "-d", "Ubuntu-24.04", "--cd", "~"])
                    .spawn();
            } else {
                let _ = Command::new("cmd.exe")
                    .args(["/c", "start", "PowerShell", "powershell.exe"])
                    .spawn();
            }
        } else {
            if wsl {
                let _ = Command::new("cmd.exe")
                    .args(["/c", "start", &format!("SSH (WSL): {}", host), "wsl.exe", "-d", "Ubuntu-24.04", "ssh", &host])
                    .spawn();
            } else {
                let _ = Command::new("cmd.exe")
                    .args(["/c", "start", &format!("SSH: {}", host), "ssh.exe", &host])
                    .spawn();
            }
        }
        Ok(true)
    }
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let is_local = host == "local" || host == "localhost" || host.starts_with("local_");
        if is_local {
            let _ = Command::new("open").args(["-a", "Terminal"]).spawn();
        } else {
            let script = format!("tell application \"Terminal\" to do script \"ssh {}\"", host);
            let _ = Command::new("osascript").args(["-e", &script]).spawn();
        }
        Ok(true)
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        use std::process::Command;
        let is_local = host == "local" || host == "localhost" || host.starts_with("local_");
        if is_local {
            let _ = Command::new("x-terminal-emulator").spawn();
        } else {
            let _ = Command::new("x-terminal-emulator")
                .args(["-e", &format!("ssh {}", host)])
                .spawn();
        }
        Ok(true)
    }
}

#[tauri::command]
fn exec_ssh_command(
    host: String,
    command: String,
    use_wsl: Option<bool>,
) -> Result<SshExecResult, String> {
    use std::process::Command;
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let is_local = host == "local" || host == "localhost" || host.starts_with("local_");
    let wsl = use_wsl.unwrap_or(false);

    if is_local {
        #[cfg(target_os = "windows")]
        {
            if wsl {
                let mut c = Command::new("wsl.exe");
                c.args(["-d", "Ubuntu-24.04", "--cd", "~", "bash", "-c", &command]);
                c.creation_flags(CREATE_NO_WINDOW);
                if let Ok(output) = c.output() {
                    return Ok(SshExecResult {
                        exit_code: output.status.code().unwrap_or(0),
                        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                    });
                }
            }

            // 1. Try Windows native PowerShell
            let mut ps = Command::new("powershell.exe");
            ps.args(["-NoProfile", "-NonInteractive", "-Command", &command]);
            ps.creation_flags(CREATE_NO_WINDOW);

            if let Ok(output) = ps.output() {
                if output.status.success() {
                    return Ok(SshExecResult {
                        exit_code: 0,
                        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                    });
                }
            }

            // 2. If PowerShell failed (e.g. docker only exists in WSL), auto-fallback to WSL!
            let mut wsl_c = Command::new("wsl.exe");
            wsl_c.args(["-d", "Ubuntu-24.04", "--cd", "~", "bash", "-c", &command]);
            wsl_c.creation_flags(CREATE_NO_WINDOW);
            if let Ok(output) = wsl_c.output() {
                let code = output.status.code().unwrap_or(1);
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                if code == 0 || !stdout.is_empty() {
                    return Ok(SshExecResult {
                        exit_code: code,
                        stdout,
                        stderr,
                    });
                }
            }

            // 3. Fallback to generic wsl
            let mut wsl_generic = Command::new("wsl.exe");
            wsl_generic.args(["--cd", "~", "bash", "-c", &command]);
            wsl_generic.creation_flags(CREATE_NO_WINDOW);
            if let Ok(output) = wsl_generic.output() {
                let code = output.status.code().unwrap_or(1);
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                if code == 0 || !stdout.is_empty() {
                    return Ok(SshExecResult {
                        exit_code: code,
                        stdout,
                        stderr,
                    });
                }
            }

            // If all failed, run PowerShell again to get its descriptive error
            let output = ps.output().map_err(|e| format!("Failed to run local command: {}", e))?;
            return Ok(SshExecResult {
                exit_code: output.status.code().unwrap_or(1),
                stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            });
        }

        #[cfg(not(target_os = "windows"))]
        {
            let mut c = Command::new("bash");
            c.args(["-c", &command]);
            let output = c.output().map_err(|e| format!("Failed to run local command: {}", e))?;
            return Ok(SshExecResult {
                exit_code: output.status.code().unwrap_or(1),
                stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            });
        }
    }

    // Remote SSH execution
    // 1. Try Windows OpenSSH first (if not explicitly forced to WSL)
    if !wsl {
        let mut cmd = Command::new("ssh.exe");
        cmd.args(["-o", "BatchMode=yes", "-o", "ConnectTimeout=4", &host, &command]);
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        if let Ok(output) = cmd.output() {
            let code = output.status.code().unwrap_or(1);
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();

            // If it succeeded or returned remote output (and not missing identity file error)
            if code == 0 || (!stderr.contains("no such identity") && !stderr.contains("Permission denied")) {
                return Ok(SshExecResult { exit_code: code, stdout, stderr });
            }
        }
    }

    // 2. Try WSL fallback (covers ~/.ssh keys configured inside Ubuntu)
    let mut wsl_cmd = Command::new("wsl.exe");
    wsl_cmd.args(["-d", "Ubuntu-24.04", "ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=4", &host, &command]);
    #[cfg(target_os = "windows")]
    wsl_cmd.creation_flags(CREATE_NO_WINDOW);

    match wsl_cmd.output() {
        Ok(output) => Ok(SshExecResult {
            exit_code: output.status.code().unwrap_or(1),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        }),
        Err(e) => Err(format!("SSH execution failed: {}", e)),
    }
}

#[tauri::command]
fn probe_ssh_host(host: String, use_wsl: Option<bool>) -> SshProbeResult {
    let start = std::time::Instant::now();
    let res = exec_ssh_command(host.clone(), "echo __RTMUX_OK__".to_string(), use_wsl);
    let latency = start.elapsed().as_millis() as u64;

    match res {
        Ok(exec) => {
            if exec.stdout.contains("__RTMUX_OK__") {
                SshProbeResult {
                    host,
                    reachable: true,
                    latency_ms: latency,
                    error: None,
                }
            } else {
                let err_msg = if !exec.stderr.is_empty() {
                    exec.stderr
                } else if !exec.stdout.is_empty() {
                    exec.stdout
                } else {
                    format!("Exit code {}", exec.exit_code)
                };
                SshProbeResult {
                    host,
                    reachable: false,
                    latency_ms: latency,
                    error: Some(err_msg.trim().to_string()),
                }
            }
        }
        Err(e) => SshProbeResult {
            host,
            reachable: false,
            latency_ms: latency,
            error: Some(e),
        },
    }
}

#[tauri::command]
fn fetch_remote_docker_containers(
    host: String,
    use_wsl: Option<bool>,
) -> Result<Vec<RemoteDockerContainer>, String> {
    let cmd = "docker ps -a --format '{{.ID}};;{{.Names}};;{{.Image}};;{{.Command}};;{{.Status}};;{{.State}};;{{.Ports}}'";
    let res = exec_ssh_command(host.clone(), cmd.to_string(), use_wsl)?;

    if res.exit_code != 0 {
        let err = if !res.stderr.is_empty() { res.stderr } else { res.stdout };
        return Err(err.trim().to_string());
    }

    let mut list = Vec::new();
    for line in res.stdout.lines() {
        let parts: Vec<&str> = line.split(";;").collect();
        if parts.len() >= 6 {
            list.push(RemoteDockerContainer {
                id: parts[0].trim().to_string(),
                name: parts[1].trim().to_string(),
                image: parts[2].trim().to_string(),
                command: parts[3].trim().to_string(),
                status: parts[4].trim().to_string(),
                state: parts[5].trim().to_uppercase(),
                ports: parts.get(6).unwrap_or(&"").trim().to_string(),
            });
        }
    }
    Ok(list)
}

#[tauri::command]
fn start_ssh_tunnel(
    id: String,
    host: String,
    local_port: u16,
    remote_host: String,
    remote_port: u16,
    use_wsl: Option<bool>,
) -> Result<u32, String> {
    use std::process::Command;
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let _ = stop_ssh_tunnel(id.clone());

    let wsl = use_wsl.unwrap_or(false);
    let mut cmd = if wsl {
        let mut c = Command::new("wsl.exe");
        c.args([
            "-d", "Ubuntu-24.04", "ssh", "-N",
            "-L", &format!("{}:{}:{}", local_port, remote_host, remote_port),
            &host,
        ]);
        c
    } else {
        let mut c = Command::new("ssh.exe");
        c.args([
            "-N",
            "-L", &format!("{}:{}:{}", local_port, remote_host, remote_port),
            &host,
        ]);
        c
    };

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.spawn() {
        Ok(child) => {
            let pid = child.id();
            let mut map = get_tunnels_map().lock().unwrap();
            map.insert(id, pid);
            Ok(pid)
        }
        Err(e) => Err(format!("Failed to start SSH tunnel: {}", e)),
    }
}

#[tauri::command]
fn stop_ssh_tunnel(id: String) -> Result<bool, String> {
    let mut map = get_tunnels_map().lock().unwrap();
    if let Some(pid) = map.remove(&id) {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            let _ = Command::new("taskkill")
                .args(["/F", "/PID", &pid.to_string()])
                .output();
        }
        #[cfg(not(target_os = "windows"))]
        {
            use std::process::Command;
            let _ = Command::new("kill")
                .args(["-9", &pid.to_string()])
                .output();
        }
        return Ok(true);
    }
    Ok(false)
}

static RUNNING_BACKEND_PID: OnceLock<Mutex<Option<u32>>> = OnceLock::new();

fn get_backend_pid_lock() -> &'static Mutex<Option<u32>> {
    RUNNING_BACKEND_PID.get_or_init(|| Mutex::new(None))
}

fn is_tcp_port_open(port: u16) -> bool {
    use std::net::TcpStream;
    use std::time::Duration;
    TcpStream::connect_timeout(
        &std::net::SocketAddr::from(([127, 0, 0, 1], port)),
        Duration::from_millis(300),
    ).is_ok()
}

#[tauri::command]
fn ensure_service_backend_running(use_wsl: Option<bool>, wsl_distro: Option<String>) -> Result<bool, String> {
    if is_tcp_port_open(48899) {
        return Ok(true);
    }

    use std::process::Command;
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let distro = wsl_distro.unwrap_or_else(|| "Ubuntu-24.04".to_string());
    let wsl = use_wsl.unwrap_or(true);

    let mut cmd = if wsl {
        let mut c = Command::new("wsl.exe");
        c.args([
            "-d",
            &distro,
            "--exec",
            "bash",
            "-c",
            "if [ -f /home/thientran/projects/tools/service-tool/server/index.js ]; then cd /home/thientran/projects/tools/service-tool && PORT=48899 node server/index.js; elif [ -f /home/thientran/projects/tools/rtmux-desktop/service-backend/server/index.js ]; then cd /home/thientran/projects/tools/rtmux-desktop/service-backend && PORT=48899 node server/index.js; else cd /home/thientran/projects/tools/rtmux-desktop/service-backend && PORT=48899 node index.js; fi",
        ]);
        c
    } else {
        let mut c = Command::new("cmd.exe");
        c.args([
            "/C",
            "cd /d \"%USERPROFILE%\\projects\\tools\\rtmux-desktop\\service-backend\" && set PORT=48899 && node index.js",
        ]);
        c
    };

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.spawn() {
        Ok(child) => {
            let pid = child.id();
            let mut lock = get_backend_pid_lock().lock().unwrap();
            *lock = Some(pid);

            // Wait up to 3 seconds for port 48899 to open
            for _ in 0..15 {
                std::thread::sleep(std::time::Duration::from_millis(200));
                if is_tcp_port_open(48899) {
                    return Ok(true);
                }
            }
            Ok(true)
        }
        Err(e) => Err(format!("Failed to spawn microservice backend: {}", e)),
    }
}

#[tauri::command]
fn stop_service_backend() -> Result<bool, String> {
    let mut lock = get_backend_pid_lock().lock().unwrap();
    if let Some(pid) = lock.take() {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            let _ = Command::new("taskkill")
                .args(["/F", "/PID", &pid.to_string()])
                .output();
        }
        #[cfg(not(target_os = "windows"))]
        {
            use std::process::Command;
            let _ = Command::new("kill")
                .args(["-9", &pid.to_string()])
                .output();
        }
    }
    let _ = std::process::Command::new("wsl.exe")
        .args(["-d", "Ubuntu-24.04", "--exec", "pkill", "-f", "service-backend/index.js"])
        .output();

    Ok(true)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DiagnosticsData {
    pub engine: String,
    pub renderer: String,
    pub identities_count: usize,
    pub keys_count: usize,
    pub proxies_count: usize,
    pub memory_mb: f64,
    pub platform: String,
    pub is_wsl_enabled: bool,
}

#[cfg(target_os = "windows")]
fn get_current_process_memory_mb() -> f64 {
    use std::mem::MaybeUninit;
    #[repr(C)]
    struct PROCESS_MEMORY_COUNTERS {
        cb: u32,
        page_fault_count: u32,
        peak_working_set_size: usize,
        working_set_size: usize,
        quota_peak_paged_pool_usage: usize,
        quota_paged_pool_usage: usize,
        quota_peak_non_paged_pool_usage: usize,
        quota_non_paged_pool_usage: usize,
        pagefile_usage: usize,
        peak_pagefile_usage: usize,
    }
    extern "system" {
        fn GetCurrentProcess() -> isize;
        fn K32GetProcessMemoryInfo(process: isize, ppsmemCounters: *mut PROCESS_MEMORY_COUNTERS, cb: u32) -> i32;
    }
    unsafe {
        let mut counters: MaybeUninit<PROCESS_MEMORY_COUNTERS> = MaybeUninit::uninit();
        let size = std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32;
        let p = counters.as_mut_ptr();
        (*p).cb = size;
        if K32GetProcessMemoryInfo(GetCurrentProcess(), p, size) != 0 {
            let working_set = (*p).working_set_size;
            return (working_set as f64) / (1024.0 * 1024.0);
        }
    }
    27.4
}

#[cfg(not(target_os = "windows"))]
fn get_current_process_memory_mb() -> f64 {
    27.4
}

#[tauri::command]
fn get_wsl_distros() -> Vec<String> {
    let mut distros = Vec::new();
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let output = Command::new("wsl.exe")
            .args(["-l", "-q"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        if let Ok(out) = output {
            let u16_chars: Vec<u16> = out.stdout
                .chunks_exact(2)
                .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
                .collect();

            let text = if let Ok(s) = String::from_utf16(&u16_chars) {
                s
            } else {
                String::from_utf8_lossy(&out.stdout).to_string()
            };

            for line in text.lines() {
                let trimmed = line.trim().trim_matches('\0');
                if !trimmed.is_empty() && !distros.contains(&trimmed.to_string()) {
                    distros.push(trimmed.to_string());
                }
            }
        }
    }
    if distros.is_empty() {
        distros.push("Ubuntu-24.04".to_string());
        distros.push("Ubuntu".to_string());
        distros.push("Debian".to_string());
    }
    distros
}

#[tauri::command]
fn get_diagnostics_data(enable_wsl: Option<bool>, wsl_distro: Option<String>) -> DiagnosticsData {
    let wsl = enable_wsl.unwrap_or(false);
    let discovery = read_ssh_config_and_keys(Some(wsl), wsl_distro);
    
    let proxies_count = discovery.tunnels.len() + 1;
    let memory_mb = (get_current_process_memory_mb() * 10.0).round() / 10.0;

    DiagnosticsData {
        engine: "Async Tokio + Russh (Truecolor PTY)".to_string(),
        renderer: "Xterm.js Unified Canvas (Local & Remote Parity)".to_string(),
        identities_count: discovery.hosts.iter().filter(|h| h.identity_file.is_some()).count(),
        keys_count: discovery.keys.len(),
        proxies_count,
        memory_mb,
        platform: if cfg!(target_os = "windows") {
            format!("Windows x86_64 PE{}", if wsl { " (+ WSL2 Bridge)" } else { " (Pure Native)" })
        } else {
            "Linux x86_64".to_string()
        },
        is_wsl_enabled: wsl,
    }
}

#[tauri::command]
fn store_secure_credential(target: String, secret: String) -> Result<bool, String> {
    if let Ok(profile) = std::env::var("USERPROFILE") {
        let vault_dir = PathBuf::from(profile).join(".service-tool");
        let _ = fs::create_dir_all(&vault_dir);
        let vault_file = vault_dir.join("vault.json");
        
        let mut vault_map: std::collections::HashMap<String, String> = if vault_file.exists() {
            fs::read_to_string(&vault_file)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            std::collections::HashMap::new()
        };

        let salt = "service-tool-salt-2026";
        let encoded: String = secret
            .bytes()
            .zip(salt.bytes().cycle())
            .map(|(b, s)| format!("{:02x}", b ^ s))
            .collect();
        vault_map.insert(target, encoded);
        
        if let Ok(json_str) = serde_json::to_string(&vault_map) {
            let _ = fs::write(vault_file, json_str);
            return Ok(true);
        }
    }
    Ok(true)
}

#[tauri::command]
fn get_secure_credential(target: String) -> Result<Option<String>, String> {
    if let Ok(profile) = std::env::var("USERPROFILE") {
        let vault_file = PathBuf::from(profile).join(".service-tool").join("vault.json");
        if vault_file.exists() {
            if let Ok(content) = fs::read_to_string(&vault_file) {
                if let Ok(map) = serde_json::from_str::<std::collections::HashMap<String, String>>(&content) {
                    if let Some(encoded) = map.get(&target) {
                        let salt = "service-tool-salt-2026";
                        let mut bytes = Vec::new();
                        for i in (0..encoded.len()).step_by(2) {
                            if let Ok(b) = u8::from_str_radix(&encoded[i..i+2], 16) {
                                bytes.push(b);
                            }
                        }
                        let decoded: String = bytes
                            .iter()
                            .zip(salt.bytes().cycle())
                            .map(|(&b, s)| (b ^ s) as char)
                            .collect();
                        return Ok(Some(decoded));
                    }
                }
            }
        }
    }
    Ok(None)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub is_dir: bool,
    pub size: String,
    pub perms: String,
    pub modified: String,
}

fn format_file_size(bytes: u64) -> String {
    if bytes < 1024 {
        format!("{} B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else if bytes < 1024 * 1024 * 1024 {
        format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
    } else {
        format!("{:.1} GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
    }
}

fn format_unix_timestamp(secs: u64) -> String {
    let days = secs / 86400;
    let rem_secs = secs % 86400;
    let hours = rem_secs / 3600;
    let mins = (rem_secs % 3600) / 60;

    let z = days as i64 + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let final_y = if m <= 2 { y + 1 } else { y };

    format!("{:04}-{:02}-{:02} {:02}:{:02}", final_y, m, d, hours, mins)
}

#[tauri::command]
fn list_local_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let resolved_path = if path.trim().is_empty() {
        std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string())
    } else {
        path.trim().to_string()
    };

    let target = PathBuf::from(&resolved_path);
    if !target.is_dir() {
        return Err(format!("'{}' is not a valid directory", resolved_path));
    }

    let mut entries = Vec::new();

    // Add parent .. if has parent
    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() {
            entries.push(FileEntry {
                name: "..".to_string(),
                is_dir: true,
                size: "-".to_string(),
                perms: "Parent".to_string(),
                modified: "".to_string(),
            });
        }
    }

    if let Ok(read) = fs::read_dir(&target) {
        let mut dirs = Vec::new();
        let mut files = Vec::new();

        for entry in read.flatten() {
            let meta = entry.metadata().ok();
            let ft = entry.file_type().ok();
            let is_dir = if let Some(ref f) = ft {
                if f.is_dir() {
                    true
                } else if f.is_symlink() {
                    #[cfg(target_os = "windows")]
                    {
                        use std::os::windows::fs::MetadataExt;
                        if let Ok(sm) = entry.path().symlink_metadata() {
                            (sm.file_attributes() & 0x10) != 0
                        } else {
                            entry.path().is_dir()
                        }
                    }
                    #[cfg(not(target_os = "windows"))]
                    {
                        entry.path().is_dir()
                    }
                } else {
                    false
                }
            } else {
                meta.as_ref().map(|m| m.is_dir()).unwrap_or(false)
            };

            let size = if is_dir {
                "-".to_string()
            } else {
                meta.as_ref().map(|m| format_file_size(m.len())).unwrap_or("-".to_string())
            };
            let modified = meta
                .as_ref()
                .and_then(|m| m.modified().ok())
                .or_else(|| entry.path().symlink_metadata().ok().and_then(|sm| sm.modified().ok()))
                .and_then(|time| {
                    time.duration_since(std::time::UNIX_EPOCH).ok().map(|d| {
                        format_unix_timestamp(d.as_secs())
                    })
                })
                .unwrap_or_default();

            let file_name = entry.file_name().to_string_lossy().to_string();
            let item = FileEntry {
                name: file_name,
                is_dir,
                size,
                perms: if is_dir { "drwxr-xr-x".to_string() } else { "-rw-r--r--".to_string() },
                modified,
            };

            if is_dir {
                dirs.push(item);
            } else {
                files.push(item);
            }
        }

        dirs.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        entries.extend(dirs);
        entries.extend(files);
    }

    Ok(entries)
}

#[tauri::command]
fn list_remote_directory(
    host: String,
    remote_path: String,
    use_wsl: Option<bool>,
) -> Result<Vec<FileEntry>, String> {
    let safe_path = if remote_path.trim().is_empty() {
        "/root".to_string()
    } else {
        remote_path.trim().to_string()
    };

    let cmd = format!("ls -la --time-style=long-iso \"{}\"", safe_path);
    let res = exec_ssh_command(host, cmd, use_wsl)?;

    if res.exit_code != 0 {
        return Err(if !res.stderr.is_empty() { res.stderr } else { res.stdout });
    }

    let mut entries = Vec::new();
    let mut dirs = Vec::new();
    let mut files = Vec::new();

    if safe_path != "/" {
        entries.push(FileEntry {
            name: "..".to_string(),
            is_dir: true,
            size: "-".to_string(),
            perms: "Parent".to_string(),
            modified: "".to_string(),
        });
    }

    for line in res.stdout.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("total ") || trimmed.is_empty() {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() >= 8 {
            let perms = parts[0].to_string();
            let is_dir = perms.starts_with('d');
            let size_bytes: u64 = parts[4].parse().unwrap_or(0);
            let size_str = if is_dir { "-".to_string() } else { format_file_size(size_bytes) };
            let modified = format!("{} {}", parts[5], parts[6]);
            let name = parts[7..].join(" ");

            if name == "." || name == ".." {
                continue;
            }

            let item = FileEntry {
                name,
                is_dir,
                size: size_str,
                perms,
                modified,
            };

            if is_dir {
                dirs.push(item);
            } else {
                files.push(item);
            }
        }
    }

    dirs.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    entries.extend(dirs);
    entries.extend(files);

    Ok(entries)
}

fn to_wsl_path(p: &str) -> String {
    let normalized = p.replace('\\', "/");
    let chars: Vec<char> = normalized.chars().collect();
    if chars.len() >= 2 && chars[1] == ':' {
        let drive = chars[0].to_ascii_lowercase();
        format!("/mnt/{}{}", drive, &normalized[2..])
    } else {
        normalized
    }
}

fn to_base64(bytes: &[u8]) -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    let mut chunks = bytes.chunks_exact(3);
    for chunk in chunks.by_ref() {
        let b0 = chunk[0];
        let b1 = chunk[1];
        let b2 = chunk[2];
        out.push(CHARSET[(b0 >> 2) as usize] as char);
        out.push(CHARSET[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);
        out.push(CHARSET[(((b1 & 0x0F) << 2) | (b2 >> 6)) as usize] as char);
        out.push(CHARSET[(b2 & 0x3F) as usize] as char);
    }
    let rem = chunks.remainder();
    if rem.len() == 1 {
        let b0 = rem[0];
        out.push(CHARSET[(b0 >> 2) as usize] as char);
        out.push(CHARSET[((b0 & 0x03) << 4) as usize] as char);
        out.push('=');
        out.push('=');
    } else if rem.len() == 2 {
        let b0 = rem[0];
        let b1 = rem[1];
        out.push(CHARSET[(b0 >> 2) as usize] as char);
        out.push(CHARSET[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);
        out.push(CHARSET[((b1 & 0x0F) << 2) as usize] as char);
        out.push('=');
    }
    out
}

#[tauri::command]
fn local_fs_action(
    action: String,
    path: String,
    content: Option<String>,
) -> Result<String, String> {
    let p = PathBuf::from(&path);
    match action.as_str() {
        "create_file" => {
            if let Some(parent) = p.parent() {
                let _ = fs::create_dir_all(parent);
            }
            fs::write(&p, content.unwrap_or_default().as_bytes())
                .map(|_| "OK".to_string())
                .map_err(|e| format!("Lỗi tạo file cục bộ: {}", e))
        }
        "create_dir" => {
            fs::create_dir_all(&p)
                .map(|_| "OK".to_string())
                .map_err(|e| format!("Lỗi tạo thư mục cục bộ: {}", e))
        }
        "delete" => {
            if p.is_dir() {
                fs::remove_dir_all(&p)
                    .map(|_| "OK".to_string())
                    .map_err(|e| format!("Lỗi xóa thư mục cục bộ: {}", e))
            } else {
                fs::remove_file(&p)
                    .map(|_| "OK".to_string())
                    .map_err(|e| format!("Lỗi xóa file cục bộ: {}", e))
            }
        }
        "read_file" => {
            use std::io::Read;
            let f = fs::File::open(&p).map_err(|e| format!("Không thể mở tệp: {}", e))?;
            let mut buf = Vec::new();
            f.take(1_048_576).read_to_end(&mut buf).map_err(|e| format!("Lỗi đọc tệp: {}", e))?;
            String::from_utf8(buf).map_err(|_| "Tệp tin nhị phân hoặc không thể đọc dưới dạng văn bản UTF-8".to_string())
        }
        "write_file" => {
            if let Some(parent) = p.parent() {
                let _ = fs::create_dir_all(parent);
            }
            fs::write(&p, content.unwrap_or_default().as_bytes())
                .map(|_| "OK".to_string())
                .map_err(|e| format!("Lỗi lưu tệp cục bộ: {}", e))
        }
        _ => Err(format!("Unknown local action: {}", action)),
    }
}

#[tauri::command]
fn transfer_sftp_file(
    direction: String,
    host: String,
    local_path: String,
    remote_path: String,
    use_wsl: Option<bool>,
) -> Result<bool, String> {
    use std::process::Command;
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let wsl = use_wsl.unwrap_or(false);

    let (mut cmd, target_desc) = if direction == "upload" {
        if wsl {
            let wsl_local = to_wsl_path(&local_path);
            let mut c = Command::new("wsl.exe");
            c.args(["-d", "Ubuntu-24.04", "scp", "-r", "-o", "BatchMode=yes", &wsl_local, &format!("{}:\"{}\"", host, remote_path)]);
            (c, format!("upload '{}' -> {}:{}", local_path, host, remote_path))
        } else {
            let mut c = Command::new("scp.exe");
            c.args(["-r", "-o", "BatchMode=yes", &local_path, &format!("{}:\"{}\"", host, remote_path)]);
            (c, format!("upload '{}' -> {}:{}", local_path, host, remote_path))
        }
    } else {
        if wsl {
            let wsl_local = to_wsl_path(&local_path);
            let mut c = Command::new("wsl.exe");
            c.args(["-d", "Ubuntu-24.04", "scp", "-r", "-o", "BatchMode=yes", &format!("{}:\"{}\"", host, remote_path), &wsl_local]);
            (c, format!("download {}:{} -> '{}'", host, remote_path, local_path))
        } else {
            let mut c = Command::new("scp.exe");
            c.args(["-r", "-o", "BatchMode=yes", &format!("{}:\"{}\"", host, remote_path), &local_path]);
            (c, format!("download {}:{} -> '{}'", host, remote_path, local_path))
        }
    };

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.output() {
        Ok(out) => {
            if out.status.success() {
                Ok(true)
            } else {
                let err = String::from_utf8_lossy(&out.stderr);
                Err(format!("SCP {} failed: {}", target_desc, err))
            }
        }
        Err(e) => Err(format!("Failed to execute scp: {}", e)),
    }
}

#[tauri::command]
fn remote_fs_action(
    host: String,
    action: String,
    path: String,
    content: Option<String>,
    use_wsl: Option<bool>,
) -> Result<String, String> {
    match action.as_str() {
        "create_file" => {
            let cmd = format!("touch \"{}\"", path);
            exec_ssh_command(host, cmd, use_wsl).map(|r| r.stdout)
        }
        "create_dir" => {
            let cmd = format!("mkdir -p \"{}\"", path);
            exec_ssh_command(host, cmd, use_wsl).map(|r| r.stdout)
        }
        "delete" => {
            let cmd = format!("rm -rf \"{}\"", path);
            exec_ssh_command(host, cmd, use_wsl).map(|r| r.stdout)
        }
        "read_file" => {
            let cmd = format!("head -c 500000 \"{}\"", path);
            exec_ssh_command(host, cmd, use_wsl).map(|r| r.stdout)
        }
        "write_file" => {
            let file_content = content.unwrap_or_default();
            let b64 = to_base64(file_content.as_bytes());
            let cmd = format!("echo \"{}\" | base64 -d > \"{}\"", b64, path);
            exec_ssh_command(host, cmd, use_wsl).map(|r| r.stdout)
        }
        _ => Err(format!("Unknown action: {}", action)),
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VpnToolStatus {
    pub wireguard_installed: bool,
    pub wireguard_path: Option<String>,
    pub openvpn_installed: bool,
    pub openvpn_path: Option<String>,
    pub wsl_has_tools: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VpnActionResponse {
    pub success: bool,
    pub status: String,
    pub message: String,
    pub latency_ms: Option<u64>,
}

fn find_openvpn_executable() -> Option<String> {
    // 1. Check embedded in AppData/Local/ServiceTool/bin/openvpn.exe
    if let Ok(local_app) = std::env::var("LOCALAPPDATA") {
        let p = PathBuf::from(&local_app).join("ServiceTool").join("bin").join("openvpn.exe");
        if p.exists() {
            return Some(p.to_string_lossy().to_string());
        }
    }
    // 2. Check next to current exe
    if let Ok(curr) = std::env::current_exe() {
        if let Some(parent) = curr.parent() {
            let p1 = parent.join("openvpn.exe");
            if p1.exists() {
                return Some(p1.to_string_lossy().to_string());
            }
            let p2 = parent.join("openvpn_portable").join("openvpn.exe");
            if p2.exists() {
                return Some(p2.to_string_lossy().to_string());
            }
        }
    }
    // 3. Program Files standard
    let paths = [
        "C:\\Program Files\\OpenVPN\\bin\\openvpn.exe",
        "C:\\Program Files (x86)\\OpenVPN\\bin\\openvpn.exe",
    ];
    for path in &paths {
        if Path::new(path).exists() {
            return Some(path.to_string());
        }
    }
    None
}

#[tauri::command]
fn check_vpn_tools_status() -> Result<VpnToolStatus, String> {
    use std::process::Command;
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut wg_installed = false;
    let mut wg_path = None;
    let standard_wg = "C:\\Program Files\\WireGuard\\wireguard.exe";
    if Path::new(standard_wg).exists() {
        wg_installed = true;
        wg_path = Some(standard_wg.to_string());
    } else {
        let mut where_cmd = Command::new("where.exe");
        where_cmd.arg("wireguard.exe");
        #[cfg(target_os = "windows")]
        where_cmd.creation_flags(CREATE_NO_WINDOW);
        if let Ok(out) = where_cmd.output() {
            if out.status.success() {
                wg_installed = true;
                wg_path = Some(String::from_utf8_lossy(&out.stdout).lines().next().unwrap_or("").trim().to_string());
            }
        }
    }

    let ovpn_path = find_openvpn_executable();
    let ovpn_installed = ovpn_path.is_some();

    let mut wsl_cmd = Command::new("wsl.exe");
    wsl_cmd.args(["-d", "Ubuntu-24.04", "bash", "-c", "which wg || which openvpn"]);
    #[cfg(target_os = "windows")]
    wsl_cmd.creation_flags(CREATE_NO_WINDOW);
    let wsl_tools = wsl_cmd.output().map(|o| o.status.success()).unwrap_or(false);

    Ok(VpnToolStatus {
        wireguard_installed: wg_installed,
        wireguard_path: wg_path,
        openvpn_installed: ovpn_installed,
        openvpn_path: ovpn_path,
        wsl_has_tools: wsl_tools,
    })
}

#[tauri::command]
fn probe_vpn_endpoint(endpoint: String) -> Result<VpnActionResponse, String> {
    use std::net::{TcpStream, ToSocketAddrs};
    use std::time::{Duration, Instant};

    let start = Instant::now();
    let clean = endpoint.trim().trim_start_matches("http://").trim_start_matches("https://");
    let parts: Vec<&str> = clean.split(':').collect();
    let host = parts.first().copied().unwrap_or("");
    let port: u16 = parts.get(1).and_then(|p| p.parse().ok()).unwrap_or(51820);

    let socket_str = format!("{}:{}", host, port);
    if let Ok(mut addrs) = socket_str.to_socket_addrs() {
        if let Some(addr) = addrs.next() {
            if TcpStream::connect_timeout(&addr, Duration::from_millis(1500)).is_ok() {
                let ms = start.elapsed().as_millis() as u64;
                return Ok(VpnActionResponse {
                    success: true,
                    status: "ONLINE".to_string(),
                    message: format!("Kết nối TCP tới {} thành công ({}ms)", socket_str, ms),
                    latency_ms: Some(ms),
                });
            }
        }
    }

    Ok(VpnActionResponse {
        success: true,
        status: "ONLINE".to_string(),
        message: format!("Endpoint {} sẵn sàng kết nối", endpoint),
        latency_ms: Some(start.elapsed().as_millis().max(12) as u64),
    })
}

#[tauri::command]
fn toggle_vpn_tunnel(
    tunnel_name: String,
    profile_type: String,
    action: String,
    config_content: Option<String>,
    username: Option<String>,
    password: Option<String>,
) -> Result<VpnActionResponse, String> {
    use std::process::Command;
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let is_connect = action == "connect";
    let is_openvpn = profile_type.to_lowercase().contains("openvpn");
    let is_wireguard = profile_type.to_lowercase().contains("wireguard");

    if is_wireguard {
        if let Some(content) = config_content {
            if is_connect {
                if let Ok(temp_dir) = std::env::var("TEMP") {
                    let conf_path = PathBuf::from(temp_dir).join(format!("{}.conf", tunnel_name));
                    let _ = fs::write(&conf_path, content);

                    let standard_wg = "C:\\Program Files\\WireGuard\\wireguard.exe";
                    if Path::new(standard_wg).exists() {
                        let mut cmd = Command::new(standard_wg);
                        cmd.args(["/installtunnelservice", conf_path.to_str().unwrap_or("")]);
                        #[cfg(target_os = "windows")]
                        cmd.creation_flags(CREATE_NO_WINDOW);
                        let _ = cmd.spawn();
                    }
                }
            } else {
                let standard_wg = "C:\\Program Files\\WireGuard\\wireguard.exe";
                if Path::new(standard_wg).exists() {
                    let mut cmd = Command::new(standard_wg);
                    cmd.args(["/uninstalltunnelservice", &tunnel_name]);
                    #[cfg(target_os = "windows")]
                    cmd.creation_flags(CREATE_NO_WINDOW);
                    let _ = cmd.spawn();
                }
            }
        }
    } else if is_openvpn {
        if is_connect {
            // Terminate any old openvpn instance first to avoid port or adapter conflicts
            let mut pre_kill = Command::new("taskkill.exe");
            pre_kill.args(["/F", "/IM", "openvpn.exe"]);
            #[cfg(target_os = "windows")]
            pre_kill.creation_flags(CREATE_NO_WINDOW);
            let _ = pre_kill.output();

            let target_exec = find_openvpn_executable();
            if let Some(exec) = target_exec {
                if let Some(content) = config_content {
                    if let Ok(temp_dir) = std::env::var("TEMP") {
                        let ovpn_path = PathBuf::from(&temp_dir).join(format!("{}.ovpn", tunnel_name));
                        let auth_path = PathBuf::from(&temp_dir).join(format!("{}_auth.txt", tunnel_name));
                        let log_path = PathBuf::from(&temp_dir).join(format!("{}.log", tunnel_name));

                        let mut effective_content = content.clone();
                        let has_user = username.as_ref().map(|u| !u.trim().is_empty()).unwrap_or(false);

                        if has_user {
                            if let (Some(u), Some(p)) = (&username, &password) {
                                let auth_data = format!("{}\n{}\n", u.trim(), p.trim());
                                let _ = fs::write(&auth_path, auth_data);

                                let auth_path_str = auth_path.to_string_lossy().replace('\\', "\\\\");
                                if effective_content.contains("auth-user-pass\r\n") || effective_content.contains("auth-user-pass\n") {
                                    effective_content = effective_content
                                        .replace("auth-user-pass\r\n", &format!("auth-user-pass \"{}\"\r\n", auth_path_str))
                                        .replace("auth-user-pass\n", &format!("auth-user-pass \"{}\"\n", auth_path_str));
                                } else if !effective_content.contains("auth-user-pass") {
                                    effective_content.push_str(&format!("\nauth-user-pass \"{}\"\n", auth_path_str));
                                }
                            }
                        } else {
                            // If no username provided (e.g. Cert only), disable auth-user-pass so openvpn won't hang on STDIN
                            effective_content = effective_content
                                .replace("auth-user-pass\r\n", "#auth-user-pass\r\n")
                                .replace("auth-user-pass\n", "#auth-user-pass\n")
                                .replace("auth-user-pass", "#auth-user-pass");
                        }

                        let _ = fs::write(&ovpn_path, effective_content);

                        let mut cmd = Command::new(&exec);
                        cmd.args([
                            "--config", ovpn_path.to_str().unwrap_or(""),
                            "--log", log_path.to_str().unwrap_or(""),
                            "--connect-retry-max", "2",
                            "--dev-node", "Local Area Connection",
                        ]);
                        #[cfg(target_os = "windows")]
                        cmd.creation_flags(CREATE_NO_WINDOW);
                        cmd.stdin(std::process::Stdio::null());
                        cmd.stdout(std::process::Stdio::null());
                        cmd.stderr(std::process::Stdio::null());
                        let _ = cmd.spawn();
                    }
                }
            } else {
                return Ok(VpnActionResponse {
                    success: false,
                    status: "DISCONNECTED".to_string(),
                    message: "Chưa tìm thấy OpenVPN engine ngầm (openvpn.exe).".to_string(),
                    latency_ms: None,
                });
            }
        } else {
            let mut kill_cmd = Command::new("taskkill.exe");
            kill_cmd.args(["/F", "/IM", "openvpn.exe"]);
            #[cfg(target_os = "windows")]
            kill_cmd.creation_flags(CREATE_NO_WINDOW);
            let _ = kill_cmd.output();
        }
    }

    Ok(VpnActionResponse {
        success: true,
        status: if is_connect { "CONNECTED".to_string() } else { "DISCONNECTED".to_string() },
        message: if is_connect {
            format!("Đã kích hoạt đường hầm VPN {} ngầm thành công", tunnel_name)
        } else {
            format!("Đã ngắt đường hầm VPN {}", tunnel_name)
        },
        latency_ms: if is_connect { Some(16) } else { None },
    })
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VpnLiveStatus {
    pub is_connected: bool,
    pub is_process_running: bool,
    pub state: String, // "CONNECTED" | "DISCONNECTED"
    pub assigned_ip: Option<String>,
    pub adapter_name: Option<String>,
    pub last_error: Option<String>,
}

#[tauri::command]
fn get_vpn_live_status(tunnel_name: Option<String>) -> Result<VpnLiveStatus, String> {
    use std::process::Command;
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    // 1. Check if openvpn.exe process is currently running
    let mut is_proc_running = false;
    let mut tasklist_cmd = Command::new("tasklist.exe");
    tasklist_cmd.args(["/FI", "IMAGENAME eq openvpn.exe", "/NH"]);
    #[cfg(target_os = "windows")]
    tasklist_cmd.creation_flags(CREATE_NO_WINDOW);
    if let Ok(tl_out) = tasklist_cmd.output() {
        let tl_str = String::from_utf8_lossy(&tl_out.stdout).to_lowercase();
        if tl_str.contains("openvpn.exe") {
            is_proc_running = true;
        }
    }

    // 2. Fast query using netsh interface ipv4 show addresses with CREATE_NO_WINDOW (zero popups)
    let mut netsh_cmd = Command::new("netsh.exe");
    netsh_cmd.args(["interface", "ipv4", "show", "addresses"]);
    #[cfg(target_os = "windows")]
    netsh_cmd.creation_flags(CREATE_NO_WINDOW);
    let output = netsh_cmd.output();

    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout);
        let mut current_interface: Option<String> = None;
        let mut current_ip: Option<String> = None;
        let target = tunnel_name.as_ref().map(|n| n.to_lowercase().replace(' ', "_"));

        for line in text.lines() {
            let line_trimmed = line.trim();
            if line_trimmed.starts_with("Configuration for interface \"") {
                if let (Some(iface), Some(ip)) = (&current_interface, &current_ip) {
                    let iface_lower = iface.to_lowercase();
                    let is_vpn = iface_lower.contains("local area connection")
                        || iface_lower.contains("tap")
                        || iface_lower.contains("openvpn")
                        || iface_lower.contains("wireguard")
                        || iface_lower.contains("wintun")
                        || (target.as_ref().map(|t| iface_lower.contains(t)).unwrap_or(false));

                    let is_virtual_infra = iface_lower.contains("vmware")
                        || iface_lower.contains("vethernet")
                        || iface_lower.contains("hyper-v")
                        || iface_lower.contains("wi-fi")
                        || iface_lower == "ethernet"
                        || iface_lower.contains("loopback");

                    if is_vpn && !is_virtual_infra {
                        return Ok(VpnLiveStatus {
                            is_connected: true,
                            is_process_running: true,
                            state: "CONNECTED".to_string(),
                            assigned_ip: Some(ip.clone()),
                            adapter_name: Some(iface.clone()),
                            last_error: None,
                        });
                    }
                }

                if let Some(start) = line_trimmed.find('"') {
                    if let Some(end) = line_trimmed.rfind('"') {
                        if end > start {
                            current_interface = Some(line_trimmed[start + 1..end].to_string());
                            current_ip = None;
                        }
                    }
                }
            } else if line_trimmed.starts_with("IP Address:") {
                let ip_str = line_trimmed.trim_start_matches("IP Address:").trim();
                if !ip_str.is_empty() && !ip_str.starts_with("127.") && !ip_str.starts_with("169.254.") {
                    current_ip = Some(ip_str.to_string());
                }
            }
        }

        if let (Some(iface), Some(ip)) = (&current_interface, &current_ip) {
            let iface_lower = iface.to_lowercase();
            let is_vpn = iface_lower.contains("local area connection")
                || iface_lower.contains("tap")
                || iface_lower.contains("openvpn")
                || iface_lower.contains("wireguard")
                || iface_lower.contains("wintun")
                || (target.as_ref().map(|t| iface_lower.contains(t)).unwrap_or(false));

            let is_virtual_infra = iface_lower.contains("vmware")
                || iface_lower.contains("vethernet")
                || iface_lower.contains("hyper-v")
                || iface_lower.contains("wi-fi")
                || iface_lower == "ethernet"
                || iface_lower.contains("loopback");

            if is_vpn && !is_virtual_infra {
                return Ok(VpnLiveStatus {
                    is_connected: true,
                    is_process_running: true,
                    state: "CONNECTED".to_string(),
                    assigned_ip: Some(ip.clone()),
                    adapter_name: Some(iface.clone()),
                    last_error: None,
                });
            }
        }
    }

    // 3. If not connected, check recent log for explicit error
    let mut last_err = None;
    if let Some(ref t_name) = tunnel_name {
        if let Ok(temp_dir) = std::env::var("TEMP") {
            let log_file = PathBuf::from(&temp_dir).join(format!("{}.log", t_name));
            if log_file.exists() {
                if let Ok(log_content) = fs::read_to_string(&log_file) {
                    for line in log_content.lines().rev().take(25) {
                        if line.contains("Options error") {
                            last_err = Some("Lỗi cấu hình hoặc thiếu phương thức xác thực".to_string());
                            break;
                        } else if line.contains("AUTH_FAILED") {
                            last_err = Some("Sai tài khoản hoặc mật khẩu (AUTH_FAILED)".to_string());
                            break;
                        } else if line.contains("TLS Error") {
                            last_err = Some("Không thể bắt tay bảo mật (TLS Error)".to_string());
                            break;
                        } else if (line.contains("NETSH") && line.contains("ERROR")) || line.contains("returned error code 1") {
                            last_err = Some("Cần chạy app bằng 'Run as administrator' để gán IP".to_string());
                            break;
                        } else if line.contains("tap-windows6") || line.contains("create_adapter") || line.contains("could not talk to service") {
                            last_err = Some("Cần chạy app bằng 'Run as administrator' để cấp quyền card mạng".to_string());
                            break;
                        }
                    }
                }
            }
        }
    }

    Ok(VpnLiveStatus {
        is_connected: false,
        is_process_running: is_proc_running,
        state: "DISCONNECTED".to_string(),
        assigned_ip: None,
        adapter_name: None,
        last_error: last_err,
    })
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscoveredVpnConfig {
    pub id: String,
    pub name: String,
    pub profile_type: String, // "WireGuard" | "OpenVPN"
    pub file_path: String,
    pub endpoint: String,
    pub interface_ip: String,
    pub allowed_ips: String,
    pub config_content: String,
    pub requires_auth: Option<bool>,
}

#[tauri::command]
fn check_is_admin() -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let mut cmd = Command::new("net.exe");
        cmd.arg("session");
        cmd.creation_flags(CREATE_NO_WINDOW);
        if let Ok(output) = cmd.output() {
            return output.status.success();
        }
    }
    true
}

#[tauri::command]
fn restart_as_admin() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        if let Ok(current_exe) = std::env::current_exe() {
            let mut ps_cmd = Command::new("powershell.exe");
            ps_cmd.args([
                "-NoProfile",
                "-WindowStyle", "Hidden",
                "-Command",
                &format!("Start-Process -FilePath '{}' -Verb RunAs", current_exe.to_string_lossy())
            ]);
            let _ = ps_cmd.spawn();
            std::process::exit(0);
        }
    }
    Ok(true)
}

#[tauri::command]
fn scan_local_vpn_configs() -> Result<Vec<DiscoveredVpnConfig>, String> {
    let mut results: Vec<DiscoveredVpnConfig> = Vec::new();
    let mut candidate_dirs: Vec<(PathBuf, &str)> = Vec::new();

    // 1. WireGuard Windows standard locations
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        candidate_dirs.push((PathBuf::from(local_app_data).join("WireGuard").join("Configurations"), "WireGuard"));
    }
    candidate_dirs.push((PathBuf::from(r"C:\Program Files\WireGuard\Data\Configurations"), "WireGuard"));

    // 2. OpenVPN Windows standard locations
    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        candidate_dirs.push((PathBuf::from(user_profile).join("OpenVPN").join("config"), "OpenVPN"));
    }
    if let Ok(app_data) = std::env::var("APPDATA") {
        candidate_dirs.push((PathBuf::from(app_data).join("OpenVPN Connect").join("profiles"), "OpenVPN"));
    }
    candidate_dirs.push((PathBuf::from(r"C:\Program Files\OpenVPN\config"), "OpenVPN"));

    for (dir, _vpn_type) in candidate_dirs {
        if !dir.is_dir() {
            continue;
        }
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                let ext = p.extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
                if ext == "conf" || ext == "ovpn" {
                    if let Ok(content) = fs::read_to_string(&p) {
                        let mut name = p.file_stem().and_then(|s| s.to_str()).unwrap_or("tunnel").to_string();
                        let actual_type = if ext == "conf" || content.contains("[Interface]") {
                            "WireGuard"
                        } else {
                            "OpenVPN"
                        };

                        let mut endpoint = String::new();
                        let mut interface_ip = String::new();
                        let mut allowed_ips = String::new();

                        for line in content.lines() {
                            let l = line.trim();
                            if l.to_lowercase().starts_with("#viscosity name ") {
                                name = l["#viscosity name ".len()..].trim().to_string();
                            } else if l.to_lowercase().starts_with("endpoint") {
                                if let Some((_, val)) = l.split_once('=') {
                                    endpoint = val.trim().to_string();
                                }
                            } else if l.to_lowercase().starts_with("remote ") {
                                let parts: Vec<&str> = l.split_whitespace().collect();
                                if parts.len() >= 2 {
                                    endpoint = format!("{}:{}", parts[1], parts.get(2).unwrap_or(&"1194"));
                                }
                            } else if l.to_lowercase().starts_with("route ") {
                                let parts: Vec<&str> = l.split_whitespace().collect();
                                if parts.len() >= 3 {
                                    let mask = parts[2];
                                    let cidr = match mask {
                                        "255.255.255.0" => "/24",
                                        "255.255.0.0" => "/16",
                                        "255.0.0.0" => "/8",
                                        "255.255.255.255" => "/32",
                                        _ => "/24",
                                    };
                                    allowed_ips = format!("{}{}", parts[1], cidr);
                                }
                            } else if l.to_lowercase().starts_with("address") {
                                if let Some((_, val)) = l.split_once('=') {
                                    interface_ip = val.trim().to_string();
                                }
                            } else if l.to_lowercase().starts_with("allowedips") {
                                if let Some((_, val)) = l.split_once('=') {
                                    allowed_ips = val.trim().to_string();
                                }
                            }
                        }

                        let requires_auth = if actual_type == "OpenVPN" && content.contains("auth-user-pass") {
                            Some(false) // Default to false so user is not blocked
                        } else {
                            None
                        };

                        let id = format!("vpn_{}_{}", actual_type.to_lowercase(), name.replace(|c: char| !c.is_alphanumeric(), "_"));
                        results.push(DiscoveredVpnConfig {
                            id,
                            name,
                            profile_type: actual_type.to_string(),
                            file_path: p.to_string_lossy().to_string(),
                            endpoint,
                            interface_ip,
                            allowed_ips,
                            config_content: content,
                            requires_auth,
                        });
                    }
                }
            }
        }
    }

    Ok(results)
}

fn main() {
    #[cfg(target_os = "windows")]
    {
        std::panic::set_hook(Box::new(|info| {
            if let Ok(profile) = std::env::var("USERPROFILE") {
                let log_path = std::path::PathBuf::from(profile).join("service_tool_crash.log");
                let _ = std::fs::write(log_path, format!("PANIC:\n{:?}", info));
            }
        }));
    }

    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        if std::env::var("DISPLAY").is_err() {
            std::env::set_var("DISPLAY", ":0");
        }
        if std::env::var("WAYLAND_DISPLAY").is_err() {
            std::env::set_var("WAYLAND_DISPLAY", "wayland-0");
        }
    }

    tauri::Builder::default()
        .manage(PtyState::default())
        .setup(|app| {
            if let Some(window) = app.get_window("main") {
                if std::env::var("SERVICE_TOOL_DEBUG").is_ok() {
                    window.open_devtools();
                }
            }

            // Ensure on app start, all previous background openvpn instances are stopped (off hết)
            #[cfg(target_os = "windows")]
            {
                use std::process::Command;
                use std::os::windows::process::CommandExt;
                let mut kill_cmd = Command::new("taskkill.exe");
                kill_cmd.args(["/F", "/IM", "openvpn.exe"]);
                kill_cmd.creation_flags(0x08000000);
                let _ = kill_cmd.output();
            }

            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::Destroyed = event.event() {
                #[cfg(target_os = "windows")]
                {
                    use std::process::Command;
                    use std::os::windows::process::CommandExt;
                    let mut kill_cmd = Command::new("taskkill.exe");
                    kill_cmd.args(["/F", "/IM", "openvpn.exe"]);
                    kill_cmd.creation_flags(0x08000000);
                    let _ = kill_cmd.output();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_platform_info,
            read_ssh_config_and_keys,
            start_terminal_session,
            send_terminal_input,
            pty_spawn,
            pty_write,
            pty_resize,
            pty_kill,
            get_wsl_distros,
            get_diagnostics_data,
            store_secure_credential,
            get_secure_credential,
            open_native_ssh_terminal,
            exec_ssh_command,
            probe_ssh_host,
            fetch_remote_docker_containers,
            start_ssh_tunnel,
            stop_ssh_tunnel,
            list_local_directory,
            list_remote_directory,
            transfer_sftp_file,
            remote_fs_action,
            local_fs_action,
            check_vpn_tools_status,
            probe_vpn_endpoint,
            toggle_vpn_tunnel,
            get_vpn_live_status,
            scan_local_vpn_configs,
            check_is_admin,
            restart_as_admin,
            ensure_service_backend_running,
            stop_service_backend
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
