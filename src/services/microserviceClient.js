// API Client & SSE Event Subscriber for Microservices Dev Engine
export const BASE_URL = 'http://127.0.0.1:48899';

export async function ensureBackendRunning({ enableWsl = true, wslDistro = 'Ubuntu-24.04' } = {}) {
  if (window.__TAURI__?.invoke) {
    try {
      return await window.__TAURI__.invoke('ensure_service_backend_running', {
        useWsl: Boolean(enableWsl),
        wslDistro: String(wslDistro || 'Ubuntu-24.04'),
      });
    } catch (e) {
      console.warn('[MicroserviceBackend] Failed to invoke ensure_service_backend_running:', e);
    }
  }
  return false;
}

export async function stopBackendRunning() {
  if (window.__TAURI__?.invoke) {
    try {
      return await window.__TAURI__.invoke('stop_service_backend');
    } catch (e) {
      console.warn('[MicroserviceBackend] Failed to invoke stop_service_backend:', e);
    }
  }
  return false;
}

async function request(path, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}: ${res.statusText || 'Lỗi xử lý yêu cầu'}`
      };
    }
    return data;
  } catch (err) {
    console.warn(`[Microservice API] ${path} failed:`, err.message);
    return { success: false, error: `Không thể kết nối đến backend (Port 48899): ${err.message}` };
  }
}

// 1. Services Management
export async function fetchServices() {
  const data = await request('/api/services');
  return data?.success ? data.services : null;
}

export async function startService(id) {
  return await request(`/api/services/${id}/start`, { method: 'POST' });
}

export async function stopService(id) {
  return await request(`/api/services/${id}/stop`, { method: 'POST' });
}

export async function restartService(id) {
  return await request(`/api/services/${id}/restart`, { method: 'POST' });
}

export async function killServicePort(id) {
  return await request(`/api/services/${id}/kill-port`, { method: 'POST' });
}

export async function clearServiceLogs(id) {
  return await request(`/api/services/${id}/clear-logs`, { method: 'POST' });
}

export async function changeServiceProfile(id, profile) {
  return await request(`/api/services/${id}/active-profile`, {
    method: 'POST',
    body: JSON.stringify({ profile })
  });
}

export async function saveServiceEnvOverrides(id, overrides, profileKey) {
  return await request(`/api/services/${id}/env-overrides`, {
    method: 'POST',
    body: JSON.stringify({ overrides, profileKey })
  });
}

export async function exportServiceEnv(id, profileKey) {
  return await request(`/api/services/${id}/export-env`, {
    method: 'POST',
    body: JSON.stringify({ profileKey })
  });
}

export async function createService(serviceData) {
  return await request('/api/services', {
    method: 'POST',
    body: JSON.stringify(serviceData)
  });
}

export async function updateService(id, serviceData) {
  return await request(`/api/services/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(serviceData)
  });
}

export async function deleteService(id) {
  return await request(`/api/services/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export async function browseDirectory({ prompt = 'Chọn thư mục:', defaultDir = '', isWsl = false, wslDistro = 'Ubuntu' } = {}) {
  return await request('/api/browse-directory', {
    method: 'POST',
    body: JSON.stringify({ prompt, defaultDir, isWsl, wslDistro })
  });
}

export function convertWindowsToWslPath(winPath, distro = 'Ubuntu-24.04') {
  if (!winPath) return '';
  let p = winPath.replace(/\\/g, '/');
  
  // 1. Check WSL UNC path: //wsl.localhost/<distro>/... or //wsl$/<distro>/...
  const wslMatch = p.match(/^[/]{2}(?:wsl\.localhost|wsl\$)[/][^/]+(.*)$/i);
  if (wslMatch) {
    return wslMatch[1] || '/';
  }

  // 2. Check Z:/home/... or similar mapped network drive
  if (/^[a-zA-Z]:[/]home[/]/i.test(p)) {
    return p.replace(/^[a-zA-Z]:/i, '');
  }

  // 3. Drive letter: C:/... -> /mnt/c/...
  const driveMatch = p.match(/^([a-zA-Z]):(.*)$/);
  if (driveMatch) {
    const driveLetter = driveMatch[1].toLowerCase();
    const rest = driveMatch[2];
    return `/mnt/${driveLetter}${rest}`;
  }

  return p;
}

export function convertWslToWindowsPath(linuxPath, distro = 'Ubuntu-24.04') {
  if (!linuxPath) return '';
  let p = linuxPath.replace(/\\/g, '/');

  // 1. /mnt/c/... -> C:\...
  const mntMatch = p.match(/^[/]mnt[/]([a-zA-Z])(.*)$/);
  if (mntMatch) {
    const driveLetter = mntMatch[1].toUpperCase();
    const rest = mntMatch[2];
    return `${driveLetter}:${rest}`.replace(/\//g, '\\');
  }

  // 2. /home/... or other Linux root paths -> \\wsl.localhost\<distro>\...
  if (p.startsWith('/')) {
    return `\\\\wsl.localhost\\${distro}${p.replace(/\//g, '\\')}`;
  }

  return linuxPath;
}

// 2. Batch Group Actions
export async function startGroup(groupName) {
  return await request(`/api/groups/${groupName}/start`, { method: 'POST' });
}

export async function stopGroup(groupName) {
  return await request(`/api/groups/${groupName}/stop`, { method: 'POST' });
}

export async function restartGroup(groupName) {
  return await request(`/api/groups/${groupName}/restart`, { method: 'POST' });
}

export async function startAllServices() {
  return await request('/api/all/start', { method: 'POST' });
}

export async function stopAllServices() {
  return await request('/api/all/stop', { method: 'POST' });
}

export async function restartAllServices() {
  return await request('/api/all/restart', { method: 'POST' });
}

export async function killAllPorts() {
  return await request('/api/all/kill-ports', { method: 'POST' });
}

export async function setAllActiveProfile(profile) {
  return await request('/api/all/active-profile', {
    method: 'POST',
    body: JSON.stringify({ profile })
  });
}

// 3. Quick Tasks
export async function runTask(taskType) {
  return await request(`/api/tasks/${taskType}`, { method: 'POST' });
}

// 4. Categories Management
export async function fetchCategories() {
  const data = await request('/api/categories');
  return data?.success ? data.categories : null;
}

export async function createCategory(catData) {
  return await request('/api/categories', {
    method: 'POST',
    body: JSON.stringify(catData)
  });
}

export async function updateCategory(id, catData) {
  return await request(`/api/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(catData)
  });
}

export async function deleteCategory(id, fallbackCategory = 'SERVICE') {
  return await request(`/api/categories/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ fallbackCategory })
  });
}

// 5. Global Environment & Profiles
export async function fetchGlobalEnv(profileKey = 'default') {
  const data = await request(`/api/global-env?profile=${encodeURIComponent(profileKey)}`);
  return data?.success ? data : null;
}

export async function applyGlobalEnv(globalVars, profileKey = 'default') {
  return await request('/api/global-env', {
    method: 'POST',
    body: JSON.stringify({ globalVars, profileKey })
  });
}

// 6. Scripts Management
export async function fetchScripts() {
  const data = await request('/api/scripts');
  return data?.success ? data : null;
}

export async function createScript(scriptData) {
  return await request('/api/scripts', {
    method: 'POST',
    body: JSON.stringify(scriptData)
  });
}

export async function deleteScript(id) {
  return await request(`/api/scripts/${id}`, {
    method: 'DELETE'
  });
}

export async function runScript(id, options = {}) {
  return await request(`/api/scripts/${id}/run`, {
    method: 'POST',
    body: JSON.stringify(options)
  });
}

// 7. Directory Inspection & Templates
export async function inspectDirectory(dirPath) {
  return await request('/api/inspect-directory', {
    method: 'POST',
    body: JSON.stringify({ dirPath })
  });
}

export async function fetchTemplates() {
  const data = await request('/api/templates');
  return data?.success ? data.templates : null;
}

// 8. Server-Sent Events (SSE) Live Connection
export function subscribeMicroserviceEvents({
  onInitialState,
  onStatusChange,
  onLogsBatch,
  onLog,
  onLogCleared,
  onTaskStart,
  onTaskLog,
  onTaskFinish,
  onServiceUpdated,
  onServicesUpdated,
  onCategoriesUpdated,
  onServiceDeleted
}) {
  let eventSource = null;
  let isClosed = false;
  let retryTimer = null;

  function connect() {
    if (isClosed) return;
    try {
      eventSource = new EventSource(`${BASE_URL}/api/events`);

      eventSource.addEventListener('initial-state', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onInitialState) onInitialState(data);
        } catch (_) {}
      });

      eventSource.addEventListener('status-change', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onStatusChange) onStatusChange(data);
        } catch (_) {}
      });

      eventSource.addEventListener('service-logs-batch', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onLogsBatch) onLogsBatch(data);
        } catch (_) {}
      });

      eventSource.addEventListener('service-log', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onLog) onLog(data);
        } catch (_) {}
      });

      eventSource.addEventListener('log-cleared', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onLogCleared) onLogCleared(data);
        } catch (_) {}
      });

      eventSource.addEventListener('task-start', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onTaskStart) onTaskStart(data);
        } catch (_) {}
      });

      eventSource.addEventListener('task-log', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onTaskLog) onTaskLog(data);
        } catch (_) {}
      });

      eventSource.addEventListener('task-finish', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onTaskFinish) onTaskFinish(data);
        } catch (_) {}
      });

      eventSource.addEventListener('service-updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onServiceUpdated) onServiceUpdated(data);
        } catch (_) {}
      });

      eventSource.addEventListener('services-updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onServicesUpdated) onServicesUpdated(data);
        } catch (_) {}
      });

      eventSource.addEventListener('categories-updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onCategoriesUpdated) onCategoriesUpdated(data);
        } catch (_) {}
      });

      eventSource.addEventListener('service-deleted', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (onServiceDeleted) onServiceDeleted(data);
        } catch (_) {}
      });

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!isClosed) {
          retryTimer = setTimeout(connect, 3000);
        }
      };
    } catch (_) {
      if (!isClosed) {
        retryTimer = setTimeout(connect, 3000);
      }
    }
  }

  connect();

  return () => {
    isClosed = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}
