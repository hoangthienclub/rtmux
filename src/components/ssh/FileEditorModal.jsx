import React, { useState, useEffect } from 'react';
import { X, Save, Download, FileCode, Check } from 'lucide-react';

export default function FileEditorModal({
  file,
  isOpen,
  onClose,
  onSave
}) {
  const [content, setContent] = useState(() => {
    if (!file) return '';
    if (file.content !== undefined && file.content !== null) return file.content;
    return '';
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

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

  if (!isOpen || !file) return null;

  const isLocal = file.source === 'local';

  const handleSave = () => {
    setSavedSuccess(true);
    if (onSave) onSave(file.name, content);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[#0f1420] border border-[#1e273a] rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 bg-[#090d16] border-b border-[#1a2336] px-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 truncate mr-3">
            <FileCode size={16} className={isLocal ? "text-sky-400" : "text-emerald-400"} />
            <span className="font-mono text-sm font-bold text-white truncate">{file.name}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${isLocal ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
              {isLocal ? 'LOCAL (Máy tính)' : 'REMOTE (Máy chủ)'}
            </span>
            <span className="text-[11px] font-mono text-slate-500 bg-[#141b2c] px-2 py-0.5 rounded border border-[#1e2840]">
              {file.size}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141d2e] hover:bg-[#1a263c] border border-[#202d44] text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-all"
              title="Tải bản sao file về máy"
            >
              <Download size={13} />
              <span>Tải về</span>
            </button>

            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-white rounded-xl text-xs font-bold transition-all active:scale-95 ${
                isLocal 
                  ? 'bg-sky-600 hover:bg-sky-500 shadow-[0_0_12px_rgba(2,132,199,0.3)]' 
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check size={13} />
                  <span>Đã lưu thành công</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>{isLocal ? 'Lưu tệp cục bộ' : 'Lưu tệp lên server'}</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-[#1a2336] ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 p-3 bg-[#070a12] flex flex-col overflow-hidden">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full bg-transparent text-xs font-mono text-emerald-300 placeholder-slate-600 focus:outline-none resize-none custom-scroll leading-relaxed selection:bg-emerald-600/30"
          />
        </div>

        {/* Footer */}
        <div className="h-7 bg-[#090d16] border-t border-[#1a2336] px-4 flex items-center justify-between text-[11px] font-mono text-slate-500 flex-shrink-0">
          <span>Encoding: UTF-8 • Line Endings: LF</span>
          <span>{content.split('\n').length} lines • {content.length} characters</span>
        </div>
      </div>
    </div>
  );
}
