import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Plus, 
  Copy, 
  Trash2, 
  Check, 
  ShieldCheck, 
  Lock, 
  Search,
  Server,
  RotateCw,
  FolderOpen,
  Sparkles,
  X,
  LayoutList,
  LayoutGrid
} from 'lucide-react';
import { DEFAULT_DISCOVERED_SSH } from '../../services/sshDiscovery';
import { THEME_CONFIGS } from '../../constants/palettes';
import DataTable, { TableActionButton } from '../common/DataTable';
import ConfirmModal from '../common/ConfirmModal';

export default function KeychainView({ 
  keys = DEFAULT_DISCOVERED_SSH.keys, 
  sshDirs = DEFAULT_DISCOVERED_SSH.sshDirs,
  onRescan, 
  onAddNewKey,
  onDeleteKey,
  settings
}) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const isLight = !!currentThemeConfig?.isLight;
  const accentColor = settings?.accentColor || '#10b981';
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (!isAddModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen]);
  const [keyToDelete, setKeyToDelete] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('service_tool_keychain_view_mode') || 'list';
    } catch (_) {
      return 'list';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('service_tool_keychain_view_mode', mode);
    } catch (_) {}
  };
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState('ED25519');
  const [privateContent, setPrivateContent] = useState('');
  const [isRescanning, setIsRescanning] = useState(false);

  const handleCopy = (id, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTriggerRescan = async () => {
    setIsRescanning(true);
    if (onRescan) await onRescan();
    setTimeout(() => setIsRescanning(false), 600);
  };

  const handleAutoGenerateKey = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const keyName = `id_${newKeyType.toLowerCase().replace(/\s+/g, '')}_${randomSuffix}`;
    setNewKeyName(keyName);
    setPrivateContent(
      `-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gt\nZWQyNTUxOQAAACD${Math.random().toString(36).substring(2, 20)}==\n-----END OPENSSH PRIVATE KEY-----`
    );
  };

  const filteredKeys = keys.filter(
    (k) =>
      (k.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (k.path || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className="flex-1 p-6 overflow-y-auto space-y-5 custom-scroll"
      style={{ backgroundColor: currentThemeConfig.bg }}
    >
      {/* Top Source Banner */}
      <div 
        className="flex items-center justify-between p-3 rounded-xl border text-xs"
        style={{ 
          backgroundColor: currentThemeConfig.card, 
          borderColor: currentThemeConfig.border 
        }}
      >
        <div className={`flex items-center gap-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
          <FolderOpen size={15} className="text-emerald-500 flex-shrink-0" />
          <span>Thư mục SSH mặc định:</span>
          <span className={`font-mono font-semibold px-2 py-0.5 rounded border ${
            isLight 
              ? 'text-emerald-800 bg-emerald-50 border-emerald-300' 
              : 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40'
          }`}>
            {sshDirs[0] || '~/.ssh'}
          </span>
          <span className="text-slate-500 hidden md:inline">({keys.length} keys tự động nhận diện)</span>
        </div>

        <button
          onClick={handleTriggerRescan}
          disabled={isRescanning}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
            isLight 
              ? 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-sky-700 hover:text-sky-900' 
              : 'bg-[#101c2e] hover:bg-[#182a44] border border-[#1f3554] text-sky-300 hover:text-white'
          }`}
          title="Đọc lại các khóa SSH từ thư mục ~/.ssh"
        >
          <RotateCw size={12} className={isRescanning ? 'animate-spin text-sky-400' : ''} />
          <span>Quét lại ~/.ssh</span>
        </button>
      </div>

      {/* Header */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b"
        style={{ borderColor: currentThemeConfig.border }}
      >
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 font-sans" style={{ color: currentThemeConfig.text }}>
            <KeyRound size={16} className="text-emerald-500" />
            <span>Keychain (Kho Khóa & Chứng Chỉ SSH) ({keys.length})</span>
          </h2>
          <p className="text-xs mt-1 font-sans" style={{ color: currentThemeConfig.textMuted }}>
            Tự động đọc và đồng bộ private/public keys từ thư mục OpenSSH mặc định của hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle: List vs Grid */}
          <div 
            className="flex items-center p-0.5 rounded-xl border"
            style={{ 
              backgroundColor: currentThemeConfig.innerInput, 
              borderColor: currentThemeConfig.border 
            }}
          >
            <button
              onClick={() => handleSetViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? (isLight ? 'bg-emerald-600 text-white font-bold' : 'bg-emerald-500/20 text-emerald-400')
                  : (isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white')
              }`}
              title="Dạng danh sách (List View)"
            >
              <LayoutList size={14} />
            </button>
            <button
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? (isLight ? 'bg-emerald-600 text-white font-bold' : 'bg-emerald-500/20 text-emerald-400')
                  : (isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white')
              }`}
              title="Dạng thẻ lưới (Grid View)"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm SSH key..."
              className="w-52 h-8 border rounded-xl pl-8 pr-3 text-xs placeholder-slate-500 font-mono focus:outline-none"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.text
              }}
            />
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] active:scale-95"
          >
            <Plus size={14} />
            <span>Thêm Key Mới</span>
          </button>
        </div>
      </div>

      {/* Keys List */}
      {filteredKeys.length === 0 ? (
        <div 
          className="p-8 rounded-2xl border text-center space-y-3"
          style={{ 
            backgroundColor: currentThemeConfig.card, 
            borderColor: currentThemeConfig.border 
          }}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            <KeyRound size={22} />
          </div>
          <div className="text-sm font-semibold" style={{ color: currentThemeConfig.text }}>Chưa có khóa SSH nào được tìm thấy</div>
          <p className="text-xs max-w-md mx-auto" style={{ color: currentThemeConfig.textMuted }}>
            Thư mục <code className="text-emerald-500 font-mono">{sshDirs[0] || '%USERPROFILE%\\.ssh'}</code> hiện không chứa file private key nào (chỉ có config/known_hosts). Bạn có thể bấm nút &quot;Thêm Key Mới&quot; hoặc bật &quot;WSL Integration&quot; trong Cài Đặt nếu muốn nạp khóa từ WSL.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)]"
          >
            <Plus size={14} />
            <span>Thêm Key Mới</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <DataTable
          columns={[
            {
              key: 'name',
              label: 'TÊN KHÓA',
              render: (k) => (
                <div className="font-bold text-xs flex items-center gap-2" style={{ color: currentThemeConfig.text }}>
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>{k.name}</span>
                </div>
              )
            },
            {
              key: 'type',
              label: 'LOẠI',
              width: 'w-28',
              render: (k) => (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  isLight 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold' 
                    : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/40'
                }`}>
                  {k.keyType || k.type || 'ED25519'}
                </span>
              )
            },
            {
              key: 'fingerprint',
              label: 'FINGERPRINT',
              className: `font-mono text-[11px] max-w-[200px] truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`,
              render: (k) => <span title={k.fingerprint}>{k.fingerprint}</span>
            },
            {
              key: 'path',
              label: 'ĐƯỜNG DẪN',
              className: `font-mono text-[11px] hidden md:table-cell max-w-[180px] truncate ${isLight ? 'text-slate-500' : 'text-slate-500'}`,
              render: (k) => <span title={k.path}>{k.path || '-'}</span>
            },
            {
              key: 'security',
              label: 'BẢO MẬT',
              className: 'hidden lg:table-cell',
              render: (k) => k.hasPassphrase ? (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                  isLight 
                    ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold' 
                    : 'bg-amber-950/60 text-amber-400 border-amber-800/40'
                }`}>
                  <Lock size={10} /> Passphrase
                </span>
              ) : (
                <span className="text-[10px] font-mono text-slate-500">No Passphrase</span>
              )
            },
            {
              key: 'actions',
              label: 'THAO TÁC',
              align: 'right',
              render: (k) => (
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleCopy(k.id, k.publicKey)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isLight 
                        ? 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 hover:text-slate-900' 
                        : 'bg-[#0e1422] hover:bg-[#151f33] border border-[#1f2b42] text-slate-300 hover:text-white'
                    }`}
                    title="Sao chép Public Key"
                  >
                    {copiedId === k.id ? (
                      <>
                        <Check size={12} className="text-emerald-500" />
                        <span className="text-emerald-600 text-[11px] font-semibold">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span className="text-[11px]">Copy Pubkey</span>
                      </>
                    )}
                  </button>
                  {onDeleteKey && (
                    <TableActionButton
                      icon={Trash2}
                      variant="danger"
                      onClick={() => setKeyToDelete(k)}
                      title="Xóa khóa"
                      className="w-7 h-7 !px-0"
                    />
                  )}
                </div>
              )
            }
          ]}
          data={filteredKeys}
          themeConfig={currentThemeConfig}
          emptyMessage="Chưa có SSH key nào."
          footer={(
            <div className="flex items-center justify-between w-full">
              <span>Tổng: <strong style={{ color: currentThemeConfig.text }}>{filteredKeys.length}</strong> SSH Keys</span>
              <span className="text-[11px] text-slate-500">Tự động đồng bộ từ thư mục .ssh hệ thống</span>
            </div>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredKeys.map((k) => (
            <div
              key={k.id}
              className="p-4 rounded-xl border hover:border-emerald-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              style={{
                backgroundColor: currentThemeConfig.card,
                borderColor: currentThemeConfig.border
              }}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 flex-shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm font-sans" style={{ color: currentThemeConfig.text }}>{k.name}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isLight 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold' 
                        : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/40'
                    }`}>
                      {k.keyType || k.type || 'ED25519'}
                    </span>
                    {k.hasPassphrase && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                        isLight 
                          ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold' 
                          : 'bg-amber-950/60 text-amber-400 border-amber-800/40'
                      }`}>
                        <Lock size={10} /> Passphrase
                      </span>
                    )}
                    {k.path && (
                      <span className="text-[10.5px] font-mono text-slate-500 hidden lg:inline">
                        ({k.path})
                      </span>
                    )}
                  </div>
                  <div className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{k.fingerprint}</div>
                  {k.associatedHosts && k.associatedHosts.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-slate-500 font-sans">Gán cho máy chủ:</span>
                      {k.associatedHosts.map((h, i) => (
                        <span
                          key={i}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                            isLight
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-[#131b2e] text-slate-300 border-[#1f2c4a]'
                          }`}
                        >
                          <Server size={9} className="text-sky-500" />
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  onClick={() => handleCopy(k.id, k.publicKey)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 hover:text-slate-900' 
                      : 'bg-[#0e1422] hover:bg-[#151f33] border border-[#1f2b42] text-slate-300 hover:text-white'
                  }`}
                  title="Sao chép Public Key để dán vào authorized_keys"
                >
                  {copiedId === k.id ? (
                    <>
                      <Check size={13} className="text-emerald-500" />
                      <span className="text-emerald-600 font-semibold">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy Pubkey</span>
                    </>
                  )}
                </button>

                {onDeleteKey && (
                  <button
                    onClick={() => setKeyToDelete(k)}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                      isLight
                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border-rose-200'
                        : 'bg-red-950/30 text-red-400 hover:bg-red-900/50 border-red-900/40'
                    }`}
                    title="Xóa khóa khỏi app"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div 
            className="rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 border"
            style={{
              backgroundColor: currentThemeConfig.card,
              borderColor: currentThemeConfig.border
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: currentThemeConfig.border }}>
              <h3 className="font-bold text-base font-sans" style={{ color: currentThemeConfig.text }}>Thêm SSH Key Mới</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg transition-colors hover:bg-slate-500/20"
                style={{ color: currentThemeConfig.textMuted }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: currentThemeConfig.textMuted }}>Chưa có khóa?</span>
                <button
                  type="button"
                  onClick={handleAutoGenerateKey}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600/20 text-emerald-500 border border-emerald-500/40 rounded-lg text-xs font-medium hover:bg-emerald-600/30 transition-all"
                >
                  <Sparkles size={12} />
                  <span>Tự động sinh khóa ngẫu nhiên</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 font-sans" style={{ color: currentThemeConfig.text }}>Tên Key</label>
                <input
                  type="text"
                  placeholder="e.g. id_ed25519_deploy"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full h-10 border rounded-xl px-3 text-xs placeholder-slate-500 focus:outline-none font-mono"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 font-sans" style={{ color: currentThemeConfig.text }}>Loại Khóa</label>
                <select
                  value={newKeyType}
                  onChange={(e) => setNewKeyType(e.target.value)}
                  className="w-full h-10 border rounded-xl px-3 text-xs focus:outline-none font-sans"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                >
                  <option value="ED25519">ED25519 (Khuyên dùng - Nhanh & An toàn nhất)</option>
                  <option value="RSA 4096">RSA 4096-bit (Tương thích máy chủ cũ)</option>
                  <option value="ECDSA 521">ECDSA 521</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 font-sans" style={{ color: currentThemeConfig.text }}>
                  Private Key (Dán nội dung khóa)
                </label>
                <textarea
                  value={privateContent}
                  onChange={(e) => setPrivateContent(e.target.value)}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."
                  rows={4}
                  className="w-full border rounded-xl p-3 text-xs placeholder-slate-400 font-mono focus:outline-none resize-none"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: currentThemeConfig.border }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl transition-all font-sans"
                  style={{ color: currentThemeConfig.textMuted }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newKeyName.trim()) return;
                    if (onAddNewKey) {
                      onAddNewKey({
                        id: 'k_' + Date.now(),
                        name: newKeyName.trim(),
                        keyType: newKeyType,
                        fingerprint: 'SHA256:' + Math.random().toString(36).substring(2, 14),
                        associatedHosts: [],
                        hasPassphrase: false,
                        created: new Date().toISOString().split('T')[0],
                        publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...' + newKeyName,
                      });
                    }
                    setNewKeyName('');
                    setPrivateContent('');
                    setIsAddModalOpen(false);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all font-sans"
                >
                  Lưu Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!keyToDelete}
        title="Xác nhận xóa khóa SSH"
        message="Bạn có chắc muốn xóa khóa SSH này khỏi hệ thống? Thao tác này không thể hoàn tác."
        itemName={keyToDelete?.name}
        confirmText="Xóa khóa"
        cancelText="Hủy"
        onConfirm={() => {
          if (keyToDelete && onDeleteKey) {
            onDeleteKey(keyToDelete.id);
            setKeyToDelete(null);
          }
        }}
        onCancel={() => setKeyToDelete(null)}
        settings={settings}
      />
    </div>
  );
}
