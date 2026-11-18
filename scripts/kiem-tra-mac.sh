ok()   { printf "✅ %-16s %s\n" "$1" "$2"; }
miss() { printf "❌ %-16s %s\n   → %s\n" "$1" "$2" "$3"; }
warn() { printf "⚠️  %-16s %s\n   → %s\n" "$1" "$2" "$3"; }
echo "===== KIỂM TRA MÔI TRƯỜNG ====="
if xcode-select -p >/dev/null 2>&1; then ok "Xcode CLT" "đã có"; else miss "Xcode CLT" "chưa có" "xcode-select --install"; fi
if [ -x /opt/homebrew/bin/brew ]; then eval "$(/opt/homebrew/bin/brew shellenv)"; ok "Homebrew" "$(brew --version | head -1)"; else miss "Homebrew" "chưa có" "cài theo Bước 0 (sau khi có Xcode CLT)"; fi
if xcode-select -p >/dev/null 2>&1 && command -v git >/dev/null 2>&1; then ok "Git" "$(git --version)"; else miss "Git" "chưa có" "đi kèm Xcode CLT: xcode-select --install"; fi
if command -v node >/dev/null 2>&1; then
  v=$(node -p "process.versions.node"); major=${v%%.*}
  if [ "$major" -ge 22 ]; then ok "Node.js" "v$v"; else miss "Node.js" "v$v (cũ, cần bản 22)" "brew install node@22 && brew link --overwrite --force node@22"; fi
else miss "Node.js" "chưa có" "brew install node@22 && brew link --overwrite --force node@22"; fi
if [ -d "/Applications/Visual Studio Code.app" ]; then
  if command -v code >/dev/null 2>&1; then ok "VS Code" "đã có (lệnh code dùng được)"; else warn "VS Code" "đã có nhưng thiếu lệnh code" "mở VS Code → Cmd+Shift+P → Shell Command: Install 'code' command in PATH"; fi
else miss "VS Code" "chưa có" "brew install --cask visual-studio-code"; fi
if arch -x86_64 /usr/bin/true >/dev/null 2>&1; then ok "Rosetta" "đã có"; else miss "Rosetta" "chưa có" "softwareupdate --install-rosetta --agree-to-license"; fi
if [ -d "/Applications/Docker.app" ]; then
  if docker info >/dev/null 2>&1; then
    ok "Docker" "$(docker --version)"
    if docker ps --format '{{.Names}}' | grep -q library-huit-sql; then ok "SQL Server" "container đang chạy"
    elif docker ps -a --format '{{.Names}}' | grep -q library-huit-sql; then warn "SQL Server" "container đã tạo nhưng đang tắt" "docker start library-huit-sql"
    else warn "SQL Server" "chưa tạo container" "vào thư mục gốc dự án rồi chạy: docker compose up -d"; fi
  else warn "Docker" "đã cài nhưng chưa mở" "mở ứng dụng Docker, đợi cá voi trên thanh menu đứng yên rồi chạy lại kiểm tra"; fi
else miss "Docker" "chưa có" "tải Docker Desktop (Apple Silicon) tại docker.com/products/docker-desktop"; fi
if command -v python3.10 >/dev/null 2>&1; then ok "Python 3.10" "$(python3.10 --version)"; else miss "Python 3.10" "chưa có" "brew install python@3.10"; fi
if lsof -nP -iTCP:5000 -sTCP:LISTEN 2>/dev/null | grep -q ControlCenter; then warn "Cổng 5000" "AirPlay Receiver đang chiếm" "System Settings → General → AirDrop & Handoff → tắt AirPlay Receiver"; else ok "Cổng 5000" "trống"; fi
echo "Expo Go: kiểm tra thủ công trên điện thoại (App Store / Google Play)."
echo "================================"
