import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Check, 
  Search, 
  Radio, 
  Server, 
  X,
  Play,
  Square,
  LayoutList,
  LayoutGrid,
  FileCode,
  Copy,
  AlertTriangle,
  Upload,
  RefreshCw,
  FolderOpen,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  User,
  UserCheck,
  Loader2,
  ShieldAlert,
  RotateCw,
  Edit2
} from 'lucide-react';
import { THEME_CONFIGS } from '../../constants/palettes';
import DataTable, { TableActionButton } from '../common/DataTable';
import ConfirmModal from '../common/ConfirmModal';
import { translations } from '../../i18n/translations';
import { 
  checkVpnToolsStatus, 
  probeVpnEndpoint, 
  toggleVpnTunnel,
  scanLocalVpnConfigs,
  getVpnLiveStatus,
  checkIsAdmin,
  restartAsAdmin
} from '../../services/sshClient';

export default function ProxyView({
  proxies = [],
  onAddNewProxy,
  onDeleteProxy,
  onToggleProxy,
  onUpdateProxy,
  settings = {}
}) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';
  const lang = settings?.language || 'vi';
  const t = translations[lang] || translations.vi;

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'WireGuard' | 'OpenVPN'
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingConfig, setViewingConfig] = useState(null);
  const [copied, setCopied] = useState(false);
  const [toolsStatus, setToolsStatus] = useState(null);
  const [probingMap, setProbingMap] = useState({});
  const [latencies, setLatencies] = useState({});
  const [isScanning, setIsScanning] = useState(false);
  const [deleteTargetProxy, setDeleteTargetProxy] = useState(null);
  const [adminPromptModal, setAdminPromptModal] = useState(false);
  const connectingStartedRef = useRef({});

  // Quick Auth / Credential Modal State
  const [authEditingTunnel, setAuthEditingTunnel] = useState(null);
  const [authMode, setAuthMode] = useState('userpass'); // 'none' | 'userpass'
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authShowPassword, setAuthShowPassword] = useState(false);

  // Rename Profile Modal State
  const [renamingProxy, setRenamingProxy] = useState(null);
  const [newProxyName, setNewProxyName] = useState('');

  useEffect(() => {
    if (!isAddModalOpen && !viewingConfig && !adminPromptModal && !authEditingTunnel && !renamingProxy) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (viewingConfig) setViewingConfig(null);
        else if (adminPromptModal) setAdminPromptModal(false);
        else if (authEditingTunnel) setAuthEditingTunnel(null);
        else if (renamingProxy) setRenamingProxy(null);
        else if (isAddModalOpen) setIsAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, viewingConfig, adminPromptModal, authEditingTunnel, renamingProxy]);

  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('service_tool_proxy_view_mode') || 'list';
    } catch (_) {
      return 'list';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('service_tool_proxy_view_mode', mode);
    } catch (_) {}
  };

  // Check WireGuard / OpenVPN tools status & auto-scan on startup
  useEffect(() => {
    checkVpnToolsStatus().then(status => {
      if (status) setToolsStatus(status);
    }).catch(() => {});

    handleScanLocalConfigs();
  }, []);

  const handleScanLocalConfigs = async () => {
    setIsScanning(true);
    try {
      const found = await scanLocalVpnConfigs();
      if (Array.isArray(found) && found.length > 0 && onAddNewProxy) {
        found.forEach(item => {
          if (!proxies.some(p => p.id === item.id || p.name === item.name || (p.filePath && item.file_path && p.filePath === item.file_path))) {
            onAddNewProxy({
              id: item.id,
              name: item.name,
              type: item.profile_type,
              endpoint: item.endpoint,
              interfaceIp: item.interface_ip,
              allowedIps: item.allowed_ips,
              status: 'DISCONNECTED',
              lastHandshake: 'Chưa kết nối',
              configContent: item.config_content,
              filePath: item.file_path,
              requiresAuth: item.requires_auth === true,
              authType: item.requires_auth === true ? 'userpass' : 'none',
              source: 'Phát hiện cục bộ'
            });
          }
        });
      }
    } catch (err) {
      console.warn('Scan local VPN configs error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Form State for Adding new VPN Profile
  const [formType, setFormType] = useState('WireGuard'); // 'WireGuard' | 'OpenVPN'
  const [formName, setFormName] = useState('');
  const [formEndpoint, setFormEndpoint] = useState('');
  const [formInterfaceIp, setFormInterfaceIp] = useState('');
  const [formAllowedIps, setFormAllowedIps] = useState('0.0.0.0/0');
  const [formConfigText, setFormConfigText] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formShowPassword, setFormShowPassword] = useState(false);
  const [formRequiresAuth, setFormRequiresAuth] = useState(false);

  // Handle auto-parsing uploaded file (.conf or .ovpn)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      setFormConfigText(content);
      
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      if (!formName) setFormName(fileName);

      if (file.name.endsWith('.conf') || content.includes('[Interface]')) {
        setFormType('WireGuard');
        const addrMatch = content.match(/Address\s*=\s*([^\r\n]+)/i);
        if (addrMatch) setFormInterfaceIp(addrMatch[1].trim());

        const endpointMatch = content.match(/Endpoint\s*=\s*([^\r\n]+)/i);
        if (endpointMatch) setFormEndpoint(endpointMatch[1].trim());

        const allowedMatch = content.match(/AllowedIPs\s*=\s*([^\r\n]+)/i);
        if (allowedMatch) setFormAllowedIps(allowedMatch[1].trim());
        setFormRequiresAuth(false);
      } else {
        setFormType('OpenVPN');
        const remoteMatch = content.match(/remote\s+([^\s\r\n]+)(?:\s+(\d+))?/i);
        if (remoteMatch) {
          const host = remoteMatch[1];
          const port = remoteMatch[2] || '1194';
          setFormEndpoint(`${host}:${port}`);
        }

        // Auto-parse Route e.g. "route 192.168.200.0 255.255.255.0"
        const routeMatch = content.match(/route\s+([^\s\r\n]+)\s+([^\s\r\n]+)/i);
        if (routeMatch) {
          const mask = routeMatch[2];
          let cidr = '/24';
          if (mask === '255.255.255.0') cidr = '/24';
          else if (mask === '255.255.0.0') cidr = '/16';
          else if (mask === '255.0.0.0') cidr = '/8';
          else if (mask === '255.255.255.255') cidr = '/32';
          setFormAllowedIps(`${routeMatch[1]}${cidr}`);
        }

        // Auto-detect auth-user-pass directive
        if (content.includes('auth-user-pass')) {
          setFormRequiresAuth(true);
        }
      }
      setIsAddModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formName.trim() || !formEndpoint.trim()) return;

    const newTunnel = {
      id: `vpn_${formType.toLowerCase()}_${Date.now()}`,
      name: formName.trim(),
      type: formType,
      endpoint: formEndpoint.trim(),
      interfaceIp: formInterfaceIp.trim() || 'Auto',
      allowedIps: formAllowedIps.trim() || '0.0.0.0/0',
      status: 'DISCONNECTED',
      lastHandshake: 'Chưa kết nối',
      configContent: formConfigText.trim() || `# ${formType} config for ${formName}\nEndpoint = ${formEndpoint}`,
      username: formUsername.trim() || null,
      password: formPassword.trim() || null,
      requiresAuth: formRequiresAuth || !!formUsername.trim(),
      updatedAt: 'Vừa xong'
    };

    if (onAddNewProxy) {
      onAddNewProxy(newTunnel);
    }

    setFormName('');
    setFormEndpoint('');
    setFormInterfaceIp('');
    setFormAllowedIps('0.0.0.0/0');
    setFormConfigText('');
    setFormUsername('');
    setFormPassword('');
    setFormRequiresAuth(false);
    setIsAddModalOpen(false);
  };

  const handleOpenAuthModal = (item) => {
    setAuthEditingTunnel(item);
    const isNone = item.requiresAuth === false || item.authType === 'none';
    setAuthMode(isNone ? 'none' : 'userpass');
    setAuthUsername(item.username || '');
    setAuthPassword(item.password || '');
    setAuthShowPassword(false);
  };

  const handleSaveAuthCredentials = (e) => {
    e.preventDefault();
    if (!authEditingTunnel) return;

    const patch = authMode === 'none' ? {
      username: null,
      password: null,
      requiresAuth: false,
      authType: 'none'
    } : {
      username: authUsername.trim() || null,
      password: authPassword.trim() || null,
      requiresAuth: true,
      authType: 'userpass'
    };

    if (onUpdateProxy) {
      onUpdateProxy(authEditingTunnel.id, patch);
    }

    setAuthEditingTunnel(null);
  };

  const handleStartRename = (item) => {
    setRenamingProxy(item);
    setNewProxyName(item.name || '');
  };

  const handleSaveRename = (e) => {
    if (e) e.preventDefault();
    if (!renamingProxy || !newProxyName.trim()) return;
    const trimmed = newProxyName.trim();
    if (onUpdateProxy) {
      onUpdateProxy(renamingProxy.id, { name: trimmed });
    }
    setRenamingProxy(null);
    setNewProxyName('');
  };

  const handleProbeEndpoint = async (item) => {
    if (!item.endpoint) return;
    setProbingMap(prev => ({ ...prev, [item.id]: true }));
    try {
      const res = await probeVpnEndpoint(item.endpoint);
      if (res && res.latencyMs) {
        setLatencies(prev => ({ ...prev, [item.id]: `${res.latencyMs}ms` }));
      }
    } catch (_) {
      setLatencies(prev => ({ ...prev, [item.id]: 'Timeout' }));
    } finally {
      setProbingMap(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const handleToggleTunnel = async (item) => {
    const isConnected = item.status === 'CONNECTED' || item.status === 'ACTIVE';
    const isConnecting = item.status === 'CONNECTING';
    const willConnect = !isConnected && !isConnecting;

    const requiresAuth = item.requiresAuth === true || (item.requiresAuth !== false && item.authType === 'userpass');

    // If OpenVPN explicitly requires auth and has no credentials, prompt user first
    if (
      willConnect && 
      (item.type || '').toLowerCase().includes('openvpn') && 
      requiresAuth && 
      (!item.username || !item.password)
    ) {
      handleOpenAuthModal(item);
      return;
    }

    // Check if app has Administrator privileges when connecting VPN
    if (willConnect) {
      const isAdmin = await checkIsAdmin();
      if (!isAdmin) {
        setAdminPromptModal(true);
        return;
      }
    }

    if (onToggleProxy) {
      onToggleProxy(item.id, willConnect ? 'CONNECTING' : 'DISCONNECTED');
    }

    if (willConnect) {
      connectingStartedRef.current[item.id] = Date.now();
    } else {
      delete connectingStartedRef.current[item.id];
    }

    try {
      const res = await toggleVpnTunnel({
        tunnelName: item.name.replace(/\s+/g, '_'),
        profileType: item.type,
        action: willConnect ? 'connect' : 'disconnect',
        configContent: item.configContent,
        username: item.username,
        password: item.password
      });
      if (res && res.success === false) {
        if (onToggleProxy) {
          onToggleProxy(item.id, 'DISCONNECTED');
        }
      } else if (willConnect) {
        handleProbeEndpoint(item);
      }
    } catch (err) {
      console.warn('VPN toggle failed:', err);
      if (onToggleProxy) {
        onToggleProxy(item.id, 'DISCONNECTED');
      }
    }
  };

  // Clean real proxies (strip any old mock items)
  const cleanProxies = (Array.isArray(proxies) ? proxies : []).filter(p => 
    p && 
    p.id !== 'vpn_wg_office' && 
    p.id !== 'vpn_ovpn_prod' && 
    !p.name?.includes('Office WireGuard') && 
    !p.name?.includes('Singapore Prod') && 
    !p.name?.includes('SOCKS5')
  );

  // Live status polling for VPN adapters (queries Windows network adapter status & IP)
  useEffect(() => {
    let timer = null;
    let isCancelled = false;

    const pollStatus = async () => {
      const activeTunnels = cleanProxies.filter(p => p.status === 'CONNECTED' || p.status === 'ACTIVE' || p.status === 'CONNECTING');
      if (activeTunnels.length === 0) {
        connectingStartedRef.current = {};
        return;
      }

      for (const tunnel of activeTunnels) {
        if (isCancelled) break;
        try {
          const live = await getVpnLiveStatus(tunnel.name);
          if (isCancelled) break;

          if (live && live.is_connected) {
            delete connectingStartedRef.current[tunnel.id];
            if (tunnel.status !== 'CONNECTED' || (live.assigned_ip && tunnel.assignedIp !== live.assigned_ip)) {
              if (onUpdateProxy) {
                onUpdateProxy(tunnel.id, {
                  status: 'CONNECTED',
                  assignedIp: live.assigned_ip || tunnel.assignedIp || tunnel.interfaceIp,
                  lastHandshake: 'Vừa xong'
                });
              }
            }
          } else if (tunnel.status === 'CONNECTED') {
            if (onUpdateProxy) {
              onUpdateProxy(tunnel.id, {
                status: 'DISCONNECTED',
                lastHandshake: 'Chưa kết nối'
              });
            }
          } else if (tunnel.status === 'CONNECTING') {
            if (!connectingStartedRef.current[tunnel.id]) {
              connectingStartedRef.current[tunnel.id] = Date.now();
            }
            const elapsed = Date.now() - connectingStartedRef.current[tunnel.id];

            // If background process terminated, immediately abort and report status
            if (live && !live.is_process_running && elapsed > 1500) {
              delete connectingStartedRef.current[tunnel.id];
              if (onUpdateProxy) {
                onUpdateProxy(tunnel.id, {
                  status: 'DISCONNECTED',
                  lastHandshake: live.last_error || 'Không thể kết nối (Tiến trình dừng)'
                });
              }
            } else if (elapsed > 12000) {
              // Timeout after 12s
              delete connectingStartedRef.current[tunnel.id];
              if (onUpdateProxy) {
                onUpdateProxy(tunnel.id, {
                  status: 'DISCONNECTED',
                  lastHandshake: live?.last_error || 'Hết thời gian chờ kết nối (Timeout)'
                });
              }
              // Kill lingering engine process
              toggleVpnTunnel({
                tunnelName: tunnel.name.replace(/\s+/g, '_'),
                profileType: tunnel.type,
                action: 'disconnect'
              }).catch(() => {});
            }
          }
        } catch (_) {}
      }
    };

    pollStatus();
    timer = setInterval(pollStatus, 2000);

    return () => {
      isCancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [cleanProxies, onUpdateProxy]);

  const filtered = cleanProxies.filter((p) => {
    const matchesTab = activeTab === 'ALL' || (p.type || '').toLowerCase() === activeTab.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (p.name || '').toLowerCase().includes(query) ||
      (p.endpoint || p.host || '').toLowerCase().includes(query) ||
      (p.interfaceIp || '').toLowerCase().includes(query) ||
      (p.allowedIps || p.targetScope || '').toLowerCase().includes(query) ||
      (p.username || '').toLowerCase().includes(query);
    return matchesTab && matchesSearch;
  });

  const wireguardCount = cleanProxies.filter(p => (p.type || '').toLowerCase().includes('wireguard')).length;
  const openvpnCount = cleanProxies.filter(p => (p.type || '').toLowerCase().includes('openvpn')).length;
  const activeCount = cleanProxies.filter(p => p.status === 'CONNECTED' || p.status === 'ACTIVE').length;

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      {/* 1. Header Banner */}
      <div 
        className="relative overflow-hidden rounded-2xl p-5 border transition-all"
        style={{
          backgroundColor: currentThemeConfig.card,
          borderColor: currentThemeConfig.border
        }}
      >
        <div 
          className="absolute right-0 top-0 w-72 h-full blur-3xl pointer-events-none"
          style={{ backgroundColor: `${accentColor}10` }}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <h2 className="text-base font-bold tracking-tight flex items-center gap-2" style={{ color: currentThemeConfig.text }}>
              <ShieldCheck size={18} style={{ color: accentColor }} />
              <span>Mạng Riêng Ảo (VPN)</span>
            </h2>
            <p className="text-xs" style={{ color: currentThemeConfig.textMuted }}>
              Định tuyến kết nối an toàn WireGuard &amp; OpenVPN (hỗ trợ User/Password hoặc Certificate).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label 
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border cursor-pointer hover:border-sky-500/50 text-slate-300 hover:text-white transition-all shadow-sm active:scale-95"
              style={{ backgroundColor: currentThemeConfig.innerInput, borderColor: currentThemeConfig.border }}
              title="Nhập file .conf hoặc .ovpn"
            >
              <Upload size={13} className="text-sky-400" />
              <span>Import Config</span>
              <input type="file" accept=".conf,.ovpn" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              <Plus size={14} />
              <span>Thêm Tunnel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tooling Detection Info Bar */}
      {toolsStatus && !toolsStatus.wireguardInstalled && !toolsStatus.openvpnInstalled && (
        <div 
          className="px-3.5 py-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
          style={{
            backgroundColor: `${accentColor}08`,
            borderColor: `${accentColor}25`
          }}
        >
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle size={14} />
            <span>Chưa phát hiện CLI WireGuard/OpenVPN. Cài nhanh bằng winget:</span>
          </div>
          <button 
            onClick={() => navigator.clipboard.writeText('winget install WireGuard.WireGuard')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[11px] text-slate-300 hover:text-white transition-all"
            style={{ backgroundColor: currentThemeConfig.innerInput, borderColor: currentThemeConfig.border }}
          >
            <Copy size={11} />
            <span>winget install WireGuard.WireGuard</span>
          </button>
        </div>
      )}

      {/* 3. Filter Tabs, Search & View Mode Switcher */}
      {cleanProxies.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl border flex-shrink-0" style={{ backgroundColor: currentThemeConfig.innerInput, borderColor: currentThemeConfig.border }}>
            <button
              onClick={() => setActiveTab('ALL')}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: activeTab === 'ALL' ? `${accentColor}25` : 'transparent',
                color: activeTab === 'ALL' ? accentColor : currentThemeConfig.textMuted
              }}
            >
              Tất cả ({cleanProxies.length})
            </button>
            <button
              onClick={() => setActiveTab('WireGuard')}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
              style={{
                backgroundColor: activeTab === 'WireGuard' ? `${accentColor}25` : 'transparent',
                color: activeTab === 'WireGuard' ? accentColor : currentThemeConfig.textMuted
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" />
              WireGuard ({wireguardCount})
            </button>
            <button
              onClick={() => setActiveTab('OpenVPN')}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
              style={{
                backgroundColor: activeTab === 'OpenVPN' ? `${accentColor}25` : 'transparent',
                color: activeTab === 'OpenVPN' ? accentColor : currentThemeConfig.textMuted
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
              OpenVPN ({openvpnCount})
            </button>
          </div>

          {/* Search & Mode Switcher */}
          <div className="flex items-center gap-2.5 flex-1 max-w-md justify-end">
            <button
              onClick={handleScanLocalConfigs}
              disabled={isScanning}
              className="p-1.5 rounded-xl border transition-all text-slate-400 hover:text-white"
              style={{ backgroundColor: currentThemeConfig.innerInput, borderColor: currentThemeConfig.border }}
              title="Quét lại file cấu hình trên máy"
            >
              <RefreshCw size={14} className={isScanning ? 'animate-spin text-emerald-400' : ''} />
            </button>

            {/* View Mode Toggle: List vs Grid */}
            <div
              className="flex items-center p-0.5 rounded-xl border flex-shrink-0"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border
              }}
            >
              <button
                onClick={() => handleSetViewMode('list')}
                className="p-1.5 rounded-lg transition-all"
                style={{
                  backgroundColor: viewMode === 'list' ? `${accentColor}25` : 'transparent',
                  color: viewMode === 'list' ? accentColor : currentThemeConfig.textMuted
                }}
                title="Dạng danh sách (List View - Mặc định)"
              >
                <LayoutList size={14} />
              </button>
              <button
                onClick={() => handleSetViewMode('grid')}
                className="p-1.5 rounded-lg transition-all"
                style={{
                  backgroundColor: viewMode === 'grid' ? `${accentColor}25` : 'transparent',
                  color: viewMode === 'grid' ? accentColor : currentThemeConfig.textMuted
                }}
                title="Dạng thẻ lưới (Grid View)"
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: currentThemeConfig.textMuted }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên VPN, endpoint, username..."
                className="w-full h-8 pl-8 pr-3 rounded-xl border text-xs focus:outline-none transition-all font-mono"
                style={{
                  backgroundColor: currentThemeConfig.innerInput,
                  borderColor: currentThemeConfig.border,
                  color: currentThemeConfig.text
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. VPN Display: Empty State vs List vs Grid */}
      {cleanProxies.length === 0 ? (
        <div 
          className="rounded-2xl border p-12 flex flex-col items-center justify-center text-center space-y-4 shadow-sm"
          style={{
            backgroundColor: currentThemeConfig.card,
            borderColor: currentThemeConfig.border
          }}
        >
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center border"
            style={{
              backgroundColor: `${accentColor}12`,
              borderColor: `${accentColor}30`,
              color: accentColor
            }}
          >
            <ShieldCheck size={28} />
          </div>

          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-white">Chưa có kết nối VPN nào</h3>
            <p className="text-xs text-slate-400">
              Nhập file cấu hình WireGuard (.conf) hoặc OpenVPN (.ovpn) thực tế của bạn để định tuyến bảo mật vào hạ tầng mạng nội bộ.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <label 
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer transition-all active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              <Upload size={14} />
              <span>Import file .conf / .ovpn</span>
              <input type="file" accept=".conf,.ovpn" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border text-slate-300 hover:text-white transition-all active:scale-95"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border
              }}
            >
              <Plus size={14} />
              <span>Tạo thủ công</span>
            </button>

            <button
              onClick={handleScanLocalConfigs}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border transition-all"
              style={{ borderColor: currentThemeConfig.border }}
              title="Quét lại hệ thống tìm file .conf/.ovpn"
            >
              <RefreshCw size={13} className={isScanning ? 'animate-spin text-emerald-400' : ''} />
              <span>Quét lại máy tính</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <DataTable
          columns={[
            {
              key: 'tunnel',
              label: 'ĐƯỜNG HẦM (TUNNEL)',
              render: (item) => {
                const isConnected = item.status === 'CONNECTED' || item.status === 'ACTIVE';
                const isConnecting = item.status === 'CONNECTING';
                return (
                  <div className="flex items-center gap-3 py-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTunnel(item);
                      }}
                      className="w-8 h-8 rounded-lg border inline-flex items-center justify-center transition-all shadow-sm active:scale-95 flex-shrink-0"
                      style={{
                        backgroundColor: isConnected ? `${accentColor}20` : isConnecting ? 'rgba(245, 158, 11, 0.15)' : currentThemeConfig.innerInput,
                        borderColor: isConnected ? `${accentColor}60` : isConnecting ? 'rgba(245, 158, 11, 0.4)' : currentThemeConfig.border,
                        color: isConnected ? accentColor : isConnecting ? '#f59e0b' : currentThemeConfig.textMuted
                      }}
                      title={isConnected ? 'Ngắt kết nối VPN' : isConnecting ? 'Đang kết nối... (Bấm để ngắt)' : 'Bật kết nối VPN'}
                    >
                      {isConnecting ? (
                        <Loader2 size={13} className="animate-spin text-amber-400" />
                      ) : isConnected ? (
                        <Square size={12} fill="currentColor" />
                      ) : (
                        <Play size={12} fill="currentColor" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(item);
                          }}
                          className="font-bold text-[13px] text-white hover:text-emerald-400 transition-colors truncate cursor-pointer"
                          title="Bấm để đổi tên profile VPN"
                        >
                          {item.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(item);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-emerald-400 hover:bg-slate-800 transition-colors flex-shrink-0"
                          title="Đổi tên profile"
                        >
                          <Edit2 size={11} />
                        </button>
                        {isConnecting ? (
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Loader2 size={9} className="animate-spin" />
                            <span>ĐANG KẾT NỐI...</span>
                          </span>
                        ) : isConnected ? (
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse flex-shrink-0" />
                            <span>ĐÃ KẾT NỐI</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono text-slate-500 bg-slate-800/40 border border-slate-700/50">
                            CHƯA KẾT NỐI
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                        IP: <span className="text-sky-400">{item.assignedIp || item.interfaceIp || 'Auto'}</span>
                        <span className="text-slate-600 mx-1.5">•</span>
                        Trạng thái: <span className={
                          isConnected 
                            ? 'text-emerald-400 font-semibold' 
                            : isConnecting 
                            ? 'text-amber-400 font-medium' 
                            : (item.lastHandshake && item.lastHandshake !== 'Chưa kết nối' && !item.lastHandshake.includes('Vừa xong') ? 'text-rose-400 font-medium' : 'text-slate-400')
                        }>
                          {isConnected ? 'Đang hoạt động' : isConnecting ? 'Đang thiết lập...' : (item.lastHandshake || 'Chưa kết nối')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
            },
            {
              key: 'type',
              label: 'GIAO THỨC & XÁC THỰC',
              width: 'w-36',
              align: 'center',
              render: (item) => {
                const isWg = (item.type || '').toLowerCase().includes('wireguard');
                const isNoneAuth = item.requiresAuth === false || item.authType === 'none';
                return (
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-md font-mono font-bold uppercase border ${
                        isWg 
                          ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' 
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      {isWg ? 'WireGuard' : 'OpenVPN'}
                    </span>
                    {!isWg && (
                      isNoneAuth ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAuthModal(item);
                          }}
                          className="text-[10px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800 transition-colors"
                          title="Không cần tài khoản (Certificate only). Bấm để chỉnh sửa"
                        >
                          <ShieldCheck size={10} className="text-slate-400" />
                          <span>Cert only (No Auth)</span>
                        </button>
                      ) : item.username ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAuthModal(item);
                          }}
                          className="text-[10px] font-mono text-emerald-400 truncate max-w-[130px] flex items-center gap-1 hover:underline"
                          title={`Tài khoản: ${item.username}. Bấm để chỉnh sửa`}
                        >
                          <User size={10} />
                          <span>{item.username}</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAuthModal(item);
                          }}
                          className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                          title="Yêu cầu tài khoản & mật khẩu OpenVPN. Bấm để nhập thông tin hoặc đổi sang Không cần xác thực"
                        >
                          <KeyRound size={10} />
                          <span>Cần User/Pass</span>
                        </button>
                      )
                    )}
                  </div>
                );
              }
            },
            {
              key: 'endpoint',
              label: 'MÁY CHỦ & ĐỘ TRỄ',
              width: 'w-44',
              render: (item) => {
                const isProbing = probingMap[item.id];
                const latency = latencies[item.id] || item.latency;
                return (
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-300 font-medium truncate max-w-[130px]" title={item.endpoint || item.host}>
                      {item.endpoint || item.host || '-'}
                    </span>
                    {item.endpoint && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProbeEndpoint(item);
                        }}
                        title="Kiểm tra độ trễ (Ping Test)"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-emerald-400 flex-shrink-0"
                      >
                        <Radio size={9} className={isProbing ? 'animate-spin' : ''} />
                        <span>{latency || 'Ping'}</span>
                      </button>
                    )}
                  </div>
                );
              }
            },
            {
              key: 'allowedIps',
              label: 'SUBNET ĐỊNH TUYẾN',
              width: 'w-36',
              render: (item) => (
                <div 
                  className="font-mono text-[11px] text-slate-400 truncate max-w-[140px]" 
                  title={item.allowedIps || item.targetScope || '0.0.0.0/0'}
                >
                  {item.allowedIps || item.targetScope || '0.0.0.0/0'}
                </div>
              )
            },
            {
              key: 'actions',
              label: 'TRẠNG THÁI & THAO TÁC',
              align: 'right',
              width: 'w-44',
              render: (item) => {
                const isConnected = item.status === 'CONNECTED' || item.status === 'ACTIVE';
                const isConnecting = item.status === 'CONNECTING';
                const isWg = (item.type || '').toLowerCase().includes('wireguard');
                return (
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9.5px] font-mono font-bold ${
                      isConnecting
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : isConnected
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-800/50 border-slate-700/40 text-slate-500'
                    }`}>
                      {isConnecting ? (
                        <Loader2 size={10} className="animate-spin text-amber-400" />
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      )}
                      <span>{isConnecting ? 'CONNECTING...' : isConnected ? 'ON' : 'OFF'}</span>
                    </span>

                    {!isWg && (
                      <TableActionButton
                        icon={KeyRound}
                        label="Auth"
                        onClick={() => handleOpenAuthModal(item)}
                        title={
                          item.requiresAuth === false || item.authType === 'none'
                            ? 'Xác thực: Không cần tài khoản (Cert only). Bấm để sửa'
                            : item.username
                            ? `Tài khoản: ${item.username} (Bấm để sửa)`
                            : 'Cấu hình tài khoản & mật khẩu OpenVPN'
                        }
                        className={
                          item.requiresAuth === false || item.authType === 'none'
                            ? 'text-slate-400 border-slate-700 hover:text-white'
                            : item.username
                            ? 'hover:border-emerald-500/40 hover:text-emerald-400'
                            : 'text-amber-400 border-amber-500/30'
                        }
                      />
                    )}

                    <TableActionButton
                      icon={Edit2}
                      label="Đổi tên"
                      onClick={() => handleStartRename(item)}
                      title="Đổi tên profile VPN này"
                      className="hover:border-emerald-500/40 hover:text-emerald-400"
                    />

                    <TableActionButton
                      icon={FileCode}
                      label="Config"
                      onClick={() => setViewingConfig(item)}
                      title="Xem chi tiết cấu hình"
                      className="hover:border-sky-500/40 hover:text-sky-400"
                    />
                    {onDeleteProxy && (
                      <TableActionButton
                        icon={Trash2}
                        variant="danger"
                        onClick={() => setDeleteTargetProxy(item)}
                        title="Xóa VPN này"
                        className="w-7 h-7 !px-0"
                      />
                    )}
                  </div>
                );
              }
            }
          ]}
          data={filtered}
          themeConfig={currentThemeConfig}
          emptyMessage="Không tìm thấy cấu hình VPN nào phù hợp."
          footer={(
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <span>Tổng: <strong style={{ color: currentThemeConfig.text }}>{filtered.length}</strong> tunnels</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">{activeCount} đang kết nối</span>
              </div>
              <span className="text-[11px] text-slate-500">Hỗ trợ đầy đủ WireGuard (.conf) và OpenVPN (.ovpn)</span>
            </div>
          )}
        />
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isConnected = item.status === 'CONNECTED' || item.status === 'ACTIVE';
            const isConnecting = item.status === 'CONNECTING';
            const isWg = (item.type || '').toLowerCase().includes('wireguard');

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border flex flex-col justify-between space-y-4 transition-all hover:border-emerald-500/40"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center border font-bold"
                        style={{
                          backgroundColor: `${accentColor}18`,
                          borderColor: `${accentColor}40`,
                          color: accentColor
                        }}
                      >
                        <ShieldCheck size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 
                            className="text-xs font-bold leading-tight hover:text-emerald-400 cursor-pointer transition-colors truncate" 
                            style={{ color: currentThemeConfig.text }}
                            onClick={() => handleStartRename(item)}
                            title="Bấm để đổi tên profile"
                          >
                            {item.name}
                          </h4>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(item);
                            }}
                            className="p-0.5 rounded text-slate-500 hover:text-emerald-400 transition-colors flex-shrink-0"
                            title="Đổi tên profile"
                          >
                            <Edit2 size={10} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border ${
                            isWg 
                              ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' 
                              : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                          }`}>
                            {isWg ? 'WireGuard' : 'OpenVPN'}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-[10px] font-mono text-slate-400">{item.assignedIp || item.interfaceIp || 'Auto'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleTunnel(item)}
                      className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all shadow-sm active:scale-95"
                      style={{
                        backgroundColor: isConnected ? `${accentColor}20` : isConnecting ? 'rgba(245, 158, 11, 0.15)' : currentThemeConfig.innerInput,
                        borderColor: isConnected ? `${accentColor}60` : isConnecting ? 'rgba(245, 158, 11, 0.4)' : currentThemeConfig.border,
                        color: isConnected ? accentColor : isConnecting ? '#f59e0b' : currentThemeConfig.textMuted
                      }}
                      title={isConnected ? 'Ngắt VPN' : isConnecting ? 'Đang kết nối... (Bấm để ngắt)' : 'Kết nối VPN'}
                    >
                      {isConnecting ? (
                        <Loader2 size={13} className="animate-spin text-amber-400" />
                      ) : isConnected ? (
                        <Square size={12} fill="currentColor" />
                      ) : (
                        <Play size={12} fill="currentColor" />
                      )}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg border font-mono text-[11px] space-y-1.5" style={{ backgroundColor: currentThemeConfig.innerInput, borderColor: currentThemeConfig.border }}>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Endpoint:</span>
                      <span className="text-slate-300 font-semibold">{item.endpoint}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Subnets:</span>
                      <span className="text-slate-400 truncate max-w-[140px]">{item.allowedIps}</span>
                    </div>
                    {!isWg && (
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                        <span className="text-slate-500">Xác thực:</span>
                        <span className="text-slate-300 font-medium">
                          {item.requiresAuth === false || item.authType === 'none'
                            ? 'Cert only (No Auth)'
                            : item.username
                            ? `User: ${item.username}`
                            : 'Cần User/Pass'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-xs" style={{ borderColor: currentThemeConfig.border }}>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold ${
                    isConnecting ? 'text-amber-400' : isConnected ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    {isConnecting ? (
                      <Loader2 size={10} className="animate-spin text-amber-400" />
                    ) : (
                      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    )}
                    <span>{isConnecting ? 'CONNECTING...' : isConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {!isWg && (
                      <button
                        onClick={() => handleOpenAuthModal(item)}
                        className="p-1 rounded text-slate-400 hover:text-emerald-400 transition-colors"
                        title={item.username ? `Tài khoản: ${item.username}` : 'Cài đặt tài khoản & mật khẩu'}
                      >
                        <KeyRound size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => handleStartRename(item)}
                      className="p-1 rounded text-slate-400 hover:text-emerald-400 transition-colors"
                      title="Đổi tên profile"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setViewingConfig(item)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                      title="Xem file cấu hình"
                    >
                      <FileCode size={13} />
                    </button>
                    {onDeleteProxy && (
                      <button
                        onClick={() => setDeleteTargetProxy(item)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400"
                        title="Xóa"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Add / Import Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-lg rounded-2xl border p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scroll"
            style={{
              backgroundColor: currentThemeConfig.card,
              borderColor: currentThemeConfig.border
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: currentThemeConfig.border }}>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} style={{ color: accentColor }} />
                <h3 className="text-sm font-bold text-white">Thêm Đường Hầm VPN</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-300">Giao thức</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border font-sans focus:outline-none"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  >
                    <option value="WireGuard">WireGuard (.conf)</option>
                    <option value="OpenVPN">OpenVPN (.ovpn)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-300">Tên hầm VPN *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Company VPC..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full h-8 px-3 rounded-lg border font-sans focus:outline-none"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-300">Endpoint Server *</label>
                  <input
                    type="text"
                    required
                    placeholder="vpn.example.com:1194"
                    value={formEndpoint}
                    onChange={(e) => setFormEndpoint(e.target.value)}
                    className="w-full h-8 px-3 rounded-lg border font-mono focus:outline-none"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-300">IP Nội bộ (Interface)</label>
                  <input
                    type="text"
                    placeholder="10.8.0.2/24 hoặc Auto"
                    value={formInterfaceIp}
                    onChange={(e) => setFormInterfaceIp(e.target.value)}
                    className="w-full h-8 px-3 rounded-lg border font-mono focus:outline-none"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-slate-300">Dải mạng định tuyến (AllowedIPs / Subnet)</label>
                <input
                  type="text"
                  placeholder="0.0.0.0/0 hoặc 192.168.200.0/24"
                  value={formAllowedIps}
                  onChange={(e) => setFormAllowedIps(e.target.value)}
                  className="w-full h-8 px-3 rounded-lg border font-mono focus:outline-none"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                />
              </div>

              {/* OPENVPN OPTIONAL USER/PASSWORD AUTHENTICATION */}
              {formType === 'OpenVPN' && (
                <div 
                  className="p-3 rounded-xl border space-y-3"
                  style={{
                    backgroundColor: `${accentColor}08`,
                    borderColor: `${accentColor}25`
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <Lock size={13} style={{ color: accentColor }} />
                      <span>Xác thực người dùng (Tài khoản &amp; Mật khẩu)</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Tùy chọn / Optional
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Nhập nếu máy chủ OpenVPN của bạn yêu cầu xác thực tài khoản (chỉ thị <code>auth-user-pass</code>). Nếu VPN chỉ dùng Certificate/Key thì bạn có thể bỏ trống.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 font-semibold text-slate-300">Tài khoản (Username)</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="vd: thien.tranhoang"
                          value={formUsername}
                          onChange={(e) => setFormUsername(e.target.value)}
                          className="w-full h-8 pl-8 pr-3 rounded-lg border font-mono focus:outline-none"
                          style={{
                            backgroundColor: currentThemeConfig.innerInput,
                            borderColor: currentThemeConfig.border,
                            color: currentThemeConfig.text
                          }}
                        />
                        <User size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1 font-semibold text-slate-300">Mật khẩu (Password)</label>
                      <div className="relative">
                        <input
                          type={formShowPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          className="w-full h-8 pl-8 pr-8 rounded-lg border font-mono focus:outline-none"
                          style={{
                            backgroundColor: currentThemeConfig.innerInput,
                            borderColor: currentThemeConfig.border,
                            color: currentThemeConfig.text
                          }}
                        />
                        <Lock size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                        <button
                          type="button"
                          onClick={() => setFormShowPassword(!formShowPassword)}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
                        >
                          {formShowPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block mb-1 font-semibold text-slate-300">Nội dung file cấu hình (.conf / .ovpn)</label>
                <textarea
                  rows={4}
                  placeholder="Dán nội dung file cấu hình tại đây hoặc bấm Import Config ở trên..."
                  value={formConfigText}
                  onChange={(e) => setFormConfigText(e.target.value)}
                  className="w-full p-2.5 rounded-lg border font-mono text-[11px] focus:outline-none custom-scroll"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: currentThemeConfig.border }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border font-semibold text-slate-400 hover:text-white"
                  style={{ borderColor: currentThemeConfig.border }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-bold text-white shadow-sm"
                  style={{ backgroundColor: accentColor }}
                >
                  Lưu VPN Tunnel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Quick Auth / Credentials Modal */}
      {authEditingTunnel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            style={{
              backgroundColor: currentThemeConfig.card,
              borderColor: currentThemeConfig.border
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: currentThemeConfig.border }}>
              <div className="flex items-center gap-2">
                <KeyRound size={18} style={{ color: accentColor }} />
                <h3 className="text-sm font-bold text-white">
                  Phương Thức Xác Thực OpenVPN
                </h3>
              </div>
              <button onClick={() => setAuthEditingTunnel(null)} className="p-1 rounded text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAuthCredentials} className="space-y-3.5 text-xs">
              <div className="p-2.5 rounded-xl border text-[11px] space-y-1 font-mono" style={{ backgroundColor: currentThemeConfig.innerInput, borderColor: currentThemeConfig.border }}>
                <div className="text-white font-bold">{authEditingTunnel.name}</div>
                <div className="text-slate-400">Máy chủ: {authEditingTunnel.endpoint}</div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-300">Chọn chế độ xác thực:</label>
                <div className="grid grid-cols-1 gap-2">
                  <label
                    onClick={() => setAuthMode('none')}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      authMode === 'none'
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                        : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="authMode"
                      value="none"
                      checked={authMode === 'none'}
                      onChange={() => setAuthMode('none')}
                      className="mt-0.5 text-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-[12px] text-white flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        <span>Không cần xác thực (Certificate only / No Auth)</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        VPN chỉ dùng file chứng chỉ (Certificate/Keys) đã nhúng sẵn, không cần nhập tài khoản &amp; mật khẩu.
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setAuthMode('userpass')}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      authMode === 'userpass'
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                        : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="authMode"
                      value="userpass"
                      checked={authMode === 'userpass'}
                      onChange={() => setAuthMode('userpass')}
                      className="mt-0.5 text-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-[12px] text-white flex items-center gap-1.5">
                        <UserCheck size={14} className="text-amber-400" />
                        <span>Xác thực bằng Tài khoản &amp; Mật khẩu (auth-user-pass)</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        Yêu cầu Username &amp; Password người dùng cấp quyền truy cập OpenVPN.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {authMode === 'userpass' && (
                <div className="space-y-3 pt-1 border-t border-slate-800/80 animate-in fade-in duration-150">
                  <div>
                    <label className="block mb-1 font-semibold text-slate-300">Tài khoản (Username) *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required={authMode === 'userpass'}
                        placeholder="vd: thien.tranhoang"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 rounded-lg border font-mono focus:outline-none"
                        style={{
                          backgroundColor: currentThemeConfig.innerInput,
                          borderColor: currentThemeConfig.border,
                          color: currentThemeConfig.text
                        }}
                      />
                      <User size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 font-semibold text-slate-300">Mật khẩu (Password) *</label>
                    <div className="relative">
                      <input
                        type={authShowPassword ? 'text' : 'password'}
                        required={authMode === 'userpass'}
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full h-8 pl-8 pr-8 rounded-lg border font-mono focus:outline-none"
                        style={{
                          backgroundColor: currentThemeConfig.innerInput,
                          borderColor: currentThemeConfig.border,
                          color: currentThemeConfig.text
                        }}
                      />
                      <Lock size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                      <button
                        type="button"
                        onClick={() => setAuthShowPassword(!authShowPassword)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
                      >
                        {authShowPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: currentThemeConfig.border }}>
                <button
                  type="button"
                  onClick={() => setAuthEditingTunnel(null)}
                  className="px-3.5 py-1.5 rounded-lg border font-semibold text-slate-400 hover:text-white"
                  style={{ borderColor: currentThemeConfig.border }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-bold text-white shadow-sm flex items-center gap-1.5"
                  style={{ backgroundColor: accentColor }}
                >
                  <Check size={13} />
                  <span>{authMode === 'none' ? 'Lưu Thiết Lập (No Auth)' : 'Lưu Thông Tin'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Config Viewer Modal */}
      {viewingConfig && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-lg rounded-2xl border p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            style={{
              backgroundColor: currentThemeConfig.card,
              borderColor: currentThemeConfig.border
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: currentThemeConfig.border }}>
              <div className="flex items-center gap-2">
                <FileCode size={18} style={{ color: accentColor }} />
                <h3 className="text-sm font-bold text-white">
                  Cấu hình: {viewingConfig.name}
                </h3>
              </div>
              <button onClick={() => setViewingConfig(null)} className="p-1 rounded text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="relative">
              <pre
                className="p-3.5 rounded-xl border font-mono text-[11.5px] max-h-72 overflow-y-auto custom-scroll leading-relaxed"
                style={{
                  backgroundColor: currentThemeConfig.innerInput,
                  borderColor: currentThemeConfig.border,
                  color: currentThemeConfig.text
                }}
              >
                {viewingConfig.configContent || '# Không có nội dung cấu hình lưu trữ'}
              </pre>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(viewingConfig.configContent || '');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1 border transition-all"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border,
                  color: copied ? accentColor : currentThemeConfig.textMuted
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? 'Đã sao chép' : 'Copy'}</span>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingConfig(null)}
                className="px-4 py-1.5 rounded-lg font-semibold text-xs text-white"
                style={{ backgroundColor: accentColor }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetProxy}
        title="Xác nhận xóa VPN Profile"
        message="Bạn có chắc chắn muốn xóa đường hầm VPN này khỏi danh sách không? File cấu hình gốc trên máy vẫn được giữ nguyên."
        itemName={deleteTargetProxy?.name}
        confirmText="Xóa Profile"
        cancelText="Hủy"
        onConfirm={() => {
          if (deleteTargetProxy && onDeleteProxy) {
            onDeleteProxy(deleteTargetProxy.id);
          }
          setDeleteTargetProxy(null);
        }}
        onCancel={() => setDeleteTargetProxy(null)}
        settings={settings}
      />

      {/* 9. Admin Elevation Prompt Modal */}
      {adminPromptModal && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setAdminPromptModal(false)}
        >
          <div
            className="border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150 relative space-y-4"
            style={{
              backgroundColor: currentThemeConfig.card,
              borderColor: currentThemeConfig.border
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Yêu cầu quyền Administrator để bật VPN</h3>
                  <p className="text-[11px] text-slate-400">Windows Security Requirement</p>
                </div>
              </div>
              <button
                onClick={() => setAdminPromptModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Đóng (Esc)"
              >
                <X size={15} />
              </button>
            </div>

            <div className="text-xs space-y-2 text-slate-300 leading-relaxed">
              <p>
                Để kích hoạt card mạng ảo (TUN/TAP) và thiết lập bảng định tuyến mạng, hệ điều hành Windows yêu cầu quyền <b>Quản trị viên (Administrator)</b>.
              </p>
              <div className="p-3 rounded-xl border bg-slate-900/60 border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div>• Các tính năng SSH Terminal, SFTP, Docker khác vẫn hoạt động bình thường không cần quyền này.</div>
                <div>• Bấm nút bên dưới để mở hộp thoại UAC và khởi chạy lại ứng dụng với quyền Administrator.</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: currentThemeConfig.border }}>
              <button
                type="button"
                onClick={() => setAdminPromptModal(false)}
                className="px-3.5 py-1.5 rounded-xl border text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                style={{ borderColor: currentThemeConfig.border }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  setAdminPromptModal(false);
                  await restartAsAdmin();
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-sm shadow-amber-900/40 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <RotateCw size={13} />
                <span>Khởi chạy lại bằng quyền Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Rename Profile Modal */}
      {renamingProxy && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setRenamingProxy(null)}
        >
          <div 
            className="w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: currentThemeConfig.card,
              borderColor: currentThemeConfig.border
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: currentThemeConfig.border }}>
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center border font-bold"
                  style={{
                    backgroundColor: `${accentColor}18`,
                    borderColor: `${accentColor}40`,
                    color: accentColor
                  }}
                >
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Đổi tên Profile VPN</h3>
                  <p className="text-[11px] text-slate-400">Cập nhật tên hiển thị cho đường hầm này</p>
                </div>
              </div>
              <button 
                onClick={() => setRenamingProxy(null)} 
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tên mới của Profile <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newProxyName}
                  onChange={(e) => setNewProxyName(e.target.value)}
                  placeholder="vd: VPN Công Ty, VPN Singapore..."
                  className="w-full h-9 px-3 rounded-xl border text-xs font-mono focus:outline-none transition-all"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setRenamingProxy(null);
                  }}
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 font-mono">
                  <span>Tên cũ: <span className="text-slate-400 font-medium">{renamingProxy.name}</span></span>
                  <span className="text-slate-600">Enter để lưu</span>
                </div>
              </div>

              <div className="pt-2 border-t flex justify-end gap-2" style={{ borderColor: currentThemeConfig.border }}>
                <button
                  type="button"
                  onClick={() => setRenamingProxy(null)}
                  className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold text-slate-400 hover:text-white transition-all"
                  style={{ borderColor: currentThemeConfig.border }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newProxyName.trim() || newProxyName.trim() === renamingProxy.name}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50 active:scale-95"
                  style={{ backgroundColor: accentColor }}
                >
                  <Check size={13} />
                  <span>Lưu Tên Mới</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
