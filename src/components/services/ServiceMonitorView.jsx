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
  Folder,
  Filter,
  Check,
  X
} from 'lucide-react';
import GroupSection from './GroupSection';
import { THEME_CONFIGS } from '../../constants/palettes';
import { translations } from '../../i18n/translations';

// Helper: Strip ANSI escape sequences and leftover artifacts like [38;5;3m or [0m
function cleanAnsiText(text) {
  if (!text) return '';
  return text
    .replace(/(?:\x1b|\u001b|\\x1b|\\u001b)\[[0-9;?]*[a-zA-Z]/g, '')
    .replace(/(?:\x1b|\u001b|\\x1b|\\u001b)\([a-zA-Z]/g, '')
    .replace(/\[(?:38;5;\d+|48;5;\d+|[0-9;]{1,12})m/g, '')
    .replace(/\[(?:[0-9]{1,3})m/g, '');
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
    lower.includes('running with') || 
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
function renderStatusBadge(statusInfo, size = 'md', isLight = false) {
  const status = (statusInfo?.status || 'STOPPED').toUpperCase();
  const isRunning = status === 'RUNNING';
  const isError = status === 'ERROR';
  const isStarting = status === 'STARTING' || status === 'RESTARTING';
  const isStopping = status === 'STOPPING';

  if (isRunning) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-mono font-bold rounded-full border ${
        isLight
          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
          : 'bg-emerald-950/70 border-emerald-700/80 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
      } ${size === 'sm' ? 'text-[9.5px] px-2 py-0.5' : 'text-[10.5px] px-2.5 py-0.5'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-emerald-600' : 'bg-emerald-400'} animate-pulse`}></span>
        <span>RUNNING</span>
      </span>
    );
  }
  if (isError) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-mono font-bold rounded-full border ${
        isLight
          ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
          : 'bg-rose-950/70 border-rose-700/80 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.35)]'
      } ${size === 'sm' ? 'text-[9.5px] px-2 py-0.5' : 'text-[10.5px] px-2.5 py-0.5'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-rose-600' : 'bg-rose-400'}`}></span>
        <span>ERROR</span>
      </span>
    );
  }
  if (isStarting || isStopping) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-mono font-bold rounded-full border ${
        isLight
          ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm'
          : 'bg-amber-950/70 border-amber-700/80 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
      } ${size === 'sm' ? 'text-[9.5px] px-2 py-0.5' : 'text-[10.5px] px-2.5 py-0.5'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-amber-600' : 'bg-amber-400'} animate-ping`}></span>
        <span>{isStarting ? 'STARTING...' : 'STOPPING...'}</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-full border ${
      isLight
        ? 'bg-slate-100 border-slate-300 text-slate-600'
        : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
    } ${size === 'sm' ? 'text-[9.5px] px-2 py-0.5' : 'text-[10.5px] px-2.5 py-0.5'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-slate-400' : 'bg-slate-500'}`}></span>
      <span>STOPPED</span>
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
  onRestartAll,
  onKillAll,
  onReloadServices,
  batchActionLoading = null,
  settings = {}
}) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const isLight = !!currentThemeConfig?.isLight;
  const accentColor = settings?.accentColor || '#10b981';
  const lang = settings?.language || 'vi';
  const t = translations?.[lang] || translations?.vi || {};

  const [localActionLoading, setLocalActionLoading] = useState(null);
  const [filterKeyword, setFilterKeyword] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('service_tool_monitor_selected_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('service_tool_monitor_selected_categories', JSON.stringify(selectedCategoryFilters));
    } catch (_) {}
  }, [selectedCategoryFilters]);

  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const logContainerRef = useRef(null);

  // Helper: Extract all groups/categories for any service
  const getSvcGroups = (s) => {
    if (Array.isArray(s.groups) && s.groups.length > 0) {
      return s.groups.map(g => String(g).trim().toUpperCase()).filter(Boolean);
    }
    const raw = s.group || s.category || 'SERVICE';
    return String(raw).split(',').map(g => g.trim().toUpperCase()).filter(Boolean);
  };

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

  // Distinct category list across all services
  const allCategories = React.useMemo(() => {
    const counts = {};
    (Array.isArray(services) ? services : []).forEach(s => {
      const groups = getSvcGroups(s);
      groups.forEach(g => {
        counts[g] = (counts[g] || 0) + 1;
      });
    });
    return Object.keys(counts).map(catId => ({
      id: catId,
      name: catId,
      count: counts[catId]
    }));
  }, [services]);

  // Group services by Category (multi-category aware for Grid view)
  const groupedServices = {};
  (Array.isArray(services) ? services : []).forEach((s) => {
    const groups = getSvcGroups(s);
    groups.forEach(cat => {
      if (!groupedServices[cat]) groupedServices[cat] = [];
      if (!groupedServices[cat].some(existing => existing.id === s.id)) {
        groupedServices[cat].push(s);
      }
    });
  });

  const categoryKeys = Object.keys(groupedServices).filter(cat => {
    if (selectedCategoryFilters.length === 0) return true;
    return selectedCategoryFilters.includes(cat);
  });

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

  // Filtered services for left sidebar (multi-category + search)
  const filteredSidebarServices = (Array.isArray(services) ? services : []).filter(s => {
    const sGroups = getSvcGroups(s);
    if (selectedCategoryFilters.length > 0) {
      const hasMatch = selectedCategoryFilters.some(cat => sGroups.includes(cat));
      if (!hasMatch) return false;
    }
    if (!serviceSearch.trim()) return true;
    const q = serviceSearch.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.id || '').toLowerCase().includes(q) ||
      sGroups.some(g => g.toLowerCase().includes(q)) ||
      String(s.port || '').includes(q)
    );
  });

  // Running count within filtered sidebar services
  const runningSidebarCount = filteredSidebarServices.filter(s => (s.statusInfo?.status || '').toUpperCase() === 'RUNNING').length;

  const isStartLoading = batchActionLoading === 'start' || localActionLoading === 'start';
  const isRestartLoading = batchActionLoading === 'restart' || localActionLoading === 'restart';
  const isStopLoading = batchActionLoading === 'stop' || localActionLoading === 'stop';
  const isKillLoading = batchActionLoading === 'kill' || localActionLoading === 'kill';
  const isAnyLoading = isStartLoading || isRestartLoading || isStopLoading || isKillLoading;

  // Scope label for category-targeted actions
  const isAllCategories = selectedCategoryFilters.length === 0;
  const scopeCount = filteredSidebarServices.length;
  const scopeSuffix = isAllCategories ? 'All' : `(${scopeCount})`;

  // Handle Start Selected Categories or All
  const handleStartSelectedCategory = async () => {
    if (isAnyLoading) return;
    try {
      setLocalActionLoading('start');
      if (isAllCategories) {
        if (onStartAll) await onStartAll();
      } else {
        const toStart = filteredSidebarServices.filter(s => (s.statusInfo?.status || '').toUpperCase() !== 'RUNNING');
        await Promise.allSettled(
          toStart.map(s => onStartService && onStartService(s.id))
        );
        if (onReloadServices) await onReloadServices();
      }
    } catch (err) {
      console.error('Failed to start selected category services:', err);
    } finally {
      setLocalActionLoading(null);
    }
  };

  // Handle Restart Selected Categories or All
  const handleRestartSelectedCategory = async () => {
    if (isAnyLoading) return;
    try {
      setLocalActionLoading('restart');
      if (isAllCategories) {
        if (onRestartAll) await onRestartAll();
      } else {
        await Promise.allSettled(
          filteredSidebarServices.map(s => onRestartService && onRestartService(s.id))
        );
        if (onReloadServices) await onReloadServices();
      }
    } catch (err) {
      console.error('Failed to restart selected category services:', err);
    } finally {
      setLocalActionLoading(null);
    }
  };

  // Handle Stop Selected Categories or All
  const handleStopSelectedCategory = async () => {
    if (isAnyLoading) return;
    try {
      setLocalActionLoading('stop');
      if (isAllCategories) {
        if (onStopAll) await onStopAll();
      } else {
        const toStop = filteredSidebarServices.filter(s => (s.statusInfo?.status || '').toUpperCase() !== 'STOPPED');
        await Promise.allSettled(
          toStop.map(s => onStopService && onStopService(s.id))
        );
        if (onReloadServices) await onReloadServices();
      }
    } catch (err) {
      console.error('Failed to stop selected category services:', err);
    } finally {
      setLocalActionLoading(null);
    }
  };

  // Handle Kill Ports Selected Categories or All
  const handleKillPortSelectedCategory = async () => {
    if (isAnyLoading) return;
    try {
      setLocalActionLoading('kill');
      if (isAllCategories) {
        if (onKillAll) await onKillAll();
      } else {
        await Promise.allSettled(
          filteredSidebarServices.map(s => onKillPort && onKillPort(s.id))
        );
        if (onReloadServices) await onReloadServices();
      }
    } catch (err) {
      console.error('Failed to kill ports for selected category services:', err);
    } finally {
      setLocalActionLoading(null);
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col p-6 overflow-y-auto custom-scroll space-y-5"
      style={{ backgroundColor: currentThemeConfig.bg, color: currentThemeConfig.text }}
    >
      {/* 1. Header Card with Category Start All & Icon-only Toggle */}
      <div 
        className="relative z-30 rounded-2xl px-5 py-4 border transition-all flex-shrink-0 min-h-[72px]"
        style={{ 
          backgroundColor: currentThemeConfig.card,
          borderColor: currentThemeConfig.border
        }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div 
            className="absolute right-0 top-0 w-72 h-full blur-3xl pointer-events-none"
            style={{ backgroundColor: `${accentColor}12` }}
          />
        </div>
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
            {/* Category Multiselect Start All / Stop All Segment */}
            <div 
              className="flex items-center gap-1.5 p-1 rounded-xl border flex-shrink-0 h-10 shadow-sm"
              style={{ 
                backgroundColor: currentThemeConfig.innerInput, 
                borderColor: currentThemeConfig.border 
              }}
            >
              {/* Category Dropdown Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCatDropdownOpen(prev => !prev)}
                  className="h-8 px-2.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all border cursor-pointer"
                  style={{
                    backgroundColor: selectedCategoryFilters.length > 0 ? `${accentColor}18` : 'transparent',
                    borderColor: selectedCategoryFilters.length > 0 ? accentColor : 'transparent',
                    color: selectedCategoryFilters.length > 0 ? accentColor : currentThemeConfig.text
                  }}
                  title="Chọn một hoặc nhiều danh mục để lọc và điều khiển"
                >
                  <Filter size={12} style={{ color: selectedCategoryFilters.length > 0 ? accentColor : currentThemeConfig.textMuted }} />
                  <span className="truncate max-w-[170px]">
                    {selectedCategoryFilters.length === 0
                      ? `Tất cả danh mục (${allCategories.length})`
                      : selectedCategoryFilters.length === 1
                      ? `Nhóm: ${selectedCategoryFilters[0]}`
                      : `Nhóm (${selectedCategoryFilters.length} đã chọn)`}
                  </span>
                  <ChevronDown size={11} className={`transition-transform flex-shrink-0 ${isCatDropdownOpen ? 'rotate-180' : ''}`} style={{ color: currentThemeConfig.textMuted }} />
                </button>

                {/* Dropdown Menu */}
                {isCatDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsCatDropdownOpen(false)} />
                    <div 
                      className="absolute right-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl p-3 z-50 animate-in fade-in space-y-2"
                      style={{
                        backgroundColor: currentThemeConfig.card || '#18181b',
                        borderColor: currentThemeConfig.border || '#27272a'
                      }}
                    >
                      <div className="flex items-center justify-between pb-2 border-b px-1" style={{ borderColor: currentThemeConfig.border }}>
                        <span className="text-[11px] font-bold font-mono" style={{ color: currentThemeConfig.textMuted }}>
                          Lọc danh mục ({selectedCategoryFilters.length}/{allCategories.length})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryFilters([])}
                            className="text-[10px] font-mono hover:underline cursor-pointer"
                            style={{ color: accentColor }}
                          >
                            Tất cả
                          </button>
                          <span style={{ color: currentThemeConfig.textMuted }}>•</span>
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryFilters([])}
                            className="text-[10px] font-mono text-rose-400 hover:underline cursor-pointer"
                          >
                            Xóa lọc
                          </button>
                        </div>
                      </div>

                      <div className="max-h-60 overflow-y-auto custom-scroll space-y-1">
                        {allCategories.map(cat => {
                          const isChecked = selectedCategoryFilters.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setSelectedCategoryFilters(prev => {
                                  if (prev.includes(cat.id)) {
                                    return prev.filter(c => c !== cat.id);
                                  } else {
                                    return [...prev, cat.id];
                                  }
                                });
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-mono transition-colors text-left cursor-pointer border"
                              style={{
                                backgroundColor: isChecked ? `${accentColor}20` : 'transparent',
                                borderColor: isChecked ? `${accentColor}50` : 'transparent',
                                color: isChecked ? accentColor : currentThemeConfig.text
                              }}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 bg-black/20'}`}>
                                  {isChecked && '✓'}
                                </span>
                                <span className="truncate font-semibold">{cat.name}</span>
                              </div>
                              <span 
                                className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold"
                                style={{
                                  backgroundColor: isChecked ? `${accentColor}30` : currentThemeConfig.innerInput,
                                  color: isChecked ? accentColor : currentThemeConfig.textMuted
                                }}
                              >
                                {cat.count} apps
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {selectedCategoryFilters.length > 0 && (
                        <div className="pt-2 border-t flex items-center justify-between text-[11px] font-mono px-1" style={{ borderColor: currentThemeConfig.border }}>
                          <span style={{ color: currentThemeConfig.textMuted }}>Khớp {filteredSidebarServices.length} services</span>
                          <button
                            type="button"
                            onClick={() => setIsCatDropdownOpen(false)}
                            className="px-2.5 py-1 rounded-lg text-white font-bold text-xs"
                            style={{ backgroundColor: accentColor }}
                          >
                            Xong
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Start Category Button */}
              <button
                type="button"
                onClick={handleStartSelectedCategory}
                disabled={isAnyLoading}
                className="h-8 px-2.5 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: accentColor }}
                title={`Khởi động ${isAllCategories ? 'tất cả dịch vụ' : `${scopeCount} dịch vụ trong danh mục đã chọn`}`}
              >
                {isStartLoading ? (
                  <RotateCw size={11} className="animate-spin text-white" />
                ) : (
                  <Play size={11} className="fill-current" />
                )}
                <span>
                  {isStartLoading
                    ? 'Starting...'
                    : `Start ${scopeSuffix}`}
                </span>
              </button>

              {/* Restart Category Button */}
              <button
                type="button"
                onClick={handleRestartSelectedCategory}
                disabled={isAnyLoading}
                className="h-8 px-2.5 rounded-lg border text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: currentThemeConfig.card || '#18181b',
                  borderColor: currentThemeConfig.border || '#27272a',
                  color: currentThemeConfig.text 
                }}
                title={`Khởi động lại ${isAllCategories ? 'tất cả dịch vụ' : `${scopeCount} dịch vụ trong danh mục đã chọn`}`}
              >
                <RotateCw size={11} className={isRestartLoading ? 'animate-spin text-emerald-400' : ''} />
                <span>
                  {isRestartLoading
                    ? 'Restarting...'
                    : `Restart ${scopeSuffix}`}
                </span>
              </button>

              {/* Stop Category Button */}
              <button
                type="button"
                onClick={handleStopSelectedCategory}
                disabled={isAnyLoading}
                className="h-8 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                title={`Dừng ${isAllCategories ? 'tất cả dịch vụ' : `${scopeCount} dịch vụ trong danh mục đã chọn`}`}
              >
                {isStopLoading ? (
                  <RotateCw size={11} className="animate-spin text-white" />
                ) : (
                  <Square size={11} className="fill-current" />
                )}
                <span>
                  {isStopLoading
                    ? 'Stopping...'
                    : `Stop ${scopeSuffix}`}
                </span>
              </button>

              {/* Kill Ports Category Button */}
              <button
                type="button"
                onClick={handleKillPortSelectedCategory}
                disabled={isAnyLoading}
                className="h-8 px-2.5 rounded-lg text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Giải phóng cổng mạng (Kill Ports) của ${isAllCategories ? 'tất cả dịch vụ' : `${scopeCount} dịch vụ trong danh mục đã chọn`}`}
              >
                {isKillLoading ? (
                  <RotateCw size={11} className="animate-spin text-amber-300" />
                ) : (
                  <Zap size={11} className="fill-current text-amber-400" />
                )}
                <span>
                  {isKillLoading
                    ? 'Killing...'
                    : `Kill Ports ${scopeSuffix}`}
                </span>
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
              className="flex items-center justify-between pb-3 mb-2.5 border-b"
              style={{ borderColor: currentThemeConfig.border }}
            >
              <span className="font-bold text-xs tracking-wider uppercase font-sans" style={{ color: currentThemeConfig.text }}>
                Danh Sách Services
              </span>
              <span 
                className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1.5"
                style={{ 
                  color: runningSidebarCount > 0 ? accentColor : currentThemeConfig.textMuted, 
                  backgroundColor: runningSidebarCount > 0 ? `${accentColor}18` : currentThemeConfig.innerInput, 
                  borderColor: runningSidebarCount > 0 ? `${accentColor}35` : currentThemeConfig.border 
                }}
                title={filteredSidebarServices.length !== services.length 
                  ? `Đang chạy ${runningSidebarCount}/${filteredSidebarServices.length} (Bộ lọc đang áp dụng trên tổng ${services.length} services)`
                  : `Đang chạy ${runningSidebarCount}/${services.length} services`}
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: runningSidebarCount > 0 ? accentColor : '#64748b',
                    boxShadow: runningSidebarCount > 0 ? `0 0 6px ${accentColor}` : 'none'
                  }}
                />
                <span>{runningSidebarCount}/{filteredSidebarServices.length} {t.running || 'running'}</span>
              </span>
            </div>

            {/* Quick search input */}
            <div className="relative mb-3">
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
                const svcGroups = getSvcGroups(svc);

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
                      {renderStatusBadge(svc.statusInfo, 'sm', isLight)}
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

                    {/* Category badges */}
                    <div className="flex items-center gap-1 flex-wrap mt-1.5">
                      {svcGroups.map(grp => (
                        <span 
                          key={grp} 
                          className="text-[9px] font-mono px-1.5 py-0.2 rounded border"
                          style={{
                            backgroundColor: currentThemeConfig.card,
                            borderColor: currentThemeConfig.border,
                            color: currentThemeConfig.textMuted
                          }}
                        >
                          {grp}
                        </span>
                      ))}
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
                
                {renderStatusBadge(selectedService.statusInfo, 'md', isLight)}

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
                    className="flex items-center gap-1.5 h-8 px-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                    title={`Dừng dịch vụ ${selectedService.name}`}
                  >
                    <Square size={12} className="fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onStartService && onStartService(selectedService.id)}
                    className="flex items-center gap-1.5 h-8 px-4 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                    style={{ backgroundColor: accentColor }}
                    title={`Khởi động dịch vụ ${selectedService.name}`}
                  >
                    <Play size={12} className="fill-current" />
                    <span>Start ({selectedService.activeProfile || 'default'})</span>
                  </button>
                )}

                {/* Restart */}
                <button
                  onClick={() => onRestartService && onRestartService(selectedService.id)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium border transition-all active:scale-95 hover:border-slate-500 cursor-pointer"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                  title={`Khởi động lại dịch vụ ${selectedService.name}`}
                >
                  <RotateCw size={12} />
                  <span>Restart</span>
                </button>

                {/* Kill Port */}
                <button
                  onClick={() => onKillPort && onKillPort(selectedService.id)}
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${
                    isLight 
                      ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100' 
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
                  }`}
                  title={`Giải phóng cổng mạng của ${selectedService.name} (Port ${selectedService.port})`}
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

            {/* Live Console Window (Terminal screen always stays crisp dark for 100% ANSI readability) */}
            <div 
              className="flex-1 flex flex-col border rounded-xl overflow-hidden min-h-[380px]"
              style={{
                backgroundColor: isLight ? '#0a0f1d' : currentThemeConfig.innerInput,
                borderColor: isLight ? '#cbd5e1' : currentThemeConfig.border
              }}
            >
              {/* Console Header Bar */}
              <div 
                className="h-9 px-3 border-b flex items-center justify-between flex-shrink-0"
                style={{
                  backgroundColor: isLight ? '#0f172a' : currentThemeConfig.card,
                  borderColor: isLight ? '#1e293b' : currentThemeConfig.border
                }}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-slate-500'}`}></span>
                  <span className="font-mono text-xs font-medium" style={{ color: isLight ? '#f1f5f9' : currentThemeConfig.text }}>
                    Console: {selectedService.name} <span style={{ color: isLight ? '#94a3b8' : currentThemeConfig.textMuted }}>({rawLogs.length}/200 lines)</span>
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
                        backgroundColor: isLight ? '#1e293b' : currentThemeConfig.innerInput,
                        borderColor: isLight ? '#334155' : currentThemeConfig.border,
                        color: isLight ? '#f8fafc' : currentThemeConfig.text
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
                style={{ backgroundColor: '#070b14' }}
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
