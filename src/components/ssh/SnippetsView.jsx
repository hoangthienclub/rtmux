import React, { useState } from 'react';
import { 
  Code2, 
  Plus, 
  Play, 
  Copy, 
  Trash2, 
  Check, 
  Tag, 
  Terminal,
  Search,
  Server,
  X,
  LayoutList,
  LayoutGrid
} from 'lucide-react';

import { THEME_CONFIGS } from '../../constants/palettes';
import DataTable, { TableActionButton } from '../common/DataTable';
import ConfirmModal from '../common/ConfirmModal';

const INITIAL_SNIPPETS = [
  {
    id: 's1',
    name: 'Kiểm tra Container Docker đang chạy',
    command: 'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"',
    category: 'Docker',
    description: 'Liệt kê danh sách các container kèm cổng port đang bind.',
  },
  {
    id: 's2',
    name: 'Xem Log Realtime Nginx Error',
    command: 'tail -n 100 -f /var/log/nginx/error.log',
    category: 'Logs',
    description: 'Theo dõi 100 dòng log lỗi mới nhất của Nginx.',
  },
  {
    id: 's3',
    name: 'Kiểm tra Tài Nguyên RAM & CPU',
    command: 'htop || top -b -n 1 | head -n 20',
    category: 'System',
    description: 'Xem mức độ tiêu thụ RAM, CPU và tiến trình đang chiếm tài nguyên.',
  },
  {
    id: 's4',
    name: 'Dọn dẹp Docker Dangling Images & Cache',
    command: 'docker system prune -af --volumes',
    category: 'Docker',
    description: 'Xóa toàn bộ container đã tắt, volumes thừa và cache image.',
  },
  {
    id: 's5',
    name: 'Khởi động lại Service Systemd',
    command: 'sudo systemctl restart nginx && sudo systemctl status nginx',
    category: 'System',
    description: 'Restart dịch vụ web server và kiểm tra ngay trạng thái active.',
  },
  {
    id: 's6',
    name: 'Kiểm tra kết nối PostgreSQL DB',
    command: 'pg_isready -h 127.0.0.1 -p 5432 || ps aux | grep postgres',
    category: 'Database',
    description: 'Kiểm tra socket và tiến trình Postgres đang lắng nghe trên cổng 5432.',
  },
  {
    id: 's7',
    name: 'Dung lượng ổ cứng chi tiết',
    command: 'df -h -x tmpfs -x devtmpfs',
    category: 'System',
    description: 'Hiển thị dung lượng đã dùng / còn trống trên các phân vùng đĩa vật lý.',
  },
];

export default function SnippetsView({ onRunSnippet, machines = [], settings }) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';
  const [snippets, setSnippets] = useState(() => {
    try {
      const saved = localStorage.getItem('service_tool_snippets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SNIPPETS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMachineId, setSelectedMachineId] = useState(machines[0]?.id || 'clt_dev1');
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('service_tool_snippets_view_mode') || 'list';
    } catch (_) {
      return 'list';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('service_tool_snippets_view_mode', mode);
    } catch (_) {}
  };

  // Modal
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
  const [snippetToDelete, setSnippetToDelete] = useState(null);
  const [newName, setNewName] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [newCategory, setNewCategory] = useState('Docker');
  const [newDescription, setNewDescription] = useState('');

  const categories = ['ALL', 'Docker', 'System', 'Logs', 'Database'];

  const saveSnippets = (next) => {
    setSnippets(next);
    try {
      localStorage.setItem('service_tool_snippets', JSON.stringify(next));
    } catch {}
  };

  const handleCopy = (id, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id) => {
    const next = snippets.filter((s) => s.id !== id);
    saveSnippets(next);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newCommand.trim()) return;

    const newSnippet = {
      id: `snip_${Date.now()}`,
      name: newName.trim(),
      command: newCommand.trim(),
      category: newCategory,
      description: newDescription.trim() || 'Đoạn lệnh tùy chỉnh bởi người dùng',
    };

    saveSnippets([newSnippet, ...snippets]);
    setNewName('');
    setNewCommand('');
    setNewDescription('');
    setIsAddModalOpen(false);
  };

  const handleExecute = (cmd) => {
    const targetMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];
    if (onRunSnippet) {
      onRunSnippet(cmd, targetMachine);
    }
  };

  const filteredSnippets = snippets.filter((s) => {
    const matchCat = selectedCategory === 'ALL' || s.category === selectedCategory;
    const matchQuery =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scroll bg-[#070b14]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#161e2e]">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Code2 size={16} className="text-emerald-400" />
            <span>Snippets (Kho Đoạn Lệnh & Kịch Bản Nhanh) ({snippets.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Lưu trữ câu lệnh thường dùng, chạy trực tiếp vào SSH Terminal của máy chủ đã chọn hoặc copy 1 click.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Target Host Select */}
          {machines.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#0c101c] border border-[#1a2438] rounded-xl px-2.5 py-1">
              <Server size={12} className="text-emerald-400" />
              <select
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                className="bg-transparent text-xs text-white font-mono focus:outline-none"
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#0c101c]">
                    Chạy trên: {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* View Mode Toggle: List vs Grid */}
          <div className="flex items-center p-0.5 rounded-xl border border-[#1a2438] bg-[#0c101c]">
            <button
              onClick={() => handleSetViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Dạng danh sách (List View)"
            >
              <LayoutList size={14} />
            </button>
            <button
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-white'
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
              placeholder="Tìm câu lệnh..."
              className="w-48 h-8 bg-[#0c101c] border border-[#1a2438] rounded-xl pl-8 pr-3 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] active:scale-95"
          >
            <Plus size={14} />
            <span>Thêm Snippet</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedCategory === cat
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'bg-[#0d121f] text-slate-400 hover:text-white border border-[#172133]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Snippets Display: List View vs Grid View */}
      {viewMode === 'list' ? (
        <DataTable
          columns={[
            {
              key: 'name',
              label: 'TÊN SNIPPET',
              render: (s) => (
                <div>
                  <div className="font-bold text-white text-xs">{s.name}</div>
                  {s.description && (
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{s.description}</div>
                  )}
                </div>
              )
            },
            {
              key: 'category',
              label: 'DANH MỤC',
              width: 'w-28',
              render: (s) => (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#131b2e] text-emerald-400 border border-[#1f2c4a]">
                  {s.category}
                </span>
              )
            },
            {
              key: 'command',
              label: 'LỆNH (COMMAND)',
              className: 'font-mono text-emerald-300 text-[11px] max-w-[280px] truncate select-all',
              render: (s) => <span title={s.command}>{s.command}</span>
            },
            {
              key: 'actions',
              label: 'THAO TÁC',
              align: 'right',
              render: (s) => (
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleCopy(s.id, s.command)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-[#101626] hover:bg-[#18233c] border border-[#1c2942] text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all"
                    title="Copy command"
                  >
                    {copiedId === s.id ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span className="text-emerald-400 text-[11px]">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span className="text-[11px]">Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleExecute(s.command)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                    title="Chạy trên terminal máy chủ"
                  >
                    <Play size={11} className="fill-white" />
                    <span className="text-[11px]">Chạy</span>
                  </button>
                  <TableActionButton
                    icon={Trash2}
                    variant="danger"
                    onClick={() => setSnippetToDelete(s)}
                    title="Xóa snippet"
                    className="w-7 h-7 !px-0"
                  />
                </div>
              )
            }
          ]}
          data={filteredSnippets}
          themeConfig={currentThemeConfig}
          emptyMessage="Không tìm thấy snippet nào."
          footer={(
            <div className="flex items-center justify-between w-full">
              <span>Tổng: <strong style={{ color: currentThemeConfig.text }}>{filteredSnippets.length}</strong> lệnh snippets</span>
              <span className="text-[11px] text-slate-500">Bấm Chạy để gửi lệnh trực tiếp vào Terminal</span>
            </div>
          )}
        />
      ) : (
        /* Snippet Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSnippets.map((s) => (
            <div
              key={s.id}
              className="bg-[#0b0f1a] border border-[#161f30] hover:border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all group shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                      {s.name}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#131b2e] text-emerald-400 border border-[#1f2c4a] inline-block mt-1">
                      {s.category}
                    </span>
                  </div>

                  <button
                    onClick={() => setSnippetToDelete(s)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 rounded transition-all"
                    title="Xóa snippet"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {s.description && (
                  <p className="text-xs text-slate-400 mb-3">{s.description}</p>
                )}

                {/* Code Command Box */}
                <div className="p-2.5 rounded-xl bg-[#060810] border border-[#141a27] font-mono text-xs text-emerald-300 break-all select-all mb-3.5">
                  {s.command}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#141b2c]">
                <span className="text-[10.5px] text-slate-500 font-sans">
                  Chạy ngay vào Terminal
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(s.id, s.command)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-[#101626] hover:bg-[#18233c] border border-[#1c2942] text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all"
                    title="Copy command to clipboard"
                  >
                    {copiedId === s.id ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span className="text-emerald-400 text-[11px]">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span className="text-[11px]">Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleExecute(s.command)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                    title="Chạy trên terminal máy chủ"
                  >
                    <Play size={12} className="fill-white" />
                    <span className="text-[11px]">Chạy Terminal</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Snippet Modal */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div 
            className="bg-[#121622] border border-[#1e2638] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2436] mb-4">
              <h3 className="font-bold text-base text-white">Thêm Đoạn Lệnh Snippet</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-[#1a2336]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tên đoạn lệnh
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Restart PM2 Application"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-9 bg-[#090d16] border border-[#1e273a] rounded-xl px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nhóm danh mục
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full h-9 bg-[#090d16] border border-[#1e273a] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Docker">Docker</option>
                  <option value="System">System</option>
                  <option value="Logs">Logs</option>
                  <option value="Database">Database</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Câu lệnh thực thi (Command)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. pm2 restart all && pm2 status"
                  value={newCommand}
                  onChange={(e) => setNewCommand(e.target.value)}
                  className="w-full bg-[#090d16] border border-[#1e273a] rounded-xl p-3 text-xs text-emerald-400 placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mô tả ngắn
                </label>
                <input
                  type="text"
                  placeholder="e.g. Khởi động lại toàn bộ app NodeJS"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full h-9 bg-[#090d16] border border-[#1e273a] rounded-xl px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#1c2436]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-[#1a2336] transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all"
                >
                  Lưu Snippet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!snippetToDelete}
        title="Xác nhận xóa lệnh Snippet"
        message="Bạn có chắc muốn xóa đoạn lệnh snippet này? Thao tác này không thể hoàn tác."
        itemName={snippetToDelete?.name}
        confirmText="Xóa Snippet"
        cancelText="Hủy"
        onConfirm={() => {
          if (snippetToDelete) {
            handleDelete(snippetToDelete.id);
            setSnippetToDelete(null);
          }
        }}
        onCancel={() => setSnippetToDelete(null)}
        settings={settings}
      />
    </div>
  );
}
