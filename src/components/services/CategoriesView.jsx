import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Edit3, 
  Folder, 
  Layers, 
  Check, 
  X,
  Boxes,
  LayoutList,
  LayoutGrid,
  Search,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { THEME_CONFIGS } from '../../constants/palettes';

// ================= CATEGORY MODAL =================
function CategoryModal({ category, isOpen, onClose, onSave, currentThemeConfig = {}, accentColor = '#10b981' }) {
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
  const isEdit = !!category;

  const [id, setId] = useState(category?.id || '');
  const [name, setName] = useState(category?.name || '');
  const [color, setColor] = useState(category?.color || '#38bdf8');
  const [description, setDescription] = useState(category?.description || '');

  const PALETTE = [
    '#38bdf8', '#818cf8', '#a855f7', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#22c55e', '#14b8a6', '#64748b'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!id.trim() || !name.trim()) {
      alert('Vui lòng nhập đầy đủ Mã và Tên danh mục!');
      return;
    }
    onSave({
      id: id.trim().toUpperCase().replace(/\s+/g, '_'),
      name: name.trim(),
      color,
      description: description.trim()
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl"
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
            <Tag size={16} style={{ color: accentColor }} />
            <span>{isEdit ? 'Chỉnh Sửa Danh Mục' : 'Thêm Danh Mục Mới'}</span>
          </h4>
          <button onClick={onClose} className="p-1 rounded text-xs hover:text-white" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Mã Danh Mục (Category Key) *</label>
            <input
              type="text"
              disabled={isEdit}
              placeholder="vd: CORE, AUTH, BACKEND, FRONTEND"
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
              placeholder="vd: Core Services, Quản Lý Xác Thực"
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

          <div>
            <label className="text-xs block mb-1.5 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Màu Sắc Nhận Diện</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-lg border bg-transparent cursor-pointer p-0.5"
                style={{ borderColor: currentThemeConfig.border || '#27272a' }}
              />
              <div className="flex flex-wrap gap-1.5">
                {PALETTE.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-md border flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: currentThemeConfig.border || '#27272a' }}
                  >
                    {color === c && <Check size={12} className="text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1 font-bold" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Mô Tả Nhóm</label>
            <textarea
              placeholder="Ghi chú về trách nhiệm của các service trong nhóm..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border rounded-xl p-2.5 text-xs focus:outline-none resize-none"
              style={{
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                borderColor: currentThemeConfig.border || '#27272a',
                color: currentThemeConfig.text || '#f4f4f5'
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
              {isEdit ? 'Lưu Thay Đổi' : 'Tạo Danh Mục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ================= ASSIGN SERVICES MODAL =================
function AssignServicesModal({ category, services = [], isOpen, onClose, onSave, currentThemeConfig = {}, accentColor = '#10b981' }) {
  if (!isOpen || !category) return null;
  const catId = (category.id || '').toUpperCase();
  const currentServiceIds = services
    .filter(s => (s.group || s.category || '').toUpperCase() === catId)
    .map(s => s.id);

  const [selectedIds, setSelectedIds] = useState(currentServiceIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = services.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (s.name || '').toLowerCase().includes(q) || (s.id || '').toLowerCase().includes(q) || String(s.port || '').includes(q);
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(category.id, selectedIds);
      onClose();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div 
        className="border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: currentThemeConfig.card || '#18181b',
          borderColor: currentThemeConfig.border || '#27272a'
        }}
      >
        <div 
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{
            backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
            borderColor: currentThemeConfig.border || '#27272a'
          }}
        >
          <div>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
              <Tag size={16} style={{ color: accentColor }} />
              <span>Gán Services cho: <span className="font-mono" style={{ color: accentColor }}>{category.name || category.id}</span></span>
            </h3>
            <p className="text-xs" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>Chọn các microservice để đưa vào danh mục này</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-base hover:text-white" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>✕</button>
        </div>

        <div className="p-5 flex-1 overflow-hidden flex flex-col space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Tìm service theo tên, id, port..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none"
                style={{
                  backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                  borderColor: currentThemeConfig.border || '#27272a',
                  color: currentThemeConfig.text || '#f4f4f5'
                }}
                autoFocus
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
            </div>
            <div className="flex items-center space-x-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setSelectedIds(services.map(s => s.id))}
                className="px-2.5 py-1 rounded-lg border transition-all font-semibold"
                style={{
                  backgroundColor: `${accentColor}18`,
                  borderColor: `${accentColor}40`,
                  color: accentColor
                }}
              >
                Chọn hết
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1 rounded-lg bg-rose-950/40 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-800/40 transition-all font-semibold"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          <div className="text-[11px] font-mono" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
            Đã chọn: <strong style={{ color: accentColor }}>{selectedIds.length}</strong> / {services.length} services
          </div>

          <div 
            className="flex-1 overflow-y-auto space-y-1.5 pr-1 border rounded-xl p-2 custom-scroll"
            style={{
              backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
              borderColor: currentThemeConfig.border || '#27272a'
            }}
          >
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs italic" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>Không tìm thấy service nào phù hợp</div>
            ) : (
              filtered.map(s => {
                const isChecked = selectedIds.includes(s.id);
                const currentGroup = (s.group || s.category || 'SERVICE').toUpperCase();
                const isCurrentCat = currentGroup === catId;

                return (
                  <label
                    key={s.id}
                    className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all border"
                    style={{
                      backgroundColor: isChecked ? `${accentColor}15` : currentThemeConfig.card || '#18181b',
                      borderColor: isChecked ? accentColor : currentThemeConfig.border || '#27272a',
                      color: currentThemeConfig.text || '#f4f4f5'
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, s.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== s.id));
                          }
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <div>
                        <span className="font-mono font-bold">{s.name}</span>
                        {s.port && (
                          <span 
                            className="ml-2 text-[10px] font-mono px-1.5 py-0.2 rounded border"
                            style={{
                              color: accentColor,
                              backgroundColor: `${accentColor}10`,
                              borderColor: `${accentColor}25`
                            }}
                          >
                            :{s.port}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] font-mono">
                      {isCurrentCat ? (
                        <span className="text-emerald-400 font-semibold">Đang ở nhóm này</span>
                      ) : (
                        <span style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>Nhóm hiện tại: {currentGroup}</span>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div 
          className="flex justify-end gap-3 px-6 py-3.5 border-t"
          style={{
            backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
            borderColor: currentThemeConfig.border || '#27272a'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs rounded-xl hover:text-white"
            style={{
              backgroundColor: currentThemeConfig.card || '#18181b',
              color: currentThemeConfig.textMuted || '#a1a1aa'
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
            <span>Lưu Phân Loại ({selectedIds.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= MAIN CATEGORIES VIEW =================
export default function CategoriesView({ services = [], onReloadServices, settings = {} }) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalCategory, setModalCategory] = useState(undefined); // undefined: closed, null: new, obj: edit
  const [assignModalCategory, setAssignModalCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [viewType, setViewType] = useState('list'); // 'list' | 'grid'

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (e) {
      console.error('Failed to load categories:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSaveCategory = async (catData) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catData)
      });
      const data = await res.json();
      if (data.success) {
        setActionStatus(`✔ Đã lưu danh mục "${catData.name}" thành công!`);
        setModalCategory(undefined);
        await fetchCategories();
        if (onReloadServices) onReloadServices();
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
    setTimeout(() => setActionStatus(''), 3000);
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa danh mục "${catName || catId}" không?\n(Các service thuộc danh mục này sẽ được chuyển về nhóm "SERVICE")`)) return;
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(catId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fallbackCategory: 'SERVICE' })
      });
      const data = await res.json();
      if (data.success) {
        setActionStatus(`✔ Đã xóa danh mục "${catName || catId}" thành công!`);
        await fetchCategories();
        if (onReloadServices) onReloadServices();
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
    setTimeout(() => setActionStatus(''), 3000);
  };

  const handleAssignServices = async (catId, serviceIds) => {
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(catId)}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceIds })
      });
      const data = await res.json();
      if (data.success) {
        setActionStatus(`✔ Đã cập nhật gán services vào danh mục!`);
        await fetchCategories();
        if (onReloadServices) onReloadServices();
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
    setTimeout(() => setActionStatus(''), 3000);
  };

  const filteredCategories = categories.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.id || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
  });

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
              <Tag size={18} style={{ color: accentColor }} />
              <span>Quản Lý Danh Mục Services ({categories.length})</span>
            </h2>
            <p className="text-xs" style={{ color: currentThemeConfig.textMuted }}>
              Tổ chức và phân loại các microservice theo từng nhóm phân hệ chức năng (FE, BFF, Service, Gateway, Worker...).
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setModalCategory(null)}
              className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center space-x-1.5"
              style={{ backgroundColor: accentColor }}
            >
              <Plus size={14} />
              <span>Thêm Danh Mục Mới</span>
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

      {/* 2. Search & View Mode Toggle */}
      <div 
        className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border"
        style={{
          backgroundColor: currentThemeConfig.card,
          borderColor: currentThemeConfig.border
        }}
      >
        <div className="relative w-80">
          <input
            type="text"
            placeholder="Tìm kiếm danh mục..."
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

      {/* 3. Main Categories Display */}
      {filteredCategories.length === 0 ? (
        <div 
          className="p-12 text-center rounded-2xl border"
          style={{
            backgroundColor: currentThemeConfig.card,
            borderColor: currentThemeConfig.border,
            color: currentThemeConfig.textMuted
          }}
        >
          {loading ? 'Đang tải danh mục...' : 'Chưa có danh mục nào phù hợp.'}
        </div>
      ) : viewType === 'list' ? (
        <div className="space-y-3">
          {filteredCategories.map(cat => {
            const catId = (cat.id || '').toUpperCase();
            const assignedServices = services.filter(s => (s.group || s.category || '').toUpperCase() === catId);

            return (
              <div
                key={cat.id}
                className="border rounded-2xl p-4 transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <div className="flex items-start space-x-3.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0"
                    style={{ backgroundColor: `${cat.color || '#38bdf8'}25`, border: `1px solid ${cat.color || '#38bdf8'}60`, color: cat.color || '#38bdf8' }}
                  >
                    <Tag size={18} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-sm font-mono" style={{ color: currentThemeConfig.text }}>{cat.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ borderColor: `${cat.color}50`, color: cat.color, backgroundColor: `${cat.color}15` }}>
                        {cat.id}
                      </span>
                    </div>
                    <p className="text-xs mt-1 max-w-xl" style={{ color: currentThemeConfig.textMuted }}>{cat.description || 'Chưa có mô tả'}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {assignedServices.length === 0 ? (
                        <span className="text-[10px] italic" style={{ color: currentThemeConfig.textMuted }}>Chưa có service nào</span>
                      ) : (
                        assignedServices.map(s => (
                          <span 
                            key={s.id} 
                            className="text-[10px] font-mono px-2 py-0.5 rounded border"
                            style={{
                              backgroundColor: currentThemeConfig.innerInput,
                              borderColor: currentThemeConfig.border,
                              color: accentColor
                            }}
                          >
                            {s.name} (:{s.port})
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end md:self-center flex-shrink-0">
                  <button
                    onClick={() => setAssignModalCategory(cat)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1"
                    style={{
                      backgroundColor: `${accentColor}15`,
                      borderColor: `${accentColor}30`,
                      color: accentColor
                    }}
                    title="Gán thêm hoặc bớt microservices trong danh mục này"
                  >
                    <Boxes size={13} />
                    <span>Gán Services ({assignedServices.length})</span>
                  </button>

                  <button
                    onClick={() => setModalCategory(cat)}
                    className="p-1.5 rounded-xl text-xs transition-all border hover:text-white"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.textMuted
                    }}
                    title="Chỉnh sửa danh mục"
                  >
                    <Edit3 size={14} />
                  </button>

                  <button
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-1.5 bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs transition-all border border-rose-800/40"
                    title="Xóa danh mục này"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map(cat => {
            const catId = (cat.id || '').toUpperCase();
            const assignedServices = services.filter(s => (s.group || s.category || '').toUpperCase() === catId);

            return (
              <div
                key={cat.id}
                className="border rounded-2xl p-5 transition-all shadow-md flex flex-col justify-between space-y-4"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold" style={{ borderColor: `${cat.color}50`, color: cat.color, backgroundColor: `${cat.color}15` }}>
                      {cat.id}
                    </span>
                    <span className="text-xs font-mono" style={{ color: currentThemeConfig.textMuted }}>{assignedServices.length} apps</span>
                  </div>
                  <h3 className="text-base font-bold font-mono" style={{ color: currentThemeConfig.text }}>{cat.name}</h3>
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: currentThemeConfig.textMuted }}>{cat.description || 'Chưa có mô tả'}</p>
                </div>

                <div 
                  className="pt-3 border-t flex items-center justify-between"
                  style={{ borderColor: currentThemeConfig.border }}
                >
                  <button
                    onClick={() => setAssignModalCategory(cat)}
                    className="text-xs hover:underline flex items-center gap-1 font-semibold"
                    style={{ color: accentColor }}
                  >
                    <Boxes size={13} />
                    <span>Gán Services ({assignedServices.length})</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => setModalCategory(cat)} 
                      className="p-1 hover:text-white"
                      style={{ color: currentThemeConfig.textMuted }}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id, cat.name)} 
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALS */}
      <CategoryModal
        category={modalCategory}
        isOpen={modalCategory !== undefined}
        onClose={() => setModalCategory(undefined)}
        onSave={handleSaveCategory}
        currentThemeConfig={currentThemeConfig}
        accentColor={accentColor}
      />

      <AssignServicesModal
        category={assignModalCategory}
        services={services}
        isOpen={!!assignModalCategory}
        onClose={() => setAssignModalCategory(null)}
        onSave={handleAssignServices}
        currentThemeConfig={currentThemeConfig}
        accentColor={accentColor}
      />
    </div>
  );
}
