import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sliders, 
  Search, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  RefreshCw, 
  FileText, 
  Table, 
  Layers, 
  Globe, 
  Save, 
  Download, 
  FolderSync, 
  RotateCw,
  X,
  AlertTriangle,
  UploadCloud,
  FileCode2,
  Tag,
  Edit3
} from 'lucide-react';
import { THEME_CONFIGS } from '../../constants/palettes';
import { BASE_URL } from '../../services/microserviceClient';
import BackupRestoreModal from './BackupRestoreModal';
import ConfirmModal from '../common/ConfirmModal';

// ================= COPY FROM MODAL =================
function CopyFromEnvModal({ isOpen, onClose, services = [], activeTab, currentProfileKey, globalEnvPairs = [], onApply, currentThemeConfig = {}, accentColor = '#10b981' }) {
  const sources = useMemo(() => {
    return [
      { id: 'global', label: '🌍 Global Shared Config', env: Object.fromEntries((globalEnvPairs || []).map(p => [p.key, p.value])) },
      ...(services || []).flatMap(s => {
        return Object.entries(s.profiles || {}).map(([pKey, pVal]) => ({
          id: `${s.id}:::${pKey}`,
          label: `🧩 ${s.name} (Profile: ${pKey})`,
          env: pVal?.env || {}
        }));
      })
    ].filter(src => {
      if (activeTab === 'global' && src.id === 'global') return false;
      if (src.id === `${activeTab}:::${currentProfileKey}`) return false;
      return true;
    });
  }, [globalEnvPairs, services, activeTab, currentProfileKey]);

  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [copyMode, setCopyMode] = useState('overwrite'); // 'overwrite' | 'merge'
  const [copyError, setCopyError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (sources.length > 0 && (!selectedSourceId || !sources.some(s => s.id === selectedSourceId))) {
        setSelectedSourceId(sources[0].id);
      }
      setCopyMode('overwrite');
      setCopyError('');
    }
  }, [isOpen, sources]);

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

  const currentSource = sources.find(s => s.id === selectedSourceId);
  const sourceEnv = currentSource?.env || {};
  const sourceCount = Object.keys(sourceEnv).length;

  const handleConfirm = () => {
    if (!sourceEnv || Object.keys(sourceEnv).length === 0) {
      setCopyError('Nguồn này không có biến môi trường nào để sao chép!');
      return;
    }
    setCopyError('');
    onApply(sourceEnv, copyMode);
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
            <Copy size={16} style={{ color: accentColor }} />
            <span>Sao Chép Biến Môi Trường (Copy Env)</span>
          </h4>
          <button onClick={onClose} className="p-1 rounded text-xs hover:text-white" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
            <X size={16} />
          </button>
        </div>

        <div>
          <label className="text-xs block mb-1.5 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>1. Chọn Nguồn Sao Chép (Source):</label>
          {sources.length === 0 ? (
            <div 
              className="text-xs italic p-3 rounded-xl border"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                borderColor: currentThemeConfig.border || '#27272a',
                color: currentThemeConfig.textMuted || '#a1a1aa'
              }}
            >
              Không tìm thấy nguồn nào khác có biến môi trường để sao chép.
            </div>
          ) : (
            <select
              value={selectedSourceId}
              onChange={(e) => setSelectedSourceId(e.target.value)}
              className="w-full border rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none cursor-pointer"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                borderColor: currentThemeConfig.border || '#27272a',
                color: accentColor
              }}
            >
              {sources.map(src => (
                <option key={src.id} value={src.id}>
                  {src.label} ({Object.keys(src.env).length} biến)
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="text-xs block mb-1.5 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>2. Phương Thức Sao Chép (Mode):</label>
          <div className="grid grid-cols-2 gap-2">
            <div
              onClick={() => setCopyMode('overwrite')}
              className="p-3 rounded-xl border cursor-pointer transition-all"
              style={{
                backgroundColor: copyMode === 'overwrite' ? `${accentColor}20` : currentThemeConfig.innerInput || '#0d0d10',
                borderColor: copyMode === 'overwrite' ? accentColor : currentThemeConfig.border || '#27272a'
              }}
            >
              <span className="font-bold text-xs block" style={{ color: copyMode === 'overwrite' ? accentColor : currentThemeConfig.text }}>Ghi Đè (Overwrite)</span>
              <span className="text-[10px] block mt-0.5" style={{ color: currentThemeConfig.textMuted }}>Thay thế toàn bộ biến hiện tại</span>
            </div>

            <div
              onClick={() => setCopyMode('merge')}
              className="p-3 rounded-xl border cursor-pointer transition-all"
              style={{
                backgroundColor: copyMode === 'merge' ? `${accentColor}20` : currentThemeConfig.innerInput || '#0d0d10',
                borderColor: copyMode === 'merge' ? accentColor : currentThemeConfig.border || '#27272a'
              }}
            >
              <span className="font-bold text-xs block" style={{ color: copyMode === 'merge' ? accentColor : currentThemeConfig.text }}>Gộp Thêm (Merge)</span>
              <span className="text-[10px] block mt-0.5" style={{ color: currentThemeConfig.textMuted }}>Giữ biến cũ, chỉ cập nhật biến mới</span>
            </div>
          </div>
        </div>

        <div>
          <span className="text-[11px] font-mono block mb-1" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
            Xem trước danh sách biến ({sourceCount} biến):
          </span>
          <div 
            className="max-h-32 overflow-y-auto p-2.5 rounded-xl border text-[11px] font-mono"
            style={{
              backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
              borderColor: currentThemeConfig.border || '#27272a'
            }}
          >
            {sourceCount > 0 ? (
              Object.keys(sourceEnv).map(k => (
                <span 
                  key={k} 
                  className="inline-block px-1.5 py-0.5 rounded mr-1 mb-1 border"
                  style={{
                    backgroundColor: currentThemeConfig.card || '#18181b',
                    borderColor: currentThemeConfig.border || '#27272a',
                    color: currentThemeConfig.text || '#f4f4f5'
                  }}
                >
                  {k}
                </span>
              ))
            ) : (
              <span className="italic" style={{ color: currentThemeConfig.textMuted }}>Trống</span>
            )}
          </div>
        </div>

        <div 
          className="flex justify-end space-x-3 pt-2 border-t"
          style={{ borderColor: currentThemeConfig.border || '#27272a' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs rounded-xl hover:text-white"
            style={{
              backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
              color: currentThemeConfig.textMuted || '#a1a1aa'
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={sourceCount === 0}
            onClick={handleConfirm}
            className="px-5 py-2 text-xs font-bold text-white disabled:opacity-50 rounded-xl shadow-lg flex items-center space-x-1.5 active:scale-95"
            style={{ backgroundColor: accentColor }}
          >
            <Check size={14} />
            <span>Áp Dụng Sao Chép</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= IMPORT JSON ENV MODAL =================
function ImportJsonEnvModal({
  isOpen,
  onClose,
  targetTitle = '',
  onApplyImport,
  currentThemeConfig = {},
  accentColor = '#10b981'
}) {
  const [jsonText, setJsonText] = useState('');
  const [importMode, setImportMode] = useState('merge'); // 'merge' | 'overwrite'
  const [parsedEnv, setParsedEnv] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const [importError, setImportError] = useState('');

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

  useEffect(() => {
    if (!isOpen) {
      setJsonText('');
      setParsedEnv(null);
      setErrorMsg('');
      setFileName('');
      setImportMode('merge');
    }
  }, [isOpen]);

  const parseJsonData = (raw) => {
    if (!raw || !raw.trim()) {
      setParsedEnv(null);
      setErrorMsg('');
      return;
    }
    try {
      const data = JSON.parse(raw);
      let targetObj = data;
      // Handle nested structures: { env: { ... } } or { computedEnv: { ... } }
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (data.env && typeof data.env === 'object' && !Array.isArray(data.env)) {
          targetObj = data.env;
        } else if (data.computedEnv && typeof data.computedEnv === 'object' && !Array.isArray(data.computedEnv)) {
          targetObj = data.computedEnv;
        }
      }

      if (!targetObj || typeof targetObj !== 'object' || Array.isArray(targetObj)) {
        throw new Error('Dữ liệu JSON phải là một Object chứa các cặp Key-Value!');
      }

      const pairs = [];
      for (const [k, v] of Object.entries(targetObj)) {
        if (typeof v === 'object' && v !== null) {
          continue; // skip nested sub-objects
        }
        const formattedKey = String(k).trim().toUpperCase().replace(/\s+/g, '_');
        if (formattedKey) {
          pairs.push({ key: formattedKey, value: String(v ?? '') });
        }
      }

      if (pairs.length === 0) {
        throw new Error('Không tìm thấy biến môi trường hợp lệ nào trong file JSON!');
      }

      setParsedEnv(pairs);
      setErrorMsg('');
    } catch (err) {
      setParsedEnv(null);
      setErrorMsg(err.message || 'Lỗi cú pháp JSON không hợp lệ');
    }
  };

  const handleTextChange = (text) => {
    setJsonText(text);
    parseJsonData(text);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setJsonText(content);
        parseJsonData(content);
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  const handleApply = () => {
    if (!parsedEnv || parsedEnv.length === 0) {
      setImportError('Vui lòng chọn hoặc nhập file JSON hợp lệ trước khi áp dụng!');
      return;
    }
    setImportError('');
    onApplyImport(parsedEnv, importMode);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="border rounded-2xl p-6 w-full max-w-xl space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
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
          <div>
            <h4 className="text-sm font-bold font-mono flex items-center gap-2" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
              <UploadCloud size={16} style={{ color: accentColor }} />
              <span>Nhập Biến Môi Trường từ JSON (Import Env JSON)</span>
            </h4>
            {targetTitle && (
              <p className="text-[11px] font-mono mt-0.5" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
                Đang áp dụng cho: <span style={{ color: accentColor }}>{targetTitle}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded text-xs hover:text-white" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
            <X size={16} />
          </button>
        </div>

        {/* Input Option: File upload or raw JSON */}
        <div className="space-y-3">
          <div>
            <label className="text-xs block mb-1.5 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
              1. Tải lên file JSON hoặc Dán nội dung JSON:
            </label>
            <div className="flex items-center gap-2 mb-2">
              <label 
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer hover:text-white transition-all flex items-center gap-1.5"
                style={{
                  backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                  borderColor: currentThemeConfig.border || '#27272a',
                  color: currentThemeConfig.text || '#f4f4f5'
                }}
              >
                <UploadCloud size={13} style={{ color: accentColor }} />
                <span>Chọn File JSON...</span>
                <input 
                  type="file" 
                  accept=".json,application/json" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
              {fileName && (
                <span className="text-xs font-mono truncate max-w-xs" style={{ color: accentColor }}>
                  {fileName}
                </span>
              )}
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={`{\n  "PORT": "45072",\n  "DATABASE_URL": "postgresql://user:pass@localhost:5432/db",\n  "API_KEY": "secret_123"\n}`}
              className="w-full h-32 border rounded-xl p-3 text-xs font-mono focus:outline-none resize-none"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                borderColor: currentThemeConfig.border || '#27272a',
                color: currentThemeConfig.text || '#f4f4f5'
              }}
            />
          </div>

          {/* Validation Feedback */}
          {errorMsg && (
            <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span className="truncate">{errorMsg}</span>
            </div>
          )}

          {parsedEnv && (
            <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check size={14} className="flex-shrink-0" />
                <span>Hợp lệ: Đã phát hiện <strong>{parsedEnv.length}</strong> biến môi trường</span>
              </div>
              <span className="text-[10px] text-emerald-300">Sẵn sàng nhập</span>
            </div>
          )}

          {/* Mode Selection: 2 options */}
          <div>
            <label className="text-xs block mb-1.5 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
              2. Chế Độ Nhập (Import Mode):
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <div
                onClick={() => setImportMode('merge')}
                className="p-3 rounded-xl border cursor-pointer transition-all"
                style={{
                  backgroundColor: importMode === 'merge' ? `${accentColor}18` : currentThemeConfig.innerInput || '#0d0d10',
                  borderColor: importMode === 'merge' ? accentColor : currentThemeConfig.border || '#27272a'
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${importMode === 'merge' ? 'border-emerald-400' : 'border-zinc-500'}`}>
                    {importMode === 'merge' && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />}
                  </div>
                  <span className="font-bold text-xs" style={{ color: importMode === 'merge' ? accentColor : currentThemeConfig.text }}>
                    Gộp Thêm (Merge Override)
                  </span>
                </div>
                <p className="text-[10.5px] leading-tight" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
                  Giữ lại các biến hiện có. Cập nhật các biến trùng key từ JSON và bổ sung các biến mới.
                </p>
              </div>

              <div
                onClick={() => setImportMode('overwrite')}
                className="p-3 rounded-xl border cursor-pointer transition-all"
                style={{
                  backgroundColor: importMode === 'overwrite' ? `${accentColor}18` : currentThemeConfig.innerInput || '#0d0d10',
                  borderColor: importMode === 'overwrite' ? accentColor : currentThemeConfig.border || '#27272a'
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${importMode === 'overwrite' ? 'border-emerald-400' : 'border-zinc-500'}`}>
                    {importMode === 'overwrite' && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />}
                  </div>
                  <span className="font-bold text-xs" style={{ color: importMode === 'overwrite' ? accentColor : currentThemeConfig.text }}>
                    Ghi Đè Toàn Bộ (Override All)
                  </span>
                </div>
                <p className="text-[10.5px] leading-tight" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
                  Xóa sạch toàn bộ biến hiện có. Thay thế hoàn toàn bằng danh sách biến từ JSON.
                </p>
              </div>
            </div>
          </div>

          {/* Preview of variables */}
          {parsedEnv && parsedEnv.length > 0 && (
            <div>
              <span className="text-[11px] font-mono block mb-1" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
                Xem trước các biến sẽ nhập ({parsedEnv.length} biến):
              </span>
              <div 
                className="max-h-24 overflow-y-auto p-2.5 rounded-xl border flex flex-wrap gap-1.5"
                style={{
                  backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                  borderColor: currentThemeConfig.border || '#27272a'
                }}
              >
                {parsedEnv.slice(0, 30).map((p, idx) => (
                  <span 
                    key={idx}
                    className="text-[10px] font-mono px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: `${accentColor}10`,
                      borderColor: `${accentColor}30`,
                      color: accentColor
                    }}
                  >
                    {p.key}={p.value.length > 15 ? p.value.slice(0, 15) + '...' : p.value}
                  </span>
                ))}
                {parsedEnv.length > 30 && (
                  <span className="text-[10px] font-mono px-2 py-0.5" style={{ color: currentThemeConfig.textMuted }}>
                    +{parsedEnv.length - 30} biến khác...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div 
          className="flex justify-end gap-2 border-t pt-3"
          style={{ borderColor: currentThemeConfig.border || '#27272a' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border text-xs font-semibold hover:text-white transition-all cursor-pointer"
            style={{
              backgroundColor: currentThemeConfig.card || '#18181b',
              borderColor: currentThemeConfig.border || '#27272a',
              color: currentThemeConfig.textMuted || '#a1a1aa'
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={!parsedEnv || parsedEnv.length === 0}
            onClick={handleApply}
            className="px-4 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
            style={{ backgroundColor: accentColor }}
          >
            <UploadCloud size={14} />
            <span>Áp Dụng &amp; Lưu Ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= EDIT PROFILE MODAL =================
function EditProfileModal({ isOpen, onClose, profile, onSave, currentThemeConfig = {}, accentColor = '#10b981' }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [setActive, setSetActive] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || profile.key || '');
      setDescription(profile.description || '');
      setSetActive(false);
    }
  }, [profile]);

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

  if (!isOpen || !profile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div 
        className="border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: currentThemeConfig.card || '#18181b',
          borderColor: currentThemeConfig.border || '#27272a'
        }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: currentThemeConfig.border }}>
          <h4 className="text-sm font-bold font-mono flex items-center gap-2" style={{ color: currentThemeConfig.text }}>
            <span>✏️ Chỉnh Sửa Profile:</span>
            <span style={{ color: accentColor }}>{profile.key}</span>
          </h4>
          <button onClick={onClose} className="p-1 rounded text-xs hover:text-white" style={{ color: currentThemeConfig.textMuted }}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block mb-1 font-bold" style={{ color: currentThemeConfig.text }}>Tên hiển thị:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 border rounded-xl px-3 font-mono focus:outline-none"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.text
              }}
            />
          </div>

          <div>
            <label className="block mb-1 font-bold" style={{ color: currentThemeConfig.text }}>Mô tả:</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-xl p-3 font-sans focus:outline-none resize-none"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.text
              }}
            />
          </div>

          <label className="flex items-center space-x-2 cursor-pointer pt-1 select-none">
            <input
              type="checkbox"
              checked={setActive}
              onChange={(e) => setSetActive(e.target.checked)}
              className="rounded"
            />
            <span style={{ color: currentThemeConfig.text }}>Đặt làm Profile kích hoạt (Active) cho toàn bộ hệ thống</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: currentThemeConfig.border }}>
          <button onClick={onClose} className="px-4 py-1.5 text-xs rounded-xl" style={{ backgroundColor: currentThemeConfig.innerInput, color: currentThemeConfig.textMuted }}>
            Hủy
          </button>
          <button
            onClick={() => onSave(profile.key, { name, description, setActive })}
            className="px-4 py-1.5 text-xs font-bold text-white rounded-xl active:scale-95 shadow-md"
            style={{ backgroundColor: accentColor }}
          >
            Lưu Thay Đổi
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= PROFILES MANAGER PANE =================
function ProfilesManagerPane({
  globalProfiles = {},
  activeGlobalProfile = 'default',
  services = [],
  onSetActiveProfile,
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteProfile,
  onSelectProfileToEdit,
  currentThemeConfig = {},
  accentColor = '#10b981'
}) {
  const profileEntries = Object.entries(globalProfiles);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in duration-150">
      {/* Top Header */}
      <div 
        className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 flex-shrink-0"
        style={{
          backgroundColor: currentThemeConfig.innerInput,
          borderColor: currentThemeConfig.border
        }}
      >
        <div className="flex items-center space-x-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border shadow-sm"
            style={{
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}35`,
              color: accentColor
            }}
          >
            🏷️
          </div>
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: currentThemeConfig.text }}>
              <span>Quản Lý Cấu Hình Profiles (Profiles Manager)</span>
              <span 
                className="text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold"
                style={{
                  backgroundColor: `${accentColor}20`,
                  borderColor: `${accentColor}40`,
                  color: accentColor
                }}
              >
                {profileEntries.length} profiles
              </span>
            </h3>
            <p className="text-xs" style={{ color: currentThemeConfig.textMuted }}>
              Đồng bộ Profile giữa Global Env và tất cả microservices. Khi khởi chạy, application sẽ nhận đúng profile được chọn.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center space-x-1.5 active:scale-95"
          style={{ backgroundColor: accentColor }}
        >
          <Plus size={15} />
          <span>Tạo Profile Mới</span>
        </button>
      </div>

      {/* Profiles Cards Grid */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scroll">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {profileEntries.map(([key, pData]) => {
            const isActive = key === activeGlobalProfile;
            const globalVarsCount = Object.keys(pData?.env || {}).length;

            return (
              <div
                key={key}
                className="p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden"
                style={{
                  backgroundColor: currentThemeConfig.innerInput,
                  borderColor: isActive ? accentColor : currentThemeConfig.border,
                  boxShadow: isActive ? `0 0 16px ${accentColor}25` : 'none'
                }}
              >
                {isActive && (
                  <div 
                    className="absolute top-0 right-0 px-3 py-0.5 text-[9.5px] font-mono font-bold uppercase rounded-bl-xl border-l border-b"
                    style={{
                      backgroundColor: `${accentColor}25`,
                      borderColor: accentColor,
                      color: accentColor
                    }}
                  >
                    ● Đang kích hoạt (Active)
                  </div>
                )}

                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-base">🏷️</span>
                    <h4 className="font-bold text-sm font-mono truncate" style={{ color: currentThemeConfig.text }}>
                      {pData.name || key}
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2 mb-2 font-mono text-xs">
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-semibold border"
                      style={{
                        backgroundColor: currentThemeConfig.card,
                        borderColor: currentThemeConfig.border,
                        color: accentColor
                      }}
                    >
                      key: {key}
                    </span>
                    {key === 'default' && (
                      <span className="text-[10px] text-slate-500 font-sans italic">(Hệ thống gốc)</span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: currentThemeConfig.textMuted }}>
                    {pData.description || 'Chưa có mô tả cho profile này.'}
                  </p>
                </div>

                {/* Stats */}
                <div 
                  className="grid grid-cols-2 gap-2 p-2.5 rounded-xl border font-mono text-[11px]"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  <div>
                    <span className="text-[10px] block" style={{ color: currentThemeConfig.textMuted }}>Biến Global Env:</span>
                    <strong style={{ color: accentColor }}>{globalVarsCount} biến</strong>
                  </div>
                  <div>
                    <span className="text-[10px] block" style={{ color: currentThemeConfig.textMuted }}>Áp dụng Service:</span>
                    <strong style={{ color: currentThemeConfig.text }}>{services.length} apps</strong>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-2" style={{ borderColor: currentThemeConfig.border }}>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => onOpenEditModal({ key, name: pData.name || key, description: pData.description || '' })}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border hover:text-white transition-all flex items-center space-x-1"
                      style={{
                        backgroundColor: currentThemeConfig.card,
                        borderColor: currentThemeConfig.border,
                        color: currentThemeConfig.textMuted
                      }}
                      title="Chỉnh sửa tên và mô tả"
                    >
                      <Edit3 size={12} />
                      <span>Sửa</span>
                    </button>

                    <button
                      onClick={() => onSelectProfileToEdit(key)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border hover:text-white transition-all flex items-center space-x-1"
                      style={{
                        backgroundColor: `${accentColor}15`,
                        borderColor: `${accentColor}30`,
                        color: accentColor
                      }}
                      title="Chuyển sang sửa biến môi trường của Profile này"
                    >
                      <span>Sửa Env</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {!isActive ? (
                      <button
                        onClick={() => onSetActiveProfile(key)}
                        className="px-3 py-1 text-xs font-bold rounded-lg border transition-all active:scale-95 text-white shadow-sm"
                        style={{ backgroundColor: accentColor, borderColor: accentColor }}
                        title="Kích hoạt profile này cho toàn bộ hệ thống"
                      >
                        Kích hoạt
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono font-semibold" style={{ color: accentColor }}>
                        ✔ Đang chạy
                      </span>
                    )}

                    {key !== 'default' && (
                      <button
                        onClick={() => onDeleteProfile(key)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all"
                        title="Xóa Profile này"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ================= MAIN ENV SETUP VIEW =================
export default function EnvSetupView({
  services = [],
  selectedServiceId,
  onSelectService,
  onSaveOverrides,
  onChangeProfile,
  onCreateProfile,
  onDeleteProfile,
  onRestartService,
  settings = {}
}) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';

  const [activeTab, setActiveTab] = useState(
    selectedServiceId && services.some(s => s.id === selectedServiceId)
      ? selectedServiceId
      : (services.length > 0 ? services[0].id : 'global')
  );
  const [editorMode, setEditorMode] = useState('table'); // 'table' | 'raw'
  const [searchQuery, setSearchQuery] = useState('');
  const [rawText, setRawText] = useState('');
  const [envPairs, setEnvPairs] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  // Global shared config state with profiles
  const [globalProfiles, setGlobalProfiles] = useState({ default: { env: {} } });
  const [activeGlobalProfile, setActiveGlobalProfile] = useState('default');
  const [globalEnvPairs, setGlobalEnvPairs] = useState([]);

  // Modals & Profile Management State
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);
  const [newProfileKey, setNewProfileKey] = useState('');
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDescription, setNewProfileDescription] = useState('');
  const [cloneFromProfile, setCloneFromProfile] = useState('default');
  const [newProfileSetActive, setNewProfileSetActive] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [showCopyFromModal, setShowCopyFromModal] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [showImportJsonModal, setShowImportJsonModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    if (!showNewProfileModal && !showCopyFromModal && !isBackupModalOpen && !showImportJsonModal && !editingProfile) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (editingProfile) setEditingProfile(null);
        else if (showImportJsonModal) setShowImportJsonModal(false);
        else if (isBackupModalOpen) setIsBackupModalOpen(false);
        else if (showCopyFromModal) setShowCopyFromModal(false);
        else if (showNewProfileModal) setShowNewProfileModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNewProfileModal, showCopyFromModal, isBackupModalOpen, showImportJsonModal, editingProfile]);

  // Fetch global env from server on mount
  useEffect(() => {
    fetch(`${BASE_URL}/api/global-env`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.globalProfiles) setGlobalProfiles(data.globalProfiles);
          if (data.activeGlobalProfile) setActiveGlobalProfile(data.activeGlobalProfile);
          const env = data.globalEnv || {};
          const pairs = Object.entries(env).map(([key, value]) => ({
            key,
            value: String(value)
          }));
          setGlobalEnvPairs(pairs);
        }
      })
      .catch(e => console.error('Failed to fetch global env:', e));
  }, []);

  const handleChangeGlobalProfile = async (profileKey) => {
    try {
      const res = await fetch(`${BASE_URL}/api/global-env/active-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: profileKey })
      });
      const data = await res.json();
      if (data.success) {
        setActiveGlobalProfile(data.activeGlobalProfile);
        if (data.globalProfiles) setGlobalProfiles(data.globalProfiles);
        const pairs = Object.entries(data.globalEnv || {}).map(([key, value]) => ({ key, value: String(value) }));
        setGlobalEnvPairs(pairs);
        setEnvPairs(pairs);
        setRawText(pairs.map(p => `${p.key}=${p.value}`).join('\n'));
      }
    } catch (e) {
      console.error('Failed to change global profile:', e);
    }
  };

  const currentService = services.find(s => s.id === activeTab);
  const centralProfileKeys = Object.keys(globalProfiles || {});
  const serviceProfileKeys = Object.keys(currentService?.profiles || {});
  const profileKeys = centralProfileKeys.length > 0 ? centralProfileKeys : (serviceProfileKeys.length > 0 ? serviceProfileKeys : ['default']);
  const activeProfileKey = currentService?.activeProfile || (profileKeys.includes('default') ? 'default' : profileKeys[0]);

  const getStorageKey = (tab, profile) => `service_tool_saved_env_${tab}_${profile}`;

  const persistDraft = (pairs) => {
    const obj = {};
    for (const p of pairs) obj[p.key] = p.value;
    const key = getStorageKey(activeTab, activeTab === 'global' ? activeGlobalProfile : activeProfileKey);
    try {
      localStorage.setItem(key, JSON.stringify(obj));
    } catch (_) {}
  };

  // Load Env when tab or profile changes
  useEffect(() => {
    if (activeTab === 'global') {
      const cached = localStorage.getItem(getStorageKey('global', activeGlobalProfile));
      if (cached && (!globalEnvPairs || globalEnvPairs.length === 0)) {
        try {
          const parsed = JSON.parse(cached);
          const pairs = Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) }));
          setEnvPairs(pairs);
          setRawText(pairs.map(p => `${p.key}=${p.value}`).join('\n'));
          return;
        } catch (_) {}
      }
      setEnvPairs(globalEnvPairs);
      setRawText(globalEnvPairs.map(p => `${p.key}=${p.value}`).join('\n'));
      return;
    }

    if (currentService) {
      const profileData = currentService.profiles?.[activeProfileKey] || {};
      let env = profileData.env;
      if (!env || Object.keys(env).length === 0) {
        if (activeProfileKey === currentService.activeProfile && currentService.computedEnv && Object.keys(currentService.computedEnv).length > 0) {
          env = currentService.computedEnv;
        } else {
          const cached = localStorage.getItem(getStorageKey(currentService.id, activeProfileKey));
          if (cached) {
            try {
              env = JSON.parse(cached);
            } catch (_) {}
          }
        }
      }
      env = env || {};
      const pairs = Object.entries(env).map(([key, value]) => ({
        key,
        value: String(value)
      }));
      setEnvPairs(pairs);
      setRawText(pairs.map(p => `${p.key}=${p.value}`).join('\n'));
    }
  }, [activeTab, currentService, activeProfileKey, globalEnvPairs, activeGlobalProfile]);

  // Parse Raw Text to Pairs
  const handleRawTextChange = (text) => {
    setRawText(text);
    const lines = text.split('\n');
    const parsed = [];
    for (const line of lines) {
      const clean = line.trim().replace(/^export\s+/, '');
      if (!clean || clean.startsWith('#')) continue;
      const eqIdx = clean.indexOf('=');
      if (eqIdx !== -1) {
        const k = clean.slice(0, eqIdx).trim();
        const v = clean.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (k) parsed.push({ key: k, value: v });
      }
    }
    setEnvPairs(parsed);
    persistDraft(parsed);
    if (activeTab === 'global') {
      setGlobalEnvPairs(parsed);
    }
  };

  const handleTableValueChange = (index, val) => {
    const updated = [...envPairs];
    updated[index].value = val;
    setEnvPairs(updated);
    setRawText(updated.map(p => `${p.key}=${p.value}`).join('\n'));
    persistDraft(updated);
    if (activeTab === 'global') {
      setGlobalEnvPairs(updated);
    }
  };

  const handleAddPair = () => {
    if (!newKey.trim()) return;
    const formattedKey = newKey.trim().toUpperCase().replace(/\s+/g, '_');
    const existingIdx = envPairs.findIndex(p => p.key === formattedKey);
    let updated;
    if (existingIdx >= 0) {
      updated = [...envPairs];
      updated[existingIdx].value = newValue;
    } else {
      updated = [{ key: formattedKey, value: newValue }, ...envPairs];
    }
    setEnvPairs(updated);
    setRawText(updated.map(p => `${p.key}=${p.value}`).join('\n'));
    persistDraft(updated);
    if (activeTab === 'global') {
      setGlobalEnvPairs(updated);
    }
    setNewKey('');
    setNewValue('');
  };

  const handleDeletePair = (index) => {
    const updated = envPairs.filter((_, i) => i !== index);
    setEnvPairs(updated);
    setRawText(updated.map(p => `${p.key}=${p.value}`).join('\n'));
    persistDraft(updated);
    if (activeTab === 'global') {
      setGlobalEnvPairs(updated);
    }
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1500);
  };

  const handleCopyAllEnv = () => {
    if (envPairs.length === 0) {
      setSaveStatus('⚠️ Không có biến nào để sao chép!');
      setTimeout(() => setSaveStatus(''), 2000);
      return;
    }
    const text = envPairs.map(p => `${p.key}=${p.value}`).join('\n');
    navigator.clipboard.writeText(text);
    setSaveStatus(`✔ Đã sao chép ${envPairs.length} biến .env vào Clipboard!`);
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleApplyCopiedEnv = (sourceEnv, mode = 'overwrite') => {
    const sourcePairs = Object.entries(sourceEnv).map(([key, value]) => ({
      key,
      value: String(value)
    }));

    let newPairs;
    if (mode === 'overwrite') {
      newPairs = sourcePairs;
    } else {
      const map = new Map(envPairs.map(p => [p.key, p.value]));
      for (const [k, v] of Object.entries(sourceEnv)) {
        map.set(k, String(v));
      }
      newPairs = Array.from(map.entries()).map(([key, value]) => ({ key, value }));
    }

    setEnvPairs(newPairs);
    setRawText(newPairs.map(p => `${p.key}=${p.value}`).join('\n'));
    persistDraft(newPairs);
    if (activeTab === 'global') {
      setGlobalEnvPairs(newPairs);
    }
    setShowCopyFromModal(false);
    setSaveStatus(`✔ Đã sao chép ${sourcePairs.length} biến thành công! (Bấm Lưu để ghi lại)`);
    setTimeout(() => setSaveStatus(''), 3500);
  };

  const handleApplyImport = async (importedPairs, mode) => {
    let finalPairs;
    if (mode === 'overwrite') {
      finalPairs = [...importedPairs];
    } else {
      const map = new Map();
      for (const p of envPairs) {
        map.set(p.key, p.value);
      }
      for (const p of importedPairs) {
        map.set(p.key, p.value);
      }
      finalPairs = Array.from(map.entries()).map(([key, value]) => ({ key, value }));
    }

    setEnvPairs(finalPairs);
    setRawText(finalPairs.map(p => `${p.key}=${p.value}`).join('\n'));
    if (activeTab === 'global') {
      setGlobalEnvPairs(finalPairs);
    }

    persistDraft(finalPairs);

    const overrides = {};
    for (const p of finalPairs) {
      overrides[p.key] = p.value;
    }

    if (activeTab === 'global') {
      try {
        const res = await fetch(`${BASE_URL}/api/global-env`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ globalVars: overrides, profileKey: activeGlobalProfile })
        });
        const data = await res.json();
        if (data.success && data.globalProfiles) setGlobalProfiles(data.globalProfiles);
      } catch (_) {}
    } else if (onSaveOverrides) {
      await onSaveOverrides(activeTab, overrides, activeProfileKey);
    }

    setShowImportJsonModal(false);
    const modeDesc = mode === 'overwrite' ? 'Ghi đè toàn bộ (Override All)' : 'Gộp thêm (Merge Override)';
    setSaveStatus(`✔ Đã import và lưu thành công ${importedPairs.length} biến từ JSON (${modeDesc})!`);
    setTimeout(() => setSaveStatus(''), 3500);
  };

  const handleSave = async (restart = false) => {
    const overrides = {};
    for (const p of envPairs) {
      overrides[p.key] = p.value;
    }

    persistDraft(envPairs);

    if (activeTab === 'global') {
      const res = await fetch(`${BASE_URL}/api/global-env`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalVars: overrides, profileKey: activeGlobalProfile })
      });
      const data = await res.json();
      if (data.success) {
        if (data.globalProfiles) setGlobalProfiles(data.globalProfiles);
        setGlobalEnvPairs(envPairs);
        setSaveStatus(`✔ Đã lưu cấu hình Global Profile "${activeGlobalProfile}" & Tự động áp dụng cho các microservices!`);
      }
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    if (onSaveOverrides) {
      await onSaveOverrides(activeTab, overrides, activeProfileKey);
    }
    if (restart && currentService?.statusInfo?.status === 'RUNNING' && onRestartService) {
      await onRestartService(activeTab);
      setSaveStatus('✔ Đã lưu cấu hình & Đang Restart service!');
    } else {
      setSaveStatus('✔ Đã lưu cấu hình thành công!');
    }
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleCreateNewProfile = async () => {
    if (!newProfileKey.trim()) return;
    const key = newProfileKey.trim().toLowerCase().replace(/\s+/g, '-');
    const overrides = {};
    for (const p of envPairs) {
      overrides[p.key] = p.value;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileKey: key,
          name: newProfileName || key,
          description: newProfileDescription || `Profile ${key}`,
          cloneFrom: cloneFromProfile,
          setActive: newProfileSetActive,
          env: overrides
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.activeGlobalProfile) setActiveGlobalProfile(data.activeGlobalProfile);
        if (data.globalProfiles) setGlobalProfiles(data.globalProfiles);
        const pairs = Object.entries(data.globalEnv || {}).map(([k, v]) => ({ key: k, value: String(v) }));
        setGlobalEnvPairs(pairs);
        if (activeTab === 'global') {
          setEnvPairs(pairs);
          setRawText(pairs.map(p => `${p.key}=${p.value}`).join('\n'));
        }
        setSaveStatus(`✔ Đã tạo profile "${key}" cho toàn bộ hệ thống!`);
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setConfirmDialog({
          isOpen: true,
          title: 'Lỗi tạo profile',
          message: data?.error || 'Không thể tạo profile.',
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

    setShowNewProfileModal(false);
    setNewProfileKey('');
    setNewProfileName('');
    setNewProfileDescription('');
    setCloneFromProfile('default');
    setNewProfileSetActive(false);
  };

  const handleUpdateProfile = async (key, updateData) => {
    try {
      const res = await fetch(`${BASE_URL}/api/profiles/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      const data = await res.json();
      if (data.success) {
        if (data.globalProfiles) setGlobalProfiles(data.globalProfiles);
        if (data.activeGlobalProfile) setActiveGlobalProfile(data.activeGlobalProfile);
        setEditingProfile(null);
        setSaveStatus(`✔ Cập nhật profile "${key}" thành công!`);
        setTimeout(() => setSaveStatus(''), 2500);
      } else {
        setConfirmDialog({
          isOpen: true,
          title: 'Lỗi cập nhật profile',
          message: data?.error || 'Không thể cập nhật profile.',
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
  };

  const handleSetActiveProfileGlobal = async (key) => {
    try {
      const res = await fetch(`${BASE_URL}/api/profiles/active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileKey: key, applyToAllServices: true })
      });
      const data = await res.json();
      if (data.success) {
        if (data.activeGlobalProfile) setActiveGlobalProfile(data.activeGlobalProfile);
        if (data.globalProfiles) setGlobalProfiles(data.globalProfiles);
        const pairs = Object.entries(data.globalEnv || {}).map(([k, v]) => ({ key: k, value: String(v) }));
        setGlobalEnvPairs(pairs);
        setSaveStatus(`✔ Đã kích hoạt profile "${key}" cho toàn bộ microservices!`);
        setTimeout(() => setSaveStatus(''), 2500);
      }
    } catch (e) {
      setConfirmDialog({
        isOpen: true,
        title: 'Lỗi kích hoạt profile',
        message: e?.message || String(e),
        isAlert: true,
        danger: true,
        type: 'danger',
        confirmText: 'Đã hiểu',
        onConfirm: () => setConfirmDialog(null)
      });
    }
  };

  const handleDeleteProfileClick = (profileKey) => {
    if (profileKey === 'default') {
      setConfirmDialog({
        isOpen: true,
        title: 'Không thể xóa',
        message: 'Profile "default" là profile mặc định của hệ thống và không thể xóa.',
        isAlert: true,
        danger: false,
        type: 'warning',
        confirmText: 'Đã hiểu',
        onConfirm: () => setConfirmDialog(null)
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Xác nhận xóa Profile',
      message: `Bạn có chắc chắn muốn xóa profile "${profileKey}" cho toàn bộ hệ thống không?\nCác biến môi trường thuộc profile này sẽ bị loại bỏ. Thao tác không thể hoàn tác.`,
      itemName: profileKey,
      confirmText: 'Xóa Profile',
      cancelText: 'Hủy',
      danger: true,
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`${BASE_URL}/api/profiles/${encodeURIComponent(profileKey)}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            if (data.activeGlobalProfile) setActiveGlobalProfile(data.activeGlobalProfile);
            if (data.globalProfiles) setGlobalProfiles(data.globalProfiles);
            const pairs = Object.entries(data.globalEnv || {}).map(([k, v]) => ({ key: k, value: String(v) }));
            setGlobalEnvPairs(pairs);
            if (activeTab === 'global') {
              setEnvPairs(pairs);
              setRawText(pairs.map(p => `${p.key}=${p.value}`).join('\n'));
            }
            setSaveStatus(`✔ Đã xóa profile "${profileKey}" thành công!`);
            setTimeout(() => setSaveStatus(''), 2500);
          } else {
            setConfirmDialog({
              isOpen: true,
              title: 'Lỗi xóa profile',
              message: data?.error || 'Thất bại khi xóa profile.',
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
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const filteredPairs = useMemo(() => {
    if (!searchQuery.trim()) return envPairs;
    const q = searchQuery.toLowerCase();
    return envPairs.filter(p => p.key.toLowerCase().includes(q) || p.value.toLowerCase().includes(q));
  }, [envPairs, searchQuery]);

  return (
    <div 
      className="flex-1 flex gap-5 p-6 overflow-hidden custom-scroll"
      style={{ backgroundColor: currentThemeConfig.bg, color: currentThemeConfig.text }}
    >
      {/* 1. LEFT SIDEBAR: SERVICES TABS */}
      <div 
        className="w-80 flex-shrink-0 border rounded-2xl p-4 flex flex-col space-y-2 h-[calc(100vh-120px)] overflow-y-auto custom-scroll shadow-xl"
        style={{
          backgroundColor: currentThemeConfig.card,
          borderColor: currentThemeConfig.border
        }}
      >
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: currentThemeConfig.textMuted }}>Mục Cấu Hình</span>
          <span 
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
            style={{
              backgroundColor: currentThemeConfig.innerInput,
              borderColor: currentThemeConfig.border,
              color: accentColor
            }}
          >
            {services.length + 1}
          </span>
        </div>
        
        {/* Global Shared Config Card */}
        <div
          onClick={() => setActiveTab('global')}
          className="p-3.5 rounded-xl border cursor-pointer transition-all flex items-center space-x-3 shadow-md"
          style={{
            backgroundColor: activeTab === 'global' ? `${accentColor}18` : currentThemeConfig.innerInput,
            borderColor: activeTab === 'global' ? accentColor : currentThemeConfig.border,
            boxShadow: activeTab === 'global' ? `0 0 15px ${accentColor}25` : 'none'
          }}
        >
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 border"
            style={{
              backgroundColor: `${accentColor}15`,
              borderColor: `${accentColor}30`,
              color: accentColor
            }}
          >
            🌍
          </div>
          <div className="overflow-hidden">
            <span className="font-bold text-xs block truncate" style={{ color: activeTab === 'global' ? accentColor : currentThemeConfig.text }}>
              Global Shared Config
            </span>
            <span className="text-[10px] font-mono block truncate" style={{ color: currentThemeConfig.textMuted }}>
              Profile: <strong>{activeGlobalProfile}</strong> ({globalEnvPairs.length} biến)
            </span>
          </div>
        </div>

        {/* Profiles Manager Card */}
        <div 
          onClick={() => setActiveTab('profiles')}
          className="p-3.5 rounded-xl border cursor-pointer transition-all flex items-center space-x-3 shadow-md mt-2"
          style={{
            backgroundColor: activeTab === 'profiles' ? `${accentColor}18` : currentThemeConfig.innerInput,
            borderColor: activeTab === 'profiles' ? accentColor : currentThemeConfig.border,
            boxShadow: activeTab === 'profiles' ? `0 0 15px ${accentColor}25` : 'none'
          }}
        >
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 border"
            style={{
              backgroundColor: `${accentColor}15`,
              borderColor: `${accentColor}30`,
              color: accentColor
            }}
          >
            🏷️
          </div>
          <div className="overflow-hidden">
            <span className="font-bold text-xs block truncate" style={{ color: activeTab === 'profiles' ? accentColor : currentThemeConfig.text }}>
              Quản Lý Profiles
            </span>
            <span className="text-[10px] font-mono block truncate" style={{ color: currentThemeConfig.textMuted }}>
              Active: <strong style={{ color: accentColor }}>{activeGlobalProfile}</strong> ({Object.keys(globalProfiles || {}).length} profiles)
            </span>
          </div>
        </div>

        <div className="h-px my-2" style={{ backgroundColor: currentThemeConfig.border }}></div>

        {/* Services List */}
        {services.length === 0 ? (
          <div 
            className="p-4 text-center text-xs font-mono border border-dashed rounded-xl space-y-2"
            style={{
              borderColor: currentThemeConfig.border,
              color: currentThemeConfig.textMuted
            }}
          >
            <span>Chưa có Service nào</span>
          </div>
        ) : (
          services.map((svc) => {
            const isSelected = activeTab === svc.id;
            const svcProfilesCount = Object.keys(svc.profiles || {}).length;

            return (
              <div
                key={svc.id}
                onClick={() => {
                  setActiveTab(svc.id);
                  if (onSelectService) onSelectService(svc.id);
                }}
                className="p-3 rounded-xl border cursor-pointer transition-all"
                style={{
                  backgroundColor: isSelected ? `${accentColor}15` : currentThemeConfig.innerInput,
                  borderColor: isSelected ? accentColor : currentThemeConfig.border,
                  boxShadow: isSelected ? `0 0 12px ${accentColor}20` : 'none'
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold truncate" style={{ color: isSelected ? accentColor : currentThemeConfig.text }}>
                    {svc.name}
                  </span>
                  <span 
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
                    style={{
                      backgroundColor: currentThemeConfig.card,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.textMuted
                    }}
                  >
                    {svc.group || 'SERVICE'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: currentThemeConfig.textMuted }}>
                  <span style={{ color: accentColor }}>:{svc.port}</span>
                  <span>{svcProfilesCount} profiles ({svc.activeProfile || 'default'})</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. RIGHT EDITOR PANE */}
      <div 
        className="flex-1 flex flex-col border rounded-2xl overflow-hidden h-[calc(100vh-120px)] shadow-xl"
        style={{
          backgroundColor: currentThemeConfig.card,
          borderColor: currentThemeConfig.border
        }}
      >
        {activeTab === 'profiles' ? (
          <ProfilesManagerPane
            globalProfiles={globalProfiles}
            activeGlobalProfile={activeGlobalProfile}
            services={services}
            onSetActiveProfile={handleSetActiveProfileGlobal}
            onOpenCreateModal={() => setShowNewProfileModal(true)}
            onOpenEditModal={(p) => setEditingProfile(p)}
            onDeleteProfile={handleDeleteProfileClick}
            onSelectProfileToEdit={(key) => {
              handleChangeGlobalProfile(key);
              setActiveTab('global');
            }}
            currentThemeConfig={currentThemeConfig}
            accentColor={accentColor}
          />
        ) : (
          <>
            {/* Top Toolbar */}
            <div 
              className="px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3"
          style={{
            backgroundColor: currentThemeConfig.innerInput,
            borderColor: currentThemeConfig.border
          }}
        >
          {activeTab === 'global' ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <Globe size={18} style={{ color: accentColor }} />
                <h3 className="font-bold text-sm" style={{ color: currentThemeConfig.text }}>Global Shared Config</h3>
              </div>

              {/* Profile Dropdown Selector for Global */}
              <div 
                className="flex items-center space-x-2 border rounded-xl px-3 py-1.5 shadow-inner"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: currentThemeConfig.textMuted }}>Profile:</span>
                <select
                  value={activeGlobalProfile}
                  onChange={(e) => handleChangeGlobalProfile(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold focus:outline-none cursor-pointer"
                  style={{ color: accentColor }}
                >
                  {Object.keys(globalProfiles || { default: {} }).map(k => (
                    <option key={k} value={k} style={{ backgroundColor: currentThemeConfig.card, color: currentThemeConfig.text }}>
                      {k} {k === 'default' ? '(Mặc định)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowNewProfileModal(true)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center space-x-1 hover:text-white"
                style={{
                  backgroundColor: `${accentColor}18`,
                  borderColor: `${accentColor}35`,
                  color: accentColor
                }}
              >
                <Plus size={13} />
                <span>Thêm Profile</span>
              </button>

              {activeGlobalProfile !== 'default' && (
                <button
                  onClick={() => handleDeleteProfileClick(activeGlobalProfile)}
                  className="px-2.5 py-1.5 bg-rose-950/30 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-semibold rounded-xl border border-rose-800/40 transition-all flex items-center space-x-1"
                >
                  <Trash2 size={13} />
                  <span>Xóa Profile</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <h3 className="font-mono text-sm font-bold" style={{ color: currentThemeConfig.text }}>{currentService?.name}</h3>
                <span 
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: `${accentColor}15`,
                    borderColor: `${accentColor}30`,
                    color: accentColor
                  }}
                >
                  :{currentService?.port}
                </span>
              </div>

              {/* Profile Dropdown Selector */}
              <div 
                className="flex items-center space-x-2 border rounded-xl px-3 py-1.5 shadow-inner"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: currentThemeConfig.textMuted }}>Profile:</span>
                <select
                  value={activeProfileKey}
                  onChange={(e) => onChangeProfile && onChangeProfile(activeTab, e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold focus:outline-none cursor-pointer"
                  style={{ color: accentColor }}
                >
                  {profileKeys.map(k => (
                    <option key={k} value={k} style={{ backgroundColor: currentThemeConfig.card, color: currentThemeConfig.text }}>
                      {k} {k === 'default' ? '(Mặc định)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setActiveTab('profiles')}
                title="Quản lý danh sách Profiles tập trung"
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl border transition-all flex items-center space-x-1.5 hover:opacity-100 opacity-80"
                style={{
                  backgroundColor: `${accentColor}10`,
                  borderColor: `${accentColor}30`,
                  color: accentColor
                }}
              >
                <Sliders size={13} />
                <span>Quản Lý Profiles</span>
              </button>
            </div>
          )}

          {/* Actions Right */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher: Table vs Raw */}
            <div 
              className="flex items-center p-1 rounded-xl border flex-shrink-0"
              style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}
            >
              <button
                onClick={() => setEditorMode('table')}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                style={{
                  backgroundColor: editorMode === 'table' ? `${accentColor}25` : 'transparent',
                  color: editorMode === 'table' ? accentColor : currentThemeConfig.textMuted
                }}
              >
                <Table size={12} />
                <span>Bảng</span>
              </button>
              <button
                onClick={() => setEditorMode('raw')}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                style={{
                  backgroundColor: editorMode === 'raw' ? `${accentColor}25` : 'transparent',
                  color: editorMode === 'raw' ? accentColor : currentThemeConfig.textMuted
                }}
              >
                <FileCode2 size={12} />
                <span>Raw .env</span>
              </button>
            </div>

            <button
              onClick={handleCopyAllEnv}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 shadow-sm hover:text-white"
              style={{
                backgroundColor: currentThemeConfig.card,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.textMuted
              }}
              title="Sao chép toàn bộ biến .env vào Clipboard"
            >
              <Copy size={13} />
              <span>Copy .env</span>
            </button>

            <button
              onClick={() => setShowCopyFromModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 shadow-sm hover:text-white cursor-pointer"
              style={{
                backgroundColor: currentThemeConfig.card,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.textMuted
              }}
            >
              <Copy size={13} />
              <span>Sao Chép Từ...</span>
            </button>

            <button
              onClick={() => setShowImportJsonModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 shadow-sm hover:text-white cursor-pointer"
              style={{
                backgroundColor: currentThemeConfig.card,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.textMuted
              }}
              title="Nhập biến môi trường từ tệp hoặc chuỗi JSON (Hỗ trợ Merge hoặc Override toàn bộ)"
            >
              <UploadCloud size={13} style={{ color: accentColor }} />
              <span>Import JSON</span>
            </button>

            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 shadow-sm hover:text-white"
              style={{
                backgroundColor: currentThemeConfig.card,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.textMuted
              }}
            >
              <FolderSync size={13} />
              <span>Backup/Restore</span>
            </button>

            <button
              onClick={() => handleSave(false)}
              className="px-4 py-1.5 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center space-x-1.5 active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              <Save size={13} />
              <span>{activeTab === 'global' ? 'Lưu Cấu Hình Global' : 'Lưu Cấu Hình'}</span>
            </button>

            {activeTab !== 'global' && currentService?.statusInfo?.status === 'RUNNING' && (
              <button
                onClick={() => handleSave(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center space-x-1 active:scale-95"
                title="Lưu cấu hình và tự động restart microservice này"
              >
                <RotateCw size={13} />
                <span>Lưu &amp; Restart</span>
              </button>
            )}
          </div>
        </div>

        {/* Save Status Notification */}
        {saveStatus && (
          <div 
            className="px-5 py-2 border-b text-xs font-mono flex items-center justify-between animate-in fade-in"
            style={{
              backgroundColor: `${accentColor}15`,
              borderColor: `${accentColor}30`,
              color: accentColor
            }}
          >
            <span>{saveStatus}</span>
            <button onClick={() => setSaveStatus('')} className="hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* Main Editor Body */}
        <div 
          className="flex-1 overflow-y-auto p-5 custom-scroll"
          style={{ backgroundColor: currentThemeConfig.innerInput }}
        >
          {editorMode === 'table' ? (
            <div className="max-w-5xl mx-auto space-y-5">
              {/* Quick Add Bar */}
              <div 
                className="border p-3.5 rounded-2xl shadow-lg flex flex-wrap items-center gap-3"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <span className="text-xs font-bold font-mono whitespace-nowrap" style={{ color: accentColor }}>➕ Thêm Biến:</span>
                <input
                  type="text"
                  placeholder="TÊN_BIẾN (vd: PORT, DB_NAME, JWT_SECRET)"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPair()}
                  className="border rounded-xl px-3.5 py-2 text-xs font-mono font-bold uppercase focus:outline-none flex-1 min-w-[200px]"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                />
                <input
                  type="text"
                  placeholder="Giá trị biến..."
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPair()}
                  className="border rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none flex-1 min-w-[200px]"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                />
                <button
                  onClick={handleAddPair}
                  className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-md whitespace-nowrap active:scale-95"
                  style={{ backgroundColor: accentColor }}
                >
                  Thêm
                </button>
              </div>

              {/* Search and Counts */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative w-80">
                  <input
                    type="text"
                    placeholder="Tìm kiếm biến theo tên hoặc giá trị..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border rounded-xl pl-9 pr-4 py-2 text-xs font-mono focus:outline-none shadow-inner"
                    style={{
                      backgroundColor: currentThemeConfig.card,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  />
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2 text-slate-500 hover:text-white text-xs">✕</button>
                  )}
                </div>
                <span className="text-xs font-mono" style={{ color: currentThemeConfig.textMuted }}>
                  Hiển thị <span className="font-bold" style={{ color: accentColor }}>{filteredPairs.length}</span>/{envPairs.length} biến
                </span>
              </div>

              {/* Table */}
              {filteredPairs.length === 0 ? (
                <div 
                  className="border rounded-2xl p-10 text-center space-y-3"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  <Sliders size={28} className="mx-auto" style={{ color: currentThemeConfig.textMuted }} />
                  <h4 className="text-sm font-bold" style={{ color: currentThemeConfig.text }}>Chưa có biến môi trường nào</h4>
                  <p className="text-xs max-w-sm mx-auto" style={{ color: currentThemeConfig.textMuted }}>
                    Hãy nhập tên biến và giá trị vào ô trên rồi nhấn "Thêm", hoặc chuyển sang tab "Raw .env" để dán nội dung file .env có sẵn.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-3 text-[11px] font-bold uppercase tracking-wider px-3 font-mono" style={{ color: currentThemeConfig.textMuted }}>
                    <div className="col-span-4">Tên Biến (Key)</div>
                    <div className="col-span-7">Giá Trị (Value)</div>
                    <div className="col-span-1 text-center">Xóa</div>
                  </div>

                  {filteredPairs.map((pair, index) => {
                    const actualIdx = envPairs.findIndex(p => p.key === pair.key);
                    const isCopied = copiedKey === pair.key;

                    return (
                      <div
                        key={pair.key + index}
                        className="grid grid-cols-12 gap-3 items-center p-2.5 rounded-xl border transition-colors shadow-sm"
                        style={{
                          backgroundColor: currentThemeConfig.card,
                          borderColor: currentThemeConfig.border
                        }}
                      >
                        <div className="col-span-4 flex items-center justify-between px-2 overflow-hidden">
                          <span className="font-mono text-xs font-bold truncate" style={{ color: accentColor }} title={pair.key}>
                            {pair.key}
                          </span>
                          <button
                            onClick={() => handleCopyKey(pair.key)}
                            className="p-1 rounded transition-colors flex-shrink-0 hover:text-white"
                            style={{ color: currentThemeConfig.textMuted }}
                            title="Sao chép tên biến"
                          >
                            {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </div>
                        <div className="col-span-7">
                          <input
                            type="text"
                            value={pair.value}
                            onChange={(e) => handleTableValueChange(actualIdx, e.target.value)}
                            className="w-full border rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none shadow-inner"
                            style={{
                              backgroundColor: currentThemeConfig.innerInput,
                              borderColor: currentThemeConfig.border,
                              color: currentThemeConfig.text
                            }}
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          <button
                            onClick={() => handleDeletePair(actualIdx)}
                            className="p-1.5 hover:text-rose-400 rounded-lg transition-colors"
                            style={{ color: currentThemeConfig.textMuted }}
                            title="Xóa biến này"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* RAW .ENV EDITOR */
            <div className="max-w-5xl mx-auto h-full flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono" style={{ color: currentThemeConfig.textMuted }}>
                  Dán hoặc chỉnh sửa cú pháp .env (KEY=VALUE). Tự động phân tích thành bảng khi chuyển tab.
                </span>
                <span className="text-xs font-mono" style={{ color: accentColor }}>
                  {rawText.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length} biến hợp lệ
                </span>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => handleRawTextChange(e.target.value)}
                placeholder="PORT=3000&#10;NODE_ENV=development&#10;DATABASE_URL=postgres://..."
                className="w-full flex-1 min-h-[460px] border rounded-2xl p-4 text-xs font-mono focus:outline-none shadow-inner resize-none leading-relaxed"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border,
                  color: currentThemeConfig.text
                }}
              />
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* MODALS */}
      <CopyFromEnvModal
        isOpen={showCopyFromModal}
        onClose={() => setShowCopyFromModal(false)}
        services={services}
        activeTab={activeTab}
        currentProfileKey={activeProfileKey}
        globalEnvPairs={globalEnvPairs}
        onApply={handleApplyCopiedEnv}
        currentThemeConfig={currentThemeConfig}
        accentColor={accentColor}
      />

      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onReloadAll={() => {
          if (activeTab === 'global') {
            fetch(`${BASE_URL}/api/global-env`)
              .then(r => r.json())
              .then(d => {
                if (d.success) setGlobalEnvPairs(Object.entries(d.globalEnv || {}).map(([k, v]) => ({ key: k, value: String(v) })));
              });
          }
        }}
        currentThemeConfig={currentThemeConfig}
        accentColor={accentColor}
      />

      {/* IMPORT JSON ENV MODAL */}
      <ImportJsonEnvModal
        isOpen={showImportJsonModal}
        onClose={() => setShowImportJsonModal(false)}
        targetTitle={activeTab === 'global' ? `🌍 Global Config (${activeGlobalProfile})` : `${currentService?.name || activeTab} (${activeProfileKey})`}
        onApplyImport={handleApplyImport}
        currentThemeConfig={currentThemeConfig}
        accentColor={accentColor}
      />

      {/* EDIT PROFILE MODAL */}
      <EditProfileModal
        isOpen={!!editingProfile}
        onClose={() => setEditingProfile(null)}
        profile={editingProfile}
        onSave={handleUpdateProfile}
        currentThemeConfig={currentThemeConfig}
        accentColor={accentColor}
      />

      {/* CREATE NEW PROFILE MODAL */}
      {showNewProfileModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setShowNewProfileModal(false)}
        >
          <div 
            className="border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: currentThemeConfig.card,
              borderColor: currentThemeConfig.border
            }}
          >
            <div 
              className="flex items-center justify-between border-b pb-3"
              style={{ borderColor: currentThemeConfig.border }}
            >
              <h4 className="text-sm font-bold font-mono flex items-center gap-2" style={{ color: currentThemeConfig.text }}>
                <span>➕ Tạo Profile Cấu Hình Mới</span>
              </h4>
              <button onClick={() => setShowNewProfileModal(false)} className="p-1 rounded text-xs hover:text-white" style={{ color: currentThemeConfig.textMuted }}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text }}>Mã Profile (Key) *</label>
                <input
                  type="text"
                  placeholder="vd: staging, local-docker, uat"
                  value={newProfileKey}
                  onChange={(e) => setNewProfileKey(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: accentColor
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text }}>Tên hiển thị (Display Name)</label>
                <input
                  type="text"
                  placeholder="vd: Staging Environment"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                />
              </div>

              <div>
                <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text }}>Mô tả ngắn:</label>
                <input
                  type="text"
                  placeholder="vd: Môi trường thử nghiệm Staging"
                  value={newProfileDescription}
                  onChange={(e) => setNewProfileDescription(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                />
              </div>

              <div>
                <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text }}>Sao chép biến môi trường từ Profile:</label>
                <select
                  value={cloneFromProfile}
                  onChange={(e) => setCloneFromProfile(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                >
                  <option value="">-- Để trống (Không sao chép) --</option>
                  {Object.keys(globalProfiles || { default: {} }).map((k) => (
                    <option key={k} value={k}>
                      {k} ({globalProfiles[k]?.name || k})
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center space-x-2 cursor-pointer pt-1 select-none">
                <input
                  type="checkbox"
                  checked={newProfileSetActive}
                  onChange={(e) => setNewProfileSetActive(e.target.checked)}
                  className="rounded"
                />
                <span className="text-xs" style={{ color: currentThemeConfig.text }}>Đặt làm Profile kích hoạt cho toàn bộ hệ thống ngay</span>
              </label>
            </div>

            <div 
              className="flex justify-end gap-2 pt-2 border-t"
              style={{ borderColor: currentThemeConfig.border }}
            >
              <button
                type="button"
                onClick={() => setShowNewProfileModal(false)}
                className="px-4 py-1.5 text-xs rounded-xl hover:text-white"
                style={{
                  backgroundColor: currentThemeConfig.innerInput,
                  color: currentThemeConfig.textMuted
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!newProfileKey.trim()}
                onClick={handleCreateNewProfile}
                className="px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50 rounded-xl shadow-md active:scale-95"
                style={{ backgroundColor: accentColor }}
              >
                Tạo Profile
              </button>
            </div>
          </div>
        </div>
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
