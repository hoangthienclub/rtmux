import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { THEME_CONFIGS } from '../../constants/palettes';

export default function ConfirmModal({
  isOpen,
  title = "Xác nhận",
  message = "Bạn có chắc chắn muốn thực hiện thao tác này?",
  itemName,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  danger = true,
  type = null, // 'danger' | 'warning' | 'info' | 'success'
  isAlert = false,
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

  const effectiveType = type || (danger ? 'danger' : 'info');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (isAlert) {
          (onConfirm || onCancel)?.();
        } else {
          onCancel?.();
        }
      } else if (e.key === 'Enter') {
        e.stopPropagation();
        onConfirm?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm, isAlert]);

  if (!isOpen) return null;

  // Icon mapping
  let IconComponent = CustomIcon;
  if (!IconComponent) {
    if (effectiveType === 'danger') IconComponent = Trash2;
    else if (effectiveType === 'warning') IconComponent = AlertTriangle;
    else if (effectiveType === 'success') IconComponent = CheckCircle2;
    else IconComponent = Info;
  }

  // Styles based on type
  const typeStyles = {
    danger: {
      badge: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      btn: 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40 text-white',
      itemBox: 'text-rose-300'
    },
    warning: {
      badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      btn: 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40 text-white',
      itemBox: 'text-amber-300'
    },
    success: {
      badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      btn: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40 text-white',
      itemBox: 'text-emerald-300'
    },
    info: {
      badge: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
      btn: 'bg-sky-600 hover:bg-sky-500 shadow-sky-900/40 text-white',
      itemBox: 'text-sky-300'
    }
  };

  const currentStyle = typeStyles[effectiveType] || typeStyles.info;

  const handleClose = () => {
    if (isAlert) {
      (onConfirm || onCancel)?.();
    } else {
      onCancel?.();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="border rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-in zoom-in-95 duration-150 relative space-y-4"
        style={{
          backgroundColor: currentThemeConfig.card || '#18181b',
          borderColor: currentThemeConfig.border || '#27272a'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${currentStyle.badge}`}>
              <IconComponent size={16} />
            </div>
            <h3 className="font-bold text-sm text-white">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Đóng (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body Content */}
        <div className="text-xs space-y-2 leading-relaxed" style={{ color: currentThemeConfig.textMuted || '#a1a1aa' }}>
          <p className="whitespace-pre-line">{message}</p>
          {itemName && (
            <div 
              className={`p-2.5 rounded-xl border font-mono text-[11px] font-semibold break-all ${currentStyle.itemBox}`}
              style={{ 
                backgroundColor: currentThemeConfig.innerInput || '#0d0d10', 
                borderColor: currentThemeConfig.border || '#27272a' 
              }}
            >
              {itemName}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: currentThemeConfig.border || '#27272a' }}>
          {!isAlert && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-1.5 rounded-xl border text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              style={{ borderColor: currentThemeConfig.border || '#27272a' }}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => {
              if (onConfirm) onConfirm();
              else if (onCancel) onCancel();
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 ${currentStyle.btn}`}
          >
            {isAlert ? (confirmText || "Đã hiểu") : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
