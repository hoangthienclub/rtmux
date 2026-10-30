import React, { useState } from 'react';
import { 
  LayoutDashboard,
  Server,
  UserCheck,
  KeyRound,
  Globe,
  FolderSync,
  Code2,
  Box,
  ArrowLeftRight,
  Terminal,
  Settings,
  Plus,
  Layers,
  Sliders,
  ChevronDown,
  ChevronRight,
  Tag,
  Boxes,
  FileCode2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { translations } from '../i18n/translations';
import { THEME_CONFIGS } from '../constants/palettes';

export default function Sidebar({ 
  currentNav, 
  onSelectNav, 
  runningCount = 0, 
  totalCount = 2,
  onRunQuickTask,
  runningTask,
  machinesCount = 5,
  identitiesCount = 3,
  keysCount = 4,
  proxiesCount = 2,
  tunnelsCount = 1,
  terminalSessions = [],
  activeSession = null,
  onSelectSession,
  onNewTerminal,
  settings,
  activeTag = 'All',
  onSelectTag,
  isCollapsed = false
}) {
  const lang = settings?.language || 'vi';
  const t = translations[lang] || translations.vi;
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';

  const getItemStyle = (isActive, isTerminalItem = false) => {
    const effectivelyActive = isTerminalItem ? isActive : (isActive && !activeSession);
    if (effectivelyActive) {
      return {
        backgroundColor: `${accentColor}18`,
        borderLeft: `3px solid ${accentColor}`,
        borderColor: 'transparent',
        color: accentColor,
        fontWeight: '600'
      };
    }
    return {
      color: currentThemeConfig.textMuted || '#94a3b8',
      borderLeft: '3px solid transparent',
      borderColor: 'transparent',
      backgroundColor: 'transparent'
    };
  };

  const renderCountBadge = (count, highlight = false) => {
    if (count === undefined || count === null) return null;
    return (
      <span
        className="px-2 py-0.5 min-w-[20px] text-center rounded-full text-[10px] font-mono font-semibold transition-all flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: highlight ? `${accentColor}20` : (currentThemeConfig.card || '#111827'),
          color: highlight ? accentColor : (currentThemeConfig.textMuted || '#94a3b8'),
          border: `1px solid ${highlight ? `${accentColor}40` : (currentThemeConfig.border || '#1f2937')}`
        }}
      >
        {count}
      </span>
    );
  };

  // Collapsible Microservices Dev section
  const [isOpenServices, setIsOpenServices] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_services_open');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const toggleServices = () => {
    setIsOpenServices(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_services_open', JSON.stringify(next));
      return next;
    });
  };

  return (
    <aside
      className={`border-r flex flex-col justify-between select-none flex-shrink-0 z-20 overflow-hidden font-sans transition-all duration-300 ease-in-out ${
        isCollapsed 
          ? 'w-0 !p-0 !border-r-0 opacity-0 pointer-events-none' 
          : 'w-60 p-3 opacity-100'
      }`}
      style={{
        backgroundColor: currentThemeConfig.subBg,
        borderColor: isCollapsed ? 'transparent' : currentThemeConfig.border,
        color: currentThemeConfig.text
      }}
    >
      <div className="flex-1 flex flex-col overflow-y-auto space-y-4 pr-1 custom-scroll">
        
        {/* App Title matching Screenshot "SSH Box" style */}
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div
            className="w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: `${accentColor}20`,
              borderColor: `${accentColor}50`,
              color: accentColor,
              boxShadow: `0 0 10px ${accentColor}30`
            }}
          >
            <Terminal size={15} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-bold text-xs tracking-wider leading-none" style={{ color: currentThemeConfig.text }}>
              RTMUX
            </h1>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: accentColor }}>
              DevOps &amp; SSH Hub
            </p>
          </div>
        </div>

        {/* 1. TOP SINGLE ITEM: DASHBOARD */}
        <button
          onClick={() => onSelectNav('dashboard')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          style={getItemStyle(currentNav === 'dashboard')}
        >
          <LayoutDashboard size={15} style={{ color: currentNav === 'dashboard' ? accentColor : (currentThemeConfig.textMuted || '#64748b') }} />
          <span>{t.dashboard || 'Dashboard'}</span>
        </button>

        {/* 2. GROUP: RESOURCES */}
        <div className="space-y-1">
          <div
            className="px-2 text-[10px] font-bold uppercase tracking-widest font-sans"
            style={{ color: currentThemeConfig.textMuted }}
          >
            {t.resources || 'RESOURCES'}
          </div>
          <div className="space-y-0.5">
            {/* Machine */}
            <button
              onClick={() => onSelectNav('hosts')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={getItemStyle(currentNav === 'hosts')}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Server size={15} style={{ color: currentNav === 'hosts' ? accentColor : (currentThemeConfig.textMuted || '#64748b') }} />
                <span className="truncate">{t.machine || 'Máy Chủ'}</span>
              </div>
              {renderCountBadge(machinesCount)}
            </button>

            {/* Identity */}
            <button
              onClick={() => onSelectNav('identity')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={getItemStyle(currentNav === 'identity')}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserCheck size={15} style={{ color: currentNav === 'identity' ? accentColor : (currentThemeConfig.textMuted || '#64748b') }} />
                <span className="truncate">{t.identity || 'Tài Khoản SSH'}</span>
              </div>
              {renderCountBadge(identitiesCount)}
            </button>

            {/* SSH Key */}
            <button
              onClick={() => onSelectNav('keychain')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={getItemStyle(currentNav === 'keychain')}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <KeyRound size={15} style={{ color: currentNav === 'keychain' ? accentColor : '#f59e0b' }} />
                <span className="truncate">{t.sshKey || 'Khóa SSH'}</span>
              </div>
              {renderCountBadge(keysCount)}
            </button>

            {/* VPN (WireGuard / OpenVPN) */}
            <button
              onClick={() => onSelectNav('proxy')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={getItemStyle(currentNav === 'proxy')}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck size={15} style={{ color: currentNav === 'proxy' ? accentColor : '#38bdf8' }} />
                <span className="truncate">{t.proxy || 'Mạng VPN'}</span>
              </div>
              {renderCountBadge(proxiesCount)}
            </button>
          </div>
        </div>

        {/* 3. GROUP: TOOLBOX */}
        <div className="space-y-1">
          <div
            className="px-2 text-[10px] font-bold uppercase tracking-widest font-sans"
            style={{ color: currentThemeConfig.textMuted }}
          >
            {t.toolbox || 'HỘP CÔNG CỤ'}
          </div>
          <div className="space-y-0.5">
            {/* SFTP */}
            <button
              onClick={() => onSelectNav('sftp')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={getItemStyle(currentNav === 'sftp')}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FolderSync size={15} style={{ color: currentNav === 'sftp' ? accentColor : '#f59e0b' }} />
                <span className="truncate">{t.sftp || 'Truyền Tệp SFTP'}</span>
              </div>
            </button>

            {/* Snippet */}
            <button
              onClick={() => onSelectNav('snippets')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={getItemStyle(currentNav === 'snippets')}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Code2 size={15} style={{ color: currentNav === 'snippets' ? accentColor : '#c084fc' }} />
                <span className="truncate">{t.snippet || 'Đoạn Lệnh'}</span>
              </div>
            </button>

            {/* Scripts (Tự động hóa) */}
            <button
              onClick={() => onSelectNav('scripts')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={getItemStyle(currentNav === 'scripts')}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileCode2 size={15} style={{ color: currentNav === 'scripts' ? accentColor : '#f97316' }} />
                <span className="truncate">{t.scripts || 'Quản Lý Scripts'}</span>
              </div>
            </button>

            {/* Docker */}
            <button
              onClick={() => onSelectNav('docker')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={getItemStyle(currentNav === 'docker')}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Box size={15} style={{ color: currentNav === 'docker' ? accentColor : '#38bdf8' }} />
                <span className="truncate">{t.docker || 'Docker'}</span>
              </div>
            </button>

            {/* Port Forwarding */}
            <button
              onClick={() => onSelectNav('port_forward')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={getItemStyle(currentNav === 'port_forward')}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ArrowLeftRight size={15} style={{ color: currentNav === 'port_forward' ? accentColor : '#34d399' }} />
                <span className="truncate">{t.portForwarding || 'Chuyển Cổng'}</span>
              </div>
              {renderCountBadge(tunnelsCount)}
            </button>
          </div>
        </div>

        {/* 4. GROUP: MICROSERVICES DEV (COLLAPSIBLE) */}
        <div className="space-y-1">
          <button
            onClick={toggleServices}
            className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors"
            style={{ color: accentColor }}
          >
            <span>{t.microservicesDev || 'Microservices Dev'}</span>
            <div className="flex items-center gap-1" style={{ color: currentThemeConfig.textMuted }}>
              <span className="text-[9.5px] font-mono lowercase">{runningCount}/{totalCount}</span>
              {isOpenServices ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </div>
          </button>

          {isOpenServices && (
            <div className="space-y-0.5 pl-0.5 animate-in fade-in duration-150">
              <button
                onClick={() => onSelectNav('services')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={getItemStyle(currentNav === 'services')}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Layers size={15} style={{ color: currentNav === 'services' ? accentColor : (currentThemeConfig.textMuted || '#64748b') }} />
                  <span className="truncate">{t.serviceMonitor || 'Giám Sát Services'}</span>
                </div>
                {renderCountBadge(`${runningCount}/${totalCount}`, runningCount > 0)}
              </button>

              <button
                onClick={() => onSelectNav('env_vars')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={getItemStyle(currentNav === 'env_vars')}
              >
                <Sliders size={15} style={{ color: currentNav === 'env_vars' ? accentColor : (currentThemeConfig.textMuted || '#64748b') }} />
                <span className="truncate">{t.envVars || 'Biến Môi Trường'}</span>
              </button>

              <button
                onClick={() => onSelectNav('categories')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={getItemStyle(currentNav === 'categories')}
              >
                <Tag size={15} style={{ color: currentNav === 'categories' ? accentColor : (currentThemeConfig.textMuted || '#64748b') }} />
                <span className="truncate">{t.categories || 'Danh Mục'}</span>
              </button>

              <button
                onClick={() => onSelectNav('manage_services')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={getItemStyle(currentNav === 'manage_services')}
              >
                <Boxes size={15} style={{ color: currentNav === 'manage_services' ? accentColor : (currentThemeConfig.textMuted || '#64748b') }} />
                <span className="truncate">{t.manageServices || 'Quản Lý Services'}</span>
              </button>
            </div>
          )}
        </div>

        {/* 5. GROUP: TERMINAL (WITH + BUTTON MATCHING SCREENSHOT) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-widest font-sans" style={{ color: currentThemeConfig.textMuted }}>
            <span>{t.terminal || 'Terminal'}</span>
            <button
              onClick={onNewTerminal}
              title={t.newTerminalTip || 'Mở Terminal mới'}
              className="p-0.5 rounded transition-colors"
              style={{ color: currentThemeConfig.textMuted }}
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="space-y-0.5">
            {terminalSessions && terminalSessions.length > 0 ? (
              terminalSessions.map((s) => {
                const isLocal = s.os === 'windows' || s.os === 'wsl' || s.os === 'local' || s.os === 'macos' || s.os === 'linux' || s.id?.startsWith('local_');
                return (
                  <button
                    key={s.id}
                    onClick={() => onSelectSession && onSelectSession(s)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all"
                    style={getItemStyle(activeSession?.id === s.id, true)}
                  >
                    <span className={`w-2 h-2 rounded-full ${isLocal ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-emerald-500 shadow-[0_0_6px_#10b981]'}`}></span>
                    <span className="truncate">{s.user ? `${s.user}@${s.name}` : s.name}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-1.5 text-[11px] font-mono flex items-center gap-2" style={{ color: currentThemeConfig.textMuted }}>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                <span className="truncate">Chưa có phiên</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* SIDEBAR FOOTER: LOCAL TERMINAL & SETTINGS                */}
      {/* ======================================================== */}
      <div className="pt-2 border-t flex flex-col space-y-1 flex-shrink-0" style={{ borderColor: currentThemeConfig.border }}>
        {/* Local Terminal */}
        <button
          onClick={onNewTerminal}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium border border-transparent transition-all hover:bg-slate-800/40"
          style={{ color: currentThemeConfig.textMuted }}
          title={settings?.enableWsl ? 'Mở Terminal WSL Linux cục bộ' : 'Mở Terminal Windows PowerShell cục bộ'}
        >
          <Terminal size={14} style={{ color: settings?.enableWsl ? '#10b981' : '#38bdf8' }} />
          <span className="truncate font-sans">
            {settings?.enableWsl 
              ? `Local Terminal (WSL)` 
              : 'Local Terminal (PowerShell)'}
          </span>
        </button>

        {/* Settings button with dynamic accent highlight */}
        <button
          onClick={() => onSelectNav('settings')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all"
          style={getItemStyle(currentNav === 'settings')}
        >
          <div className="flex items-center gap-2.5">
            <Settings size={14} style={{ color: currentNav === 'settings' ? accentColor : (currentThemeConfig.textMuted || '#64748b') }} />
            <span>{t.settings || 'Settings'}</span>
          </div>
          <span style={{ color: accentColor }}>
            <Sparkles size={12} />
          </span>
        </button>
      </div>
    </aside>
  );
}
