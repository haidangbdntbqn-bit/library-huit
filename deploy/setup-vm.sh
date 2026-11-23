#!/usr/bin/env bash
# Cài Docker và tạo 4 GB swap trên Ubuntu 22.04/24.04 (chạy một lần: bash deploy/setup-vm.sh)
set -e
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi
if [ ! -f /swapfile ]; then
  sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi
sudo timedatectl set-timezone Asia/Ho_Chi_Minh || true
echo "Xong. Đăng xuất rồi SSH lại để dùng lệnh docker không cần sudo."
