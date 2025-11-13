#!/bin/bash
# 快速重新部署脚本

set -e

PROJECT_DIR="/home/ubuntu/psd-canvas-jaaz"
REACT_DIR="$PROJECT_DIR/react"

echo "=========================================="
echo "快速重新部署"
echo "=========================================="

# 构建前端
echo "构建前端..."
cd "$REACT_DIR"
npm run build

# 重启服务
echo "重启服务..."
sudo systemctl restart psd-backend
sudo systemctl restart psd-frontend

echo "✅ 部署完成！"
echo "服务状态:"
sudo systemctl status psd-backend --no-pager | head -3
sudo systemctl status psd-frontend --no-pager | head -3


