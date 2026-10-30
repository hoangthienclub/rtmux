import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Plus, 
  Trash2, 
  Edit3, 
  Folder, 
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

// ================= SERVICE MODAL =================
function ServiceModal({ service, categories = [], isOpen, onClose, onSave, defaultCategory = null, currentThemeConfig = {}, accentColor = '#10b981' }) {
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
  const isEdit = !!service;

  const initialCategory = service?.group || service?.category || defaultCategory || 'SERVICE';
  const [id, setId] = useState(service?.id || '');
  const [name, setName] = useState(service?.name || '');
  const [group, setGroup] = useState(initialCategory);
  const [port, setPort] = useState(service?.port !== undefined && service?.port !== null ? service.port : '');
  const [script, setScript] = useState(service?.script || 'yarn');
  const [args, setArgs] = useState((service?.args || ['start:dev']).join(' '));
  const [cwd, setCwd] = useState(service?.cwd || service?.relativeDir || '');
  const [inspecting, setInspecting] = useState(false);
  const [detectedInfo, setDetectedInfo] = useState('');

  const handleInspectDirectory = async () => {
    if (!cwd.trim()) {
      alert('Vui lòng nhập đường dẫn thư mục mã nguồn trước khi kiểm tra!');
      return;
    }
    setInspecting(true);
    setDetectedInfo('');
    try {
      const res = await fetch('/api/inspect-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dirPath: cwd.trim() })
      });
      const data = await res.json();
      if (data.success && data.result) {
        const info = data.result;
        setDetectedInfo(`✔ Phát hiện: ${info.projectType || 'Project'} (Scripts: ${Object.keys(info.scripts || {}).slice(0, 4).join(', ')})`);
        if (info.suggestedScript) setScript(info.suggestedScript);
        if (info.suggestedPort && !port) setPort(info.suggestedPort);
      } else {
        setDetectedInfo('Không tìm thấy package.json hoặc thông tin dự án.');
      }
    } catch (e) {
      setDetectedInfo('Lỗi kiểm tra thư mục: ' + e.message);
    } finally {
      setInspecting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!id.trim() || !name.trim()) {
      alert('Vui lòng nhập ID và Tên Service!');
      return;
    }

    const serviceData = {
      id: id.trim().toLowerCase().replace(/\s+/g, '-'),
      name: name.trim(),
      category: group,
      group: group,
      port: port ? parseInt(port, 10) : null,
      script: script.trim(),
      args: args.trim().split(/\s+/).filter(Boolean),
      cwd: cwd.trim(),
      relativeDir: cwd.trim()
    };

    onSave(serviceData);
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Danh Mục / Nhóm *</label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none cursor-pointer"
                style={{
                  backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                  borderColor: currentThemeConfig.border || '#27272a',
                  color: currentThemeConfig.text || '#f4f4f5'
                }}
              >
                {categories.length === 0 ? (
                  <option value="SERVICE">SERVICE</option>
                ) : (
                  categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name || c.id}</option>
                  ))
                )}
              </select>
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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Thư Mục Mã Nguồn (Directory)</label>
              <button
                type="button"
                onClick={handleInspectDirectory}
                className="text-[11px] hover:underline flex items-center gap-1 font-mono"
                style={{ color: accentColor }}
              >
                {inspecting ? <RefreshCw size={11} className="animate-spin" /> : <FolderSearch size={11} />}
                <span>Tự động phát hiện</span>
              </button>
            </div>
            <input
              type="text"
              placeholder="/home/thientran/projects/my-service hoặc ./services/acc"
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                borderColor: currentThemeConfig.border || '#27272a',
                color: currentThemeConfig.text || '#f4f4f5'
              }}
            />
            {detectedInfo && (
              <p className="text-[11px] font-mono mt-1" style={{ color: accentColor }}>{detectedInfo}</p>
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
  onDeleteService,
  settings = {}
}) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';

  const [categories, setCategories] = useState([]);
  const [modalService, setModalService] = useState(undefined); // undefined: closed, null: new, obj: edit
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');
  const [actionStatus, setActionStatus] = useState('');
  const [viewType, setViewType] = useState('list'); // 'list' | 'grid'

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.categories)) {
          setCategories(d.categories);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (serviceData) => {
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData)
      });
      const data = await res.json();
      if (data.success) {
        setActionStatus(`✔ Đã lưu cấu hình dịch vụ "${serviceData.name}" thành công!`);
        setModalService(undefined);
        if (onAddNewService) onAddNewService(serviceData);
        if (onReloadServices) onReloadServices();
      } else {
        alert('Lỗi lưu service: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
    setTimeout(() => setActionStatus(''), 3000);
  };

  const handleDelete = async (serviceId, serviceName) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa cấu hình service "${serviceName || serviceId}"?`)) return;
    try {
      const res = await fetch(`/api/services/${encodeURIComponent(serviceId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setActionStatus(`✔ Đã xóa dịch vụ "${serviceName || serviceId}"!`);
        if (onDeleteService) onDeleteService(serviceId);
        if (onReloadServices) onReloadServices();
      } else {
        alert('Lỗi xóa: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
    setTimeout(() => setActionStatus(''), 3000);
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

  const filteredServices = services.filter(s => {
    const matchesGroup = activeCategoryFilter === 'ALL' || (s.group || s.category) === activeCategoryFilter;
    const matchesSearch = !searchQuery.trim() || 
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (s.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(s.port || '').includes(searchQuery);
    return matchesGroup && matchesSearch;
  });

  const uniqueGroups = ['ALL', ...Array.from(new Set(services.map(s => s.group || s.category || 'SERVICE')))];

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
          <div className="relative w-72">
            <input
              type="text"
              placeholder="Tìm kiếm service..."
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

          <div className="flex items-center gap-1.5">
            {uniqueGroups.map(grp => (
              <button
                key={grp}
                onClick={() => setActiveCategoryFilter(grp)}
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border"
                style={{
                  backgroundColor: activeCategoryFilter === grp ? `${accentColor}25` : currentThemeConfig.innerInput,
                  borderColor: activeCategoryFilter === grp ? accentColor : currentThemeConfig.border,
                  color: activeCategoryFilter === grp ? accentColor : currentThemeConfig.textMuted
                }}
              >
                {grp}
              </button>
            ))}
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
                    <span 
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput,
                        borderColor: currentThemeConfig.border,
                        color: currentThemeConfig.textMuted
                      }}
                    >
                      {svc.group || svc.category || 'SERVICE'}
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
                  <span 
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md border"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.textMuted
                    }}
                  >
                    {svc.group || svc.category || 'SERVICE'}
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
      <ServiceModal
        service={modalService}
        categories={categories}
        isOpen={modalService !== undefined}
        onClose={() => setModalService(undefined)}
        onSave={handleSave}
        currentThemeConfig={currentThemeConfig}
        accentColor={accentColor}
      />
    </div>
  );
}
