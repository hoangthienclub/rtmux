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
  Activity,
  FileSearch,
  Sliders,
  FolderOpen
} from 'lucide-react';
import { THEME_CONFIGS } from '../../constants/palettes';
import { BASE_URL, browseFile, subscribeMicroserviceEvents } from '../../services/microserviceClient';
import ConfirmModal from '../common/ConfirmModal';

// Runner presets definitions
const RUNNERS = [
  { id: 'python', label: 'Python', bin: 'python3', icon: '🐍', ext: ['.py'] },
  { id: 'node', label: 'Node.js', bin: 'node', icon: '🟢', ext: ['.js', '.mjs', '.cjs'] },
  { id: 'bash', label: 'Bash', bin: 'bash', icon: '🐚', ext: ['.sh', '.bash', '.zsh'] },
  { id: 'custom', label: 'Custom', bin: '', icon: '⚡', ext: [] }
];

// Helper to deduce runner, icon, command, and cwd from a chosen file path
function analyzeScriptFile(filePath) {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, '/');
  const filename = normalized.split('/').pop() || '';
  const lastDot = filename.lastIndexOf('.');
  const ext = lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : '';
  const parentDir = normalized.includes('/') ? normalized.substring(0, normalized.lastIndexOf('/')) : '';

  if (['.py', '.py3', '.pyw'].includes(ext)) {
    return {
      runner: 'python',
      icon: '🐍',
      command: `python3 "${normalized}"`,
      filename,
      cwd: parentDir
    };
  }
  if (['.js', '.mjs', '.cjs'].includes(ext)) {
    return {
      runner: 'node',
      icon: '🟢',
      command: `node "${normalized}"`,
      filename,
      cwd: parentDir
    };
  }
  if (['.ts', '.mts', '.cts'].includes(ext)) {
    return {
      runner: 'node',
      icon: '🔷',
      command: `npx ts-node "${normalized}"`,
      filename,
      cwd: parentDir
    };
  }
  if (['.sh', '.bash', '.zsh'].includes(ext)) {
    return {
      runner: 'bash',
      icon: '🐚',
      command: `bash "${normalized}"`,
      filename,
      cwd: parentDir
    };
  }

  return {
    runner: 'custom',
    icon: '⚡',
    command: normalized.endsWith('.exe') ? `"${normalized}"` : `./"${filename}"`,
    filename,
    cwd: parentDir
  };
}

// ================= GLOBAL SCRIPT MODAL =================
function GlobalScriptModal({ 
  script, 
  services = [], 
  globalProfiles = {}, 
  activeGlobalProfile = 'default',
  workspaceRoot = '', 
  isOpen, 
  onClose, 
  onSave, 
  currentThemeConfig = {}, 
  accentColor = '#10b981' 
}) {
  const [name, setName] = useState('');
  const [filePath, setFilePath] = useState('');
  const [runner, setRunner] = useState('custom');
  const [command, setCommand] = useState('');
  const [icon, setIcon] = useState('⚡');
  const [cwd, setCwd] = useState(workspaceRoot);
  const [envSourceType, setEnvSourceType] = useState('profile'); // 'none' | 'profile' | 'service'
  const [envSourceId, setEnvSourceId] = useState(activeGlobalProfile || 'default');
  const [rawEnv, setRawEnv] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isBrowsingFile, setIsBrowsingFile] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (script) {
        setName(script.name || '');
        setFilePath(script.file || '');
        setRunner(script.runner || 'custom');
        setCommand(script.command || '');
        setIcon(script.icon || '⚡');
        setCwd(script.cwd || workspaceRoot);
        setEnvSourceType(script.envSourceType || 'profile');
        setEnvSourceId(script.envSourceId || activeGlobalProfile || 'default');
        setRawEnv(script.rawEnv || '');
      } else {
        setName('');
        setFilePath('');
        setRunner('custom');
        setCommand('');
        setIcon('⚡');
        setCwd(workspaceRoot);
        setEnvSourceType('profile');
        setEnvSourceId(activeGlobalProfile || 'default');
        setRawEnv('');
      }
    }
  }, [isOpen, script, workspaceRoot, activeGlobalProfile]);

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

  // Handler: When a file path is typed or selected via browse dialog
  const handleApplyFilePath = (selectedPath) => {
    if (!selectedPath) return;
    setFilePath(selectedPath);
    const analyzed = analyzeScriptFile(selectedPath);
    if (analyzed) {
      setRunner(analyzed.runner);
      setIcon(analyzed.icon);
      if (!command || command.trim() === '') {
        setCommand(analyzed.command);
      }
      if (!name || name.trim() === '') {
        setName(analyzed.filename);
      }
      if (analyzed.cwd) {
        setCwd(analyzed.cwd);
      }
    }
  };

  const handleBrowseFile = async () => {
    setIsBrowsingFile(true);
    try {
      const res = await browseFile({
        prompt: 'Chọn file script (.py, .js, .sh, .ts, file thực thi...):',
        defaultDir: cwd || workspaceRoot
      });
      if (res && res.success && res.path) {
        handleApplyFilePath(res.path);
      }
    } catch (err) {
      console.error('Browse file error:', err);
    } finally {
      setIsBrowsingFile(false);
    }
  };

  const handleSelectRunner = (rId) => {
    setRunner(rId);
    const target = RUNNERS.find(r => r.id === rId);
    if (target && target.icon) {
      setIcon(target.icon);
    }
    // Update command prefix if a file path is already set
    if (filePath) {
      const cleanPath = filePath.replace(/\\/g, '/');
      if (rId === 'python') setCommand(`python3 "${cleanPath}"`);
      else if (rId === 'node') setCommand(`node "${cleanPath}"`);
      else if (rId === 'bash') setCommand(`bash "${cleanPath}"`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập Tên Script!');
      return;
    }
    if (!command.trim()) {
      setErrorMsg('Vui lòng nhập Lệnh thực thi!');
      return;
    }
    setErrorMsg('');

    onSave({
      id: script?.id || `script_${Date.now()}`,
      name: name.trim(),
      file: filePath.trim(),
      runner,
      command: command.trim(),
      icon: icon || '⚡',
      cwd: (cwd && cwd.trim()) || workspaceRoot,
      envSourceType,
      envSourceId,
      rawEnv: rawEnv.trim()
    });
  };

  const profileKeys = Object.keys(globalProfiles || {});

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="border rounded-2xl p-6 w-full max-w-xl space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto custom-scroll"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: currentThemeConfig.card || '#18181b',
          borderColor: currentThemeConfig.border || '#27272a'
        }}
      >
        {/* Modal Header */}
        <div 
          className="flex items-center justify-between border-b pb-3"
          style={{ borderColor: currentThemeConfig.border || '#27272a' }}
        >
          <h4 className="text-sm font-bold font-mono flex items-center gap-2" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
            <FileCode2 size={16} style={{ color: accentColor }} />
            <span>{isEdit ? 'Chỉnh Sửa Script' : 'Tạo Script Thực Thi Mới'}</span>
          </h4>
          <button onClick={onClose} className="p-1 rounded text-xs hover:text-white" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* STEP 1: CHỌN ĐÚNG FILE SCRIPT */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
                <FolderOpen size={13} style={{ color: accentColor }} />
                <span>1. Chọn File Script (Python, Node, Bash hoặc Custom file):</span>
              </label>
              <span className="text-[10px] font-mono" style={{ color: currentThemeConfig.textMuted }}>
                Tự động gán CWD & gợi ý Runner
              </span>
            </div>
            
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="/path/to/script.py hoặc /scripts/deploy.sh..."
                value={filePath}
                onChange={(e) => handleApplyFilePath(e.target.value)}
                className="flex-1 border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                style={{
                  backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                  borderColor: currentThemeConfig.border || '#27272a',
                  color: currentThemeConfig.text || '#f4f4f5'
                }}
              />
              <button
                type="button"
                onClick={handleBrowseFile}
                disabled={isBrowsingFile}
                className="px-3.5 py-2 border rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                style={{
                  backgroundColor: `${accentColor}18`,
                  borderColor: `${accentColor}40`,
                  color: accentColor
                }}
              >
                {isBrowsingFile ? <RefreshCw size={13} className="animate-spin" /> : <FileSearch size={13} />}
                <span>Chọn File...</span>
              </button>
            </div>
          </div>

          {/* STEP 2: RUNNER SELECTION PILLS */}
          <div>
            <label className="text-xs block mb-1.5 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
              2. Runner Thực Thi:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {RUNNERS.map((r) => {
                const isSelected = runner === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRunner(r.id)}
                    className="p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    style={{
                      backgroundColor: isSelected ? `${accentColor}25` : (currentThemeConfig.innerInput || '#0d0d10'),
                      borderColor: isSelected ? accentColor : (currentThemeConfig.border || '#27272a'),
                      color: isSelected ? accentColor : (currentThemeConfig.text || '#f4f4f5')
                    }}
                  >
                    <span>{r.icon}</span>
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SCRIPT NAME & ICON */}
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
                placeholder="vd: Data Seed Python, Clear Redis Cache, Sync Protos..."
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

          {/* COMMAND & ARGS INPUT */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
                3. Lệnh Thực Thi (Command & Flags / Arguments) *
              </label>
              <span className="text-[10px] font-mono" style={{ color: currentThemeConfig.textMuted }}>
                Hỗ trợ quotes và cờ tham số
              </span>
            </div>
            <textarea
              placeholder="vd: python3 script.py --env=local --debug hoáº·c node index.js hoáº·c pytest -v"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              rows={2}
              className="w-full border rounded-xl p-2.5 text-xs font-mono focus:outline-none resize-none leading-relaxed"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                borderColor: currentThemeConfig.border || '#27272a',
                color: accentColor
              }}
              required
            />
          </div>

          {/* WORKING DIRECTORY (AUTO FROM FILE OR OVERRIDE) */}
          <div>
            <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
              4. Thư Mục Thực Thi (Working Directory / CWD):
            </label>
            <input
              type="text"
              placeholder={workspaceRoot || '/home/thientran/projects/...'}
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                borderColor: currentThemeConfig.border || '#27272a',
                color: currentThemeConfig.text || '#f4f4f5'
              }}
            />
          </div>

          {/* STEP 5: ENVIRONMENT VARIABLES (ENV INHERITANCE + CUSTOM .ENV) */}
          <div 
            className="p-3.5 rounded-xl border space-y-3"
            style={{
              backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
              borderColor: currentThemeConfig.border || '#27272a'
            }}
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
                <Sliders size={13} style={{ color: accentColor }} />
                <span>5. Cấu Hình Biến Môi Trường (ENV):</span>
              </label>
            </div>

            {/* Base ENV Source */}
            <div>
              <span className="text-[11px] block mb-1 font-mono" style={{ color: currentThemeConfig.textMuted }}>
                Nguồn Biến Môi Trường Kế Thừa:
              </span>
              <select
                value={`${envSourceType}:::${envSourceId}`}
                onChange={(e) => {
                  const [stype, sid] = e.target.value.split(':::');
                  setEnvSourceType(stype);
                  setEnvSourceId(sid || '');
                }}
                className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none cursor-pointer"
                style={{
                  backgroundColor: currentThemeConfig.card || '#18181b',
                  borderColor: currentThemeConfig.border || '#27272a',
                  color: currentThemeConfig.text || '#f4f4f5'
                }}
              >
                <option value="none:::">Không kế thừa (Chỉ dùng biến môi trường hệ thống)</option>
                <option value="profile:::default">Global Profile: default</option>
                {profileKeys.filter(p => p !== 'default').map(p => (
                  <option key={p} value={`profile:::${p}`}>Global Profile: {p}</option>
                ))}
                {services.map(s => (
                  <option key={s.id} value={`service:::${s.id}`}>Microservice: {s.name} ({s.activeProfile || 'default'})</option>
                ))}
              </select>
            </div>

            {/* Custom .env Textarea */}
            <div>
              <span className="text-[11px] block mb-1 font-mono" style={{ color: currentThemeConfig.textMuted }}>
                Biến ENV Tùy Chỉnh Thêm (Định dạng KEY=VALUE, mỗi dòng 1 biến):
              </span>
              <textarea
                placeholder="DATABASE_URL=postgres://localhost:5432/mydb&#10;DEBUG=true&#10;MY_FLAG=1"
                value={rawEnv}
                onChange={(e) => setRawEnv(e.target.value)}
                rows={2}
                className="w-full border rounded-xl p-2.5 text-xs font-mono focus:outline-none resize-none leading-relaxed"
                style={{
                  backgroundColor: currentThemeConfig.card || '#18181b',
                  borderColor: currentThemeConfig.border || '#27272a',
                  color: accentColor
                }}
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-mono text-rose-400 p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40">
              ⚠️ {errorMsg}
            </p>
          )}

          <div 
            className="flex justify-end gap-2 pt-2 border-t"
            style={{ borderColor: currentThemeConfig.border || '#27272a' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-xl hover:text-white cursor-pointer"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                color: currentThemeConfig.textMuted || '#a1a1aa'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md active:scale-95 cursor-pointer"
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
  const [globalProfiles, setGlobalProfiles] = useState({});
  const [activeGlobalProfile, setActiveGlobalProfile] = useState('default');
  const [workspaceRoot, setWorkspaceRoot] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalScript, setModalScript] = useState(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Script Output Log Modal
  const [runningScript, setRunningScript] = useState(null);
  const [scriptLogs, setScriptLogs] = useState([]);
  const [runStatus, setRunStatus] = useState('IDLE'); // 'RUNNING' | 'SUCCESS' | 'FAILED'
  const logTerminalRef = useRef(null);

  // ESC Listener to close running script modal
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

  // Real-time SSE Log Streaming subscription when a script is actively running
  useEffect(() => {
    if (!runningScript || runStatus !== 'RUNNING') return;

    const unsubscribe = subscribeMicroserviceEvents({
      onTaskLog: (logData) => {
        if (!logData) return;
        const text = logData.text || (typeof logData === 'string' ? logData : JSON.stringify(logData));
        setScriptLogs(prev => [...prev, { text }]);
      },
      onTaskFinish: (finishData) => {
        const isSuccess = finishData?.status === 'SUCCESS' || finishData?.exitCode === 0;
        setRunStatus(isSuccess ? 'SUCCESS' : 'FAILED');
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [runningScript, runStatus]);

  const fetchScripts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/scripts`);
      const data = await res.json();
      if (data.success && Array.isArray(data.scripts)) {
        setScripts(data.scripts);
        if (data.workspaceRoot) setWorkspaceRoot(data.workspaceRoot);
        if (data.globalProfiles) setGlobalProfiles(data.globalProfiles);
        if (data.activeGlobalProfile) setActiveGlobalProfile(data.activeGlobalProfile);
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
      const res = await fetch(`${BASE_URL}/api/scripts`, {
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
        setConfirmDialog({
          isOpen: true,
          title: 'Lỗi lưu script',
          message: data?.error || 'Không thể lưu kịch bản này.',
          isAlert: true,
          danger: true,
          type: 'danger',
          confirmText: 'Đã hiểu',
          onConfirm: () => setConfirmDialog(null)
        });
      }
    } catch (e) {
      setConfirmDialog({
        isOpen: true,
        title: 'Lỗi kết nối',
        message: e?.message || String(e),
        isAlert: true,
        danger: true,
        type: 'danger',
        confirmText: 'Đã hiểu',
        onConfirm: () => setConfirmDialog(null)
      });
    }
    setTimeout(() => setActionStatus(''), 3000);
  };

  const handleDeleteScript = (scriptId, scriptName) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa script',
      message: 'Bạn có chắc chắn muốn xóa kịch bản này không? Thao tác này không thể hoàn tác.',
      itemName: scriptName || scriptId,
      confirmText: 'Xóa script',
      cancelText: 'Hủy',
      danger: true,
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`${BASE_URL}/api/scripts/${encodeURIComponent(scriptId)}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (data.success) {
            setActionStatus(`✔ Đã xóa script "${scriptName || scriptId}"!`);
            await fetchScripts();
          } else {
            setConfirmDialog({
              isOpen: true,
              title: 'Lỗi xóa script',
              message: data?.error || 'Không thể xóa script.',
              isAlert: true,
              danger: true,
              type: 'danger',
              confirmText: 'Đã hiểu',
              onConfirm: () => setConfirmDialog(null)
            });
          }
        } catch (e) {
          setConfirmDialog({
            isOpen: true,
            title: 'Lỗi kết nối',
            message: e?.message || String(e),
            isAlert: true,
            danger: true,
            type: 'danger',
            confirmText: 'Đã hiểu',
            onConfirm: () => setConfirmDialog(null)
          });
        }
        setTimeout(() => setActionStatus(''), 3000);
      },
      onCancel: () => setConfirmDialog(null)
    });
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
    setScriptLogs([{ 
      text: `🚀 Khởi chạy: ${script.name}\nRunner: ${script.runner || 'custom'}\nLệnh: ${script.command}\nCwd: ${script.cwd || workspaceRoot}\nKế thừa ENV: ${script.envSourceType || 'none'} (${script.envSourceId || ''})\n----------------------------------------\n` 
    }]);
    setRunStatus('RUNNING');

    try {
      const res = await fetch(`${BASE_URL}/api/scripts/${encodeURIComponent(script.id)}/run`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        if (data.output) {
          setScriptLogs(prev => [...prev, { text: data.output }]);
        }
        setRunStatus('SUCCESS');
      } else {
        setScriptLogs(prev => [...prev, { text: `❌ Lỗi khi thực thi: ${data.error || 'Thất bại'}\n${data.output || ''}` }]);
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
    return (s.name || '').toLowerCase().includes(q) || (s.command || '').toLowerCase().includes(q) || (s.file || '').toLowerCase().includes(q);
  });

  return (
    <div 
      className="flex-1 p-6 overflow-y-auto space-y-6 custom-scroll"
      style={{ backgroundColor: currentThemeConfig.bg, color: currentThemeConfig.text }}
    >
      {/* 1. Header Banner */}
      <div 
        className="relative overflow-hidden rounded-2xl p-5 border transition-all shadow-sm"
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
              <span>Hộp Công Cụ: Quản Lý & Chạy Scripts</span>
            </h2>
            <p className="text-xs" style={{ color: currentThemeConfig.textMuted }}>
              Tự động hóa tác vụ: Chọn file (.py, .js, .sh...), gán Runner (Python, Node, Bash, Custom) & nạp ENV.
            </p>
          </div>

          <button
            onClick={() => setModalScript(null)}
            className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center space-x-1.5 cursor-pointer"
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

      {/* 2. CUSTOM SCRIPTS SECTION */}
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
              placeholder="Tìm kiếm theo tên, file hoặc lệnh..."
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
            {loading ? 'Đang tải scripts...' : 'Chưa có script nào được tạo. Hãy bấm "Tạo Script Mới" để thêm kịch bản.'}
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
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{script.icon || '⚡'}</span>
                      <span 
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold"
                        style={{
                          backgroundColor: `${accentColor}15`,
                          borderColor: `${accentColor}35`,
                          color: accentColor
                        }}
                      >
                        {script.runner || 'custom'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRunScript(script)}
                      className="px-3.5 py-1 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: accentColor }}
                      title="Chạy script này ngay"
                    >
                      <Play size={11} fill="white" />
                      <span>Chạy</span>
                    </button>
                  </div>

                  <h3 className="text-sm font-bold font-mono truncate" style={{ color: currentThemeConfig.text }} title={script.name}>
                    {script.name}
                  </h3>

                  {script.file && (
                    <p className="text-[11px] font-mono mt-1 truncate opacity-80" style={{ color: currentThemeConfig.textMuted }} title={script.file}>
                      📄 {script.file}
                    </p>
                  )}

                  <div 
                    className="p-2.5 rounded-xl border mt-2.5"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border
                    }}
                  >
                    <code className="text-xs font-mono block truncate" style={{ color: accentColor }} title={script.command}>
                      {script.command}
                    </code>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono mt-2" style={{ color: currentThemeConfig.textMuted }}>
                    <span className="truncate max-w-[200px]" title={script.cwd || workspaceRoot}>
                      📁 {script.cwd || 'Workspace'}
                    </span>
                    {script.envSourceType && script.envSourceType !== 'none' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded border bg-slate-800/40 text-slate-300 border-slate-700">
                        ENV: {script.envSourceId || script.envSourceType}
                      </span>
                    )}
                  </div>
                </div>

                <div 
                  className="pt-3 border-t flex items-center justify-between"
                  style={{ borderColor: currentThemeConfig.border }}
                >
                  <span className="text-[10px] font-mono uppercase" style={{ color: currentThemeConfig.textMuted }}>
                    {script.runner || 'CLI'}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleDuplicateScript(script)}
                      className="p-1.5 hover:text-white rounded-lg transition-colors cursor-pointer"
                      style={{ color: currentThemeConfig.textMuted }}
                      title="Nhân bản script"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={() => setModalScript(script)}
                      className="p-1.5 hover:text-white rounded-lg transition-colors cursor-pointer"
                      style={{ color: currentThemeConfig.textMuted }}
                      title="Chỉnh sửa script"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteScript(script.id, script.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors cursor-pointer"
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
      {modalScript !== undefined && (
        <GlobalScriptModal
          script={modalScript}
          services={services}
          globalProfiles={globalProfiles}
          activeGlobalProfile={activeGlobalProfile}
          workspaceRoot={workspaceRoot}
          isOpen={modalScript !== undefined}
          onClose={() => setModalScript(undefined)}
          onSave={handleSaveScript}
          currentThemeConfig={currentThemeConfig}
          accentColor={accentColor}
        />
      )}

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
                className="p-1 rounded text-xs hover:text-white cursor-pointer"
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
              {scriptLogs.map((log, index) => (
                <div key={index} className="text-slate-200 whitespace-pre-wrap break-all">
                  {log.text}
                </div>
              ))}
              {scriptLogs.length === 0 && (
                <div className="text-slate-500 italic">Đang chờ phản hồi output từ terminal...</div>
              )}
            </div>

            {/* Footer */}
            <div 
              className="px-5 py-3 border-t flex items-center justify-between"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border
              }}
            >
              <span className="text-[11px] font-mono" style={{ color: currentThemeConfig.textMuted }}>
                {runStatus === 'RUNNING' ? 'Đang stream log real-time từ SSE...' : 'Quá trình thực thi đã kết thúc.'}
              </span>
              <button
                onClick={() => setRunningScript(null)}
                className="px-4 py-1.5 text-xs font-bold text-white rounded-xl active:scale-95 cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                Đóng Console
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM / ALERT DIALOG */}
      <ConfirmModal
        isOpen={!!confirmDialog}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        itemName={confirmDialog?.itemName}
        confirmText={confirmDialog?.confirmText}
        cancelText={confirmDialog?.cancelText}
        isAlert={confirmDialog?.isAlert}
        danger={confirmDialog?.danger}
        type={confirmDialog?.type}
        onConfirm={confirmDialog?.onConfirm}
        onCancel={confirmDialog?.onCancel}
        currentThemeConfig={currentThemeConfig}
        accentColor={accentColor}
      />
    </div>
  );
}
