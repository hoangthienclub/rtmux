import React, { useState, useEffect } from 'react';
import { FolderSync, X, Download, RefreshCw, UploadCloud, CheckCircle2 } from 'lucide-react';

const BACKEND_URL = 'http://127.0.0.1:48899';

export default function BackupRestoreModal({ 
  isOpen, 
  onClose, 
  onReloadAll, 
  currentThemeConfig = {}, 
  accentColor = '#10b981' 
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('import');
  const [importFile, setImportFile] = useState(null);
  const [importData, setImportData] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [importMode, setImportMode] = useState('merge');
  const [currentStats, setCurrentStats] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

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
    fetch(`${BACKEND_URL}/api/export/all`)
      .then(r => r.json())
      .then(data => {
        fetch(`${BACKEND_URL}/api/config/inspect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data })
        })
          .then(r => r.json())
          .then(res => {
            if (res.success) setCurrentStats(res);
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, [isOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setErrorMsg('');
    setSuccessMsg('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const parsed = JSON.parse(text);
        setImportData(parsed);

        // Immediate client-side fallback inspect
        const fallbackInspect = {
          servicesCount: Array.isArray(parsed.services) ? parsed.services.length : 0,
          categoriesCount: Array.isArray(parsed.categories) ? parsed.categories.length : 0,
          globalProfilesCount: Object.keys(parsed.globalProfiles || parsed.envConfig?.globalProfiles || {}).length,
          totalEnvVars: parsed.envSummary?.totalEnvVars || 0
        };
        setInspection(fallbackInspect);

        // Server-side inspect verification
        try {
          const res = await fetch(`${BACKEND_URL}/api/config/inspect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: parsed })
          });
          const data = await res.json();
          if (data.success) {
            setInspection(data);
          }
        } catch (_) {
          // If server inspect fails or is offline, keep client-side inspection
        }
      } catch (err) {
        setErrorMsg('Lỗi đọc file JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importData) {
      setErrorMsg('Vui lòng chọn file backup JSON!');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: importData, mode: importMode })
      });

      const data = await res.json();
      if (data.success !== false) {
        setSuccessMsg(data.message || `✔ Khôi phục thành công (${importMode === 'overwrite' ? 'Ghi đè' : 'Gộp thêm'})!`);
        if (onReloadAll) {
          onReloadAll();
        }
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMsg(data.error || 'Khôi phục thất bại');
      }
    } catch (e) {
      setErrorMsg('Lỗi kết nối máy chủ: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/export/all`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `service-monitor-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setErrorMsg('Lỗi tải backup: ' + e.message);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="border rounded-2xl p-6 w-full max-w-xl space-y-4 shadow-2xl"
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
            <FolderSync size={16} style={{ color: accentColor }} />
            <span>Sao Lưu &amp; Khôi Phục Cấu Hình (Backup / Restore)</span>
          </h4>
          <button onClick={onClose} className="p-1 rounded text-xs hover:text-white" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div 
          className="flex space-x-2 border-b pb-2"
          style={{ borderColor: currentThemeConfig.border || '#27272a' }}
        >
          <button
            onClick={() => setActiveTab('import')}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all"
            style={{
              backgroundColor: activeTab === 'import' ? `${accentColor}25` : 'transparent',
              color: activeTab === 'import' ? accentColor : currentThemeConfig.textMuted || '#a1a1aa'
            }}
          >
            Nhập Cấu Hình (Import / Restore)
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all"
            style={{
              backgroundColor: activeTab === 'export' ? `${accentColor}25` : 'transparent',
              color: activeTab === 'export' ? accentColor : currentThemeConfig.textMuted || '#a1a1aa'
            }}
          >
            Xuất Cấu Hình (Export)
          </button>
        </div>

        {activeTab === 'export' ? (
          <div className="space-y-4">
            <div 
              className="p-3.5 rounded-xl border text-xs space-y-2"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                borderColor: currentThemeConfig.border || '#27272a',
                color: currentThemeConfig.text || '#f4f4f5'
              }}
            >
              <span className="font-bold block" style={{ color: currentThemeConfig.text }}>Thống kê dữ liệu hiện tại:</span>
              <ul className="list-disc pl-5 space-y-1" style={{ color: currentThemeConfig.textMuted }}>
                <li>Services: <strong style={{ color: accentColor }}>{currentStats?.servicesCount || 0}</strong></li>
                <li>Categories: <strong style={{ color: accentColor }}>{currentStats?.categoriesCount || 0}</strong></li>
                <li>Global Profiles: <strong style={{ color: accentColor }}>{currentStats?.globalProfilesCount || 0}</strong></li>
              </ul>
            </div>
            <button
              onClick={handleDownloadBackup}
              className="w-full py-2.5 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              <Download size={14} />
              <span>Tải File Backup JSON Về Máy</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div>
              <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Chọn file backup JSON:</label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold cursor-pointer"
                style={{ color: currentThemeConfig.textMuted }}
              />
            </div>

            {inspection && (
              <div 
                className="p-3.5 rounded-xl border text-xs space-y-1.5"
                style={{
                  backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                  borderColor: currentThemeConfig.border || '#27272a'
                }}
              >
                <span className="font-bold block" style={{ color: currentThemeConfig.text }}>Chi tiết file import hợp lệ:</span>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  <p style={{ color: currentThemeConfig.textMuted }}>Services: <strong style={{ color: accentColor }}>{inspection.servicesCount ?? 0}</strong></p>
                  <p style={{ color: currentThemeConfig.textMuted }}>Categories: <strong style={{ color: accentColor }}>{inspection.categoriesCount ?? 0}</strong></p>
                  {inspection.envSummary && (
                    <p style={{ color: currentThemeConfig.textMuted }}>Biến Env: <strong style={{ color: accentColor }}>{inspection.envSummary.totalEnvVars ?? 0}</strong></p>
                  )}
                  {inspection.version && (
                    <p style={{ color: currentThemeConfig.textMuted }}>Version: <strong style={{ color: accentColor }}>{inspection.version}</strong></p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Chế độ Import:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div
                  onClick={() => setImportMode('merge')}
                  className="p-2.5 rounded-xl border cursor-pointer transition-all"
                  style={{
                    backgroundColor: importMode === 'merge' ? `${accentColor}20` : currentThemeConfig.innerInput,
                    borderColor: importMode === 'merge' ? accentColor : currentThemeConfig.border,
                    color: importMode === 'merge' ? accentColor : currentThemeConfig.textMuted
                  }}
                >
                  <strong className="block">Gộp thêm (Merge)</strong>
                  <span className="text-[10px]">Giữ cấu hình hiện tại và bổ sung</span>
                </div>
                <div
                  onClick={() => setImportMode('overwrite')}
                  className="p-2.5 rounded-xl border cursor-pointer transition-all"
                  style={{
                    backgroundColor: importMode === 'overwrite' ? 'rgba(244, 63, 94, 0.2)' : currentThemeConfig.innerInput,
                    borderColor: importMode === 'overwrite' ? '#f43f5e' : currentThemeConfig.border,
                    color: importMode === 'overwrite' ? '#f43f5e' : currentThemeConfig.textMuted
                  }}
                >
                  <strong className="block">Ghi đè (Overwrite)</strong>
                  <span className="text-[10px]">Thay thế hoàn toàn cấu hình cũ</span>
                </div>
              </div>
            </div>

            {errorMsg && <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono">{errorMsg}</div>}
            {successMsg && <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-1.5"><CheckCircle2 size={13} /><span>{successMsg}</span></div>}

            <div 
              className="flex justify-end gap-2 pt-2 border-t"
              style={{ borderColor: currentThemeConfig.border || '#27272a' }}
            >
              <button 
                onClick={onClose} 
                className="px-4 py-1.5 text-xs rounded-xl hover:text-white"
                style={{
                  backgroundColor: currentThemeConfig.innerInput,
                  color: currentThemeConfig.textMuted
                }}
              >
                Hủy
              </button>
              <button
                disabled={!importData || loading}
                onClick={handleExecuteImport}
                className="px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50 rounded-xl flex items-center gap-1.5 active:scale-95 shadow-md"
                style={{ backgroundColor: accentColor }}
              >
                {loading ? <RefreshCw size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                <span>Khôi Phục Dữ Liệu</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
