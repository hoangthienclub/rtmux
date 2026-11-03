import React, { useState, useEffect, useMemo } from 'react';
import { 
  Boxes, 
  Plus, 
  Trash2, 
  Edit3, 
  Folder, 
  FolderOpen,
  Play, 
  Settings2, 
  Check,
  LayoutList,
  LayoutGrid,
  Search,
  Download,
  Upload,
  RefreshCw,
  FolderSearch,
  Layers,
  X
} from 'lucide-react';
import { THEME_CONFIGS } from '../../constants/palettes';
import { BASE_URL, convertWindowsToWslPath, convertWslToWindowsPath, createService, updateService, deleteService, ensureBackendRunning } from '../../services/microserviceClient';
import ConfirmModal from '../common/ConfirmModal';

// ================= SERVICE MODAL =================
function ServiceModal({ service, categories = [], isOpen, onClose, onSave, defaultCategory = null, currentThemeConfig = {}, accentColor = '#10b981', settings = {} }) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState(['SERVICE']);
  const [newGroupInput, setNewGroupInput] = useState('');
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [port, setPort] = useState('');
  const [script, setScript] = useState('yarn');
  const [args, setArgs] = useState('start:dev');
  const [cwd, setCwd] = useState('');
  const [isWsl, setIsWsl] = useState(true);
  const [wslDistro, setWslDistro] = useState('Ubuntu-24.04');
  const [inspecting, setInspecting] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [detectedInfo, setDetectedInfo] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormError('');
      if (service) {
        setId(service.id || '');
        setName(service.name || '');

        // Support multiselect groups/categories
        let initGroups = [];
        if (Array.isArray(service.groups) && service.groups.length > 0) {
          initGroups = service.groups.map(g => String(g).trim().toUpperCase()).filter(Boolean);
        } else if (service.group) {
          initGroups = String(service.group).split(',').map(g => g.trim().toUpperCase()).filter(Boolean);
        } else if (service.category) {
          initGroups = [String(service.category).trim().toUpperCase()];
        } else if (defaultCategory) {
          initGroups = [String(defaultCategory).trim().toUpperCase()];
        } else {
          initGroups = ['SERVICE'];
        }
        setSelectedGroups(initGroups.length > 0 ? initGroups : ['SERVICE']);

        setPort(service.port !== undefined && service.port !== null ? service.port : '');
        setScript(service.script || 'yarn');
        setArgs((service.args || ['start:dev']).join(' '));
        const initIsWsl = service.isWsl !== undefined ? !!service.isWsl : (settings?.enableWsl ?? true);
        setIsWsl(initIsWsl);
        setWslDistro(service.wslDistro || settings?.wslDistro || 'Ubuntu-24.04');
        setCwd(service.cwd || service.relativeDir || '');
      } else {
        setId('');
        setName('');
        const initDef = defaultCategory ? String(defaultCategory).trim().toUpperCase() : 'SERVICE';
        setSelectedGroups([initDef]);
        setPort('');
        setScript('yarn');
        setArgs('start:dev');
        const initIsWsl = settings?.enableWsl ?? true;
        setIsWsl(initIsWsl);
        setWslDistro(settings?.wslDistro || 'Ubuntu-24.04');
        setCwd('');
      }
      setDetectedInfo('');
      setInspecting(false);
      setBrowsing(false);
      setNewGroupInput('');
      setIsAddingNewGroup(false);
    }
  }, [isOpen, service, defaultCategory, settings]);

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

  const availableCategoryList = useMemo(() => {
    const set = new Map();
    (categories || []).forEach(c => {
      const cid = (c.id || c.name || '').toString().trim().toUpperCase();
      if (cid) set.set(cid, c.name || cid);
    });
    ['SERVICE', 'BFF', 'FE', 'GATEWAY', 'WORKER', 'CORE'].forEach(g => {
      if (!set.has(g)) set.set(g, g);
    });
    return Array.from(set.entries()).map(([cid, cname]) => ({ id: cid, name: cname }));
  }, [categories]);

  if (!isOpen) return null;
  const isEdit = !!service;

  const handleInspectDirectory = async (targetDir = cwd) => {
    const dirToInspect = (targetDir || '').trim();
    if (!dirToInspect) {
      setDetectedInfo('Vui lòng chọn hoặc nhập đường dẫn thư mục mã nguồn trước khi kiểm tra!');
      return;
    }
    setInspecting(true);
    setDetectedInfo('');
    try {
      const res = await fetch(`${BASE_URL}/api/inspect-directory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dirPath: dirToInspect, isWsl, wslDistro })
      });
      const data = await res.json();
      const info = data?.result || data?.packageInfo || data;
      const pkg = data?.packageInfo || data?.result?.packageInfo || (info?.scripts ? info : null);
      const isProjectFound = data?.success && (pkg || data?.exists);

      if (isProjectFound && (pkg || data?.envCount > 0 || (data?.env && Object.keys(data.env).length > 0))) {
        // 1. Script names
        let scriptNames = [];
        if (Array.isArray(pkg?.scripts)) {
          scriptNames = pkg.scripts.map(s => s.name || s).filter(Boolean);
        } else if (pkg?.scripts && typeof pkg.scripts === 'object') {
          scriptNames = Object.keys(pkg.scripts);
        }

        // 2. Determine suggested runner & args
        const suggestedRunner = data?.suggestedRunner || pkg?.runner || pkg?.packageManager || 'yarn';
        const suggestedArgs = data?.suggestedArgs || pkg?.args || (pkg?.bestScript ? pkg.bestScript.args : 'dev');
        if (suggestedRunner) setScript(suggestedRunner);
        if (suggestedArgs) setArgs(suggestedArgs);

        // 3. Determine candidate port
        const candidatePort = data?.detectedPort 
          || pkg?.detectedPort 
          || data?.detectedEnv?.PORT 
          || data?.env?.PORT 
          || data?.detectedEnv?.NEST_API_PORT;
        if (candidatePort && !port) {
          setPort(String(candidatePort));
        }

        // 4. Auto fill ID & Name if currently empty
        const rawPkgName = pkg?.name || data?.name || '';
        if (rawPkgName) {
          if (!id) {
            setId(rawPkgName.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
          }
          if (!name) {
            const formattedName = rawPkgName
              .split(/[-_]/)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            setName(formattedName || rawPkgName);
          }
        }

        // 5. Success info message
        const labelName = pkg?.name || data?.name || 'Project';
        const scriptsPart = scriptNames.length > 0 ? ` (Scripts: ${scriptNames.slice(0, 4).join(', ')})` : '';
        const portPart = candidatePort ? ` • Cổng: ${candidatePort}` : '';
        setDetectedInfo(`✔ Phát hiện: ${labelName} [${suggestedRunner}]${scriptsPart}${portPart}`);
      } else if (data?.success && data?.exists) {
        setDetectedInfo(`✔ Thư mục tồn tại hợp lệ trong ${isWsl ? wslDistro : 'Windows'}`);
      } else {
        setDetectedInfo(data?.error || 'Không tìm thấy package.json hoặc thông tin dự án trong thư mục này.');
      }
    } catch (e) {
      setDetectedInfo('Lỗi kiểm tra thư mục: ' + e.message);
    } finally {
      setInspecting(false);
    }
  };

  const handleBrowseDirectory = async () => {
    setBrowsing(true);
    try {
      let chosenPath = null;
      // 1. Try Tauri native dialog first if available
      if (window.__TAURI__?.dialog?.open) {
        try {
          const defaultPath = isWsl 
            ? (cwd ? convertWslToWindowsPath(cwd, wslDistro) : undefined)
            : (cwd || undefined);
          chosenPath = await window.__TAURI__.dialog.open({
            directory: true,
            multiple: false,
            defaultPath: defaultPath
          });
        } catch (tauriErr) {
          console.warn('[TauriDialog] open failed, fallback to backend:', tauriErr);
        }
      }

      // 2. Fallback to server browseDirectory API
      if (!chosenPath) {
        const res = await fetch(`${BASE_URL}/api/browse-directory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isWsl, wslDistro, defaultDir: cwd })
        });
        const data = await res.json();
        if (data?.success && data?.path) {
          chosenPath = data.path;
        }
      }

      if (chosenPath && typeof chosenPath === 'string') {
        const normalized = isWsl 
          ? convertWindowsToWslPath(chosenPath, wslDistro)
          : chosenPath.replace(/\\/g, '/');
        setCwd(normalized);
        handleInspectDirectory(normalized);
      }
    } catch (e) {
      console.error('Browse directory error:', e);
    } finally {
      setBrowsing(false);
    }
  };

  const toggleIsWsl = (nextIsWsl) => {
    setIsWsl(nextIsWsl);
    if (cwd.trim()) {
      if (nextIsWsl) {
        setCwd(convertWindowsToWslPath(cwd, wslDistro));
      } else {
        setCwd(convertWslToWindowsPath(cwd, wslDistro));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!id.trim() || !name.trim()) {
      setFormError('Vui lòng nhập ID và Tên Service!');
      return;
    }
    if (!cwd.trim()) {
      setFormError('Vui lòng chọn hoặc nhập Thư mục mã nguồn!');
      return;
    }
    setFormError('');

    const finalGroups = selectedGroups.length > 0 ? selectedGroups : ['SERVICE'];
    const serviceData = {
      id: id.trim().toLowerCase().replace(/\s+/g, '-'),
      name: name.trim(),
      category: finalGroups[0],
      group: finalGroups.join(', '),
      groups: finalGroups,
      port: port ? parseInt(port, 10) : null,
      script: script.trim(),
      args: args.trim().split(/\s+/).filter(Boolean),
      cwd: cwd.trim(),
      relativeDir: cwd.trim(),
      isWsl: !!isWsl,
      wslDistro: isWsl ? wslDistro : undefined,
      wslPath: isWsl ? cwd.trim() : undefined
    };

    onSave(serviceData, isEdit, service?.id);
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
            <Boxes size={16} style={{ color: accentColor }} />
            <span>{isEdit ? 'Chỉnh Sửa Microservice' : 'Đăng Ký Microservice Mới'}</span>
          </h4>
          <button onClick={onClose} className="p-1 rounded text-xs hover:text-white" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Mã Service (ID) *</label>
              <input
                type="text"
                disabled={isEdit}
                placeholder="vd: acc-service, auth-bff"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs font-mono uppercase focus:outline-none disabled:opacity-50"
                style={{
                  backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                  borderColor: currentThemeConfig.border || '#27272a',
                  color: accentColor
                }}
                required
              />
            </div>
            <div>
              <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Tên Hiển Thị *</label>
              <input
                type="text"
                placeholder="vd: Accounting Service"
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

          {/* MULTISELECT CATEGORIES / GROUPS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
                Danh Mục / Nhóm * <span className="font-normal opacity-75">(Chọn một hoặc nhiều nhóm để phân loại)</span>
              </label>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ backgroundColor: `${accentColor}15`, borderColor: `${accentColor}40`, color: accentColor }}>
                {selectedGroups.length} nhóm đã chọn
              </span>
            </div>

            {/* Selected category badges */}
            <div 
              className="p-2.5 rounded-xl border min-h-[44px] flex flex-wrap items-center gap-1.5"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                borderColor: currentThemeConfig.border || '#27272a'
              }}
            >
              {selectedGroups.map(grp => (
                <span
                  key={grp}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all"
                  style={{
                    backgroundColor: `${accentColor}20`,
                    borderColor: accentColor,
                    color: accentColor
                  }}
                >
                  <span>{grp}</span>
                  <button
                    type="button"
                    disabled={selectedGroups.length <= 1}
                    onClick={() => {
                      if (selectedGroups.length > 1) {
                        setSelectedGroups(selectedGroups.filter(g => g !== grp));
                      }
                    }}
                    className="hover:text-rose-400 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer text-[11px]"
                    title={selectedGroups.length <= 1 ? 'Cần giữ ít nhất 1 nhóm' : `Bỏ nhóm ${grp}`}
                  >
                    ✕
                  </button>
                </span>
              ))}

              {/* Add custom tag trigger / input */}
              {isAddingNewGroup ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder="NHÓM_MỚI..."
                    value={newGroupInput}
                    onChange={(e) => setNewGroupInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = newGroupInput.trim().toUpperCase().replace(/\s+/g, '_');
                        if (val && !selectedGroups.includes(val)) {
                          setSelectedGroups([...selectedGroups, val]);
                        }
                        setNewGroupInput('');
                        setIsAddingNewGroup(false);
                      } else if (e.key === 'Escape') {
                        setIsAddingNewGroup(false);
                      }
                    }}
                    className="border rounded-md px-2 py-0.5 text-xs font-mono uppercase focus:outline-none w-32"
                    style={{
                      backgroundColor: currentThemeConfig.card,
                      borderColor: accentColor,
                      color: currentThemeConfig.text
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = newGroupInput.trim().toUpperCase().replace(/\s+/g, '_');
                      if (val && !selectedGroups.includes(val)) {
                        setSelectedGroups([...selectedGroups, val]);
                      }
                      setNewGroupInput('');
                      setIsAddingNewGroup(false);
                    }}
                    className="px-2 py-0.5 text-[11px] font-bold rounded-md text-white cursor-pointer"
                    style={{ backgroundColor: accentColor }}
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewGroup(false)}
                    className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingNewGroup(true)}
                  className="px-2 py-1 rounded-lg text-xs font-mono border border-dashed transition-colors flex items-center gap-1 cursor-pointer hover:border-emerald-400"
                  style={{
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.textMuted
                  }}
                >
                  <Plus size={11} />
                  <span>Thêm nhóm</span>
                </button>
              )}
            </div>

            {/* Quick Available Suggestions */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10.5px] font-mono text-slate-400">Gợi ý:</span>
              {availableCategoryList.map(cat => {
                const isSelected = selectedGroups.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        if (selectedGroups.length > 1) {
                          setSelectedGroups(selectedGroups.filter(g => g !== cat.id));
                        }
                      } else {
                        setSelectedGroups([...selectedGroups, cat.id]);
                      }
                    }}
                    className="px-2 py-0.5 rounded-md text-[11px] font-mono transition-all border flex items-center gap-1 cursor-pointer active:scale-95"
                    style={{
                      backgroundColor: isSelected ? `${accentColor}25` : currentThemeConfig.innerInput,
                      borderColor: isSelected ? accentColor : currentThemeConfig.border,
                      color: isSelected ? accentColor : currentThemeConfig.textMuted
                    }}
                    title={isSelected ? `Bấm để bỏ chọn ${cat.name}` : `Bấm để thêm ${cat.name}`}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Cổng Lắng Nghe (Port)</label>
            <input
              type="number"
              placeholder="vd: 45072, 9091"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                borderColor: currentThemeConfig.border || '#27272a',
                color: accentColor
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Lệnh Runtime</label>
              <select
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none cursor-pointer"
                style={{
                  backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                  borderColor: currentThemeConfig.border || '#27272a',
                  color: currentThemeConfig.text || '#f4f4f5'
                }}
              >
                <option value="yarn">yarn</option>
                <option value="npm">npm</option>
                <option value="pnpm">pnpm</option>
                <option value="node">node</option>
                <option value="go">go</option>
                <option value="python">python</option>
                <option value="sh">sh / bash</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Tham Số (Arguments)</label>
              <input
                type="text"
                placeholder="start:dev hoặc run start"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                style={{
                  backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                  borderColor: currentThemeConfig.border || '#27272a',
                  color: currentThemeConfig.text || '#f4f4f5'
                }}
              />
            </div>
          </div>

          {/* Execution Environment Selector (WSL2 vs Windows Native) */}
          <div 
            className="p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            style={{ 
              backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
              borderColor: currentThemeConfig.border || '#27272a'
            }}
          >
            <div>
              <span className="text-xs font-bold block" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
                Môi trường thực thi
              </span>
              <span className="text-[10.5px] font-mono text-slate-400">
                {isWsl ? `🐧 Khởi chạy trong WSL2 Linux (${wslDistro})` : '🪟 Khởi chạy trực tiếp trên Windows Native host'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => toggleIsWsl(true)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                  isWsl 
                    ? 'shadow-md text-white' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={{
                  backgroundColor: isWsl ? accentColor : 'transparent'
                }}
              >
                <span>🐧 WSL2</span>
              </button>
              <button
                type="button"
                onClick={() => toggleIsWsl(false)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                  !isWsl 
                    ? 'shadow-md text-white' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={{
                  backgroundColor: !isWsl ? accentColor : 'transparent'
                }}
              >
                <span>🪟 Windows</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
                Thư Mục Mã Nguồn (Directory) *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBrowseDirectory}
                  disabled={browsing}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 border transition-all cursor-pointer shadow-sm hover:opacity-90 disabled:opacity-50"
                  style={{
                    backgroundColor: `${accentColor}18`,
                    borderColor: `${accentColor}40`,
                    color: accentColor
                  }}
                  title="Mở hộp thoại chọn thư mục dự án"
                >
                  {browsing ? <RefreshCw size={12} className="animate-spin" /> : <FolderOpen size={12} />}
                  <span>Chọn thư mục...</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInspectDirectory(cwd)}
                  disabled={inspecting || !cwd.trim()}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 border transition-all cursor-pointer shadow-sm hover:opacity-90 disabled:opacity-40"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                    borderColor: currentThemeConfig.border || '#27272a',
                    color: currentThemeConfig.textMuted || '#a1a1aa'
                  }}
                  title="Quét package.json để phát hiện scripts & port"
                >
                  {inspecting ? <RefreshCw size={12} className="animate-spin" /> : <FolderSearch size={12} />}
                  <span>Tự động phát hiện</span>
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder={isWsl ? "/home/thientran/projects/my-service hoặc /mnt/c/..." : "C:\\Users\\... hoặc Z:\\home\\..."}
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                borderColor: currentThemeConfig.border || '#27272a',
                color: currentThemeConfig.text || '#f4f4f5'
              }}
              required
            />
            <p className="text-[10.5px] mt-1 font-mono text-slate-400">
              {isWsl 
                ? `🐧 Định dạng đường dẫn WSL (ví dụ: /home/... hoặc /mnt/c/...) chạy trong ${wslDistro}`
                : `🪟 Định dạng đường dẫn Windows (ví dụ: C:\\Users\\... hoặc Z:\\home\\...)`
              }
            </p>
            {detectedInfo && (
              <p className="text-[11px] font-mono mt-1 font-medium" style={{ color: detectedInfo.startsWith('✔') ? '#34d399' : '#f87171' }}>
                {detectedInfo}
              </p>
            )}
            {formError && (
              <p className="text-[11px] font-mono mt-1 font-medium text-rose-400">
                ⚠️ {formError}
              </p>
            )}
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
              {isEdit ? 'Lưu Thay Đổi' : 'Đăng Ký Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================= MAIN MANAGE SERVICES VIEW =================
export default function ManageServicesView({
  services = [],
  onReloadServices,
  onAddNewService,
  onUpdateService,
  onDeleteService,
  settings = {}
}) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';

  const [categories, setCategories] = useState([]);
  const [modalService, setModalService] = useState(undefined); // undefined: closed, null: new, obj: edit
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState([]);
  const [actionStatus, setActionStatus] = useState('');
  const [viewType, setViewType] = useState('list'); // 'list' | 'grid'
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Helper to extract all categories for any service
  const getServiceGroups = (s) => {
    if (Array.isArray(s.groups) && s.groups.length > 0) {
      return s.groups.map(g => String(g).trim().toUpperCase()).filter(Boolean);
    }
    const raw = s.group || s.category || 'SERVICE';
    return String(raw).split(',').map(g => g.trim().toUpperCase()).filter(Boolean);
  };

  useEffect(() => {
    fetch(`${BASE_URL}/api/categories`)
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.categories)) {
          setCategories(d.categories);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (serviceData, isEdit, originalId) => {
    try {
      await ensureBackendRunning({
        enableWsl: settings?.enableWsl,
        wslDistro: settings?.wslDistro
      });
      const targetId = originalId || serviceData.id;
      const data = isEdit 
        ? await updateService(targetId, serviceData)
        : await createService(serviceData);

      if (data && data.success) {
        setActionStatus(`✔ Đã ${isEdit ? 'cập nhật' : 'lưu'} cấu hình dịch vụ "${serviceData.name}" thành công!`);
        setModalService(undefined);
        if (isEdit && onUpdateService) onUpdateService(data.service || serviceData);
        if (!isEdit && onAddNewService) onAddNewService(data.service || serviceData);
        if (onReloadServices) onReloadServices();
      } else {
        setConfirmDialog({
          isOpen: true,
          title: `Lỗi ${isEdit ? 'cập nhật' : 'lưu'} service`,
          message: data?.error || 'Có lỗi xảy ra khi lưu service.',
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

  const handleDelete = (serviceId, serviceName) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa microservice',
      message: 'Bạn có chắc chắn muốn xóa cấu hình service này không? Thao tác này không thể hoàn tác.',
      itemName: `${serviceName || serviceId} (${serviceId})`,
      confirmText: 'Xóa service',
      cancelText: 'Hủy',
      danger: true,
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const data = await deleteService(serviceId);
          if (data && data.success) {
            setActionStatus(`✔ Đã xóa dịch vụ "${serviceName || serviceId}"!`);
            if (onDeleteService) onDeleteService(serviceId);
            if (onReloadServices) onReloadServices();
          } else {
            setConfirmDialog({
              isOpen: true,
              title: 'Lỗi xóa service',
              message: data?.error || 'Không thể xóa dịch vụ này.',
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

  const handleExportAll = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(services, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `services-backup-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const uniqueGroups = useMemo(() => {
    const counts = {};
    if (Array.isArray(services)) {
      services.forEach(s => {
        const groups = getServiceGroups(s);
        groups.forEach(g => {
          counts[g] = (counts[g] || 0) + 1;
        });
      });
    }

    const set = new Set();
    // 1. Categories from backend API
    if (Array.isArray(categories)) {
      categories.forEach(c => {
        const id = (c.id || c.name || '').toString().trim().toUpperCase();
        if (id) set.add(id);
      });
    }
    // 2. Groups from services
    Object.keys(counts).forEach(g => set.add(g));

    return [
      { id: 'ALL', name: 'ALL', count: services?.length || 0 },
      ...Array.from(set).map(grp => ({
        id: grp,
        name: grp,
        count: counts[grp] || 0
      }))
    ];
  }, [categories, services]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return (services || []).filter(s => {
      const sGroups = getServiceGroups(s);
      const matchesGroup = selectedCategoryFilters.length === 0 || 
        selectedCategoryFilters.some(filterCat => sGroups.includes(filterCat));

      if (!matchesGroup) return false;
      if (!q) return true;

      const nameMatch = (s.name || '').toLowerCase().includes(q);
      const idMatch = (s.id || '').toLowerCase().includes(q);
      const portMatch = String(s.port || '').includes(q);
      const groupMatch = sGroups.some(g => g.toLowerCase().includes(q));
      const cwdMatch = (s.cwd || s.relativeDir || s.wslPath || '').toLowerCase().includes(q);
      const scriptMatch = (s.script || '').toLowerCase().includes(q);
      const argsMatch = (Array.isArray(s.args) ? s.args.join(' ') : (s.args || '')).toLowerCase().includes(q);
      const statusMatch = (s.statusInfo?.status || '').toLowerCase().includes(q);

      return nameMatch || idMatch || portMatch || groupMatch || cwdMatch || scriptMatch || argsMatch || statusMatch;
    });
  }, [services, selectedCategoryFilters, searchQuery]);

  const handleCategoryClick = (grpId) => {
    if (grpId === 'ALL') {
      setSelectedCategoryFilters([]);
      return;
    }
    setSelectedCategoryFilters(prev => {
      if (prev.includes(grpId)) {
        return prev.filter(g => g !== grpId);
      } else {
        return [...prev, grpId];
      }
    });
  };

  return (
    <div 
      className="flex-1 p-6 overflow-y-auto space-y-6 custom-scroll"
      style={{ backgroundColor: currentThemeConfig.bg, color: currentThemeConfig.text }}
    >
      {/* 1. Header Banner with subtle glow */}
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
              <Boxes size={18} style={{ color: accentColor }} />
              <span>Quản Lý Cấu Hình Services ({services.length})</span>
            </h2>
            <p className="text-xs" style={{ color: currentThemeConfig.textMuted }}>
              Tự do thêm mới, sửa cổng Port, đường dẫn code nguồn và lệnh chạy runtime cho từng dịch vụ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setModalService(null)}
              className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center space-x-1.5"
              style={{ backgroundColor: accentColor }}
            >
              <Plus size={14} />
              <span>Thêm Service Mới</span>
            </button>

            <button
              onClick={handleExportAll}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center space-x-1.5 hover:text-white"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.textMuted
              }}
              title="Xuất danh sách services ra file JSON"
            >
              <Download size={13} />
              <span>Export JSON</span>
            </button>
          </div>
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

      {/* 2. Filter and View mode switcher */}
      <div 
        className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border"
        style={{
          backgroundColor: currentThemeConfig.card,
          borderColor: currentThemeConfig.border
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-80">
            <input
              type="text"
              placeholder="Tìm theo tên, port, ID, thư mục, lệnh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded-xl pl-9 pr-8 py-1.5 text-xs focus:outline-none transition-all"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.text
              }}
            />
            <Search size={14} className="absolute left-3 top-2 text-slate-500 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Xóa từ khóa tìm kiếm"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-1.5">
            {uniqueGroups.map(grp => {
              const isActive = grp.id === 'ALL'
                ? selectedCategoryFilters.length === 0
                : selectedCategoryFilters.includes(grp.id);
              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => handleCategoryClick(grp.id)}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95"
                  style={{
                    backgroundColor: isActive ? `${accentColor}25` : currentThemeConfig.innerInput,
                    borderColor: isActive ? accentColor : currentThemeConfig.border,
                    color: isActive ? accentColor : currentThemeConfig.textMuted
                  }}
                  title={grp.id === 'ALL' ? 'Hiển thị tất cả' : (isActive ? `Bấm để bỏ lọc ${grp.name}` : `Bấm để thêm lọc ${grp.name}`)}
                >
                  {grp.id !== 'ALL' && isActive && <Check size={11} className="stroke-[3]" />}
                  <span>{grp.name}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold"
                    style={{
                      backgroundColor: isActive ? `${accentColor}40` : `${currentThemeConfig.border}`,
                      color: isActive ? '#fff' : currentThemeConfig.textMuted
                    }}
                  >
                    {grp.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* View mode toggle: List vs Grid */}
        <div 
          className="flex items-center p-1 rounded-xl border flex-shrink-0"
          style={{ backgroundColor: currentThemeConfig.innerInput, borderColor: currentThemeConfig.border }}
        >
          <button
            type="button"
            onClick={() => setViewType('list')}
            className="flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={{
              backgroundColor: viewType === 'list' ? `${accentColor}25` : 'transparent',
              color: viewType === 'list' ? accentColor : currentThemeConfig.textMuted
            }}
          >
            <LayoutList size={13} />
            <span>Danh Sách</span>
          </button>
          <button
            type="button"
            onClick={() => setViewType('grid')}
            className="flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            style={{
              backgroundColor: viewType === 'grid' ? `${accentColor}25` : 'transparent',
              color: viewType === 'grid' ? accentColor : currentThemeConfig.textMuted
            }}
          >
            <LayoutGrid size={13} />
            <span>Thẻ Lưới</span>
          </button>
        </div>
      </div>

      {/* Active Filter Summary Strip */}
      {(selectedCategoryFilters.length > 0 || searchQuery.trim()) && (
        <div 
          className="flex items-center justify-between text-xs px-3.5 py-2 rounded-xl border font-mono animate-in fade-in"
          style={{
            backgroundColor: currentThemeConfig.innerInput,
            borderColor: currentThemeConfig.border,
            color: currentThemeConfig.textMuted
          }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span>Hiển thị <strong>{filteredServices.length}</strong> / {services.length} services</span>
            {selectedCategoryFilters.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400">Đang lọc {selectedCategoryFilters.length} nhóm:</span>
                {selectedCategoryFilters.map(cat => (
                  <span 
                    key={cat} 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold" 
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                  >
                    <span>{cat}</span>
                    <button 
                      type="button" 
                      onClick={() => handleCategoryClick(cat)}
                      className="hover:text-rose-400 cursor-pointer text-[10px]"
                      title={`Bỏ lọc ${cat}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            {searchQuery.trim() && (
              <span className="px-2 py-0.5 rounded-md text-[11px] bg-sky-950/40 text-sky-400 border border-sky-800/40">
                Từ khóa: "{searchQuery.trim()}"
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryFilters([]);
              setSearchQuery('');
            }}
            className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <X size={12} />
            <span>Xóa bộ lọc</span>
          </button>
        </div>
      )}

      {/* 3. Main Services Table or Grid */}
      {filteredServices.length === 0 ? (
        <div 
          className="p-12 text-center rounded-2xl border"
          style={{
            backgroundColor: currentThemeConfig.card,
            borderColor: currentThemeConfig.border,
            color: currentThemeConfig.textMuted
          }}
        >
          Chưa có service nào phù hợp với bộ lọc.
        </div>
      ) : viewType === 'list' ? (
        <div className="space-y-2.5">
          {filteredServices.map(svc => (
            <div
              key={svc.id}
              className="border rounded-2xl p-4 transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
              style={{
                backgroundColor: currentThemeConfig.card,
                borderColor: currentThemeConfig.border
              }}
            >
              <div className="flex items-start space-x-3.5">
                <div 
                  className="w-10 h-10 rounded-xl border flex items-center justify-center font-bold flex-shrink-0"
                  style={{
                    backgroundColor: `${accentColor}15`,
                    borderColor: `${accentColor}35`,
                    color: accentColor
                  }}
                >
                  <Boxes size={18} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm font-mono" style={{ color: currentThemeConfig.text }}>{svc.name}</h3>
                    <span 
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: `${accentColor}12`,
                        borderColor: `${accentColor}30`,
                        color: accentColor
                      }}
                    >
                      :{svc.port || 'No Port'}
                    </span>
                    {getServiceGroups(svc).map(grp => (
                      <span 
                        key={grp}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold"
                        style={{
                          backgroundColor: currentThemeConfig.innerInput,
                          borderColor: currentThemeConfig.border,
                          color: currentThemeConfig.textMuted
                        }}
                      >
                        {grp}
                      </span>
                    ))}
                    <span 
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        svc.isWsl 
                          ? 'text-sky-400 bg-sky-950/40 border-sky-800/40' 
                          : 'text-amber-400 bg-amber-950/40 border-amber-800/40'
                      }`}
                    >
                      {svc.isWsl ? `🐧 WSL (${svc.wslDistro || 'Ubuntu'})` : '🪟 Windows'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono mt-1.5" style={{ color: currentThemeConfig.textMuted }}>
                    <span>Lệnh: <strong style={{ color: accentColor }}>{svc.script} {(svc.args || []).join(' ')}</strong></span>
                    <span>•</span>
                    <span className="truncate max-w-md">Thư mục: <strong style={{ color: currentThemeConfig.text }}>{svc.cwd || svc.relativeDir || '-'}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end md:self-center flex-shrink-0">
                <button
                  onClick={() => setModalService(svc)}
                  className="p-2 rounded-xl text-xs transition-all border hover:text-white"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.textMuted
                  }}
                  title="Chỉnh sửa service"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(svc.id, svc.name)}
                  className="p-2 bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs transition-all border border-rose-800/40"
                  title="Xóa service"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map(svc => (
            <div
              key={svc.id}
              className="border rounded-2xl p-5 transition-all shadow-md flex flex-col justify-between space-y-4"
              style={{
                backgroundColor: currentThemeConfig.card,
                borderColor: currentThemeConfig.border
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold"
                      style={{
                        backgroundColor: `${accentColor}12`,
                        borderColor: `${accentColor}30`,
                        color: accentColor
                      }}
                    >
                      :{svc.port || 'No Port'}
                    </span>
                    {getServiceGroups(svc).map(grp => (
                      <span 
                        key={grp}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold"
                        style={{
                          backgroundColor: currentThemeConfig.innerInput,
                          borderColor: currentThemeConfig.border,
                          color: currentThemeConfig.textMuted
                        }}
                      >
                        {grp}
                      </span>
                    ))}
                  </div>
                  <span 
                    className={`text-[9.5px] font-mono px-2 py-0.5 rounded-md border ${
                      svc.isWsl 
                        ? 'text-sky-400 bg-sky-950/40 border-sky-800/40' 
                        : 'text-amber-400 bg-amber-950/40 border-amber-800/40'
                    }`}
                  >
                    {svc.isWsl ? '🐧 WSL' : '🪟 Win'}
                  </span>
                </div>
                <h3 className="text-base font-bold font-mono" style={{ color: currentThemeConfig.text }}>{svc.name}</h3>
                <p className="text-xs font-mono mt-1" style={{ color: accentColor }}>{svc.script} {(svc.args || []).join(' ')}</p>
                <p className="text-[11px] font-mono mt-2 truncate" style={{ color: currentThemeConfig.textMuted }}>{svc.cwd || svc.relativeDir}</p>
              </div>

              <div 
                className="pt-3 border-t flex items-center justify-end space-x-2"
                style={{ borderColor: currentThemeConfig.border }}
              >
                <button onClick={() => setModalService(svc)} className="p-1.5 hover:text-white" style={{ color: currentThemeConfig.textMuted }}>
                  <Edit3 size={14} />
                </button>
                <button onClick={() => handleDelete(svc.id, svc.name)} className="p-1.5 text-slate-400 hover:text-rose-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {modalService !== undefined && (
        <ServiceModal
          service={modalService}
          categories={categories}
          isOpen={modalService !== undefined}
          onClose={() => setModalService(undefined)}
          onSave={handleSave}
          currentThemeConfig={currentThemeConfig}
          accentColor={accentColor}
          settings={settings}
        />
      )}

      {/* CONFIRM / ALERT POPUP */}
      {confirmDialog?.isOpen && (
        <ConfirmModal
          {...confirmDialog}
          settings={settings}
        />
      )}
    </div>
  );
}
