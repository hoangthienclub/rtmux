import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, CheckCircle, Sliders } from 'lucide-react';
import { THEME_CONFIGS } from '../../constants/palettes';

export default function EnvModal({ service, isOpen, onClose, onSaveOverrides, settings = {} }) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';

  const [envPairs, setEnvPairs] = useState([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && service && service.computedEnv) {
      const pairs = Object.entries(service.computedEnv).map(([key, value]) => ({
        key,
        value: String(value)
      }));
      setEnvPairs(pairs);
    }
  }, [isOpen, service]);

  const handleValueChange = (index, val) => {
    const updated = [...envPairs];
    updated[index].value = val;
    setEnvPairs(updated);
  };

  const handleAddPair = () => {
    if (!newKey.trim()) return;
    setEnvPairs([...envPairs, { key: newKey.trim().toUpperCase(), value: newValue }]);
    setNewKey('');
    setNewValue('');
  };

  const handleDeletePair = (index) => {
    const updated = envPairs.filter((_, i) => i !== index);
    setEnvPairs(updated);
  };

  const handleSave = async () => {
    if (!service?.id) return;
    const overrides = {};
    for (const item of envPairs) {
      overrides[item.key] = item.value;
    }
    await onSaveOverrides(service.id, overrides);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

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

  if (!isOpen || !service) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="border rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: currentThemeConfig.card || '#18181b',
          borderColor: currentThemeConfig.border || '#27272a'
        }}
      >
        {/* Modal Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{
            backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
            borderColor: currentThemeConfig.border || '#27272a'
          }}
        >
          <div className="flex items-center space-x-3">
            <div 
              className="p-2 rounded-xl border"
              style={{
                backgroundColor: `${accentColor}15`,
                borderColor: `${accentColor}30`,
                color: accentColor
              }}
            >
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>
                Cấu hình Biến Môi Trường: <span className="font-mono" style={{ color: accentColor }}>{service.name}</span>
              </h3>
              <p className="text-xs" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
                Profile đang chọn: <span className="font-semibold" style={{ color: accentColor }}>{service.activeProfile}</span> — Các giá trị dưới đây sẽ được nạp khi khởi chạy service.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:text-white"
            style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content - Env list */}
        <div 
          className="p-6 flex-1 overflow-y-auto space-y-3 custom-scroll"
          style={{ backgroundColor: currentThemeConfig.innerInput || '#0d0d10' }}
        >
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold px-2 uppercase tracking-wider" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
            <div className="col-span-5">Key / Variable</div>
            <div className="col-span-6">Value</div>
            <div className="col-span-1 text-center">Xóa</div>
          </div>

          <div className="space-y-2">
            {envPairs.map((pair, index) => (
              <div 
                key={pair.key + index} 
                className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl border transition-colors shadow-sm"
                style={{
                  backgroundColor: currentThemeConfig.card || '#18181b',
                  borderColor: currentThemeConfig.border || '#27272a'
                }}
              >
                <div className="col-span-5 font-mono text-xs font-medium px-2 truncate" style={{ color: accentColor }} title={pair.key}>
                  {pair.key}
                </div>
                <div className="col-span-6">
                  <input
                    type="text"
                    value={pair.value}
                    onChange={(e) => handleValueChange(index, e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
                      borderColor: currentThemeConfig.border || '#27272a',
                      color: currentThemeConfig.text || '#f4f4f5'
                    }}
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={() => handleDeletePair(index)}
                    className="p-1 rounded hover:text-rose-400 transition-colors"
                    style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add new Env key-value */}
          <div 
            className="mt-4 pt-4 border-t"
            style={{ borderColor: currentThemeConfig.border || '#27272a' }}
          >
            <h4 className="text-xs font-bold mb-2" style={{ color: currentThemeConfig.text || '#f4f4f5' }}>Thêm biến mới:</h4>
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <input
                  type="text"
                  placeholder="ENV_KEY_NAME"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full border rounded-xl px-3 py-1.5 text-xs font-mono uppercase focus:outline-none"
                  style={{
                    backgroundColor: currentThemeConfig.card || '#18181b',
                    borderColor: currentThemeConfig.border || '#27272a',
                    color: currentThemeConfig.text || '#f4f4f5'
                  }}
                />
              </div>
              <div className="col-span-5">
                <input
                  type="text"
                  placeholder="value..."
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full border rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none"
                  style={{
                    backgroundColor: currentThemeConfig.card || '#18181b',
                    borderColor: currentThemeConfig.border || '#27272a',
                    color: currentThemeConfig.text || '#f4f4f5'
                  }}
                />
              </div>
              <div className="col-span-2">
                <button
                  type="button"
                  onClick={handleAddPair}
                  className="w-full flex items-center justify-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  <Plus size={14} />
                  <span>Thêm</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-t"
          style={{
            backgroundColor: currentThemeConfig.innerInput || '#0d0d10',
            borderColor: currentThemeConfig.border || '#27272a'
          }}
        >
          <span className="text-xs" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
            * Các thay đổi sẽ được lưu vào cấu hình cá nhân và tự động áp dụng khi khởi động service.
          </span>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium rounded-xl transition-colors hover:text-white"
              style={{
                backgroundColor: currentThemeConfig.card || '#18181b',
                color: currentThemeConfig.textMuted || '#a1a1aa'
              }}
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold text-white rounded-xl transition-all shadow-md active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              {savedSuccess ? (
                <>
                  <CheckCircle size={14} />
                  <span>Đã lưu!</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Lưu Cấu Hình</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
