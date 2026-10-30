import React, { useEffect } from 'react';
import { X, Monitor, Terminal, Cpu, Check, Layers, AlertCircle } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, onSaveSettings }) {
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[#0f1420] border border-[#1e2638] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2233]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
              <Monitor size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Cài đặt Hệ thống & Môi trường</h2>
              <p className="text-[11px] text-[#64748b]">Cấu hình môi trường thực thi mặc định và tích hợp WSL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#64748b] hover:text-white hover:bg-[#1a2336] transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Section 1: Platform & WSL Integration */}
          <div className="bg-[#121826] border border-[#1e2638] rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Môi trường Mặc định</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                    settings.enableWsl 
                      ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40' 
                      : 'bg-[#3b82f6]/20 text-[#38bdf8] border border-[#38bdf8]/40'
                  }`}>
                    {settings.enableWsl ? 'WSL2 Mode Active' : 'Windows Native (Default)'}
                  </span>
                </h3>
                <p className="text-[11.5px] text-[#8e9aa8] mt-1">
                  Mặc định chạy trên Windows Native (PowerShell / CMD). Chỉ kết nối WSL khi bạn chủ động bật tuỳ chọn bên dưới.
                </p>
              </div>
            </div>

            {/* Toggle WSL */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1a2233]">
              <div>
                <span className="text-xs font-medium text-white block">Tích hợp WSL (Windows Subsystem for Linux)</span>
                <span className="text-[11px] text-[#64748b]">
                  {settings.enableWsl 
                    ? 'Đang bật: Đọc thêm SSH config & keys từ WSL, hỗ trợ chạy terminal tmux/WSL'
                    : 'Đang tắt: Chỉ đọc SSH config & keys từ Windows (%USERPROFILE%\\.ssh), chạy Windows native'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !settings.enableWsl;
                  onSaveSettings({
                    ...settings,
                    enableWsl: next,
                    defaultShell: next ? 'wsl' : 'powershell',
                    serviceTarget: next ? (settings.serviceTarget || 'wsl') : 'windows'
                  });
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  settings.enableWsl ? 'bg-[#10b981]' : 'bg-[#1e2638]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enableWsl ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* WSL Settings (Only if WSL is enabled) */}
            {settings.enableWsl && (
              <div className="pt-3 border-t border-[#1a2233] space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-medium text-[#8e9aa8] mb-1.5">
                    Bản phân phối WSL (Distribution)
                  </label>
                  <select
                    value={settings.wslDistro || 'Ubuntu-24.04'}
                    onChange={(e) => onSaveSettings({ ...settings, wslDistro: e.target.value })}
                    className="w-full h-9 bg-[#0c1018] border border-[#1e2638] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-[#10b981] font-mono"
                  >
                    <option value="Ubuntu-24.04">Ubuntu-24.04 (Đã phát hiện)</option>
                    <option value="Ubuntu">Ubuntu (Default)</option>
                    <option value="Debian">Debian</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-300 block">Tự động kết nối tmux</span>
                    <span className="text-[11px] text-[#64748b]">Tạo hoặc attach vào session tmux khi mở terminal</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoTmux ?? true}
                    onChange={(e) => onSaveSettings({ ...settings, autoTmux: e.target.checked })}
                    className="accent-[#10b981] w-4 h-4 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Windows Shell Selection */}
          <div className="bg-[#121826] border border-[#1e2638] rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Terminal size={14} className="text-[#10b981]" />
              <span>Shell Mặc định trên Windows</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'powershell', label: 'PowerShell', desc: 'Khuyến nghị cho Windows 10/11' },
                { id: 'cmd', label: 'Command Prompt', desc: 'cmd.exe truyền thống' },
                { id: 'gitbash', label: 'Git Bash', desc: 'Bash cho Windows (MINGW64)' },
                { id: 'wsl', label: 'WSL Bash', desc: 'Chỉ hoạt động khi bật WSL' },
              ].map((sh) => {
                const isSelected = settings.defaultShell === sh.id;
                const isDisabled = sh.id === 'wsl' && !settings.enableWsl;
                return (
                  <button
                    key={sh.id}
                    disabled={isDisabled}
                    onClick={() => onSaveSettings({ ...settings, defaultShell: sh.id })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isDisabled 
                        ? 'opacity-40 cursor-not-allowed border-[#1a2233] bg-[#0c1018]' 
                        : isSelected
                        ? 'border-[#10b981] bg-[#10b981]/10 text-white shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                        : 'border-[#1e2638] bg-[#0c1018] text-[#8e9aa8] hover:border-[#2d3a54] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{sh.label}</span>
                      {isSelected && <Check size={14} className="text-[#10b981]" />}
                    </div>
                    <span className="text-[10.5px] text-[#64748b] block">{sh.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Microservices Execution Target */}
          <div className="bg-[#121826] border border-[#1e2638] rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers size={14} className="text-[#10b981]" />
              <span>Mục tiêu chạy Microservices</span>
            </h3>
            <p className="text-[11.5px] text-[#8e9aa8]">
              Khi nhấn Start / Restart / Kill Port trong Microservices Monitor:
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onSaveSettings({ ...settings, serviceTarget: 'windows' })}
                className={`flex-1 p-2.5 rounded-xl border text-left text-xs transition-all ${
                  settings.serviceTarget !== 'wsl'
                    ? 'border-[#38bdf8] bg-[#38bdf8]/10 text-white font-medium'
                    : 'border-[#1e2638] bg-[#0c1018] text-[#8e9aa8]'
                }`}
              >
                <span className="font-bold block text-[#38bdf8] mb-0.5">Windows Native</span>
                <span className="text-[10.5px] text-[#64748b]">Node.js / Python chạy trực tiếp trên Windows</span>
              </button>

              <button
                type="button"
                disabled={!settings.enableWsl}
                onClick={() => onSaveSettings({ ...settings, serviceTarget: 'wsl' })}
                className={`flex-1 p-2.5 rounded-xl border text-left text-xs transition-all ${
                  !settings.enableWsl
                    ? 'opacity-40 cursor-not-allowed border-[#1a2233] bg-[#0c1018]'
                    : settings.serviceTarget === 'wsl'
                    ? 'border-[#10b981] bg-[#10b981]/10 text-white font-medium'
                    : 'border-[#1e2638] bg-[#0c1018] text-[#8e9aa8]'
                }`}
              >
                <span className="font-bold block text-[#10b981] mb-0.5">WSL2 (Linux)</span>
                <span className="text-[10.5px] text-[#64748b]">Chạy bên trong container / môi trường WSL2</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1a2233] flex items-center justify-between bg-[#0a0d14]">
          <span className="text-[11px] text-[#64748b] flex items-center gap-1.5">
            <AlertCircle size={13} className="text-[#10b981]" />
            Cài đặt được lưu tự động trên máy của bạn
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-[#080b11] rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all active:scale-95"
          >
            Đóng & Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
