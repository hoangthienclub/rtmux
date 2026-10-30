import React, { useState } from 'react';
import { Play, Square, RotateCw, Settings, Trash2, ExternalLink } from 'lucide-react';
import ServiceLogView from './ServiceLogView';

export default function ServiceCard({
  service,
  logs = [],
  onStart,
  onStop,
  onRestart,
  onClearLogs,
  onOpenEnvModal,
  onChangeProfile,
  onTogglePopout,
  currentThemeConfig = {},
  accentColor = '#10b981'
}) {
  const isRunning = service.statusInfo?.status === 'RUNNING';
  const isError = service.statusInfo?.status === 'ERROR';
  const pid = service.statusInfo?.pid;

  const [isHovered, setIsHovered] = useState(false);
  const profileKeys = Object.keys(service.profiles || {});

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex flex-col rounded-2xl transition-all duration-200 border shadow-lg overflow-hidden"
      style={{
        backgroundColor: currentThemeConfig.card || '#18181b',
        borderColor: isRunning 
          ? '#10b981' 
          : isError 
          ? '#f43f5e' 
          : isHovered 
          ? currentThemeConfig.hoverBorder || '#3f3f46' 
          : currentThemeConfig.border || '#27272a'
      }}
    >
      {/* Top Header of the Card */}
      <div 
        className="p-3.5 pb-2.5 flex flex-col space-y-2.5 border-b"
        style={{
          backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
          borderColor: currentThemeConfig.border || '#27272a'
        }}
      >
        {/* Row 1: Name, Profile Select, Expand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <h3 className="font-mono text-sm font-bold tracking-wide" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
              {service.name}
            </h3>
            {/* Profile Dropdown */}
            <select
              value={service.activeProfile}
              onChange={(e) => onChangeProfile(service.id, e.target.value)}
              disabled={isRunning}
              className="rounded-lg px-2 py-0.5 text-xs font-mono focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border"
              style={{
                backgroundColor: currentThemeConfig.card || '#18181b',
                borderColor: currentThemeConfig.border || '#27272a',
                color: currentThemeConfig.text || '#f4f4f5'
              }}
              title={isRunning ? "Hãy Stop service trước khi đổi Profile" : "Chọn Profile Env"}
            >
              {profileKeys.map((k) => (
                <option key={k} value={k}>
                  {k} ({service.profiles[k]?.name || k})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => onOpenEnvModal(service)}
              title="Chỉnh sửa Biến Môi Trường (Env)"
              className="p-1.5 rounded-lg transition-colors hover:text-white"
              style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}
            >
              <Settings size={14} />
            </button>
            <button
              onClick={() => onTogglePopout(service)}
              title="Mở rộng Terminal Log"
              className="p-1.5 rounded-lg transition-colors hover:text-white"
              style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}
            >
              <ExternalLink size={14} />
            </button>
          </div>
        </div>

        {/* Row 2: Badges (Status, Category, Port, PID) */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {/* Status Badge */}
          {isRunning ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
              Running {pid && `(PID: ${pid})`}
            </span>
          ) : isError ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5"></span>
              Error
            </span>
          ) : (
            <span 
              className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold border"
              style={{
                backgroundColor: currentThemeConfig.card || '#18181b',
                borderColor: currentThemeConfig.border || '#27272a',
                color: currentThemeConfig.textMuted || '#a1a1aa'
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-1.5"></span>
              Stopped
            </span>
          )}

          {/* Category/Module Badge */}
          <span 
            className="px-2 py-0.5 rounded font-medium border"
            style={{
              backgroundColor: `${accentColor}15`,
              borderColor: `${accentColor}30`,
              color: accentColor
            }}
          >
            {service.category || 'CORE'}
          </span>

          {/* Port Badge */}
          {service.port && (
            <span 
              className="font-mono px-2 py-0.5 rounded font-medium border"
              style={{
                backgroundColor: `${accentColor}10`,
                borderColor: `${accentColor}25`,
                color: accentColor
              }}
            >
              :{service.port}
            </span>
          )}

          {/* Active Profile Tag */}
          <span 
            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: currentThemeConfig.card || '#18181b',
              color: currentThemeConfig.textMuted || '#a1a1aa'
            }}
          >
            {service.activeProfile}
          </span>
        </div>

        {/* Row 3: Action Buttons */}
        <div className="flex items-center space-x-2 pt-1">
          {isRunning ? (
            <button
              onClick={() => onStop(service.id)}
              className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
            >
              <Square size={13} />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={() => onStart(service.id)}
              className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold text-white transition-all shadow-sm active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              <Play size={13} className="fill-current" />
              <span>Start</span>
            </button>
          )}

          <button
            onClick={() => onRestart(service.id)}
            title="Restart Service"
            className="flex items-center justify-center space-x-1 py-1.5 px-3 rounded-xl text-xs font-medium border transition-all hover:text-white"
            style={{
              backgroundColor: currentThemeConfig.card || '#18181b',
              borderColor: currentThemeConfig.border || '#27272a',
              color: currentThemeConfig.textMuted || '#a1a1aa'
            }}
          >
            <RotateCw size={13} />
            <span>Restart</span>
          </button>

          <button
            onClick={() => onClearLogs(service.id)}
            title="Clear Logs"
            className="flex items-center justify-center space-x-1 py-1.5 px-3 rounded-xl text-xs font-medium border transition-all hover:text-rose-400"
            style={{
              backgroundColor: currentThemeConfig.card || '#18181b',
              borderColor: currentThemeConfig.border || '#27272a',
              color: currentThemeConfig.textMuted || '#a1a1aa'
            }}
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Log Area */}
      <div className="p-2" style={{ backgroundColor: currentThemeConfig.innerInput || '#0d0d10' }}>
        <ServiceLogView
          logs={logs}
          serviceName={service.name}
          onClear={() => onClearLogs(service.id)}
          onTogglePopout={() => onTogglePopout(service)}
        />
      </div>
    </div>
  );
}
