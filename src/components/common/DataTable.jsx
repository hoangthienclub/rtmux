import React from 'react';

/**
 * Reusable DataTable component with clean, borderless styling,
 * smooth horizontal scroll, theme awareness, and unified hover effects.
 */
export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  onRowClick,
  onRowDoubleClick,
  isLoading = false,
  loadingMessage = 'Đang tải dữ liệu...',
  emptyMessage = 'Không có dữ liệu',
  emptyIcon,
  footer,
  themeConfig,
  className = '',
  tableClassName = '',
  containerClassName = '',
  rowClassName = ''
}) {
  const isLight = !!themeConfig?.isLight || (typeof document !== 'undefined' && document.documentElement.classList.contains('light'));
  const cardBg = themeConfig?.card || (isLight ? '#ffffff' : '#0e131f');
  const borderColor = themeConfig?.border || (isLight ? '#cbd5e1' : '#1e293b');
  const headerBg = themeConfig?.innerInput || (isLight ? '#f8fafc' : '#080c14');
  const textMuted = themeConfig?.textMuted || (isLight ? '#64748b' : '#64748b');
  const textColor = themeConfig?.text || (isLight ? '#0f172a' : '#f8fafc');

  const getKey = (item, index) => {
    if (typeof keyField === 'function') return keyField(item, index);
    return item[keyField] !== undefined ? item[keyField] : index;
  };

  return (
    <div
      className={`rounded-2xl border shadow-sm flex flex-col overflow-hidden ${className}`}
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
        color: textColor
      }}
    >
      {/* Scrollable Container with custom scrollbar */}
      <div className={`overflow-x-auto custom-scroll w-full ${containerClassName}`}>
        <table className={`w-full text-left border-collapse text-xs ${tableClassName}`}>
          <thead>
            <tr
              className="border-b font-mono uppercase text-[10.5px] tracking-wider select-none sticky top-0 z-10"
              style={{
                backgroundColor: headerBg,
                borderColor: borderColor,
                color: isLight ? '#334155' : textMuted
              }}
            >
              {columns.map((col, idx) => {
                const align = col.headerAlign || col.align || 'left';
                const alignClass = 
                  align === 'center' ? 'text-center' :
                  align === 'right' ? 'text-right' : 'text-left';

                return (
                  <th
                    key={col.key || idx}
                    className={`py-3 px-4 font-semibold whitespace-nowrap ${alignClass} ${col.width || ''} ${col.headerClassName || ''}`}
                  >
                    {col.label || col.title || ''}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-16 px-4 text-center font-mono text-xs"
                  style={{ color: textMuted }}
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <div className="text-slate-300 font-sans text-xs">{loadingMessage}</div>
                  </div>
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((item, index) => {
                const rowKey = getKey(item, index);
                const extraRowClass = typeof rowClassName === 'function' ? rowClassName(item, index) : rowClassName;

                return (
                  <tr
                    key={rowKey}
                    onClick={(e) => onRowClick && onRowClick(item, index, e)}
                    onDoubleClick={(e) => onRowDoubleClick && onRowDoubleClick(item, index, e)}
                    className={`${isLight ? 'hover:bg-slate-100/90 active:bg-slate-200/70 border-b border-slate-100 last:border-b-0' : 'hover:bg-white/[0.035] active:bg-white/[0.06] border-b border-white/[0.02] last:border-b-0'} transition-colors duration-150 cursor-pointer group select-none ${extraRowClass}`}
                  >
                    {columns.map((col, colIdx) => {
                      const align = col.align || 'left';
                      const alignClass = 
                        align === 'center' ? 'text-center' :
                        align === 'right' ? 'text-right' : 'text-left';

                      return (
                        <td
                          key={col.key || colIdx}
                          className={`py-3 px-4 whitespace-nowrap ${alignClass} ${col.width || ''} ${col.className || ''}`}
                        >
                          {col.render ? col.render(item, index) : item[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 px-4 text-center font-mono text-xs"
                  style={{ color: textMuted }}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    {emptyIcon && <div className="text-slate-500 mb-1">{emptyIcon}</div>}
                    <div>{emptyMessage}</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Optional Footer Summary / Tip Bar */}
      {footer && (
        <div
          className="p-3 border-t flex flex-wrap items-center justify-between text-xs font-mono select-none"
          style={{
            backgroundColor: headerBg,
            borderColor: borderColor,
            color: isLight ? '#475569' : textMuted
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

/**
 * Common Action Button helper for table action cells
 */
export function TableActionButton({
  icon: Icon,
  label,
  title,
  onClick,
  variant = 'default', // 'primary' | 'default' | 'danger' | 'ghost'
  accentColor = '#10b981',
  themeConfig = null,
  isLight = null,
  className = '',
  disabled = false
}) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick && !disabled) onClick(e);
  };

  const lightMode = isLight !== null 
    ? isLight 
    : (themeConfig?.isLight ?? (typeof document !== 'undefined' && document.documentElement.classList.contains('light')));

  let variantStyle = {};
  let variantClass = '';

  if (variant === 'primary') {
    variantClass = 'font-bold shadow-sm active:scale-95 hover:brightness-105';
    variantStyle = {
      backgroundColor: `${accentColor}18`,
      borderColor: `${accentColor}40`,
      color: accentColor
    };
  } else if (variant === 'danger') {
    variantClass = lightMode
      ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 border-transparent active:scale-95'
      : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 hover:border-rose-800/40 active:scale-95';
    variantStyle = {
      borderColor: 'transparent'
    };
  } else if (variant === 'ghost') {
    variantClass = lightMode
      ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-transparent active:scale-95'
      : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border-transparent hover:border-slate-700 active:scale-95';
  } else {
    // default
    variantClass = lightMode
      ? 'bg-slate-100 hover:bg-slate-200/90 text-slate-700 hover:text-slate-900 border-slate-300 hover:border-slate-400 font-medium active:scale-95 shadow-sm'
      : 'bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 hover:text-white border-slate-700/50 hover:border-slate-600 font-medium active:scale-95';
  }

  return (
    <button
      type="button"
      title={title || label}
      disabled={disabled}
      onClick={handleClick}
      className={`h-7 px-2.5 rounded-lg border text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantClass} ${className}`}
      style={variantStyle}
    >
      {Icon && <Icon size={13} />}
      {label && <span>{label}</span>}
    </button>
  );
}
