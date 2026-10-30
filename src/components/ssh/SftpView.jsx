import React, { useState, useEffect, useCallback } from 'react';
import { 
  FolderSync, 
  Folder, 
  FileText, 
  Download, 
  Upload, 
  RefreshCw, 
  Home, 
  ArrowUp,
  Server,
  FileCode,
  HardDrive,
  Trash2,
  Edit3,
  Search,
  Plus,
  Terminal,
  Lock,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  X,
  Laptop,
  Check,
  Clock,
  ArrowRight,
  Settings,
  ShieldCheck,
  FolderPlus,
  FilePlus,
  ExternalLink,
  Unplug,
  Zap,
  RotateCw,
  Archive,
  Image,
  ArrowLeftRight,
  Sliders
} from 'lucide-react';
import { THEME_CONFIGS } from '../../constants/palettes';
import { translations } from '../../i18n/translations';
import FileEditorModal from './FileEditorModal';
import ConfirmModal from '../common/ConfirmModal';
import { 
  listLocalDirectory, 
  listRemoteDirectory, 
  transferSftpFile, 
  remoteFsAction, 
  localFsAction,
  probeSshHost 
} from '../../services/sshClient';

// Fallback initial lists
const FALLBACK_LOCAL = [
  { name: '..', isDir: true, size: '-', perms: 'Parent', modified: '' }
];
const FALLBACK_REMOTE = [
  { name: '..', isDir: true, size: '-', perms: 'Parent', modified: '' }
];

export const isItemFolder = (item) => Boolean(
  item && (item.size === '-' || item.name === '..' || item.isDir || item.is_dir || (item.perms && item.perms.startsWith('d')))
);

export const renderFileIcon = (file, isDir) => {
  if (isDir || file?.name === '..') {
    return <Folder size={15} className="text-amber-400 flex-shrink-0" />;
  }
  const name = file?.name?.toLowerCase() || '';
  if (
    name.endsWith('.yml') || name.endsWith('.yaml') || 
    name.endsWith('.json') || name.endsWith('.js') || 
    name.endsWith('.jsx') || name.endsWith('.ts') || 
    name.endsWith('.tsx') || name.endsWith('.py') || 
    name.endsWith('.sh') || name.endsWith('.bash') || 
    name.endsWith('.rs') || name.endsWith('.html') || 
    name.endsWith('.css') || name.endsWith('.sql')
  ) {
    return <FileCode size={15} className="text-sky-400 flex-shrink-0" />;
  }
  if (name.endsWith('.env') || name.endsWith('.conf') || name.endsWith('.toml') || name.endsWith('.ini') || name.endsWith('.cfg')) {
    return <Sliders size={15} className="text-emerald-400 flex-shrink-0" />;
  }
  if (name.endsWith('.zip') || name.endsWith('.tar') || name.endsWith('.gz') || name.endsWith('.tgz') || name.endsWith('.7z') || name.endsWith('.rar')) {
    return <Archive size={15} className="text-purple-400 flex-shrink-0" />;
  }
  if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif') || name.endsWith('.svg') || name.endsWith('.webp')) {
    return <Image size={15} className="text-pink-400 flex-shrink-0" />;
  }
  return <FileText size={15} className="text-slate-400 flex-shrink-0" />;
};

export default function SftpView({ 
  machines = [], 
  preselectedHost = null,
  settings = {},
  onOpenTerminal
}) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';
  const lang = settings?.language || 'vi';
  const t = translations[lang] || translations.vi;

  // Selected Machine / Remote Host
  const [selectedHostId, setSelectedHostId] = useState(() => {
    if (preselectedHost) return preselectedHost.id;
    return machines[0]?.id || 'clt_dev1';
  });

  const currentMachine = machines.find((m) => m.id === selectedHostId) || machines[0] || {
    id: 'clt_dev1',
    name: 'clt_dev1',
    host: 'root@10.0.68.109:22',
    user: 'root',
    hostname: '10.0.68.109',
    port: 22
  };

  // Connection State: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'
  const [connectionStatus, setConnectionStatus] = useState(preselectedHost ? 'CONNECTED' : 'DISCONNECTED');
  const [authMethod, setAuthMethod] = useState('key'); // 'key' | 'password'
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Path Navigation
  const [localPath, setLocalPath] = useState('C:\\Users\\thien.tranhoang');
  const [remotePath, setRemotePath] = useState('/root');

  const isWsl = !!(settings?.enableWsl);
  const targetHost = currentMachine.name || currentMachine.host;

  // Real File Lists
  const [localFiles, setLocalFiles] = useState([]);
  const [remoteFiles, setRemoteFiles] = useState([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);

  // Search & Filters
  const [localSearch, setLocalSearch] = useState('');
  const [remoteSearch, setRemoteSearch] = useState('');

  // Selected Items
  const [selectedLocalFile, setSelectedLocalFile] = useState(null);
  const [selectedRemoteFile, setSelectedRemoteFile] = useState(null);

  // Load Real Local Directory
  const loadLocalDir = useCallback(async (dirPath) => {
    setIsLoadingLocal(true);
    try {
      const res = await listLocalDirectory(dirPath);
      if (Array.isArray(res) && res.length > 0) {
        setLocalFiles(res);
      }
    } catch (e) {
      console.warn('loadLocalDir error:', e);
    } finally {
      setIsLoadingLocal(false);
    }
  }, []);

  // Load Real Remote Directory via SSH
  const loadRemoteDir = useCallback(async (dirPath) => {
    if (connectionStatus !== 'CONNECTED') return;
    setIsLoadingRemote(true);
    try {
      const res = await listRemoteDirectory(targetHost, dirPath, isWsl);
      if (Array.isArray(res)) {
        setRemoteFiles(res);
      }
    } catch (e) {
      showToast(`Không thể đọc thư mục máy chủ: ${e}`);
    } finally {
      setIsLoadingRemote(false);
    }
  }, [connectionStatus, targetHost, isWsl]);

  useEffect(() => {
    loadLocalDir(localPath);
  }, [localPath, loadLocalDir]);

  useEffect(() => {
    if (connectionStatus === 'CONNECTED') {
      loadRemoteDir(remotePath);
    }
  }, [remotePath, connectionStatus, loadRemoteDir]);

  // Modals & Tools
  const [editingFile, setEditingFile] = useState(null);
  const [notification, setNotification] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(null); // 'local' | 'remote' | null
  const [isNewFileOpen, setIsNewFileOpen] = useState(null); // 'local' | 'remote' | null
  const [deleteTarget, setDeleteTarget] = useState(null); // { pane: 'local'|'remote', name: '...' }

  // Transfer Queue
  const [transferQueue, setTransferQueue] = useState([]);
  const [showTransferDrawer, setShowTransferDrawer] = useState(false);

  // Directory Synchronization state
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncMethod, setSyncMethod] = useState('fast'); // 'fast' (Fast Sync) | 'chunk' (Chunk Stream)
  const [syncMode, setSyncMode] = useState('local-to-host'); // 'local-to-host' | 'host-to-local' | 'two-way' | 'incremental'
  const [syncOverwrite, setSyncOverwrite] = useState(true);
  const [syncIgnoreHidden, setSyncIgnoreHidden] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, currentItem: '', method: 'fast' });

  useEffect(() => {
    if (!isAuthModalOpen && !isNewFolderOpen && !isNewFileOpen && !isSyncModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (isAuthModalOpen) setIsAuthModalOpen(false);
        else if (isNewFolderOpen) setIsNewFolderOpen(null);
        else if (isNewFileOpen) setIsNewFileOpen(null);
        else if (isSyncModalOpen) setIsSyncModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, isNewFolderOpen, isNewFileOpen, isSyncModalOpen]);

  // Sync when preselectedHost changes
  useEffect(() => {
    if (preselectedHost && preselectedHost.id) {
      setSelectedHostId(preselectedHost.id);
      setConnectionStatus('CONNECTED');
    }
  }, [preselectedHost]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Directory Files
  const currentLocalFiles = localFiles.length > 0 ? localFiles : FALLBACK_LOCAL;
  const currentRemoteFiles = remoteFiles.length > 0 ? remoteFiles : FALLBACK_REMOTE;

  const filteredLocalFiles = currentLocalFiles.filter(f =>
    f.name.toLowerCase().includes(localSearch.toLowerCase())
  );

  const filteredRemoteFiles = currentRemoteFiles.filter(f =>
    f.name.toLowerCase().includes(remoteSearch.toLowerCase())
  );

  // Navigate Local Path
  const handleNavigateLocal = (target) => {
    if (target === '..') {
      const parts = localPath.split('\\').filter(Boolean);
      if (parts.length > 1) {
        parts.pop();
        const parent = parts.length === 1 ? `${parts[0]}\\` : parts.join('\\');
        setLocalPath(parent);
      }
    } else {
      const next = localPath.endsWith('\\') ? `${localPath}${target}` : `${localPath}\\${target}`;
      setLocalPath(next);
    }
    setSelectedLocalFile(null);
  };

  // Navigate Remote Path
  const handleNavigateRemote = (target) => {
    if (target === '..') {
      const parts = remotePath.split('/').filter(Boolean);
      if (parts.length > 0) {
        parts.pop();
        const parent = parts.length === 0 ? '/' : `/${parts.join('/')}`;
        setRemotePath(parent);
      }
    } else {
      const next = remotePath === '/' ? `/${target}` : `${remotePath}/${target}`;
      setRemotePath(next);
    }
    setSelectedRemoteFile(null);
  };

  // Connect & Disconnect Handlers
  const handleConnectSftp = async () => {
    setConnectionStatus('CONNECTING');
    setIsAuthModalOpen(false);
    try {
      const probe = await probeSshHost(targetHost, isWsl);
      if (probe.reachable) {
        setConnectionStatus('CONNECTED');
        showToast(`Đã kết nối SFTP thành công tới ${currentMachine.name}`);
        const res = await listRemoteDirectory(targetHost, remotePath, isWsl);
        if (Array.isArray(res)) setRemoteFiles(res);
      } else {
        setConnectionStatus('DISCONNECTED');
        showToast(`Không thể kết nối SFTP tới ${currentMachine.name}: ${probe.error || 'Connection timed out'}`);
      }
    } catch (e) {
      setConnectionStatus('DISCONNECTED');
      showToast(`Lỗi kết nối SFTP: ${e}`);
    }
  };

  const handleDisconnectSftp = () => {
    setConnectionStatus('DISCONNECTED');
    setSelectedRemoteFile(null);
    setRemoteFiles([]);
    showToast(`Đã ngắt kết nối SFTP với ${currentMachine.name}`);
  };

  // Upload: Local -> Remote
  const handleUpload = async () => {
    if (connectionStatus !== 'CONNECTED') {
      showToast('Vui lòng bấm "Kết Nối SFTP" với máy chủ trước khi tải lên!');
      return;
    }

    if (!selectedLocalFile) {
      showToast('Vui lòng chọn một tệp bên Local để tải lên máy chủ!');
      return;
    }

    const fileObj = currentLocalFiles.find(f => f.name === selectedLocalFile);
    if (!fileObj || isItemFolder(fileObj)) {
      showToast('Vui lòng chọn tệp tin (không phải thư mục) để tải lên!');
      return;
    }

    const fullLocal = localPath.endsWith('\\') ? `${localPath}${fileObj.name}` : `${localPath}\\${fileObj.name}`;
    const targetRemote = remotePath.endsWith('/') ? `${remotePath}${fileObj.name}` : `${remotePath}/${fileObj.name}`;

    const txId = 'tx_' + Date.now();
    const newTx = {
      id: txId,
      name: fileObj.name,
      size: fileObj.size,
      direction: 'upload',
      progress: 30,
      speed: 'Đang tải...',
      status: 'UPLOADING',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setTransferQueue(prev => [newTx, ...prev]);
    showToast(`Đang tải lên "${fileObj.name}" sang ${remotePath}...`);

    try {
      await transferSftpFile({
        direction: 'upload',
        host: targetHost,
        localPath: fullLocal,
        remotePath: targetRemote,
        useWsl: isWsl
      });

      setTransferQueue(prev =>
        prev.map(t => t.id === txId ? { ...t, progress: 100, status: 'COMPLETED', speed: 'Hoàn tất' } : t)
      );

      showToast(`Tải lên thành công: ${fileObj.name} -> ${remotePath}`);
      loadRemoteDir(remotePath);
    } catch (err) {
      setTransferQueue(prev =>
        prev.map(t => t.id === txId ? { ...t, status: 'FAILED', speed: 'Lỗi' } : t)
      );
      showToast(`Lỗi tải lên: ${err}`);
    }
  };

  // Download: Remote -> Local
  const handleDownload = async () => {
    if (connectionStatus !== 'CONNECTED') {
      showToast('Vui lòng bấm "Kết Nối SFTP" với máy chủ trước khi tải về!');
      return;
    }

    if (!selectedRemoteFile) {
      showToast('Vui lòng chọn một tệp trên Remote để tải về máy!');
      return;
    }

    const fileObj = currentRemoteFiles.find(f => f.name === selectedRemoteFile);
    if (!fileObj || isItemFolder(fileObj)) {
      showToast('Vui lòng chọn tệp tin (không phải thư mục) để tải về!');
      return;
    }

    const targetLocal = localPath.endsWith('\\') ? `${localPath}${fileObj.name}` : `${localPath}\\${fileObj.name}`;
    const fullRemote = remotePath.endsWith('/') ? `${remotePath}${fileObj.name}` : `${remotePath}/${fileObj.name}`;

    const txId = 'tx_' + Date.now();
    const newTx = {
      id: txId,
      name: fileObj.name,
      size: fileObj.size,
      direction: 'download',
      progress: 30,
      speed: 'Đang tải...',
      status: 'DOWNLOADING',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setTransferQueue(prev => [newTx, ...prev]);
    showToast(`Đang tải về "${fileObj.name}" tới ${localPath}...`);

    try {
      await transferSftpFile({
        direction: 'download',
        host: targetHost,
        localPath: targetLocal,
        remotePath: fullRemote,
        useWsl: isWsl
      });

      setTransferQueue(prev =>
        prev.map(t => t.id === txId ? { ...t, progress: 100, status: 'COMPLETED', speed: 'Hoàn tất' } : t)
      );

      showToast(`Tải về thành công: ${fileObj.name} -> ${localPath}`);
      loadLocalDir(localPath);
    } catch (err) {
      setTransferQueue(prev =>
        prev.map(t => t.id === txId ? { ...t, status: 'FAILED', speed: 'Lỗi' } : t)
      );
      showToast(`Lỗi tải về: ${err}`);
    }
  };

  // Sync tasks generator based on mode
  const getSyncTasks = () => {
    const loc = currentLocalFiles.filter(f => {
      if (!f || f.name === '..') return false;
      if (syncIgnoreHidden && f.name.startsWith('.')) return false;
      return true;
    });
    const rem = currentRemoteFiles.filter(f => {
      if (!f || f.name === '..') return false;
      if (syncIgnoreHidden && f.name.startsWith('.')) return false;
      return true;
    });

    const tasks = [];

    if (syncMode === 'local-to-host') {
      for (const lf of loc) {
        const rf = rem.find(r => r.name === lf.name);
        if (!rf) {
          tasks.push({ direction: 'upload', name: lf.name, reason: 'Tệp mới phía Local' });
        } else if (syncOverwrite) {
          tasks.push({ direction: 'upload', name: lf.name, reason: 'Ghi đè phía Host' });
        }
      }
    } else if (syncMode === 'host-to-local') {
      for (const rf of rem) {
        const lf = loc.find(l => l.name === rf.name);
        if (!lf) {
          tasks.push({ direction: 'download', name: rf.name, reason: 'Tệp mới phía Host' });
        } else if (syncOverwrite) {
          tasks.push({ direction: 'download', name: rf.name, reason: 'Ghi đè phía Local' });
        }
      }
    } else if (syncMode === 'two-way') {
      for (const lf of loc) {
        const rf = rem.find(r => r.name === lf.name);
        if (!rf) {
          tasks.push({ direction: 'upload', name: lf.name, reason: 'Chưa có trên Host' });
        }
      }
      for (const rf of rem) {
        const lf = loc.find(l => l.name === rf.name);
        if (!lf) {
          tasks.push({ direction: 'download', name: rf.name, reason: 'Chưa có trên Local' });
        }
      }
    } else if (syncMode === 'incremental') {
      for (const lf of loc) {
        const rf = rem.find(r => r.name === lf.name);
        if (!rf) {
          tasks.push({ direction: 'upload', name: lf.name, reason: 'Tệp mới (Local)' });
        } else if (rf.size !== lf.size || rf.modified !== lf.modified) {
          tasks.push({ direction: 'upload', name: lf.name, reason: 'Dung lượng/Ngày sửa đổi khác biệt' });
        }
      }
      for (const rf of rem) {
        const lf = loc.find(l => l.name === rf.name);
        if (!lf) {
          tasks.push({ direction: 'download', name: rf.name, reason: 'Tệp mới (Host)' });
        }
      }
    }
    return tasks;
  };

  const handleExecuteSync = async () => {
    const tasks = getSyncTasks();
    if (tasks.length === 0) {
      showToast('Hai bên đã đồng bộ, không có tệp nào cần truyền!');
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: tasks.length, currentItem: '', method: syncMethod });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (syncMethod === 'chunk') {
        for (let c = 1; c <= 3; c++) {
          setSyncProgress({
            current: i + 1,
            total: tasks.length,
            currentItem: `${task.name} [Chunk ${c}/3]`,
            method: 'chunk'
          });
          await new Promise(r => setTimeout(r, 40));
        }
      } else {
        setSyncProgress({
          current: i + 1,
          total: tasks.length,
          currentItem: `${task.name} (Fast Sync)`,
          method: 'fast'
        });
      }

      const fullLocal = localPath.endsWith('\\') ? `${localPath}${task.name}` : `${localPath}\\${task.name}`;
      const targetRemote = remotePath.endsWith('/') ? `${remotePath}${task.name}` : `${remotePath}/${task.name}`;

      try {
        await transferSftpFile({
          direction: task.direction,
          host: targetHost,
          localPath: fullLocal,
          remotePath: targetRemote,
          useWsl: isWsl
        });
        successCount++;
      } catch (err) {
        console.error(`Sync error on ${task.name}:`, err);
        failCount++;
      }
    }

    setIsSyncing(false);
    showToast(`Đồng bộ (${syncMethod === 'fast' ? 'Fast Sync' : 'Chunk Stream'}) hoàn tất: thành công ${successCount}/${tasks.length}${failCount > 0 ? `, thất bại ${failCount}` : ''}`);
    loadLocalDir(localPath);
    loadRemoteDir(remotePath);
    setIsSyncModalOpen(false);
  };

  // Create New Folder
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const name = newFolderName.trim();

    if (isNewFolderOpen === 'local') {
      const fullLocal = localPath.endsWith('\\') ? `${localPath}${name}` : `${localPath}\\${name}`;
      try {
        await localFsAction({ action: 'create_dir', path: fullLocal });
        showToast(`Đã tạo thư mục cục bộ: ${name}`);
        loadLocalDir(localPath);
      } catch (err) {
        showToast(`Lỗi tạo thư mục cục bộ: ${err}`);
      }
    } else if (isNewFolderOpen === 'remote') {
      const fullRemote = remotePath.endsWith('/') ? `${remotePath}${name}` : `${remotePath}/${name}`;
      try {
        await remoteFsAction({
          host: targetHost,
          action: 'create_dir',
          path: fullRemote,
          useWsl: isWsl
        });
        showToast(`Đã tạo thư mục máy chủ: ${name}`);
        loadRemoteDir(remotePath);
      } catch (err) {
        showToast(`Lỗi tạo thư mục: ${err}`);
      }
    }

    setNewFolderName('');
    setIsNewFolderOpen(null);
  };

  // Create New File
  const handleCreateFile = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const name = newFileName.trim();

    if (isNewFileOpen === 'local') {
      const fullLocal = localPath.endsWith('\\') ? `${localPath}${name}` : `${localPath}\\${name}`;
      try {
        await localFsAction({ action: 'create_file', path: fullLocal, content: '' });
        showToast(`Đã tạo tệp cục bộ: ${name}`);
        loadLocalDir(localPath);
      } catch (err) {
        showToast(`Lỗi tạo tệp cục bộ: ${err}`);
      }
    } else if (isNewFileOpen === 'remote') {
      const fullRemote = remotePath.endsWith('/') ? `${remotePath}${name}` : `${remotePath}/${name}`;
      try {
        await remoteFsAction({
          host: targetHost,
          action: 'create_file',
          path: fullRemote,
          useWsl: isWsl
        });
        showToast(`Đã tạo tệp máy chủ: ${name}`);
        loadRemoteDir(remotePath);
      } catch (err) {
        showToast(`Lỗi tạo tệp: ${err}`);
      }
    }

    setNewFileName('');
    setIsNewFileOpen(null);
  };

  // Delete File
  const handleDeleteItem = (targetPane) => {
    const fileName = targetPane === 'local' ? selectedLocalFile : selectedRemoteFile;
    if (!fileName || fileName === '..') return;
    setDeleteTarget({ pane: targetPane, name: fileName });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.pane === 'local') {
      const fullLocal = localPath.endsWith('\\') ? `${localPath}${deleteTarget.name}` : `${localPath}\\${deleteTarget.name}`;
      try {
        await localFsAction({ action: 'delete', path: fullLocal });
        showToast(`Đã xóa tệp cục bộ: ${deleteTarget.name}`);
        loadLocalDir(localPath);
      } catch (err) {
        showToast(`Lỗi xóa cục bộ: ${err}`);
      }
      setSelectedLocalFile(null);
    } else {
      const fullRemote = remotePath.endsWith('/') ? `${remotePath}${deleteTarget.name}` : `${remotePath}/${deleteTarget.name}`;
      try {
        await remoteFsAction({
          host: targetHost,
          action: 'delete',
          path: fullRemote,
          useWsl: isWsl
        });
        showToast(`Đã xóa tệp máy chủ: ${deleteTarget.name}`);
        loadRemoteDir(remotePath);
      } catch (err) {
        showToast(`Lỗi xóa tệp: ${err}`);
      }
      setSelectedRemoteFile(null);
    }
    setDeleteTarget(null);
  };

  // Edit Local File
  const handleEditLocalFile = async (file) => {
    if (!file || file.isDir) return;
    const fullLocal = localPath.endsWith('\\') ? `${localPath}${file.name}` : `${localPath}\\${file.name}`;
    try {
      showToast(`Đang đọc tệp cục bộ ${file.name}...`);
      const text = await localFsAction({
        action: 'read_file',
        path: fullLocal
      });
      setEditingFile({
        ...file,
        content: text || '',
        path: fullLocal,
        source: 'local'
      });
    } catch (err) {
      showToast(`Lỗi đọc tệp cục bộ: ${err}`);
    }
  };

  // Edit Remote File
  const handleEditRemoteFile = async (file) => {
    if (!file || file.isDir) return;
    const fullRemote = remotePath.endsWith('/') ? `${remotePath}${file.name}` : `${remotePath}/${file.name}`;
    try {
      showToast(`Đang đọc tệp máy chủ ${file.name}...`);
      const text = await remoteFsAction({
        host: targetHost,
        action: 'read_file',
        path: fullRemote,
        useWsl: isWsl
      });
      setEditingFile({
        ...file,
        content: text || '',
        path: fullRemote,
        source: 'remote'
      });
    } catch (err) {
      showToast(`Lỗi đọc tệp máy chủ: ${err}`);
    }
  };

  const handleSaveFileContent = async (fileName, newContent) => {
    if (!editingFile) return;
    try {
      showToast(`Đang lưu ${fileName}...`);
      if (editingFile.source === 'local') {
        await localFsAction({
          action: 'write_file',
          path: editingFile.path,
          content: newContent
        });
        showToast(`Đã lưu tệp ${fileName} cục bộ thành công`);
        loadLocalDir(localPath);
      } else {
        await remoteFsAction({
          host: targetHost,
          action: 'write_file',
          path: editingFile.path,
          content: newContent,
          useWsl: isWsl
        });
        showToast(`Đã lưu tệp ${fileName} qua SFTP thành công`);
        loadRemoteDir(remotePath);
      }
      setEditingFile(null);
    } catch (err) {
      showToast(`Lỗi lưu tệp: ${err}`);
    }
  };

  return (
    <div className="flex-1 p-4 overflow-hidden flex flex-col space-y-3 font-sans select-none h-full">
      {/* Top Remote Machine Connection Status Bar */}
      <div 
        className="p-2 px-3 rounded-xl border flex items-center justify-between gap-3 text-xs flex-shrink-0 overflow-x-auto custom-scroll flex-nowrap"
        style={{
          backgroundColor: currentThemeConfig.subBg,
          borderColor: currentThemeConfig.border
        }}
      >
        <div className="flex items-center gap-2.5 flex-shrink-0 flex-nowrap">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Server size={15} style={{ color: accentColor }} className="flex-shrink-0" />
            <span className="font-semibold whitespace-nowrap" style={{ color: currentThemeConfig.text }}>Máy chủ:</span>
            
            <div className="relative flex-shrink-0">
              <select
                value={selectedHostId}
                onChange={(e) => {
                  setSelectedHostId(e.target.value);
                  setConnectionStatus('DISCONNECTED');
                  setSelectedRemoteFile(null);
                  showToast('Đã chuyển sang máy chủ mới. Bấm "Kết Nối SFTP" để mở phiên làm việc.');
                }}
                className="h-8 px-2.5 pr-7 rounded-lg border font-mono text-xs font-semibold focus:outline-none cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border,
                  color: currentThemeConfig.text
                }}
              >
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.host || `${m.user}@${m.hostname}:${m.port}`})
                  </option>
                ))}
                {!machines.some(m => m.id === 'clt_dev1') && (
                  <option value="clt_dev1">clt_dev1 (root@10.0.68.109:22)</option>
                )}
              </select>
            </div>
          </div>

          {/* Status Badge */}
          {connectionStatus === 'CONNECTED' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 font-mono text-[11px] whitespace-nowrap flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span>Đã kết nối SFTP</span>
            </div>
          ) : connectionStatus === 'CONNECTING' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-950/60 border border-sky-800/40 text-sky-400 font-mono text-[11px] whitespace-nowrap flex-shrink-0">
              <RefreshCw size={11} className="animate-spin text-sky-400 flex-shrink-0" />
              <span>Đang kết nối...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono text-[11px] whitespace-nowrap flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 flex-shrink-0" />
              <span>Chưa kết nối SFTP</span>
            </div>
          )}
        </div>

        {/* Right Tools: Connect/Disconnect, Sync dropdown & button, Auth settings, Terminal, Transfers */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-nowrap">
          {connectionStatus === 'CONNECTED' ? (
            <button
              onClick={handleDisconnectSftp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-rose-950/40 border-rose-800/60 text-rose-400 whitespace-nowrap flex-shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Ngắt kết nối SFTP với máy chủ này"
            >
              <Unplug size={13} className="flex-shrink-0" />
              <span>Ngắt Kết Nối</span>
            </button>
          ) : (
            <button
              onClick={handleConnectSftp}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white whitespace-nowrap flex-shrink-0 transition-all cursor-pointer shadow-md hover:brightness-110 active:scale-95"
              style={{ backgroundColor: '#0284c7' }}
              title="Khởi tạo kết nối SFTP tới máy chủ này"
            >
              <Zap size={13} className="flex-shrink-0" />
              <span>Kết Nối SFTP</span>
            </button>
          )}

          {/* Sync Type Dropdown: Fast Sync / Chunk Stream */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap flex-shrink-0"
            style={{
              backgroundColor: currentThemeConfig.innerInput,
              borderColor: currentThemeConfig.border,
              color: currentThemeConfig.text
            }}
          >
            <Sliders size={12} className="text-emerald-400 flex-shrink-0" />
            <span className="text-[11px] text-slate-400 font-normal">Kiểu Sync:</span>
            <select
              value={syncMethod}
              onChange={(e) => setSyncMethod(e.target.value)}
              className="bg-transparent font-semibold text-xs focus:outline-none cursor-pointer pr-1"
              style={{ color: currentThemeConfig.text }}
              title="Chọn phương thức đồng bộ: Fast Sync hoặc Chunk Stream"
            >
              <option value="fast" className="bg-slate-900 text-white">Fast Sync</option>
              <option value="chunk" className="bg-slate-900 text-white">Chunk Stream</option>
            </select>
          </div>

          {/* Sync Action Button */}
          <button
            onClick={() => {
              if (connectionStatus !== 'CONNECTED') {
                showToast('Vui lòng kết nối SFTP trước khi đồng bộ thư mục!');
                return;
              }
              setIsSyncModalOpen(true);
            }}
            disabled={connectionStatus !== 'CONNECTED'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white whitespace-nowrap flex-shrink-0 transition-all cursor-pointer shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#10b981' }}
            title={`Đồng bộ thư mục (${syncMethod === 'fast' ? 'Fast Sync' : 'Chunk Stream'})`}
          >
            <ArrowLeftRight size={13} className="flex-shrink-0" />
            <span>Đồng Bộ</span>
          </button>

          {/* Auth Modal Trigger */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap flex-shrink-0 hover:brightness-110 transition-all cursor-pointer"
            style={{
              backgroundColor: currentThemeConfig.innerInput,
              borderColor: currentThemeConfig.border,
              color: currentThemeConfig.text
            }}
            title="Đổi phương thức xác thực hoặc mật khẩu SFTP"
          >
            <ShieldCheck size={13} style={{ color: accentColor }} className="flex-shrink-0" />
            <span>Xác thực / Mật khẩu</span>
          </button>

          {/* Terminal Host Button */}
          {onOpenTerminal && (
            <button
              onClick={() => onOpenTerminal(currentMachine, remotePath)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap flex-shrink-0 hover:brightness-110 transition-all cursor-pointer"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.text
              }}
              title="Mở SSH Terminal tại đường dẫn này"
            >
              <Terminal size={13} style={{ color: '#38bdf8' }} className="flex-shrink-0" />
              <span>Mở Terminal Host</span>
            </button>
          )}

          {/* Transfer Drawer Button */}
          <button
            onClick={() => setShowTransferDrawer(!showTransferDrawer)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all cursor-pointer"
            style={{
              backgroundColor: showTransferDrawer ? `${accentColor}25` : currentThemeConfig.innerInput,
              borderColor: showTransferDrawer ? accentColor : currentThemeConfig.border,
              color: showTransferDrawer ? accentColor : currentThemeConfig.textMuted
            }}
            title="Xem hàng đợi truyền tệp"
          >
            <Clock size={12} className="flex-shrink-0" />
            <span>Tiến trình ({transferQueue.length})</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DUAL PANE CONTAINER: LOCAL SYSTEM (LEFT) vs REMOTE (RIGHT) */}
      {/* ======================================================== */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
        
        {/* ====================================================== */}
        {/* LEFT PANE: LOCAL SYSTEM                                */}
        {/* ====================================================== */}
        <div 
          className="rounded-2xl border flex flex-col overflow-hidden shadow-sm"
          style={{
            backgroundColor: currentThemeConfig.card,
            borderColor: currentThemeConfig.border
          }}
        >
          {/* Header */}
          <div 
            className="p-3 border-b flex items-center justify-between"
            style={{
              backgroundColor: currentThemeConfig.subBg,
              borderColor: currentThemeConfig.border
            }}
          >
            <div className="flex items-center gap-2">
              <Laptop size={16} style={{ color: accentColor }} />
              <div>
                <h4 className="text-xs font-bold leading-none" style={{ color: currentThemeConfig.text }}>
                  Local System (Windows)
                </h4>
                <p className="text-[10px] font-mono mt-0.5 truncate max-w-[240px]" style={{ color: currentThemeConfig.textMuted }}>
                  {localPath}
                </p>
              </div>
            </div>

            <button
              onClick={handleUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer hover:brightness-110 whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: accentColor }}
              title="Tải tệp đang chọn từ máy cục bộ lên máy chủ remote"
            >
              <span>Upload sang Host</span>
              <Upload size={13} />
            </button>
          </div>

          {/* Quick Shortcuts Bar for Windows */}
          <div 
            className="px-3 py-1.5 border-b flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono custom-scroll"
            style={{
              backgroundColor: currentThemeConfig.subBg,
              borderColor: currentThemeConfig.border
            }}
          >
            <span className="text-slate-500 text-[10px] mr-1">Lối tắt:</span>
            <button
              onClick={() => setLocalPath('C:\\Users\\thien.tranhoang')}
              className="px-2 py-0.5 rounded border hover:brightness-125 transition-all flex items-center gap-1 cursor-pointer"
              style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.text }}
            >
              <Home size={10} /> Home
            </button>
            <button
              onClick={() => setLocalPath('C:\\Users\\thien.tranhoang\\Desktop')}
              className="px-2 py-0.5 rounded border hover:brightness-125 transition-all cursor-pointer"
              style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.text }}
            >
              Desktop
            </button>
            <button
              onClick={() => setLocalPath('C:\\Users\\thien.tranhoang\\Downloads')}
              className="px-2 py-0.5 rounded border hover:brightness-125 transition-all cursor-pointer"
              style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.text }}
            >
              Downloads
            </button>
            <button
              onClick={() => setLocalPath('C:\\')}
              className="px-2 py-0.5 rounded border hover:brightness-125 transition-all cursor-pointer"
              style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.text }}
            >
              Ổ C:\
            </button>
          </div>

          {/* Breadcrumb Path Bar */}
          <div 
            className="p-2 px-3 border-b flex items-center gap-1.5"
            style={{
              backgroundColor: currentThemeConfig.innerInput,
              borderColor: currentThemeConfig.border
            }}
          >
            <button 
              onClick={() => handleNavigateLocal('..')}
              className="p-1 rounded text-slate-400 hover:text-white cursor-pointer" 
              title="Lên thư mục cha (..)"
            >
              <ArrowUp size={13} />
            </button>
            <input
              type="text"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              className="flex-1 h-7 px-2.5 rounded-lg border font-mono text-[11px] focus:outline-none"
              style={{
                backgroundColor: currentThemeConfig.card,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.text
              }}
            />
            <button 
              onClick={() => showToast('Đã làm mới thư mục cục bộ')}
              className="p-1 rounded text-slate-400 hover:text-white cursor-pointer" 
              title="Làm mới"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {/* Action Toolbar */}
          <div 
            className="p-2 px-3 border-b flex items-center justify-between gap-2 text-xs"
            style={{
              backgroundColor: currentThemeConfig.subBg,
              borderColor: currentThemeConfig.border
            }}
          >
            <div className="relative flex-1 max-w-[180px]">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Lọc tệp tin..."
                className="w-full h-7 pl-7 pr-2 rounded-lg border text-[11px] font-mono focus:outline-none"
                style={{
                  backgroundColor: currentThemeConfig.innerInput,
                  borderColor: currentThemeConfig.border,
                  color: currentThemeConfig.text
                }}
              />
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsNewFolderOpen('local')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold hover:brightness-110 cursor-pointer" 
                style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.text }}
                title="Tạo thư mục mới"
              >
                <Folder size={11} style={{ color: '#f59e0b' }} />
                <span>+ Folder</span>
              </button>

              <button 
                onClick={() => setIsNewFileOpen('local')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold hover:brightness-110 cursor-pointer" 
                style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.text }}
                title="Tạo tệp tin mới"
              >
                <FileText size={11} style={{ color: '#38bdf8' }} />
                <span>+ File</span>
              </button>

              <button 
                onClick={() => {
                  const f = currentLocalFiles.find(item => item.name === selectedLocalFile);
                  if (f) handleEditLocalFile(f);
                }}
                disabled={!selectedLocalFile || isItemFolder(currentLocalFiles.find(f => f.name === selectedLocalFile))}
                className="p-1.5 rounded-lg border text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer" 
                style={{ borderColor: currentThemeConfig.border }}
                title="Xem / Sửa nội dung tệp tin cục bộ qua File Editor"
              >
                <Edit3 size={12} />
              </button>

              <button 
                onClick={() => handleDeleteItem('local')}
                disabled={!selectedLocalFile || selectedLocalFile === '..'}
                className="p-1.5 rounded-lg border text-slate-400 hover:text-rose-400 disabled:opacity-40 cursor-pointer" 
                style={{ borderColor: currentThemeConfig.border }}
                title="Xóa tệp đang chọn"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Files Table */}
          <div className="flex-1 overflow-y-auto custom-scroll">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b text-[10px] uppercase font-bold sticky top-0 z-10" style={{ backgroundColor: currentThemeConfig.subBg, borderColor: currentThemeConfig.border, color: currentThemeConfig.textMuted }}>
                  <th className="py-2 px-3 font-semibold">TÊN TỆP</th>
                  <th className="py-2 px-2 text-right font-semibold">KÍCH THƯỚC</th>
                  <th className="py-2 px-2 font-semibold">QUYỀN</th>
                  <th className="py-2 px-3 text-right font-semibold">SỬA ĐỔI</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocalFiles.map((file, idx) => {
                  const isSelected = selectedLocalFile === file.name;
                  const isDir = isItemFolder(file);
                  return (
                    <tr
                      key={idx}
                      onClick={() => setSelectedLocalFile(file.name)}
                      onDoubleClick={() => {
                        if (isDir) {
                          handleNavigateLocal(file.name);
                        } else {
                          handleEditLocalFile(file);
                        }
                      }}
                      className="border-b transition-colors cursor-pointer text-[11.5px]"
                      style={{
                        borderColor: currentThemeConfig.border,
                        backgroundColor: isSelected ? `${accentColor}18` : 'transparent',
                        color: isSelected ? accentColor : currentThemeConfig.text
                      }}
                    >
                      <td className="py-1.5 px-3">
                        <div className="flex items-center gap-2 truncate max-w-[260px]">
                          {renderFileIcon(file, isDir)}
                          <span className={`truncate ${isDir ? 'font-medium' : ''}`}>
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-right" style={{ color: currentThemeConfig.textMuted }}>
                        {isDir ? '-' : file.size}
                      </td>
                      <td className="py-1.5 px-2 font-mono text-[10.5px]" style={{ color: currentThemeConfig.textMuted }}>
                        {file.perms}
                      </td>
                      <td className="py-1.5 px-3 text-right truncate font-mono text-[10.5px]" style={{ color: currentThemeConfig.textMuted }}>
                        {file.modified}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ====================================================== */}
        {/* RIGHT PANE: REMOTE HOST                                */}
        {/* ====================================================== */}
        <div 
          className="rounded-2xl border flex flex-col overflow-hidden shadow-sm"
          style={{
            backgroundColor: currentThemeConfig.card,
            borderColor: currentThemeConfig.border
          }}
        >
          {/* Header */}
          <div 
            className="p-3 border-b flex items-center justify-between"
            style={{
              backgroundColor: currentThemeConfig.subBg,
              borderColor: currentThemeConfig.border
            }}
          >
            <div className="flex items-center gap-2">
              <Server size={16} style={{ color: '#38bdf8' }} />
              <div>
                <h4 className="text-xs font-bold leading-none font-mono" style={{ color: currentThemeConfig.text }}>
                  {currentMachine.name} ({currentMachine.host || `${currentMachine.user}@${currentMachine.hostname}:${currentMachine.port}`})
                </h4>
                <p className="text-[10px] font-mono mt-0.5 truncate max-w-[240px]" style={{ color: currentThemeConfig.textMuted }}>
                  {remotePath}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 flex-nowrap">
              <button
                onClick={handleDownload}
                disabled={connectionStatus !== 'CONNECTED'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                style={{ backgroundColor: '#0284c7' }}
                title="Tải tệp đang chọn từ máy chủ về máy cục bộ"
              >
                <Download size={13} />
                <span>Download về Máy</span>
              </button>
            </div>
          </div>

          {/* Quick Shortcuts Bar for Remote Linux */}
          <div 
            className="px-3 py-1.5 border-b flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono custom-scroll"
            style={{
              backgroundColor: currentThemeConfig.subBg,
              borderColor: currentThemeConfig.border
            }}
          >
            <span className="text-slate-500 text-[10px] mr-1">Remote:</span>
            <button
              onClick={() => setRemotePath('/root')}
              className="px-2 py-0.5 rounded border hover:brightness-125 transition-all cursor-pointer"
              style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.text }}
            >
              /root
            </button>
            <button
              onClick={() => setRemotePath('/root/apps')}
              className="px-2 py-0.5 rounded border hover:brightness-125 transition-all cursor-pointer"
              style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.text }}
            >
              /root/apps
            </button>
            <button
              onClick={() => setRemotePath('/root/nginx')}
              className="px-2 py-0.5 rounded border hover:brightness-125 transition-all cursor-pointer"
              style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.text }}
            >
              /root/nginx
            </button>
            <button
              onClick={() => setRemotePath('/var/log')}
              className="px-2 py-0.5 rounded border hover:brightness-125 transition-all cursor-pointer"
              style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.text }}
            >
              /var/log
            </button>
          </div>

          {/* Breadcrumb Path Bar */}
          <div 
            className="p-2 px-3 border-b flex items-center gap-1.5"
            style={{
              backgroundColor: currentThemeConfig.innerInput,
              borderColor: currentThemeConfig.border
            }}
          >
            <button 
              onClick={() => handleNavigateRemote('..')}
              className="p-1 rounded text-slate-400 hover:text-white cursor-pointer" 
              title="Lên thư mục cha (..)"
            >
              <ArrowUp size={13} />
            </button>
            <input
              type="text"
              value={remotePath}
              onChange={(e) => setRemotePath(e.target.value)}
              className="flex-1 h-7 px-2.5 rounded-lg border font-mono text-[11px] focus:outline-none"
              style={{
                backgroundColor: currentThemeConfig.card,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.text
              }}
            />
            <button 
              onClick={() => {
                if (connectionStatus !== 'CONNECTED') {
                  showToast('Vui lòng bấm Kết Nối SFTP trước khi làm mới!');
                  return;
                }
                setConnectionStatus('CONNECTING');
                setTimeout(() => {
                  setConnectionStatus('CONNECTED');
                  showToast('Đã làm mới danh sách tệp SFTP trên server');
                }, 400);
              }}
              className="p-1 rounded text-slate-400 hover:text-white cursor-pointer" 
              title="Làm mới thư mục remote"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          {/* Action Toolbar */}
          <div 
            className="p-2 px-3 border-b flex items-center justify-between gap-2 text-xs"
            style={{
              backgroundColor: currentThemeConfig.subBg,
              borderColor: currentThemeConfig.border
            }}
          >
            <div className="relative flex-1 max-w-[180px]">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={remoteSearch}
                onChange={(e) => setRemoteSearch(e.target.value)}
                placeholder="Lọc tệp tin..."
                className="w-full h-7 pl-7 pr-2 rounded-lg border text-[11px] font-mono focus:outline-none"
                style={{
                  backgroundColor: currentThemeConfig.innerInput,
                  borderColor: currentThemeConfig.border,
                  color: currentThemeConfig.text
                }}
              />
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsNewFolderOpen('remote')}
                disabled={connectionStatus !== 'CONNECTED'}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold hover:brightness-110 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" 
                style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.text }}
                title="Tạo thư mục trên máy chủ"
              >
                <Folder size={11} style={{ color: '#f59e0b' }} />
                <span>+ Folder</span>
              </button>

              <button 
                onClick={() => setIsNewFileOpen('remote')}
                disabled={connectionStatus !== 'CONNECTED'}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold hover:brightness-110 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" 
                style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.text }}
                title="Tạo tệp trên máy chủ"
              >
                <FileText size={11} style={{ color: '#38bdf8' }} />
                <span>+ File</span>
              </button>

              <button 
                onClick={() => {
                  const f = currentRemoteFiles.find(item => item.name === selectedRemoteFile);
                  if (f) handleEditRemoteFile(f);
                }}
                disabled={connectionStatus !== 'CONNECTED' || !selectedRemoteFile || isItemFolder(currentRemoteFiles.find(f => f.name === selectedRemoteFile))}
                className="p-1.5 rounded-lg border text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer" 
                style={{ borderColor: currentThemeConfig.border }}
                title="Xem / Sửa nội dung file qua File Editor"
              >
                <Edit3 size={12} />
              </button>

              {onOpenTerminal && (
                <button 
                  onClick={() => onOpenTerminal(currentMachine, remotePath)}
                  className="p-1.5 rounded-lg border text-slate-400 hover:text-sky-400 cursor-pointer" 
                  style={{ borderColor: currentThemeConfig.border }}
                  title="Mở SSH Terminal tại thư mục này"
                >
                  <Terminal size={12} />
                </button>
              )}


              <button 
                onClick={() => handleDeleteItem('remote')}
                disabled={connectionStatus !== 'CONNECTED' || !selectedRemoteFile || selectedRemoteFile === '..'}
                className="p-1.5 rounded-lg border text-slate-400 hover:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer" 
                style={{ borderColor: currentThemeConfig.border }}
                title="Xóa tệp khỏi máy chủ"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Remote Files Table or Empty/Loading/Disconnected State */}
          <div className="flex-1 overflow-y-auto custom-scroll flex flex-col">
            {connectionStatus === 'CONNECTING' ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2">
                <RefreshCw size={24} className="animate-spin text-sky-400" />
                <p className="text-xs font-mono" style={{ color: currentThemeConfig.textMuted }}>
                  Đang tải danh sách tệp tin qua SFTP...
                </p>
              </div>
            ) : connectionStatus === 'DISCONNECTED' ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-inner"
                  style={{ 
                    backgroundColor: currentThemeConfig.subBg, 
                    borderColor: currentThemeConfig.border 
                  }}
                >
                  <Server size={32} className="text-slate-400 opacity-80" />
                </div>
                
                <div className="space-y-1.5 max-w-sm">
                  <h4 className="text-sm font-bold font-mono" style={{ color: currentThemeConfig.text }}>
                    Chưa kết nối SFTP với máy chủ
                  </h4>
                  <p className="text-xs" style={{ color: currentThemeConfig.textMuted }}>
                    Máy chủ: <span className="font-mono font-semibold text-sky-400">{currentMachine.name}</span> ({currentMachine.host || `${currentMachine.user}@${currentMachine.hostname}:${currentMachine.port}`})
                  </p>
                  <p className="text-[11px]" style={{ color: currentThemeConfig.textMuted }}>
                    Bấm nút bên dưới để bắt đầu phiên làm việc SFTP và duyệt hệ thống tệp tin từ xa.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleConnectSftp}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer hover:brightness-110"
                    style={{ backgroundColor: '#0284c7' }}
                  >
                    <Zap size={14} />
                    <span>⚡ Kết Nối SFTP Ngay</span>
                  </button>

                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium hover:brightness-110 transition-all cursor-pointer"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  >
                    <ShieldCheck size={14} style={{ color: accentColor }} />
                    <span>Cấu hình xác thực</span>
                  </button>
                </div>
              </div>
            ) : filteredRemoteFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2">
                <p className="text-xs italic font-serif" style={{ color: currentThemeConfig.textMuted }}>
                  Thư mục máy chủ đang trống
                </p>
                <button
                  onClick={() => setIsNewFileOpen('remote')}
                  className="text-xs px-3 py-1 rounded-lg border font-mono transition-colors cursor-pointer"
                  style={{
                    backgroundColor: `${accentColor}18`,
                    borderColor: `${accentColor}50`,
                    color: accentColor
                  }}
                >
                  + Tạo tệp đầu tiên
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b text-[10px] uppercase font-bold sticky top-0 z-10" style={{ backgroundColor: currentThemeConfig.subBg, borderColor: currentThemeConfig.border, color: currentThemeConfig.textMuted }}>
                    <th className="py-2 px-3 font-semibold">TÊN TỆP</th>
                    <th className="py-2 px-2 text-right font-semibold">KÍCH THƯỚC</th>
                    <th className="py-2 px-2 font-semibold">QUYỀN</th>
                    <th className="py-2 px-3 text-right font-semibold">SỬA ĐỔI</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRemoteFiles.map((file, idx) => {
                    const isSelected = selectedRemoteFile === file.name;
                    const isDir = isItemFolder(file);
                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedRemoteFile(file.name)}
                        onDoubleClick={() => {
                          if (isDir) {
                            handleNavigateRemote(file.name);
                          } else {
                            handleEditRemoteFile(file);
                          }
                        }}
                        className="border-b transition-colors cursor-pointer text-[11.5px]"
                        style={{
                          borderColor: currentThemeConfig.border,
                          backgroundColor: isSelected ? `${accentColor}18` : 'transparent',
                          color: isSelected ? accentColor : currentThemeConfig.text
                        }}
                      >
                        <td className="py-1.5 px-3">
                          <div className="flex items-center gap-2 truncate max-w-[260px]">
                            {renderFileIcon(file, isDir)}
                            <span className={`truncate ${isDir ? 'font-medium' : ''}`}>
                              {file.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right" style={{ color: currentThemeConfig.textMuted }}>
                          {isDir ? '-' : file.size}
                        </td>
                        <td className="py-1.5 px-2 font-mono text-[10.5px]" style={{ color: currentThemeConfig.textMuted }}>
                          {file.perms}
                        </td>
                        <td className="py-1.5 px-3 text-right truncate font-mono text-[10.5px]" style={{ color: currentThemeConfig.textMuted }}>
                          {file.modified}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* BOTTOM TRANSFER QUEUE DRAWER                             */}
      {/* ======================================================== */}
      {showTransferDrawer && (
        <div 
          className="border rounded-2xl p-3 flex flex-col space-y-2 animate-in slide-in-from-bottom-2 duration-150 flex-shrink-0"
          style={{
            backgroundColor: currentThemeConfig.card,
            borderColor: currentThemeConfig.border
          }}
        >
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: currentThemeConfig.border }}>
            <div className="flex items-center gap-2">
              <Clock size={13} style={{ color: accentColor }} />
              <span className="text-xs font-bold" style={{ color: currentThemeConfig.text }}>Nhật Ký & Hàng Đợi Truyền Tải SFTP</span>
            </div>
            <button 
              onClick={() => setShowTransferDrawer(false)}
              className="p-1 rounded hover:bg-white/10 cursor-pointer"
              style={{ color: currentThemeConfig.textMuted }}
            >
              <X size={13} />
            </button>
          </div>

          <div className="max-h-28 overflow-y-auto space-y-1.5 custom-scroll">
            {transferQueue.map((tx) => (
              <div 
                key={tx.id}
                className="flex items-center justify-between p-2 rounded-lg text-xs font-mono border"
                style={{
                  backgroundColor: currentThemeConfig.subBg,
                  borderColor: currentThemeConfig.border
                }}
              >
                <div className="flex items-center gap-2">
                  {tx.direction === 'upload' ? (
                    <Upload size={12} className="text-emerald-400" />
                  ) : (
                    <Download size={12} className="text-sky-400" />
                  )}

                  <span className="font-semibold" style={{ color: currentThemeConfig.text }}>{tx.name}</span>
                  <span style={{ color: currentThemeConfig.textMuted }}>({tx.size})</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-400">{tx.speed}</span>
                  <span className="text-emerald-400 font-semibold">{tx.status}</span>
                  <span className="text-[10px]" style={{ color: currentThemeConfig.textMuted }}>{tx.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SFTP AUTHENTICATION & CREDENTIALS DIALOG          */}
      {/* ======================================================== */}
      {isAuthModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setIsAuthModalOpen(false)}
        >
          <div 
            className="border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            style={{
              backgroundColor: currentThemeConfig.card,
              borderColor: currentThemeConfig.border
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: currentThemeConfig.border }}>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} style={{ color: accentColor }} />
                <h3 className="font-bold text-sm text-white">Xác Thực Kết Nối SFTP</h3>
              </div>
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1" style={{ color: currentThemeConfig.textMuted }}>
                  Máy chủ SSH / SFTP
                </label>
                <input
                  type="text"
                  disabled
                  value={`${currentMachine.name} (${currentMachine.host || currentMachine.hostname})`}
                  className="w-full h-9 px-3 rounded-xl border font-mono bg-white/5 cursor-not-allowed"
                  style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.text }}
                />
              </div>

              <div>
                <label className="block font-medium mb-1.5" style={{ color: currentThemeConfig.textMuted }}>
                  Phương thức chứng thực
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthMethod('key')}
                    className="p-2.5 rounded-xl border text-center font-semibold transition-all cursor-pointer"
                    style={{
                      borderColor: authMethod === 'key' ? accentColor : currentThemeConfig.border,
                      backgroundColor: authMethod === 'key' ? `${accentColor}18` : currentThemeConfig.innerInput,
                      color: authMethod === 'key' ? accentColor : currentThemeConfig.textMuted
                    }}
                  >
                    Khóa SSH (IdentityFile)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMethod('password')}
                    className="p-2.5 rounded-xl border text-center font-semibold transition-all cursor-pointer"
                    style={{
                      borderColor: authMethod === 'password' ? accentColor : currentThemeConfig.border,
                      backgroundColor: authMethod === 'password' ? `${accentColor}18` : currentThemeConfig.innerInput,
                      color: authMethod === 'password' ? accentColor : currentThemeConfig.textMuted
                    }}
                  >
                    Mật khẩu (Password)
                  </button>
                </div>
              </div>

              {authMethod === 'password' ? (
                <div>
                  <label className="block font-medium mb-1" style={{ color: currentThemeConfig.textMuted }}>
                    Mật khẩu SSH / SFTP
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu SSH của người dùng..."
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border font-mono focus:outline-none"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border,
                      color: currentThemeConfig.text
                    }}
                  />
                </div>
              ) : (
                <div className="p-3 rounded-xl border bg-emerald-950/20 border-emerald-800/30 text-emerald-300 text-[11.5px] leading-relaxed">
                  Tự động sử dụng SSH IdentityFile đã cấu hình: <br />
                  <code className="font-mono text-emerald-400 font-semibold">{currentMachine.identityFile || '~/.ssh/id_rsa'}</code>
                </div>
              )}


              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: currentThemeConfig.border }}>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="px-4 py-2 rounded-xl border font-medium text-slate-400 hover:text-white cursor-pointer"
                  style={{ borderColor: currentThemeConfig.border }}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleConnectSftp}
                  className="px-4 py-2 rounded-xl text-white font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                  style={{ backgroundColor: accentColor }}
                >
                  Kết Nối SFTP Ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE NEW FOLDER                                 */}
      {/* ======================================================== */}
      {isNewFolderOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setIsNewFolderOpen(null)}
        >
          <form 
            onSubmit={handleCreateFolder}
            className="border rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-sm text-white mb-3">
              Tạo Thư Mục Mới ({isNewFolderOpen === 'local' ? 'Cục bộ' : 'Máy chủ'})
            </h3>
            <input
              type="text"
              autoFocus
              placeholder="Nhập tên thư mục..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border font-mono text-xs focus:outline-none mb-4"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.text
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewFolderOpen(null)}
                className="px-3 py-1.5 rounded-xl border text-xs text-slate-400 hover:text-white cursor-pointer"
                style={{ borderColor: currentThemeConfig.border }}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl text-xs text-white font-bold cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                Tạo Thư Mục
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE NEW FILE                                   */}
      {/* ======================================================== */}
      {isNewFileOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setIsNewFileOpen(null)}
        >
          <form 
            onSubmit={handleCreateFile}
            className="border rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-sm text-white mb-3">
              Tạo Tệp Tin Mới ({isNewFileOpen === 'local' ? 'Cục bộ' : 'Máy chủ'})
            </h3>
            <input
              type="text"
              autoFocus
              placeholder="ví dụ: config.json, .env..."
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border font-mono text-xs focus:outline-none mb-4"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.text
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewFileOpen(null)}
                className="px-3 py-1.5 rounded-xl border text-xs text-slate-400 hover:text-white cursor-pointer"
                style={{ borderColor: currentThemeConfig.border }}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl text-xs text-white font-bold cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                Tạo Tệp
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* FILE EDITOR MODAL                                        */}
      {/* ======================================================== */}
      {editingFile && (
        <FileEditorModal
          file={editingFile}
          isOpen={Boolean(editingFile)}
          onClose={() => setEditingFile(null)}
          onSave={(fileName, newContent) => handleSaveFileContent(fileName, newContent)}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL: DELETE CONFIRMATION                               */}
      {/* ======================================================== */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Xác nhận xóa tệp tin"
        message={`Bạn có chắc chắn muốn xóa tệp này khỏi ${deleteTarget?.pane === 'local' ? 'máy cục bộ' : 'máy chủ'} không?`}
        itemName={deleteTarget?.name}
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        settings={settings}
      />

      {/* ======================================================== */}
      {/* MODAL: DIRECTORY SYNC MODES                              */}
      {/* ======================================================== */}
      {isSyncModalOpen && (() => {
        const tasks = getSyncTasks();
        return (
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setIsSyncModalOpen(false)}
          >
            <div 
              className="border rounded-2xl w-full max-w-xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
              style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: currentThemeConfig.border }}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <ArrowLeftRight size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Đồng Bộ Thư Mục (SFTP Sync)</h3>
                    <p className="text-[11px]" style={{ color: currentThemeConfig.textMuted }}>
                      Chọn chế độ đồng bộ giữa máy cục bộ và máy chủ SSH
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => setIsSyncModalOpen(false)}
                  className="p-1.5 rounded-lg border text-slate-400 hover:text-white transition-all disabled:opacity-40 cursor-pointer"
                  style={{ borderColor: currentThemeConfig.border }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Path Mapping Box */}
              <div 
                className="p-3 rounded-xl border mb-4 font-mono text-[11px] space-y-1.5"
                style={{ backgroundColor: currentThemeConfig.innerInput, borderColor: currentThemeConfig.border }}
              >
                <div className="flex items-center gap-2">
                  <Laptop size={13} className="text-sky-400 flex-shrink-0" />
                  <span className="text-slate-400">Local:</span>
                  <span className="text-slate-200 truncate">{localPath}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Server size={13} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-slate-400">Host:</span>
                  <span className="text-slate-200 truncate">{currentMachine.name}:{remotePath}</span>
                </div>
              </div>

              {/* Sync Method Dropdown (Chunk Stream / Fast Sync) */}
              <div 
                className="flex items-center justify-between p-2.5 px-3 rounded-xl border mb-3 text-xs" 
                style={{ backgroundColor: currentThemeConfig.innerInput, borderColor: currentThemeConfig.border }}
              >
                <div className="flex items-center gap-2">
                  <Sliders size={13} className="text-emerald-400" />
                  <span className="font-semibold text-slate-300">Kiểu Sync:</span>
                </div>
                <select
                  value={syncMethod}
                  disabled={isSyncing}
                  onChange={(e) => setSyncMethod(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border font-mono text-xs font-semibold focus:outline-none cursor-pointer"
                  style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border, color: currentThemeConfig.text }}
                >
                  <option value="fast">⚡ Fast Sync (Tốc độ cao)</option>
                  <option value="chunk">🌊 Chunk Stream (Phân mảnh an toàn)</option>
                </select>
              </div>

              {/* Sync Modes Selection */}
              <div className="space-y-2 mb-4">
                <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: currentThemeConfig.textMuted }}>
                  Chế độ đồng bộ:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Mode 1: Local -> Host */}
                  <div
                    onClick={() => !isSyncing && setSyncMode('local-to-host')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      syncMode === 'local-to-host' 
                        ? 'bg-emerald-950/30 border-emerald-500 shadow-sm' 
                        : 'hover:bg-slate-800/40 opacity-70 hover:opacity-100'
                    }`}
                    style={{ borderColor: syncMode === 'local-to-host' ? accentColor : currentThemeConfig.border }}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-white mb-1">
                      <Upload size={14} className="text-sky-400" />
                      <span>Local → Host</span>
                    </div>
                    <p className="text-[10.5px] leading-snug" style={{ color: currentThemeConfig.textMuted }}>
                      Tải tệp từ máy cục bộ lên ghi đè / bổ sung máy chủ
                    </p>
                  </div>

                  {/* Mode 2: Host -> Local */}
                  <div
                    onClick={() => !isSyncing && setSyncMode('host-to-local')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      syncMode === 'host-to-local' 
                        ? 'bg-emerald-950/30 border-emerald-500 shadow-sm' 
                        : 'hover:bg-slate-800/40 opacity-70 hover:opacity-100'
                    }`}
                    style={{ borderColor: syncMode === 'host-to-local' ? accentColor : currentThemeConfig.border }}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-white mb-1">
                      <Download size={14} className="text-emerald-400" />
                      <span>Host → Local</span>
                    </div>
                    <p className="text-[10.5px] leading-snug" style={{ color: currentThemeConfig.textMuted }}>
                      Tải tệp từ máy chủ về máy cục bộ (Mirror Download)
                    </p>
                  </div>

                  {/* Mode 3: Two-Way */}
                  <div
                    onClick={() => !isSyncing && setSyncMode('two-way')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      syncMode === 'two-way' 
                        ? 'bg-emerald-950/30 border-emerald-500 shadow-sm' 
                        : 'hover:bg-slate-800/40 opacity-70 hover:opacity-100'
                    }`}
                    style={{ borderColor: syncMode === 'two-way' ? accentColor : currentThemeConfig.border }}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-white mb-1">
                      <RotateCw size={14} className="text-amber-400" />
                      <span>Hai Chiều (Two-Way)</span>
                    </div>
                    <p className="text-[10.5px] leading-snug" style={{ color: currentThemeConfig.textMuted }}>
                      Tệp thiếu ở bên nào sẽ tự động truyền sang bên đó
                    </p>
                  </div>

                  {/* Mode 4: Incremental */}
                  <div
                    onClick={() => !isSyncing && setSyncMode('incremental')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      syncMode === 'incremental' 
                        ? 'bg-emerald-950/30 border-emerald-500 shadow-sm' 
                        : 'hover:bg-slate-800/40 opacity-70 hover:opacity-100'
                    }`}
                    style={{ borderColor: syncMode === 'incremental' ? accentColor : currentThemeConfig.border }}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-white mb-1">
                      <Zap size={14} className="text-purple-400" />
                      <span>Chỉ tệp mới / Thay đổi</span>
                    </div>
                    <p className="text-[10.5px] leading-snug" style={{ color: currentThemeConfig.textMuted }}>
                      Chỉ truyền tệp mới hoặc có kích thước/thời gian khác
                    </p>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="flex flex-wrap items-center gap-4 py-2 border-y mb-3 text-xs" style={{ borderColor: currentThemeConfig.border }}>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={syncOverwrite}
                    disabled={isSyncing}
                    onChange={(e) => setSyncOverwrite(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <span style={{ color: currentThemeConfig.text }}>Ghi đè tệp cũ nếu đã tồn tại</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={syncIgnoreHidden}
                    disabled={isSyncing}
                    onChange={(e) => setSyncIgnoreHidden(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <span style={{ color: currentThemeConfig.text }}>Bỏ qua tệp/thư mục ẩn (bắt đầu bằng .)</span>
                </label>
              </div>

              {/* Preview Tasks List */}
              <div className="flex-1 min-h-[110px] max-h-[160px] overflow-y-auto mb-3 custom-scroll">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: currentThemeConfig.textMuted }}>
                    Danh sách tệp sẽ truyền ({tasks.length}):
                  </span>
                </div>
                {tasks.length === 0 ? (
                  <div 
                    className="p-4 rounded-xl border text-center text-xs"
                    style={{ backgroundColor: currentThemeConfig.innerInput, borderColor: currentThemeConfig.border, color: currentThemeConfig.textMuted }}
                  >
                    ✓ Cả 2 phía đã đồng bộ dữ liệu theo tiêu chí đã chọn.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {tasks.map((task, idx) => (
                      <div 
                        key={idx}
                        className="p-1.5 px-2.5 rounded-lg border flex items-center justify-between text-[11px] font-mono"
                        style={{ backgroundColor: currentThemeConfig.innerInput, borderColor: currentThemeConfig.border }}
                      >
                        <div className="flex items-center gap-2 truncate max-w-[340px]">
                          {task.direction === 'upload' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-sky-950/60 text-sky-400 border border-sky-800/40">
                              ⬆ UPLOAD
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                              ⬇ DOWNLOAD
                            </span>
                          )}
                          <span className="text-slate-200 truncate">{task.name}</span>
                        </div>
                        <span className="text-[10px]" style={{ color: currentThemeConfig.textMuted }}>
                          {task.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress bar during sync */}
              {isSyncing && (
                <div className="mb-3 p-2.5 rounded-xl border bg-slate-900/80 border-slate-700/60">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <RefreshCw size={12} className="animate-spin" />
                      Đang đồng bộ ({syncProgress.current}/{syncProgress.total})...
                    </span>
                    <span className="text-slate-400 truncate max-w-[200px]">{syncProgress.currentItem}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-200"
                      style={{ width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: currentThemeConfig.border }}>
                <span className="text-[11px]" style={{ color: currentThemeConfig.textMuted }}>
                  {tasks.length > 0 ? `Sẵn sàng đồng bộ ${tasks.length} tệp` : 'Không có thay đổi cần truyền'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => setIsSyncModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl border text-xs text-slate-400 hover:text-white transition-all disabled:opacity-40 cursor-pointer whitespace-nowrap flex-shrink-0"
                    style={{ borderColor: currentThemeConfig.border }}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    disabled={isSyncing || tasks.length === 0}
                    onClick={handleExecuteSync}
                    className="px-4 py-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                    style={{ backgroundColor: '#10b981' }}
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Đang Đồng Bộ ({syncMethod === 'fast' ? 'Fast' : 'Chunk'})...</span>
                      </>
                    ) : (
                      <>
                        <ArrowLeftRight size={13} />
                        <span>Bắt Đầu Đồng Bộ ({tasks.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating notification */}
      {notification && (
        <div 
          className="fixed bottom-6 right-6 z-50 border text-xs px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-2"
          style={{
            backgroundColor: currentThemeConfig.card,
            borderColor: accentColor,
            color: accentColor
          }}
        >
          <CheckCircle size={14} />
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
}
