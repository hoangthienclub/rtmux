const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function run(cmd, cwd) {
  try {
    return execSync(cmd, { cwd: cwd || process.cwd(), encoding: 'utf8' }).trim();
  } catch (e) {
    return '';
  }
}

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = pkg.version || '0.1.0';

  const runNumber = process.env.GITHUB_RUN_NUMBER || '1';
  let targetTag = `v${version}`;

  // Check if tag already exists in remote or local git
  const existingTags = run('git tag -l', rootDir).split('\n').map(t => t.trim());
  if (existingTags.includes(targetTag)) {
    targetTag = `v${version}-b${runNumber}`;
  }

  const releaseTitle = `RTMUX Desktop ${targetTag}`;

  // Find previous tag for changelog diff
  const allTags = run('git tag --sort=-creatordate', rootDir).split('\n').map(t => t.trim()).filter(Boolean);
  const prevTag = allTags.find(t => t !== targetTag);

  let gitLogCmd = 'git log -n 25 --pretty=format:"%s (%h)"';
  if (prevTag) {
    gitLogCmd = `git log ${prevTag}..HEAD --pretty=format:"%s (%h)"`;
  }

  const rawLogs = run(gitLogCmd, rootDir).split('\n').map(l => l.trim()).filter(Boolean);

  const features = [];
  const fixes = [];
  const improvements = [];
  const others = [];

  for (const line of rawLogs) {
    const lower = line.toLowerCase();
    if (lower.startsWith('feat') || lower.includes('feature')) {
      features.push(line);
    } else if (lower.startsWith('fix') || lower.includes('bug')) {
      fixes.push(line);
    } else if (lower.startsWith('refactor') || lower.startsWith('perf') || lower.startsWith('update')) {
      improvements.push(line);
    } else {
      others.push(line);
    }
  }

  let changelog = `## 📦 Bản Phát Hành: ${releaseTitle}\n\n`;
  changelog += `*Thời gian tạo: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC*\n\n`;

  if (features.length > 0) {
    changelog += `### 🚀 Tính Năng Mới (Features)\n`;
    features.forEach(f => { changelog += `- ${f}\n`; });
    changelog += `\n`;
  }

  if (fixes.length > 0) {
    changelog += `### 🐛 Sửa Lỗi (Bug Fixes)\n`;
    fixes.forEach(f => { changelog += `- ${f}\n`; });
    changelog += `\n`;
  }

  if (improvements.length > 0) {
    changelog += `### ⚡ Cải Tiến & Tối Ưu (Improvements)\n`;
    improvements.forEach(f => { changelog += `- ${f}\n`; });
    changelog += `\n`;
  }

  if (others.length > 0) {
    changelog += `### 📝 Thay Đổi Khác (Other Changes)\n`;
    others.forEach(f => { changelog += `- ${f}\n`; });
    changelog += `\n`;
  }

  changelog += `\n---\n### 📥 Danh Sách File Cài Đặt & Bản Portable (Artifacts):\n`;
  changelog += `- **🪟 Windows:**\n`;
  changelog += `  - 🚀 **\`rtmux-portable.exe\`**: Bản Portable 1 file duy nhất, bấm chạy ngay không cần cài đặt.\n`;
  changelog += `  - 📦 **\`rtmux-windows-portable.zip\`**: Gói nén Portable zip.\n`;
  changelog += `  - 💿 File cài đặt chuẩn: \`.msi\` (WiX) và \`.exe\` (NSIS Setup).\n`;
  changelog += `- **🍏 macOS:**\n`;
  changelog += `  - 🚀 **\`rtmux-macos-portable.zip\`**: Bản Portable nén chạy ngay.\n`;
  changelog += `  - 💿 File cài đặt chuẩn: \`.dmg\` và \`.app.tar.gz\` (Universal / Apple Silicon & Intel).\n`;
  changelog += `- **🐧 Linux:**\n`;
  changelog += `  - 🚀 **\`rtmux-desktop.AppImage\`**: File Portable chạy ngay trên mọi distro Linux.\n`;
  changelog += `  - 📦 **\`rtmux-linux-x86_64-portable.tar.gz\`**: Gói Portable tar.gz.\n`;
  changelog += `  - 💿 Gói cài đặt chuẩn: \`.deb\` cho Ubuntu/Debian.\n`;

  // Write release notes file
  const notesFile = path.join(rootDir, 'RELEASE_NOTES.md');
  fs.writeFileSync(notesFile, changelog, 'utf8');
  console.log(`Release Notes generated at ${notesFile}`);

  // Write GitHub Actions output if GITHUB_OUTPUT is present
  const ghOutput = process.env.GITHUB_OUTPUT;
  if (ghOutput) {
    fs.appendFileSync(ghOutput, `tag_name=${targetTag}\n`);
    fs.appendFileSync(ghOutput, `release_name=${releaseTitle}\n`);
    fs.appendFileSync(ghOutput, `notes_path=${notesFile}\n`);
  }

  console.log('TAG_NAME:', targetTag);
  console.log('RELEASE_NAME:', releaseTitle);
}

main();
