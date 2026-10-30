import React, { useState } from 'react';
import { 
  UserCheck, 
  Plus, 
  Copy, 
  Trash2, 
  Check, 
  ShieldCheck, 
  Lock, 
  Search, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Server, 
  X,
  LayoutList,
  LayoutGrid,
  Terminal,
  ExternalLink,
  Sliders,
  FolderOpen
} from 'lucide-react';
import { THEME_CONFIGS } from '../../constants/palettes';
import DataTable, { TableActionButton } from '../common/DataTable';
import ConfirmModal from '../common/ConfirmModal';
import { translations } from '../../i18n/translations';

export default function IdentityView({
  identities = [],
  machines = [],
  sshKeys = [],
  onAddNewIdentity,
  onDeleteIdentity,
  onConnectMachine,
  settings = {}
}) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';
  const lang = settings?.language || 'vi';
  const t = translations[lang] || translations.vi;

  const [searchQuery, setSearchQuery] = useState('');
  const [revealedIds, setRevealedIds] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [identityToDelete, setIdentityToDelete] = useState(null);

  useEffect(() => {
    if (!isAddModalOpen && !identityToDelete) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (identityToDelete) setIdentityToDelete(null);
        else if (isAddModalOpen) setIsAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, identityToDelete]);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('service_tool_identity_view_mode') || 'list';
    } catch (_) {
      return 'list';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('service_tool_identity_view_mode', mode);
    } catch (_) {}
  };

  // Form state
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('root');
  const [formType, setFormType] = useState('key'); // 'key' | 'password'
  const [formKeyPath, setFormKeyPath] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [selectedHosts, setSelectedHosts] = useState([]);

  const toggleReveal = (id) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (id, text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleToggleHostSelect = (hostName) => {
    setSelectedHosts((prev) => 
      prev.includes(hostName) ? prev.filter(h => h !== hostName) : [...prev, hostName]
    );
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formUsername.trim()) return;

    const label = formName.trim() || `${formUsername} (${formType === 'key' ? 'SSH Key' : 'Password'})`;
    const newIdent = {
      id: `ident_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: label,
      username: formUsername.trim(),
      type: formType,
      secret: formType === 'password' ? formPassword.trim() : formKeyPath.trim(),
      keyPath: formType === 'key' ? formKeyPath.trim() : '',
      hostHint: selectedHosts.join(', ') || 'Chưa gán máy chủ',
      boundHosts: selectedHosts,
      source: 'Tùy chỉnh',
      updatedAt: 'Vừa xong'
    };

    if (onAddNewIdentity) {
      onAddNewIdentity(newIdent);
    }

    setFormName('');
    setFormUsername('root');
    setFormType('key');
    setFormKeyPath('');
    setFormPassword('');
    setSelectedHosts([]);
    setIsAddModalOpen(false);
  };

  const filtered = (Array.isArray(identities) ? identities : []).filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      (item.name || '').toLowerCase().includes(q) ||
      (item.username || '').toLowerCase().includes(q) ||
      (item.hostHint || '').toLowerCase().includes(q) ||
      (item.keyPath || '').toLowerCase().includes(q) ||
      (Array.isArray(item.boundHosts) && item.boundHosts.some(h => String(h).toLowerCase().includes(q)))
    );
  });

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      {/* 1. Header Banner */}
      <div 
        className="relative overflow-hidden rounded-2xl p-5 border transition-all"
        style={{
          backgroundColor: currentThemeConfig.card,
          borderColor: currentThemeConfig.border
        }}
      >
        <div 
          className="absolute right-0 top-0 w-80 h-full blur-3xl pointer-events-none"
          style={{ backgroundColor: `${accentColor}12` }}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <h2 className="text-base font-bold tracking-tight flex items-center gap-2" style={{ color: currentThemeConfig.text }}>
              <UserCheck size={18} style={{ color: accentColor }} />
              <span>{t.identity || 'Tài Khoản SSH'}</span>
            </h2>
            <p className="text-xs" style={{ color: currentThemeConfig.textMuted }}>
              Quản lý hồ sơ xác thực đăng nhập (SSH Key, Mật khẩu) tự động đồng bộ từ cấu hình máy chủ.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (sshKeys && sshKeys.length > 0 && !formKeyPath) {
                  setFormKeyPath(sshKeys[0].path || '');
                }
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              <Plus size={14} />
              <span>Thêm Tài Khoản</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Search & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          {/* View Mode Toggle: List vs Grid */}
          <div
            className="flex items-center p-0.5 rounded-xl border flex-shrink-0"
            style={{
              backgroundColor: currentThemeConfig.innerInput,
              borderColor: currentThemeConfig.border
            }}
          >
            <button
              onClick={() => handleSetViewMode('list')}
              className="p-1.5 rounded-lg transition-all"
              style={{
                backgroundColor: viewMode === 'list' ? `${accentColor}25` : 'transparent',
                color: viewMode === 'list' ? accentColor : currentThemeConfig.textMuted
              }}
              title="Dạng danh sách (List View - Mặc định)"
            >
              <LayoutList size={14} />
            </button>
            <button
              onClick={() => handleSetViewMode('grid')}
              className="p-1.5 rounded-lg transition-all"
              style={{
                backgroundColor: viewMode === 'grid' ? `${accentColor}25` : 'transparent',
                color: viewMode === 'grid' ? accentColor : currentThemeConfig.textMuted
              }}
              title="Dạng thẻ lưới (Grid View)"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: currentThemeConfig.textMuted }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên profile, username, máy chủ..."
              className="w-full h-8 pl-8 pr-3 rounded-xl border text-xs focus:outline-none transition-all font-mono"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.text
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono" style={{ color: currentThemeConfig.textMuted }}>
          <ShieldCheck size={14} style={{ color: accentColor }} />
          <span>{filtered.length} tài khoản xác thực</span>
        </div>
      </div>

      {/* 3. Identities Display: List View vs Grid View */}
      {viewMode === 'list' ? (
        <DataTable
          columns={[
            {
              key: 'profile',
              label: 'TÀI KHOẢN & PROFILE',
              render: (item) => (
                <div className="flex items-center gap-2.5 py-1">
                  <span 
                    className="w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0"
                    style={{
                      backgroundColor: `${accentColor}15`,
                      borderColor: `${accentColor}30`,
                      color: accentColor
                    }}
                  >
                    <UserCheck size={15} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-[13px] text-white group-hover:text-emerald-400 transition-colors truncate">
                      {item.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[11px] font-semibold text-emerald-400">
                        @{item.username}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[10px] uppercase font-mono text-slate-400">
                        {item.type === 'key' ? 'SSH Key' : 'Password'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            },
            {
              key: 'auth',
              label: 'PHƯƠNG THỨC XÁC THỰC',
              width: 'w-64',
              render: (item) => {
                const isKey = item.type === 'key';
                const isRevealed = !!revealedIds[item.id];
                const isCopied = copiedId === item.id;
                const keyFileName = item.keyPath ? item.keyPath.split(/[\\/]/).pop() : (item.secret ? item.secret.split(/[\\/]/).pop() : 'SSH Key');

                if (isKey) {
                  return (
                    <div className="flex items-center gap-2 font-mono text-xs" title={item.keyPath || item.secret}>
                      <KeyRound size={13} className="text-amber-400 flex-shrink-0" />
                      <span className="text-slate-300 font-semibold truncate max-w-[160px]">
                        {keyFileName}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(item.id, item.keyPath || item.secret);
                        }}
                        title="Sao chép đường dẫn file khóa"
                        className="p-1 rounded text-slate-500 hover:text-white"
                      >
                        {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-xs" style={{ backgroundColor: currentThemeConfig.innerInput, borderColor: currentThemeConfig.border }}>
                    <Lock size={12} className="text-sky-400 flex-shrink-0" />
                    <span className="w-24 truncate text-slate-300">
                      {isRevealed ? (item.secret || '******') : '••••••••••••'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReveal(item.id);
                      }}
                      title={isRevealed ? 'Ẩn' : 'Hiện'}
                      className="p-0.5 rounded text-slate-400 hover:text-white"
                    >
                      {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(item.id, item.secret);
                      }}
                      title="Sao chép mật khẩu"
                      className="p-0.5 rounded text-slate-400 hover:text-white"
                    >
                      {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                );
              }
            },
            {
              key: 'hosts',
              label: 'MÁY CHỦ ÁP DỤNG',
              render: (item) => {
                const hosts = Array.isArray(item.boundHosts) && item.boundHosts.length > 0 
                  ? item.boundHosts 
                  : (item.hostHint ? item.hostHint.split(',').map(s => s.trim()).filter(Boolean) : []);

                if (hosts.length === 0) {
                  return <span className="text-slate-500 italic text-xs">Chưa gán máy chủ</span>;
                }

                return (
                  <div className="flex flex-wrap items-center gap-1.5 max-w-sm">
                    {hosts.map((h, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onConnectMachine) {
                            const found = machines.find(m => m.name === h || m.id === h);
                            if (found) onConnectMachine(found);
                          }
                        }}
                        title={`Mở SSH tới máy chủ ${h}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-medium border bg-[#0d1424] hover:bg-[#152038] border-[#1e2d48] text-sky-400 hover:border-sky-500/50 transition-all cursor-pointer"
                      >
                        <Server size={10} className="text-slate-500" />
                        <span>{h}</span>
                      </button>
                    ))}
                  </div>
                );
              }
            },
            {
              key: 'source',
              label: 'NGUỒN CẤU HÌNH',
              width: 'w-36',
              render: (item) => (
                <div className="flex flex-col">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase w-fit border ${
                    item.source === 'SSH Config'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                  }`}>
                    {item.source || 'SSH Config'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    {item.updatedAt || 'Tự động đồng bộ'}
                  </span>
                </div>
              )
            },
            {
              key: 'actions',
              label: 'THAO TÁC',
              align: 'right',
              width: 'w-32',
              render: (item) => {
                const targetHostName = Array.isArray(item.boundHosts) && item.boundHosts[0];
                const matchedMachine = machines.find(m => m.name === targetHostName || m.id === targetHostName) || machines[0];

                return (
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {matchedMachine && onConnectMachine && (
                      <TableActionButton
                        icon={Terminal}
                        label="SSH"
                        onClick={() => onConnectMachine(matchedMachine)}
                        title={`Mở Terminal SSH với tài khoản ${item.username}`}
                        className="hover:border-emerald-500/50 hover:text-emerald-400"
                      />
                    )}
                    {item.source !== 'SSH Config' && onDeleteIdentity && (
                      <TableActionButton
                        icon={Trash2}
                        variant="danger"
                        onClick={() => setIdentityToDelete(item)}
                        title="Xóa Identity"
                        className="w-7 h-7 !px-0"
                      />
                    )}
                  </div>
                );
              }
            }
          ]}
          data={filtered}
          themeConfig={currentThemeConfig}
          emptyMessage="Không tìm thấy tài khoản SSH nào."
          footer={(
            <div className="flex items-center justify-between w-full">
              <span>Tổng: <strong style={{ color: currentThemeConfig.text }}>{filtered.length}</strong> tài khoản xác thực</span>
              <span className="text-[11px] text-slate-500">Đồng bộ tự động từ ~/.ssh/config và danh sách máy chủ</span>
            </div>
          )}
        />
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isKey = item.type === 'key';
            const isRevealed = !!revealedIds[item.id];
            const isCopied = copiedId === item.id;
            const keyFileName = item.keyPath ? item.keyPath.split(/[\\/]/).pop() : (item.secret ? item.secret.split(/[\\/]/).pop() : 'SSH Key');

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border flex flex-col justify-between space-y-4 transition-all hover:border-emerald-500/40"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                        style={{
                          backgroundColor: `${accentColor}18`,
                          color: accentColor,
                          border: `1px solid ${accentColor}40`
                        }}
                      >
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold leading-tight" style={{ color: currentThemeConfig.text }}>
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[11px]">
                          <span style={{ color: accentColor }}>@{item.username}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-[10px] text-slate-400 uppercase">{item.type}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[9.5px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                      item.source === 'SSH Config'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                    }`}>
                      {item.source || 'SSH'}
                    </span>
                  </div>

                  {/* Auth detail box */}
                  <div
                    className="p-2.5 rounded-lg border font-mono text-[11px] flex items-center justify-between"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      {isKey ? <KeyRound size={13} className="text-amber-400 flex-shrink-0" /> : <Lock size={13} className="text-sky-400 flex-shrink-0" />}
                      <span className="truncate" style={{ color: currentThemeConfig.text }}>
                        {isKey ? keyFileName : (isRevealed ? item.secret : '••••••••••••••••')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!isKey && (
                        <button
                          onClick={() => toggleReveal(item.id)}
                          title={isRevealed ? 'Ẩn' : 'Hiện'}
                          className="p-1 rounded text-slate-400 hover:text-white"
                        >
                          {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(item.id, item.keyPath || item.secret)}
                        title="Sao chép"
                        className="p-1 rounded transition-colors text-slate-400 hover:text-white"
                      >
                        {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Bound Hosts list */}
                  <div>
                    <div className="text-[10.5px] font-mono text-slate-500 mb-1">Máy chủ áp dụng:</div>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(item.boundHosts) && item.boundHosts.length > 0 ? (
                        item.boundHosts.map((h, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-slate-800/80 border border-slate-700/60 text-sky-400"
                          >
                            {h}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-600 italic">Chưa gán máy chủ</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t flex items-center justify-between text-[11px]" style={{ borderColor: currentThemeConfig.border }}>
                  <span className="text-slate-500 font-mono text-[10px]">{item.updatedAt}</span>
                  {item.source !== 'SSH Config' && onDeleteIdentity && (
                    <button
                      onClick={() => setIdentityToDelete(item)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded"
                      title="Xóa tài khoản này"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Add Identity Modal */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            style={{
              backgroundColor: currentThemeConfig.card,
              borderColor: currentThemeConfig.border
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: currentThemeConfig.border }}>
              <div className="flex items-center gap-2">
                <UserCheck size={18} style={{ color: accentColor }} />
                <h3 className="text-sm font-bold text-white">
                  Thêm Tài Khoản SSH Mới
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold text-slate-300">
                  Tên gợi nhớ (Profile Name)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: root @ Production Cluster..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-8 px-3 rounded-lg border font-sans focus:outline-none"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-slate-300">
                    Username đăng nhập *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="root, ubuntu, admin..."
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full h-8 px-3 rounded-lg border font-mono focus:outline-none"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-slate-300">
                    Loại xác thực *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border font-sans focus:outline-none"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  >
                    <option value="key">Khóa SSH (Private Key)</option>
                    <option value="password">Mật khẩu (Password)</option>
                  </select>
                </div>
              </div>

              {formType === 'key' ? (
                <div>
                  <label className="block mb-1 font-semibold text-slate-300">
                    Đường dẫn Private Key file
                  </label>
                  {sshKeys && sshKeys.length > 0 ? (
                    <div className="space-y-1.5">
                      <select
                        value={formKeyPath}
                        onChange={(e) => setFormKeyPath(e.target.value)}
                        className="w-full h-8 px-2 rounded-lg border font-mono text-xs focus:outline-none"
                        style={{
                          backgroundColor: currentThemeConfig.innerInput,
                          borderColor: currentThemeConfig.border,
                          color: currentThemeConfig.text
                        }}
                      >
                        {sshKeys.map((k) => (
                          <option key={k.id} value={k.path}>{k.name} ({k.path})</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Hoặc nhập đường dẫn tùy chỉnh (e.g. C:\key\id_rsa)"
                        value={formKeyPath}
                        onChange={(e) => setFormKeyPath(e.target.value)}
                        className="w-full h-8 px-3 rounded-lg border font-mono text-[11px] focus:outline-none text-slate-400"
                        style={{
                          backgroundColor: currentThemeConfig.innerInput,
                          borderColor: currentThemeConfig.border,
                        }}
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="C:\Users\username\.ssh\id_rsa hoặc /home/user/.ssh/id_rsa"
                      value={formKeyPath}
                      onChange={(e) => setFormKeyPath(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border font-mono text-[11px] focus:outline-none"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput,
                        borderColor: currentThemeConfig.border,
                        color: currentThemeConfig.text
                      }}
                    />
                  )}
                </div>
              ) : (
                <div>
                  <label className="block mb-1 font-semibold text-slate-300">
                    Mật khẩu / Passphrase
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Nhập mật khẩu an toàn..."
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full h-8 px-3 rounded-lg border font-mono focus:outline-none"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  />
                </div>
              )}

              {/* Host checkboxes */}
              <div>
                <label className="block mb-1.5 font-semibold text-slate-300">
                  Gán vào các máy chủ (Tùy chọn)
                </label>
                <div 
                  className="max-h-28 overflow-y-auto p-2 rounded-lg border grid grid-cols-2 gap-1.5 custom-scroll"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  {machines && machines.length > 0 ? (
                    machines.map((m) => {
                      const isSelected = selectedHosts.includes(m.name || m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleToggleHostSelect(m.name || m.id)}
                          className={`flex items-center gap-2 px-2 py-1 rounded text-left transition-all ${
                            isSelected 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold' 
                              : 'text-slate-400 hover:bg-slate-800 border border-transparent'
                          }`}
                        >
                          <Server size={11} className={isSelected ? 'text-emerald-400' : 'text-slate-500'} />
                          <span className="truncate">{m.name || m.id}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="col-span-2 text-slate-500 italic p-1">Chưa có máy chủ nào</div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: currentThemeConfig.border }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border font-semibold text-slate-400 hover:text-white"
                  style={{ borderColor: currentThemeConfig.border }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg font-bold text-white shadow-sm"
                  style={{ backgroundColor: accentColor }}
                >
                  Lưu Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!identityToDelete}
        title="Xác nhận xóa tài khoản SSH"
        message="Bạn có chắc muốn xóa tài khoản xác thực này? Thao tác này không thể hoàn tác."
        itemName={identityToDelete?.name || identityToDelete?.username}
        confirmText="Xóa tài khoản"
        cancelText="Hủy"
        onConfirm={() => {
          if (identityToDelete) {
            onDeleteIdentity(identityToDelete.id);
            setIdentityToDelete(null);
          }
        }}
        onCancel={() => setIdentityToDelete(null)}
        settings={settings}
      />
    </div>
  );
}
