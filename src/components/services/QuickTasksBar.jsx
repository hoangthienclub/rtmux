import React, { useState } from 'react';
import { Database, GitPullRequest, RefreshCw, PackageCheck, Terminal, CheckCircle2, AlertCircle } from 'lucide-react';

export default function QuickTasksBar({ 
  onRunTask, 
  currentRunningTask, 
  lastTaskLog,
  currentThemeConfig = {},
  accentColor = '#10b981'
}) {
  const tasks = [
    {
      id: 'migrate-all',
      name: 'Run All Migrations',
      icon: Database,
      desc: 'Migrate DB cho acc, com, ntfc',
      badgeColor: '#f59e0b'
    },
    {
      id: 'sync-all-protos',
      name: 'Sync Protos',
      icon: RefreshCw,
      desc: 'Build & link acc-proto và com-proto',
      badgeColor: '#a855f7'
    },
    {
      id: 'git-pull',
      name: 'Git Pull develop',
      icon: GitPullRequest,
      desc: 'Pull code mới nhất từ origin/develop cho toàn bộ repos',
      badgeColor: '#38bdf8'
    },
    {
      id: 'yarn-install-all',
      name: 'Yarn Install All',
      icon: PackageCheck,
      desc: 'Cài đặt node_modules cho toàn bộ sub-repos',
      badgeColor: '#10b981'
    }
  ];

  return (
    <div 
      className="border rounded-2xl p-4 shadow-md transition-all"
      style={{
        backgroundColor: currentThemeConfig.card || '#18181b',
        borderColor: currentThemeConfig.border || '#27272a'
      }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
            <Terminal size={14} style={{ color: accentColor }} />
            <span>Tác Vụ Tự Động Nhanh (Quick Tasks)</span>
          </h2>
          <p className="text-[11px]" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
            Chạy các lệnh phụ trợ 1-click thay vì gõ lệnh terminal thủ công
          </p>
        </div>

        {/* Task Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {tasks.map((task) => {
            const Icon = task.icon;
            const isThisRunning = currentRunningTask === task.id;

            return (
              <button
                key={task.id}
                disabled={!!currentRunningTask}
                onClick={() => onRunTask && onRunTask(task.id)}
                title={task.desc}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:border-sky-500/50"
                style={{
                  backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                  borderColor: currentThemeConfig.border || '#27272a',
                  color: currentThemeConfig.text || '#f4f4f5'
                }}
              >
                <Icon size={14} className={isThisRunning ? 'animate-spin' : ''} style={{ color: isThisRunning ? accentColor : task.badgeColor }} />
                <span>{task.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task status indicator if a task is running */}
      {currentRunningTask && (
        <div 
          className="mt-3 pt-3 border-t flex items-center justify-between text-xs"
          style={{ borderColor: currentThemeConfig.border || '#27272a' }}
        >
          <div className="flex items-center space-x-2" style={{ color: accentColor }}>
            <span className="inline-block w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: accentColor }}></span>
            <span className="font-semibold">Đang thực thi task: <span className="font-mono text-white">{currentRunningTask}</span></span>
          </div>
          {lastTaskLog && (
            <span className="text-[11px] font-mono truncate max-w-lg" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
              {lastTaskLog}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
