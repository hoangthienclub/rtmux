import React, { useState } from 'react';
import { 
  Server, 
  Activity, 
  HardDrive, 
  Cpu, 
  ShieldCheck, 
  Terminal, 
  ArrowUpRight, 
  Clock, 
  RefreshCw, 
  Zap, 
  Radio,
  LayoutList,
  LayoutGrid
} from 'lucide-react';
import { THEME_CONFIGS, getMetricColor } from '../../constants/palettes';
import DataTable, { TableActionButton } from '../common/DataTable';
import { translations } from '../../i18n/translations';

export default function DashboardView({ machines = [], onConnectHost, onOpenTerminal, settings }) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';
  const lang = settings?.language || 'vi';
  const t = translations[lang] || translations.vi;

  const onlineCount = machines.filter(m => m.cpu > 0 || m.uptime !== 'Click to Monitor').length;
  const totalCount = machines.length;

  const isFahrenheit = settings?.tempUnit === 'fahrenheit';
  const baseTempC = 43;
  const displayTemp = isFahrenheit ? `${Math.round((baseTempC * 9 / 5) + 32)}°F` : `${baseTempC}°C`;
  const pollInterval = settings?.telemetryInterval || '2s';

  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('service_tool_dashboard_view_mode') || 'list';
    } catch (_) {
      return 'list';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('service_tool_dashboard_view_mode', mode);
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

  const getCpuUsageText = (m) => {
    if (!m.cores || m.cores === '-') return `${m.cpu || 0}%`;
    const coresNum = parseFloat(m.cores);
    if (!isNaN(coresNum) && m.cpu !== undefined && m.cpu > 0) {
      const active = (coresNum * (m.cpu / 100)).toFixed(1);
      return `${active} / ${m.cores} Cores`;
    }
    return `- / ${m.cores} Cores`;
  };

  return (
    <div
      className="flex-1 p-6 overflow-y-auto space-y-6 custom-scroll transition-colors duration-200"
      style={{
        backgroundColor: currentThemeConfig.bg,
        color: currentThemeConfig.text
      }}
    >
      {/* Top Banner / Welcome */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border shadow-lg relative overflow-hidden"
        style={{
          backgroundColor: currentThemeConfig.card,
          borderColor: currentThemeConfig.border
        }}
      >
        <div
          className="absolute right-0 top-0 w-96 h-full blur-3xl pointer-events-none"
          style={{ backgroundColor: `${accentColor}10` }}
        ></div>
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 8px ${accentColor}`
              }}
            ></span>
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold" style={{ color: accentColor }}>
              Remote &amp; SSH Hub
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: currentThemeConfig.text }}>
            {t.dashboardTitle || 'Bảng Điều Khiển Máy Chủ & Hạ Tầng'}
          </h2>
          <p className="text-xs" style={{ color: currentThemeConfig.textMuted }}>
            {t.dashboardSubtitle || 'Giám sát tài nguyên thời gian thực, quản lý cụm máy chủ và phiên kết nối SSH / WSL.'}
          </p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <button 
            onClick={() => onConnectHost && onConnectHost(machines[0])}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
            style={{ backgroundColor: accentColor }}
          >
            <Terminal size={14} />
            <span>{t.openHostTerminal || 'Mở Terminal Host'}</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className="p-4 rounded-xl border shadow-sm"
          style={{
            backgroundColor: currentThemeConfig.card,
            borderColor: currentThemeConfig.border
          }}
        >
          <div className="flex items-center justify-between mb-2" style={{ color: currentThemeConfig.textMuted }}>
            <span className="text-xs font-medium">{t.activeServers || 'Máy chủ hoạt động'}</span>
            <Server size={16} style={{ color: accentColor }} />
          </div>
          <div className="text-2xl font-bold font-mono" style={{ color: currentThemeConfig.text }}>
            {onlineCount} <span className="text-xs font-sans font-normal" style={{ color: currentThemeConfig.textMuted }}>/ {totalCount} {t.serversUnit || 'máy'}</span>
          </div>
          <div className="text-[10px] mt-1 flex items-center gap-1 font-mono" style={{ color: accentColor }}>
            <Radio size={10} className="animate-pulse" /> {t.polling || 'Quét'} {pollInterval} • {t.temperature || 'Nhiệt độ'} {displayTemp}
          </div>
        </div>

        <div
          className="p-4 rounded-xl border shadow-sm"
          style={{
            backgroundColor: currentThemeConfig.card,
            borderColor: currentThemeConfig.border
          }}
        >
          <div className="flex items-center justify-between mb-2" style={{ color: currentThemeConfig.textMuted }}>
            <span className="text-xs font-medium">{t.avgCpu || 'CPU trung bình'}</span>
            <Cpu size={16} style={{ color: '#38bdf8' }} />
          </div>
          <div className="text-2xl font-bold font-mono" style={{ color: currentThemeConfig.text }}>16.4%</div>
          <div className="w-full h-1.5 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: currentThemeConfig.innerInput }}>
            <div className="bg-sky-400 h-full rounded-full" style={{ width: '16.4%' }}></div>
          </div>
        </div>

        <div
          className="p-4 rounded-xl border shadow-sm"
          style={{
            backgroundColor: currentThemeConfig.card,
            borderColor: currentThemeConfig.border
          }}
        >
          <div className="flex items-center justify-between mb-2" style={{ color: currentThemeConfig.textMuted }}>
            <span className="text-xs font-medium">{t.ramMemory || 'Bộ nhớ RAM'}</span>
            <Activity size={16} style={{ color: '#f59e0b' }} />
          </div>
          <div className="text-2xl font-bold font-mono" style={{ color: currentThemeConfig.text }}>37.8%</div>
          <div className="w-full h-1.5 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: currentThemeConfig.innerInput }}>
            <div className="bg-amber-400 h-full rounded-full" style={{ width: '37.8%' }}></div>
          </div>
        </div>

        <div
          className="p-4 rounded-xl border shadow-sm"
          style={{
            backgroundColor: currentThemeConfig.card,
            borderColor: currentThemeConfig.border
          }}
        >
          <div className="flex items-center justify-between mb-2" style={{ color: currentThemeConfig.textMuted }}>
            <span className="text-xs font-medium">{t.keychainSecurity || 'Bảo mật Keychain'}</span>
            <ShieldCheck size={16} style={{ color: accentColor }} />
          </div>
          <div className="text-2xl font-bold font-mono" style={{ color: currentThemeConfig.text }}>4 Keys</div>
          <div className="text-[10px] mt-1 font-mono" style={{ color: currentThemeConfig.textMuted }}>ED25519 &amp; RSA 4096</div>
        </div>
      </div>

      {/* Two Column Layout: Quick Connect Hosts & Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Server Quick Connect List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: currentThemeConfig.border }}>
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: currentThemeConfig.text }}>
              <Server size={14} style={{ color: accentColor }} />
              <span>{t.quickConnect || 'Máy Chủ Gần Đây'}</span>
            </h3>
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
                  onClick={() => handleSetViewMode('list')}
                  className="p-1 rounded-lg transition-all"
                  style={{
                    backgroundColor: viewMode === 'list' ? `${accentColor}25` : 'transparent',
                    color: viewMode === 'list' ? accentColor : currentThemeConfig.textMuted
                  }}
                  title="Dạng danh sách (List View)"
                >
                  <LayoutList size={13} />
                </button>
                <button
                  onClick={() => handleSetViewMode('grid')}
                  className="p-1 rounded-lg transition-all"
                  style={{
                    backgroundColor: viewMode === 'grid' ? `${accentColor}25` : 'transparent',
                    color: viewMode === 'grid' ? accentColor : currentThemeConfig.textMuted
                  }}
                  title="Dạng thẻ (Card View)"
                >
                  <LayoutGrid size={13} />
                </button>
              </div>
              <span className="text-xs font-mono hidden sm:inline" style={{ color: currentThemeConfig.textMuted }}>Click to connect</span>
            </div>
          </div>

          {viewMode === 'list' ? (
            <DataTable
              columns={[
                {
                  key: 'name',
                  label: 'MÁY CHỦ',
                  render: (m) => (
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{m.name}</span>
                      {m.tag && (
                        <span
                          className="text-[9px] px-1.5 py-0.2 rounded font-mono"
                          style={{
                            backgroundColor: currentThemeConfig.innerInput,
                            color: currentThemeConfig.textMuted
                          }}
                        >
                          {m.tag}
                        </span>
                      )}
                    </div>
                  )
                },
                {
                  key: 'host',
                  label: 'HOST',
                  className: 'font-mono text-[11px]',
                  render: (m) => <span style={{ color: currentThemeConfig.textMuted }}>{m.host}</span>
                },
                {
                  key: 'cpu',
                  label: 'CPU (LOAD / CORES)',
                  className: 'font-mono text-[11px] w-36',
                  render: (m) => {
                    const isOnline = m.cpu > 0 || (m.uptime && !m.uptime.includes('Click') && m.uptime !== 'Offline');
                    return (
                      <div className="flex items-center justify-between">
                        <span
                          style={{ color: getMetricColor(m.cpu, isOnline, currentThemeConfig.textMuted) }}
                          className="font-bold"
                        >
                          {m.cpu > 0 ? `${m.cpu}%` : '0%'}
                        </span>
                        <span className="text-[10px]" style={{ color: currentThemeConfig.textMuted }}>
                          {getCpuUsageText(m)}
                        </span>
                      </div>
                    );
                  }
                },
                {
                  key: 'ram',
                  label: 'RAM (USED / TOTAL)',
                  className: 'font-mono text-[11px] w-40',
                  render: (m) => {
                    const isOnline = m.ramPct > 0 || (m.uptime && !m.uptime.includes('Click') && m.uptime !== 'Offline');
                    return (
                      <div className="flex items-center justify-between">
                        <span
                          style={{ color: getMetricColor(m.ramPct, isOnline, currentThemeConfig.textMuted) }}
                          className="font-bold"
                        >
                          {m.ramPct > 0 ? `${m.ramPct}%` : '0%'}
                        </span>
                        <span className="text-[10px]" style={{ color: currentThemeConfig.textMuted }}>
                          {getRamUsageText(m)}
                        </span>
                      </div>
                    );
                  }
                },
                {
                  key: 'actions',
                  label: 'TERMINAL',
                  align: 'right',
                  render: (m) => (
                    <TableActionButton
                      icon={Terminal}
                      variant="primary"
                      accentColor={accentColor}
                      onClick={() => onConnectHost && onConnectHost(m)}
                      title="Mở Terminal"
                      className="w-7 h-7 !px-0"
                    />
                  )
                }
              ]}
              data={machines}
              themeConfig={currentThemeConfig}
              onRowClick={(m) => onConnectHost && onConnectHost(m)}
              emptyMessage="Không có máy chủ khả dụng"
            />
          ) : (
            <div className="space-y-2.5">
              {machines.map((m) => (
                <div 
                  key={m.id}
                  className="p-3.5 rounded-xl border transition-all flex items-center justify-between group cursor-pointer"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                  onClick={() => onConnectHost && onConnectHost(m)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs"
                      style={{
                        backgroundColor: m.cpu > 0 ? `${accentColor}20` : currentThemeConfig.innerInput,
                        color: m.cpu > 0 ? accentColor : currentThemeConfig.textMuted,
                        borderColor: m.cpu > 0 ? `${accentColor}50` : currentThemeConfig.border,
                        borderWidth: '1px'
                      }}
                    >
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold transition-colors flex items-center gap-2" style={{ color: currentThemeConfig.text }}>
                        <span>{m.name}</span>
                        <span
                          className="text-[9.5px] px-1.5 py-0.5 rounded font-mono"
                          style={{
                            backgroundColor: currentThemeConfig.innerInput,
                            color: currentThemeConfig.textMuted
                          }}
                        >
                          {m.tag || 'Server'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono mt-0.5" style={{ color: currentThemeConfig.textMuted }}>{m.host}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-mono font-semibold" style={{ color: currentThemeConfig.text }}>
                        CPU: {m.cpu > 0 ? `${m.cpu}%` : 'idle'}
                      </div>
                      <div className="text-[10px] font-mono" style={{ color: currentThemeConfig.textMuted }}>
                        RAM: {m.ramPct > 0 ? `${m.ramPct}%` : '-'}
                      </div>
                    </div>
                    <button
                      className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all shadow-sm"
                      style={{
                        backgroundColor: `${accentColor}18`,
                        borderColor: `${accentColor}50`,
                        color: accentColor
                      }}
                    >
                      <Terminal size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right (1 col): System & SSH Activity Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: currentThemeConfig.border }}>
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: currentThemeConfig.text }}>
              <Clock size={14} style={{ color: '#38bdf8' }} />
              <span>{t.liveActivity || 'Nhật Ký Phiên SSH'}</span>
            </h3>
          </div>

          <div
            className="p-4 rounded-xl border space-y-3 text-xs"
            style={{
              backgroundColor: currentThemeConfig.card,
              borderColor: currentThemeConfig.border
            }}
          >
            <div className="flex items-start gap-2.5 pb-2.5 border-b" style={{ borderColor: currentThemeConfig.border }}>
              <span className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: accentColor }}></span>
              <div>
                <p className="font-medium" style={{ color: currentThemeConfig.text }}>{t.connected || 'Connected'} klive_admin_uat</p>
                <p className="text-[10px] font-mono" style={{ color: currentThemeConfig.textMuted }}>SSH key auth (id_ed25519) - 10m ago</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pb-2.5 border-b" style={{ borderColor: currentThemeConfig.border }}>
              <span className="w-2 h-2 rounded-full bg-sky-400 mt-1.5"></span>
              <div>
                <p className="font-medium" style={{ color: currentThemeConfig.text }}>rtmux session 0 running</p>
                <p className="text-[10px] font-mono" style={{ color: currentThemeConfig.textMuted }}>Windows_Host_dev - 1h ago</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: currentThemeConfig.textMuted }}></span>
              <div>
                <p className="font-medium" style={{ color: currentThemeConfig.text }}>Port forward :8080 ready</p>
                <p className="text-[10px] font-mono" style={{ color: currentThemeConfig.textMuted }}>Local tunnel active - 2h ago</p>
              </div>
            </div>
          </div>

          <div
            className="p-4 rounded-xl border text-xs space-y-2"
            style={{
              backgroundColor: `${accentColor}0c`,
              borderColor: `${accentColor}30`
            }}
          >
            <div className="font-bold flex items-center gap-1.5" style={{ color: accentColor }}>
              <Zap size={14} /> Tips &amp; Shortcuts
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: currentThemeConfig.textMuted }}>
              Press <span className="font-mono px-1 py-0.5 rounded border" style={{ color: accentColor, borderColor: `${accentColor}50`, backgroundColor: currentThemeConfig.innerInput }}>Ctrl + B</span> or click tabs to switch between active sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
