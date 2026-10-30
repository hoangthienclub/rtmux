import React, { useState, useEffect } from 'react';
import { X, Server, Key, ShieldCheck, Tag, Globe, Hash, User, FileText } from 'lucide-react';

export default function MachineModal({
  isOpen,
  onClose,
  onSave,
  initialMachine = null,
  availableKeys = []
}) {
  const [name, setName] = useState('');
  const [hostname, setHostname] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('root');
  const [authType, setAuthType] = useState('key'); // 'key' | 'password'
  const [selectedKey, setSelectedKey] = useState('');
  const [password, setPassword] = useState('');
  const [tag, setTag] = useState('Dev');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (initialMachine) {
      setName(initialMachine.name || '');
      setHostname(initialMachine.hostname || initialMachine.host?.split('@')[1]?.split(':')[0] || '');
      setPort(initialMachine.port || 22);
      setUsername(initialMachine.user || initialMachine.host?.split('@')[0] || 'root');
      setTag(initialMachine.tag || 'Dev');
      setSelectedKey(initialMachine.identity_file || initialMachine.identityFile || '');
      setAuthType(initialMachine.identity_file ? 'key' : 'password');
    } else {
      setName('');
      setHostname('');
      setPort(22);
      setUsername('root');
      setTag('Dev');
      setSelectedKey(availableKeys[0]?.path || '');
      setAuthType('key');
      setDescription('');
    }
  }, [initialMachine, availableKeys, isOpen]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !hostname.trim()) return;

    const fullHost = `${username}@${hostname}:${port}`;
    const machineData = {
      id: initialMachine?.id || `ssh_${Date.now()}`,
      name: name.trim(),
      host: fullHost,
      hostname: hostname.trim(),
      user: username.trim(),
      port: Number(port) || 22,
      identity_file: authType === 'key' ? selectedKey : undefined,
      tag: tag.trim() || 'SSH',
      uptime: initialMachine?.uptime || 'Click to Monitor',
      cpu: initialMachine?.cpu || 0,
      ramPct: initialMachine?.ramPct || 0,
      cores: initialMachine?.cores || '4',
      ram: initialMachine?.ram || '8 GB',
      disk: initialMachine?.disk || '100 GB',
      netUp: initialMachine?.netUp || '0 B/s',
      netDown: initialMachine?.netDown || '0 B/s',
      diskR: initialMachine?.diskR || '0 B/s',
      diskW: initialMachine?.diskW || '0 B/s',
      os: 'remote',
      description: description.trim()
    };

    onSave(machineData);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[#10141f] border border-[#1e273a] rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1c2436] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Server size={16} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {initialMachine ? 'Chỉnh Sửa Máy Chủ' : 'Thêm Máy Chủ Mới'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Cấu hình kết nối SSH chuẩn OpenSSH tương tự Terminus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-[#1a2336] transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Server size={12} className="text-emerald-400" />
                <span>Tên gợi nhớ (Alias)</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. clt_dev1, Klive_Prod"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 bg-[#090d16] border border-[#1e273a] rounded-xl px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Tag size={12} className="text-emerald-400" />
                <span>Nhóm / Tag</span>
              </label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full h-9 bg-[#090d16] border border-[#1e273a] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
              >
                <option value="Production">Production</option>
                <option value="UAT">UAT</option>
                <option value="Dev">Dev</option>
                <option value="Database">Database</option>
                <option value="SSH">SSH</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Globe size={12} className="text-emerald-400" />
                <span>Host / Địa chỉ IP</span>
              </label>
              <input
                type="text"
                required
                placeholder="192.168.1.100 hoặc domain.com"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                className="w-full h-9 bg-[#090d16] border border-[#1e273a] rounded-xl px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Hash size={12} className="text-emerald-400" />
                <span>Port</span>
              </label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full h-9 bg-[#090d16] border border-[#1e273a] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono text-center"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User size={12} className="text-emerald-400" />
              <span>Username</span>
            </label>
            <input
              type="text"
              required
              placeholder="root, ubuntu, thientran..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-9 bg-[#090d16] border border-[#1e273a] rounded-xl px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Authentication Method */}
          <div className="pt-2 border-t border-[#1c2436]">
            <label className="block text-xs font-medium text-slate-300 mb-2">Phương thức xác thực</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setAuthType('key')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                  authType === 'key'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 font-bold'
                    : 'bg-[#090d16] border-[#1e273a] text-slate-400 hover:text-white'
                }`}
              >
                <Key size={13} />
                <span>SSH Key (Khuyến nghị)</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthType('password')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition-all ${
                  authType === 'password'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 font-bold'
                    : 'bg-[#090d16] border-[#1e273a] text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck size={13} />
                <span>Mật khẩu</span>
              </button>
            </div>

            {authType === 'key' ? (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                  Chọn SSH Private Key từ Keychain
                </label>
                <select
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="w-full h-9 bg-[#090d16] border border-[#1e273a] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="">-- Mặc định hệ thống (~/.ssh/id_rsa / id_ed25519) --</option>
                  {availableKeys.map((k) => (
                    <option key={k.id} value={k.path || k.name}>
                      {k.name} ({k.keyType || 'KEY'}) - {k.fingerprint || k.path}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                  Mật khẩu đăng nhập
                </label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu SSH..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-9 bg-[#090d16] border border-[#1e273a] rounded-xl px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#1c2436]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-[#1a2336] transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Server size={14} />
              <span>{initialMachine ? 'Cập Nhật Máy Chủ' : 'Lưu Máy Chủ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
