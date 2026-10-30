// Service to discover and synchronize SSH configs and keys from ~/.ssh
export const DEFAULT_DISCOVERED_SSH = {
  sshDirs: [
    '~/.ssh'
  ],
  hosts: [
    {
      id: 'clt_dev1',
      name: 'clt_dev1',
      host: 'root@10.0.68.109:22',
      hostname: '10.0.68.109',
      user: 'root',
      port: 22,
      identityFile: '~/.ssh/id_rsa',
      tag: 'Dev',
      uptime: 'Click to Monitor',
      cpu: 0,
      ramPct: 0,
      cores: '4',
      ram: '8 GB',
      disk: '80 GB',
    },
    {
      id: 'clt_uat',
      name: 'clt_uat',
      host: 'clv@192.168.100.50:22',
      hostname: '192.168.100.50',
      user: 'clv',
      port: 22,
      identityFile: '~/.ssh/saas_uat_deploy',
      tag: 'UAT',
      uptime: 'Click to Monitor',
      cpu: 0,
      ramPct: 0,
      cores: '8',
      ram: '16 GB',
      disk: '200 GB',
    },
    {
      id: 'clt_uat_db',
      name: 'clt_uat_db',
      host: 'clv@192.168.200.55:22',
      hostname: '192.168.200.55',
      user: 'clv',
      port: 22,
      identityFile: '~/.ssh/saas_uat_deploy',
      tag: 'UAT',
      uptime: 'Click to Monitor',
      cpu: 0,
      ramPct: 0,
      cores: '16',
      ram: '32 GB',
      disk: '500 GB',
    },
    {
      id: 'clt_prod',
      name: 'clt_prod',
      host: 'dev@192.168.100.51:22',
      hostname: '192.168.100.51',
      user: 'dev',
      port: 22,
      identityFile: '~/.ssh/saas_uat_deploy',
      tag: 'Production',
      uptime: 'Click to Monitor',
      cpu: 0,
      ramPct: 0,
      cores: '16',
      ram: '64 GB',
      disk: '1 TB',
    },
    {
      id: 'clt_prod_db',
      name: 'clt_prod_db',
      host: 'dev@192.168.200.51:22',
      hostname: '192.168.200.51',
      user: 'dev',
      port: 22,
      identityFile: '~/.ssh/saas_uat_deploy',
      tag: 'Production',
      uptime: 'Click to Monitor',
      cpu: 0,
      ramPct: 0,
      cores: '32',
      ram: '128 GB',
      disk: '2 TB',
    },
  ],
  keys: [],
  tunnels: [],
};

export async function fetchSshDiscovery({ enableWsl = false, wslDistro = 'Ubuntu-24.04' } = {}) {
  try {
    if (window.__TAURI__ && window.__TAURI__.invoke) {
      const res = await window.__TAURI__.invoke('read_ssh_config_and_keys', {
        enableWsl: Boolean(enableWsl),
        wslDistro: String(wslDistro || 'Ubuntu-24.04'),
      });
      if (res) {
        return {
          sshDirs: (res.ssh_dirs && res.ssh_dirs.length > 0) ? res.ssh_dirs : ['~/.ssh'],
          hosts: (res.hosts && res.hosts.length > 0)
            ? res.hosts.map(h => ({
                id: h.id,
                name: h.name,
                host: h.host || `${h.user}@${h.hostname}:${h.port}`,
                hostname: h.hostname,
                user: h.user,
                port: h.port,
                identityFile: h.identity_file,
                tag: h.tag,
                uptime: h.uptime || 'Click to Monitor',
                cpu: h.cpu || 0,
                ramPct: h.ram_pct || 0,
                cores: h.cores || '4',
                ram: h.ram || '8 GB',
                disk: h.disk || '100 GB',
              }))
            : [],
          keys: Array.isArray(res.keys)
            ? res.keys.map(k => ({
                id: k.id,
                name: k.name,
                keyType: k.key_type,
                path: k.path,
                fingerprint: k.fingerprint,
                publicKey: k.public_key,
                hasPassphrase: k.has_passphrase,
                associatedHosts: k.associated_hosts || [],
                created: 'Auto-detected',
              }))
            : [],
          tunnels: Array.isArray(res.tunnels)
            ? res.tunnels.map(t => ({
                id: t.id,
                name: t.name,
                localPort: t.local_port,
                remoteHost: t.remote_host,
                remotePort: t.remote_port,
                viaServer: t.via_server,
                status: 'STOPPED',
                traffic: t.traffic || '0 B',
              }))
            : [],
        };
      }
    }
  } catch (err) {
    console.warn('[SSH Discovery] Tauri invoke not available or error:', err);
  }

  return DEFAULT_DISCOVERED_SSH;
}

export async function fetchPlatformInfo() {
  try {
    if (window.__TAURI__?.invoke) {
      return await window.__TAURI__.invoke('get_platform_info');
    }
  } catch (err) {
    console.warn('[PlatformInfo] Tauri invoke error:', err);
  }
  const isWin = isWindowsOS();
  return {
    os: isWin ? 'windows' : 'linux',
    wslAvailable: isWin
  };
}

export function isWindowsOS() {
  if (typeof navigator !== 'undefined') {
    const platform = navigator.platform || '';
    const ua = navigator.userAgent || '';
    if (/win/i.test(platform) || /windows/i.test(ua)) return true;
    if (/mac|linux|x11/i.test(platform) || /macintosh|linux/i.test(ua)) return false;
  }
  return true;
}

export async function fetchWslDistros() {
  try {
    if (window.__TAURI__?.invoke) {
      const distros = await window.__TAURI__.invoke('get_wsl_distros');
      if (Array.isArray(distros) && distros.length > 0) {
        return distros;
      }
    }
  } catch (err) {
    console.warn('[WSL Distros] Tauri invoke error:', err);
  }
  return ['Ubuntu-24.04', 'Ubuntu', 'Debian'];
}

export async function fetchDiagnostics(enableWsl = false, wslDistro = null) {
  try {
    if (window.__TAURI__?.invoke) {
      return await window.__TAURI__.invoke('get_diagnostics_data', {
        enableWsl,
        wslDistro,
      });
    }
  } catch (err) {
    console.warn('[Diagnostics] Tauri invoke error:', err);
  }
  return {
    engine: 'Async Tokio + Russh (Truecolor PTY)',
    renderer: 'Xterm.js Unified Canvas (Local & Remote Parity)',
    identities_count: 0,
    keys_count: 4,
    proxies_count: 1,
    memory_mb: 27.4,
    platform: 'Windows x86_64 PE (Pure Native)',
    is_wsl_enabled: enableWsl,
  };
}

export async function storeSecureSecret(target, secret) {
  try {
    if (window.__TAURI__?.invoke) {
      return await window.__TAURI__.invoke('store_secure_credential', { target, secret });
    }
  } catch (err) {
    console.warn('[Secure Credential] Store error:', err);
  }
  return false;
}

export async function getSecureSecret(target) {
  try {
    if (window.__TAURI__?.invoke) {
      return await window.__TAURI__.invoke('get_secure_credential', { target });
    }
  } catch (err) {
    console.warn('[Secure Credential] Get error:', err);
  }
  return null;
}

export function deriveRealIdentities(machines = [], customIdentities = []) {
  const isMock = (id = '', name = '') => {
    const sId = String(id).toLowerCase();
    const sName = String(name).toLowerCase();
    return (
      sId === 'ident_root_prod' ||
      sId === 'ident_klive_uat' ||
      sId === 'ident_soez_dev' ||
      sName.includes('root production master') ||
      sName.includes('klive uat deployer') ||
      sName.includes('soez dev operator')
    );
  };

  // Group machines by user + identityFile
  const grouped = new Map();
  if (Array.isArray(machines)) {
    machines.forEach((m) => {
      const user = (m.user || (m.host && m.host.split('@')[0]) || 'root').trim();
      const keyFile = (m.identityFile || m.identity_file || '').trim();
      const groupKey = `${user}:::${keyFile}`;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          user,
          keyFile,
          hosts: [],
          tags: new Set()
        });
      }
      const g = grouped.get(groupKey);
      g.hosts.push(m.name || m.id || m.hostname);
      if (m.tag) g.tags.add(m.tag);
    });
  }

  const derived = [];
  grouped.forEach((val) => {
    const keyFileName = val.keyFile ? val.keyFile.split(/[\\/]/).pop() : 'SSH Key';
    const tagLabel = Array.from(val.tags)[0] || '';
    const profileName = `${val.user} (${keyFileName}${tagLabel ? ` - ${tagLabel}` : ''})`;
    const id = `ident_${val.user}_${keyFileName.replace(/[^a-zA-Z0-9]/g, '_')}`;

    derived.push({
      id,
      name: profileName,
      username: val.user,
      type: val.keyFile ? 'key' : 'password',
      secret: val.keyFile || '',
      keyPath: val.keyFile,
      hostHint: val.hosts.join(', '),
      boundHosts: val.hosts,
      source: 'SSH Config',
      updatedAt: 'Đồng bộ từ SSH'
    });
  });

  // Filter out any mock items from customIdentities
  const validCustom = (Array.isArray(customIdentities) ? customIdentities : []).filter(
    (c) => c && !isMock(c.id, c.name) && !derived.some((d) => d.id === c.id)
  );

  return [...derived, ...validCustom];
}
