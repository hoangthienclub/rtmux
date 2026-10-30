import React, { useState, useEffect, useRef } from 'react';
import { 
  FileCode2, 
  Play, 
  Plus, 
  Trash2, 
  Copy, 
  Edit3, 
  Terminal, 
  Folder, 
  Check, 
  AlertCircle, 
  X,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Square,
  Database,
  GitPullRequest,
  PackageCheck,
  Zap,
  Layers,
  Activity
} from 'lucide-react';
import { THEME_CONFIGS } from '../../constants/palettes';

// ================= GLOBAL SCRIPT MODAL =================
function GlobalScriptModal({ script, services = [], workspaceRoot = '', isOpen, onClose, onSave, currentThemeConfig = {}, accentColor = '#10b981' }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const isEdit = !!script;

  const [name, setName] = useState(script ? script.name : '');
  const [command, setCommand] = useState(script ? script.command : '');
  const [icon, setIcon] = useState(script ? script.icon : '⚡');
  const [cwdType, setCwdType] = useState(script ? script.cwdType || 'workspace' : 'workspace');
  const [customCwd, setCustomCwd] = useState(script ? script.cwd || '' : workspaceRoot);
  const [rawEnv, setRawEnv] = useState(script ? script.rawEnv || '' : '');

  const effectiveCwd = cwdType === 'workspace'
    ? workspaceRoot
    : cwdType === 'custom'
    ? customCwd
    : (services.find(s => s.id === cwdType)?.cwd || workspaceRoot);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !command.trim()) {
      alert('Vui lòng nhập Tên và Lệnh thực thi!');
      return;
    }

    onSave({
      id: script?.id || `script_${Date.now()}`,
      name: name.trim(),
      command: command.trim(),
      icon: icon || '⚡',
      cwdType,
      cwd: effectiveCwd,
      rawEnv: rawEnv.trim()
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="border rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: currentThemeConfig.card || '#18181b',
          borderColor: currentThemeConfig.border || '#27272a'
        }}
      >
        <div 
          className="flex items-center justify-between border-b pb-3"
          style={{ borderColor: currentThemeConfig.border || '#27272a' }}
        >
          <h4 className="text-sm font-bold font-mono flex items-center gap-2" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
            <FileCode2 size={16} style={{ color: accentColor }} />
            <span>{isEdit ? 'Chỉnh Sửa Script' : 'Thêm Script Tự Động'}</span>
          </h4>
          <button onClick={onClose} className="p-1 rounded text-xs hover:text-white" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="w-16">
              <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Icon</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full border rounded-xl px-2.5 py-2 text-center text-base focus:outline-none"
                style={{
                  backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                  borderColor: currentThemeConfig.border || '#27272a',
                  color: currentThemeConfig.text || '#f4f4f5'
                }}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Tên Script *</label>
              <input
                type="text"
                placeholder="vd: Run Migrations All, Sync Protos, Git Clean"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                style={{
                  backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                  borderColor: currentThemeConfig.border || '#27272a',
                  color: currentThemeConfig.text || '#f4f4f5'
                }}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Lệnh Thực Thi (Command / Bash script) *</label>
            <textarea
              placeholder="vd: yarn proto:gen hoặc bash scripts/migrate.sh hoặc docker compose up -d"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              rows={3}
              className="w-full border rounded-xl p-2.5 text-xs font-mono focus:outline-none resize-none"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                borderColor: currentThemeConfig.border || '#27272a',
                color: accentColor
              }}
              required
            />
          </div>

          <div>
            <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Thư Mục Thực Thi (Working Directory)</label>
            <select
              value={cwdType}
              onChange={(e) => setCwdType(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none mb-2 cursor-pointer"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                borderColor: currentThemeConfig.border || '#27272a',
                color: currentThemeConfig.text || '#f4f4f5'
              }}
            >
              <option value="workspace">Thư mục gốc Workspace ({workspaceRoot || '.'})</option>
              <option value="custom">Nhập đường dẫn tùy chỉnh (Custom Path)...</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>Service: {s.name} ({s.cwd || s.relativeDir || 'default'})</option>
              ))}
            </select>

            {cwdType === 'custom' && (
              <input
                type="text"
                placeholder="/home/thientran/projects/..."
                value={customCwd}
                onChange={(e) => setCustomCwd(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                style={{
                  backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                  borderColor: currentThemeConfig.border || '#27272a',
                  color: currentThemeConfig.text || '#f4f4f5'
                }}
              />
            )}
          </div>

          <div>
            <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Biến Môi Trường Riêng (Optional .env)</label>
            <textarea
              placeholder="NODE_ENV=development&#10;DEBUG=true"
              value={rawEnv}
              onChange={(e) => setRawEnv(e.target.value)}
              rows={2}
              className="w-full border rounded-xl p-2.5 text-xs font-mono focus:outline-none resize-none"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                borderColor: currentThemeConfig.border || '#27272a',
                color: accentColor
              }}
            />
          </div>

          <div 
            className="flex justify-end gap-2 pt-2 border-t"
            style={{ borderColor: currentThemeConfig.border || '#27272a' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs rounded-xl hover:text-white"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                color: currentThemeConfig.textMuted || '#a1a1aa'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white rounded-xl shadow-md active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              {isEdit ? 'Lưu Thay Đổi' : 'Tạo Script'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Built-in System Tasks migrated from service-tool
const SYSTEM_TASKS = [
  {
    id: 'migrate-all',
    name: 'Run All Migrations',
    icon: Database,
    desc: 'Migrate cơ sở dữ liệu cho các sub-repos (acc, com, ntfc)',
    badgeColor: '#f59e0b',
    command: 'npm run migrate:all'
  },
  {
    id: 'sync-all-protos',
    name: 'Sync Protos',
    icon: RefreshCw,
    desc: 'Build & link proto repos (acc-proto & com-proto)',
    badgeColor: '#a855f7',
    command: 'npm run proto:sync'
  },
  {
    id: 'git-pull',
    name: 'Git Pull develop',
    icon: GitPullRequest,
    desc: 'Pull code mới nhất từ origin/develop cho toàn bộ sub-repos',
    badgeColor: '#38bdf8',
    command: 'git pull origin develop (all repos)'
  },
  {
    id: 'yarn-install-all',
    name: 'Yarn Install All',
    icon: PackageCheck,
    desc: 'Cài đặt node_modules yarn cho toàn bộ sub-repos',
    badgeColor: '#10b981',
    command: 'yarn install (all repos)'
  },
  {
    id: 'clean-cache',
    name: 'Clean Cache',
    icon: Trash2,
    desc: 'Dọn dẹp cache temp files và build artifacts của các services',
    badgeColor: '#f43f5e',
    command: 'clean temp cache & artifacts'
  }
];

// ================= MAIN SCRIPTS VIEW (IN TOOLBOX) =================
export default function ScriptsView({ 
  services = [], 
  settings = {},
  onRunTask,
  currentRunningTask,
  lastTaskLog
}) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';

  const [scripts, setScripts] = useState([]);
  const [workspaceRoot, setWorkspaceRoot] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalScript, setModalScript] = useState(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionStatus, setActionStatus] = useState('');

  // Script Output Log Modal
  const [runningScript, setRunningScript] = useState(null);
  const [scriptLogs, setScriptLogs] = useState([]);
  const [runStatus, setRunStatus] = useState('IDLE'); // 'RUNNING' | 'SUCCESS' | 'FAILED'
  const logTerminalRef = useRef(null);

  useEffect(() => {
    if (!runningScript) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setRunningScript(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runningScript]);

  const fetchScripts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scripts');
      const data = await res.json();
      if (data.success && Array.isArray(data.scripts)) {
        setScripts(data.scripts);
        if (data.workspaceRoot) setWorkspaceRoot(data.workspaceRoot);
      }
    } catch (e) {
      console.error('Failed to load scripts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [scriptLogs]);

  const handleSaveScript = async (scriptData) => {
    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scriptData)
      });
      const data = await res.json();
      if (data.success) {
        setActionStatus(`✔ Đã lưu script "${scriptData.name}"!`);
        setModalScript(undefined);
        await fetchScripts();
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
    setTimeout(() => setActionStatus(''), 3000);
  };

  const handleDeleteScript = async (scriptId, scriptName) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa script "${scriptName || scriptId}" không?`)) return;
    try {
      const res = await fetch(`/api/scripts/${encodeURIComponent(scriptId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setActionStatus(`✔ Đã xóa script "${scriptName || scriptId}"!`);
        await fetchScripts();
      } else {
        alert('Lỗi xóa: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
    setTimeout(() => setActionStatus(''), 3000);
  };

  const handleDuplicateScript = async (script) => {
    const copy = {
      ...script,
      id: `script_${Date.now()}`,
      name: `${script.name} (Copy)`
    };
    await handleSaveScript(copy);
  };

  const handleRunScript = async (script) => {
    setRunningScript(script);
    setScriptLogs([{ text: `🚀 Đang khởi động thực thi script: ${script.name}...\nCommand: ${script.command}\nCwd: ${script.cwd || workspaceRoot}\n----------------------------------------\n` }]);
    setRunStatus('RUNNING');

    try {
      const res = await fetch(`/api/scripts/${encodeURIComponent(script.id)}/run`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setScriptLogs(prev => [...prev, { text: data.output || '✔ Lệnh thực thi kết thúc thành công.' }]);
        setRunStatus('SUCCESS');
      } else {
        setScriptLogs(prev => [...prev, { text: `❌ Lỗi khi thực thi script: ${data.error || 'Thất bại'}\n${data.output || ''}` }]);
        setRunStatus('FAILED');
      }
    } catch (err) {
      setScriptLogs(prev => [...prev, { text: `❌ Lỗi kết nối: ${err.message}` }]);
      setRunStatus('FAILED');
    }
  };

  const handleRunSystemTask = async (task) => {
    if (onRunTask) {
      onRunTask(task.id);
    }

    setRunningScript({
      name: task.name,
      icon: '⚡',
      command: task.command,
      cwd: 'Workspace Root'
    });
    setScriptLogs([{ text: `🚀 Đang khởi động tác vụ hệ thống: ${task.name}...\nCommand: ${task.command}\nDescription: ${task.desc}\n----------------------------------------\n` }]);
    setRunStatus('RUNNING');

    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success !== false) {
        setScriptLogs(prev => [...prev, { text: data.output || data.message || `✔ Tác vụ ${task.name} hoàn thành thành công!` }]);
        setRunStatus('SUCCESS');
      } else {
        setScriptLogs(prev => [...prev, { text: `❌ Lỗi khi thực thi tác vụ: ${data.error || 'Thất bại'}\n${data.output || ''}` }]);
        setRunStatus('FAILED');
      }
    } catch (err) {
      setScriptLogs(prev => [...prev, { text: `❌ Lỗi kết nối: ${err.message}` }]);
      setRunStatus('FAILED');
    }
  };

  const filteredScripts = scripts.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (s.name || '').toLowerCase().includes(q) || (s.command || '').toLowerCase().includes(q);
  });

  return (
    <div 
      className="flex-1 p-6 overflow-y-auto space-y-6 custom-scroll"
      style={{ backgroundColor: currentThemeConfig.bg, color: currentThemeConfig.text }}
    >
      {/* 1. Header Banner with subtle glow matching common UI */}
      <div 
        className="relative overflow-hidden rounded-2xl p-5 border transition-all"
        style={{ 
          backgroundColor: currentThemeConfig.card,
          borderColor: currentThemeConfig.border
        }}
      >
        <div 
          className="absolute right-0 top-0 w-72 h-full blur-3xl pointer-events-none"
          style={{ backgroundColor: `${accentColor}10` }}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <h2 className="text-base font-bold tracking-tight flex items-center gap-2" style={{ color: currentThemeConfig.text }}>
              <FileCode2 size={18} style={{ color: accentColor }} />
              <span>Hộp Công Cụ: Quản Lý Scripts & Tác Vụ</span>
            </h2>
            <p className="text-xs" style={{ color: currentThemeConfig.textMuted }}>
              Tập hợp các tác vụ hệ thống 1-click và các script tự động hóa tùy chỉnh cho microservices.
            </p>
          </div>

          <button
            onClick={() => setModalScript(null)}
            className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center space-x-1.5"
            style={{ backgroundColor: accentColor }}
          >
            <Plus size={14} />
            <span>Tạo Script Mới</span>
          </button>
        </div>
      </div>

      {actionStatus && (
        <div 
          className="p-3 rounded-xl border text-xs font-medium animate-in fade-in"
          style={{
            backgroundColor: `${accentColor}15`,
            borderColor: `${accentColor}30`,
            color: accentColor
          }}
        >
          {actionStatus}
        </div>
      )}

      {/* 2. SYSTEM QUICK TASKS SECTION (Migrated from Service Monitor) */}
      <div 
        className="border rounded-2xl p-5 shadow-md transition-all space-y-4"
        style={{
          backgroundColor: currentThemeConfig.card,
          borderColor: currentThemeConfig.border
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: currentThemeConfig.border }}>
          <div className="flex items-center gap-2">
            <Activity size={16} style={{ color: accentColor }} />
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: currentThemeConfig.text }}>
              Tác Vụ Hệ Thống Tự Động (Service-Tool Tasks)
            </h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border" style={{ backgroundColor: currentThemeConfig.innerInput, borderColor: currentThemeConfig.border, color: currentThemeConfig.textMuted }}>
            {SYSTEM_TASKS.length} tác vụ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {SYSTEM_TASKS.map((task) => {
            const Icon = task.icon;
            const isThisRunning = currentRunningTask === task.id || (runningScript?.name === task.name && runStatus === 'RUNNING');

            return (
              <button
                key={task.id}
                disabled={isThisRunning}
                onClick={() => handleRunSystemTask(task)}
                className="flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all active:scale-95 disabled:opacity-50 hover:border-sky-500/50 group"
                style={{
                  backgroundColor: currentThemeConfig.innerInput,
                  borderColor: currentThemeConfig.border
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span 
                      className="p-1.5 rounded-lg border flex items-center justify-center"
                      style={{
                        backgroundColor: `${task.badgeColor}15`,
                        borderColor: `${task.badgeColor}35`,
                        color: task.badgeColor
                      }}
                    >
                      <Icon size={14} className={isThisRunning ? 'animate-spin' : ''} />
                    </span>
                    <span 
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono font-semibold"
                      style={{ color: accentColor }}
                    >
                      Chạy ➔
                    </span>
                  </div>
                  <h4 className="font-mono text-xs font-bold tracking-tight" style={{ color: currentThemeConfig.text }}>
                    {task.name}
                  </h4>
                  <p className="text-[10.5px] mt-1 leading-snug line-clamp-2" style={{ color: currentThemeConfig.textMuted }}>
                    {task.desc}
                  </p>
                </div>

                <div className="pt-2 mt-2 border-t flex items-center justify-between text-[9.5px] font-mono" style={{ borderColor: currentThemeConfig.border }}>
                  <span style={{ color: currentThemeConfig.textMuted }}>1-click task</span>
                  <span style={{ color: task.badgeColor }}>● sẵn sàng</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CUSTOM SCRIPTS SECTION */}
      <div className="space-y-4">
        {/* Search & Counter Bar */}
        <div 
          className="flex items-center justify-between p-3 rounded-2xl border"
          style={{
            backgroundColor: currentThemeConfig.card,
            borderColor: currentThemeConfig.border
          }}
        >
          <div className="relative w-80">
            <input
              type="text"
              placeholder="Tìm kiếm script tùy chỉnh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.text
              }}
            />
            <Search size={14} className="absolute left-3 top-2 text-slate-500" />
          </div>

          <div className="text-xs font-mono" style={{ color: currentThemeConfig.textMuted }}>
            Tổng: <span className="font-bold" style={{ color: accentColor }}>{filteredScripts.length}</span> scripts
          </div>
        </div>

        {/* Custom Scripts Grid */}
        {filteredScripts.length === 0 ? (
          <div 
            className="p-12 text-center rounded-2xl border"
            style={{
              backgroundColor: currentThemeConfig.card,
              borderColor: currentThemeConfig.border,
              color: currentThemeConfig.textMuted
            }}
          >
            {loading ? 'Đang tải scripts...' : 'Chưa có script tùy chỉnh nào được tạo.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScripts.map(script => (
              <div
                key={script.id}
                className="border rounded-2xl p-5 transition-all shadow-md flex flex-col justify-between space-y-4"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{script.icon || '⚡'}</span>
                    <button
                      onClick={() => handleRunScript(script)}
                      className="px-3 py-1 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 active:scale-95"
                      style={{ backgroundColor: accentColor }}
                      title="Chạy script này ngay"
                    >
                      <Play size={11} fill="white" />
                      <span>Chạy</span>
                    </button>
                  </div>
                  <h3 className="text-sm font-bold font-mono" style={{ color: currentThemeConfig.text }}>{script.name}</h3>
                  <div 
                    className="p-2.5 rounded-xl border mt-2"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border
                    }}
                  >
                    <code className="text-xs font-mono block truncate" style={{ color: accentColor }} title={script.command}>
                      {script.command}
                    </code>
                  </div>
                  <p className="text-[11px] font-mono mt-2 truncate" style={{ color: currentThemeConfig.textMuted }}>
                    Dir: {script.cwd || 'Workspace Root'}
                  </p>
                </div>

                <div 
                  className="pt-3 border-t flex items-center justify-between"
                  style={{ borderColor: currentThemeConfig.border }}
                >
                  <span className="text-[10px] font-mono uppercase" style={{ color: currentThemeConfig.textMuted }}>{script.cwdType || 'workspace'}</span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleDuplicateScript(script)}
                      className="p-1.5 hover:text-white rounded-lg transition-colors"
                      style={{ color: currentThemeConfig.textMuted }}
                      title="Nhân bản script"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={() => setModalScript(script)}
                      className="p-1.5 hover:text-white rounded-lg transition-colors"
                      style={{ color: currentThemeConfig.textMuted }}
                      title="Chỉnh sửa script"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteScript(script.id, script.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
                      title="Xóa script"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL EDIT / CREATE */}
      <GlobalScriptModal
        script={modalScript}
        services={services}
        workspaceRoot={workspaceRoot}
        isOpen={modalScript !== undefined}
        onClose={() => setModalScript(undefined)}
        onSave={handleSaveScript}
        currentThemeConfig={currentThemeConfig}
        accentColor={accentColor}
      />

      {/* SCRIPT / TASK RUN OUTPUT LOG MODAL */}
      {runningScript && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setRunningScript(null)}
        >
          <div 
            className="border rounded-2xl w-full max-w-2xl h-[70vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: currentThemeConfig.card,
              borderColor: currentThemeConfig.border
            }}
          >
            {/* Header */}
            <div 
              className="px-5 py-3.5 border-b flex items-center justify-between"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border
              }}
            >
              <div className="flex items-center space-x-2">
                <span className="text-base">{runningScript.icon || '⚡'}</span>
                <h4 className="font-mono text-xs font-bold" style={{ color: currentThemeConfig.text }}>{runningScript.name}</h4>
                {runStatus === 'RUNNING' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <RefreshCw size={9} className="animate-spin" />
                    <span>Đang chạy...</span>
                  </span>
                )}
                {runStatus === 'SUCCESS' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 size={10} />
                    <span>Hoàn thành</span>
                  </span>
                )}
                {runStatus === 'FAILED' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                    <XCircle size={10} />
                    <span>Thất bại</span>
                  </span>
                )}
              </div>

              <button
                onClick={() => setRunningScript(null)}
                className="p-1 rounded text-xs hover:text-white"
                style={{ color: currentThemeConfig.textMuted }}
              >
                ✕
              </button>
            </div>

            {/* Console Output Body */}
            <div 
              ref={logTerminalRef}
              className="flex-1 p-4 font-mono text-xs leading-relaxed overflow-y-auto select-text bg-black/60 custom-scroll space-y-1"
            >
              {scriptLogs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap break-all text-slate-300">
                  {log.text}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div 
              className="px-5 py-3 border-t flex items-center justify-between text-xs"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border
              }}
            >
              <span className="font-mono text-[11px]" style={{ color: currentThemeConfig.textMuted }}>
                Command: {runningScript.command}
              </span>
              <button
                onClick={() => setRunningScript(null)}
                className="px-4 py-1.5 rounded-xl font-bold text-white text-xs"
                style={{ backgroundColor: accentColor }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
