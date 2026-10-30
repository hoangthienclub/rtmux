import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  RotateCw, 
  Zap, 
  Settings, 
  Trash2, 
  Search, 
  Square, 
  ChevronDown,
  Terminal,
  LayoutGrid,
  LayoutList,
  Layers,
  Folder
} from 'lucide-react';
import GroupSection from './GroupSection';
import { THEME_CONFIGS } from '../../constants/palettes';

// Helper: Strip ANSI escape sequences and leftover artifacts like [38;5;3m or [0m
function cleanAnsiText(text) {
  if (!text) return '';
  return text
    .replace(/(?:\x1b|\u001b|\\x1b|\\u001b)\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\[(?:38;5;\d+|[0-9;]{1,6})m/g, '');
}

// Helper: Classify log line level and return syntax color
function getLogLineStyle(text, type) {
  const cleaned = cleanAnsiText(text);
  const lower = cleaned.toLowerCase();

  const isError = type === 'stderr' || 
    lower.includes('error') || 
    lower.includes('[error]') ||
    lower.includes('exception') || 
    lower.includes('failed') || 
    lower.includes('failure') || 
    lower.includes('typeerror') || 
    lower.includes('syntaxerror') ||
    lower.includes('unhandledrejection') ||
    lower.includes('lỗi');

  const isWarning = lower.includes('warn') || 
    lower.includes('[warn]') || 
    lower.includes('warning') || 
    lower.includes('cảnh báo') ||
    lower.includes('deprecated') ||
    lower.includes('deprecation');

  const isSuccess = lower.includes('successfully') || 
    lower.includes('listening at') || 
    lower.includes('running on') || 
    lower.includes('started on') ||
    lower.includes('connected') ||
    lower.includes('✔');

  const isInfo = lower.includes('log') || 
    lower.includes('info') || 
    lower.includes('[nest]') || 
    lower.includes('[bff]') || 
    lower.includes('mapped') || 
    lower.includes('routesresolver') || 
    lower.includes('routerexplorer');

  const isSystem = type === 'system' || 
    lower.includes('[dashboard]') || 
    lower.includes('[wsl2]');

  if (isError) {
    return {
      textColor: '#f87171', // rose-400
      bgColor: 'rgba(244, 63, 94, 0.1)',
      borderColor: '#f43f5e',
      badgeText: 'ERR',
      badgeClass: 'bg-rose-500/20 text-rose-400 border border-rose-500/40',
      cleaned
    };
  }
  if (isWarning) {
    return {
      textColor: '#fbbf24', // amber-400
      bgColor: 'rgba(245, 158, 11, 0.07)',
      borderColor: '#f59e0b',
      badgeText: 'WARN',
      badgeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
      cleaned
    };
  }
  if (isSuccess) {
    return {
      textColor: '#34d399', // emerald-400
      bgColor: 'rgba(16, 185, 129, 0.06)',
      borderColor: '#10b981',
      badgeText: 'OK',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
      cleaned
    };
  }
  if (isSystem) {
    return {
      textColor: '#c084fc', // purple-400
      badgeText: 'SYS',
      badgeClass: 'bg-purple-500/20 text-purple-400 border border-purple-500/40',
      cleaned
    };
  }
  if (isInfo) {
    return {
      textColor: '#38bdf8', // sky-400 / cyan
      badgeText: 'INFO',
      badgeClass: 'bg-sky-500/20 text-sky-400 border border-sky-500/40',
      cleaned
    };
  }
  return {
    textColor: '#e2e8f0', // slate-200
    cleaned
  };
}

// Helper: Status Badge component for Sidebar and Header
function renderStatusBadge(statusInfo, size = 'md') {
  const status = (statusInfo?.status || 'STOPPED').toUpperCase();
  const isRunning = status === 'RUNNING';
  const isError = status === 'ERROR';
  const isStarting = status === 'STARTING' || status === 'RESTARTING';
  const isStopping = status === 'STOPPING';

  if (isRunning) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-mono font-bold rounded-full border bg-emerald-950/70 border-emerald-700/80 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)] ${size === 'sm' ? 'text-[9.5px] px-2 py-0.5' : 'text-[10.5px] px-2.5 py-0.5'}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>START</span>
      </span>
    );
  }
  if (isError) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-mono font-bold rounded-full border bg-rose-950/70 border-rose-700/80 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.35)] ${size === 'sm' ? 'text-[9.5px] px-2 py-0.5' : 'text-[10.5px] px-2.5 py-0.5'}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
        <span>ERROR</span>
      </span>
    );
  }
  if (isStarting || isStopping) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-mono font-bold rounded-full border bg-amber-950/70 border-amber-700/80 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.25)] ${size === 'sm' ? 'text-[9.5px] px-2 py-0.5' : 'text-[10.5px] px-2.5 py-0.5'}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
        <span>{isStarting ? 'STARTING...' : 'STOPPING...'}</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-full border bg-slate-800/60 border-slate-700/60 text-slate-400 ${size === 'sm' ? 'text-[9.5px] px-2 py-0.5' : 'text-[10.5px] px-2.5 py-0.5'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
      <span>STOP</span>
    </span>
  );
}

export default function ServiceMonitorView({
  services = [],
  logsMap = {},
  selectedServiceId,
  onSelectService,
  onStartService,
  onStopService,
  onRestartService,
  onKillPort,
  onClearLogs,
  onOpenEnvModal,
  onChangeProfile,
  onStartGroup,
  onStopGroup,
  onStartAll,
  onStopAll,
  settings = {}
}) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';

  const [filterKeyword, setFilterKeyword] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedCategoryAction, setSelectedCategoryAction] = useState('ALL');
  const logContainerRef = useRef(null);

  // View mode: 'list' (2-column console view matching user mockup) or 'grid' (cards view)
  // Default is strictly 'list'
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('service_tool_monitor_view_mode_v2');
      if (saved === 'grid') return 'grid';
      return 'list';
    } catch (_) {
      return 'list';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('service_tool_monitor_view_mode_v2', mode);
    } catch (_) {}
  };

  // Group services by Category
  const groupedServices = {};
  (Array.isArray(services) ? services : []).forEach((s) => {
    const cat = s.category || s.group || 'CORE';
    if (!groupedServices[cat]) groupedServices[cat] = [];
    groupedServices[cat].push(s);
  });

  const categoryKeys = Object.keys(groupedServices);

  // Active selected service
  const selectedService = (Array.isArray(services) && services.find(s => s.id === selectedServiceId)) || 
    (Array.isArray(services) && services[0]) || {
      id: 'acc-service',
      name: 'Acc Service',
      port: 45072,
      statusInfo: { status: 'STOPPED' },
      activeProfile: 'default',
      profiles: { default: { name: 'default' } }
    };

  // Raw logs capped strictly at latest 200 lines
  const rawLogs = (logsMap[selectedService?.id] || []).slice(-200);

  const filteredLogs = filterKeyword.trim()
    ? rawLogs.filter(l => (l.text || '').toLowerCase().includes(filterKeyword.toLowerCase()))
    : rawLogs;

  const isRunning = selectedService?.statusInfo?.status === 'RUNNING';

  // Auto-scroll logs in console mode
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [rawLogs]);

  // Filtered services for left sidebar
  const filteredSidebarServices = (Array.isArray(services) ? services : []).filter(s => {
    if (!serviceSearch.trim()) return true;
    const q = serviceSearch.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q) ||
      String(s.port || '').includes(q)
    );
  });

  // Handle Start Category All
  const handleStartSelectedCategory = () => {
    if (selectedCategoryAction === 'ALL') {
      if (onStartAll) onStartAll();
    } else {
      if (onStartGroup) onStartGroup(selectedCategoryAction);
    }
  };

  // Handle Stop Category All
  const handleStopSelectedCategory = () => {
    if (selectedCategoryAction === 'ALL') {
      if (onStopAll) onStopAll();
    } else {
      if (onStopGroup) onStopGroup(selectedCategoryAction);
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col p-6 overflow-y-auto custom-scroll space-y-5"
      style={{ backgroundColor: currentThemeConfig.bg, color: currentThemeConfig.text }}
    >
      {/* 1. Header Card with Category Start All & Icon-only Toggle */}
      <div 
        className="relative overflow-hidden rounded-2xl px-5 py-4 border transition-all flex-shrink-0 min-h-[72px]"
        style={{ 
          backgroundColor: currentThemeConfig.card,
          borderColor: currentThemeConfig.border
        }}
      >
        <div 
          className="absolute right-0 top-0 w-72 h-full blur-3xl pointer-events-none"
          style={{ backgroundColor: `${accentColor}12` }}
        />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <h2 className="text-base font-bold tracking-tight flex items-center gap-2" style={{ color: currentThemeConfig.text }}>
              <Layers size={18} style={{ color: accentColor }} />
              <span>Bảng Điều Khiển Microservices</span>
            </h2>
            <p className="text-xs" style={{ color: currentThemeConfig.textMuted }}>
              Quản lý tiến trình, theo dõi real-time console log và điều khiển dịch vụ hệ thống ({services.length} services).
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Category Start All / Stop All Segment */}
            <div 
              className="flex items-center gap-1.5 p-1 rounded-xl border flex-shrink-0 h-10 shadow-sm"
              style={{ 
                backgroundColor: currentThemeConfig.innerInput, 
                borderColor: currentThemeConfig.border 
              }}
            >
              {/* Category Dropdown Selector */}
              <div className="relative">
                <select
                  value={selectedCategoryAction}
                  onChange={(e) => setSelectedCategoryAction(e.target.value)}
                  className="appearance-none text-xs font-mono rounded-lg pl-2.5 pr-6 py-1.5 focus:outline-none cursor-pointer border-0 bg-transparent font-semibold"
                  style={{ color: currentThemeConfig.text }}
                  title="Chọn danh mục cần Start/Stop toàn bộ"
                >
                  <option value="ALL" className="bg-slate-900 text-white">Tất cả danh mục ({categoryKeys.length})</option>
                  {categoryKeys.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-900 text-white">
                      Danh mục: {cat} ({(groupedServices[cat] || []).length} apps)
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: currentThemeConfig.textMuted }} />
              </div>

              {/* Start Category Button */}
              <button
                type="button"
                onClick={handleStartSelectedCategory}
                className="h-8 px-3 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                style={{ backgroundColor: accentColor }}
                title={`Khởi động tất cả dịch vụ trong danh mục: ${selectedCategoryAction === 'ALL' ? 'Toàn bộ' : selectedCategoryAction}`}
              >
                <Play size={11} className="fill-current" />
                <span>Start {selectedCategoryAction === 'ALL' ? 'All' : selectedCategoryAction}</span>
              </button>

              {/* Stop Category Button */}
              <button
                type="button"
                onClick={handleStopSelectedCategory}
                className="h-8 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                title={`Dừng tất cả dịch vụ trong danh mục: ${selectedCategoryAction === 'ALL' ? 'Toàn bộ' : selectedCategoryAction}`}
              >
                <Square size={11} className="fill-current" />
                <span className="hidden sm:inline">Stop</span>
              </button>
            </div>

            {/* View Mode Switcher: List (2 Cột Console) vs Grid (Cards Phân Hệ) */}
            <div 
              className="flex items-center gap-1 p-1 rounded-xl border flex-shrink-0 h-10 shadow-sm"
              style={{ 
                backgroundColor: currentThemeConfig.innerInput, 
                borderColor: currentThemeConfig.border 
              }}
            >
              {/* List View Button */}
              <button
                type="button"
                onClick={() => handleSetViewMode('list')}
                className="w-9 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer flex-shrink-0 active:scale-95"
                style={{
                  backgroundColor: viewMode === 'list' ? `${accentColor}25` : 'transparent',
                  color: viewMode === 'list' ? accentColor : currentThemeConfig.textMuted,
                  border: viewMode === 'list' ? `1px solid ${accentColor}50` : '1px solid transparent'
                }}
                title="Dạng Danh Sách & Console 2 Cột (List & Console View)"
              >
                <LayoutList size={18} className="flex-shrink-0 stroke-[2]" />
              </button>
              {/* Grid View Button */}
              <button
                type="button"
                onClick={() => handleSetViewMode('grid')}
                className="w-9 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer flex-shrink-0 active:scale-95"
                style={{
                  backgroundColor: viewMode === 'grid' ? `${accentColor}25` : 'transparent',
                  color: viewMode === 'grid' ? accentColor : currentThemeConfig.textMuted,
                  border: viewMode === 'grid' ? `1px solid ${accentColor}50` : '1px solid transparent'
                }}
                title="Dạng Thẻ Phân Hệ (Grid Cards View)"
              >
                <LayoutGrid size={18} className="flex-shrink-0 stroke-[2]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT: 2-COLUMN VIEW (LIST) OR GRID CARDS VIEW */}
      {viewMode === 'list' ? (
        /* ================= 2-COLUMN VIEW (MATCHING USER MOCKUP) ================= */
        <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-[580px] animate-in fade-in duration-150">
          {/* LEFT COLUMN: DANH SÁCH SERVICES */}
          <div 
            className="w-full lg:w-80 flex flex-col flex-shrink-0 border rounded-2xl p-4 shadow-xl"
            style={{ 
              backgroundColor: currentThemeConfig.card, 
              borderColor: currentThemeConfig.border 
            }}
          >
            {/* Header row */}
            <div 
              className="flex items-center justify-between pb-3 mb-3 border-b"
              style={{ borderColor: currentThemeConfig.border }}
            >
              <span className="font-bold text-xs tracking-wider uppercase font-sans" style={{ color: currentThemeConfig.text }}>
                Danh Sách Services
              </span>
              <span 
                className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full border"
                style={{ 
                  color: accentColor, 
                  backgroundColor: `${accentColor}18`, 
                  borderColor: `${accentColor}35` 
                }}
              >
                {services.length} apps
              </span>
            </div>

            {/* Quick search input */}
            <div className="relative mb-2.5">
              <input
                type="text"
                placeholder="Tìm service..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full h-7 border rounded-lg pl-7 pr-2 text-xs font-mono focus:outline-none"
                style={{
                  backgroundColor: currentThemeConfig.innerInput,
                  borderColor: currentThemeConfig.border,
                  color: currentThemeConfig.text
                }}
              />
              <Search size={12} className="absolute left-2.5 top-2 text-slate-500" />
            </div>

            {/* Services List Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scroll max-h-[560px]">
              {filteredSidebarServices.map((svc) => {
                const isSelected = svc.id === selectedService.id;
                const svcStatus = (svc.statusInfo?.status || 'STOPPED').toUpperCase();
                const isSvcError = svcStatus === 'ERROR';
                const isSvcRunning = svcStatus === 'RUNNING';

                return (
                  <button
                    key={svc.id}
                    onClick={() => onSelectService && onSelectService(svc.id)}
                    className="w-full text-left p-3 rounded-xl transition-all border cursor-pointer group"
                    style={{
                      backgroundColor: isSelected ? `${accentColor}15` : currentThemeConfig.innerInput,
                      borderColor: isSelected 
                        ? accentColor 
                        : isSvcError 
                        ? 'rgba(244, 63, 94, 0.6)' 
                        : isSvcRunning 
                        ? 'rgba(16, 185, 129, 0.45)' 
                        : currentThemeConfig.border,
                      boxShadow: isSelected 
                        ? `0 0 15px ${accentColor}25` 
                        : isSvcError 
                        ? '0 0 10px rgba(244, 63, 94, 0.2)' 
                        : 'none'
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span 
                        className="font-semibold text-xs font-mono tracking-tight"
                        style={{ color: isSelected ? accentColor : currentThemeConfig.text }}
                      >
                        {svc.name}
                      </span>
                      {renderStatusBadge(svc.statusInfo, 'sm')}
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span 
                        className="font-semibold font-mono text-[11px] px-1.5 py-0.5 rounded border"
                        style={{
                          color: accentColor,
                          backgroundColor: `${accentColor}12`,
                          borderColor: `${accentColor}30`
                        }}
                      >
                        :{svc.port || svc.statusInfo?.port || '5173'}
                      </span>
                      <span className="text-[10.5px] font-mono" style={{ color: currentThemeConfig.textMuted }}>
                        {svc.activeProfile || 'default'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: SERVICE DETAILS & LIVE CONSOLE */}
          <div 
            className="flex-1 flex flex-col border rounded-2xl p-5 shadow-xl overflow-hidden min-h-[540px]"
            style={{ 
              backgroundColor: currentThemeConfig.card, 
              borderColor: currentThemeConfig.border 
            }}
          >
            {/* Top Action Bar for selected service */}
            <div 
              className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b flex-shrink-0"
              style={{ borderColor: currentThemeConfig.border }}
            >
              {/* Left: Name, Status, Port, Profile */}
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-mono text-base font-bold tracking-tight" style={{ color: currentThemeConfig.text }}>
                  {selectedService.name}
                </h2>
                
                {renderStatusBadge(selectedService.statusInfo, 'md')}

                <span 
                  className="font-mono text-xs px-2.5 py-0.5 rounded-lg border font-semibold"
                  style={{
                    color: accentColor,
                    backgroundColor: `${accentColor}15`,
                    borderColor: `${accentColor}35`
                  }}
                >
                  Port: {selectedService.port || selectedService.statusInfo?.port || '5173'}
                </span>

                {/* Profile Dropdown */}
                <div className="relative">
                  <select
                    value={selectedService.activeProfile || 'default'}
                    onChange={(e) => onChangeProfile && onChangeProfile(selectedService.id, e.target.value)}
                    disabled={isRunning}
                    className="appearance-none text-xs font-mono rounded-lg pl-2.5 pr-7 py-1 focus:outline-none cursor-pointer border disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  >
                    {Object.keys(selectedService.profiles || { default: {} }).map((p) => (
                      <option key={p} value={p}>Profile: {p}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: currentThemeConfig.textMuted }} />
                </div>
              </div>

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Start / Stop Button */}
                {isRunning ? (
                  <button
                    onClick={() => onStopService && onStopService(selectedService.id)}
                    className="flex items-center gap-1.5 h-8 px-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    <Square size={12} className="fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onStartService && onStartService(selectedService.id)}
                    className="flex items-center gap-1.5 h-8 px-4 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Play size={12} className="fill-current" />
                    <span>Start ({selectedService.activeProfile || 'default'})</span>
                  </button>
                )}

                {/* Restart */}
                <button
                  onClick={() => onRestartService && onRestartService(selectedService.id)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium border transition-all active:scale-95 hover:border-slate-500"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                  title="Khởi động lại dịch vụ"
                >
                  <RotateCw size={12} />
                  <span>Restart</span>
                </button>

                {/* Kill Port */}
                <button
                  onClick={() => onKillPort && onKillPort(selectedService.id || selectedService.port)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium border transition-all active:scale-95 bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
                  title="Giải phóng cổng mạng"
                >
                  <Zap size={12} />
                  <span>Kill Port</span>
                </button>

                {/* Config Env */}
                <button
                  onClick={() => onOpenEnvModal && onOpenEnvModal(selectedService)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium border transition-all active:scale-95 hover:border-slate-500"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                  title="Cấu hình biến môi trường"
                >
                  <Settings size={12} />
                  <span>Config Env</span>
                </button>
              </div>
            </div>

            {/* Live Console Window (Strictly capped at 200 lines) */}
            <div 
              className="flex-1 flex flex-col border rounded-xl overflow-hidden min-h-[380px]"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border
              }}
            >
              {/* Console Header Bar */}
              <div 
                className="h-9 px-3 border-b flex items-center justify-between flex-shrink-0"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-slate-500'}`}></span>
                  <span className="font-mono text-xs font-medium" style={{ color: currentThemeConfig.text }}>
                    Console: {selectedService.name} <span style={{ color: currentThemeConfig.textMuted }}>({rawLogs.length}/200 lines)</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={filterKeyword}
                      onChange={(e) => setFilterKeyword(e.target.value)}
                      placeholder="Filter logs..."
                      className="w-44 h-6 border rounded-md px-2 text-[11px] placeholder-slate-500 focus:outline-none font-mono"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput,
                        borderColor: currentThemeConfig.border,
                        color: currentThemeConfig.text
                      }}
                    />
                  </div>

                  <button
                    onClick={() => onClearLogs && onClearLogs(selectedService.id)}
                    title="Xóa log console"
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Console Output Body */}
              <div
                ref={logContainerRef}
                className="flex-1 p-4 font-mono text-[12.5px] leading-relaxed overflow-y-auto select-text scroll-smooth max-h-[500px]"
                style={{ backgroundColor: currentThemeConfig.innerInput }}
              >
                {filteredLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-16 space-y-2 select-none" style={{ color: currentThemeConfig.textMuted }}>
                    <div 
                      className="w-10 h-10 rounded-xl border flex items-center justify-center"
                      style={{ 
                        backgroundColor: currentThemeConfig.card, 
                        borderColor: currentThemeConfig.border, 
                        color: currentThemeConfig.textMuted 
                      }}
                    >
                      <Terminal size={18} />
                    </div>
                    <p className="text-xs font-sans font-semibold" style={{ color: currentThemeConfig.text }}>
                      Chưa có log... Hãy bấm Start để khởi động dịch vụ.
                    </p>
                    <p className="text-[11px] font-sans" style={{ color: currentThemeConfig.textMuted }}>
                      Log streaming realtime (giới hạn 200 dòng mới nhất).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredLogs.map((log, idx) => {
                      const lineStyle = getLogLineStyle(log.text, log.type);
                      return (
                        <div 
                          key={idx} 
                          className="flex items-start gap-2 whitespace-pre-wrap break-all px-2 py-0.5 rounded font-mono text-[12px] leading-relaxed transition-colors hover:bg-white/5"
                          style={{ 
                            color: lineStyle.textColor,
                            backgroundColor: lineStyle.bgColor || 'transparent',
                            borderLeft: lineStyle.borderColor ? `2.5px solid ${lineStyle.borderColor}` : 'none'
                          }}
                        >
                          {lineStyle.badgeText && (
                            <span className={`px-1 py-0.2 rounded text-[9px] font-bold font-mono uppercase tracking-wider flex-shrink-0 select-none ${lineStyle.badgeClass || ''}`}>
                              {lineStyle.badgeText}
                            </span>
                          )}
                          <span className="flex-1">{lineStyle.cleaned}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= GRID CARDS VIEW ================= */
        <div className="space-y-6 animate-in fade-in duration-150">
          {categoryKeys.length === 0 ? (
            <div 
              className="p-12 text-center rounded-2xl border"
              style={{ 
                backgroundColor: currentThemeConfig.card, 
                borderColor: currentThemeConfig.border, 
                color: currentThemeConfig.textMuted 
              }}
            >
              Chưa có dịch vụ nào được cấu hình
            </div>
          ) : (
            categoryKeys.map((catName) => (
              <GroupSection
                key={catName}
                groupName={catName}
                services={groupedServices[catName] || []}
                logsMap={logsMap}
                onStartService={onStartService}
                onStopService={onStopService}
                onRestartService={onRestartService}
                onClearLogs={onClearLogs}
                onOpenEnvModal={onOpenEnvModal}
                onChangeProfile={onChangeProfile}
                onTogglePopout={(svc) => {
                  if (onSelectService) onSelectService(svc.id);
                  handleSetViewMode('list');
                }}
                onStartGroup={onStartGroup}
                onStopGroup={onStopGroup}
                currentThemeConfig={currentThemeConfig}
                accentColor={accentColor}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
