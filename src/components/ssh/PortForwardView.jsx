import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Plus, 
  Trash2, 
  Play, 
  Square, 
  Check, 
  Radio, 
  Server, 
  ChevronDown, 
  X, 
  Globe, 
  ShieldCheck,
  Edit2,
  LayoutList,
  LayoutGrid
} from 'lucide-react';
import { DEFAULT_DISCOVERED_SSH } from '../../services/sshDiscovery';
import { THEME_CONFIGS } from '../../constants/palettes';
import DataTable, { TableActionButton } from '../common/DataTable';
import ConfirmModal from '../common/ConfirmModal';
import { translations } from '../../i18n/translations';

export const FORWARDING_MODES = [
  { id: 'local', label: 'Local Forwarding (-L)', desc: 'Chuyển cổng máy của bạn tới máy chủ từ xa qua SSH' },
  { id: 'dynamic', label: 'Dynamic SOCKS5 (-D)', desc: 'Tạo máy chủ Proxy SOCKS5 trên máy bạn qua SSH' },
  { id: 'remote', label: 'Remote Forwarding (-R)', desc: 'Phơi dịch vụ máy của bạn lên cổng máy chủ từ xa' },
];

export default function PortForwardView({
  tunnels = DEFAULT_DISCOVERED_SSH.tunnels,
  machines = [],
  onToggleStatus,
  onAddNewTunnel,
  onDeleteTunnel,
  onRescan,
  settings = {}
}) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';
  const lang = settings?.language || 'vi';
  const t = translations[lang] || translations.vi;

  const [internalTunnels, setInternalTunnels] = useState(tunnels || []);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (!isAddModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsAddModalOpen(false);
        setIsModeDropdownOpen(false);
        setIsMachineDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen]);
  const [tunnelToDelete, setTunnelToDelete] = useState(null);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isMachineDropdownOpen, setIsMachineDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('service_tool_portforward_view_mode') || 'list';
    } catch (_) {
      return 'list';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('service_tool_portforward_view_mode', mode);
    } catch (_) {}
  };

  useEffect(() => {
    if (Array.isArray(tunnels)) {
      setInternalTunnels(tunnels);
    }
  }, [tunnels]);

  // Form state matching screenshot
  const [ruleName, setRuleName] = useState('Postgres Tunnel');
  const [mode, setMode] = useState('local'); // 'local', 'dynamic', 'remote'
  const [sshMachine, setSshMachine] = useState(() => {
    if (machines && machines.length > 0) {
      return `${machines[0].name} (${machines[0].host})`;
    }
    return 'clt_dev1 (root@10.0.68.109)';
  });
  const [localBindHost, setLocalBindHost] = useState('127.0.0.1');
  const [localPort, setLocalPort] = useState(8080);
  const [targetHost, setTargetHost] = useState('127.0.0.1');
  const [targetPort, setTargetPort] = useState(80);

  const displayTunnels = Array.isArray(tunnels) ? tunnels : internalTunnels;

  const handleToggle = (id) => {
    if (onToggleStatus) {
      onToggleStatus(id);
    } else {
      setInternalTunnels((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: item.status === 'ACTIVE' ? 'STOPPED' : 'ACTIVE' } : item
        )
      );
    }
  };

  const handleDelete = (id) => {
    if (onDeleteTunnel) {
      onDeleteTunnel(id);
    } else {
      setInternalTunnels((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleSaveRule = (e) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const newTunnel = {
      id: `tunnel_${Date.now()}`,
      name: ruleName.trim(),
      mode,
      localBindHost: localBindHost.trim() || '127.0.0.1',
      localPort: Number(localPort) || 8080,
      targetHost: mode === 'dynamic' ? '-' : (targetHost.trim() || '127.0.0.1'),
      targetPort: mode === 'dynamic' ? 0 : (Number(targetPort) || 80),
      remoteHost: mode === 'dynamic' ? '-' : (targetHost.trim() || '127.0.0.1'),
      remotePort: mode === 'dynamic' ? 0 : (Number(targetPort) || 80),
      viaServer: sshMachine,
      status: 'STOPPED',
      traffic: '0 B'
    };

    if (onAddNewTunnel) {
      onAddNewTunnel(newTunnel);
    } else {
      setInternalTunnels((prev) => [newTunnel, ...prev]);
    }

    setRuleName('My SSH Tunnel');
    setLocalPort(8080);
    setTargetPort(80);
    setIsAddModalOpen(false);
  };

  const selectedModeObj = FORWARDING_MODES.find((m) => m.id === mode) || FORWARDING_MODES[0];

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      {/* Header Banner */}
      <div 
        className="relative overflow-hidden rounded-2xl p-6 border transition-all"
        style={{
          backgroundColor: currentThemeConfig.card,
          borderColor: currentThemeConfig.border
        }}
      >
        <div 
          className="absolute right-0 top-0 w-80 h-full blur-3xl pointer-events-none"
          style={{ backgroundColor: `${accentColor}12` }}
        />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
              />
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold" style={{ color: accentColor }}>
                SSH Secure Tunnels
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: currentThemeConfig.text }}>
              {t.portForwarding || 'Port Forwarding (SSH Tunnel)'} ({displayTunnels.length})
            </h2>
            <p className="text-xs" style={{ color: currentThemeConfig.textMuted }}>
              Hỗ trợ 3 chế độ: Local Forwarding (-L), Dynamic SOCKS5 (-D) và Remote Forwarding (-R)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
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
                title="Dạng danh sách (List View)"
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
                title="Dạng thẻ (Card View)"
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              <Plus size={14} />
              <span>Thêm Port Forwarding Rule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tunnels Display: List View vs Grid View */}
      {viewMode === 'list' ? (
        <DataTable
          columns={[
            {
              key: 'toggle',
              label: 'BẬT/TẮT',
              align: 'center',
              width: 'w-14',
              render: (item) => {
                const isActive = item.status === 'ACTIVE';
                return (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(item.id);
                    }}
                    className="w-7 h-7 rounded-lg border inline-flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: isActive ? `${accentColor}20` : currentThemeConfig.innerInput,
                      borderColor: isActive ? `${accentColor}50` : currentThemeConfig.border,
                      color: isActive ? accentColor : currentThemeConfig.textMuted
                    }}
                    title={isActive ? 'Ngắt tunnel' : 'Bật tunnel'}
                  >
                    {isActive ? <Square size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
                  </button>
                );
              }
            },
            {
              key: 'name',
              label: 'TÊN QUY TẮC',
              className: 'font-bold',
              render: (item) => item.name
            },
            {
              key: 'mode',
              label: 'CHẾ ĐỘ',
              render: (item) => {
                const itemMode = item.mode || 'local';
                let modeBadgeLabel = 'LOCAL (-L)';
                let modeColor = '#10b981';
                if (itemMode === 'dynamic') {
                  modeBadgeLabel = 'DYNAMIC (-D)';
                  modeColor = '#38bdf8';
                } else if (itemMode === 'remote') {
                  modeBadgeLabel = 'REMOTE (-R)';
                  modeColor = '#f59e0b';
                }
                return (
                  <span
                    className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold"
                    style={{
                      backgroundColor: `${modeColor}18`,
                      color: modeColor,
                      border: `1px solid ${modeColor}40`
                    }}
                  >
                    {modeBadgeLabel}
                  </span>
                );
              }
            },
            {
              key: 'route',
              label: 'ĐÍCH CHUYỂN TIẾP (ROUTE)',
              className: 'font-mono text-[11px]',
              render: (item) => {
                const itemMode = item.mode || 'local';
                if (itemMode === 'dynamic') {
                  return (
                    <span className="text-sky-400 font-semibold flex items-center gap-1">
                      <Globe size={11} /> SOCKS5: {item.localBindHost || '127.0.0.1'}:{item.localPort}
                    </span>
                  );
                }
                if (itemMode === 'remote') {
                  return (
                    <span className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-semibold">Remote {item.remotePort || item.targetPort}</span>
                      <ArrowLeftRight size={10} style={{ color: currentThemeConfig.textMuted }} />
                      <span style={{ color: accentColor }}>{item.localBindHost || '127.0.0.1'}:{item.localPort}</span>
                    </span>
                  );
                }
                return (
                  <span className="flex items-center gap-1.5">
                    <span style={{ color: accentColor }} className="font-semibold">{item.localBindHost || '127.0.0.1'}:{item.localPort}</span>
                    <ArrowLeftRight size={10} style={{ color: currentThemeConfig.textMuted }} />
                    <span className="text-sky-400 font-semibold">{item.targetHost || item.remoteHost || '127.0.0.1'}:{item.targetPort || item.remotePort}</span>
                  </span>
                );
              }
            },
            {
              key: 'viaServer',
              label: 'QUA MÁY CHỦ (SSH HOST)',
              className: 'text-[11px] font-mono text-slate-400 hidden md:table-cell max-w-[180px] truncate',
              render: (item) => <span title={item.viaServer}>{item.viaServer}</span>
            },
            {
              key: 'status',
              label: 'TRẠNG THÁI',
              className: 'hidden lg:table-cell',
              render: (item) => {
                const isActive = item.status === 'ACTIVE';
                return (
                  <span
                    className="text-[9.5px] font-mono px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-bold"
                    style={{
                      backgroundColor: isActive ? `${accentColor}18` : currentThemeConfig.innerInput,
                      color: isActive ? accentColor : currentThemeConfig.textMuted
                    }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'animate-pulse' : ''}`} style={{ backgroundColor: isActive ? accentColor : '#64748b' }} />
                    {isActive ? 'TUNNELING' : 'IDLE'}
                  </span>
                );
              }
            },
            {
              key: 'actions',
              label: 'THAO TÁC',
              align: 'right',
              render: (item) => (
                <TableActionButton
                  icon={Trash2}
                  variant="danger"
                  onClick={() => setTunnelToDelete(item)}
                  title="Xóa rule"
                  className="w-7 h-7 !px-0"
                />
              )
            }
          ]}
          data={displayTunnels}
          themeConfig={currentThemeConfig}
          emptyMessage="Chưa có port forwarding tunnel nào."
          footer={(
            <div className="flex items-center justify-between w-full">
              <span>Tổng: <strong style={{ color: currentThemeConfig.text }}>{displayTunnels.length}</strong> tunnels cấu hình</span>
              <span className="text-[11px] text-slate-500">Quản lý SSH Port Forwarding an toàn qua tunnel</span>
            </div>
          )}
        />
      ) : (
        /* Tunnels Grid */
        <div className="grid grid-cols-1 gap-3.5">
          {displayTunnels.map((item) => {
            const isActive = item.status === 'ACTIVE';
            const itemMode = item.mode || 'local';

            let modeBadgeLabel = 'LOCAL (-L)';
            let modeColor = '#10b981';
            if (itemMode === 'dynamic') {
              modeBadgeLabel = 'DYNAMIC SOCKS5 (-D)';
              modeColor = '#38bdf8';
            } else if (itemMode === 'remote') {
              modeBadgeLabel = 'REMOTE (-R)';
              modeColor = '#f59e0b';
            }

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: isActive ? `${accentColor}40` : currentThemeConfig.border,
                  boxShadow: isActive ? `0 0 15px ${accentColor}10` : 'none'
                }}
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggle(item.id)}
                    className="w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-95"
                    style={{
                      backgroundColor: isActive ? `${accentColor}20` : currentThemeConfig.innerInput,
                      borderColor: isActive ? `${accentColor}50` : currentThemeConfig.border,
                      color: isActive ? accentColor : currentThemeConfig.textMuted
                    }}
                    title={isActive ? 'Ngắt kết nối tunnel' : 'Bật tunnel'}
                  >
                    {isActive ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs" style={{ color: currentThemeConfig.text }}>
                        {item.name}
                      </span>
                      <span
                        className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold"
                        style={{
                          backgroundColor: `${modeColor}18`,
                          color: modeColor,
                          border: `1px solid ${modeColor}40`
                        }}
                      >
                        {modeBadgeLabel}
                      </span>
                      <span
                        className="text-[9.5px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{
                          backgroundColor: isActive ? `${accentColor}18` : currentThemeConfig.innerInput,
                          color: isActive ? accentColor : currentThemeConfig.textMuted
                        }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'animate-pulse' : ''}`} style={{ backgroundColor: isActive ? accentColor : '#64748b' }} />
                        {isActive ? 'TUNNELING' : 'IDLE'}
                      </span>
                    </div>

                    {/* Route path */}
                    <div className="flex items-center gap-2 text-xs font-mono">
                      {itemMode === 'dynamic' ? (
                        <span className="text-sky-400 font-semibold flex items-center gap-1">
                          <Globe size={11} /> SOCKS5 Proxy: {item.localBindHost || '127.0.0.1'}:{item.localPort}
                        </span>
                      ) : itemMode === 'remote' ? (
                        <>
                          <span className="text-amber-400 font-semibold">Remote {item.remotePort || item.targetPort}</span>
                          <ArrowLeftRight size={12} style={{ color: currentThemeConfig.textMuted }} />
                          <span style={{ color: accentColor }} className="font-semibold">{item.localBindHost || '127.0.0.1'}:{item.localPort}</span>
                        </>
                      ) : (
                        <>
                          <span style={{ color: accentColor }} className="font-semibold">{item.localBindHost || '127.0.0.1'}:{item.localPort}</span>
                          <ArrowLeftRight size={12} style={{ color: currentThemeConfig.textMuted }} />
                          <span className="text-sky-400 font-semibold">{item.targetHost || item.remoteHost || '127.0.0.1'}:{item.targetPort || item.remotePort}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center">
                  <div className="text-right hidden sm:block">
                    <div className="text-[11px] flex items-center gap-1 font-mono justify-end" style={{ color: currentThemeConfig.textMuted }}>
                      <Server size={11} />
                      <span className="max-w-[200px] truncate">{item.viaServer}</span>
                    </div>
                    <div className="text-[10px] font-mono" style={{ color: currentThemeConfig.textMuted }}>
                      Traffic: {item.traffic || '0 B'}
                    </div>
                  </div>

                  <button
                    onClick={() => setTunnelToDelete(item)}
                    className="w-8 h-8 rounded-xl border flex items-center justify-center transition-all text-slate-500 hover:text-rose-400"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border
                    }}
                    title="Xóa tunnel"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD MODAL - EXACT REPLICA OF THE SCREENSHOT              */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => {
            setIsAddModalOpen(false);
            setIsModeDropdownOpen(false);
            setIsMachineDropdownOpen(false);
          }}
        >
          <div 
            className="w-full max-w-lg rounded-2xl border p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: currentThemeConfig.card,
              borderColor: currentThemeConfig.border
            }}
          >
            {/* Modal Title */}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base tracking-wide" style={{ color: currentThemeConfig.text }}>
                Port Forwarding Rule
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsModeDropdownOpen(false);
                  setIsMachineDropdownOpen(false);
                }}
                className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs font-sans">
              {/* Row 1: Rule Name * & Mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: currentThemeConfig.textMuted }}>
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="Postgres Tunnel"
                    className="w-full h-10 px-3.5 rounded-xl border font-sans focus:outline-none"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  />
                </div>

                {/* Mode Custom Dropdown matching screenshot */}
                <div className="relative">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: currentThemeConfig.textMuted }}>
                    Mode
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModeDropdownOpen(!isModeDropdownOpen);
                      setIsMachineDropdownOpen(false);
                    }}
                    className="w-full h-10 px-3.5 rounded-xl border flex items-center justify-between text-left transition-all font-semibold"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: isModeDropdownOpen ? accentColor : currentThemeConfig.border,
                      color: isModeDropdownOpen ? accentColor : currentThemeConfig.text,
                      boxShadow: isModeDropdownOpen ? `0 0 10px ${accentColor}30` : 'none'
                    }}
                  >
                    <span>{selectedModeObj.label}</span>
                    <ChevronDown size={14} className={`transition-transform ${isModeDropdownOpen ? 'rotate-180 text-emerald-400' : 'text-slate-400'}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isModeDropdownOpen && (
                    <div 
                      className="absolute right-0 left-0 top-full mt-1.5 rounded-xl border p-1 z-30 shadow-2xl animate-in fade-in duration-100"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput,
                        borderColor: currentThemeConfig.border
                      }}
                    >
                      {FORWARDING_MODES.map((m) => {
                        const isSelected = mode === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setMode(m.id);
                              setIsModeDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 rounded-lg text-left flex items-center justify-between text-xs transition-colors hover:bg-slate-800/50"
                            style={{
                              color: isSelected ? accentColor : currentThemeConfig.text,
                              backgroundColor: isSelected ? `${accentColor}14` : 'transparent',
                              fontWeight: isSelected ? '600' : 'normal'
                            }}
                          >
                            <div>
                              <div>{m.label}</div>
                              <div className="text-[10px]" style={{ color: currentThemeConfig.textMuted }}>{m.desc}</div>
                            </div>
                            {isSelected && <Check size={14} style={{ color: accentColor }} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: SSH Machine * */}
              <div className="relative">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: currentThemeConfig.textMuted }}>
                  SSH Machine *
                </label>
                <div className="relative">
                  <select
                    value={sshMachine}
                    onChange={(e) => setSshMachine(e.target.value)}
                    className="w-full h-10 px-3.5 pr-8 rounded-xl border font-mono text-xs focus:outline-none appearance-none"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  >
                    {machines && machines.length > 0 ? (
                      machines.map((m) => (
                        <option key={m.id} value={`${m.name} (${m.host})`}>
                          {m.name} ({m.host})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="clt_dev1 (root@10.0.68.109)">clt_dev1 (root@10.0.68.109)</option>
                        <option value="Klive_Admin_prod (klive@47.84.227.11)">Klive_Admin_prod (klive@47.84.227.11)</option>
                        <option value="klive_admin_uat (klive@47.84.233.16)">klive_admin_uat (klive@47.84.233.16)</option>
                        <option value="soez (soez@64.120.94.74)">soez (soez@64.120.94.74)</option>
                      </>
                    )}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: currentThemeConfig.textMuted }} />
                </div>
              </div>

              {/* Row 3: Local Bind Host & Local Port */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: currentThemeConfig.textMuted }}>
                    Local Bind Host
                  </label>
                  <input
                    type="text"
                    required
                    value={localBindHost}
                    onChange={(e) => setLocalBindHost(e.target.value)}
                    placeholder="127.0.0.1"
                    className="w-full h-10 px-3.5 rounded-xl border font-mono text-xs focus:outline-none"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: currentThemeConfig.textMuted }}>
                    Local Port
                  </label>
                  <input
                    type="number"
                    required
                    value={localPort}
                    onChange={(e) => setLocalPort(e.target.value)}
                    placeholder="8080"
                    className="w-full h-10 px-3.5 rounded-xl border font-mono text-xs focus:outline-none"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  />
                </div>
              </div>

              {/* Row 4: Target Host & Target Port (Not needed if Dynamic SOCKS5) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: currentThemeConfig.textMuted }}>
                    Target Host {mode === 'dynamic' && '(Tự động qua SOCKS5)'}
                  </label>
                  <input
                    type="text"
                    disabled={mode === 'dynamic'}
                    value={mode === 'dynamic' ? 'Tất cả đích (SOCKS5)' : targetHost}
                    onChange={(e) => setTargetHost(e.target.value)}
                    placeholder="127.0.0.1"
                    className="w-full h-10 px-3.5 rounded-xl border font-mono text-xs focus:outline-none disabled:opacity-50"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: currentThemeConfig.textMuted }}>
                    Target Port
                  </label>
                  <input
                    type="number"
                    disabled={mode === 'dynamic'}
                    value={mode === 'dynamic' ? 0 : targetPort}
                    onChange={(e) => setTargetPort(e.target.value)}
                    placeholder="80"
                    className="w-full h-10 px-3.5 rounded-xl border font-mono text-xs focus:outline-none disabled:opacity-50"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t flex justify-end gap-3" style={{ borderColor: currentThemeConfig.border }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border font-semibold text-xs transition-colors"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-xs text-white shadow-sm transition-all active:scale-95"
                  style={{ backgroundColor: accentColor }}
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!tunnelToDelete}
        title="Xác nhận xóa Port Forwarding Tunnel"
        message="Bạn có chắc muốn xóa cấu hình chuyển tiếp cổng này? Thao tác này không thể hoàn tác."
        itemName={tunnelToDelete?.name}
        confirmText="Xóa Tunnel"
        cancelText="Hủy"
        onConfirm={() => {
          if (tunnelToDelete) {
            handleDelete(tunnelToDelete.id);
            setTunnelToDelete(null);
          }
        }}
        onCancel={() => setTunnelToDelete(null)}
        settings={settings}
      />
    </div>
  );
}
