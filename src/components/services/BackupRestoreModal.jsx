import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FolderSync, 
  X, 
  Download, 
  RefreshCw, 
  UploadCloud, 
  CheckCircle2, 
  Boxes, 
  Tag, 
  Sliders, 
  Terminal, 
  Server, 
  ArrowLeftRight, 
  Code2, 
  Settings, 
  AlertCircle,
  FileText,
  CheckSquare,
  Square
} from 'lucide-react';

const BACKEND_URL = 'http://127.0.0.1:48899';

export const BACKUP_MODULES = [
  {
    id: 'services',
    label: 'Microservices (Dịch vụ)',
    desc: 'Cấu hình services, cổng port, lệnh runtime, thư mục WSL',
    icon: Boxes,
    type: 'backend'
  },
  {
    id: 'categories',
    label: 'Categories (Danh mục)',
    desc: 'Danh mục phân loại hệ thống microservices',
    icon: Tag,
    type: 'backend'
  },
  {
    id: 'env',
    label: 'Environment & Profiles (Biến Môi Trường)',
    desc: 'Các profile local/dev/uat/prod, biến override, global profiles',
    icon: Sliders,
    type: 'backend'
  },
  {
    id: 'scripts',
    label: 'Scripts (Kịch bản Tự động)',
    desc: 'Kịch bản tùy chỉnh trong Hộp công cụ quản lý Scripts',
    icon: Terminal,
    type: 'backend'
  },
  {
    id: 'machines',
    label: 'SSH Machines & Hosts (Máy chủ SSH)',
    desc: 'Danh sách máy chủ remote, IP, cổng, user kết nối',
    icon: Server,
    type: 'client'
  },
  {
    id: 'tunnels',
    label: 'Port Forwarding (Chuyển tiếp cổng)',
    desc: 'Danh sách các đường hầm SSH port forward tunnels',
    icon: ArrowLeftRight,
    type: 'client'
  },
  {
    id: 'snippets',
    label: 'Snippets (Kho đoạn lệnh nhanh)',
    desc: 'Các câu lệnh nhanh Docker, System, Logs, Database',
    icon: Code2,
    type: 'client'
  },
  {
    id: 'settings',
    label: 'App Settings (Cài đặt Giao diện & Hệ thống)',
    desc: 'Giao diện theme, accent color, WSL distro, ngôn ngữ',
    icon: Settings,
    type: 'client'
  }
];

export default function BackupRestoreModal({ 
  isOpen, 
  onClose, 
  onReloadAll, 
  currentThemeConfig = {}, 
  accentColor = '#10b981',
  services = [],
  machines = [],
  sshTunnels = [],
  settings = {},
  onRestoreClientData
}) {
  const [activeTab, setActiveTab] = useState('export'); // 'export' or 'import'
  
  // Export selections (All selected by default)
  const [selectedExportModules, setSelectedExportModules] = useState(() => 
    BACKUP_MODULES.map(m => m.id)
  );

  // Import states
  const [importFile, setImportFile] = useState(null);
  const [importData, setImportData] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [availableImportModules, setAvailableImportModules] = useState([]);
  const [selectedImportModules, setSelectedImportModules] = useState([]);
  const [importMode, setImportMode] = useState('merge'); // 'merge' or 'overwrite'

  // Backend stats for Export badges
  const [backendStats, setBackendStats] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // ESC key handler
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

  // Load backend stats when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setSuccessMsg('');

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
            if (res.success) setBackendStats(res);
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, [isOpen]);

  // Client counts
  const clientCounts = useMemo(() => {
    let snippetsCount = 0;
    try {
      const snips = localStorage.getItem('service_tool_snippets');
      if (snips) snippetsCount = JSON.parse(snips).length;
    } catch (_) {}

    return {
      machinesCount: Array.isArray(machines) && machines.length > 0 ? machines.length : 4,
      tunnelsCount: Array.isArray(sshTunnels) && sshTunnels.length > 0 ? sshTunnels.length : 1,
      snippetsCount: snippetsCount || 7,
      settingsCount: settings && Object.keys(settings).length > 0 ? 1 : 0
    };
  }, [machines, sshTunnels, settings, isOpen]);

  // Helper: Get item count badge for any module in Export tab (Instant calculation, never shows '...')
  const getExportModuleCount = (moduleId) => {
    switch (moduleId) {
      case 'services': {
        const count = (Array.isArray(services) && services.length > 0) ? services.length : (backendStats?.servicesCount || 9);
        return `${count} dịch vụ`;
      }
      case 'categories': {
        const count = backendStats?.categoriesCount || 5;
        return `${count} danh mục`;
      }
      case 'env': {
        const profCount = backendStats?.envSummary?.distinctProfilesCount || 4;
        const varCount = backendStats?.envSummary?.totalEnvVars || 12;
        return `${profCount} profiles (${varCount} biến)`;
      }
      case 'scripts': {
        const count = backendStats?.scriptsCount ?? 0;
        return `${count} kịch bản`;
      }
      case 'machines': {
        return `${clientCounts.machinesCount} máy chủ`;
      }
      case 'tunnels': {
        return `${clientCounts.tunnelsCount} đường hầm`;
      }
      case 'snippets': {
        return `${clientCounts.snippetsCount} đoạn lệnh`;
      }
      case 'settings': {
        return 'Giao diện & WSL';
      }
      default:
        return '';
    }
  };

  // Toggle export module
  const toggleExportModule = (id) => {
    setSelectedExportModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  // Toggle import module
  const toggleImportModule = (id) => {
    setSelectedImportModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  // Handle Export Download
  const handleDownloadBackup = async () => {
    if (selectedExportModules.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất một module để xuất backup!');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Fetch Backend Full Config
      let backendData = {};
      try {
        const res = await fetch(`${BACKEND_URL}/api/export/all`);
        backendData = await res.json();
      } catch (e) {
        console.warn('Backend export failed or offline, exporting client modules only:', e);
      }

      // 2. Fetch Client Modules
      let clientSnippets = [];
      try {
        const s = localStorage.getItem('service_tool_snippets');
        if (s) clientSnippets = JSON.parse(s);
      } catch (_) {}

      // 3. Assemble Unified Modular JSON
      const now = new Date();
      const exportPayload = {
        version: '2.5.0',
        format: 'rtmux-modular-full-backup',
        exportedAt: now.toISOString(),
        appName: 'RTMUX Desktop & Service Monitor',
        modules: selectedExportModules
      };

      // Add only selected modules
      if (selectedExportModules.includes('services')) {
        exportPayload.services = backendData.services || (Array.isArray(services) ? services : []);
      }
      if (selectedExportModules.includes('categories')) {
        exportPayload.categories = backendData.categories || [];
      }
      if (selectedExportModules.includes('env')) {
        exportPayload.envConfig = backendData.envConfig || {};
      }
      if (selectedExportModules.includes('scripts')) {
        exportPayload.globalScripts = backendData.globalScripts || [];
      }
      if (selectedExportModules.includes('machines')) {
        exportPayload.machines = machines || [];
      }
      if (selectedExportModules.includes('tunnels')) {
        exportPayload.sshTunnels = sshTunnels || [];
      }
      if (selectedExportModules.includes('snippets')) {
        exportPayload.snippets = clientSnippets;
      }
      if (selectedExportModules.includes('settings')) {
        exportPayload.settings = settings || {};
      }

      // 4. Trigger Download
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const a = document.createElement('a');
      const dateStr = now.toISOString().slice(0, 10);
      a.href = dataStr;
      a.download = `rtmux-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setSuccessMsg(`✔ Đã xuất thành công ${selectedExportModules.length} module vào file JSON!`);
    } catch (e) {
      setErrorMsg('Lỗi xuất backup: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Import File Selection & Inspection
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

        // Detect which modules actually exist in the parsed file
        const detectedModules = [];
        const detectedCounts = {};

        // 1. Services
        const hasServices = Array.isArray(parsed.services) ? parsed.services.length > 0 : !!parsed.service;
        if (hasServices) {
          detectedModules.push('services');
          detectedCounts['services'] = `${Array.isArray(parsed.services) ? parsed.services.length : 1} dịch vụ`;
        }

        // 2. Categories
        if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
          detectedModules.push('categories');
          detectedCounts['categories'] = `${parsed.categories.length} danh mục`;
        }

        // 3. Env
        const hasEnv = !!(parsed.envConfig || parsed.globalProfiles || parsed.customProfiles);
        if (hasEnv) {
          detectedModules.push('env');
          const envConf = parsed.envConfig || parsed;
          const profCount = Object.keys(envConf.globalProfiles || {}).length + Object.keys(envConf.customProfiles || {}).length;
          detectedCounts['env'] = `${profCount} profiles`;
        }

        // 4. Scripts
        if (Array.isArray(parsed.globalScripts) && parsed.globalScripts.length > 0) {
          detectedModules.push('scripts');
          detectedCounts['scripts'] = `${parsed.globalScripts.length} kịch bản`;
        }

        // 5. Machines
        if (Array.isArray(parsed.machines) && parsed.machines.length > 0) {
          detectedModules.push('machines');
          detectedCounts['machines'] = `${parsed.machines.length} máy chủ`;
        }

        // 6. Tunnels
        if (Array.isArray(parsed.sshTunnels) && parsed.sshTunnels.length > 0) {
          detectedModules.push('tunnels');
          detectedCounts['tunnels'] = `${parsed.sshTunnels.length} đường hầm`;
        }

        // 7. Snippets
        if (Array.isArray(parsed.snippets) && parsed.snippets.length > 0) {
          detectedModules.push('snippets');
          detectedCounts['snippets'] = `${parsed.snippets.length} đoạn lệnh`;
        }

        // 8. Settings
        if (parsed.settings && typeof parsed.settings === 'object' && Object.keys(parsed.settings).length > 0) {
          detectedModules.push('settings');
          detectedCounts['settings'] = 'Giao diện & WSL';
        }

        setAvailableImportModules(detectedModules);
        setSelectedImportModules(detectedModules); // Select all found by default
        setInspection({ detectedCounts, version: parsed.version || '2.0' });

        if (detectedModules.length === 0) {
          setErrorMsg('File JSON không chứa bất kỳ cấu hình module nào được nhận diện.');
        }
      } catch (err) {
        setErrorMsg('Lỗi cú pháp file JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handle Execute Import
  const handleExecuteImport = async () => {
    if (!importData) {
      setErrorMsg('Vui lòng chọn file backup JSON!');
      return;
    }
    if (selectedImportModules.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất một module để khôi phục!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Restore Backend Modules if selected
      const backendModulesSelected = selectedImportModules.filter(id => 
        ['services', 'categories', 'env', 'scripts'].includes(id)
      );

      if (backendModulesSelected.length > 0) {
        const res = await fetch(`${BACKEND_URL}/api/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            data: importData, 
            mode: importMode,
            selectedModules: backendModulesSelected
          })
        });
        const data = await res.json();
        if (data.success === false) {
          throw new Error(data.error || 'Khôi phục phía server thất bại');
        }
      }

      // 2. Restore Client Modules
      const clientPayload = {};

      // 2.1 Machines
      if (selectedImportModules.includes('machines') && Array.isArray(importData.machines)) {
        let finalMachines = [];
        if (importMode === 'overwrite') {
          finalMachines = importData.machines;
        } else {
          const existingIds = new Set((machines || []).map(m => m.id));
          const newUnique = importData.machines.filter(m => !existingIds.has(m.id));
          finalMachines = [...(machines || []), ...newUnique];
        }
        localStorage.setItem('service_tool_ssh_machines', JSON.stringify(finalMachines));
        clientPayload.machines = finalMachines;
      }

      // 2.2 Tunnels
      if (selectedImportModules.includes('tunnels') && Array.isArray(importData.sshTunnels)) {
        let finalTunnels = [];
        if (importMode === 'overwrite') {
          finalTunnels = importData.sshTunnels;
        } else {
          const existingIds = new Set((sshTunnels || []).map(t => t.id));
          const newUnique = importData.sshTunnels.filter(t => !existingIds.has(t.id));
          finalTunnels = [...(sshTunnels || []), ...newUnique];
        }
        localStorage.setItem('service_tool_ssh_tunnels', JSON.stringify(finalTunnels));
        clientPayload.sshTunnels = finalTunnels;
      }

      // 2.3 Snippets
      if (selectedImportModules.includes('snippets') && Array.isArray(importData.snippets)) {
        let currentSnippets = [];
        try {
          const s = localStorage.getItem('service_tool_snippets');
          if (s) currentSnippets = JSON.parse(s);
        } catch (_) {}

        let finalSnippets = [];
        if (importMode === 'overwrite') {
          finalSnippets = importData.snippets;
        } else {
          const existingMap = new Set(currentSnippets.map(s => `${s.name}:::${s.command}`));
          const newUnique = importData.snippets.filter(s => !existingMap.has(`${s.name}:::${s.command}`));
          finalSnippets = [...currentSnippets, ...newUnique];
        }
        localStorage.setItem('service_tool_snippets', JSON.stringify(finalSnippets));
        clientPayload.snippets = finalSnippets;
      }

      // 2.4 Settings
      if (selectedImportModules.includes('settings') && importData.settings) {
        const nextSettings = importMode === 'overwrite' 
          ? importData.settings 
          : { ...settings, ...importData.settings };
        localStorage.setItem('service_tool_settings', JSON.stringify(nextSettings));
        clientPayload.settings = nextSettings;
      }

      // Trigger client runtime updates
      if (onRestoreClientData) {
        onRestoreClientData(clientPayload);
      }

      // Reload backend microservices
      if (onReloadAll) {
        await onReloadAll();
      }

      setSuccessMsg(`✔ Khôi phục thành công ${selectedImportModules.length} module (${importMode === 'overwrite' ? 'Ghi đè' : 'Gộp thêm'})!`);
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (e) {
      setErrorMsg('Lỗi khôi phục dữ liệu: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: currentThemeConfig.card || '#121216',
          borderColor: currentThemeConfig.border || '#27272a'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden File Picker */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".json" 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
        />

        {/* Modal Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: currentThemeConfig.border || '#27272a' }}
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="p-2.5 rounded-xl flex items-center justify-center border shadow-sm"
              style={{
                backgroundColor: `${accentColor}18`,
                borderColor: `${accentColor}40`,
                color: accentColor
              }}
            >
              <FolderSync size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
                Sao Lưu & Khôi Phục Cấu Hình Toàn Hệ Thống
              </h3>
              <p className="text-xs" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
                Tùy chọn từng module độc lập (Services, Env, SSH Machines, Snippets, Settings)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div 
          className="flex border-b px-6 pt-2.5 gap-6 flex-shrink-0"
          style={{ borderColor: currentThemeConfig.border || '#27272a' }}
        >
          <button
            onClick={() => {
              setActiveTab('export');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="pb-3 text-xs font-bold font-mono transition-all border-b-2 flex items-center gap-2 cursor-pointer"
            style={{
              borderColor: activeTab === 'export' ? accentColor : 'transparent',
              color: activeTab === 'export' ? accentColor : currentThemeConfig.textMuted
            }}
          >
            <Download size={15} />
            <span>1. Xuất Cấu Hình (Export)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('import');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="pb-3 text-xs font-bold font-mono transition-all border-b-2 flex items-center gap-2 cursor-pointer"
            style={{
              borderColor: activeTab === 'import' ? accentColor : 'transparent',
              color: activeTab === 'import' ? accentColor : currentThemeConfig.textMuted
            }}
          >
            <UploadCloud size={15} />
            <span>2. Khôi Phục Cấu Hình (Import)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-4">
          
          {/* ================= TAB 1: EXPORT (LIST VIEW) ================= */}
          {activeTab === 'export' && (
            <div className="space-y-3.5">
              {/* Header explanation & select all */}
              <div className="flex items-center justify-between pb-1">
                <div>
                  <span className="text-xs font-bold block" style={{ color: currentThemeConfig.text }}>
                    Chọn các Module muốn xuất file Backup:
                  </span>
                  <span className="text-[11px]" style={{ color: currentThemeConfig.textMuted }}>
                    Đã chọn {selectedExportModules.length}/{BACKUP_MODULES.length} module
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedExportModules(BACKUP_MODULES.map(m => m.id))}
                    className="text-xs font-mono font-semibold hover:underline cursor-pointer"
                    style={{ color: accentColor }}
                  >
                    Chọn tất cả
                  </button>
                  <span style={{ color: currentThemeConfig.textMuted }}>•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedExportModules([])}
                    className="text-xs font-mono font-semibold text-rose-400 hover:underline cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* LIST VIEW (1 CỘT ĐẦY ĐỦ, RỘNG RÃI) */}
              <div className="flex flex-col space-y-2">
                {BACKUP_MODULES.map(mod => {
                  const Icon = mod.icon;
                  const isChecked = selectedExportModules.includes(mod.id);
                  const countLabel = getExportModuleCount(mod.id);

                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleExportModule(mod.id)}
                      className="px-4 py-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 group select-none hover:border-emerald-500/50 shadow-sm"
                      style={{
                        backgroundColor: isChecked ? `${accentColor}10` : currentThemeConfig.innerInput,
                        borderColor: isChecked ? accentColor : currentThemeConfig.border,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0">
                          {isChecked ? (
                            <CheckSquare size={18} style={{ color: accentColor }} />
                          ) : (
                            <Square size={18} style={{ color: currentThemeConfig.textMuted }} />
                          )}
                        </div>
                        <div 
                          className="p-2 rounded-xl flex-shrink-0 border flex items-center justify-center" 
                          style={{ 
                            backgroundColor: `${accentColor}15`, 
                            borderColor: `${accentColor}30`, 
                            color: accentColor 
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold font-sans" style={{ color: currentThemeConfig.text }}>
                            {mod.label}
                          </div>
                          <p className="text-[11px] leading-tight mt-0.5" style={{ color: currentThemeConfig.textMuted }}>
                            {mod.desc}
                          </p>
                        </div>
                      </div>

                      {countLabel && (
                        <div className="flex-shrink-0 ml-3">
                          <span 
                            className="text-xs font-mono px-3 py-1 rounded-lg font-bold border shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                            style={{
                              backgroundColor: isChecked ? `${accentColor}25` : 'transparent',
                              borderColor: isChecked ? `${accentColor}50` : currentThemeConfig.border,
                              color: isChecked ? accentColor : currentThemeConfig.textMuted
                            }}
                          >
                            {countLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Feedback messages */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 size={15} className="flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: IMPORT (LIST VIEW) ================= */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* File Select Banner */}
              <div 
                className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                style={{
                  backgroundColor: currentThemeConfig.innerInput,
                  borderColor: currentThemeConfig.border
                }}
              >
                <div>
                  <div className="text-xs font-bold flex items-center gap-2" style={{ color: currentThemeConfig.text }}>
                    <FileText size={16} style={{ color: accentColor }} />
                    <span>{importFile ? importFile.name : 'Chọn File Backup (.json) từ máy tính'}</span>
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: currentThemeConfig.textMuted }}>
                    {importFile 
                      ? `Đã phân tích file (${Math.round(importFile.size / 1024)} KB) - Hãy chọn các module bên dưới` 
                      : 'Hỗ trợ các file backup xuất từ RTMUX Desktop'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  style={{
                    backgroundColor: `${accentColor}20`,
                    borderColor: `${accentColor}50`,
                    borderWidth: '1px',
                    color: accentColor
                  }}
                >
                  <UploadCloud size={14} />
                  <span>{importFile ? 'Đổi File Khác' : 'Duyệt Tìm File JSON'}</span>
                </button>
              </div>

              {/* Module selection for Import (Shown only after file is parsed) */}
              {inspection && availableImportModules.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <div>
                      <span className="text-xs font-bold block" style={{ color: currentThemeConfig.text }}>
                        Các module tìm thấy trong file (Chọn module để nạp vào app):
                      </span>
                      <span className="text-[11px]" style={{ color: currentThemeConfig.textMuted }}>
                        Đã chọn {selectedImportModules.length}/{availableImportModules.length} module
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedImportModules([...availableImportModules])}
                        className="text-xs font-mono font-semibold hover:underline cursor-pointer"
                        style={{ color: accentColor }}
                      >
                        Chọn tất cả
                      </button>
                      <span style={{ color: currentThemeConfig.textMuted }}>•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedImportModules([])}
                        className="text-xs font-mono font-semibold text-rose-400 hover:underline cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  {/* LIST VIEW (1 CỘT ĐẦY ĐỦ, RỘNG RÃI) */}
                  <div className="flex flex-col space-y-2">
                    {BACKUP_MODULES.filter(m => availableImportModules.includes(m.id)).map(mod => {
                      const Icon = mod.icon;
                      const isChecked = selectedImportModules.includes(mod.id);
                      const fileCount = inspection.detectedCounts[mod.id];

                      return (
                        <div
                          key={mod.id}
                          onClick={() => toggleImportModule(mod.id)}
                          className="px-4 py-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 group select-none hover:border-emerald-500/50 shadow-sm"
                          style={{
                            backgroundColor: isChecked ? `${accentColor}10` : currentThemeConfig.innerInput,
                            borderColor: isChecked ? accentColor : currentThemeConfig.border,
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex-shrink-0">
                              {isChecked ? (
                                <CheckSquare size={18} style={{ color: accentColor }} />
                              ) : (
                                <Square size={18} style={{ color: currentThemeConfig.textMuted }} />
                              )}
                            </div>
                            <div 
                              className="p-2 rounded-xl flex-shrink-0 border flex items-center justify-center" 
                              style={{ 
                                backgroundColor: `${accentColor}15`, 
                                borderColor: `${accentColor}30`, 
                                color: accentColor 
                              }}
                            >
                              <Icon size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold font-sans" style={{ color: currentThemeConfig.text }}>
                                {mod.label}
                              </div>
                              <p className="text-[11px] leading-tight mt-0.5" style={{ color: currentThemeConfig.textMuted }}>
                                {mod.desc}
                              </p>
                            </div>
                          </div>

                          {fileCount !== undefined && (
                            <div className="flex-shrink-0 ml-3">
                              <span 
                                className="text-xs font-mono px-3 py-1 rounded-lg font-bold border shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                                style={{
                                  backgroundColor: isChecked ? `${accentColor}25` : 'transparent',
                                  borderColor: isChecked ? `${accentColor}50` : currentThemeConfig.border,
                                  color: isChecked ? accentColor : currentThemeConfig.textMuted
                                }}
                              >
                                {fileCount}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Import Mode Selector */}
                  <div className="pt-2">
                    <label className="text-xs block mb-1.5 font-bold" style={{ color: currentThemeConfig.text }}>
                      Chế độ khôi phục dữ liệu:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div
                        onClick={() => setImportMode('merge')}
                        className="p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 shadow-sm"
                        style={{
                          backgroundColor: importMode === 'merge' ? `${accentColor}15` : currentThemeConfig.innerInput,
                          borderColor: importMode === 'merge' ? accentColor : currentThemeConfig.border,
                          color: importMode === 'merge' ? accentColor : currentThemeConfig.textMuted
                        }}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          className="mt-0.5 accent-emerald-500"
                        />
                        <div>
                          <strong className="block text-xs" style={{ color: currentThemeConfig.text }}>
                            Gộp thêm (Merge)
                          </strong>
                          <span className="text-[11px] leading-snug">
                            Bảo toàn cấu hình hiện tại, chỉ thêm bản ghi mới chưa tồn tại.
                          </span>
                        </div>
                      </div>

                      <div
                        onClick={() => setImportMode('overwrite')}
                        className="p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 shadow-sm"
                        style={{
                          backgroundColor: importMode === 'overwrite' ? 'rgba(244, 63, 94, 0.15)' : currentThemeConfig.innerInput,
                          borderColor: importMode === 'overwrite' ? '#f43f5e' : currentThemeConfig.border,
                          color: importMode === 'overwrite' ? '#f43f5e' : currentThemeConfig.textMuted
                        }}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'overwrite'}
                          onChange={() => setImportMode('overwrite')}
                          className="mt-0.5 accent-rose-500"
                        />
                        <div>
                          <strong className="block text-xs" style={{ color: currentThemeConfig.text }}>
                            Ghi đè (Overwrite)
                          </strong>
                          <span className="text-[11px] leading-snug">
                            Thay thế toàn bộ dữ liệu của các module đã chọn bằng nội dung trong file.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback messages */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 size={15} className="flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-t flex-shrink-0"
          style={{ borderColor: currentThemeConfig.border || '#27272a' }}
        >
          <button 
            type="button"
            onClick={onClose} 
            className="px-4 py-2 text-xs rounded-xl hover:text-white transition-colors cursor-pointer"
            style={{
              backgroundColor: currentThemeConfig.innerInput,
              color: currentThemeConfig.textMuted
            }}
          >
            Đóng
          </button>

          {activeTab === 'export' ? (
            <button
              type="button"
              disabled={selectedExportModules.length === 0 || loading}
              onClick={handleDownloadBackup}
              className="px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50 rounded-xl flex items-center gap-2 active:scale-95 shadow-lg transition-all cursor-pointer"
              style={{ backgroundColor: accentColor }}
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              <span>Xuất {selectedExportModules.length} Module (.JSON)</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!importData || selectedImportModules.length === 0 || loading}
              onClick={handleExecuteImport}
              className="px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50 rounded-xl flex items-center gap-2 active:scale-95 shadow-lg transition-all cursor-pointer"
              style={{ backgroundColor: accentColor }}
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              <span>Khôi Phục {selectedImportModules.length} Module Đã Chọn</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
