import React, { useState } from 'react';
import { 
  FolderArchive, 
  ChevronDown,
  Monitor,
  PanelLeftClose,
  PanelLeft,
  Server,
  Terminal as TerminalIcon,
  X,
  ShieldCheck,
  Search,
  Edit2,
  Check,
  RefreshCw
} from 'lucide-react';
import { THEME_CONFIGS } from '../constants/palettes';
import { translations } from '../i18n/translations';

export default function TopBar({
  services = [],
  activeCategory = 'ALL',
  onSelectCategory,
  onStartAll,
  onStopAll,
  onRestartAll,
  onKillAll,
  batchActionLoading = null,
  onRefresh,
  isRefreshing,
  onOpenSettings,
  onToggleWsl,
  enableWsl,
  wslDistro,
  settings,
  isWindows = true,
  // Terminal tabs & Sidebar toggle from screenshot
  terminalSessions = [],
  activeSession = null,
  onSelectSession,
  onCloseSession,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onClearLogs,
  activeVpn = null,
  onOpenSearch,
  onOpenBackupRestore
}) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';
  const lang = settings?.language || 'vi';
  const t = translations[lang] || translations.vi;
  const runningCount = Array.isArray(services) ? services.filter(s => s.statusInfo?.status === 'RUNNING').length : 0;
  const totalCount = Array.isArray(services) ? services.length : 0;

  return (
    <header
      className="h-12 border-b flex items-center justify-between px-3 select-none flex-shrink-0 z-30 transition-colors duration-200 gap-3"
      style={{
        backgroundColor: currentThemeConfig.subBg,
        borderColor: currentThemeConfig.border,
        color: currentThemeConfig.text
      }}
    >
      {/* Top Left: Sidebar Toggle + Shell/Remote Tabs (matching Screenshot) */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scroll flex-1">
        {/* Sidebar Toggle Button from Screenshot */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Mở rộng Sidebar' : 'Thu gọn Sidebar'}
            className="w-8 h-8 rounded-xl border flex items-center justify-center transition-all flex-shrink-0"
            style={{
              backgroundColor: currentThemeConfig.innerInput,
              borderColor: isSidebarCollapsed ? accentColor : currentThemeConfig.border,
              color: isSidebarCollapsed ? accentColor : currentThemeConfig.textMuted
            }}
          >
            {isSidebarCollapsed ? <PanelLeft size={15} style={{ color: accentColor }} /> : <PanelLeftClose size={15} />}
          </button>
        )}

        {/* Terminal / Host Tabs matching Screenshot */}
        {terminalSessions && terminalSessions.length > 0 && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {terminalSessions.map((s) => {
              const isActive = activeSession?.id === s.id;
              const isLocal = s.os === 'windows' || s.os === 'wsl' || s.os === 'local' || s.os === 'macos' || s.os === 'linux' || s.id === 'local_win' || s.name === 'Local Shell' || s.id?.startsWith('local_') || s.host === 'localhost';

              return (
                <div
                  key={s.id}
                  onClick={() => onSelectSession && onSelectSession(s)}
                  className="flex items-center gap-2 h-8 px-3 rounded-xl text-xs font-mono transition-all cursor-pointer border shadow-sm flex-shrink-0"
                  style={{
                    backgroundColor: isActive ? `${accentColor}18` : currentThemeConfig.innerInput,
                    borderColor: isActive ? accentColor : currentThemeConfig.border,
                    color: isActive ? accentColor : currentThemeConfig.textMuted,
                    fontWeight: isActive ? '600' : 'normal',
                    boxShadow: isActive ? `0 0 10px ${accentColor}25` : 'none'
                  }}
                >
                  {isLocal ? (
                    <TerminalIcon size={13} style={{ color: isActive ? accentColor : '#38bdf8' }} />
                  ) : (
                    <Server size={13} style={{ color: isActive ? accentColor : currentThemeConfig.textMuted }} />
                  )}
                  <span className="truncate max-w-[140px]">{s.user ? `${s.user}@${s.name}` : s.name}</span>
                  {onCloseSession && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseSession(s.id);
                      }}
                      className="p-0.5 rounded hover:bg-white/10 ml-0.5"
                      style={{ color: currentThemeConfig.textMuted }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Right: Running Status, Profile, and Global Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Running pill: ● 0/2 running (moved to the right per user request) */}
        <div
          className="hidden md:flex items-center gap-1.5 h-7 px-3 border rounded-lg text-xs font-mono flex-shrink-0"
          style={{
            backgroundColor: currentThemeConfig.innerInput,
            borderColor: currentThemeConfig.border
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: runningCount > 0 ? accentColor : '#64748b',
              boxShadow: runningCount > 0 ? `0 0 6px ${accentColor}` : 'none'
            }}
          />
          <span style={{ color: currentThemeConfig.textMuted }}>{runningCount}/{totalCount} {t.running || 'running'}</span>
        </div>

        {/* Active VPN Tunnel Badge */}
        {activeVpn && (
          <div
            className="hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[11px] font-mono flex-shrink-0"
            style={{
              backgroundColor: '#06b6d418',
              borderColor: '#06b6d450',
              color: '#22d3ee'
            }}
            title={`VPN đang kết nối: ${activeVpn.name} (${activeVpn.interfaceIp || activeVpn.endpoint})`}
          >
            <ShieldCheck size={12} className="text-cyan-400" />
            <span className="font-bold truncate max-w-[130px]">{activeVpn.name}</span>
          </div>
        )}

        {/* Environment Status Badge Button (Windows only) */}
        {isWindows && (
          <button
            onClick={() => {
              if (onOpenSettings) {
                onOpenSettings('wsl_env');
              }
            }}
            title={enableWsl ? 'Môi trường: WSL Linux. Bấm để mở Cài đặt WSL & Môi trường' : 'Môi trường: Windows Native. Bấm để mở Cài đặt Môi trường'}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[11px] font-sans font-medium transition-all cursor-pointer hover:brightness-110 active:scale-95"
            style={{
              backgroundColor: enableWsl ? `${accentColor}18` : currentThemeConfig.innerInput,
              borderColor: enableWsl ? `${accentColor}50` : currentThemeConfig.border,
              color: enableWsl ? accentColor : currentThemeConfig.text
            }}
          >
            <Monitor size={12} style={{ color: enableWsl ? accentColor : '#38bdf8' }} />
            <span className="hidden sm:inline">{enableWsl ? `${t.wslEnabled || 'WSL'}: ${wslDistro || 'Ubuntu'}` : (t.winNative || 'Windows Native')}</span>
          </button>
        )}

        {/* Backup / Restore Button */}
        <button
          onClick={onOpenBackupRestore}
          title={t.backupRestore || 'Sao Lưu / Khôi Phục Cấu Hình'}
          className="hidden xl:flex items-center gap-1.5 h-7 px-2.5 border rounded-lg text-xs font-medium font-sans transition-all active:scale-95 cursor-pointer hover:brightness-110"
          style={{
            backgroundColor: `${accentColor}12`,
            borderColor: `${accentColor}35`,
            color: accentColor
          }}
        >
          <FolderArchive size={13} />
          <span>{t.backupRestore || 'Sao Lưu / Khôi Phục'}</span>
        </button>

        {/* Refresh button (Distinct RefreshCw icon) */}
        <button
          onClick={onRefresh}
          title={t.refresh || 'Làm mới dữ liệu'}
          className="w-7 h-7 rounded-lg border flex items-center justify-center transition-all hover:bg-white/5 active:scale-95"
          style={{
            backgroundColor: currentThemeConfig.innerInput,
            borderColor: currentThemeConfig.border,
            color: currentThemeConfig.textMuted
          }}
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} style={{ color: isRefreshing ? accentColor : currentThemeConfig.textMuted }} />
        </button>

        {/* Quick Feature Search / Command Palette (Ctrl+K / ⌘K) */}
        <button
          onClick={onOpenSearch}
          title="Tìm kiếm tính năng, máy chủ SSH, SFTP (Ctrl+K)"
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer hover:brightness-110 active:scale-95 flex-shrink-0"
          style={{
            backgroundColor: currentThemeConfig.innerInput,
            borderColor: currentThemeConfig.border,
            color: currentThemeConfig.text
          }}
        >
          <Search size={13} style={{ color: accentColor }} />
          <kbd 
            className="text-[10px] font-mono px-1 py-0.2 rounded border text-slate-400"
            style={{ 
              borderColor: currentThemeConfig.border, 
              backgroundColor: currentThemeConfig.card 
            }}
          >
            {isWindows ? 'Ctrl+K' : '⌘K'}
          </kbd>
        </button>
      </div>
    </header>
  );
}
