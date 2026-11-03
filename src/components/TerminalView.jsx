import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { 
  ArrowLeft, 
  Plus, 
  Minus,
  X, 
  RotateCw, 
  Trash2, 
  Copy, 
  Check, 
  Code2, 
  ChevronDown, 
  Terminal as TerminalIcon,
  Server,
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Columns,
  Rows,
  FolderSync,
  Maximize2,
  Minimize2,
  ArrowDown,
  ArrowUp,
  Search,
  Database,
  ExternalLink,
  Zap,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { PALETTES, THEME_CONFIGS } from '../constants/palettes';
import { openNativeTerminal, execSshCommand, probeSshHost, ptySpawn, ptyWrite, ptyResize, ptyKill } from '../services/sshClient';
import { getSuggestions, addCommandToHistory } from '../constants/commandSuggestions';
import SuggestionBar from './terminal/SuggestionBar';

const COMMON_SNIPPETS = [
  { name: 'Docker Containers', cmd: 'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"' },
  { name: 'Nginx Error Log', cmd: 'tail -n 50 -f /var/log/nginx/error.log' },
  { name: 'System Resources', cmd: 'htop || top -b -n 1 | head -n 20' },
  { name: 'Disk Space', cmd: 'df -h' },
  { name: 'Active Ports', cmd: 'sudo netstat -tulpn || sudo ss -tulpn' },
  { name: 'Memory Free', cmd: 'free -m' },
  { 
    name: '⚡ Cài Zsh & Auto-suggestions cho Server', 
    cmd: 'which zsh >/dev/null 2>&1 || (sudo apt update && sudo apt install -y zsh git curl || sudo yum install -y zsh git curl); [ -d ~/.oh-my-zsh ] || sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended; [ -d ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions ] || git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions; sed -i \'s/plugins=(\(.*\))/plugins=(\\1 zsh-autosuggestions)/\' ~/.zshrc; exec zsh -l' 
  },
];

/**
 * Individual Terminal Session Canvas (100% Persistent, Never Disposes On Tab/Menu Switch)
 */
function TerminalSessionCanvas({
  session,
  isActive,
  settings,
  currentThemeConfig,
  accentColor,
  fontSize,
  onFontSizeDelta,
  initialCommand,
  onBack,
  onRegisterSession,
  onUnregisterSession,
  onProbeStatus
}) {
  const terminalRef = useRef(null);
  const xtermInstance = useRef(null);
  const fitAddonRef = useRef(null);

  // Client-Side Auto-Suggestion Engine State
  const [currentBuffer, setCurrentBuffer] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const inputBufferRef = useRef('');
  const topSuggestionRef = useRef(null);
  topSuggestionRef.current = suggestions[0] || null;
  const isAutoSuggestEnabled = settings?.terminalAutoSuggest ?? true;

  const isWsl = !!(settings?.enableWsl);
  const isLocalSession = Boolean(
    session?.os === 'local' || 
    session?.os === 'windows' || 
    session?.os === 'wsl' || 
    session?.os === 'macos' || 
    session?.os === 'linux' ||
    session?.id?.startsWith('local_') ||
    session?.host === 'localhost' ||
    session?.host === 'local'
  );
  const isRemote = !isLocalSession;
  const targetHost = isRemote ? (session?.name || session?.host) : 'local';

  // Strict shell resolution:
  let shellType = 'powershell';
  if (isRemote) {
    shellType = isWsl ? 'wsl_ssh' : 'ssh';
  } else if (session?.os === 'windows' || (!isWsl && session?.id?.startsWith('local_win'))) {
    shellType = (settings?.defaultShell === 'cmd') ? 'cmd' : 'powershell';
  } else if (session?.os === 'wsl' || (isWsl && session?.os !== 'windows')) {
    shellType = 'wsl';
  } else if (session?.os === 'macos') {
    shellType = 'zsh';
  } else if (session?.os === 'linux') {
    shellType = 'bash';
  } else {
    shellType = isWsl ? 'wsl' : ((settings?.defaultShell === 'cmd') ? 'cmd' : 'powershell');
  }

  const sessionUseWsl = shellType === 'wsl';

  // Mount Xterm ONCE for this session ID
  useEffect(() => {
    if (!terminalRef.current) return;
    if (xtermInstance.current) return;

    const activePalette = PALETTES.find(p => p.id === settings?.terminalPalette) || PALETTES.find(p => p.id === 'obsidian-cyber') || PALETTES[0];

    const term = new XTerm({
      fontFamily: `'${settings?.terminalFont || 'JetBrains Mono'}', 'Cascadia Code', monospace`,
      fontSize: fontSize,
      lineHeight: settings?.terminalLineHeight || 1.25,
      letterSpacing: settings?.terminalLetterSpacing || 0,
      cursorBlink: true,
      cursorStyle: settings?.terminalCursorStyle || 'bar',
      theme: {
        background: currentThemeConfig.bg,
        foreground: currentThemeConfig.text || '#f4f4f5',
        cursor: accentColor || '#10b981',
        selectionBackground: `${accentColor}35`,
        black: activePalette.black || '#1e2638',
        red: activePalette.red || '#f43f5e',
        green: activePalette.green || '#10b981',
        yellow: activePalette.yellow || '#f59e0b',
        blue: activePalette.blue || '#3b82f6',
        magenta: activePalette.magenta || '#d946ef',
        cyan: activePalette.cyan || '#06b6d4',
        white: activePalette.white || '#f8fafc',
      },
    });

    // Custom Key Handler for Ctrl+Plus, Ctrl+Minus, Ctrl+0 zooming inside terminal
    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return true;
      if (e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          onFontSizeDelta && onFontSizeDelta(1);
          return false;
        }
        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          onFontSizeDelta && onFontSizeDelta(-1);
          return false;
        }
        if (e.key === '0') {
          e.preventDefault();
          onFontSizeDelta && onFontSizeDelta(0);
          return false;
        }
      }

      // Auto-Suggestion: Tab or Right Arrow accepts suggestion
      if (isAutoSuggestEnabled && (e.key === 'Tab' || e.key === 'ArrowRight') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (topSuggestionRef.current && topSuggestionRef.current.completion) {
          e.preventDefault();
          const comp = topSuggestionRef.current.completion;
          ptyWrite(session.id, comp);
          inputBufferRef.current += comp;
          setCurrentBuffer(inputBufferRef.current);
          setSuggestions([]);
          return false;
        }
      }

      return true;
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    try { fitAddon.fit(); } catch {}

    xtermInstance.current = term;
    fitAddonRef.current = fitAddon;

    // Wheel zoom listener with Ctrl key
    const termEl = terminalRef.current;
    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          onFontSizeDelta && onFontSizeDelta(1);
        } else if (e.deltaY > 0) {
          onFontSizeDelta && onFontSizeDelta(-1);
        }
      }
    };
    if (termEl) termEl.addEventListener('wheel', handleWheel, { passive: false });

    // 1. Listen for PTY output stream from Rust ConPTY backend
    let unlistenPty = null;
    if (window.__TAURI__ && window.__TAURI__.event) {
      window.__TAURI__.event.listen('pty-data', (event) => {
        if (event.payload && event.payload.id === session.id) {
          term.write(event.payload.data);
        }
      }).then((unsub) => {
        unlistenPty = unsub;
      });
    }

    // 2. Spawn real interactive PTY session
    const proposed = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };
    ptySpawn({
      id: session.id,
      shellType,
      cols: proposed.cols,
      rows: proposed.rows,
      distro: session?.distro || settings?.wslDistro || 'Ubuntu-24.04',
      remoteHost: isRemote ? (session.name || session.host) : null,
    }).then(() => {
      onProbeStatus && onProbeStatus({ reachable: true, latency_ms: 1, host: session.name || session.host || 'local' });
      if (initialCommand) {
        setTimeout(() => {
          ptyWrite(session.id, initialCommand + '\r');
        }, 500);
      }
    }).catch((err) => {
      term.writeln(`\x1b[31m[PTY Error] Không thể mở shell tương tác: ${err}\x1b[0m`);
    });

    // 3. Raw user keystrokes feed directly into PTY & track auto-suggestions
    const dataSub = term.onData((data) => {
      if (isAutoSuggestEnabled) {
        if (data === '\r' || data === '\n') {
          // Enter: save command to history and clear buffer
          if (inputBufferRef.current.trim().length > 1) {
            addCommandToHistory(inputBufferRef.current);
          }
          inputBufferRef.current = '';
          setCurrentBuffer('');
          setSuggestions([]);
        } else if (data === '\x03' || data === '\x15' || data === '\x0c') {
          // Ctrl+C, Ctrl+U, Ctrl+L
          inputBufferRef.current = '';
          setCurrentBuffer('');
          setSuggestions([]);
        } else if (data === '\x7f' || data === '\b') {
          // Backspace
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          setCurrentBuffer(inputBufferRef.current);
          setSuggestions(getSuggestions(inputBufferRef.current));
        } else if (data.length === 1 && data.charCodeAt(0) >= 32 && data.charCodeAt(0) <= 126) {
          // Printable character
          inputBufferRef.current += data;
          setCurrentBuffer(inputBufferRef.current);
          setSuggestions(getSuggestions(inputBufferRef.current));
        }
      }

      ptyWrite(session.id, data);
    });

    // 4. Resize listener
    const handleResize = () => {
      try {
        fitAddon.fit();
        const d = fitAddon.proposeDimensions();
        if (d) {
          ptyResize(session.id, d.cols, d.rows);
        }
      } catch {}
    };
    window.addEventListener('resize', handleResize);

    // 5. Register active session handlers
    if (onRegisterSession) {
      onRegisterSession(session.id, {
        clear: () => {
          term.clear();
          ptyWrite(session.id, '\x0c');
        },
        write: (msg) => term.write(msg),
        writeln: (msg) => term.writeln(msg),
        fit: () => {
          try {
            fitAddon.fit();
            const d = fitAddon.proposeDimensions();
            if (d) ptyResize(session.id, d.cols, d.rows);
          } catch {}
        },
        focus: () => term.focus(),
        runSnippet: (cmd) => {
          ptyWrite(session.id, cmd + '\r');
        }
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (termEl) termEl.removeEventListener('wheel', handleWheel);
      if (unlistenPty) unlistenPty();
      dataSub.dispose();
      ptyKill(session.id);
      if (onUnregisterSession) onUnregisterSession(session.id);
      term.dispose();
      xtermInstance.current = null;
      fitAddonRef.current = null;
    };
  }, [session.id]);

  // When tab becomes active: refit smoothly & focus
  useEffect(() => {
    if (isActive && fitAddonRef.current && xtermInstance.current) {
      const timer = setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          xtermInstance.current?.focus();
        } catch {}
      }, 35);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Sync font size
  useEffect(() => {
    if (xtermInstance.current) {
      xtermInstance.current.options.fontSize = fontSize;
      if (isActive) {
        requestAnimationFrame(() => {
          try { fitAddonRef.current?.fit(); } catch {}
        });
      }
    }
  }, [fontSize, isActive]);

  // Sync theme
  useEffect(() => {
    if (xtermInstance.current) {
      xtermInstance.current.options.theme = {
        ...xtermInstance.current.options.theme,
        background: currentThemeConfig.bg,
        foreground: currentThemeConfig.text || '#f4f4f5',
        cursor: accentColor || '#10b981',
        selectionBackground: `${accentColor}35`,
      };
    }
  }, [currentThemeConfig.bg, currentThemeConfig.text, accentColor]);

  const handleAcceptSuggestion = (suggestion) => {
    if (!suggestion) return;
    const comp = suggestion.completion || (suggestion.full.startsWith(inputBufferRef.current) ? suggestion.full.slice(inputBufferRef.current.length) : null);
    if (comp) {
      ptyWrite(session.id, comp);
      inputBufferRef.current += comp;
      setCurrentBuffer(inputBufferRef.current);
      setSuggestions([]);
    } else if (suggestion.full) {
      // Clear line with Ctrl+U and write full command
      ptyWrite(session.id, '\x15' + suggestion.full);
      inputBufferRef.current = suggestion.full;
      setCurrentBuffer(suggestion.full);
      setSuggestions([]);
    }
    xtermInstance.current?.focus();
  };

  return (
    <div 
      className="relative flex-1 w-full h-full overflow-hidden" 
      style={{ 
        display: isActive ? 'block' : 'none',
        backgroundColor: currentThemeConfig.bg 
      }}
    >
      <div 
        className="w-full h-full p-2.5 overflow-hidden select-text" 
        ref={terminalRef} 
      />

      {/* Smart Client-Side Auto-Suggestion Bar */}
      {isActive && isAutoSuggestEnabled && (
        <SuggestionBar
          suggestions={suggestions}
          currentBuffer={currentBuffer}
          onAccept={handleAcceptSuggestion}
          accentColor={accentColor}
          themeConfig={currentThemeConfig}
        />
      )}
    </div>
  );
}

/**
 * Main Terminal View (Multi-Session Manager & Toolbar)
 */
export default function TerminalView({ 
  session, 
  sessions = [], 
  onSwitchSession, 
  onCloseSession, 
  onNewSession,
  onOpenSftp,
  onBack, 
  settings = {},
  initialCommand = null
}) {
  const currentThemeConfig = THEME_CONFIGS[settings?.surfaceTheme || 'zinc'] || THEME_CONFIGS.zinc;
  const accentColor = settings?.accentColor || '#10b981';

  // Ensure sessions pool contains at least the active session
  const effectiveSessions = (sessions && sessions.length > 0)
    ? sessions
    : (session ? [session] : []);

  const activeSession = session || effectiveSessions[effectiveSessions.length - 1] || null;

  // Registry for active session terminal instances
  const sessionHandlersRef = useRef({});

  // Persistent Font Size (+/-) logic
  const getInitialFontSize = () => {
    try {
      const saved = localStorage.getItem('service_tool_terminal_font_size');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 9 && parsed <= 32) return parsed;
      }
    } catch (_) {}
    return settings?.terminalFontSize || 13;
  };

  const [fontSize, setFontSize] = useState(getInitialFontSize);

  const handleUpdateFontSize = (newSize) => {
    const clamped = Math.max(9, Math.min(32, newSize));
    setFontSize(clamped);
    try {
      localStorage.setItem('service_tool_terminal_font_size', clamped.toString());
    } catch (_) {}
  };

  const handleFontSizeDelta = (delta) => {
    if (delta === 0) {
      handleUpdateFontSize(13);
    } else {
      handleUpdateFontSize(fontSize + delta);
    }
  };

  const [showSnippetsMenu, setShowSnippetsMenu] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [isMonitorOpen, setIsMonitorOpen] = useState(true);
  const [processFilter, setProcessFilter] = useState('CPU');
  const [processSearch, setProcessSearch] = useState('');
  const [realProcesses, setRealProcesses] = useState([]);
  const [hostProbeStatus, setHostProbeStatus] = useState(null);
  const [telemetry, setTelemetry] = useState({
    cpu: { usage: '12.4%', percentNum: 12.4, cores: 8, load: '' },
    ram: { used: '3.2 GB', total: '8.0 GB', free: '4.8 GB', percentNum: 40, percentStr: '40%' },
    disk: {
      used: '...',
      total: '...',
      free: '...',
      percentNum: 0,
      percentStr: '0%',
      mount: '/',
      fs: '',
      list: []
    },
    lastUpdated: null
  });

  const isWsl = !!(settings?.enableWsl);
  const isLocalSession = Boolean(
    activeSession?.os === 'local' || 
    activeSession?.os === 'windows' || 
    activeSession?.os === 'wsl' || 
    activeSession?.os === 'macos' || 
    activeSession?.os === 'linux' ||
    activeSession?.id?.startsWith('local_') ||
    activeSession?.host === 'localhost' ||
    activeSession?.host === 'local'
  );
  const isRemote = !isLocalSession;
  const targetHost = isRemote ? (activeSession?.name || activeSession?.host) : 'local';
  const sessionUseWsl = activeSession?.os === 'wsl' || (isWsl && activeSession?.os !== 'windows');

  // OpenSSH Command
  const idFile = activeSession?.identity_file || activeSession?.identityFile;
  const sshCmd = isRemote
    ? `ssh ${idFile ? `-i "${idFile}" ` : ''}-p ${activeSession.port || 22} ${activeSession.user || 'root'}@${activeSession.hostname || activeSession.name}`
    : null;

  // Telemetry & Real Process Fetcher for Monitor
  const fetchRealProcesses = useCallback(async () => {
    if (!activeSession) return;
    try {
      const isLinuxShell = isRemote || activeSession?.os === 'wsl' || sessionUseWsl || activeSession?.os === 'linux' || activeSession?.os === 'macos';
      const cmd = isLinuxShell 
        ? 'echo "===DISK==="; df -hP -x tmpfs -x devtmpfs -x overlay 2>/dev/null || df -hP /; echo "===RAM==="; free -m; echo "===CPU==="; cat /proc/loadavg 2>/dev/null; nproc 2>/dev/null; echo "===PS==="; ps -eo pid,pcpu,pmem,comm --sort=-%cpu | head -n 15'
        : 'Write-Output "===DISK==="; Get-PSDrive -PSProvider FileSystem | ForEach-Object { "$($_.Name);;$([math]::Round($_.Used/1GB,1))GB;;$([math]::Round(($_.Used+$_.Free)/1GB,1))GB;;$([math]::Round($_.Free/1GB,1))GB;;$([math]::Round($_.Used*100/($_.Used+$_.Free),1))%" }; Write-Output "===RAM==="; Get-CimInstance Win32_OperatingSystem | ForEach-Object { "$([math]::Round(($_.TotalVisibleMemorySize-$_.FreePhysicalMemory)/1MB,1));;$([math]::Round($_.TotalVisibleMemorySize/1MB,1));;$([math]::Round($_.FreePhysicalMemory/1MB,1));;$([math]::Round(($_.TotalVisibleMemorySize-$_.FreePhysicalMemory)*100/$_.TotalVisibleMemorySize,1))%" }; Write-Output "===CPU==="; (Get-CimInstance Win32_Processor).LoadPercentage; Write-Output "===PS==="; Get-Process | Sort-Object CPU -Descending | Select-Object -First 15 Id, ProcessName, CPU, WorkingSet';

      const res = await execSshCommand(targetHost, cmd, isRemote ? isWsl : sessionUseWsl);
      if (res && res.stdout) {
        const stdout = res.stdout;
        const sections = {};
        let currentSec = null;
        stdout.split(/\r?\n/).forEach(line => {
          const m = line.match(/^===(DISK|RAM|CPU|PS)===/);
          if (m) {
            currentSec = m[1];
            sections[currentSec] = [];
          } else if (currentSec) {
            sections[currentSec].push(line);
          }
        });

        // 1. Parse Disk
        const diskLines = (sections.DISK || []).filter(l => l.trim() && !l.includes('Filesystem') && !l.includes('Capacity') && !l.includes('Mounted on'));
        const disks = [];
        if (isLinuxShell) {
          diskLines.forEach(l => {
            const p = l.trim().split(/\s+/);
            if (p.length >= 6) {
              const pcentNum = parseInt(p[4].replace('%', ''), 10) || 0;
              disks.push({
                fs: p[0],
                total: p[1],
                used: p[2],
                free: p[3],
                percentStr: p[4],
                percentNum: pcentNum,
                mount: p[5]
              });
            }
          });
        } else {
          diskLines.forEach(l => {
            const p = l.split(';;');
            if (p.length >= 5) {
              const pcentNum = Math.round(parseFloat(p[4].replace('%', '')) || 0);
              disks.push({
                fs: p[0] + ':',
                used: p[1],
                total: p[2],
                free: p[3],
                percentStr: `${pcentNum}%`,
                percentNum: pcentNum,
                mount: p[0] + ':\\'
              });
            }
          });
        }

        const primaryDisk = disks.find(d => d.mount === '/' || d.mount === 'C:\\') || disks[0] || null;

        // 2. Parse RAM
        let ramData = null;
        if (isLinuxShell) {
          const memLine = (sections.RAM || []).find(l => l.trim().startsWith('Mem:'));
          if (memLine) {
            const p = memLine.trim().split(/\s+/);
            const totalMb = parseFloat(p[1]) || 1;
            const usedMb = parseFloat(p[2]) || 0;
            const freeMb = parseFloat(p[6] || p[3]) || 0;
            const pcentNum = Math.min(100, Math.round((usedMb / totalMb) * 100));
            ramData = {
              total: (totalMb / 1024).toFixed(1) + ' GB',
              used: (usedMb / 1024).toFixed(1) + ' GB',
              free: (freeMb / 1024).toFixed(1) + ' GB',
              percentNum: pcentNum,
              percentStr: `${pcentNum}%`
            };
          }
        } else {
          const memLine = (sections.RAM || []).find(l => l.trim().length > 0 && l.includes(';;'));
          if (memLine) {
            const p = memLine.split(';;');
            const pcentNum = Math.round(parseFloat(p[3]?.replace('%', '')) || 0);
            ramData = {
              used: `${p[0]} GB`,
              total: `${p[1]} GB`,
              free: `${p[2]} GB`,
              percentNum: pcentNum,
              percentStr: `${pcentNum}%`
            };
          }
        }

        // 3. Parse CPU
        let cpuData = null;
        if (isLinuxShell) {
          const cpuLines = (sections.CPU || []).filter(l => l.trim());
          if (cpuLines.length > 0) {
            const p = cpuLines[0].trim().split(/\s+/);
            const load1 = parseFloat(p[0]) || 0;
            const cores = parseInt(cpuLines[1], 10) || 8;
            const pcentNum = Math.min(100, Math.max(1, Math.round((load1 / cores) * 100)));
            cpuData = {
              usage: `${pcentNum}%`,
              percentNum: pcentNum,
              load: p.slice(0, 3).join(' '),
              cores
            };
          }
        } else {
          const cpuLine = (sections.CPU || []).find(l => l.trim().length > 0);
          if (cpuLine) {
            const val = parseInt(cpuLine.trim(), 10) || 12;
            cpuData = {
              usage: `${val}%`,
              percentNum: val,
              load: `${val}%`,
              cores: 8
            };
          }
        }

        // 4. Parse Processes
        const psLines = (sections.PS || []).slice(1);
        const parsed = psLines.map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            pid: parts[0] || '-',
            cpu: parts[1] ? `${parts[1]}%` : '-',
            mem: parts[2] ? `${parts[2]}%` : '-',
            cmd: parts.slice(3).join(' ') || parts[1] || 'proc'
          };
        }).filter(p => p.pid !== '-' && p.pid !== 'Id');

        if (parsed.length > 0) setRealProcesses(parsed);

        setTelemetry(prev => ({
          cpu: cpuData || prev.cpu,
          ram: ramData || prev.ram,
          disk: primaryDisk ? {
            used: primaryDisk.used,
            total: primaryDisk.total,
            free: primaryDisk.free,
            percentNum: primaryDisk.percentNum,
            percentStr: primaryDisk.percentStr,
            mount: primaryDisk.mount,
            fs: primaryDisk.fs,
            list: disks
          } : prev.disk,
          lastUpdated: new Date().toLocaleTimeString()
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch telemetry and processes:', e);
    }
  }, [activeSession, isRemote, targetHost, sessionUseWsl]);

  useEffect(() => {
    if (isMonitorOpen && activeSession) {
      fetchRealProcesses();
      const timer = setInterval(() => {
        fetchRealProcesses();
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [isMonitorOpen, activeSession, fetchRealProcesses]);

  const handleRunSnippetInTerm = (cmd) => {
    setShowSnippetsMenu(false);
    const handler = sessionHandlersRef.current[activeSession?.id];
    if (handler && handler.runSnippet) {
      handler.runSnippet(cmd);
    }
  };

  const handleClearTerm = () => {
    const handler = sessionHandlersRef.current[activeSession?.id];
    if (handler && handler.clear) {
      handler.clear();
    }
  };

  const handleCopySshCmd = () => {
    if (sshCmd) {
      navigator.clipboard?.writeText(sshCmd);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col h-full overflow-hidden transition-colors"
      style={{
        backgroundColor: currentThemeConfig.bg,
        color: currentThemeConfig.text
      }}
    >
      {/* ======================================================== */}
      {/* TOP ACTION TOOLBAR                                       */}
      {/* Buttons: [ Quay lại ] [ Split V ] [ Split H ] [ SFTP ]...*/}
      {/* ======================================================== */}
      <div 
        className="h-11 border-b flex items-center justify-between px-3 flex-shrink-0 select-none transition-colors"
        style={{
          backgroundColor: currentThemeConfig.subBg,
          borderColor: currentThemeConfig.border
        }}
      >
        <div className="flex items-center gap-2 overflow-x-auto custom-scroll">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex-shrink-0"
            style={{
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}40`,
              borderWidth: '1px',
              color: accentColor
            }}
          >
            <ArrowLeft size={13} />
            <span>Quay lại</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1 flex-shrink-0" />

          {/* Screenshot-Style Terminal Actions: Split V, Split H, SFTP, Monitor */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => {
                const handler = sessionHandlersRef.current[activeSession?.id];
                if (handler && handler.writeln) {
                  handler.writeln('\x1b[90m[Split V requested - tmux split-window -h]\x1b[0m');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl border transition-all hover:opacity-90"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.text
              }}
            >
              <Columns size={12} style={{ color: accentColor }} />
              <span>Split V</span>
            </button>

            <button
              onClick={() => {
                const handler = sessionHandlersRef.current[activeSession?.id];
                if (handler && handler.writeln) {
                  handler.writeln('\x1b[90m[Split H requested - tmux split-window -v]\x1b[0m');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl border transition-all hover:opacity-90"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.text
              }}
            >
              <Rows size={12} style={{ color: '#38bdf8' }} />
              <span>Split H</span>
            </button>

            <button
              onClick={() => onOpenSftp && onOpenSftp(activeSession)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl border transition-all hover:opacity-90"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border,
                color: '#f59e0b'
              }}
            >
              <FolderSync size={12} />
              <span>SFTP</span>
            </button>

            <button
              onClick={() => setIsMonitorOpen(!isMonitorOpen)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl border transition-all shadow-sm active:scale-95"
              style={{
                backgroundColor: isMonitorOpen ? `${accentColor}20` : currentThemeConfig.innerInput,
                borderColor: isMonitorOpen ? accentColor : currentThemeConfig.border,
                color: isMonitorOpen ? accentColor : currentThemeConfig.textMuted,
                boxShadow: isMonitorOpen ? `0 0 10px ${accentColor}25` : 'none'
              }}
            >
              <Activity size={12} className={isMonitorOpen ? 'animate-pulse' : ''} />
              <span>Monitor</span>
            </button>

            {/* Real Native Terminal Launcher */}
            <button
              onClick={async () => {
                try {
                  await openNativeTerminal(isRemote ? targetHost : 'local', isRemote ? isWsl : sessionUseWsl);
                } catch (e) {
                  console.error(e);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl text-white transition-all shadow-md active:scale-95 hover:brightness-110 ml-1"
              style={{ backgroundColor: '#0284c7' }}
              title="Mở phiên Terminal Thật của Hệ Điều Hành"
            >
              <Zap size={12} className="text-amber-300" />
              <span>
                {isRemote 
                  ? (isWsl ? '⚡ Mở WSL Terminal Thật' : '⚡ Mở Windows Terminal Thật') 
                  : (activeSession?.os === 'wsl' || sessionUseWsl)
                  ? '⚡ Mở WSL Terminal Thật'
                  : activeSession?.os === 'macos'
                  ? '⚡ Mở macOS Terminal Thật'
                  : activeSession?.os === 'linux'
                  ? '⚡ Mở Linux Terminal Thật'
                  : '⚡ Mở Windows Terminal Thật'}
              </span>
            </button>
          </div>
        </div>

        {/* Right Action Tools: Font Size Zoom (+/-), Snippets Runner, Copy SSH, Clear */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Font Size Zoom Controller */}
          <div 
            className="flex items-center rounded-lg border overflow-hidden p-0.5 gap-0.5 shadow-sm"
            style={{
              backgroundColor: currentThemeConfig.innerInput,
              borderColor: currentThemeConfig.border
            }}
            title="Điều chỉnh cỡ chữ Terminal (Ctrl + Cuộn chuột hoặc phím Ctrl + / -)"
          >
            <button
              onClick={() => handleFontSizeDelta(-1)}
              className="p-1 rounded hover:bg-white/10 active:scale-95 transition-all"
              style={{ color: currentThemeConfig.textMuted }}
              title="Giảm cỡ chữ (Ctrl + -)"
            >
              <Minus size={12} />
            </button>

            <button
              onClick={() => handleFontSizeDelta(0)}
              className="px-1.5 py-0.5 text-[11px] font-mono font-semibold rounded hover:bg-white/10 transition-colors text-center min-w-[34px]"
              style={{ color: currentThemeConfig.text }}
              title="Bấm để đặt lại về 13px mặc định (Ctrl + 0)"
            >
              {fontSize}px
            </button>

            <button
              onClick={() => handleFontSizeDelta(1)}
              className="p-1 rounded hover:bg-white/10 active:scale-95 transition-all"
              style={{ color: currentThemeConfig.textMuted }}
              title="Tăng cỡ chữ (Ctrl + +)"
            >
              <Plus size={12} />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 mx-0.5 flex-shrink-0" />

          <div className="relative">
            <button
              onClick={() => setShowSnippetsMenu(!showSnippetsMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.text
              }}
            >
              <Code2 size={13} style={{ color: accentColor }} />
              <span>Snippets</span>
              <ChevronDown size={11} style={{ color: currentThemeConfig.textMuted }} />
            </button>

            {showSnippetsMenu && (
              <div 
                className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border shadow-2xl py-1.5 z-50 animate-in fade-in duration-100"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  Kho Đoạn Lệnh Nhanh
                </div>
                {COMMON_SNIPPETS.map((snip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRunSnippetInTerm(snip.cmd)}
                    className="w-full text-left px-3 py-1.5 hover:bg-white/5 text-xs font-sans flex flex-col gap-0.5 transition-all"
                  >
                    <span className="font-semibold text-[11.5px]" style={{ color: currentThemeConfig.text }}>{snip.name}</span>
                    <span className="font-mono text-[10px] text-slate-500 truncate">{snip.cmd}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {sshCmd && (
            <button
              onClick={handleCopySshCmd}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all"
              style={{
                backgroundColor: currentThemeConfig.innerInput,
                borderColor: currentThemeConfig.border,
                color: currentThemeConfig.text
              }}
              title={`Copy lệnh: ${sshCmd}`}
            >
              {copiedCmd ? <Check size={12} style={{ color: accentColor }} /> : <Copy size={12} />}
              <span>{copiedCmd ? 'Đã chép' : 'SSH'}</span>
            </button>
          )}

          <button
            onClick={handleClearTerm}
            className="p-1.5 rounded-lg border transition-all"
            style={{
              backgroundColor: currentThemeConfig.innerInput,
              borderColor: currentThemeConfig.border,
              color: currentThemeConfig.textMuted
            }}
            title="Xóa màn hình (Clear)"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MAIN VIEWPORT: PERSISTENT CANVASES FOR ALL OPEN SESSIONS */}
      {/* ======================================================== */}
      <div 
        className="flex-1 flex overflow-hidden relative"
        style={{ backgroundColor: currentThemeConfig.bg }}
      >
        {/* Render each session's canvas persistently */}
        {effectiveSessions.map((sess) => (
          <TerminalSessionCanvas
            key={sess.id}
            session={sess}
            isActive={activeSession?.id === sess.id}
            settings={settings}
            currentThemeConfig={currentThemeConfig}
            accentColor={accentColor}
            fontSize={fontSize}
            onFontSizeDelta={handleFontSizeDelta}
            initialCommand={sess.id === activeSession?.id ? initialCommand : null}
            onBack={onBack}
            onRegisterSession={(id, handlers) => {
              sessionHandlersRef.current[id] = handlers;
            }}
            onUnregisterSession={(id) => {
              delete sessionHandlersRef.current[id];
            }}
            onProbeStatus={setHostProbeStatus}
          />
        ))}

        {/* ======================================================== */}
        {/* MONITOR DRAWER                                           */}
        {/* ======================================================== */}
        {isMonitorOpen && activeSession && (
          <div 
            className="w-80 border-l p-4 flex flex-col gap-3.5 flex-shrink-0 overflow-y-auto custom-scroll animate-in slide-in-from-right duration-200 select-none"
            style={{
              backgroundColor: currentThemeConfig.subBg,
              borderColor: currentThemeConfig.border
            }}
          >
            {/* Header: Machine Name + Host + Window Controls */}
            <div className="flex items-start justify-between pb-2 border-b" style={{ borderColor: currentThemeConfig.border }}>
              <div className="flex items-center gap-2">
                <Activity size={18} style={{ color: accentColor }} className="mt-0.5" />
                <div>
                  <h3 className="font-bold text-xs leading-none" style={{ color: currentThemeConfig.text }}>
                    {activeSession?.name || 'DLAP-1240'}
                  </h3>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: currentThemeConfig.textMuted }}>
                    {activeSession?.host || 'localhost'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMonitorOpen(false)}
                  className="p-1 rounded text-slate-500 hover:text-white transition-colors"
                  title="Đóng Monitor"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Sub-header OS Tag & Uptime */}
            <div 
              className="p-3 rounded-xl border text-xs space-y-1"
              style={{
                backgroundColor: currentThemeConfig.card,
                borderColor: currentThemeConfig.border
              }}
            >
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="font-semibold" style={{ color: currentThemeConfig.text }}>
                  {activeSession?.os === 'windows' ? 'windows x86_64' : 'linux x86_64'}
                </span>
                <span className="text-[10px] flex items-center gap-1" style={{ color: accentColor }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                  {hostProbeStatus?.latency_ms ? `${hostProbeStatus.latency_ms}ms ping` : 'up 1h 0m'}
                </span>
              </div>
              <p className="text-[10px]" style={{ color: currentThemeConfig.textMuted }}>
                {activeSession?.os === 'windows' 
                  ? 'windows (x86_64) (14 cores)' 
                  : (telemetry.cpu.cores ? `linux (x86_64) (${telemetry.cpu.cores} cores)` : 'ubuntu (x86_64) (8 cores)')}
              </p>
            </div>

            {/* 1. CPU & Load Card */}
            <div 
              className="p-3 rounded-xl border space-y-2 text-xs"
              style={{
                backgroundColor: currentThemeConfig.card,
                borderColor: currentThemeConfig.border
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5" style={{ color: currentThemeConfig.text }}>
                  <Cpu size={13} style={{ color: accentColor }} />
                  CPU Usage
                </span>
                <span className="font-mono text-[11px] font-semibold" style={{ color: accentColor }}>
                  {(hostProbeStatus?.reachable || !isRemote) ? telemetry.cpu.usage : 'Offline'}
                </span>
              </div>
              <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ width: (hostProbeStatus?.reachable || !isRemote) ? `${telemetry.cpu.percentNum}%` : '0%', backgroundColor: accentColor }}
                />
              </div>
              {telemetry.cpu.load && (
                <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: currentThemeConfig.textMuted }}>
                  <span>Load Avg:</span>
                  <span>{telemetry.cpu.load}</span>
                </div>
              )}
            </div>

            {/* 2. Memory Card */}
            <div 
              className="p-3 rounded-xl border space-y-2 text-xs"
              style={{
                backgroundColor: currentThemeConfig.card,
                borderColor: currentThemeConfig.border
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5" style={{ color: currentThemeConfig.text }}>
                  <Database size={13} style={{ color: '#38bdf8' }} />
                  RAM Free / Total
                </span>
                <span className="font-mono text-[11px]" style={{ color: currentThemeConfig.textMuted }}>
                  {telemetry.ram.free} / {telemetry.ram.total}
                </span>
              </div>
              <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-sky-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${telemetry.ram.percentNum}%` }} 
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: currentThemeConfig.textMuted }}>
                <span>Đã dùng: {telemetry.ram.used}</span>
                <span className="text-sky-400 font-semibold">{telemetry.ram.percentStr}</span>
              </div>
            </div>

            {/* 3. Disk Storage Card (Ổ Đĩa) */}
            <div 
              className="p-3 rounded-xl border space-y-2 text-xs"
              style={{
                backgroundColor: currentThemeConfig.card,
                borderColor: currentThemeConfig.border
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5" style={{ color: currentThemeConfig.text }}>
                  <HardDrive size={13} style={{ color: '#f59e0b' }} />
                  Disk Storage (Ổ Đĩa)
                </span>
                <span 
                  className="font-mono text-[11px] font-bold" 
                  style={{ 
                    color: telemetry.disk.percentNum >= 90 ? '#ef4444' : (telemetry.disk.percentNum >= 75 ? '#f59e0b' : accentColor) 
                  }}
                >
                  {telemetry.disk.used} / {telemetry.disk.total} ({telemetry.disk.percentStr})
                </span>
              </div>
              <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${Math.min(100, telemetry.disk.percentNum)}%`, 
                    backgroundColor: telemetry.disk.percentNum >= 90 ? '#ef4444' : (telemetry.disk.percentNum >= 75 ? '#f59e0b' : accentColor) 
                  }} 
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: currentThemeConfig.textMuted }}>
                <span className="truncate max-w-[130px]" title={telemetry.disk.fs}>
                  Gắn tại: {telemetry.disk.mount}
                </span>
                <span className="font-semibold" style={{ color: telemetry.disk.percentNum >= 90 ? '#ef4444' : currentThemeConfig.textMuted }}>
                  Trống: {telemetry.disk.free}
                </span>
              </div>

              {/* Sub-partitions list if multiple disks exist (e.g. /data, /home) */}
              {telemetry.disk.list && telemetry.disk.list.length > 1 && (
                <div className="pt-2 border-t space-y-1.5 font-mono text-[10px]" style={{ borderColor: currentThemeConfig.border }}>
                  <div className="text-[9.5px] uppercase tracking-wider font-semibold" style={{ color: currentThemeConfig.textMuted }}>
                    Các phân vùng khác ({telemetry.disk.list.length}):
                  </div>
                  {telemetry.disk.list.map((d, idx) => (
                    <div key={idx} className="flex items-center justify-between py-0.5 px-1 rounded bg-black/20">
                      <span className="truncate max-w-[90px] font-bold" style={{ color: currentThemeConfig.text }}>
                        {d.mount}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: currentThemeConfig.textMuted }}>{d.used}/{d.total}</span>
                        <span 
                          className="font-semibold"
                          style={{ color: d.percentNum >= 90 ? '#ef4444' : (d.percentNum >= 75 ? '#f59e0b' : accentColor) }}
                        >
                          {d.percentStr}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Real Process List */}
            <div 
              className="flex-1 rounded-xl border p-3 flex flex-col gap-2 min-h-[220px]"
              style={{
                backgroundColor: currentThemeConfig.card,
                borderColor: currentThemeConfig.border
              }}
            >
              <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: currentThemeConfig.border }}>
                <span className="font-bold text-[11px] uppercase tracking-wider" style={{ color: currentThemeConfig.textMuted }}>
                  Tiến Trình (Top Processes)
                </span>
                <button 
                  onClick={fetchRealProcesses}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  title="Làm mới tiến trình"
                  style={{ color: accentColor }}
                >
                  <RotateCw size={11} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scroll space-y-1 font-mono text-[10.5px]">
                {realProcesses.length > 0 ? (
                  realProcesses.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-white/5 transition-colors">
                      <span className="truncate max-w-[130px]" style={{ color: currentThemeConfig.text }} title={p.cmd}>
                        {p.cmd}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span style={{ color: accentColor }}>{p.cpu}</span>
                        <span style={{ color: currentThemeConfig.textMuted }}>{p.mem}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-[11px]" style={{ color: currentThemeConfig.textMuted }}>
                    Đang theo dõi tài nguyên...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
