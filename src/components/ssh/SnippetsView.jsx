import React, { useState, useEffect, useRef } from 'react';
import { 
  Code2, 
  Plus, 
  Copy, 
  Trash2, 
  Check, 
  Tag, 
  Search,
  X,
  LayoutList,
  LayoutGrid,
  Download,
  Upload,
  FileText,
  AlertCircle
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

export default function SnippetsView({ settings }) {
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

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importMode, setImportMode] = useState('merge'); // 'merge' or 'overwrite'
  const [importError, setImportError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    if (!isAddModalOpen && !isImportModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsAddModalOpen(false);
        setIsImportModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, isImportModalOpen]);

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
    showToast('Đã xóa snippet thành công');
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
    showToast(`Đã thêm snippet "${newSnippet.name}"`);
  };

  // Export Snippets to JSON
  const handleExportJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snippets, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `snippets-backup-${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`Đã xuất ${snippets.length} snippets ra file JSON`);
    } catch (e) {
      console.error('Export failed:', e);
      showToast('Lỗi khi xuất file: ' + e.message);
    }
  };

  // Handle file input for Import
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setImportJsonText(content);
        setImportError('');
      }
    };
    reader.onerror = () => {
      setImportError('Không thể đọc file đã chọn.');
    };
    reader.readAsText(file);
    // Reset file input so same file can be selected again
    e.target.value = '';
  };

  // Process Import Confirmation
  const handleConfirmImport = () => {
    setImportError('');
    if (!importJsonText.trim()) {
      setImportError('Vui lòng chọn file JSON hoặc dán nội dung JSON vào khung nhập.');
      return;
    }

    try {
      let parsed = JSON.parse(importJsonText.trim());
      // Support { snippets: [...] } or direct array [...]
      if (!Array.isArray(parsed) && parsed && Array.isArray(parsed.snippets)) {
        parsed = parsed.snippets;
      }

      if (!Array.isArray(parsed)) {
        setImportError('Dữ liệu JSON không hợp lệ. Phải là một mảng danh sách các snippet.');
        return;
      }

      const validList = parsed.filter(item => item && (item.command || item.cmd) && (item.name || item.title)).map((item, idx) => ({
        id: item.id || `imported_${Date.now()}_${idx}`,
        name: String(item.name || item.title || 'Snippet Không Tên').trim(),
        command: String(item.command || item.cmd || '').trim(),
        category: String(item.category || item.group || 'System').trim(),
        description: String(item.description || item.desc || '').trim()
      }));

      if (validList.length === 0) {
        setImportError('Không tìm thấy snippet hợp lệ nào (mỗi snippet cần có "name" và "command").');
        return;
      }

      let finalList = [];
      if (importMode === 'overwrite') {
        finalList = validList;
      } else {
        // Merge mode: append new snippets that don't match existing name & command
        const existingMap = new Set(snippets.map(s => `${s.name.toLowerCase()}:::${s.command.trim()}`));
        const newUnique = validList.filter(s => !existingMap.has(`${s.name.toLowerCase()}:::${s.command.trim()}`));
        finalList = [...snippets, ...newUnique];
      }

      saveSnippets(finalList);
      setIsImportModalOpen(false);
      setImportJsonText('');
      setImportError('');
      showToast(`Đã nhập thành công ${validList.length} snippets (${importMode === 'overwrite' ? 'Ghi đè' : 'Gộp thêm'})`);
    } catch (err) {
      setImportError('Cú pháp JSON không hợp lệ: ' + err.message);
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check size={14} className="text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".json" 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#161e2e]">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Code2 size={16} className="text-emerald-400" />
            <span>Snippets (Kho Đoạn Lệnh & Kịch Bản Nhanh) ({snippets.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Lưu trữ câu lệnh thường dùng, quản lý, sao lưu Import / Export và sao chép 1-click.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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

          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm câu lệnh..."
              className="w-40 sm:w-48 h-8 bg-[#0c101c] border border-[#1a2438] rounded-xl pl-8 pr-3 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Export JSON Button */}
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 h-8 px-2.5 bg-[#0c101c] hover:bg-[#161f30] border border-[#1a2438] text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Xuất danh sách snippets ra file JSON"
          >
            <Download size={13} className="text-sky-400" />
            <span>Export JSON</span>
          </button>

          {/* Import JSON Button */}
          <button
            onClick={() => {
              setImportJsonText('');
              setImportError('');
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 h-8 px-2.5 bg-[#0c101c] hover:bg-[#161f30] border border-[#1a2438] text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Nhập snippets từ file JSON hoặc dán text"
          >
            <Upload size={13} className="text-amber-400" />
            <span>Import JSON</span>
          </button>

          {/* Add Snippet Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] active:scale-95 cursor-pointer"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#101626] hover:bg-[#18233c] border border-[#1c2942] text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer shadow-sm"
                    title="Sao chép câu lệnh"
                  >
                    {copiedId === s.id ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span className="text-emerald-400 text-[11px] font-semibold">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span className="text-[11px]">Copy Lệnh</span>
                      </>
                    )}
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
              <span className="text-[11px] text-slate-500">Bấm Copy để sao chép nhanh câu lệnh vào clipboard</span>
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

              <div className="flex items-center justify-between pt-2.5 border-t border-[#141b2c]">
                <span className="text-[10.5px] text-slate-500 font-sans">
                  Sao chép 1-click & sử dụng
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(s.id, s.command)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#101626] hover:bg-[#18233c] border border-[#1c2942] text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer shadow-sm"
                    title="Copy command to clipboard"
                  >
                    {copiedId === s.id ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span className="text-emerald-400 text-[11px] font-semibold">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span className="text-[11px]">Copy Lệnh</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import Snippets Modal */}
      {isImportModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setIsImportModalOpen(false)}
        >
          <div 
            className="bg-[#121622] border border-[#1e2638] rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2436]">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-amber-400" />
                <h3 className="font-bold text-base text-white">Import Danh Sách Snippets</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-[#1a2336] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* File Upload Trigger */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#090d16] border border-[#1e273a]">
              <div>
                <div className="text-xs font-semibold text-white">Tải lên từ file .JSON</div>
                <div className="text-[11px] text-slate-400">Chọn file sao lưu backup snippets có sẵn trên máy</div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <FileText size={13} />
                <span>Chọn File JSON</span>
              </button>
            </div>

            {/* Paste JSON Text Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Hoặc dán nội dung JSON vào đây:
                </label>
                {importJsonText && (
                  <button
                    type="button"
                    onClick={() => setImportJsonText('')}
                    className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                  >
                    Xóa trắng
                  </button>
                )}
              </div>
              <textarea
                rows={6}
                value={importJsonText}
                onChange={(e) => {
                  setImportJsonText(e.target.value);
                  setImportError('');
                }}
                placeholder={`[\n  {\n    "name": "Check Docker",\n    "command": "docker ps",\n    "category": "Docker"\n  }\n]`}
                className="w-full bg-[#090d16] border border-[#1e273a] rounded-xl p-3 text-xs text-emerald-400 placeholder-slate-600 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Import Mode Options */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Chế độ nhập dữ liệu:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label 
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    importMode === 'merge' 
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-white' 
                      : 'bg-[#090d16] border-[#1e273a] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Gộp thêm (Merge)</div>
                    <div className="text-[10.5px] text-slate-400 leading-snug mt-0.5">
                      Giữ nguyên {snippets.length} snippets hiện có, chỉ thêm các snippet mới.
                    </div>
                  </div>
                </label>

                <label 
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    importMode === 'overwrite' 
                      ? 'bg-rose-950/30 border-rose-500/50 text-white' 
                      : 'bg-[#090d16] border-[#1e273a] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="overwrite"
                    checked={importMode === 'overwrite'}
                    onChange={() => setImportMode('overwrite')}
                    className="mt-0.5 accent-rose-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Ghi đè tất cả (Replace)</div>
                    <div className="text-[10.5px] text-slate-400 leading-snug mt-0.5">
                      Thay thế toàn bộ kho hiện tại bằng danh sách mới từ file nhập.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Error Message */}
            {importError && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-mono">
                <AlertCircle size={14} className="flex-shrink-0 text-rose-400" />
                <span>{importError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1c2436]">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-[#1a2336] transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all cursor-pointer active:scale-95"
              >
                <Upload size={13} />
                <span>Xác Nhận Import</span>
              </button>
            </div>
          </div>
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
