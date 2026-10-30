import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import MachineCard from './components/MachineCard';
import TerminalView from './components/TerminalView';
import ServiceMonitorView from './components/services/ServiceMonitorView';
import GroupSection from './components/services/GroupSection';
import QuickTasksBar from './components/services/QuickTasksBar';
import EnvModal from './components/services/EnvModal';
import SettingsModal from './components/SettingsModal';
import DashboardView from './components/ssh/DashboardView';
import KeychainView from './components/ssh/KeychainView';
import IdentityView from './components/ssh/IdentityView';
import ProxyView from './components/ssh/ProxyView';
import SnippetsView from './components/ssh/SnippetsView';
import PortForwardView from './components/ssh/PortForwardView';
import SftpView from './components/ssh/SftpView';
import DockerView from './components/ssh/DockerView';
import MachineModal from './components/ssh/MachineModal';
import CategoriesView from './components/services/CategoriesView';
import EnvSetupView from './components/services/EnvSetupView';
import ManageServicesView from './components/services/ManageServicesView';
import ScriptsView from './components/services/ScriptsView';
import BackupRestoreModal from './components/services/BackupRestoreModal';
import SettingsView from './components/settings/SettingsView';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { fetchSshDiscovery, DEFAULT_DISCOVERED_SSH, fetchPlatformInfo, isWindowsOS, deriveRealIdentities } from './services/sshDiscovery';
import { startSshTunnel, stopSshTunnel } from './services/sshClient';
import { 
  ensureBackendRunning, 
  fetchServices, 
  startService, 
  stopService, 
  restartService, 
  killServicePort, 
  killAllPorts, 
  clearServiceLogs, 
  changeServiceProfile, 
  saveServiceEnvOverrides, 
  startGroup, 
  stopGroup, 
  startAllServices, 
  stopAllServices, 
  restartAllServices, 
  runTask, 
  subscribeMicroserviceEvents 
} from './services/microserviceClient';
import { THEME_CONFIGS, SYSTEM_FONTS, UI_FONT_SIZES, getMetricColor } from './constants/palettes';
import DataTable, { TableActionButton } from './components/common/DataTable';
import ConfirmModal from './components/common/ConfirmModal';
import CommandPaletteModal from './components/common/CommandPaletteModal';
import { translations } from './i18n/translations';
import { Search, Plus, X, RefreshCw, Play, Square, Layers, Server, RotateCw, FolderOpen, LayoutList, LayoutGrid, Terminal, FolderSync, Box, Settings2, Trash2 } from 'lucide-react';

const INITIAL_MACHINES = [
  {
    id: 'local_win',
    name: 'Windows_Host_dev',
    host: 'thientran@DESKTOP-WIN (Windows 11)',
    os: 'windows',
    cores: '16',
    ram: '32.0 GB',
    disk: '512 GB',
    uptime: '2d 6h 15m',
    cpu: 18,
    ramPct: 42,
    netUp: '45.2 KB/s',
    netDown: '120.8 KB/s',
    diskR: '1.2 MB/s',
    diskW: '540 KB/s',
    tag: 'All',
  },
  {
    id: 'klive_prod',
    name: 'Klive_Admin_prod',
    host: 'klive@47.84.227.11..',
    os: 'remote',
    cores: '-',
    ram: '-',
    disk: '-',
    uptime: 'Click to Monitor',
    cpu: 0,
    ramPct: 0,
    netUp: '0 B/s',
    netDown: '0 B/s',
    diskR: '0 B/s',
    diskW: '0 B/s',
    tag: 'Production',
  },
  {
    id: 'klive_uat',
    name: 'klive_admin_uat',
    host: 'klive@47.84.233.16..',
    cores: '2',
    ram: '3.54 GB',
    disk: '39.01 GB',
    uptime: '1d 8h 23m',
    cpu: 13,
    ramPct: 32,
    netUp: '6.3 KB/s',
    netDown: '4.1 KB/s',
    diskR: '0 B/s',
    diskW: '0 B/s',
    tag: 'UAT',
  },
  {
    id: 'klive_be_uat',
    name: 'Klive_BE_Uat',
    host: 'root@47.84.99.85:22',
    cores: '-',
    ram: '-',
    disk: '-',
    uptime: 'Click to Monitor',
    cpu: 0,
    ramPct: 0,
    netUp: '0 B/s',
    netDown: '0 B/s',
    diskR: '0 B/s',
    diskW: '0 B/s',
    tag: 'UAT',
  },
  {
    id: 'soez',
    name: 'soez',
    host: 'soez@64.120.94.74:..',
    cores: '-',
    ram: '-',
    disk: '-',
    uptime: 'Click to Monitor',
    cpu: 0,
    ramPct: 0,
    netUp: '0 B/s',
    netDown: '0 B/s',
    diskR: '0 B/s',
    diskW: '0 B/s',
    tag: 'No Tags',
  },
  {
    id: 'hrm_prod',
    name: 'HRM_PROD',
    host: 'hrm@47.237.156.191..',
    cores: '-',
    ram: '-',
    disk: '-',
    uptime: 'Click to Monitor',
    cpu: 0,
    ramPct: 0,
    netUp: '0 B/s',
    netDown: '0 B/s',
    diskR: '0 B/s',
    diskW: '0 B/s',
    tag: 'Production',
  },
];

const INITIAL_SERVICES = [
  {
    id: 'fe',
    name: 'fe',
    category: 'FE',
    activeProfile: 'default',
    profiles: {
      default: { name: 'default' },
      dev: { name: 'dev' },
      prod: { name: 'prod' },
    },
    statusInfo: {
      status: 'STOPPED',
      port: 5173,
    },
    port: 5173,
    computedEnv: {
      PORT: '5173',
      VITE_API_URL: 'http://localhost:3001',
    },
  },
  {
    id: 'api',
    name: 'api',
    category: 'BACKEND',
    activeProfile: 'default',
    profiles: {
      default: { name: 'default' },
      dev: { name: 'dev' },
      prod: { name: 'prod' },
    },
    statusInfo: {
      status: 'STOPPED',
      port: 3001,
    },
    port: 3001,
    computedEnv: {
      PORT: '3001',
      DB_HOST: 'localhost',
    },
  },
  {
    id: 'acc-service',
    name: 'acc-service',
    category: 'ACCOUNTING',
    activeProfile: 'dev',
    profiles: {
      default: { name: 'Default' },
      dev: { name: 'Develop' },
      prod: { name: 'Production' },
    },
    statusInfo: {
      status: 'RUNNING',
      port: 45072,
      pid: 62410,
    },
    computedEnv: {
      PORT: '45072',
      DB_NAME: 'accounting',
      KAFKA_CLIENT_ID: 'acc-service',
      DB_MOCK: 'false',
    },
  },
  {
    id: 'acc-bff',
    name: 'acc-bff',
    category: 'ACCOUNTING',
    activeProfile: 'dev',
    profiles: {
      default: { name: 'Default' },
      dev: { name: 'Develop' },
    },
    statusInfo: {
      status: 'RUNNING',
      port: 9098,
      pid: 62452,
    },
    computedEnv: {
      PORT: '9098',
      TAX_LOOKUP_API_TOKEN: 'EnURbbnPhUm4GjNgE4Ogrw==',
    },
  },
  {
    id: 'saas-com-acc-bff',
    name: 'com-bff',
    category: 'COM',
    activeProfile: 'dev',
    profiles: {
      default: { name: 'Default' },
      dev: { name: 'Develop' },
    },
    statusInfo: {
      status: 'STOPPED',
      port: 9091,
    },
    computedEnv: {
      PORT: '9091',
      RESET_PASSWORD_FE_URL: 'http://10.0.68.109:3001',
    },
  },
  {
    id: 'saas-com-acc-backend-service',
    name: 'com-service',
    category: 'COM',
    activeProfile: 'dev',
    profiles: {
      default: { name: 'Default' },
      dev: { name: 'Develop' },
    },
    statusInfo: {
      status: 'RUNNING',
      port: 45071,
      pid: 62489,
    },
    computedEnv: {
      PORT: '45071',
      DB_NAME: 'com_service',
    },
  },
  {
    id: 'acc-fe',
    name: 'acc-fe (Frontend)',
    category: 'ACCOUNTING',
    activeProfile: 'default',
    profiles: {
      default: { name: 'Default' },
      local: { name: 'Local Dev' },
    },
    statusInfo: {
      status: 'STOPPED',
      port: 3000,
    },
    computedEnv: {
      PORT: '3000',
      VITE_API_URL: 'http://localhost:9098',
    },
  },
];

export default function App() {
  const [currentNav, setCurrentNav] = useState('services');
  const [selectedServiceId, setSelectedServiceId] = useState('fe');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [hostsViewMode, setHostsViewMode] = useState(() => {
    try {
      return localStorage.getItem('service_tool_hosts_view_mode') || 'list';
    } catch (_) {
      return 'list';
    }
  });

  const handleSetHostsViewMode = (mode) => {
    setHostsViewMode(mode);
    try {
      localStorage.setItem('service_tool_hosts_view_mode', mode);
    } catch (_) {}
  };

  const getRamUsageText = (m) => {
    if (!m.ram || m.ram === '-') return '-';
    if (m.ramUsed) return `${m.ramUsed} / ${m.ram}`;
    const totalNum = parseFloat(m.ram);
    if (!isNaN(totalNum) && m.ramPct !== undefined && m.ramPct > 0) {
      const unit = m.ram.replace(/[0-9.]/g, '').trim() || 'GB';
      const used = (totalNum * (m.ramPct / 100)).toFixed(1);
      return `${used} ${unit} / ${m.ram}`;
    }
    return m.ramPct ? `${m.ramPct}% / ${m.ram}` : `- / ${m.ram}`;
  };

  const getDiskUsageText = (m) => {
    if (!m.disk || m.disk === '-') return '-';
    if (m.diskUsed) return `${m.diskUsed} / ${m.disk}`;
    const totalNum = parseFloat(m.disk);
    if (!isNaN(totalNum) && m.diskPct !== undefined && m.diskPct > 0) {
      const unit = m.disk.replace(/[0-9.]/g, '').trim() || 'GB';
      const used = (totalNum * (m.diskPct / 100)).toFixed(1);
      return `${used} ${unit} / ${m.disk}`;
    }
    return m.disk;
  };

  const getCpuUsageText = (m) => {
    if (!m.cores || m.cores === '-') return `${m.cpu || 0}%`;
    const coresNum = parseFloat(m.cores);
    if (!isNaN(coresNum) && m.cpu !== undefined && m.cpu > 0) {
      const active = (coresNum * (m.cpu / 100)).toFixed(1);
      return `${active} / ${m.cores} Cores`;
    }
    return `- / ${m.cores} Cores`;
  };

  // Settings state (Default is Windows Native; WSL is an optional setting toggle!)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('rtmux_settings');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      enableWsl: false, // Default: pure Windows Native
      defaultShell: 'powershell',
      wslDistro: 'Ubuntu-24.04',
      autoTmux: true,
      serviceTarget: 'windows',
    };
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialCategory, setSettingsInitialCategory] = useState('general');
  const [isWindows, setIsWindows] = useState(() => isWindowsOS());

  useEffect(() => {
    fetchPlatformInfo().then((info) => {
      if (info && info.os) {
        setIsWindows(info.os === 'windows' || info.wslAvailable === true);
      }
    });
  }, []);

  const handleOpenSettings = (category = 'general') => {
    setSettingsInitialCategory(category || 'general');
    setCurrentNav('settings');
    setActiveSession(null);
  };

  // Load SSH configuration and keys (Auto-discover from ~/.ssh)
  const [machines, setMachines] = useState(() => {
    try {
      const saved = localStorage.getItem('service_tool_machines');
      if (saved) {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed = parsed.map(m => {
            if (m.identityFile && m.identityFile.includes('C:\\projects\\clt\\key')) {
              return {
                ...m,
                identityFile: m.identityFile.includes('id_rsa') ? '~/.ssh/id_rsa' : '~/.ssh/saas_uat_deploy'
              };
            }
            return m;
          });
          const savedSettings = JSON.parse(localStorage.getItem('rtmux_settings') || '{}');
          if (savedSettings.enableWsl === false) {
            return parsed.filter(m => !m.identityFile?.startsWith('/home'));
          }
          return parsed;
        }
      }
    } catch {}
    return Array.isArray(DEFAULT_DISCOVERED_SSH?.hosts) ? DEFAULT_DISCOVERED_SSH.hosts : [];
  });

  const [sshKeys, setSshKeys] = useState(() => {
    try {
      const savedSettings = JSON.parse(localStorage.getItem('rtmux_settings') || '{}');
      if (savedSettings.enableWsl === false) {
        return [];
      }
      const saved = localStorage.getItem('service_tool_ssh_keys');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [sshTunnels, setSshTunnels] = useState(() => {
    try {
      const savedSettings = JSON.parse(localStorage.getItem('rtmux_settings') || '{}');
      if (savedSettings.enableWsl === false) {
        return [];
      }
      const saved = localStorage.getItem('service_tool_ssh_tunnels');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(t => ({ ...t, status: 'STOPPED' }));
        }
      }
    } catch {}
    return [];
  });

  const [customIdentities, setCustomIdentities] = useState(() => {
    try {
      const saved = localStorage.getItem('service_tool_custom_identities') || localStorage.getItem('service_tool_identities');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out legacy mock data
          return parsed.filter(item => 
            item && 
            item.id !== 'ident_root_prod' && 
            item.id !== 'ident_klive_uat' && 
            item.id !== 'ident_soez_dev' &&
            !item.name?.includes('Root Production Master') &&
            !item.name?.includes('Klive UAT Deployer') &&
            !item.name?.includes('Soez Dev Operator')
          );
        }
      }
    } catch {}
    return [];
  });

  const effectiveIdentities = useMemo(() => {
    return deriveRealIdentities(machines, customIdentities);
  }, [machines, customIdentities]);

  const [proxies, setProxies] = useState(() => {
    try {
      const saved = localStorage.getItem('service_tool_proxies');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Discard mock items completely and ensure all profiles start completely OFF (DISCONNECTED)
          const sanitized = parsed.filter(p => 
            p && 
            p.id !== 'vpn_wg_office' && 
            p.id !== 'vpn_ovpn_prod' && 
            !p.name?.includes('Office WireGuard') && 
            !p.name?.includes('Singapore Prod') && 
            !p.name?.includes('SOCKS5')
          ).map(p => ({
            ...p,
            status: 'DISCONNECTED',
            lastHandshake: 'Chưa kết nối',
            assignedIp: null
          }));
          try {
            localStorage.setItem('service_tool_proxies', JSON.stringify(sanitized));
          } catch {}
          return sanitized;
        }
      }
    } catch {}
    return [];
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [machineToDelete, setMachineToDelete] = useState(null);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const [sshDirs, setSshDirs] = useState(DEFAULT_DISCOVERED_SSH?.sshDirs || []);
  const [isRescanningSsh, setIsRescanningSsh] = useState(false);

  const performSshDiscovery = useCallback(async (customSettings = null) => {
    const activeSettings = customSettings || settings;
    try {
      const data = await fetchSshDiscovery({
        enableWsl: activeSettings.enableWsl,
        wslDistro: activeSettings.wslDistro,
      });
      if (data) {
        if (data.sshDirs) setSshDirs(data.sshDirs);
        if (Array.isArray(data.hosts)) {
          setMachines(data.hosts);
          try {
            localStorage.setItem('service_tool_machines', JSON.stringify(data.hosts));
          } catch {}
        }
        if (Array.isArray(data.keys)) {
          setSshKeys(data.keys);
          try {
            localStorage.setItem('service_tool_ssh_keys', JSON.stringify(data.keys));
          } catch {}
        }
        if (Array.isArray(data.tunnels)) {
          const stoppedTunnels = data.tunnels.map(t => ({ ...t, status: 'STOPPED' }));
          setSshTunnels(stoppedTunnels);
          try {
            localStorage.setItem('service_tool_ssh_tunnels', JSON.stringify(stoppedTunnels));
          } catch {}
        }
      }
    } catch (e) {
      console.warn('SSH discovery failed:', e);
    }
  }, [settings]);

  // Automatically read SSH config & keys on startup
  useEffect(() => {
    performSshDiscovery();
  }, []);

  const handleRescanSsh = async () => {
    setIsRescanningSsh(true);
    try {
      await performSshDiscovery();
    } finally {
      setTimeout(() => setIsRescanningSsh(false), 600);
    }
  };

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('rtmux_settings', JSON.stringify(newSettings));
    } catch (_) {}
    // If WSL toggle or distro changed, re-sync SSH config & keys
    if (newSettings.enableWsl !== settings.enableWsl || newSettings.wslDistro !== settings.wslDistro) {
      performSshDiscovery(newSettings);
    }
  };

  const currentThemeConfig = THEME_CONFIGS[settings.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const currentLang = settings.language || 'vi';
  const t = translations[currentLang] || translations.vi;
  const accentColor = settings.accentColor || '#10b981';

  // Dynamically apply Surface Themes, Accent Color, Text Size & System Font to Root Container
  useEffect(() => {
    const theme = settings.surfaceTheme || 'zinc';
    const accent = settings.accentColor || '#10b981';
    const themeCfg = THEME_CONFIGS[theme] || THEME_CONFIGS.zinc;

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--app-accent', accent);
    document.documentElement.style.setProperty('--app-bg', themeCfg.bg);
    document.documentElement.style.setProperty('--app-surface', themeCfg.card);
    document.documentElement.style.setProperty('--app-border', themeCfg.border);
    document.body.style.backgroundColor = themeCfg.bg;
    document.body.style.color = themeCfg.text;

    // Interface Text Size Scaling
    const fontSize = settings.uiFontSize || '14px';
    document.documentElement.style.fontSize = fontSize;
    document.documentElement.style.setProperty('--app-font-size', fontSize);

    // System Typography Font Family
    const fontId = settings.systemFont || 'system';
    const selectedFont = SYSTEM_FONTS.find(f => f.id === fontId);
    const fontStack = selectedFont?.fontStack || "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    document.documentElement.style.fontFamily = fontStack;
    document.body.style.fontFamily = fontStack;
    document.documentElement.style.setProperty('--app-font-family', fontStack);
  }, [settings.surfaceTheme, settings.accentColor, settings.uiFontSize, settings.systemFont]);

  // Global Keyboard Shortcuts
  useKeyboardShortcuts({
    onOpenSettings: () => {
      if (currentNav === 'settings') {
        setCurrentNav('services');
      } else {
        handleOpenSettings('general');
      }
      setActiveSession(null);
    },
    onOpenLocalTerminal: () => {
      handleOpenLocalTerminal();
    },
    onCloseActiveTerminal: () => {
      if (activeSession) {
        handleCloseTerminalSession(activeSession.id);
      }
    },
    onSplitVertical: () => {
      console.log('Split Vertical triggered');
    },
    onSplitHorizontal: () => {
      console.log('Split Horizontal triggered');
    },
    onToggleSearch: () => {
      setIsSearchModalOpen((prev) => !prev);
    },
  });

  const [services, setServices] = useState(INITIAL_SERVICES);
  const [logsMap, setLogsMap] = useState({
    'acc-service': [
      { text: '\x1b[32m[NestFactory]\x1b[0m Starting Nest application...\r\n' },
      { text: '\x1b[36m[InstanceLoader]\x1b[0m DatabaseModule dependencies initialized\r\n' },
      { text: '\x1b[32m[NestApplication]\x1b[0m Nest application successfully started on port 45072\r\n' },
    ],
    'acc-bff': [
      { text: '\x1b[32m[BFF]\x1b[0m Accounting BFF listening at http://localhost:9098\r\n' },
    ],
    'saas-com-acc-backend-service': [
      { text: '\x1b[32m[COM Service]\x1b[0m gRPC Server listening at 0.0.0.0:45071\r\n' },
    ],
  });

  const [activeTag, setActiveTag] = useState('All');
  const [serviceCategory, setServiceCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [terminalSessions, setTerminalSessions] = useState([]);
  const [terminalInitialCommand, setTerminalInitialCommand] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [preselectedHost, setPreselectedHost] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentRunningTask, setCurrentRunningTask] = useState(null);
  const [lastTaskLog, setLastTaskLog] = useState('');
  const [envModalService, setEnvModalService] = useState(null);
  const [isGlobalBackupModalOpen, setIsGlobalBackupModalOpen] = useState(false);

  // Global Escape key listener to close any active modal in hierarchical order
  useEffect(() => {
    const handleGlobalEsc = (e) => {
      if (e.key === 'Escape') {
        if (machineToDelete) {
          e.preventDefault();
          setMachineToDelete(null);
          return;
        }
        if (isSearchModalOpen) {
          e.preventDefault();
          setIsSearchModalOpen(false);
          return;
        }
        if (isGlobalBackupModalOpen) {
          e.preventDefault();
          setIsGlobalBackupModalOpen(false);
          return;
        }
        if (envModalService) {
          e.preventDefault();
          setEnvModalService(null);
          return;
        }
        if (isAddModalOpen) {
          e.preventDefault();
          setIsAddModalOpen(false);
          setEditingMachine(null);
          return;
        }
        if (isSettingsOpen) {
          e.preventDefault();
          setIsSettingsOpen(false);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleGlobalEsc);
    return () => window.removeEventListener('keydown', handleGlobalEsc);
  }, [machineToDelete, isSearchModalOpen, isGlobalBackupModalOpen, envModalService, isAddModalOpen, isSettingsOpen]);

  const handleConnectMachine = (mach, cmd = null) => {
    setActiveSession(mach);
    setTerminalInitialCommand(cmd);
    setTerminalSessions((prev) => {
      if (!prev.some((s) => s.id === mach.id)) {
        return [...prev, mach];
      }
      return prev;
    });
  };

  const handleSwitchTerminalSession = (mach) => {
    setActiveSession(mach);
    setTerminalInitialCommand(null);
  };

  const handleCloseTerminalSession = (id) => {
    const next = terminalSessions.filter((s) => s.id !== id);
    setTerminalSessions(next);
    if (activeSession?.id === id) {
      if (next.length > 0) {
        setActiveSession(next[next.length - 1]);
      } else {
        setActiveSession(null);
      }
    }
  };

  const handleOpenLocalTerminal = useCallback(() => {
    const isWin = isWindowsOS();
    const isMac = typeof navigator !== 'undefined' && (/mac/i.test(navigator.platform) || /macintosh/i.test(navigator.userAgent));
    const isLinux = !isWin && !isMac;

    let localSession;
    if (isWin) {
      if (settings?.enableWsl) {
        const distro = settings?.wslDistro || 'Ubuntu-24.04';
        localSession = {
          id: 'local_wsl_' + Date.now(),
          name: `WSL (${distro})`,
          host: 'localhost',
          os: 'wsl',
          shell: 'wsl',
          user: 'thientran',
          distro: distro
        };
      } else {
        localSession = {
          id: 'local_win_' + Date.now(),
          name: 'Windows PowerShell',
          host: 'localhost',
          os: 'windows',
          shell: 'powershell',
          user: 'Windows_Host'
        };
      }
    } else if (isMac) {
      localSession = {
        id: 'local_mac_' + Date.now(),
        name: 'macOS Terminal',
        host: 'localhost',
        os: 'macos',
        shell: 'zsh',
        user: 'mac'
      };
    } else {
      localSession = {
        id: 'local_linux_' + Date.now(),
        name: 'Ubuntu Linux Terminal',
        host: 'localhost',
        os: 'linux',
        shell: 'bash',
        user: 'ubuntu'
      };
    }

    handleConnectMachine(localSession);
  }, [settings?.enableWsl, settings?.wslDistro]);

  const handleSaveMachine = (machData) => {
    setMachines((prev) => {
      const exists = prev.some((m) => m.id === machData.id);
      const next = exists ? prev.map((m) => (m.id === machData.id ? machData : m)) : [machData, ...prev];
      try { localStorage.setItem('service_tool_machines', JSON.stringify(next)); } catch {}
      return next;
    });
    setEditingMachine(null);
    setIsAddModalOpen(false);
  };

  const handleRequestDeleteMachine = (id) => {
    const target = machines.find((m) => m.id === id) || { id, name: id };
    setMachineToDelete(target);
  };

  const handleConfirmDeleteMachine = () => {
    if (!machineToDelete) return;
    setMachines((prev) => {
      const next = prev.filter((m) => m.id !== machineToDelete.id);
      try { localStorage.setItem('service_tool_machines', JSON.stringify(next)); } catch {}
      return next;
    });
    setMachineToDelete(null);
  };

  const handleOpenSftpFromCard = (mach) => {
    setPreselectedHost(mach);
    setCurrentNav('sftp');
  };

  const handleOpenDockerFromCard = (mach) => {
    setPreselectedHost(mach);
    setCurrentNav('docker');
  };



  // Connect to Microservice Backend & SSE Stream
  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    async function initMicroservices() {
      // 1. Ensure backend is running via Rust Tauri IPC
      await ensureBackendRunning({
        enableWsl: settings.enableWsl,
        wslDistro: settings.wslDistro,
      });

      // 2. Fetch real initial services
      const realServices = await fetchServices();
      if (isMounted && Array.isArray(realServices) && realServices.length > 0) {
        setServices(realServices);
        if (!selectedServiceId || !realServices.some(s => s.id === selectedServiceId)) {
          setSelectedServiceId(realServices[0].id);
        }
      }

      // 3. Subscribe to SSE events
      unsubscribe = subscribeMicroserviceEvents({
        onInitialState: (data) => {
          if (!isMounted) return;
          if (Array.isArray(data.services)) {
            const combined = data.services.map((s) => ({
              ...s,
              statusInfo: (data.statuses && data.statuses[s.id]) || s.statusInfo || { status: 'STOPPED' }
            }));
            setServices(combined);
          }
        },
        onStatusChange: (data) => {
          if (!isMounted || !data?.serviceId) return;
          setServices((prev) =>
            prev.map((s) =>
              s.id === data.serviceId
                ? { ...s, statusInfo: { ...s.statusInfo, status: data.status, pid: data.pid } }
                : s
            )
          );
        },
        onLogsBatch: (batch) => {
          if (!isMounted || !Array.isArray(batch)) return;
          setLogsMap((prev) => {
            const next = { ...prev };
            for (const item of batch) {
              if (!item || !item.serviceId) continue;
              const cur = next[item.serviceId] || [];
              next[item.serviceId] = [...cur, item].slice(-200);
            }
            return next;
          });
        },
        onLog: (data) => {
          if (!isMounted || !data?.serviceId) return;
          setLogsMap((prev) => ({
            ...prev,
            [data.serviceId]: [...(prev[data.serviceId] || []), data].slice(-200)
          }));
        },
        onLogCleared: (data) => {
          if (!isMounted || !data?.serviceId) return;
          setLogsMap((prev) => ({
            ...prev,
            [data.serviceId]: []
          }));
        },
        onTaskStart: (data) => {
          if (!isMounted) return;
          setCurrentRunningTask(data.task);
          setLastTaskLog(`Bắt đầu: ${data.task}`);
        },
        onTaskLog: (data) => {
          if (!isMounted) return;
          setLastTaskLog(data.text);
        },
        onTaskFinish: (data) => {
          if (!isMounted) return;
          setCurrentRunningTask(null);
          setLastTaskLog(data.success ? `✔ Hoàn thành: ${data.task}` : `✖ Lỗi: ${data.task}`);
        },
        onServiceUpdated: (updatedSvc) => {
          if (!isMounted || !updatedSvc?.id) return;
          setServices((prev) =>
            prev.map((s) => (s.id === updatedSvc.id ? { ...s, ...updatedSvc, statusInfo: s.statusInfo || updatedSvc.statusInfo } : s))
          );
        }
      });
    }

    initMicroservices();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [settings.enableWsl, settings.wslDistro]);

  // Service control actions
  const handleStartService = async (id) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, statusInfo: { ...s.statusInfo, status: 'STARTING' } } : s))
    );
    await startService(id);
  };

  const handleStopService = async (id) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, statusInfo: { ...s.statusInfo, status: 'STOPPED', pid: null } } : s))
    );
    await stopService(id);
  };

  const handleRestartService = async (id) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, statusInfo: { ...s.statusInfo, status: 'STARTING' } } : s))
    );
    await restartService(id);
  };

  const handleClearLogs = async (id) => {
    setLogsMap((prev) => ({ ...prev, [id]: [] }));
    await clearServiceLogs(id);
  };

  const handleChangeProfile = async (id, newProfile) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, activeProfile: newProfile } : s))
    );
    await changeServiceProfile(id, newProfile);
  };

  const handleStartGroup = async (groupName) => {
    await startGroup(groupName);
  };

  const handleStopGroup = async (groupName) => {
    await stopGroup(groupName);
  };

  const handleStartAll = async () => {
    await startAllServices();
  };

  const handleStopAll = async () => {
    await stopAllServices();
  };

  const handleRestartAll = async () => {
    await restartAllServices();
  };

  const handleKillPort = async (serviceIdOrPort) => {
    if (typeof serviceIdOrPort === 'string') {
      await killServicePort(serviceIdOrPort);
    } else {
      const target = services.find(s => s.port === serviceIdOrPort);
      if (target) {
        await killServicePort(target.id);
      }
    }
  };

  const handleKillAll = async () => {
    await killAllPorts();
  };

  const handleRunTask = async (taskId) => {
    setCurrentRunningTask(taskId);
    setLastTaskLog(`Bắt đầu chạy tác vụ: ${taskId}...`);
    await runTask(taskId);
  };

  const reloadMicroservices = useCallback(async () => {
    const real = await fetchServices();
    if (Array.isArray(real) && real.length > 0) {
      setServices(real);
    }
  }, []);

  const handleSaveEnvOverrides = async (serviceId, overrides, profileKey) => {
    // Optimistically update React state immediately so navigating away never loses changes
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== serviceId) return s;
        const pKey = profileKey || s.activeProfile || 'default';
        const updatedProfiles = { ...(s.profiles || {}) };
        updatedProfiles[pKey] = {
          ...(updatedProfiles[pKey] || {}),
          name: updatedProfiles[pKey]?.name || pKey,
          env: { ...overrides }
        };
        const isActiveProfile = pKey === s.activeProfile || !s.activeProfile;
        return {
          ...s,
          profiles: updatedProfiles,
          computedEnv: isActiveProfile ? { ...overrides } : s.computedEnv
        };
      })
    );

    const res = await saveServiceEnvOverrides(serviceId, overrides, profileKey);
    await reloadMicroservices();
    return res;
  };

  // Group services by category
  const categories = ['ALL', 'ACCOUNTING', 'COM'];
  const filteredServices = services.filter(
    (s) => serviceCategory === 'ALL' || s.category === serviceCategory
  );
  const groupedServices = {};
  filteredServices.forEach((s) => {
    if (!groupedServices[s.category]) groupedServices[s.category] = [];
    groupedServices[s.category].push(s);
  });

  const displayedMachines = useMemo(() => {
    let list = [...machines];
    if (settings.enableWsl) {
      const hasWsl = list.some((m) => m.id === 'local_tmux');
      if (!hasWsl) {
        list = [
          {
            id: 'local_tmux',
            name: 'Local_tmux_dev',
            host: `thientran@localhost (${settings.wslDistro || 'WSL2'})`,
            os: 'wsl',
            cores: '8',
            ram: '16.0 GB',
            disk: '256 GB',
            uptime: '3d 14h 23m',
            cpu: 14,
            ramPct: 28,
            netUp: '12.4 KB/s',
            netDown: '8.1 KB/s',
            diskR: '0 B/s',
            diskW: '24 KB/s',
            tag: 'All',
          },
          ...list,
        ];
      }
    } else {
      list = list.filter((m) => m.id !== 'local_tmux');
    }
    return list;
  }, [machines, settings.enableWsl, settings.wslDistro]);

  const filteredMachines = displayedMachines.filter((m) => {
    const matchesTag = activeTag === 'All' || m.tag === activeTag;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.host.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  const hostColumns = useMemo(() => [
    {
      key: 'os',
      label: 'OS',
      align: 'center',
      width: 'w-20',
      render: (m) => {
        const isWin = m.os === 'windows';
        const isWsl = m.os === 'wsl';
        const isOnline = m.cpu > 0 || (m.uptime && !m.uptime.includes('Click'));
        return (
          <div className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[10.5px] font-bold tracking-wide transition-all ${
            isWin
              ? 'bg-[#0284c7]/15 border-[#0284c7]/40 text-[#38bdf8]'
              : isWsl
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-slate-500'}`} />
            <span>{isWin ? 'WIN' : isWsl ? 'WSL' : 'SSH'}</span>
          </div>
        );
      }
    },
    {
      key: 'name',
      label: 'TÊN MÁY CHỦ',
      render: (m) => {
        const tagColor = 
          m.tag === 'Production' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
          m.tag === 'UAT' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
          m.tag === 'Dev' ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' :
          'bg-slate-800/60 text-slate-300 border-slate-700/50';
        return (
          <div className="flex items-center gap-2.5 py-0.5">
            <span className="w-7 h-7 rounded-lg bg-slate-800/60 border border-slate-700/40 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-all flex-shrink-0">
              <Server size={13} />
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-[13px] text-white group-hover:text-emerald-400 transition-colors truncate">
                {m.name}
              </span>
              {m.tag && (
                <span className={`text-[9.5px] font-mono px-2 py-0.5 rounded-md border font-medium flex-shrink-0 ${tagColor}`}>
                  {m.tag}
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'host',
      label: 'ĐỊA CHỈ KẾT NỐI',
      render: (m) => {
        const raw = m.host || `${m.user || 'root'}@${m.hostname || m.name}:${m.port || 22}`;
        return (
          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
            <span className="text-slate-600 group-hover:text-sky-400 transition-colors flex-shrink-0">
              <Terminal size={12} />
            </span>
            <span className="group-hover:text-slate-200 transition-colors truncate">
              {raw}
            </span>
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'THAO TÁC',
      align: 'right',
      render: (m) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <TableActionButton
            icon={Terminal}
            label="SSH"
            variant="primary"
            accentColor={accentColor}
            onClick={() => handleConnectMachine(m)}
            title="Kết nối SSH Terminal"
          />
          <TableActionButton
            icon={FolderSync}
            label="SFTP"
            onClick={() => handleOpenSftpFromCard(m)}
            title="Duyệt file SFTP"
            className="hover:border-sky-500/40 hover:text-sky-400"
          />
          <TableActionButton
            icon={Box}
            label="Docker"
            onClick={() => handleOpenDockerFromCard(m)}
            title="Quản lý Docker Containers"
            className="hover:border-purple-500/40 hover:text-purple-400"
          />
          <TableActionButton
            icon={Settings2}
            variant="ghost"
            onClick={() => {
              setEditingMachine(m);
              setIsAddModalOpen(true);
            }}
            title="Chỉnh sửa máy chủ"
            className="w-7 h-7 !px-0"
          />
          {m.id !== 'local_win' && (
            <TableActionButton
              icon={Trash2}
              variant="danger"
              onClick={() => handleRequestDeleteMachine(m.id)}
              title="Xóa máy chủ"
              className="w-7 h-7 !px-0"
            />
          )}
        </div>
      )
    }
  ], [accentColor, currentThemeConfig]);

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden font-sans select-none transition-colors duration-200"
      style={{
        backgroundColor: currentThemeConfig.bg,
        color: currentThemeConfig.text
      }}
    >
      {/* 1. TOP HEADER BAR WITH MAC TRAFFIC LIGHTS AND CONTROLS MATCHING SCREENSHOT */}
      <TopBar
        services={services}
        activeCategory={serviceCategory}
        onSelectCategory={setServiceCategory}
        onStartAll={handleStartAll}
        onStopAll={handleStopAll}
        onRestartAll={handleRestartAll}
        onKillAll={handleKillAll}
        onRefresh={() => {
          setIsRefreshing(true);
          setTimeout(() => setIsRefreshing(false), 500);
        }}
        isRefreshing={isRefreshing}
        onOpenSettings={(cat) => handleOpenSettings(cat || 'wsl_env')}
        onToggleWsl={() => {
          const next = !settings.enableWsl;
          handleSaveSettings({
            ...settings,
            enableWsl: next,
            defaultShell: next ? 'wsl' : 'powershell',
            serviceTarget: next ? (settings.serviceTarget || 'wsl') : 'windows'
          });
        }}
        enableWsl={settings.enableWsl}
        wslDistro={settings.wslDistro}
        isWindows={isWindows}
        settings={settings}
        terminalSessions={terminalSessions}
        activeSession={activeSession}
        onSelectSession={handleSwitchTerminalSession}
        onCloseSession={handleCloseTerminalSession}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        onClearLogs={() => setLogsMap({})}
        activeVpn={proxies.find(p => p.status === 'CONNECTED' || p.status === 'ACTIVE')}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenBackupRestore={() => setIsGlobalBackupModalOpen(true)}
      />

      {/* 2. BODY: SIDEBAR + MAIN SPLIT VIEW */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar matching screenshot */}
        <Sidebar
          currentNav={currentNav}
          onSelectNav={(id) => {
            if (id === 'settings') {
              handleOpenSettings('general');
            } else {
              setCurrentNav(id);
              setActiveSession(null);
            }
          }}
          runningCount={Array.isArray(services) ? services.filter((s) => s.statusInfo?.status === 'RUNNING').length : 0}
          totalCount={Array.isArray(services) ? services.length : 0}
          onRunQuickTask={handleRunTask}
          runningTask={currentRunningTask}
          machinesCount={Array.isArray(machines) ? machines.length : 0}
          identitiesCount={effectiveIdentities.length}
          keysCount={Array.isArray(sshKeys) ? sshKeys.length : 0}
          proxiesCount={Array.isArray(proxies) ? proxies.length : 0}
          tunnelsCount={Array.isArray(sshTunnels) ? sshTunnels.length : 0}
          terminalSessions={terminalSessions}
          activeSession={activeSession}
          onSelectSession={handleSwitchTerminalSession}
          onNewTerminal={handleOpenLocalTerminal}
          settings={settings}
          activeTag={activeTag}
          onSelectTag={setActiveTag}
          isCollapsed={isSidebarCollapsed}
        />

        {/* Dynamic Main View */}
        <main
          className="flex-1 flex flex-col h-full overflow-hidden transition-colors duration-200"
          style={{
            backgroundColor: currentThemeConfig.bg,
            color: currentThemeConfig.text
          }}
        >
          {/* 1. PERSISTENT TERMINAL CONTAINER (Keep-Alive) */}
          {terminalSessions.length > 0 && (
            <div 
              className="flex-1 flex flex-col h-full overflow-hidden"
              style={{ display: activeSession ? 'flex' : 'none' }}
            >
              <TerminalView
                session={activeSession || terminalSessions[terminalSessions.length - 1]}
                sessions={terminalSessions}
                onSwitchSession={handleSwitchTerminalSession}
                onCloseSession={handleCloseTerminalSession}
                onNewSession={handleOpenLocalTerminal}
                onOpenSftp={(sess) => {
                  setPreselectedHost(sess);
                  setCurrentNav('sftp');
                  setActiveSession(null);
                }}
                onBack={() => setActiveSession(null)}
                settings={settings}
                initialCommand={terminalInitialCommand}
              />
            </div>
          )}

          {/* 2. REGULAR NAVIGATION VIEWS (Visible when NOT focusing activeSession) */}
          <div 
            className="flex-1 flex flex-col h-full overflow-hidden"
            style={{ display: !activeSession ? 'flex' : 'none' }}
          >
            {currentNav === 'settings' ? (
            <SettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onBack={() => setCurrentNav('services')}
              initialCategory={settingsInitialCategory}
              isWindows={isWindows}
            />
          ) : currentNav === 'dashboard' ? (
            <DashboardView 
              machines={machines} 
              onConnectHost={(mach) => handleConnectMachine(mach)} 
              settings={settings}
            />
          ) : currentNav === 'hosts' ? (
            /* RTMUX REMOTE HOSTS & TMUX DASHBOARD */
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#161e2e]">
                <div className="flex items-center gap-2">
                  <Server size={18} className="text-emerald-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: currentThemeConfig.text }}>
                    {t.hostsTerminalTitle || 'Máy Chủ & Terminal (SSH / WSL)'} ({filteredMachines.length})
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {/* View Mode Toggle: List vs Grid */}
                  <div
                    className="flex items-center p-0.5 rounded-xl border"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border
                    }}
                  >
                    <button
                      onClick={() => handleSetHostsViewMode('list')}
                      className="p-1.5 rounded-lg transition-all"
                      style={{
                        backgroundColor: hostsViewMode === 'list' ? `${accentColor}25` : 'transparent',
                        color: hostsViewMode === 'list' ? accentColor : currentThemeConfig.textMuted
                      }}
                      title="Dạng danh sách (List View)"
                    >
                      <LayoutList size={14} />
                    </button>
                    <button
                      onClick={() => handleSetHostsViewMode('grid')}
                      className="p-1.5 rounded-lg transition-all"
                      style={{
                        backgroundColor: hostsViewMode === 'grid' ? `${accentColor}25` : 'transparent',
                        color: hostsViewMode === 'grid' ? accentColor : currentThemeConfig.textMuted
                      }}
                      title="Dạng thẻ lưới (Grid View)"
                    >
                      <LayoutGrid size={14} />
                    </button>
                  </div>

                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchHostPlaceholder || 'Tìm máy chủ / host...'}
                      className="w-56 h-8 border rounded-xl pl-8 pr-3 text-xs font-mono focus:outline-none"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput,
                        borderColor: currentThemeConfig.border,
                        color: currentThemeConfig.text
                      }}
                    />
                  </div>

                  <button
                    onClick={handleRescanSsh}
                    disabled={isRescanningSsh}
                    className="flex items-center gap-1.5 h-8 px-3 border text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 font-sans"
                    style={{
                      backgroundColor: `${accentColor}18`,
                      borderColor: `${accentColor}50`,
                      color: accentColor
                    }}
                    title={t.readSshConfig || 'Tự động đọc lại danh sách máy chủ từ ~/.ssh/config'}
                  >
                    <RotateCw size={13} className={isRescanningSsh ? 'animate-spin' : ''} />
                    <span>{t.readSshConfig || 'Đọc ~/.ssh/config'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingMachine(null);
                      setIsAddModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 h-8 px-3 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 font-sans"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Plus size={14} />
                    <span>{t.addHost || 'Thêm Host'}</span>
                  </button>
                </div>
              </div>

              {/* Hosts View: List Table vs Cards Grid */}
              {hostsViewMode === 'list' ? (
                <DataTable
                  columns={hostColumns}
                  data={filteredMachines}
                  themeConfig={currentThemeConfig}
                  onRowDoubleClick={(m) => handleConnectMachine(m)}
                  emptyMessage="Không tìm thấy máy chủ nào"
                  footer={(
                    <>
                      <div className="flex items-center gap-3">
                        <span>Tổng: <strong style={{ color: currentThemeConfig.text }}>{filteredMachines.length}</strong> máy chủ</span>
                        <span>•</span>
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {filteredMachines.filter(m => (m.cpu > 0 || (m.uptime && !m.uptime.includes('Click')))).length} Hoạt động (Online)
                        </span>
                        <span>•</span>
                        <span>{filteredMachines.filter(m => !(m.cpu > 0 || (m.uptime && !m.uptime.includes('Click')))).length} Chờ (Standby)</span>
                      </div>
                      <div className="text-[11px] hidden sm:block" style={{ color: currentThemeConfig.textMuted }}>
                        Nhấp đúp chuột vào hàng để mở ngay SSH Terminal
                      </div>
                    </>
                  )}
                />
              ) : (
                /* Machine Cards Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMachines.map((m) => (
                    <MachineCard
                      key={m.id}
                      machine={m}
                      onConnect={(mach) => handleConnectMachine(mach)}
                      onEdit={(mach) => {
                        setEditingMachine(mach);
                        setIsAddModalOpen(true);
                      }}
                      onOpenSftp={handleOpenSftpFromCard}
                      onOpenDocker={handleOpenDockerFromCard}
                      onDelete={handleRequestDeleteMachine}
                      settings={settings}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : currentNav === 'identity' ? (
            <IdentityView
              identities={effectiveIdentities}
              machines={machines}
              sshKeys={sshKeys}
              onAddNewIdentity={(newIdent) => {
                const next = [newIdent, ...customIdentities];
                setCustomIdentities(next);
                try { localStorage.setItem('service_tool_custom_identities', JSON.stringify(next)); } catch {}
              }}
              onDeleteIdentity={(id) => {
                const next = customIdentities.filter((x) => x.id !== id);
                setCustomIdentities(next);
                try { localStorage.setItem('service_tool_custom_identities', JSON.stringify(next)); } catch {}
              }}
              onConnectMachine={handleConnectMachine}
              settings={settings}
            />
          ) : currentNav === 'keychain' ? (
            <KeychainView 
              keys={sshKeys} 
              sshDirs={sshDirs} 
              onRescan={handleRescanSsh}
              settings={settings}
              onAddNewKey={(k) => {
                setSshKeys((prev) => [k, ...prev]);
                try { localStorage.setItem('service_tool_ssh_keys', JSON.stringify([k, ...sshKeys])); } catch {}
              }}
              onDeleteKey={(id) => {
                const next = sshKeys.filter((x) => x.id !== id);
                setSshKeys(next);
                try { localStorage.setItem('service_tool_ssh_keys', JSON.stringify(next)); } catch {}
              }}
            />
          ) : currentNav === 'proxy' ? (
            <ProxyView
              proxies={proxies}
              onAddNewProxy={(newProxy) => {
                const next = [newProxy, ...proxies];
                setProxies(next);
                try { localStorage.setItem('service_tool_proxies', JSON.stringify(next)); } catch {}
              }}
              onDeleteProxy={(id) => {
                const next = proxies.filter((x) => x.id !== id);
                setProxies(next);
                try { localStorage.setItem('service_tool_proxies', JSON.stringify(next)); } catch {}
              }}
              onToggleProxy={(id, explicitStatus) => {
                const next = proxies.map((p) => {
                  if (p.id !== id) return p;
                  const isActive = p.status === 'CONNECTED' || p.status === 'ACTIVE' || p.status === 'CONNECTING';
                  const nextStatus = explicitStatus || (isActive ? 'DISCONNECTED' : 'CONNECTING');
                  return { ...p, status: nextStatus };
                });
                setProxies(next);
                try { localStorage.setItem('service_tool_proxies', JSON.stringify(next)); } catch {}
              }}
              onUpdateProxy={(id, patch) => {
                const next = proxies.map((p) => p.id === id ? { ...p, ...patch } : p);
                setProxies(next);
                try { localStorage.setItem('service_tool_proxies', JSON.stringify(next)); } catch {}
              }}
              settings={settings}
            />
          ) : currentNav === 'snippets' ? (
            <SnippetsView 
              machines={machines}
              settings={settings}
              onRunSnippet={(cmd, targetMach) => handleConnectMachine(targetMach || machines[0], cmd)} 
            />
          ) : currentNav === 'port_forward' ? (
            <PortForwardView 
              tunnels={sshTunnels} 
              machines={machines}
              settings={settings}
              onToggleStatus={async (id) => {
                const target = sshTunnels.find(t => t.id === id);
                if (!target) return;
                const willBeActive = target.status !== 'ACTIVE';
                const next = sshTunnels.map((t) => t.id === id ? { ...t, status: willBeActive ? 'ACTIVE' : 'STOPPED' } : t);
                setSshTunnels(next);
                try { localStorage.setItem('service_tool_ssh_tunnels', JSON.stringify(next)); } catch {}

                if (willBeActive) {
                  try {
                    await startSshTunnel({
                      id: target.id,
                      host: target.via_server || target.viaServer || target.host || target.sshMachine || 'clt_dev1',
                      localPort: target.local_port || target.localPort || 8080,
                      remoteHost: target.remote_host || target.remoteHost || '127.0.0.1',
                      remotePort: target.remote_port || target.remotePort || 80,
                      useWsl: settings.enableWsl
                    });
                  } catch (e) {
                    console.error('Failed to spawn tunnel:', e);
                  }
                } else {
                  try {
                    await stopSshTunnel(target.id);
                  } catch (e) {
                    console.error('Failed to stop tunnel:', e);
                  }
                }
              }}
              onAddNewTunnel={(t) => {
                const next = [t, ...sshTunnels];
                setSshTunnels(next);
                try { localStorage.setItem('service_tool_ssh_tunnels', JSON.stringify(next)); } catch {}
              }}
              onDeleteTunnel={(id) => {
                const next = sshTunnels.filter((x) => x.id !== id);
                setSshTunnels(next);
                try { localStorage.setItem('service_tool_ssh_tunnels', JSON.stringify(next)); } catch {}
              }}
              onRescan={handleRescanSsh}
            />
          ) : currentNav === 'sftp' ? (
            <SftpView 
              machines={machines} 
              preselectedHost={preselectedHost} 
              settings={settings}
              onOpenTerminal={(mach, path) => handleConnectMachine(mach, path ? `cd "${path}"` : undefined)}
            />
          ) : currentNav === 'docker' ? (
            <DockerView 
              machines={machines} 
              preselectedHost={preselectedHost}
              settings={settings}
              onOpenTerminalWithCommand={(cmd, targetMach) => handleConnectMachine(targetMach || machines[0], cmd)}
            />
          ) : currentNav === 'env_vars' ? (
            <EnvSetupView
              services={services}
              selectedServiceId={selectedServiceId}
              onSelectService={setSelectedServiceId}
              onSaveOverrides={handleSaveEnvOverrides}
              onChangeProfile={handleChangeProfile}
              onCreateProfile={async (svcId, profileKey, profileData) => {
                await fetch(`/api/services/${svcId}/profiles`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ profileKey, profileData })
                });
                await reloadMicroservices();
              }}
              onDeleteProfile={async (svcId, profileKey) => {
                await fetch(`/api/services/${svcId}/profiles/${profileKey}`, { method: 'DELETE' });
                await reloadMicroservices();
              }}
              onRestartService={handleRestartService}
              settings={settings}
            />
          ) : currentNav === 'categories' ? (
            <CategoriesView 
              services={services} 
              onReloadServices={reloadMicroservices}
              settings={settings} 
            />
          ) : currentNav === 'manage_services' || currentNav === 'services_config' ? (
            <ManageServicesView 
              services={services} 
              onReloadServices={reloadMicroservices}
              onAddNewService={(newSvc) => setServices(prev => [...prev, newSvc])} 
              onDeleteService={(id) => setServices(prev => prev.filter(s => s.id !== id))} 
              settings={settings} 
            />
          ) : currentNav === 'scripts' ? (
            <ScriptsView 
              services={services} 
              settings={settings} 
              onRunTask={handleRunTask}
              currentRunningTask={currentRunningTask}
              lastTaskLog={lastTaskLog}
            />
          ) : (
            /* Microservices Dev Monitor */
            <ServiceMonitorView
              services={services}
              logsMap={logsMap}
              selectedServiceId={selectedServiceId}
              onSelectService={setSelectedServiceId}
              onStartService={handleStartService}
              onStopService={handleStopService}
              onRestartService={handleRestartService}
              onKillPort={handleKillPort}
              onClearLogs={handleClearLogs}
              onOpenEnvModal={setEnvModalService}
              onChangeProfile={handleChangeProfile}
              onStartGroup={handleStartGroup}
              onStopGroup={handleStopGroup}
              onStartAll={handleStartAll}
              onStopAll={handleStopAll}
              settings={settings}
            />
          )}
          </div>
        </main>
      </div>

      {/* Backup / Restore Modal */}
      <BackupRestoreModal
        isOpen={isGlobalBackupModalOpen}
        onClose={() => setIsGlobalBackupModalOpen(false)}
        onReloadAll={reloadMicroservices}
        currentThemeConfig={currentThemeConfig}
        accentColor={accentColor}
      />

      {/* Env Modal */}
      {envModalService && (
        <EnvModal
          service={envModalService}
          isOpen={!!envModalService}
          onClose={() => setEnvModalService(null)}
          onSaveOverrides={handleSaveEnvOverrides}
          settings={settings}
        />
      )}

      {/* Machine Add / Edit Modal */}
      <MachineModal
        isOpen={isAddModalOpen}
        initialMachine={editingMachine}
        availableKeys={sshKeys}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingMachine(null);
        }}
        onSave={handleSaveMachine}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Confirm Delete Machine Modal */}
      <ConfirmModal
        isOpen={!!machineToDelete}
        title="Xác nhận xóa máy chủ"
        message="Bạn có chắc chắn muốn xóa máy chủ này khỏi danh sách quản lý không?"
        itemName={machineToDelete ? `${machineToDelete.name} (${machineToDelete.host || 'localhost'})` : ''}
        confirmText="Xóa máy chủ"
        cancelText="Hủy"
        onConfirm={handleConfirmDeleteMachine}
        onCancel={() => setMachineToDelete(null)}
        settings={settings}
      />

      {/* Command Palette / Quick Feature Search Modal */}
      <CommandPaletteModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        machines={displayedMachines}
        onConnectSsh={(m) => {
          handleConnectMachine(m);
          setIsSearchModalOpen(false);
        }}
        onOpenSftp={(m) => {
          setPreselectedHost(m);
          setCurrentNav('sftp');
          setActiveSession(null);
          setIsSearchModalOpen(false);
        }}
        onOpenLocalShell={() => {
          handleOpenLocalTerminal();
          setIsSearchModalOpen(false);
        }}
        onNavigate={(navId) => {
          if (navId === 'settings') {
            handleOpenSettings('general');
          } else {
            setCurrentNav(navId);
            setActiveSession(null);
          }
          setIsSearchModalOpen(false);
        }}
        settings={settings}
      />
    </div>
  );
}
