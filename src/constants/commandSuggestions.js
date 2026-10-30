/**
 * Built-in DevOps, Linux, Docker, and System Administration Command Dictionary
 * for Client-side Smart Auto-Suggestion (works over SSH, local WSL, Docker, etc.)
 */
export const BUILTIN_COMMANDS = [
  // Docker & Containers
  'docker ps',
  'docker ps -a',
  'docker compose up -d',
  'docker compose down',
  'docker compose ps',
  'docker compose logs -f',
  'docker compose restart',
  'docker logs -f --tail 100 ',
  'docker exec -it ',
  'docker restart ',
  'docker stop ',
  'docker start ',
  'docker images',
  'docker image prune -a',
  'docker volume ls',
  'docker network ls',
  'docker system df',
  'docker system prune -af',

  // System & Service Management
  'systemctl status ',
  'systemctl restart ',
  'systemctl start ',
  'systemctl stop ',
  'systemctl enable --now ',
  'systemctl daemon-reload',
  'journalctl -u ',
  'journalctl -xeu ',
  'journalctl -f',
  'journalctl -n 100 -u ',

  // System Resources & Monitoring
  'htop',
  'top -b -n 1 | head -n 25',
  'df -h',
  'free -m',
  'free -h',
  'uptime',
  'uname -a',
  'cat /etc/os-release',
  'dmesg -T | tail -n 50',

  // Network & Ports
  'ss -tulpn',
  'netstat -tulpn',
  'lsof -i :',
  'curl -I ',
  'curl -sSL ',
  'ping -c 4 ',
  'traceroute ',
  'ufw status verbose',
  'ufw allow ',
  'iptables -L -n -v',
  'ip a',
  'ip route',

  // Web Servers & Reverse Proxy
  'nginx -t',
  'systemctl reload nginx',
  'tail -n 50 -f /var/log/nginx/error.log',
  'tail -n 50 -f /var/log/nginx/access.log',
  'certbot renew --dry-run',
  'certbot --nginx -d ',

  // Node, PM2 & Python
  'pm2 list',
  'pm2 status',
  'pm2 logs',
  'pm2 restart all',
  'pm2 stop all',
  'npm run build',
  'npm run start',
  'pnpm run build',
  'python3 -m venv venv',
  'source venv/bin/activate',

  // Databases & Caches
  'redis-cli ping',
  'redis-cli monitor',
  'psql -U postgres',
  'mysql -u root -p',
  'mongosh',

  // Files, Navigation & Logs
  'ls -la',
  'ls -lh',
  'cd ..',
  'pwd',
  'tail -f ',
  'tail -n 100 ',
  'head -n 50 ',
  'cat ',
  'grep -rn "',
  'chmod +x ',
  'chmod 600 ~/.ssh/id_rsa',
  'chown -R ',
  'tar -czvf archive.tar.gz ',
  'tar -xzvf ',
  'find . -name "*.log"',
  'find / -type f -size +100M 2>/dev/null',

  // Git operations
  'git status',
  'git pull',
  'git log --oneline -n 10',
  'git diff',
  'git branch -a',
  'git checkout ',

  // Package Managers
  'sudo apt update && sudo apt upgrade -y',
  'sudo apt install -y ',
  'sudo apt autoremove -y',
  'sudo yum update -y',
  'sudo dnf update -y'
];

const HISTORY_KEY = 'rtmux_cmd_history';
const MAX_HISTORY = 100;

/**
 * Get cached command history from localStorage
 */
export function getCommandHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

/**
 * Add a newly executed command to history cache
 */
export function addCommandToHistory(cmd) {
  if (!cmd || typeof cmd !== 'string') return;
  const trimmed = cmd.trim();
  if (trimmed.length < 2) return;

  try {
    const current = getCommandHistory();
    // Filter out duplicate
    const next = [trimmed, ...current.filter(c => c !== trimmed)].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch (_) {}
}

/**
 * Query suggestions given a typed input string
 * Returns top matching items with the remainder to complete
 */
export function getSuggestions(input, maxResults = 5) {
  if (!input || typeof input !== 'string') return [];
  const trimmed = input.trimStart();
  if (trimmed.length === 0) return [];

  const lowerInput = trimmed.toLowerCase();
  const history = getCommandHistory();
  const results = [];
  const seen = new Set();

  // 1. Search in History first (Highest priority: exact prefix match)
  for (const cmd of history) {
    if (cmd.toLowerCase().startsWith(lowerInput) && cmd !== trimmed) {
      if (!seen.has(cmd)) {
        seen.add(cmd);
        results.push({
          full: cmd,
          completion: cmd.slice(trimmed.length),
          source: 'history',
          highlight: trimmed
        });
      }
    }
  }

  // 2. Search in Built-in Commands (Prefix match)
  for (const cmd of BUILTIN_COMMANDS) {
    if (cmd.toLowerCase().startsWith(lowerInput) && cmd !== trimmed) {
      if (!seen.has(cmd)) {
        seen.add(cmd);
        results.push({
          full: cmd,
          completion: cmd.slice(trimmed.length),
          source: 'builtin',
          highlight: trimmed
        });
      }
    }
  }

  // 3. Fallback: Contains match if we have few prefix matches
  if (results.length < maxResults && trimmed.length >= 3) {
    for (const cmd of [...history, ...BUILTIN_COMMANDS]) {
      if (!seen.has(cmd) && cmd.toLowerCase().includes(lowerInput) && cmd !== trimmed) {
        seen.add(cmd);
        results.push({
          full: cmd,
          completion: cmd.startsWith(trimmed) ? cmd.slice(trimmed.length) : '',
          source: 'related',
          highlight: trimmed
        });
      }
    }
  }

  return results.slice(0, maxResults);
}
