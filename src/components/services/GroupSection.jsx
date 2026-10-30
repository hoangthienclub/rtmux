import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Play, Square, Layers } from 'lucide-react';
import ServiceCard from './ServiceCard';

export default function GroupSection({
  groupName,
  services = [],
  logsMap = {},
  onStartService,
  onStopService,
  onRestartService,
  onClearLogs,
  onOpenEnvModal,
  onChangeProfile,
  onTogglePopout,
  onStartGroup,
  onStopGroup,
  currentThemeConfig = {},
  accentColor = '#10b981'
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const runningCount = services.filter(s => s.statusInfo?.status === 'RUNNING').length;
  const totalCount = services.length;

  return (
    <div className="mb-8">
      {/* Group Title Bar */}
      <div 
        className="flex items-center justify-between pb-3 mb-4 border-b"
        style={{ borderColor: currentThemeConfig.border || '#27272a' }}
      >
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded transition-colors"
            style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </button>
          
          <div className="flex items-center space-x-2">
            <span 
              className="p-1.5 rounded-lg"
              style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
            >
              <Layers size={16} />
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
              {groupName}
            </h2>
            <span 
              className="text-xs font-semibold px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                borderColor: currentThemeConfig.border || '#27272a',
                color: currentThemeConfig.textMuted || '#a1a1aa'
              }}
            >
              {runningCount}/{totalCount} apps running
            </span>
          </div>
        </div>

        {/* Group Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onStartGroup && onStartGroup(groupName)}
            className="flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-xl text-white transition-all active:scale-95 shadow-sm"
            style={{ backgroundColor: accentColor }}
          >
            <Play size={11} className="fill-current" />
            <span>Start {groupName}</span>
          </button>

          <button
            onClick={() => onStopGroup && onStopGroup(groupName)}
            className="flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-all active:scale-95 shadow-sm"
          >
            <Square size={11} />
            <span>Stop {groupName}</span>
          </button>
        </div>
      </div>

      {/* Services Grid */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              logs={logsMap[service.id] || []}
              onStart={onStartService}
              onStop={onStopService}
              onRestart={onRestartService}
              onClearLogs={onClearLogs}
              onOpenEnvModal={onOpenEnvModal}
              onChangeProfile={onChangeProfile}
              onTogglePopout={onTogglePopout}
              currentThemeConfig={currentThemeConfig}
              accentColor={accentColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
