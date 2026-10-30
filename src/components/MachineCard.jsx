import React from 'react';
import { 
  Terminal, 
  ArrowUp, 
  ArrowDown, 
  Settings2, 
  FolderSync, 
  Box, 
  Trash2, 
  Key, 
  Server
} from 'lucide-react';

import { THEME_CONFIGS, getMetricColor } from '../constants/palettes';
import { translations } from '../i18n/translations';

function CircularGauge({ label, percentage, accentColor = '#10b981' }) {
  const radius = 26;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
          <circle
            stroke="#1b2434"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={accentColor}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <span className="absolute font-mono text-[11px] font-semibold" style={{ color: accentColor }}>
          {percentage}%
        </span>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-[#64748b] font-medium mt-1">
        {label}
      </span>
    </div>
  );
}

export default function MachineCard({ 
  machine, 
  onConnect, 
  onEdit, 
  onOpenSftp, 
  onOpenDocker, 
  onDelete,
  settings
}) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';
  const lang = settings?.language || 'vi';
  const t = translations[lang] || translations.vi;

  const isWin = machine.os === 'windows';
  const isWsl = machine.os === 'wsl';
  const tagColor = 
    machine.tag === 'Production' ? 'bg-red-950/60 text-red-400 border-red-800/40' :
    machine.tag === 'UAT' ? 'bg-amber-950/60 text-amber-400 border-amber-800/40' :
    machine.tag === 'Dev' ? 'bg-sky-950/60 text-sky-400 border-sky-800/40' :
    'bg-[#1a2336] text-slate-300 border-[#26354f]';

  const isOnline = machine.uptime && !machine.uptime.includes('Click') && machine.uptime !== 'Offline';

  return (
    <div
      className="rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 group shadow-md hover:shadow-xl border"
      style={{
        backgroundColor: currentThemeConfig.card,
        borderColor: currentThemeConfig.border,
        color: currentThemeConfig.text
      }}
    >
      <div>
        {/* Header: OS Badge, Name, IP, Quick Connect */}
        <div className="flex items-start justify-between mb-3.5">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-inner ${
              isWin
                ? 'bg-[#0284c7]/20 border border-[#0284c7]/50 text-[#38bdf8]'
                : isWsl
                ? 'bg-[#10b981]/20 border border-[#10b981]/50 text-[#10b981]'
                : 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-400'
            }`}>
              {isWin ? 'WIN' : isWsl ? 'WSL' : 'SSH'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm tracking-tight truncate max-w-[150px]" style={{ color: currentThemeConfig.text }}>
                  {machine.name}
                </h3>
                {machine.tag && (
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${tagColor}`}>
                    {machine.tag}
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono truncate max-w-[170px] mt-0.5" style={{ color: currentThemeConfig.textMuted }}>
                {machine.host || `${machine.user || 'root'}@${machine.hostname || machine.name}:${machine.port || 22}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => onConnect(machine)}
            title={t.openSshTerminal || 'Kết nối Terminal SSH'}
            className="w-8 h-8 rounded-xl border flex items-center justify-center transition-all shadow-sm active:scale-95"
            style={{
              backgroundColor: `${accentColor}20`,
              borderColor: `${accentColor}50`,
              color: accentColor
            }}
          >
            <Terminal size={15} />
          </button>
        </div>

        {/* Specs Table */}
        <div
          className="space-y-1.5 text-[11.5px] mb-3.5 p-2.5 rounded-xl border"
          style={{
            backgroundColor: currentThemeConfig.innerInput,
            borderColor: currentThemeConfig.border
          }}
        >
          <div className="flex justify-between">
            <span style={{ color: currentThemeConfig.textMuted }}>{t.coresRam || 'Cores / RAM'}</span>
            <span className="font-mono" style={{ color: currentThemeConfig.text }}>{machine.cores || '4'} Cores • {machine.ram || '8 GB'}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: currentThemeConfig.textMuted }}>{t.diskStorage || 'Disk Storage'}</span>
            <span className="font-mono" style={{ color: currentThemeConfig.text }}>{machine.disk || '100 GB'}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: currentThemeConfig.textMuted }}>{t.uptime || 'Uptime'}</span>
            <span className="font-mono text-[11px]" style={{ color: machine.uptime?.includes('Click') ? '#38bdf8' : accentColor }}>
              {machine.uptime === 'Click to Monitor' ? (t.clickToMonitor || 'Bấm để giám sát') : (machine.uptime || 'Active')}
            </span>
          </div>
          {machine.identity_file && (
            <div className="flex justify-between items-center pt-1 border-t text-[10.5px]" style={{ borderColor: currentThemeConfig.border }}>
              <span className="flex items-center gap-1" style={{ color: currentThemeConfig.textMuted }}>
                <Key size={10} style={{ color: accentColor }} /> {t.key || 'Key'}
              </span>
              <span className="font-mono truncate max-w-[130px]" style={{ color: accentColor }} title={machine.identity_file}>
                {machine.identity_file.split(/[\/\\]/).pop()}
              </span>
            </div>
          )}
        </div>

        {/* Circular Gauges */}
        <div
          className="flex items-center justify-around py-2.5 border rounded-xl mb-3"
          style={{
            backgroundColor: currentThemeConfig.innerInput,
            borderColor: currentThemeConfig.border
          }}
        >
          <CircularGauge
            label="CPU"
            percentage={machine.cpu || 0}
            accentColor={getMetricColor(machine.cpu, isOnline, currentThemeConfig.textMuted)}
          />
          <CircularGauge
            label="RAM"
            percentage={machine.ramPct || 0}
            accentColor={getMetricColor(machine.ramPct, isOnline, currentThemeConfig.textMuted)}
          />
        </div>
      </div>

      {/* Footer: Quick Actions Bar (Terminal, SFTP, Docker, Settings, Delete) */}
      <div className="pt-2 border-t flex items-center justify-between text-xs" style={{ borderColor: currentThemeConfig.border }}>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onConnect(machine)}
            className="flex items-center gap-1 px-2.5 py-1 border rounded-lg text-[11px] font-medium transition-all"
            style={{
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}50`,
              color: accentColor
            }}
            title={t.openSshTerminal || 'Mở SSH Terminal'}
          >
            <Terminal size={12} />
            <span>SSH</span>
          </button>

          {onOpenSftp && (
            <button
              onClick={() => onOpenSftp(machine)}
              className="flex items-center gap-1 px-2 py-1 bg-sky-950/40 hover:bg-sky-600 hover:text-white text-sky-400 border border-sky-800/40 rounded-lg text-[11px] font-medium transition-all"
              title={t.browseSftp || 'Duyệt file SFTP'}
            >
              <FolderSync size={12} />
              <span>SFTP</span>
            </button>
          )}

          {onOpenDocker && (
            <button
              onClick={() => onOpenDocker(machine)}
              className="flex items-center gap-1 px-2 py-1 bg-[#121a2a] hover:bg-purple-600 hover:text-white text-purple-400 border border-[#1c2940] rounded-lg text-[11px] font-medium transition-all"
              title="Xem Docker Containers"
            >
              <Box size={12} />
              <span>Docker</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(machine)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2336] transition-all"
              title="Chỉnh sửa cấu hình host"
            >
              <Settings2 size={13} />
            </button>
          )}

          {onDelete && machine.id !== 'local_win' && (
            <button
              onClick={() => onDelete(machine.id)}
              className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all"
              title="Xóa máy chủ"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
