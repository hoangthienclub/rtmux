import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Shield,
  Wifi,
  LayoutDashboard,
  Terminal,
  Tag,
  Wrench,
  Info,
  RotateCcw,
  Sun,
  Moon,
  Check,
  ChevronDown,
  Plus,
  Minus,
  Monitor,
  KeyRound,
  Lock,
  Globe,
  Radio,
  Layers,
  Thermometer,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Activity,
  Trash2,
  Keyboard,
  Command,
  Cpu
} from 'lucide-react';
import { PALETTES, SURFACE_THEMES, ACCENT_COLORS, FONTS, THEME_CONFIGS, SYSTEM_FONTS, UI_FONT_SIZES } from '../../constants/palettes';
import ConfirmModal from '../common/ConfirmModal';
import { translations } from '../../i18n/translations';
import { fetchWslDistros, fetchDiagnostics } from '../../services/sshDiscovery';

const TAG_SWATCH_COLORS = [
  '#38bdf8', // Blue
  '#10b981', // Mint
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#fb923c', // Orange
  '#ec4899', // Pink
  '#14b8a6'  // Teal
];

export default function SettingsView({ settings, onSaveSettings, onBack, initialCategory = 'general', isWindows = true }) {
  const [activeCategory, setActiveCategory] = useState(() => {
    if (!isWindows && initialCategory === 'wsl_env') return 'general';
    return initialCategory || 'general';
  });
  const [previewMode, setPreviewMode] = useState('dark');

  useEffect(() => {
    if (initialCategory) {
      if (!isWindows && initialCategory === 'wsl_env') {
        setActiveCategory('general');
      } else {
        setActiveCategory(initialCategory);
      }
    }
  }, [initialCategory, isWindows]);

  // Values from settings with defensive fallbacks
  const surfaceTheme = settings.surfaceTheme || 'zinc';
  const accentColor = settings.accentColor || '#10b981';
  const language = settings.language || 'vi';
  const uiFontSize = settings.uiFontSize || '14px';
  const systemFont = settings.systemFont || 'system';

  // Connections
  const connectionTimeout = settings.connectionTimeout ?? 15;
  const snippetTimeout = settings.snippetTimeout ?? 300;
  const keepAlive = settings.keepAlive ?? true;
  const aliveInterval = settings.aliveInterval ?? 60;

  // Dashboard
  const telemetryInterval = settings.telemetryInterval || '2s';
  const tempUnit = settings.tempUnit || 'celsius';
  const showSideDrawer = settings.showSideMonitorInTerminal ?? false;

  // Terminal
  const termFont = settings.terminalFont || 'JetBrains Mono';
  const termFontSize = settings.terminalFontSize || 13;
  const termLineHeight = settings.terminalLineHeight || 1.2;
  const termLetterSpacing = settings.terminalLetterSpacing || 0;
  const termPalette = settings.terminalPalette || 'monokai-pro';
  const termCursorStyle = settings.terminalCursorStyle || 'block';

  // Tags State
  const initialTags = [
    { id: '1', name: 'Production', color: '#f43f5e' },
    { id: '2', name: 'Kubernetes', color: '#38bdf8' },
    { id: '3', name: 'Database', color: '#8b5cf6' },
    { id: '4', name: 'Staging', color: '#f59e0b' }
  ];
  const tagsList = settings.machineTags || initialTags;
  const [newTagName, setNewTagName] = useState('');
  const [selectedTagColor, setSelectedTagColor] = useState('#10b981');
  const [tagToDelete, setTagToDelete] = useState(null);

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    const newTag = {
      id: Date.now().toString(),
      name: newTagName.trim(),
      color: selectedTagColor
    };
    updateSetting('machineTags', [...tagsList, newTag]);
    setNewTagName('');
  };

  const handleDeleteTag = (id) => {
    updateSetting('machineTags', tagsList.filter(t => t.id !== id));
  };

  const [availableDistros, setAvailableDistros] = useState(['Ubuntu-24.04', 'Ubuntu', 'Debian']);
  const [diagnosticsData, setDiagnosticsData] = useState({
    engine: 'Async Tokio + Russh (Truecolor PTY)',
    renderer: 'Xterm.js Unified Canvas (Local & Remote Parity)',
    identities_count: 0,
    keys_count: 4,
    proxies_count: 1,
    memory_mb: 27.4,
    platform: 'Windows x86_64 PE (Pure Native)',
  });

  useEffect(() => {
    fetchWslDistros().then(distros => {
      if (distros && distros.length > 0) {
        setAvailableDistros(distros);
      }
    });

    fetchDiagnostics(settings.enableWsl, settings.wslDistro).then(data => {
      if (data) {
        setDiagnosticsData(data);
      }
    });
  }, [settings.enableWsl, settings.wslDistro]);

  const updateSetting = (key, val) => {
    onSaveSettings({
      ...settings,
      [key]: val
    });
  };

  const handleResetSettings = () => {
    try {
      if (typeof window !== 'undefined' && window.confirm && !window.confirm(t.resetConfirm || 'Khôi phục toàn bộ cài đặt về mặc định?')) {
        return;
      }
    } catch (_) {}
    onSaveSettings({
        surfaceTheme: 'zinc',
        accentColor: '#10b981',
        language: 'vi',
        uiFontSize: '14px',
        systemFont: 'system',
        enableWsl: false,
        defaultShell: 'powershell',
        wslDistro: 'Ubuntu-24.04',
        autoTmux: true,
        serviceTarget: 'windows',
        connectionTimeout: 15,
        snippetTimeout: 300,
        keepAlive: true,
        aliveInterval: 60,
        telemetryInterval: '2s',
        tempUnit: 'celsius',
        showSideMonitorInTerminal: false,
        terminalFont: 'JetBrains Mono',
        terminalFontSize: 13,
        terminalLineHeight: 1.2,
        terminalLetterSpacing: 0,
        terminalPalette: 'monokai-pro',
        terminalCursorStyle: 'block'
      });
  };

  const currentThemeObj = PALETTES.find(p => p.id === termPalette) || PALETTES[1];

  const currentThemeConfig = THEME_CONFIGS[surfaceTheme] || THEME_CONFIGS.zinc;
  const t = translations[language] || translations.vi;

  const menuSections = [
    {
      title: t.appCategory || 'APP',
      items: [
        { id: 'general', label: t.tabGeneral || 'General', icon: Sliders },
        { id: 'security', label: t.tabSecurity || 'Security & Privacy', icon: Shield },
        ...(isWindows ? [{ id: 'wsl_env', label: t.tabWslEnv || 'WSL & Environment', icon: Monitor, badge: settings.enableWsl ? 'ON' : 'OFF' }] : [])
      ]
    },
    {
      title: t.featuresCategory || 'FEATURES',
      items: [
        { id: 'connections', label: t.tabConnections || 'Connections', icon: Wifi },
        { id: 'dashboard', label: t.tabDashboard || 'Dashboard', icon: LayoutDashboard },
        { id: 'terminal', label: t.tabTerminal || 'Terminal', icon: Terminal },
        { id: 'tags', label: t.tabTags || 'Machine Tags', icon: Tag },
        { id: 'microservices', label: t.tabMicroservices || 'Microservices Dev', icon: Layers }
      ]
    },
    {
      title: t.helpCategory || 'HELP',
      items: [
        { id: 'diagnostics', label: t.tabDiagnostics || 'Diagnostics', icon: Wrench },
        { id: 'about', label: t.tabAbout || 'About', icon: Info }
      ]
    }
  ];

  return (
    <div
      className="flex-1 flex h-full overflow-hidden font-sans select-none transition-colors duration-200"
      style={{
        backgroundColor: currentThemeConfig.bg,
        color: currentThemeConfig.text
      }}
    >
      {/* ======================================================== */}
      {/* COLUMN 1: SUB-MENU (LEFTMOST SIDE OF SETTINGS)           */}
      {/* ======================================================== */}
      <div
        className="w-56 border-r flex flex-col justify-between p-3 select-none flex-shrink-0 transition-colors duration-200"
        style={{
          backgroundColor: currentThemeConfig.subBg,
          borderColor: currentThemeConfig.border
        }}
      >
        <div className="space-y-4 overflow-y-auto custom-scroll pr-1">
          {menuSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div
                className="px-2 text-[10px] font-bold uppercase tracking-widest font-sans"
                style={{ color: currentThemeConfig.textMuted }}
              >
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeCategory === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveCategory(item.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all"
                      style={
                        isActive
                          ? {
                              backgroundColor: `${accentColor}18`,
                              borderColor: `${accentColor}80`,
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              color: accentColor,
                              boxShadow: `0 0 14px ${accentColor}25`,
                              fontWeight: '600'
                            }
                          : {
                              color: currentThemeConfig.textMuted || '#94a3b8',
                              borderColor: 'transparent',
                              borderWidth: '1px',
                              borderStyle: 'solid'
                            }
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={14} style={{ color: isActive ? accentColor : (currentThemeConfig.textMuted || '#64748b') }} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className="text-[9.5px] px-1.5 py-0.5 rounded font-mono font-bold"
                          style={
                            item.badge === 'ON'
                              ? {
                                  backgroundColor: `${accentColor}20`,
                                  color: accentColor,
                                  borderColor: `${accentColor}50`,
                                  borderWidth: '1px'
                                }
                              : {
                                  backgroundColor: currentThemeConfig.innerInput,
                                  color: currentThemeConfig.textMuted
                                }
                          }
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Action: Reset All Settings */}
        <div className="pt-3 border-t" style={{ borderColor: currentThemeConfig.border }}>
          <button
            onClick={handleResetSettings}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/40 transition-all font-sans"
            style={{ color: currentThemeConfig.textMuted }}
          >
            <RotateCcw size={13} />
            <span>{t.resetToDefaults || 'Reset All Settings'}</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* COLUMN 2: SETTINGS CONTENT DETAIL PANEL                 */}
      {/* ======================================================== */}
      <div
        className="flex-1 overflow-y-auto p-8 custom-scroll transition-colors duration-200"
        style={{
          backgroundColor: currentThemeConfig.bg,
          color: currentThemeConfig.text
        }}
      >
        <div className="max-w-4xl space-y-6">

          {/* =================================================== */}
          {/* TAB 1: GENERAL (IMAGE 1)                            */}
          {/* =================================================== */}
          {activeCategory === 'general' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-sm font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                {t.general || 'General'}
              </h2>

              {/* 1. Application Surface Theme */}
              <div className="space-y-2">
                <div>
                  <h3 className="text-xs font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                    {t.surfaceThemeTitle || 'Application Surface Theme'}
                  </h3>
                  <p className="text-[11.5px] mt-0.5" style={{ color: currentThemeConfig.textMuted }}>
                    {t.surfaceThemeDesc || 'Controls the application window, sidebar, cards, and modals independently of the SSH/Local terminal canvas.'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  {SURFACE_THEMES.map((th) => {
                    const isSelected = surfaceTheme === th.id;
                    return (
                      <button
                        key={th.id}
                        onClick={() => updateSetting('surfaceTheme', th.id)}
                        className="p-4 rounded-2xl border text-left transition-all"
                        style={{
                          backgroundColor: currentThemeConfig.card,
                          borderColor: isSelected ? accentColor : currentThemeConfig.border,
                          boxShadow: isSelected ? `0 0 16px ${accentColor}30` : 'none',
                          color: currentThemeConfig.text
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          {/* Mini pill preview */}
                          <div
                            className="w-9 h-5 rounded-md border flex items-center justify-center shadow-inner"
                            style={{
                              backgroundColor: th.pillBg,
                              borderColor: th.pillBorder || currentThemeConfig.border
                            }}
                          />
                          {isSelected && (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                              style={{
                                backgroundColor: accentColor,
                                color: '#fff'
                              }}
                            >
                              <Check size={12} className="stroke-[3.5]" />
                            </div>
                          )}
                        </div>
                        <div
                          className="text-xs font-bold font-sans"
                          style={{ color: isSelected ? accentColor : currentThemeConfig.text }}
                        >
                          {th.name}
                        </div>
                        <div className="text-[10.5px] font-sans mt-0.5" style={{ color: currentThemeConfig.textMuted }}>
                          {th.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Interface Accent Color */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                  {t.accentColorTitle || 'Interface Accent Color'}
                </h3>
                <div
                  className="border rounded-2xl p-4 flex items-center justify-between transition-colors duration-200"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  <div>
                    <span className="text-xs font-bold block" style={{ color: currentThemeConfig.text }}>
                      {t.primaryAccent || 'Primary Highlight & Telemetry Accent'}
                    </span>
                    <span className="text-[11px] mt-0.5 block" style={{ color: currentThemeConfig.textMuted }}>
                      {t.accentColorDesc || 'Applied to active navigation pills, switches, and primary action buttons'}
                    </span>
                  </div>

                  {/* 6 Accent Swatches */}
                  <div className="flex items-center gap-2">
                    {ACCENT_COLORS.map((ac) => {
                      const isSelected = accentColor === ac.color;
                      return (
                        <button
                          key={ac.id}
                          onClick={() => updateSetting('accentColor', ac.color)}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                          style={{
                            backgroundColor: ac.color,
                            boxShadow: isSelected ? `0 0 12px ${ac.color}` : 'none'
                          }}
                          title={ac.name}
                        >
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full border-2 border-white/90 flex items-center justify-center text-white">
                              <Check size={13} className="stroke-[3.5]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Ngôn ngữ hiển thị */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                  {t.languageTitle || 'Ngôn Ngữ & Khu Vực (Language)'}
                </h3>
                <div
                  className="border rounded-2xl p-4 flex items-center justify-between transition-colors duration-200"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  <div>
                    <span className="text-xs font-bold block" style={{ color: currentThemeConfig.text }}>
                      {t.languageInterface || 'Ngôn ngữ giao diện'}
                    </span>
                    <span className="text-[11px] mt-0.5 block" style={{ color: currentThemeConfig.textMuted }}>
                      {t.languageDesc || 'Chọn ngôn ngữ hiển thị cho menu, bảng điều khiển và thông báo'}
                    </span>
                  </div>

                  <div className="relative w-40">
                    <select
                      value={language}
                      onChange={(e) => updateSetting('language', e.target.value)}
                      className="w-full h-8 border rounded-xl px-3 text-xs focus:outline-none font-sans appearance-none cursor-pointer"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput,
                        borderColor: currentThemeConfig.border,
                        color: currentThemeConfig.text
                      }}
                    >
                      <option value="vi">🇻🇳 Tiếng Việt</option>
                      <option value="en">🇺🇸 English</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-2.5 pointer-events-none" style={{ color: currentThemeConfig.textMuted }} />
                  </div>
                </div>
              </div>

              {/* 4. Cỡ chữ giao diện (Text Size & Scale) */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                  {t.textSizeTitle || 'Cỡ Chữ Giao Diện (Text Size & Scale)'}
                </h3>
                <div
                  className="border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-200"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  <div>
                    <span className="text-xs font-bold block" style={{ color: currentThemeConfig.text }}>
                      {t.textSizeTitle || 'Cỡ chữ & tỷ lệ giao diện'}
                    </span>
                    <span className="text-[11px] mt-0.5 block" style={{ color: currentThemeConfig.textMuted }}>
                      {t.textSizeDesc || 'Tự động phóng to / thu nhỏ toàn bộ kích thước chữ và giao diện ứng dụng.'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {UI_FONT_SIZES.map((sz) => {
                      const isSelected = uiFontSize === sz.id;
                      return (
                        <button
                          key={sz.id}
                          type="button"
                          onClick={() => updateSetting('uiFontSize', sz.id)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all"
                          style={
                            isSelected
                              ? {
                                  backgroundColor: `${accentColor}18`,
                                  borderColor: `${accentColor}80`,
                                  color: accentColor,
                                  boxShadow: `0 0 10px ${accentColor}25`,
                                  fontWeight: '600'
                                }
                              : {
                                  backgroundColor: currentThemeConfig.innerInput,
                                  borderColor: currentThemeConfig.border,
                                  color: currentThemeConfig.textMuted
                                }
                          }
                        >
                          {language === 'vi' ? sz.label : sz.enLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 5. Phông chữ hệ thống (System Font Family) */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                  {t.systemFontTitle || 'Phông Chữ Hệ Thống (System Font)'}
                </h3>
                <div
                  className="border rounded-2xl p-4 space-y-3 transition-colors duration-200"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  <div>
                    <span className="text-xs font-bold block" style={{ color: currentThemeConfig.text }}>
                      {t.systemFontTitle || 'Phông chữ chính'}
                    </span>
                    <span className="text-[11px] mt-0.5 block" style={{ color: currentThemeConfig.textMuted }}>
                      {t.systemFontDesc || 'Chọn bộ phông chữ hiển thị chính cho toàn bộ menu, nút bấm và nội dung ứng dụng.'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                    {SYSTEM_FONTS.map((sf) => {
                      const isSelected = systemFont === sf.id;
                      return (
                        <button
                          key={sf.id}
                          type="button"
                          onClick={() => updateSetting('systemFont', sf.id)}
                          className="p-3 rounded-xl border text-left transition-all"
                          style={
                            isSelected
                              ? {
                                  backgroundColor: `${accentColor}18`,
                                  borderColor: accentColor,
                                  color: accentColor,
                                  boxShadow: `0 0 12px ${accentColor}25`,
                                  fontFamily: sf.fontStack
                                }
                              : {
                                  backgroundColor: currentThemeConfig.innerInput,
                                  borderColor: currentThemeConfig.border,
                                  color: currentThemeConfig.text,
                                  fontFamily: sf.fontStack
                                }
                          }
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold" style={{ color: isSelected ? accentColor : currentThemeConfig.text }}>
                              {sf.name}
                            </span>
                            {isSelected && <Check size={14} style={{ color: accentColor }} />}
                          </div>
                          <span className="text-[10.5px] block truncate" style={{ color: currentThemeConfig.textMuted }}>
                            {sf.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 2: SECURITY & PRIVACY (IMAGE 2)                 */}
          {/* =================================================== */}
          {activeCategory === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-sm font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                {t.tabSecurity || 'Security & Privacy'}
              </h2>

              <div className="space-y-2">
                <h3 className="text-xs font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                  Credential & Host Key Security
                </h3>

                <div
                  className="border rounded-2xl divide-y overflow-hidden"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  {/* Row 1: Native Keychain / Credential Locker */}
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          backgroundColor: `${accentColor}20`,
                          borderColor: `${accentColor}50`,
                          color: accentColor
                        }}
                      >
                        <KeyRound size={15} />
                      </div>
                      <div>
                        <span className="text-xs font-bold block" style={{ color: currentThemeConfig.text }}>
                          {t.credLockerTitle || 'Windows Credential / Native Keychain Storage'}
                        </span>
                        <span className="text-[11px] mt-0.5 block leading-relaxed" style={{ color: currentThemeConfig.textMuted }}>
                          {t.credLockerDesc || 'SSH passwords, Identity secrets, Key passphrases, and Proxy credentials are encrypted inside Windows Credential Locker (never stored in plaintext JSON).'}
                        </span>
                      </div>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-full text-[10.5px] font-mono font-bold flex-shrink-0 border"
                      style={{
                        backgroundColor: `${accentColor}18`,
                        borderColor: `${accentColor}50`,
                        color: accentColor
                      }}
                    >
                      {t.activeBadge || 'Active'}
                    </span>
                  </div>

                  {/* Row 2: Host Key Verification (TOFU) */}
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          backgroundColor: '#0f1d36',
                          borderColor: '#38bdf850',
                          color: '#38bdf8'
                        }}
                      >
                        <Shield size={15} />
                      </div>
                      <div>
                        <span className="text-xs font-bold block" style={{ color: currentThemeConfig.text }}>
                          {t.tofuTitle || 'Host Key Verification (TOFU)'}
                        </span>
                        <span className="text-[11px] mt-0.5 block leading-relaxed" style={{ color: currentThemeConfig.textMuted }}>
                          {t.tofuDesc || 'Verifies remote server SHA-256 fingerprints against known_hosts and blocks connections if a host key changes unexpectedly.'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10.5px] font-mono font-bold bg-[#0f1d36] text-sky-400 border border-sky-800/50 flex-shrink-0">
                      {t.enforcedBadge || 'Enforced'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 3: CONNECTIONS (IMAGE 3)                        */}
          {/* =================================================== */}
          {activeCategory === 'connections' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-sm font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                {t.tabConnections || 'Connections'}
              </h2>

              {/* Section 1: Timeouts */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                  {t.timeouts || 'Timeouts'}
                </h3>

                <div
                  className="border rounded-2xl divide-y overflow-hidden"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  {/* Connection Timeout */}
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: currentThemeConfig.text }}>
                      {t.connectionTimeout || 'Connection Timeout'}
                    </span>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center border rounded-xl px-3 py-1.5 text-xs font-mono"
                        style={{
                          backgroundColor: currentThemeConfig.innerInput,
                          borderColor: currentThemeConfig.border,
                          color: currentThemeConfig.text
                        }}
                      >
                        <input
                          type="number"
                          value={connectionTimeout}
                          onChange={(e) => updateSetting('connectionTimeout', parseInt(e.target.value) || 15)}
                          className="w-10 bg-transparent text-right pr-1 focus:outline-none"
                        />
                        <span style={{ color: currentThemeConfig.textMuted }}>{t.seconds || 'seconds'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Snippet Execution Timeout */}
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: currentThemeConfig.text }}>
                      {t.snippetTimeout || 'Snippet Execution Timeout'}
                    </span>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center border rounded-xl px-3 py-1.5 text-xs font-mono"
                        style={{
                          backgroundColor: currentThemeConfig.innerInput,
                          borderColor: currentThemeConfig.border,
                          color: currentThemeConfig.text
                        }}
                      >
                        <input
                          type="number"
                          value={snippetTimeout}
                          onChange={(e) => updateSetting('snippetTimeout', parseInt(e.target.value) || 300)}
                          className="w-12 bg-transparent text-right pr-1 focus:outline-none"
                        />
                        <span style={{ color: currentThemeConfig.textMuted }}>{t.seconds || 'seconds'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Terminal Sessions */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                  {t.terminalSessions || 'Terminal Sessions'}
                </h3>

                <div
                  className="border rounded-2xl divide-y overflow-hidden"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  {/* Keep Alive Toggle */}
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: currentThemeConfig.text }}>
                      {t.keepAlive || 'Keep Alive'}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateSetting('keepAlive', !keepAlive)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                      style={{
                        backgroundColor: keepAlive ? accentColor : '#475569'
                      }}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          keepAlive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Alive Interval */}
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: currentThemeConfig.text }}>
                      {t.aliveInterval || 'Alive Interval'}
                    </span>
                    <div
                      className="flex items-center border rounded-xl px-3 py-1.5 text-xs font-mono"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput,
                        borderColor: currentThemeConfig.border,
                        color: currentThemeConfig.text
                      }}
                    >
                      <input
                        type="number"
                        value={aliveInterval}
                        onChange={(e) => updateSetting('aliveInterval', parseInt(e.target.value) || 60)}
                        className="w-10 bg-transparent text-right pr-1 focus:outline-none"
                      />
                      <span style={{ color: currentThemeConfig.textMuted }}>{t.seconds || 'seconds'}</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] px-1 pt-0.5" style={{ color: currentThemeConfig.textMuted }}>
                  {t.keepAliveHint || 'Sends periodic signals to prevent idle SSH sessions from disconnecting.'}
                </p>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 4: DASHBOARD (IMAGE 4)                          */}
          {/* =================================================== */}
          {activeCategory === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-sm font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                {t.tabDashboard || 'Dashboard'}
              </h2>

              <div className="space-y-2">
                <h3 className="text-xs font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                  {t.telemetryRefreshInterval || 'Telemetry & Real-Time Metrics'}
                </h3>

                <div
                  className="border rounded-2xl divide-y overflow-hidden"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  {/* Telemetry Refresh Interval */}
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold block" style={{ color: currentThemeConfig.text }}>
                        {t.telemetryRefreshInterval || 'Telemetry Refresh Interval'}
                      </span>
                      <span className="text-[11px] mt-0.5 block" style={{ color: currentThemeConfig.textMuted }}>
                        {t.telemetryIntervalDesc || 'Frequency of live CPU, Memory, Disk, and Network polling'}
                      </span>
                    </div>

                    <div className="relative w-36">
                      <select
                        value={telemetryInterval}
                        onChange={(e) => updateSetting('telemetryInterval', e.target.value)}
                        className="w-full h-8 border rounded-xl px-3 text-xs focus:outline-none font-sans appearance-none cursor-pointer"
                        style={{
                          backgroundColor: currentThemeConfig.innerInput,
                          borderColor: currentThemeConfig.border,
                          color: currentThemeConfig.text
                        }}
                      >
                        <option value="1s">1 second</option>
                        <option value="2s">2 seconds</option>
                        <option value="5s">5 seconds</option>
                        <option value="10s">10 seconds</option>
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-2.5 pointer-events-none" style={{ color: currentThemeConfig.textMuted }} />
                    </div>
                  </div>

                  {/* Temperature Unit */}
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold block" style={{ color: currentThemeConfig.text }}>
                        {t.temperatureUnit || 'Temperature Unit'}
                      </span>
                      <span className="text-[11px] mt-0.5 block" style={{ color: currentThemeConfig.textMuted }}>
                        Used for CPU and GPU thermal sensors
                      </span>
                    </div>

                    <div className="relative w-36">
                      <select
                        value={tempUnit}
                        onChange={(e) => updateSetting('tempUnit', e.target.value)}
                        className="w-full h-8 border rounded-xl px-3 text-xs focus:outline-none font-sans appearance-none cursor-pointer"
                        style={{
                          backgroundColor: currentThemeConfig.innerInput,
                          borderColor: currentThemeConfig.border,
                          color: currentThemeConfig.text
                        }}
                      >
                        <option value="celsius">{t.celsius || 'Celsius (°C)'}</option>
                        <option value="fahrenheit">{t.fahrenheit || 'Fahrenheit (°F)'}</option>
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-2.5 pointer-events-none" style={{ color: currentThemeConfig.textMuted }} />
                    </div>
                  </div>

                  {/* Side Monitor in Terminal */}
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold block" style={{ color: currentThemeConfig.text }}>
                        {t.showSideMonitorDrawer || 'Show Side Monitor Drawer in Terminal'}
                      </span>
                      <span className="text-[11px] mt-0.5 block" style={{ color: currentThemeConfig.textMuted }}>
                        {t.showSideMonitorDesc || 'Display compact real-time telemetry drawer alongside the active terminal pane'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateSetting('showSideMonitorInTerminal', !showSideDrawer)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                      style={{
                        backgroundColor: showSideDrawer ? accentColor : '#475569'
                      }}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showSideDrawer ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 5: TERMINAL                                     */}
          {/* =================================================== */}
          {activeCategory === 'terminal' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-sm font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                {t.tabTerminal || 'Terminal'}
              </h2>

              {/* SECTION: PREVIEW */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold" style={{ color: currentThemeConfig.text }}>
                  <span>{t.terminalPreview || 'Preview'}</span>
                  <div className="flex items-center border rounded-lg p-0.5" style={{ backgroundColor: currentThemeConfig.innerInput, borderColor: currentThemeConfig.border }}>
                    <button
                      onClick={() => setPreviewMode('light')}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-sans font-medium transition-all"
                      style={
                        previewMode === 'light'
                          ? { backgroundColor: currentThemeConfig.card, color: currentThemeConfig.text, fontWeight: '600' }
                          : { color: currentThemeConfig.textMuted }
                      }
                    >
                      <Sun size={12} />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => setPreviewMode('dark')}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-sans font-medium transition-all"
                      style={
                        previewMode === 'dark'
                          ? { backgroundColor: currentThemeConfig.card, color: currentThemeConfig.text, fontWeight: '600' }
                          : { color: currentThemeConfig.textMuted }
                      }
                    >
                      <Moon size={12} />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                {/* Simulated Terminal Preview */}
                <div
                  className="rounded-2xl border p-5 shadow-2xl transition-all"
                  style={{
                    backgroundColor: previewMode === 'light' ? '#fdf6e3' : currentThemeObj.bg,
                    borderColor: currentThemeConfig.border,
                    color: previewMode === 'light' ? '#657b83' : currentThemeObj.fg,
                    fontFamily: `${termFont}, JetBrains Mono, monospace`,
                    fontSize: `${termFontSize}px`,
                    lineHeight: termLineHeight,
                    letterSpacing: `${termLetterSpacing}px`
                  }}
                >
                  <div className="space-y-1">
                    <p>
                      <span className="font-bold" style={{ color: accentColor }}>user@host</span>
                      <span className="text-slate-400">:</span>
                      <span className="text-sky-400 font-bold">~</span>
                      <span className="text-slate-400">$</span> ls -la
                    </p>
                    <p className="opacity-90 text-[12px]">
                      drwxr-xr-x 5 user staff 160M Mar 19 <span className="text-sky-400">.config</span>
                    </p>
                    <p className="opacity-90 text-[12px]">
                      -rwxr-xr-x 1 user staff 2.4K Mar 19 <span className="text-rose-400 font-semibold">deploy.sh</span>
                    </p>
                    <p className="opacity-90 text-[12px]">
                      -rw-r--r-- 1 user staff 512B Mar 19 <span className="text-amber-400 font-semibold">config.yml</span>
                    </p>
                    <p>
                      <span className="font-bold" style={{ color: accentColor }}>user@host</span>
                      <span className="text-slate-400">:</span>
                      <span className="text-sky-400 font-bold">~</span>
                      <span className="text-slate-400">$</span> echo <span className="text-amber-300">"Ready to connect!"</span>
                    </p>
                    <p className="font-medium">Ready to connect!</p>
                    <p className="flex items-center gap-1">
                      <span className="font-bold" style={{ color: accentColor }}>user@host</span>
                      <span className="text-slate-400">:</span>
                      <span className="text-sky-400 font-bold">~</span>
                      <span className="text-slate-400">$</span>
                      <span
                        className="inline-block animate-pulse"
                        style={{
                          backgroundColor: accentColor,
                          boxShadow: `0 0 8px ${accentColor}`,
                          width: termCursorStyle === 'bar' ? '2px' : '8px',
                          height: termCursorStyle === 'underline' ? '2px' : '16px',
                          marginTop: termCursorStyle === 'underline' ? '12px' : '0'
                        }}
                      ></span>
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION: FONT CONTROLS */}
              <div className="space-y-3">
                <span className="text-xs font-semibold block" style={{ color: currentThemeConfig.text }}>
                  {t.terminalFontSection || 'Phông Chữ Terminal'}
                </span>
                <div
                  className="border rounded-2xl p-5 space-y-4"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  {/* Font Family Dropdown */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: currentThemeConfig.text }}>
                      {t.terminalFontFamily || 'Phông chữ'}
                    </span>
                    <div className="relative w-48">
                      <select
                        value={termFont}
                        onChange={(e) => updateSetting('terminalFont', e.target.value)}
                        className="w-full h-8 border rounded-xl px-3 text-xs focus:outline-none font-mono appearance-none cursor-pointer"
                        style={{
                          backgroundColor: currentThemeConfig.innerInput,
                          borderColor: currentThemeConfig.border,
                          color: currentThemeConfig.text
                        }}
                      >
                        {FONTS.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-2.5 pointer-events-none" style={{ color: currentThemeConfig.textMuted }} />
                    </div>
                  </div>

                  {/* Font Size Stepper */}
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: currentThemeConfig.border }}>
                    <span className="text-xs font-medium" style={{ color: currentThemeConfig.text }}>
                      {t.terminalFontSize || 'Cỡ chữ'}
                    </span>
                    <div
                      className="flex items-center border rounded-xl overflow-hidden h-8"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput,
                        borderColor: currentThemeConfig.border
                      }}
                    >
                      <span className="w-12 text-center text-xs font-mono font-bold" style={{ color: currentThemeConfig.text }}>{termFontSize}</span>
                      <button
                        onClick={() => updateSetting('terminalFontSize', Math.max(10, termFontSize - 1))}
                        className="px-2.5 h-full border-l transition-colors hover:opacity-75"
                        style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.textMuted }}
                      >
                        <Minus size={11} />
                      </button>
                      <button
                        onClick={() => updateSetting('terminalFontSize', Math.min(24, termFontSize + 1))}
                        className="px-2.5 h-full border-l transition-colors hover:opacity-75"
                        style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.textMuted }}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Line Height Stepper */}
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: currentThemeConfig.border }}>
                    <span className="text-xs font-medium" style={{ color: currentThemeConfig.text }}>
                      {t.terminalLineHeight || 'Độ cao dòng'}
                    </span>
                    <div
                      className="flex items-center border rounded-xl overflow-hidden h-8"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput,
                        borderColor: currentThemeConfig.border
                      }}
                    >
                      <span className="w-12 text-center text-xs font-mono font-bold" style={{ color: currentThemeConfig.text }}>{termLineHeight.toFixed(1)}</span>
                      <button
                        onClick={() => updateSetting('terminalLineHeight', Math.max(1.0, +(termLineHeight - 0.1).toFixed(1)))}
                        className="px-2.5 h-full border-l transition-colors hover:opacity-75"
                        style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.textMuted }}
                      >
                        <Minus size={11} />
                      </button>
                      <button
                        onClick={() => updateSetting('terminalLineHeight', Math.min(2.0, +(termLineHeight + 0.1).toFixed(1)))}
                        className="px-2.5 h-full border-l transition-colors hover:opacity-75"
                        style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.textMuted }}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Letter Spacing Stepper */}
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: currentThemeConfig.border }}>
                    <span className="text-xs font-medium" style={{ color: currentThemeConfig.text }}>
                      {t.terminalLetterSpacing || 'Khoảng cách chữ'}
                    </span>
                    <div
                      className="flex items-center border rounded-xl overflow-hidden h-8"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput,
                        borderColor: currentThemeConfig.border
                      }}
                    >
                      <span className="w-12 text-center text-xs font-mono font-bold" style={{ color: currentThemeConfig.text }}>{termLetterSpacing}</span>
                      <button
                        onClick={() => updateSetting('terminalLetterSpacing', Math.max(-2, termLetterSpacing - 1))}
                        className="px-2.5 h-full border-l transition-colors hover:opacity-75"
                        style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.textMuted }}
                      >
                        <Minus size={11} />
                      </button>
                      <button
                        onClick={() => updateSetting('terminalLetterSpacing', Math.min(5, termLetterSpacing + 1))}
                        className="px-2.5 h-full border-l transition-colors hover:opacity-75"
                        style={{ borderColor: currentThemeConfig.border, color: currentThemeConfig.textMuted }}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: COLOR & PALETTE */}
              <div className="space-y-3">
                <span className="text-xs font-semibold block" style={{ color: currentThemeConfig.text }}>
                  {t.terminalColorSection || 'Bảng Màu & Giao Diện Terminal'}
                </span>
                <div
                  className="border rounded-2xl p-5 space-y-4"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  {/* Palette Dropdown Selector */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: currentThemeConfig.text }}>
                      {t.terminalPalette || 'Bảng màu'}
                    </span>
                    <div className="relative w-48">
                      <select
                        value={termPalette}
                        onChange={(e) => updateSetting('terminalPalette', e.target.value)}
                        className="w-full h-8 border rounded-xl px-3 text-xs focus:outline-none font-mono appearance-none cursor-pointer"
                        style={{
                          backgroundColor: currentThemeConfig.innerInput,
                          borderColor: currentThemeConfig.border,
                          color: currentThemeConfig.text
                        }}
                      >
                        {PALETTES.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-2.5 pointer-events-none" style={{ color: currentThemeConfig.textMuted }} />
                    </div>
                  </div>

                  {/* Cursor Style Pill Selector */}
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: currentThemeConfig.border }}>
                    <span className="text-xs font-medium" style={{ color: currentThemeConfig.text }}>
                      {t.terminalCursorStyle || 'Kiểu con trỏ'}
                    </span>
                    <div
                      className="flex items-center border rounded-xl p-0.5"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput,
                        borderColor: currentThemeConfig.border
                      }}
                    >
                      {[
                        { id: 'block', label: t.cursorBlock || 'Block' },
                        { id: 'bar', label: t.cursorBar || 'Bar' },
                        { id: 'underline', label: t.cursorUnderline || 'Underline' }
                      ].map(styleItem => (
                        <button
                          key={styleItem.id}
                          onClick={() => updateSetting('terminalCursorStyle', styleItem.id)}
                          className="px-3 py-1 rounded-lg text-xs capitalize font-medium transition-all"
                          style={
                            termCursorStyle === styleItem.id
                              ? {
                                  backgroundColor: `${accentColor}20`,
                                  color: accentColor,
                                  fontWeight: '600'
                                }
                              : {
                                  color: currentThemeConfig.textMuted
                                }
                          }
                        >
                          {styleItem.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* PALETTE THEME CARDS (4x2 GRID) */}
                <div className="grid grid-cols-4 gap-3 pt-2">
                  {PALETTES.map((pal) => {
                    const isSelected = termPalette === pal.id;
                    return (
                      <button
                        key={pal.id}
                        onClick={() => updateSetting('terminalPalette', pal.id)}
                        className="p-3.5 rounded-2xl border text-left transition-all"
                        style={{
                          backgroundColor: isSelected ? `${accentColor}18` : currentThemeConfig.card,
                          borderColor: isSelected ? accentColor : currentThemeConfig.border,
                          boxShadow: isSelected ? `0 0 15px ${accentColor}25` : 'none'
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-xs font-bold font-sans"
                            style={{ color: isSelected ? accentColor : currentThemeConfig.text }}
                          >
                            {pal.name}
                          </span>
                          {isSelected && <Check size={13} className="stroke-[3]" style={{ color: accentColor }} />}
                        </div>
                        {/* Color Dots */}
                        <div className="flex items-center gap-1.5 pt-1">
                          {pal.dots.map((dotColor, idx) => (
                            <span
                              key={idx}
                              className="w-2.5 h-2.5 rounded-full shadow-sm"
                              style={{ backgroundColor: dotColor }}
                            ></span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* SMART AUTO-SUGGESTION FOR TERMINAL & SSH */}
                <div
                  className="border rounded-2xl p-5 space-y-3"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles size={15} style={{ color: accentColor }} />
                        <span className="text-xs font-bold" style={{ color: currentThemeConfig.text }}>
                          Tự động gợi ý lệnh thông minh (Smart Auto-Suggestions)
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Hỗ trợ cả SSH &amp; Local
                        </span>
                      </div>
                      <p className="text-[11.5px] mt-1" style={{ color: currentThemeConfig.textMuted }}>
                        Tự động gợi ý lệnh DevOps/Docker/Linux và lịch sử lệnh ngay cả khi đang SSH vào máy chủ từ xa. Nhấn <kbd className="px-1.5 py-0.5 rounded border text-[10px] font-mono">Tab</kbd> hoặc <kbd className="px-1.5 py-0.5 rounded border text-[10px] font-mono">→</kbd> để hoàn tất lệnh.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateSetting('terminalAutoSuggest', !(settings.terminalAutoSuggest ?? true))}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0"
                      style={{
                        backgroundColor: (settings.terminalAutoSuggest ?? true) ? accentColor : '#334155'
                      }}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          (settings.terminalAutoSuggest ?? true) ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 6: WSL & ENVIRONMENT SETTINGS (INTEGRATION)     */}
          {/* =================================================== */}
          {activeCategory === 'wsl_env' && isWindows && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-sm font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                  {t.tabWslEnv || 'WSL & Environment'}
                </h2>
                <p className="text-xs mt-1" style={{ color: currentThemeConfig.textMuted }}>
                  {t.wslEnvDesc || 'Kiểm soát nguồn nạp SSH configs, SSH keys và môi trường chạy lệnh'}
                </p>
              </div>

              {/* Main Switch: Windows Native vs WSL2 */}
              <div
                className="border rounded-2xl p-5 space-y-4"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: currentThemeConfig.text }}>
                      {t.wslToggleTitle || 'Tích hợp WSL (Windows Subsystem for Linux)'}
                    </span>
                    <span className="text-[11.5px] mt-0.5 block" style={{ color: currentThemeConfig.textMuted }}>
                      {settings.enableWsl
                        ? (t.wslToggleOnDesc || 'Đang bật: App tự động đọc thêm SSH config & keys từ WSL, hỗ trợ chạy terminal tmux/WSL')
                        : (t.wslToggleOffDesc || 'Đang tắt: App chạy 100% Windows Native (PowerShell / CMD), chỉ đọc SSH từ %USERPROFILE%\\.ssh')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSetting('enableWsl', !settings.enableWsl)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                    style={{
                      backgroundColor: settings.enableWsl ? accentColor : '#475569'
                    }}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.enableWsl ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {settings.enableWsl && (
                  <div className="pt-4 border-t space-y-3 animate-in fade-in duration-150" style={{ borderColor: currentThemeConfig.border }}>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: currentThemeConfig.textMuted }}>
                        {t.wslDistroLabel || 'Bản phân phối WSL (Distribution)'}
                      </label>
                      <select
                        value={settings.wslDistro || (availableDistros[0] || 'Ubuntu-24.04')}
                        onChange={(e) => updateSetting('wslDistro', e.target.value)}
                        className="w-full h-9 border rounded-xl px-3 text-xs focus:outline-none font-mono"
                        style={{
                          backgroundColor: currentThemeConfig.innerInput,
                          borderColor: currentThemeConfig.border,
                          color: currentThemeConfig.text
                        }}
                      >
                        {availableDistros.map((distro) => (
                          <option key={distro} value={distro}>
                            {distro}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-medium block" style={{ color: currentThemeConfig.text }}>{t.autoTmuxTitle || 'Tự động kết nối tmux'}</span>
                        <span className="text-[11px]" style={{ color: currentThemeConfig.textMuted }}>{t.autoTmuxDesc || 'Tạo hoặc đính kèm tmux session khi mở terminal'}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.autoTmux ?? true}
                        onChange={(e) => updateSetting('autoTmux', e.target.checked)}
                        className="w-4 h-4 rounded cursor-pointer"
                        style={{ accentColor }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Windows Shell Selection */}
              <div
                className="border rounded-2xl p-5 space-y-3"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: currentThemeConfig.text }}>
                  {t.windowsShellTitle || 'Shell Mặc Định Trên Windows'}
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'powershell', label: 'PowerShell', desc: t.shellPowershellDesc || 'Khuyến nghị cho Windows 10/11' },
                    { id: 'cmd', label: 'Command Prompt', desc: t.shellCmdDesc || 'cmd.exe truyền thống' },
                    { id: 'gitbash', label: 'Git Bash', desc: t.shellGitBashDesc || 'Bash cho Windows (MINGW64)' },
                    { id: 'wsl', label: 'WSL Bash', desc: t.shellWslDesc || 'Chỉ hoạt động khi bật công tắc WSL' },
                  ].map((sh) => {
                    const isSelected = (settings.defaultShell || 'powershell') === sh.id;
                    const isDisabled = sh.id === 'wsl' && !settings.enableWsl;
                    return (
                      <button
                        key={sh.id}
                        disabled={isDisabled}
                        onClick={() => updateSetting('defaultShell', sh.id)}
                        className="p-3 rounded-xl border text-left transition-all"
                        style={
                          isDisabled
                            ? {
                                opacity: 0.35,
                                cursor: 'not-allowed',
                                borderColor: currentThemeConfig.border,
                                backgroundColor: currentThemeConfig.innerInput,
                                color: currentThemeConfig.textMuted
                              }
                            : isSelected
                            ? {
                                borderColor: accentColor,
                                backgroundColor: `${accentColor}18`,
                                color: accentColor,
                                boxShadow: `0 0 10px ${accentColor}25`
                              }
                            : {
                                borderColor: currentThemeConfig.border,
                                backgroundColor: currentThemeConfig.innerInput,
                                color: currentThemeConfig.textMuted
                              }
                        }
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold" style={{ color: isSelected ? accentColor : currentThemeConfig.text }}>
                            {sh.label}
                          </span>
                          {isSelected && <Check size={14} style={{ color: accentColor }} />}
                        </div>
                        <span className="text-[10.5px] block" style={{ color: currentThemeConfig.textMuted }}>{sh.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 7: MACHINE TAGS (IMAGE 1)                       */}
          {/* =================================================== */}
          {activeCategory === 'tags' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-sm font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                {t.tabTags || 'Machine Tags'}
              </h2>

              <div className="space-y-2">
                <h3 className="text-xs font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                  {t.manageMachineTags || 'Manage Machine Tags'}
                </h3>

                <div
                  className="border rounded-2xl p-5 space-y-4"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  {/* Tag Creation Input Bar with Swatches & Add Button */}
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      placeholder={t.newTagPlaceholder || 'New tag name (e.g. Production, Kubernetes, ...)'}
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="flex-1 min-w-[240px] h-9 border rounded-xl px-3.5 text-xs focus:outline-none font-sans"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput,
                        borderColor: currentThemeConfig.border,
                        color: currentThemeConfig.text
                      }}
                    />

                    {/* 8 Color Swatch Picker Dots */}
                    <div
                      className="flex items-center gap-2 px-2.5 py-1 border rounded-xl h-9"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput,
                        borderColor: currentThemeConfig.border
                      }}
                    >
                      {TAG_SWATCH_COLORS.map((color) => {
                        const isSelected = selectedTagColor === color;
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setSelectedTagColor(color)}
                            className={`w-4 h-4 rounded-full transition-transform flex items-center justify-center ${
                              isSelected
                                ? 'scale-125 ring-2 ring-white/90 ring-offset-2'
                                : 'opacity-70 hover:opacity-100 hover:scale-110'
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Add Tag Button */}
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="h-9 px-4 rounded-xl text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm flex-shrink-0"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Plus size={14} className="stroke-[2.5]" />
                      <span>{t.addTagBtn || 'Add Tag'}</span>
                    </button>
                  </div>

                  {/* List of Custom Tags or Empty State */}
                  <div className="pt-4 border-t" style={{ borderColor: currentThemeConfig.border }}>
                    {tagsList.length === 0 ? (
                      <div className="py-6 text-center text-xs" style={{ color: currentThemeConfig.textMuted }}>
                        {t.noCustomTags || 'No custom tags created yet.'}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2.5">
                        {tagsList.map((tag) => (
                          <div
                            key={tag.id}
                            className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all"
                            style={{
                              backgroundColor: currentThemeConfig.innerInput,
                              borderColor: currentThemeConfig.border,
                              color: currentThemeConfig.text
                            }}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="font-medium">{tag.name}</span>
                            <button
                              type="button"
                              onClick={() => setTagToDelete(tag)}
                              className="opacity-60 group-hover:opacity-100 transition-opacity ml-1 hover:text-rose-400"
                              style={{ color: currentThemeConfig.textMuted }}
                              title="Delete tag"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB: MICROSERVICES DEV                              */}
          {/* =================================================== */}
          {activeCategory === 'microservices' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-sm font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                {t.tabMicroservices || 'Microservices Dev'}
              </h2>

              <div className="space-y-2">
                <h3 className="text-xs font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                  {t.dockerConfigTitle || 'Docker & Compose Configuration'}
                </h3>

                <div
                  className="border rounded-2xl divide-y overflow-hidden"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold block" style={{ color: currentThemeConfig.text }}>
                        {t.dockerEndpoint || 'Docker Engine Endpoint'}
                      </span>
                      <span className="text-[11px] mt-0.5 block" style={{ color: currentThemeConfig.textMuted }}>
                        {t.dockerEndpointDesc || 'Windows named pipe or local socket for Docker daemon communication'}
                      </span>
                    </div>
                    <div
                      className="px-3 py-1 rounded-xl border text-xs font-mono font-semibold"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput,
                        borderColor: currentThemeConfig.border,
                        color: accentColor
                      }}
                    >
                      //./pipe/docker_engine
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold block" style={{ color: currentThemeConfig.text }}>
                        {t.autoDiscoverCompose || 'Auto-discover Local Compose Projects'}
                      </span>
                      <span className="text-[11px] mt-0.5 block" style={{ color: currentThemeConfig.textMuted }}>
                        {t.autoDiscoverComposeDesc || 'Scan current project workspace for docker-compose.yml services'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked={true}
                      className="w-4 h-4 rounded cursor-pointer"
                      style={{ accentColor }}
                    />
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold block" style={{ color: currentThemeConfig.text }}>
                        {t.containerLogBuffer || 'Container Log Buffer'}
                      </span>
                      <span className="text-[11px] mt-0.5 block" style={{ color: currentThemeConfig.textMuted }}>
                        {t.containerLogBufferDesc || 'Maximum retained log history per running service'}
                      </span>
                    </div>
                    <div
                      className="flex items-center border rounded-xl px-3 py-1.5 text-xs font-mono"
                      style={{
                        backgroundColor: currentThemeConfig.innerInput,
                        borderColor: currentThemeConfig.border,
                        color: currentThemeConfig.text
                      }}
                    >
                      <input
                        type="number"
                        defaultValue={1000}
                        className="w-14 bg-transparent text-right pr-1 focus:outline-none"
                      />
                      <span style={{ color: currentThemeConfig.textMuted }}>{t.linesUnit || 'lines'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 8: DIAGNOSTICS (IMAGE 2)                        */}
          {/* =================================================== */}
          {activeCategory === 'diagnostics' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-sm font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                {t.tabDiagnostics || 'Diagnostics'}
              </h2>

              <div className="space-y-2">
                <h3 className="text-xs font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                  {t.runtimeDiagnostics || 'Runtime & Transport Diagnostics'}
                </h3>

                <div
                  className="border rounded-2xl divide-y overflow-hidden"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  {/* Row 1: SSH Transport Engine */}
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: currentThemeConfig.text }}>
                      {t.sshTransportEngine || 'SSH Transport Engine'}
                    </span>
                    <span className="text-xs font-mono font-medium" style={{ color: currentThemeConfig.text }}>
                      {diagnosticsData.engine}
                    </span>
                  </div>

                  {/* Row 2: Terminal Renderer */}
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: currentThemeConfig.text }}>
                      {t.terminalRenderer || 'Terminal Renderer'}
                    </span>
                    <span className="text-xs font-mono font-medium" style={{ color: currentThemeConfig.text }}>
                      {diagnosticsData.renderer}
                    </span>
                  </div>

                  {/* Row 3: Configured Identities / Keys / Proxies */}
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: currentThemeConfig.text }}>
                      {t.configuredIdentities || 'Configured Identities / Keys / Proxies'}
                    </span>
                    <span className="text-xs font-mono font-medium" style={{ color: currentThemeConfig.text }}>
                      {diagnosticsData.identities_count} {t.identitiesWord || 'Identities'} • {diagnosticsData.keys_count} {t.keysWord || 'Keys'} • {diagnosticsData.proxies_count} {t.proxiesWord || 'Proxies'}
                    </span>
                  </div>

                  {/* Row 4: Process Memory Footprint */}
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: currentThemeConfig.text }}>
                      {t.memoryWorkingSet || 'Process Memory Working Set'}
                    </span>
                    <span className="text-xs font-mono font-semibold" style={{ color: accentColor }}>
                      ~{diagnosticsData.memory_mb || '27.4'} MB RAM (Rust Native)
                    </span>
                  </div>

                  {/* Row 5: Host Target Execution */}
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: currentThemeConfig.text }}>
                      {t.hostTarget || 'Host Target Execution'}
                    </span>
                    <span className="text-xs font-mono font-medium" style={{ color: currentThemeConfig.textMuted }}>
                      {diagnosticsData.platform}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 9: ABOUT (IMAGE 3)                              */}
          {/* =================================================== */}
          {activeCategory === 'about' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-sm font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                {t.tabAbout || 'About'}
              </h2>

              {/* Hero Card */}
              <div
                className="border rounded-2xl p-6"
                style={{
                  backgroundColor: currentThemeConfig.card,
                  borderColor: currentThemeConfig.border
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Waveform / Pulse icon inside rounded box */}
                  <div
                    className="w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${accentColor}18`,
                      borderColor: `${accentColor}40`,
                      color: accentColor,
                      boxShadow: `0 0 20px ${accentColor}25`
                    }}
                  >
                    <Activity size={24} className="stroke-[2.5]" />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold tracking-wide" style={{ color: currentThemeConfig.text }}>
                        {t.aboutAppTitle || 'Service Tool & SSH-Box'}
                      </h3>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold border"
                        style={{
                          backgroundColor: `${accentColor}18`,
                          borderColor: `${accentColor}50`,
                          color: accentColor
                        }}
                      >
                        {t.versionBadge || 'Version 2.0.0 • Rust Native PE + WebView2'}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: currentThemeConfig.textMuted }}>
                      {t.aboutSubtitle || 'Native Windows Server Resource Manager, Telemetry Dashboard, Docker Controller & SSH Workspace'}
                    </p>
                  </div>
                </div>
              </div>

              {/* KEYBOARD SHORTCUTS Section */}
              <div className="space-y-2 pt-1">
                <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: currentThemeConfig.textMuted }}>
                  {t.keyboardShortcuts || 'KEYBOARD SHORTCUTS'}
                </h3>

                <div
                  className="border rounded-2xl divide-y overflow-hidden"
                  style={{
                    backgroundColor: currentThemeConfig.card,
                    borderColor: currentThemeConfig.border
                  }}
                >
                  {[
                    { action: t.openSettings || 'Open Settings', mac: '⌘ ,', win: 'Ctrl + ,' },
                    { action: t.splitVertical || 'Split Terminal Vertically', mac: '⌘ D', win: 'Ctrl + Shift + D' },
                    { action: t.splitHorizontal || 'Split Terminal Horizontally', mac: '⇧ ⌘ D', win: 'Ctrl + Shift + E' },
                    { action: t.closeActivePane || 'Close Active Terminal Pane', mac: '⌘ W', win: 'Ctrl + W' },
                    { action: t.openLocalSession || 'Open Local Terminal Session', mac: '⌘ T', win: 'Ctrl + T' }
                  ].map((item) => (
                    <div key={item.action} className="p-3.5 px-4 flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: currentThemeConfig.text }}>{item.action}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded border text-[11px] font-mono font-medium"
                          style={{
                            backgroundColor: currentThemeConfig.innerInput,
                            borderColor: currentThemeConfig.border,
                            color: currentThemeConfig.textMuted
                          }}
                        >
                          {item.mac}
                        </span>
                        <span
                          className="px-2.5 py-0.5 rounded-md border text-xs font-mono font-semibold shadow-sm"
                          style={{
                            backgroundColor: currentThemeConfig.innerInput,
                            borderColor: `${accentColor}50`,
                            color: accentColor
                          }}
                        >
                          {item.win}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!tagToDelete}
        title="Xác nhận xóa Thẻ (Tag)"
        message="Bạn có chắc muốn xóa thẻ phân loại này?"
        itemName={tagToDelete?.name}
        confirmText="Xóa thẻ"
        cancelText="Hủy"
        onConfirm={() => {
          if (tagToDelete) {
            handleDeleteTag(tagToDelete.id);
            setTagToDelete(null);
          }
        }}
        onCancel={() => setTagToDelete(null)}
        settings={settings}
      />
    </div>
  );
}
