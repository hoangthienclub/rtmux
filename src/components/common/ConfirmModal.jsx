import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { THEME_CONFIGS } from '../../constants/palettes';

export default function ConfirmModal({
  isOpen,
  title = "Xác nhận xóa",
  message = "Bạn có chắc chắn muốn xóa mục này? Thao tác này không thể hoàn tác.",
  itemName,
  confirmText = "Xóa vĩnh viễn",
  cancelText = "Hủy",
  danger = true,
  icon: CustomIcon,
  onConfirm,
  onCancel,
  settings
}) {
  const surfaceTheme = settings?.surfaceTheme || 'zinc';
  const currentThemeConfig = THEME_CONFIGS[surfaceTheme] || THEME_CONFIGS.zinc || {
    bg: '#09090b',
    subBg: '#121215',
    card: '#18181b',
    border: '#27272a',
    hoverBorder: '#3f3f46',
    text: '#f4f4f5',
    textMuted: '#a1a1aa',
    innerInput: '#0d0d10'
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel && onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const IconComponent = CustomIcon || (danger ? Trash2 : AlertTriangle);

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="border rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-in zoom-in-95 duration-150 relative space-y-4"
        style={{
          backgroundColor: currentThemeConfig.card,
          borderColor: currentThemeConfig.border
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              danger ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}>
              <IconComponent size={16} />
            </div>
            <h3 className="font-bold text-sm text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Đóng (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body Content */}
        <div className="text-xs space-y-2" style={{ color: currentThemeConfig.textMuted }}>
          <p>{message}</p>
          {itemName && (
            <div 
              className="p-2.5 rounded-xl border font-mono text-[11px] font-semibold text-rose-300 break-all"
              style={{ backgroundColor: currentThemeConfig.innerInput, borderColor: currentThemeConfig.border }}
            >
              {itemName}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: currentThemeConfig.border }}>
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="px-3 py-1.5 rounded-xl border text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            style={{ borderColor: currentThemeConfig.border }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              if (onConfirm) onConfirm();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all active:scale-95 ${
              danger 
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40' 
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
