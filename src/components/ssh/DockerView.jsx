import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Play, 
  Square, 
  RotateCw, 
  Terminal, 
  Search, 
  RefreshCw,
  Cpu,
  Layers,
  Server,
  FileText,
  AlertCircle,
  X,
  HardDrive,
  Network,
  Database,
  CheckCircle2,
  ChevronDown,
  AlertTriangle,
  LayoutList,
  LayoutGrid,
  Plus,
  Trash2,
  DownloadCloud,
  FolderGit2,
  Share2,
  Clock,
  ExternalLink,
  Sliders,
  Check
} from 'lucide-react';
import { THEME_CONFIGS, getMetricColor } from '../../constants/palettes';
import DataTable, { TableActionButton } from '../common/DataTable';
import ConfirmModal from '../common/ConfirmModal';
import { translations } from '../../i18n/translations';
import { 
  fetchRemoteDockerContainers, 
  fetchDockerImages,
  fetchDockerVolumes,
  fetchDockerNetworks,
  fetchDockerCompose,
  fetchDockerInfo,
  execSshCommand 
} from '../../services/sshClient';

export const LOCALHOST_MACHINE = {
  id: 'localhost',
  name: 'localhost',
  host: 'localhost',
  user: 'local',
  os: 'local',
  isLocal: true,
  description: 'Máy cục bộ / WSL Docker'
};

export default function DockerView({ 
  machines = [], 
  preselectedHost = null,
  onOpenTerminalWithCommand,
  settings = {}
}) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';
  const lang = settings?.language || 'vi';
  const t = translations[lang] || translations.vi;

  const isWsl = !!(settings?.enableWsl);
  const [activeTab, setActiveTab] = useState('Containers'); // 'Containers' | 'Overview' | 'Compose' | 'Images' | 'Volumes' | 'Networks'
  
  // Data State
  const [containers, setContainers] = useState([]);
  const [images, setImages] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [composeProjects, setComposeProjects] = useState([]);
  const [dockerInfo, setDockerInfo] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHostId, setSelectedHostId] = useState(() => {
    if (preselectedHost) return preselectedHost.id;
    return 'localhost';
  });

  useEffect(() => {
    if (preselectedHost) {
      setSelectedHostId(preselectedHost.id);
    }
  }, [preselectedHost]);

  const [errorMessage, setErrorMessage] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [operatingContainerIds, setOperatingContainerIds] = useState({});
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('service_tool_docker_view_mode') || 'list';
    } catch (_) {
      return 'list';
    }
  });

  // Dialog / Modal States
  const [isPullModalOpen, setIsPullModalOpen] = useState(false);
  const [pullImageInput, setPullImageInput] = useState('');
  const [isCreateVolumeOpen, setIsCreateVolumeOpen] = useState(false);
  const [newVolumeInput, setNewVolumeInput] = useState('');
  const [isCreateNetworkOpen, setIsCreateNetworkOpen] = useState(false);
  const [newNetworkInput, setNewNetworkInput] = useState('');
  const [newNetworkDriver, setNewNetworkDriver] = useState('bridge');
  const [itemToDelete, setItemToDelete] = useState(null); // { type, id, name, extra }

  useEffect(() => {
    if (!isPullModalOpen && !isCreateVolumeOpen && !isCreateNetworkOpen && !itemToDelete) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (itemToDelete) setItemToDelete(null);
        else if (isPullModalOpen) setIsPullModalOpen(false);
        else if (isCreateVolumeOpen) setIsCreateVolumeOpen(false);
        else if (isCreateNetworkOpen) setIsCreateNetworkOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPullModalOpen, isCreateVolumeOpen, isCreateNetworkOpen, itemToDelete]);

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('service_tool_docker_view_mode', mode);
    } catch (_) {}
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const allAvailableHosts = [
    LOCALHOST_MACHINE,
    ...machines.filter(m => m.id !== 'localhost')
  ];

  const currentMachine = allAvailableHosts.find((m) => m.id === selectedHostId) || LOCALHOST_MACHINE;
  const isLocalHost = currentMachine.id === 'localhost' || currentMachine.host === 'localhost' || currentMachine.isLocal;
  const targetHost = isLocalHost ? 'localhost' : (currentMachine.name || currentMachine.host);

  // Load all Docker resources
  const loadAllDockerData = useCallback(async (hostName) => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const [
        containersRes, 
        imagesRes, 
        volumesRes, 
        networksRes, 
        composeRes,
        infoRes
      ] = await Promise.allSettled([
        fetchRemoteDockerContainers(hostName, isWsl),
        fetchDockerImages(hostName, isWsl),
        fetchDockerVolumes(hostName, isWsl),
        fetchDockerNetworks(hostName, isWsl),
        fetchDockerCompose(hostName, isWsl),
        fetchDockerInfo(hostName, isWsl)
      ]);

      if (containersRes.status === 'fulfilled' && Array.isArray(containersRes.value)) {
        setContainers(containersRes.value.map(c => ({
          ...c,
          state: (c.state || '').toUpperCase().includes('RUNNING') ? 'RUNNING' : 'STOPPED'
        })));
      } else {
        setContainers([]);
      }

      if (imagesRes.status === 'fulfilled' && Array.isArray(imagesRes.value)) {
        setImages(imagesRes.value);
      } else {
        setImages([]);
      }

      if (volumesRes.status === 'fulfilled' && Array.isArray(volumesRes.value)) {
        setVolumes(volumesRes.value);
      } else {
        setVolumes([]);
      }

      if (networksRes.status === 'fulfilled' && Array.isArray(networksRes.value)) {
        setNetworks(networksRes.value);
      } else {
        setNetworks([]);
      }

      if (composeRes.status === 'fulfilled' && Array.isArray(composeRes.value)) {
        setComposeProjects(composeRes.value);
      } else {
        setComposeProjects([]);
      }

      if (infoRes.status === 'fulfilled' && infoRes.value) {
        setDockerInfo(infoRes.value);
      } else {
        setDockerInfo(null);
      }

      showToast(`Đã nạp dữ liệu Docker từ ${hostName}`);
    } catch (err) {
      console.warn('Docker fetch failed:', err);
      setErrorMessage(String(err));
    } finally {
      setIsRefreshing(false);
    }
  }, [isWsl]);

  useEffect(() => {
    if (targetHost) {
      loadAllDockerData(targetHost);
    }
  }, [targetHost, loadAllDockerData]);

  const tabs = [
    { id: 'Containers', label: 'Containers', count: containers.length },
    { id: 'Overview', label: 'Overview' },
    { id: 'Compose', label: 'Compose', count: composeProjects.length },
    { id: 'Images', label: 'Images', count: images.length },
    { id: 'Volumes', label: 'Volumes', count: volumes.length },
    { id: 'Networks', label: 'Networks', count: networks.length }
  ];

  const handleRefresh = () => {
    loadAllDockerData(targetHost);
  };

  // Silent refresh only containers without full-page isRefreshing / table flash
  const refreshContainersOnly = useCallback(async (hostName) => {
    try {
      const res = await fetchRemoteDockerContainers(hostName, isWsl);
      if (Array.isArray(res)) {
        setContainers((prev) => {
          const map = new Map(res.map((c) => [c.id, c]));
          const updated = prev.map((c) => {
            const fresh = map.get(c.id);
            if (!fresh) return c;
            return {
              ...c,
              ...fresh,
              state: (fresh.state || '').toUpperCase().includes('RUNNING') ? 'RUNNING' : 'STOPPED'
            };
          });
          for (const c of res) {
            if (!prev.some((p) => p.id === c.id)) {
              updated.push({
                ...c,
                state: (c.state || '').toUpperCase().includes('RUNNING') ? 'RUNNING' : 'STOPPED'
              });
            }
          }
          return updated;
        });
      }
    } catch (err) {
      console.warn('Failed to refresh containers silently:', err);
    }
  }, [isWsl]);

  // Container operations with smooth localized state update (no whole-list reload)
  const toggleContainer = async (id) => {
    const c = containers.find(item => item.id === id);
    if (!c || operatingContainerIds[id]) return;

    const isRunning = c.state === 'RUNNING';
    const nextAction = isRunning ? 'stop' : 'start';
    const tempState = nextAction === 'start' ? 'STARTING' : 'STOPPING';

    // 1. Optimistic update on this specific container
    setOperatingContainerIds(prev => ({ ...prev, [id]: tempState }));
    setContainers(prev => prev.map(item => item.id === id ? { ...item, state: tempState } : item));

    showToast(`Đang ${nextAction === 'start' ? 'khởi động' : 'dừng'} container ${c.name}...`);
    try {
      await execSshCommand(targetHost, `docker ${nextAction} ${c.name}`, isWsl);
      // 2. Silent refresh only containers in background without triggering isRefreshing
      await refreshContainersOnly(targetHost);
      showToast(`Đã ${nextAction === 'start' ? 'khởi động' : 'dừng'} container ${c.name} thành công.`);
    } catch (e) {
      // Revert if error
      setContainers(prev => prev.map(item => item.id === id ? { ...item, state: isRunning ? 'RUNNING' : 'STOPPED' } : item));
      showToast(`Lỗi khi thao tác container: ${e.message || e}`);
    } finally {
      setOperatingContainerIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleRestart = async (c) => {
    if (!c || operatingContainerIds[c.id]) return;
    setOperatingContainerIds(prev => ({ ...prev, [c.id]: 'RESTARTING' }));
    showToast(`Đang khởi động lại container ${c.name}...`);
    try {
      await execSshCommand(targetHost, `docker restart ${c.name}`, isWsl);
      showToast(`Đã khởi động lại container ${c.name} thành công.`);
      await refreshContainersOnly(targetHost);
    } catch (e) {
      showToast(`Lỗi khởi động lại: ${e.message || e}`);
    } finally {
      setOperatingContainerIds(prev => {
        const next = { ...prev };
        delete next[c.id];
        return next;
      });
    }
  };

  const handleViewLogs = (c) => {
    if (onOpenTerminalWithCommand) {
      onOpenTerminalWithCommand(`docker logs -f --tail 100 ${c.name}`, currentMachine);
    }
  };

  const handleExec = (c) => {
    if (onOpenTerminalWithCommand) {
      onOpenTerminalWithCommand(`docker exec -it ${c.name} /bin/sh || docker exec -it ${c.name} bash`, currentMachine);
    }
  };

  // Compose actions
  const handleComposeAction = async (project, action) => {
    const file = project.ConfigFiles || project.configFiles;
    showToast(`Đang thực hiện ${action} cho project ${project.Name}...`);
    try {
      const cmd = action === 'up'
        ? `docker compose -f "${file}" up -d`
        : action === 'down'
        ? `docker compose -f "${file}" down`
        : `docker compose -f "${file}" restart`;
      await execSshCommand(targetHost, cmd, isWsl);
      showToast(`Đã ${action} project ${project.Name} thành công.`);
      loadAllDockerData(targetHost);
    } catch (e) {
      showToast(`Lỗi thao tác Compose: ${e}`);
    }
  };

  const handleComposeLogs = (project) => {
    const file = project.ConfigFiles || project.configFiles;
    if (onOpenTerminalWithCommand) {
      onOpenTerminalWithCommand(`docker compose -f "${file}" logs -f --tail 100`, currentMachine);
    }
  };

  // Pull Image
  const handlePullImage = async (e) => {
    e.preventDefault();
    if (!pullImageInput.trim()) return;
    const img = pullImageInput.trim();
    setIsPullModalOpen(false);
    showToast(`Đang kéo Docker image ${img}...`);
    try {
      await execSshCommand(targetHost, `docker pull ${img}`, isWsl);
      showToast(`Đã kéo thành công image ${img}`);
      setPullImageInput('');
      loadAllDockerData(targetHost);
    } catch (err) {
      showToast(`Lỗi kéo image: ${err}`);
    }
  };

  // Create Volume
  const handleCreateVolume = async (e) => {
    e.preventDefault();
    if (!newVolumeInput.trim()) return;
    const vol = newVolumeInput.trim();
    setIsCreateVolumeOpen(false);
    showToast(`Đang tạo Docker Volume ${vol}...`);
    try {
      await execSshCommand(targetHost, `docker volume create ${vol}`, isWsl);
      showToast(`Đã tạo thành công volume ${vol}`);
      setNewVolumeInput('');
      loadAllDockerData(targetHost);
    } catch (err) {
      showToast(`Lỗi tạo volume: ${err}`);
    }
  };

  // Create Network
  const handleCreateNetwork = async (e) => {
    e.preventDefault();
    if (!newNetworkInput.trim()) return;
    const net = newNetworkInput.trim();
    setIsCreateNetworkOpen(false);
    showToast(`Đang tạo Docker Network ${net}...`);
    try {
      await execSshCommand(targetHost, `docker network create --driver ${newNetworkDriver} ${net}`, isWsl);
      showToast(`Đã tạo thành công network ${net}`);
      setNewNetworkInput('');
      loadAllDockerData(targetHost);
    } catch (err) {
      showToast(`Lỗi tạo network: ${err}`);
    }
  };

  // Prune unused
  const handlePruneSystem = async () => {
    showToast('Đang dọn dẹp các tài nguyên Docker không dùng...');
    try {
      await execSshCommand(targetHost, 'docker system prune -f', isWsl);
      showToast('Đã dọn dẹp hệ thống Docker thành công.');
      loadAllDockerData(targetHost);
    } catch (err) {
      showToast(`Lỗi dọn dẹp: ${err}`);
    }
  };

  // Execute confirmed deletion
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const { type, id, name, extra } = itemToDelete;
    setItemToDelete(null);
    showToast(`Đang xóa ${type}: ${name}...`);
    try {
      if (type === 'container') {
        await execSshCommand(targetHost, `docker rm -f ${id}`, isWsl);
      } else if (type === 'image') {
        await execSshCommand(targetHost, `docker rmi -f ${id}`, isWsl);
      } else if (type === 'volume') {
        await execSshCommand(targetHost, `docker volume rm -f ${id}`, isWsl);
      } else if (type === 'network') {
        await execSshCommand(targetHost, `docker network rm ${id}`, isWsl);
      } else if (type === 'compose') {
        await execSshCommand(targetHost, `docker compose -f "${extra}" down`, isWsl);
      }
      showToast(`Đã xóa thành công ${name}`);
      loadAllDockerData(targetHost);
    } catch (err) {
      showToast(`Lỗi xóa: ${err}`);
    }
  };

  // Filtered Lists
  const q = searchQuery.toLowerCase().trim();
  const filteredContainers = containers.filter(c => (c.name || '').toLowerCase().includes(q) || (c.image || '').toLowerCase().includes(q));
  const filteredImages = images.filter(img => (img.repository || '').toLowerCase().includes(q) || (img.tag || '').toLowerCase().includes(q) || (img.id || '').toLowerCase().includes(q));
  const filteredVolumes = volumes.filter(v => (v.name || '').toLowerCase().includes(q));
  const filteredNetworks = networks.filter(n => (n.name || '').toLowerCase().includes(q) || (n.driver || '').toLowerCase().includes(q));
  const filteredCompose = composeProjects.filter(p => (p.Name || '').toLowerCase().includes(q) || (p.ConfigFiles || '').toLowerCase().includes(q));

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-4 font-sans select-none custom-scroll">
      {/* Top Search bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Tìm kiếm trong ${activeTab}...`}
          className="w-full h-10 pl-10 pr-4 rounded-xl border text-xs focus:outline-none transition-all"
          style={{
            backgroundColor: currentThemeConfig.innerInput,
            borderColor: currentThemeConfig.border,
            color: currentThemeConfig.text
          }}
        />
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 rounded-xl border bg-rose-950/40 border-rose-900/60 text-rose-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-rose-400 flex-shrink-0" />
            <span className="font-mono text-[11px]">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Target Host Dropdown + Sub-Tabs Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
        {/* Left: Target Host Selector */}
        <div className="flex items-center gap-2">
          <div 
            className="flex items-center gap-2 h-9 px-3 rounded-xl border text-xs font-mono"
            style={{
              backgroundColor: currentThemeConfig.innerInput,
              borderColor: currentThemeConfig.border
            }}
          >
            <Box size={14} style={{ color: accentColor }} />
            <span style={{ color: currentThemeConfig.textMuted }}>Target Host:</span>
            <select
              value={selectedHostId}
              onChange={(e) => setSelectedHostId(e.target.value)}
              className="bg-transparent text-xs font-bold font-mono focus:outline-none cursor-pointer"
              style={{ color: currentThemeConfig.text }}
            >
              <option value="localhost" className="bg-[#121622] text-white">
                localhost (Máy cục bộ / WSL)
              </option>
              {machines.filter(m => m.id !== 'localhost').map((m) => (
                <option key={m.id} value={m.id} className="bg-[#121622] text-white">
                  {m.name} ({m.host})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRefresh}
            title="Làm mới toàn bộ Docker"
            className="w-9 h-9 rounded-xl border flex items-center justify-center transition-all hover:opacity-80 active:scale-95"
            style={{
              backgroundColor: currentThemeConfig.innerInput,
              borderColor: currentThemeConfig.border,
              color: isRefreshing ? accentColor : currentThemeConfig.textMuted
            }}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          {/* Quick Action Buttons according to active tab */}
          {activeTab === 'Images' && (
            <button
              onClick={() => setIsPullModalOpen(true)}
              className="h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all text-white shadow-sm"
              style={{ backgroundColor: accentColor, borderColor: accentColor }}
            >
              <DownloadCloud size={13} />
              <span>Pull Image</span>
            </button>
          )}

          {activeTab === 'Volumes' && (
            <button
              onClick={() => setIsCreateVolumeOpen(true)}
              className="h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all text-white shadow-sm"
              style={{ backgroundColor: accentColor, borderColor: accentColor }}
            >
              <Plus size={13} />
              <span>Tạo Volume</span>
            </button>
          )}

          {activeTab === 'Networks' && (
            <button
              onClick={() => setIsCreateNetworkOpen(true)}
              className="h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all text-white shadow-sm"
              style={{ backgroundColor: accentColor, borderColor: accentColor }}
            >
              <Plus size={13} />
              <span>Tạo Network</span>
            </button>
          )}

          {/* View Mode Switcher for all resource tabs */}
          {activeTab !== 'Overview' && (
            <div 
              className="flex items-center p-0.5 rounded-xl border"
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
                title="Dạng danh sách (List View)"
              >
                <LayoutList size={13} />
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
                <LayoutGrid size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Right: Sub-Tabs */}
        <div 
          className="flex items-center gap-1 p-1 rounded-xl border overflow-x-auto max-w-full"
          style={{
            backgroundColor: currentThemeConfig.innerInput,
            borderColor: currentThemeConfig.border
          }}
        >
          {tabs.map((tab) => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap"
                style={{
                  backgroundColor: isTabActive ? `${accentColor}20` : 'transparent',
                  color: isTabActive ? accentColor : currentThemeConfig.textMuted,
                  border: isTabActive ? `1px solid ${accentColor}50` : '1px solid transparent',
                  boxShadow: isTabActive ? `0 0 10px ${accentColor}20` : 'none'
                }}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/40">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. OVERVIEW TAB                                          */}
      {/* ======================================================== */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
          {/* System Info Banner */}
          {dockerInfo && (
            <div 
              className="p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4"
              style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Box size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-2" style={{ color: currentThemeConfig.text }}>
                    <span>Docker Daemon v{dockerInfo.serverVersion}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Active</span>
                  </div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: currentThemeConfig.textMuted }}>
                    {dockerInfo.os} ({dockerInfo.arch}) • {dockerInfo.cpus} Cores • {dockerInfo.memory} RAM
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePruneSystem}
                  className="px-3 py-1.5 rounded-xl border text-xs font-semibold hover:border-rose-500/50 hover:text-rose-400 transition-all flex items-center gap-1.5"
                  style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.textMuted }}
                  title="Xóa container, image, network không sử dụng"
                >
                  <Trash2 size={13} />
                  <span>Dọn Dẹp (Prune)</span>
                </button>
              </div>
            </div>
          )}

          {/* Interactive Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div 
              onClick={() => setActiveTab('Containers')}
              className="p-4 rounded-xl border cursor-pointer hover:border-emerald-500/50 transition-all space-y-1" 
              style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}
            >
              <div className="text-xs flex items-center justify-between" style={{ color: currentThemeConfig.textMuted }}>
                <span>Containers</span>
                <Square size={13} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">{containers.length}</div>
              <div className="text-[10px] font-mono text-emerald-400/80">
                {containers.filter(c => c.state === 'RUNNING').length} đang chạy • {containers.filter(c => c.state !== 'RUNNING').length} đã dừng
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('Compose')}
              className="p-4 rounded-xl border cursor-pointer hover:border-sky-500/50 transition-all space-y-1" 
              style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}
            >
              <div className="text-xs flex items-center justify-between" style={{ color: currentThemeConfig.textMuted }}>
                <span>Compose</span>
                <FolderGit2 size={13} className="text-sky-400" />
              </div>
              <div className="text-2xl font-bold text-sky-400">{composeProjects.length}</div>
              <div className="text-[10px] font-mono text-slate-400">Dự án compose đã tạo</div>
            </div>

            <div 
              onClick={() => setActiveTab('Images')}
              className="p-4 rounded-xl border cursor-pointer hover:border-purple-500/50 transition-all space-y-1" 
              style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}
            >
              <div className="text-xs flex items-center justify-between" style={{ color: currentThemeConfig.textMuted }}>
                <span>Images</span>
                <Layers size={13} className="text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-400">{images.length}</div>
              <div className="text-[10px] font-mono text-slate-400">Docker images lưu trữ</div>
            </div>

            <div 
              onClick={() => setActiveTab('Volumes')}
              className="p-4 rounded-xl border cursor-pointer hover:border-amber-500/50 transition-all space-y-1" 
              style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}
            >
              <div className="text-xs flex items-center justify-between" style={{ color: currentThemeConfig.textMuted }}>
                <span>Volumes</span>
                <HardDrive size={13} className="text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400">{volumes.length}</div>
              <div className="text-[10px] font-mono text-slate-400">Ổ lưu trữ dữ liệu</div>
            </div>

            <div 
              onClick={() => setActiveTab('Networks')}
              className="p-4 rounded-xl border cursor-pointer hover:border-rose-500/50 transition-all space-y-1" 
              style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}
            >
              <div className="text-xs flex items-center justify-between" style={{ color: currentThemeConfig.textMuted }}>
                <span>Networks</span>
                <Network size={13} className="text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-rose-400">{networks.length}</div>
              <div className="text-[10px] font-mono text-slate-400">Mạng kết nối cô lập</div>
            </div>
          </div>

          {/* Quick Containers Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Các Container Hiện Tại ({containers.length})
              </h3>
              <button 
                onClick={() => setActiveTab('Containers')} 
                className="text-xs font-semibold hover:underline"
                style={{ color: accentColor }}
              >
                Xem tất cả Containers →
              </button>
            </div>
            {isRefreshing ? (
              <div className="p-8 rounded-2xl border text-center space-y-3 flex flex-col items-center justify-center" style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}>
                <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-300 font-sans">Đang tải danh sách containers từ máy chủ...</p>
              </div>
            ) : containers.length === 0 ? (
              <div className="p-8 rounded-2xl border text-center space-y-2" style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}>
                <Box size={32} className="mx-auto opacity-40 text-slate-400" />
                <p className="text-xs text-slate-400">Chưa có container nào trên máy chủ này.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {containers.slice(0, 5).map((c) => (
                  <div 
                    key={c.id} 
                    className="p-3 rounded-xl border flex items-center justify-between gap-3"
                    style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}
                  >
                    <div className="flex items-center gap-3">
                      {(() => {
                        const isOperating = !!operatingContainerIds[c.id];
                        const isRunning = c.state === 'RUNNING';
                        return (
                          <>
                            <button
                              onClick={() => toggleContainer(c.id)}
                              disabled={isOperating}
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                                isOperating 
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 opacity-80' 
                                  : isRunning 
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                              title={isOperating ? operatingContainerIds[c.id] : isRunning ? 'Dừng container' : 'Chạy container'}
                            >
                              {isOperating ? (
                                <RefreshCw size={11} className="animate-spin" />
                              ) : isRunning ? (
                                <Square size={11} fill="currentColor" />
                              ) : (
                                <Play size={11} fill="currentColor" />
                              )}
                            </button>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                <span>{c.name}</span>
                                <span className={`text-[9px] font-mono px-2 py-0.2 rounded-full font-bold flex items-center gap-1 ${
                                  isOperating
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                    : isRunning 
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning || isOperating ? 'animate-pulse' : ''}`} style={{ backgroundColor: isOperating ? '#f59e0b' : isRunning ? '#10b981' : '#64748b' }} />
                                  {isOperating ? operatingContainerIds[c.id] : c.state}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-500">{c.image} • {c.ports || 'no ports'}</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TableActionButton icon={RotateCw} variant="ghost" onClick={() => handleRestart(c)} title="Restart" />
                      <TableActionButton icon={FileText} variant="ghost" onClick={() => handleViewLogs(c)} title="Logs" />
                      <TableActionButton icon={Terminal} variant="primary" accentColor={accentColor} onClick={() => handleExec(c)} title="Exec" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CONTAINERS TAB                                        */}
      {/* ======================================================== */}
      {activeTab === 'Containers' && (
        viewMode === 'list' ? (
          <DataTable
            columns={[
              {
                key: 'toggle',
                label: 'BẬT/TẮT',
                align: 'center',
                width: 'w-14',
                render: (c) => {
                  const isOperating = !!operatingContainerIds[c.id];
                  const isRunning = c.state === 'RUNNING';
                  return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleContainer(c.id);
                      }}
                      disabled={isOperating}
                      className="w-7 h-7 rounded-lg border inline-flex items-center justify-center transition-all disabled:opacity-75 cursor-pointer"
                      style={{
                        backgroundColor: isOperating ? 'rgba(245, 158, 11, 0.15)' : isRunning ? `${accentColor}20` : currentThemeConfig.innerInput,
                        borderColor: isOperating ? 'rgba(245, 158, 11, 0.4)' : isRunning ? `${accentColor}50` : currentThemeConfig.border,
                        color: isOperating ? '#fbbf24' : isRunning ? accentColor : currentThemeConfig.textMuted
                      }}
                      title={isOperating ? operatingContainerIds[c.id] : isRunning ? 'Dừng container' : 'Chạy container'}
                    >
                      {isOperating ? (
                        <RefreshCw size={11} className="animate-spin" />
                      ) : isRunning ? (
                        <Square size={11} fill="currentColor" />
                      ) : (
                        <Play size={11} fill="currentColor" />
                      )}
                    </button>
                  );
                }
              },
              {
                key: 'name',
                label: 'CONTAINER',
                render: (c) => {
                  const isOperating = !!operatingContainerIds[c.id];
                  const isRunning = c.state === 'RUNNING';
                  return (
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{c.name}</span>
                      <span
                        className="text-[9px] font-mono px-2 py-0.2 rounded-full font-bold flex items-center gap-1"
                        style={{
                          backgroundColor: isOperating ? 'rgba(245, 158, 11, 0.15)' : isRunning ? `${accentColor}18` : currentThemeConfig.innerInput,
                          color: isOperating ? '#fbbf24' : isRunning ? accentColor : currentThemeConfig.textMuted,
                          border: `1px solid ${isOperating ? 'rgba(245, 158, 11, 0.4)' : isRunning ? `${accentColor}40` : currentThemeConfig.border}`
                        }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isRunning || isOperating ? 'animate-pulse' : ''}`} style={{ backgroundColor: isOperating ? '#f59e0b' : isRunning ? accentColor : '#64748b' }} />
                        {isOperating ? operatingContainerIds[c.id] : c.state}
                      </span>
                    </div>
                  );
                }
              },
              {
                key: 'image',
                label: 'IMAGE',
                render: (c) => <span className="font-mono text-xs opacity-80">{c.image}</span>
              },
              {
                key: 'status',
                label: 'TRẠNG THÁI / UPTIME',
                render: (c) => <span className="font-mono text-[11px] opacity-70">{c.status}</span>
              },
              {
                key: 'ports',
                label: 'PORTS',
                render: (c) => <span className="font-mono text-[11px] text-slate-400 truncate max-w-[200px] block">{c.ports || '-'}</span>
              },
              {
                key: 'actions',
                label: 'THAO TÁC',
                align: 'right',
                render: (c) => (
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <TableActionButton
                      icon={RotateCw}
                      variant="ghost"
                      onClick={() => handleRestart(c)}
                      title="Khởi động lại (Restart)"
                      className="w-7 h-7 !px-0"
                    />
                    <TableActionButton
                      icon={FileText}
                      variant="ghost"
                      onClick={() => handleViewLogs(c)}
                      title="Xem Logs (docker logs)"
                      className="w-7 h-7 !px-0"
                    />
                    <TableActionButton
                      icon={Terminal}
                      variant="primary"
                      accentColor={accentColor}
                      onClick={() => handleExec(c)}
                      title="Mở Shell Terminal (docker exec)"
                      className="w-7 h-7 !px-0"
                    />
                    <TableActionButton
                      icon={Trash2}
                      variant="danger"
                      onClick={() => setItemToDelete({ type: 'container', id: c.id, name: c.name })}
                      title="Xóa container"
                      className="w-7 h-7 !px-0"
                    />
                  </div>
                )
              }
            ]}
            data={filteredContainers}
            isLoading={isRefreshing}
            loadingMessage="Đang tải danh sách container từ máy chủ..."
            themeConfig={currentThemeConfig}
            emptyMessage="Không tìm thấy container nào phù hợp."
            footer={(
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <span>Tổng: <strong style={{ color: currentThemeConfig.text }}>{filteredContainers.length}</strong> containers</span>
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {filteredContainers.filter(c => c.state === 'RUNNING').length} Đang chạy
                  </span>
                  <span>•</span>
                  <span>{filteredContainers.filter(c => c.state !== 'RUNNING').length} Đã dừng</span>
                </div>
                <div className="text-[11px] hidden sm:block" style={{ color: currentThemeConfig.textMuted }}>
                  Bấm nút bên trái để Chạy / Dừng container
                </div>
              </div>
            )}
          />
        ) : isRefreshing ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 border rounded-2xl" style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}>
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-300 font-sans">Đang tải danh sách container từ máy chủ...</span>
          </div>
        ) : filteredContainers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 border rounded-2xl" style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border, color: currentThemeConfig.textMuted }}>
            <Box size={32} className="opacity-40 text-slate-400" />
            <span className="text-xs font-mono">Không tìm thấy container nào phù hợp.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
            {filteredContainers.map((c) => {
              const isRunning = c.state === 'RUNNING';
              return (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border space-y-3 transition-all"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: isRunning ? `${accentColor}40` : currentThemeConfig.border,
                    boxShadow: isRunning ? `0 0 15px ${accentColor}10` : 'none'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      {(() => {
                        const isOperating = !!operatingContainerIds[c.id];
                        return (
                          <button
                            onClick={() => toggleContainer(c.id)}
                            disabled={isOperating}
                            className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all disabled:opacity-75 cursor-pointer"
                            style={{
                              backgroundColor: isOperating ? 'rgba(245, 158, 11, 0.15)' : isRunning ? `${accentColor}20` : currentThemeConfig.innerInput,
                              borderColor: isOperating ? 'rgba(245, 158, 11, 0.4)' : isRunning ? `${accentColor}50` : currentThemeConfig.border,
                              color: isOperating ? '#fbbf24' : isRunning ? accentColor : currentThemeConfig.textMuted
                            }}
                            title={isOperating ? operatingContainerIds[c.id] : isRunning ? 'Dừng container' : 'Chạy container'}
                          >
                            {isOperating ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : isRunning ? (
                              <Square size={12} fill="currentColor" />
                            ) : (
                              <Play size={12} fill="currentColor" />
                            )}
                          </button>
                        );
                      })()}
                      <div>
                        <h4 className="text-xs font-bold leading-tight" style={{ color: currentThemeConfig.text }}>
                          {c.name}
                        </h4>
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: currentThemeConfig.textMuted }}>
                          {c.image}
                        </p>
                      </div>
                    </div>

                    {(() => {
                      const isOperating = !!operatingContainerIds[c.id];
                      return (
                        <span
                          className="text-[9.5px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                          style={{
                            backgroundColor: isOperating ? 'rgba(245, 158, 11, 0.15)' : isRunning ? `${accentColor}18` : currentThemeConfig.innerInput,
                            color: isOperating ? '#fbbf24' : isRunning ? accentColor : currentThemeConfig.textMuted,
                            border: `1px solid ${isOperating ? 'rgba(245, 158, 11, 0.4)' : isRunning ? `${accentColor}40` : currentThemeConfig.border}`
                          }}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isRunning || isOperating ? 'animate-pulse' : ''}`} style={{ backgroundColor: isOperating ? '#f59e0b' : isRunning ? accentColor : '#64748b' }} />
                          {isOperating ? operatingContainerIds[c.id] : c.state}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Ports & Status */}
                  <div 
                    className="p-2 rounded-lg border font-mono text-[10.5px] space-y-1"
                    style={{
                      backgroundColor: currentThemeConfig.innerInput,
                      borderColor: currentThemeConfig.border
                    }}
                  >
                    <div className="truncate text-slate-400">Ports: {c.ports || '-'}</div>
                    <div className="truncate text-[10px]" style={{ color: currentThemeConfig.textMuted }}>Uptime: {c.status}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono" style={{ color: currentThemeConfig.textMuted }}>
                      ID: {c.id.slice(0, 12)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRestart(c)}
                        className="p-1.5 rounded-lg border hover:bg-white/5 transition-all"
                        style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.textMuted }}
                        title="Khởi động lại"
                      >
                        <RotateCw size={12} />
                      </button>
                      <button
                        onClick={() => handleViewLogs(c)}
                        className="p-1.5 rounded-lg border hover:bg-white/5 transition-all"
                        style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.textMuted }}
                        title="Xem Logs"
                      >
                        <FileText size={12} />
                      </button>
                      <button
                        onClick={() => handleExec(c)}
                        className="p-1.5 rounded-lg border hover:bg-white/5 transition-all"
                        style={{ borderColor: currentThemeConfig.border, color: accentColor }}
                        title="Mở Shell Exec"
                      >
                        <Terminal size={12} />
                      </button>
                      <button
                        onClick={() => setItemToDelete({ type: 'container', id: c.id, name: c.name })}
                        className="p-1.5 rounded-lg border hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-all"
                        style={{ borderColor: currentThemeConfig.border }}
                        title="Xóa container"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ======================================================== */}
      {/* 3. COMPOSE TAB                                           */}
      {/* ======================================================== */}
      {activeTab === 'Compose' && (
        <div className="space-y-4">
          {filteredCompose.length === 0 ? (
            <div className="p-8 rounded-2xl border text-center space-y-2" style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}>
              <FolderGit2 size={32} className="mx-auto opacity-40 text-slate-400" />
              <p className="text-xs text-slate-400">Không tìm thấy Docker Compose project nào.</p>
            </div>
          ) : viewMode === 'list' ? (
            <DataTable
              columns={[
                {
                  key: 'name',
                  label: 'DỰ ÁN COMPOSE',
                  render: (p) => {
                    const isRunning = (p.Status || '').toLowerCase().includes('running');
                    return (
                      <div className="flex items-center gap-2.5">
                        <FolderGit2 size={16} className="text-sky-400 flex-shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-white">{p.Name}</div>
                          <span className={`text-[9.5px] font-mono px-2 py-0.2 rounded-full font-bold inline-block mt-0.5 ${
                            isRunning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {p.Status}
                          </span>
                        </div>
                      </div>
                    );
                  }
                },
                {
                  key: 'configFiles',
                  label: 'FILE DOCKER-COMPOSE.YML',
                  render: (p) => (
                    <span className="font-mono text-[11px] text-slate-400 truncate max-w-[380px] block" title={p.ConfigFiles}>
                      {p.ConfigFiles}
                    </span>
                  )
                },
                {
                  key: 'actions',
                  label: 'THAO TÁC',
                  align: 'right',
                  render: (p) => (
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <TableActionButton
                        icon={Play}
                        label="Up -d"
                        variant="primary"
                        accentColor={accentColor}
                        onClick={() => handleComposeAction(p, 'up')}
                        title="Khởi chạy nền (docker compose up -d)"
                      />
                      <TableActionButton
                        icon={RotateCw}
                        label="Restart"
                        variant="ghost"
                        onClick={() => handleComposeAction(p, 'restart')}
                        title="Khởi động lại (docker compose restart)"
                      />
                      <TableActionButton
                        icon={Square}
                        label="Down"
                        variant="ghost"
                        onClick={() => handleComposeAction(p, 'down')}
                        title="Dừng và hạ compose (docker compose down)"
                      />
                      <TableActionButton
                        icon={FileText}
                        label="Logs"
                        variant="ghost"
                        onClick={() => handleComposeLogs(p)}
                        title="Xem Logs realtime"
                      />
                      <TableActionButton
                        icon={Trash2}
                        variant="danger"
                        onClick={() => setItemToDelete({ type: 'compose', id: p.Name, name: p.Name, extra: p.ConfigFiles })}
                        title="Hạ và xóa project"
                        className="w-7 h-7 !px-0"
                      />
                    </div>
                  )
                }
              ]}
              data={filteredCompose}
              isLoading={isRefreshing}
              loadingMessage="Đang tải Docker Compose projects..."
              themeConfig={currentThemeConfig}
              emptyMessage="Không tìm thấy Docker Compose project nào."
              footer={
                <div className="text-xs text-slate-400 font-mono">
                  Tổng số Compose Projects: <strong className="text-white">{filteredCompose.length}</strong>
                </div>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCompose.map((p, idx) => {
                const isRunning = (p.Status || '').toLowerCase().includes('running');
                return (
                  <div
                    key={p.Name || idx}
                    className="p-5 rounded-2xl border space-y-3.5 transition-all"
                    style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                          <FolderGit2 size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{p.Name}</div>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold inline-block mt-1 ${
                            isRunning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {p.Status}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setItemToDelete({ type: 'compose', id: p.Name, name: p.Name, extra: p.ConfigFiles })}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg border border-transparent hover:border-rose-500/30 transition-all"
                        title="Dừng và hạ compose (down)"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="p-2.5 rounded-xl border bg-slate-900/40 border-slate-800 text-[11px] font-mono text-slate-400 truncate">
                      File: {p.ConfigFiles}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60">
                      <button
                        onClick={() => handleComposeAction(p, 'up')}
                        className="px-3 py-1.5 rounded-xl border text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/40 flex items-center gap-1.5 transition-all"
                      >
                        <Play size={12} />
                        <span>Up -d</span>
                      </button>
                      <button
                        onClick={() => handleComposeAction(p, 'restart')}
                        className="px-3 py-1.5 rounded-xl border text-xs font-semibold text-slate-300 hover:bg-white/5 border-slate-700 flex items-center gap-1.5 transition-all"
                      >
                        <RotateCw size={12} />
                        <span>Restart</span>
                      </button>
                      <button
                        onClick={() => handleComposeAction(p, 'down')}
                        className="px-3 py-1.5 rounded-xl border text-xs font-semibold text-amber-400 hover:bg-amber-500/10 border-amber-500/40 flex items-center gap-1.5 transition-all"
                      >
                        <Square size={12} />
                        <span>Down</span>
                      </button>
                      <button
                        onClick={() => handleComposeLogs(p)}
                        className="px-3 py-1.5 rounded-xl border text-xs font-semibold text-sky-400 hover:bg-sky-500/10 border-sky-500/40 flex items-center gap-1.5 transition-all"
                      >
                        <FileText size={12} />
                        <span>Logs</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. IMAGES TAB                                            */}
      {/* ======================================================== */}
      {activeTab === 'Images' && (
        viewMode === 'list' ? (
          <DataTable
            columns={[
              {
                key: 'repository',
                label: 'REPOSITORY & TAG',
                render: (img) => (
                  <div>
                    <div className="font-bold text-xs text-white">{img.repository}</div>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 inline-block mt-0.5">
                      {img.tag}
                    </span>
                  </div>
                )
              },
              {
                key: 'id',
                label: 'IMAGE ID',
                render: (img) => <span className="font-mono text-[11px] text-slate-400">{img.id?.slice(0, 12)}</span>
              },
              {
                key: 'size',
                label: 'DUNG LƯỢNG',
                render: (img) => <span className="font-mono text-xs font-bold text-emerald-400">{img.size}</span>
              },
              {
                key: 'createdAt',
                label: 'NGÀY TẠO',
                render: (img) => <span className="font-mono text-[11px] text-slate-500">{img.createdAt?.split(' ')[0] || img.createdAt}</span>
              },
              {
                key: 'actions',
                label: 'THAO TÁC',
                align: 'right',
                render: (img) => (
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <TableActionButton
                      icon={Play}
                      label="Chạy"
                      variant="primary"
                      accentColor={accentColor}
                      onClick={() => {
                        showToast(`Đang chạy container từ ${img.repository}:${img.tag}...`);
                        execSshCommand(targetHost, `docker run -d ${img.repository}:${img.tag}`, isWsl).then(() => {
                          showToast(`Đã khởi tạo container từ ${img.repository}`);
                          loadAllDockerData(targetHost);
                        });
                      }}
                      title="Chạy container từ Image này (docker run -d)"
                    />
                    <TableActionButton
                      icon={Trash2}
                      variant="danger"
                      onClick={() => setItemToDelete({ type: 'image', id: img.id, name: `${img.repository}:${img.tag}` })}
                      title="Xóa Image (docker rmi)"
                      className="w-7 h-7 !px-0"
                    />
                  </div>
                )
              }
            ]}
            data={filteredImages}
            isLoading={isRefreshing}
            loadingMessage="Đang tải Docker images..."
            themeConfig={currentThemeConfig}
            emptyMessage="Không tìm thấy Docker image nào."
            footer={
              <div className="text-xs text-slate-400 font-mono">
                Tổng số Images: <strong className="text-white">{filteredImages.length}</strong>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-150">
            {filteredImages.map((img) => (
              <div
                key={img.id}
                className="p-4 rounded-xl border space-y-3 transition-all flex flex-col justify-between"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
                      <Layers size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white truncate max-w-[190px]" title={img.repository}>{img.repository}</div>
                      <span className="text-[9.5px] font-mono px-2 py-0.2 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 inline-block mt-0.5">
                        {img.tag}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setItemToDelete({ type: 'image', id: img.id, name: `${img.repository}:${img.tag}` })}
                    className="p-1.5 rounded-lg border text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 transition-all"
                    style={{ borderColor: currentThemeConfig.border }}
                    title="Xóa Image"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div 
                  className="p-2 rounded-lg border font-mono text-[10.5px] space-y-1"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: currentThemeConfig.textMuted }}>ID:</span>
                    <span className="text-slate-300">{img.id?.slice(0, 12)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: currentThemeConfig.textMuted }}>Dung lượng:</span>
                    <span className="text-emerald-400 font-bold">{img.size}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-slate-500">{img.createdAt?.split(' ')[0] || img.createdAt}</span>
                  <button
                    onClick={() => {
                      showToast(`Đang chạy container từ ${img.repository}:${img.tag}...`);
                      execSshCommand(targetHost, `docker run -d ${img.repository}:${img.tag}`, isWsl).then(() => {
                        showToast(`Đã khởi tạo container từ ${img.repository}`);
                        loadAllDockerData(targetHost);
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white flex items-center gap-1 shadow-sm transition-all active:scale-95"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Play size={10} fill="currentColor" />
                    <span>Chạy</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ======================================================== */}
      {/* 5. VOLUMES TAB                                           */}
      {/* ======================================================== */}
      {activeTab === 'Volumes' && (
        viewMode === 'list' ? (
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'VOLUME NAME',
                render: (v) => (
                  <div className="flex items-center gap-2.5">
                    <HardDrive size={15} className="text-amber-400 flex-shrink-0" />
                    <span className="font-mono text-xs font-bold text-white break-all">{v.name}</span>
                  </div>
                )
              },
              {
                key: 'driver',
                label: 'DRIVER',
                render: (v) => <span className="font-mono text-xs text-slate-400">{v.driver}</span>
              },
              {
                key: 'scope',
                label: 'SCOPE',
                render: (v) => <span className="font-mono text-xs text-slate-400">{v.scope}</span>
              },
              {
                key: 'actions',
                label: 'THAO TÁC',
                align: 'right',
                render: (v) => (
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <TableActionButton
                      icon={Trash2}
                      variant="danger"
                      onClick={() => setItemToDelete({ type: 'volume', id: v.name, name: v.name })}
                      title="Xóa Volume (docker volume rm)"
                      className="w-7 h-7 !px-0"
                    />
                  </div>
                )
              }
            ]}
            data={filteredVolumes}
            isLoading={isRefreshing}
            loadingMessage="Đang tải Docker volumes..."
            themeConfig={currentThemeConfig}
            emptyMessage="Không tìm thấy Docker volume nào."
            footer={
              <div className="text-xs text-slate-400 font-mono">
                Tổng số Volumes: <strong className="text-white">{filteredVolumes.length}</strong>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-150">
            {filteredVolumes.map((v) => (
              <div
                key={v.name}
                className="p-4 rounded-xl border space-y-3 transition-all flex flex-col justify-between"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                      <HardDrive size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white break-all">{v.name}</div>
                      <span className="text-[9.5px] font-mono px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-block mt-0.5">
                        {v.driver}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setItemToDelete({ type: 'volume', id: v.name, name: v.name })}
                    className="p-1.5 rounded-lg border text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 transition-all"
                    style={{ borderColor: currentThemeConfig.border }}
                    title="Xóa Volume"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex justify-between text-[11px] font-mono pt-1 border-t border-slate-800 text-slate-500">
                  <span>Scope: {v.scope}</span>
                  <span className="text-amber-400/80">Local Storage</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ======================================================== */}
      {/* 6. NETWORKS TAB                                          */}
      {/* ======================================================== */}
      {activeTab === 'Networks' && (
        viewMode === 'list' ? (
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'NETWORK NAME',
                render: (n) => (
                  <div className="flex items-center gap-2.5">
                    <Network size={15} className="text-rose-400 flex-shrink-0" />
                    <span className="font-bold text-xs text-white">{n.name}</span>
                  </div>
                )
              },
              {
                key: 'id',
                label: 'NETWORK ID',
                render: (n) => <span className="font-mono text-[11px] text-slate-400">{n.id?.slice(0, 12)}</span>
              },
              {
                key: 'driver',
                label: 'DRIVER',
                render: (n) => (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {n.driver}
                  </span>
                )
              },
              {
                key: 'scope',
                label: 'SCOPE',
                render: (n) => <span className="font-mono text-xs text-slate-400">{n.scope}</span>
              },
              {
                key: 'actions',
                label: 'THAO TÁC',
                align: 'right',
                render: (n) => (
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {n.name !== 'bridge' && n.name !== 'host' && n.name !== 'none' ? (
                      <TableActionButton
                        icon={Trash2}
                        variant="danger"
                        onClick={() => setItemToDelete({ type: 'network', id: n.id, name: n.name })}
                        title="Xóa Network (docker network rm)"
                        className="w-7 h-7 !px-0"
                      />
                    ) : (
                      <span className="text-[11px] text-slate-600 italic">Mặc định</span>
                    )}
                  </div>
                )
              }
            ]}
            data={filteredNetworks}
            isLoading={isRefreshing}
            loadingMessage="Đang tải Docker networks..."
            themeConfig={currentThemeConfig}
            emptyMessage="Không tìm thấy Docker network nào."
            footer={
              <div className="text-xs text-slate-400 font-mono">
                Tổng số Networks: <strong className="text-white">{filteredNetworks.length}</strong>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-150">
            {filteredNetworks.map((n) => (
              <div
                key={n.id}
                className="p-4 rounded-xl border space-y-3 transition-all flex flex-col justify-between"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                      <Network size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{n.name}</div>
                      <span className="text-[9.5px] font-mono px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700 inline-block mt-0.5">
                        {n.driver}
                      </span>
                    </div>
                  </div>
                  {n.name !== 'bridge' && n.name !== 'host' && n.name !== 'none' ? (
                    <button
                      onClick={() => setItemToDelete({ type: 'network', id: n.id, name: n.name })}
                      className="p-1.5 rounded-lg border text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 transition-all"
                      style={{ borderColor: currentThemeConfig.border }}
                      title="Xóa Network"
                    >
                      <Trash2 size={12} />
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-600 italic">Mặc định</span>
                  )}
                </div>
                <div className="flex justify-between text-[11px] font-mono pt-1 border-t border-slate-800 text-slate-500">
                  <span>ID: {n.id?.slice(0, 12)}</span>
                  <span>Scope: {n.scope}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ======================================================== */}
      {/* MODAL: PULL IMAGE                                        */}
      {/* ======================================================== */}
      {isPullModalOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setIsPullModalOpen(false)}
        >
          <div 
            className="border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DownloadCloud size={18} style={{ color: accentColor }} />
                <h3 className="font-bold text-sm text-white">Kéo Docker Image (Pull Image)</h3>
              </div>
              <button onClick={() => setIsPullModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handlePullImage} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Tên Image & Tag</label>
                <input
                  type="text"
                  required
                  placeholder="ví dụ: redis:alpine, postgres:16, node:20"
                  value={pullImageInput}
                  onChange={(e) => setPullImageInput(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border text-xs focus:outline-none font-mono"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPullModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-400 hover:text-white"
                  style={{ borderColor: currentThemeConfig.border }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5"
                  style={{ backgroundColor: accentColor }}
                >
                  <DownloadCloud size={13} />
                  <span>Kéo Image</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE VOLUME                                     */}
      {/* ======================================================== */}
      {isCreateVolumeOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setIsCreateVolumeOpen(false)}
        >
          <div 
            className="border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm text-white">Tạo Docker Volume Mới</h3>
              </div>
              <button onClick={() => setIsCreateVolumeOpen(false)} className="text-slate-400 hover:text-white">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateVolume} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Tên Volume</label>
                <input
                  type="text"
                  required
                  placeholder="ví dụ: my_postgres_data, app_uploads"
                  value={newVolumeInput}
                  onChange={(e) => setNewVolumeInput(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border text-xs focus:outline-none font-mono"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateVolumeOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-400 hover:text-white"
                  style={{ borderColor: currentThemeConfig.border }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5"
                  style={{ backgroundColor: accentColor }}
                >
                  <Plus size={13} />
                  <span>Tạo Volume</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE NETWORK                                    */}
      {/* ======================================================== */}
      {isCreateNetworkOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setIsCreateNetworkOpen(false)}
        >
          <div 
            className="border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            style={{ backgroundColor: currentThemeConfig.card, borderColor: currentThemeConfig.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network size={18} className="text-rose-400" />
                <h3 className="font-bold text-sm text-white">Tạo Docker Network Mới</h3>
              </div>
              <button onClick={() => setIsCreateNetworkOpen(false)} className="text-slate-400 hover:text-white">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateNetwork} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Tên Network</label>
                <input
                  type="text"
                  required
                  placeholder="ví dụ: my_custom_bridge, dev_net"
                  value={newNetworkInput}
                  onChange={(e) => setNewNetworkInput(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border text-xs focus:outline-none font-mono"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Driver</label>
                <select
                  value={newNetworkDriver}
                  onChange={(e) => setNewNetworkDriver(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border text-xs font-mono focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: currentThemeConfig.innerInput,
                    borderColor: currentThemeConfig.border,
                    color: currentThemeConfig.text
                  }}
                >
                  <option value="bridge" className="bg-[#121622] text-white">bridge (Default, cách ly container trên host)</option>
                  <option value="host" className="bg-[#121622] text-white">host (Dùng chung mạng host)</option>
                  <option value="overlay" className="bg-[#121622] text-white">overlay (Dùng cho Swarm đa máy chủ)</option>
                  <option value="macvlan" className="bg-[#121622] text-white">macvlan (Gán địa chỉ MAC riêng)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateNetworkOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-400 hover:text-white"
                  style={{ borderColor: currentThemeConfig.border }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5"
                  style={{ backgroundColor: accentColor }}
                >
                  <Plus size={13} />
                  <span>Tạo Network</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DELETE CONFIRMATION MODAL                                */}
      {/* ======================================================== */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        title={`Xác nhận xóa ${
          itemToDelete?.type === 'container' ? 'Container' :
          itemToDelete?.type === 'image' ? 'Image' :
          itemToDelete?.type === 'volume' ? 'Volume' :
          itemToDelete?.type === 'network' ? 'Network' : 'Dự án Compose'
        }`}
        message={`Bạn có chắc muốn xóa ${itemToDelete?.type} này khỏi hệ thống? Thao tác này không thể hoàn tác.`}
        itemName={itemToDelete?.name}
        confirmText="Xác nhận xóa"
        cancelText="Hủy"
        onConfirm={handleConfirmDelete}
        onCancel={() => setItemToDelete(null)}
        settings={settings}
      />

      {/* Floating toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#121622] border border-emerald-500/40 text-emerald-400 text-xs px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toast}
        </div>
      )}
    </div>
  );
}
