import React from 'react';
import { Sparkles, ArrowRight, CornerDownLeft, History, Terminal } from 'lucide-react';

/**
 * Sleek bottom suggestion bar for terminal sessions (works in SSH, Local, Docker, etc.)
 */
export default function SuggestionBar({
  suggestions = [],
  currentBuffer = '',
  onAccept,
  accentColor = '#10b981',
  themeConfig = {}
}) {
  if (!suggestions || suggestions.length === 0 || !currentBuffer) {
    return null;
  }

  const topSuggestion = suggestions[0];

  return (
    <div
      className="absolute bottom-2 left-3 right-3 z-20 flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl border shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 select-none"
      style={{
        backgroundColor: `${themeConfig.card || '#0f1420'}ee`,
        borderColor: `${accentColor}40`,
        boxShadow: `0 8px 24px -4px rgba(0,0,0,0.5), 0 0 15px ${accentColor}15`
      }}
    >
      {/* Left: Top Suggestion with Ghost Text */}
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        <div 
          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
        >
          <Sparkles size={11} className="animate-pulse" />
        </div>

        <div className="font-mono text-xs truncate flex items-center gap-1">
          <span className="font-semibold text-white">{currentBuffer}</span>
          <span className="opacity-60" style={{ color: accentColor }}>
            {topSuggestion.completion}
          </span>
        </div>

        <button
          onClick={() => onAccept && onAccept(topSuggestion)}
          className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all hover:brightness-110 active:scale-95 flex-shrink-0"
          style={{
            backgroundColor: `${accentColor}25`,
            color: accentColor,
            border: `1px solid ${accentColor}50`
          }}
          title="Nhấn phím Tab hoặc Mũi tên Phải (→) để áp dụng"
        >
          <span>Áp dụng</span>
          <span className="text-[9px] opacity-75 font-sans">(Tab / →)</span>
        </button>
      </div>

      {/* Right: Quick Pills for alternative matches */}
      {suggestions.length > 1 && (
        <div className="hidden md:flex items-center gap-1.5 overflow-x-auto custom-scroll flex-shrink-0 max-w-[50%]">
          {suggestions.slice(1, 4).map((s, idx) => (
            <button
              key={idx}
              onClick={() => onAccept && onAccept(s)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-mono border transition-all hover:bg-white/10 active:scale-95 truncate max-w-[200px]"
              style={{
                backgroundColor: themeConfig.innerInput || '#161e2e',
                borderColor: themeConfig.border || '#1e293b',
                color: themeConfig.textMuted || '#94a3b8'
              }}
              title={s.full}
            >
              {s.source === 'history' ? (
                <History size={10} className="text-amber-400 flex-shrink-0" />
              ) : (
                <Terminal size={10} className="opacity-60 flex-shrink-0" />
              )}
              <span className="truncate">{s.full}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
