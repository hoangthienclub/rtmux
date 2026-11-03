import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Terminal, 
  Server, 
  FolderSync, 
  Cpu, 
  ArrowLeftRight, 
  ShieldCheck, 
  Settings, 
  X,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { THEME_CONFIGS } from '../../constants/palettes';

export default function CommandPaletteModal({
  isOpen,
  onClose,
  machines = [],
  onConnectSsh,
  onOpenSftp,
  onOpenLocalShell,
  onNavigate,
  settings = {}
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Global ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Navigation system items
  const systemActions = [
    {
      id: 'local_shell',
      title: 'New Local Shell',
      desc: 'Mở phiên dòng lệnh máy cục bộ (Windows / WSL)',
      icon: Terminal,
      shortcut: 'Ctrl+T',
      action: onOpenLocalShell
    },
    {
      id: 'nav_machines',
      title: 'SSH Machines Manager',
      desc: 'Danh sách và quản lý các máy chủ từ xa',
      icon: Server,
      action: () => onNavigate?.('hosts')
    },
    {
      id: 'nav_sftp',
      title: 'SFTP File Explorer',
      desc: 'Trình duyệt truyền và đồng bộ tệp tin Local <-> Host',
      icon: FolderSync,
      action: () => onNavigate?.('sftp')
    },
    {
      id: 'nav_docker',
      title: 'Docker Manager',
      desc: 'Quản lý Containers, Images, Compose, Volumes',
      icon: Cpu,
      action: () => onNavigate?.('docker')
    },
    {
      id: 'nav_port_forward',
      title: 'Port Forwarding / Tunnels',
      desc: 'Cấu hình chuyển tiếp cổng mạng SSH',
      icon: ArrowLeftRight,
      action: () => onNavigate?.('port_forward')
    },
    {
      id: 'nav_vpn',
      title: 'VPN & Proxies',
      desc: 'Quản lý kết nối WireGuard / OpenVPN',
      icon: ShieldCheck,
      action: () => onNavigate?.('proxy')
    },
    {
      id: 'nav_settings',
      title: 'System Settings',
      desc: 'Cấu hình giao diện, ngôn ngữ, WSL và hệ thống',
      icon: Settings,
      shortcut: 'Ctrl+,',
      action: () => onNavigate?.('settings')
    }
  ];

  // Filter System Actions
  const filteredSystemActions = systemActions.filter(item => {
    if (!q) return true;
    return item.title.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
  });

  // Filter Machines
  const filteredMachines = machines.filter(m => {
    if (!q) return true;
    const nameMatch = (m.name || '').toLowerCase().includes(q);
    const hostMatch = (m.host || '').toLowerCase().includes(q);
    const tagMatch = (m.tag || '').toLowerCase().includes(q);
    return nameMatch || hostMatch || tagMatch;
  });

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-start justify-center pt-16 px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        style={{ 
          backgroundColor: currentThemeConfig.card || '#0f172a', 
          borderColor: currentThemeConfig.border || '#334155' 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div 
          className="p-3.5 px-4 border-b flex items-center gap-3 flex-shrink-0"
          style={{ 
            backgroundColor: currentThemeConfig.subBg || '#1e293b', 
            borderColor: currentThemeConfig.border || '#334155' 
          }}
        >
          <Search size={18} style={{ color: accentColor }} className="flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SSH hosts, open SFTP, run snippets, or toggle port forwarding..."
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-slate-500 font-sans"
            style={{ color: currentThemeConfig.text || '#ffffff' }}
          />
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border text-slate-400 hover:text-white transition-all cursor-pointer"
            style={{ borderColor: currentThemeConfig.border }}
          >
            <span>ESC</span>
          </button>
        </div>

        {/* Scrollable Results */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scroll text-xs">
          
          {/* Section 1: SYSTEM ACTIONS */}
          {filteredSystemActions.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                SYSTEM ACTIONS
              </div>
              <div className="space-y-1">
                {filteredSystemActions.map(action => {
                  const Icon = action.icon;
                  return (
                    <div
                      key={action.id}
                      onClick={() => {
                        action.action?.();
                        onClose?.();
                      }}
                      className="group flex items-center justify-between p-2 px-3 rounded-xl border border-transparent hover:border-slate-700/60 transition-all cursor-pointer"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput || '#1e293b20'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                        >
                          <Icon size={14} />
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                            {action.title}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {action.desc}
                          </div>
                        </div>
                      </div>

                      {action.shortcut && (
                        <kbd 
                          className="px-2 py-0.5 rounded text-[10px] font-mono border text-slate-400"
                          style={{ borderColor: currentThemeConfig.border, backgroundColor: currentThemeConfig.card }}
                        >
                          {action.shortcut}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: SSH MACHINES & SFTP */}
          {filteredMachines.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                SSH MACHINES & SFTP ({filteredMachines.length})
              </div>
              <div className="space-y-1.5">
                {filteredMachines.map(mach => (
                  <div
                    key={mach.id}
                    className="p-2.5 px-3 rounded-xl border flex items-center justify-between gap-3 transition-all"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput || '#1e293b20',
                      borderColor: currentThemeConfig.border || '#334155'
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#10b98118', color: '#10b981' }}
                      >
                        <Server size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-xs truncate font-mono">
                          {mach.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate font-mono">
                          {mach.host || `${mach.user || 'root'}@${mach.hostname || mach.name}:22`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          onConnectSsh?.(mach);
                          onClose?.();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer hover:brightness-110 whitespace-nowrap"
                        style={{ backgroundColor: '#10b981' }}
                        title="Kết nối terminal SSH trực tiếp"
                      >
                        <Terminal size={12} />
                        <span>Connect SSH</span>
                      </button>

                      <button
                        onClick={() => {
                          onOpenSftp?.(mach);
                          onClose?.();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer whitespace-nowrap"
                        style={{
                          backgroundColor: currentThemeConfig.card,
                          borderColor: currentThemeConfig.border
                        }}
                        title="Mở trình quản lý tệp SFTP của máy chủ này"
                      >
                        <FolderSync size={12} className="text-amber-400" />
                        <span>Open SFTP</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredSystemActions.length === 0 && filteredMachines.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              <Search size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">Không tìm thấy kết quả phù hợp với "{query}"</p>
              <p className="text-[11px] text-slate-600 mt-1">Thử tìm tên máy chủ, địa chỉ IP hoặc tên tính năng</p>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div 
          className="p-2 px-4 border-t flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0"
          style={{ borderColor: currentThemeConfig.border, backgroundColor: currentThemeConfig.subBg }}
        >
          <div className="flex items-center gap-3">
            <span>Dùng <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300">↓</kbd> để di chuyển</span>
            <span>Bấm <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300">ESC</kbd> để đóng</span>
          </div>
          <span className="font-mono text-emerald-400 font-semibold">ServiceTool Command Palette</span>
        </div>
      </div>
    </div>
  );
}
