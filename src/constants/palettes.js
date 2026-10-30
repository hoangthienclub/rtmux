export const PALETTES = [
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    bg: '#1a1b26',
    fg: '#a9b1d6',
    cursor: '#c0caf5',
    selection: 'rgba(122, 162, 247, 0.3)',
    black: '#15161e',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',
    dots: ['#7aa2f7', '#bb9af7', '#7dcfff', '#f7768e']
  },
  {
    id: 'monokai-pro',
    name: 'Monokai Pro',
    bg: '#2d2a2e',
    fg: '#fcfcfa',
    cursor: '#ffd866',
    selection: 'rgba(255, 216, 102, 0.3)',
    black: '#221f22',
    red: '#ff6188',
    green: '#a9dc76',
    yellow: '#ffd866',
    blue: '#fc9867',
    magenta: '#ab9df2',
    cyan: '#78dce8',
    white: '#fcfcfa',
    dots: ['#ffd866', '#a9dc76', '#fc9867', '#78dce8', '#ff6188']
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    bg: '#1e1e2e',
    fg: '#cdd6f4',
    cursor: '#f5e0dc',
    selection: 'rgba(203, 166, 247, 0.3)',
    black: '#181825',
    red: '#f38ba8',
    green: '#a6e3a1',
    yellow: '#f9e2af',
    blue: '#89b4fa',
    magenta: '#cba6f7',
    cyan: '#89dceb',
    white: '#cdd6f4',
    dots: ['#f5c2e7', '#cba6f7', '#94e2d5', '#89dceb']
  },
  {
    id: 'dracula',
    name: 'Dracula',
    bg: '#282a36',
    fg: '#f8f8f2',
    cursor: '#f8f8f2',
    selection: 'rgba(189, 147, 249, 0.3)',
    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    dots: ['#bd93f9', '#ff79c6', '#50fa7b', '#f1fa8c', '#8be9fd']
  },
  {
    id: 'one-dark-pro',
    name: 'One Dark Pro',
    bg: '#282c34',
    fg: '#abb2bf',
    cursor: '#528bff',
    selection: 'rgba(97, 175, 239, 0.3)',
    black: '#1e2227',
    red: '#e06c75',
    green: '#98c379',
    yellow: '#e5c07b',
    blue: '#61afef',
    magenta: '#c678dd',
    cyan: '#56b6c2',
    white: '#abb2bf',
    dots: ['#61afef', '#e5c07b', '#e06c75', '#98c379', '#56b6c2']
  },
  {
    id: 'nord-frost',
    name: 'Nord Frost',
    bg: '#2e3440',
    fg: '#d8dee9',
    cursor: '#88c0d0',
    selection: 'rgba(136, 192, 208, 0.3)',
    black: '#242933',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#81a1c1',
    magenta: '#b48ead',
    cyan: '#88c0d0',
    white: '#eceff4',
    dots: ['#88c0d0', '#81a1c1', '#5e81ac', '#8fbcbb']
  },
  {
    id: 'obsidian-cyber',
    name: 'Obsidian Cyber',
    bg: '#070a12',
    fg: '#e2e8f0',
    cursor: '#10b981',
    selection: 'rgba(16, 185, 129, 0.3)',
    black: '#1e2638',
    red: '#f43f5e',
    green: '#10b981',
    yellow: '#f59e0b',
    blue: '#3b82f6',
    magenta: '#d946ef',
    cyan: '#06b6d4',
    white: '#f8fafc',
    dots: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b']
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    bg: '#fdf6e3',
    fg: '#657b83',
    cursor: '#586e75',
    light: true,
    selection: 'rgba(181, 137, 0, 0.3)',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    dots: ['#b58900', '#cb4b16', '#dc322f', '#268bd2', '#2aa198']
  }
];

export const SURFACE_THEMES = [
  {
    id: 'zinc',
    name: 'Zinc',
    desc: 'Modern Neutral Dark',
    pillBg: '#18181b',
    border: '#27272a'
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    desc: 'Deep Slate Dark',
    pillBg: '#0f172a',
    border: '#1e293b'
  },
  {
    id: 'carbon',
    name: 'Carbon',
    desc: 'Warm Graphite Dark',
    pillBg: '#1c1917',
    border: '#292524'
  },
  {
    id: 'midnight',
    name: 'Midnight',
    desc: 'Deep Indigo Dark',
    pillBg: '#1e1b4b',
    border: '#312e81'
  },
  {
    id: 'dracula',
    name: 'Dracula',
    desc: 'Classic Gothic Dark',
    pillBg: '#282a36',
    border: '#44475a'
  },
  {
    id: 'daylight',
    name: 'Daylight',
    desc: 'Clean Light Surface',
    pillBg: '#f8fafc',
    pillBorder: '#e2e8f0',
    border: '#cbd5e1'
  }
];

export const ACCENT_COLORS = [
  { id: 'emerald', color: '#10b981', name: 'Emerald' },
  { id: 'cyan', color: '#06b6d4', name: 'Cyan' },
  { id: 'purple', color: '#8b5cf6', name: 'Purple' },
  { id: 'amber', color: '#f59e0b', name: 'Amber' },
  { id: 'rose', color: '#f43f5e', name: 'Rose' },
  { id: 'lime', color: '#84cc16', name: 'Lime' }
];

export const FONTS = [
  'SF Mono',
  'JetBrains Mono',
  'Cascadia Code',
  'Fira Code',
  'Consolas',
  'Inter'
];

export const THEME_CONFIGS = {
  zinc: {
    bg: '#09090b',
    subBg: '#121215',
    card: '#18181b',
    border: '#27272a',
    hoverBorder: '#3f3f46',
    text: '#f4f4f5',
    textMuted: '#a1a1aa',
    innerInput: '#0d0d10'
  },
  obsidian: {
    bg: '#020617',
    subBg: '#090e1d',
    card: '#0f172a',
    border: '#1e293b',
    hoverBorder: '#334155',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    innerInput: '#070b16'
  },
  carbon: {
    bg: '#0c0a09',
    subBg: '#151210',
    card: '#1c1917',
    border: '#292524',
    hoverBorder: '#44403c',
    text: '#fafaf9',
    textMuted: '#a8a29e',
    innerInput: '#0e0c0b'
  },
  midnight: {
    bg: '#070719',
    subBg: '#0d0d26',
    card: '#131233',
    border: '#242254',
    hoverBorder: '#3b3780',
    text: '#f5f3ff',
    textMuted: '#a5b4fc',
    innerInput: '#09081f'
  },
  dracula: {
    bg: '#282a36',
    subBg: '#21222c',
    card: '#2d303e',
    border: '#44475a',
    hoverBorder: '#6272a4',
    text: '#f8f8f2',
    textMuted: '#6272a4',
    innerInput: '#1e1f29'
  },
  daylight: {
    bg: '#f1f5f9',
    subBg: '#ffffff',
    card: '#ffffff',
    border: '#cbd5e1',
    hoverBorder: '#94a3b8',
    text: '#0f172a',
    textMuted: '#64748b',
    innerInput: '#f8fafc',
    isLight: true
  }
};

export const SYSTEM_FONTS = [
  { id: 'system', name: 'System Default', fontStack: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", desc: 'Chuẩn giao diện hệ điều hành' },
  { id: 'inter', name: 'Inter', fontStack: "'Inter', system-ui, -apple-system, sans-serif", desc: 'Hiện đại, tinh gọn & dễ đọc' },
  { id: 'segoe', name: 'Segoe UI', fontStack: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif", desc: 'Chuẩn giao diện Windows Fluent' },
  { id: 'vietnam', name: 'Be Vietnam Pro', fontStack: "'Be Vietnam Pro', 'Inter', system-ui, sans-serif", desc: 'Tối ưu hiển thị dấu Tiếng Việt' },
  { id: 'jetbrains', name: 'JetBrains Mono', fontStack: "'JetBrains Mono', 'Cascadia Code', monospace", desc: 'Phông chữ lập trình & tech' },
  { id: 'roboto', name: 'Roboto', fontStack: "'Roboto', system-ui, sans-serif", desc: 'Chuẩn giao diện Google Standard' },
];

export const UI_FONT_SIZES = [
  { id: '12px', label: '85% (Nhỏ - 12px)', enLabel: '85% (Small - 12px)', scale: '12px' },
  { id: '13px', label: '92% (Gọn - 13px)', enLabel: '92% (Compact - 13px)', scale: '13px' },
  { id: '14px', label: '100% (Tiêu chuẩn - 14px)', enLabel: '100% (Default - 14px)', scale: '14px' },
  { id: '15px', label: '108% (Vừa - 15px)', enLabel: '108% (Medium - 15px)', scale: '15px' },
  { id: '16px', label: '115% (Lớn - 16px)', enLabel: '115% (Large - 16px)', scale: '16px' },
  { id: '18px', label: '130% (Rất lớn - 18px)', enLabel: '130% (Extra Large - 18px)', scale: '18px' },
];

/**
 * 3 mốc màu hiển thị tải hệ thống (Xanh, Vàng, Đỏ):
 * - Xanh (< 60%): Bình thường, an toàn (#10b981)
 * - Vàng (60% - < 80%): Tải vừa, cảnh báo (#f59e0b)
 * - Đỏ (>= 80%): Quá tải, nguy hiểm (#ef4444)
 */
export function getMetricColor(pct, isOnline = true, defaultMuted = '#64748b') {
  if (isOnline === false) return defaultMuted;
  if (pct === null || pct === undefined || pct === '' || pct === '-') return defaultMuted;
  const num = typeof pct === 'string' ? parseFloat(pct.replace('%', '')) : Number(pct);
  if (isNaN(num)) return defaultMuted;
  if (num < 60) return '#10b981'; // Xanh lá
  if (num < 80) return '#f59e0b'; // Vàng
  return '#ef4444';               // Đỏ
}


