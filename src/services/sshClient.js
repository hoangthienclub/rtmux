// Real SSH & Terminal Client Service connecting to Tauri backend
export async function ptySpawn(opts) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('pty_spawn', opts);
  }
}

export async function ptyWrite(id, data) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('pty_write', { id: String(id), data: String(data) });
  }
}

export async function ptyResize(id, cols, rows) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('pty_resize', { id: String(id), cols: Number(cols), rows: Number(rows) });
  }
}

export async function ptyKill(id) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('pty_kill', { id: String(id) });
  }
}

export async function openNativeTerminal(host, useWsl = false) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('open_native_ssh_terminal', {
      host: String(host),
      useWsl: Boolean(useWsl)
    });
  }
  console.log('[Mock openNativeTerminal]', host);
  return true;
}

export async function execSshCommand(host, command, useWsl = false) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('exec_ssh_command', {
      host: String(host),
      command: String(command),
      useWsl: Boolean(useWsl)
    });
  }
  console.log('[Mock execSshCommand]', host, command);
  return { exit_code: 0, stdout: `Mock executed: ${command}\n`, stderr: '' };
}

export async function probeSshHost(host, useWsl = false) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('probe_ssh_host', {
      host: String(host),
      useWsl: Boolean(useWsl)
    });
  }
  return { host, reachable: true, latency_ms: 20, error: null };
}

export async function fetchRemoteDockerContainers(host, useWsl = false) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('fetch_remote_docker_containers', {
      host: String(host),
      useWsl: Boolean(useWsl)
    });
  }
  return [];
}

export async function fetchDockerImages(host, useWsl = false) {
  try {
    const cmd = "docker images --format '{{.ID}};;{{.Repository}};;{{.Tag}};;{{.Size}};;{{.CreatedAt}}'";
    const res = await execSshCommand(host, cmd, useWsl);
    if (!res || res.exit_code !== 0) return [];
    const lines = (res.stdout || '').trim().split('\n').filter(Boolean);
    return lines.map((l) => {
      const parts = l.split(';;');
      return {
        id: (parts[0] || '').trim(),
        repository: (parts[1] || '').trim(),
        tag: (parts[2] || '').trim(),
        size: (parts[3] || '').trim(),
        createdAt: (parts[4] || '').trim(),
      };
    });
  } catch (e) {
    console.warn('fetchDockerImages failed:', e);
    return [];
  }
}

export async function fetchDockerVolumes(host, useWsl = false) {
  try {
    const cmd = "docker volume ls --format '{{.Name}};;{{.Driver}};;{{.Scope}}'";
    const res = await execSshCommand(host, cmd, useWsl);
    if (!res || res.exit_code !== 0) return [];
    const lines = (res.stdout || '').trim().split('\n').filter(Boolean);
    return lines.map((l) => {
      const parts = l.split(';;');
      return {
        name: (parts[0] || '').trim(),
        driver: (parts[1] || '').trim(),
        scope: (parts[2] || '').trim(),
      };
    });
  } catch (e) {
    console.warn('fetchDockerVolumes failed:', e);
    return [];
  }
}

export async function fetchDockerNetworks(host, useWsl = false) {
  try {
    const cmd = "docker network ls --format '{{.ID}};;{{.Name}};;{{.Driver}};;{{.Scope}}'";
    const res = await execSshCommand(host, cmd, useWsl);
    if (!res || res.exit_code !== 0) return [];
    const lines = (res.stdout || '').trim().split('\n').filter(Boolean);
    return lines.map((l) => {
      const parts = l.split(';;');
      return {
        id: (parts[0] || '').trim(),
        name: (parts[1] || '').trim(),
        driver: (parts[2] || '').trim(),
        scope: (parts[3] || '').trim(),
      };
    });
  } catch (e) {
    console.warn('fetchDockerNetworks failed:', e);
    return [];
  }
}

export async function fetchDockerCompose(host, useWsl = false) {
  try {
    const cmd = "docker compose ls -a --format json";
    const res = await execSshCommand(host, cmd, useWsl);
    if (!res || res.exit_code !== 0) return [];
    const jsonStr = (res.stdout || '').trim();
    if (!jsonStr) return [];
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('fetchDockerCompose failed:', e);
    return [];
  }
}

export async function fetchDockerInfo(host, useWsl = false) {
  try {
    const cmd = "docker info --format '{{.ServerVersion}};;{{.OperatingSystem}};;{{.Architecture}};;{{.NCPU}};;{{.MemTotal}}'";
    const res = await execSshCommand(host, cmd, useWsl);
    if (!res || res.exit_code !== 0) return null;
    const parts = (res.stdout || '').trim().split(';;');
    if (parts.length >= 4) {
      const memBytes = parseInt(parts[4] || '0', 10);
      const memGb = (memBytes / (1024 * 1024 * 1024)).toFixed(1);
      return {
        serverVersion: parts[0]?.trim(),
        os: parts[1]?.trim(),
        arch: parts[2]?.trim(),
        cpus: parts[3]?.trim(),
        memory: `${memGb} GB`
      };
    }
    return null;
  } catch (e) {
    console.warn('fetchDockerInfo failed:', e);
    return null;
  }
}

export async function startSshTunnel({ id, host, localPort, remoteHost, remotePort, useWsl = false }) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('start_ssh_tunnel', {
      id: String(id),
      host: String(host),
      localPort: Number(localPort),
      remoteHost: String(remoteHost),
      remotePort: Number(remotePort),
      useWsl: Boolean(useWsl)
    });
  }
  return 12345;
}

export async function stopSshTunnel(id) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('stop_ssh_tunnel', {
      id: String(id)
    });
  }
  return true;
}

export async function listLocalDirectory(path) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('list_local_directory', {
      path: String(path || '')
    });
  }
  return [];
}

export async function listRemoteDirectory(host, remotePath, useWsl = false) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('list_remote_directory', {
      host: String(host),
      remotePath: String(remotePath || '/root'),
      useWsl: Boolean(useWsl)
    });
  }
  return [];
}

export async function transferSftpFile({ direction, host, localPath, remotePath, useWsl = false }) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('transfer_sftp_file', {
      direction: String(direction),
      host: String(host),
      localPath: String(localPath),
      remotePath: String(remotePath),
      useWsl: Boolean(useWsl)
    });
  }
  return true;
}

export async function remoteFsAction({ host, action, path, content, useWsl = false }) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('remote_fs_action', {
      host: String(host),
      action: String(action),
      path: String(path),
      content: content ? String(content) : null,
      useWsl: Boolean(useWsl)
    });
  }
  return '';
}

export async function localFsAction({ action, path, content }) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('local_fs_action', {
      action: String(action),
      path: String(path),
      content: content ? String(content) : null
    });
  }
  return 'OK';
}

// VPN (WireGuard / OpenVPN) Client APIs
export async function checkVpnToolsStatus() {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('check_vpn_tools_status');
  }
  return {
    wireguardInstalled: false,
    wireguardPath: null,
    openvpnInstalled: false,
    openvpnPath: null,
    wslHasTools: false
  };
}

export async function probeVpnEndpoint(endpoint) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('probe_vpn_endpoint', {
      endpoint: String(endpoint)
    });
  }
  return { success: true, status: 'ONLINE', message: 'Endpoint sẵn sàng', latencyMs: 14 };
}

export async function toggleVpnTunnel({ tunnelName, profileType, action, configContent, username, password }) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    return await window.__TAURI__.invoke('toggle_vpn_tunnel', {
      tunnelName: String(tunnelName),
      profileType: String(profileType),
      action: String(action),
      configContent: configContent ? String(configContent) : null,
      username: username ? String(username) : null,
      password: password ? String(password) : null
    });
  }
  return {
    success: true,
    status: action === 'connect' ? 'CONNECTED' : 'DISCONNECTED',
    message: action === 'connect' ? `Đã kết nối VPN ${tunnelName}` : `Đã ngắt VPN ${tunnelName}`,
    latencyMs: action === 'connect' ? 14 : null
  };
}

export async function scanLocalVpnConfigs() {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    try {
      const res = await window.__TAURI__.invoke('scan_local_vpn_configs');
      if (Array.isArray(res)) return res;
    } catch (e) {
      console.warn('scan_local_vpn_configs failed:', e);
    }
  }
  return [];
}

export async function getVpnLiveStatus(tunnelName) {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    try {
      return await window.__TAURI__.invoke('get_vpn_live_status', { tunnelName: tunnelName ? String(tunnelName) : null });
    } catch (e) {
      console.warn('get_vpn_live_status failed:', e);
    }
  }
  return { is_connected: false, is_process_running: false, state: 'DISCONNECTED', assigned_ip: null, adapter_name: null, last_error: null };
}

export async function checkIsAdmin() {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    try {
      return await window.__TAURI__.invoke('check_is_admin');
    } catch (e) {
      console.warn('check_is_admin failed:', e);
    }
  }
  return true; // default true in browser or non-Windows
}

export async function restartAsAdmin() {
  if (window.__TAURI__ && window.__TAURI__.invoke) {
    try {
      return await window.__TAURI__.invoke('restart_as_admin');
    } catch (e) {
      console.warn('restart_as_admin failed:', e);
    }
  }
  return false;
}
