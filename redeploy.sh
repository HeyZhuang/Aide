#!/bin/bash

# ============ 重新部署脚本 ============
# 用于重新构建并部署项目到服务器

set -e  # 遇到错误立即退出

PROJECT_DIR="/home/ubuntu/psd-canvas-jaaz"
SERVER_DIR="$PROJECT_DIR/server"
REACT_DIR="$PROJECT_DIR/react"
VENV_DIR="$SERVER_DIR/venv"

echo "=========================================="
echo "开始重新部署项目"
echo "时间: $(date)"
echo "=========================================="

# ============ 1. 后端部署 ============
echo ""
echo "========== 步骤 1: 后端部署 =========="
cd "$SERVER_DIR" || exit 1

# 激活虚拟环境
if [ ! -d "$VENV_DIR" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv "$VENV_DIR"
fi

echo "激活虚拟环境..."
source "$VENV_DIR/bin/activate"

# 升级 pip 和安装依赖
echo "升级 pip..."
pip install --upgrade pip -q

echo "安装/更新 Python 依赖..."
pip install -r requirements.txt -q

echo "✅ 后端依赖安装完成"
deactivate

# ============ 2. 前端部署 ============
echo ""
echo "========== 步骤 2: 前端部署 =========="
cd "$REACT_DIR" || exit 1

# 安装依赖
echo "安装/更新 Node.js 依赖..."
npm install --silent

# 创建生产环境配置文件
echo "创建生产环境配置文件..."
cat > .env.production << EOF
VITE_BACKEND_URL=http://127.0.0.1:57988
VITE_JAAZ_BASE_API_URL=
EOF

# 构建前端
echo "构建前端项目..."
npm run build

echo "✅ 前端构建完成"

# ============ 3. 重启服务 ============
echo ""
echo "========== 步骤 3: 重启服务 =========="

# 重启后端服务
echo "重启后端服务..."
sudo systemctl restart psd-backend
sleep 2

# 重启前端服务
echo "重启前端服务..."
sudo systemctl restart psd-frontend
sleep 2

# ============ 4. 检查服务状态 ============
echo ""
echo "========== 步骤 4: 检查服务状态 =========="

echo "后端服务状态:"
sudo systemctl status psd-backend --no-pager | head -5 || true

echo ""
echo "前端服务状态:"
sudo systemctl status psd-frontend --no-pager | head -5 || true

# ============ 完成 ============
echo ""
echo "=========================================="
echo "✅ 重新部署完成！"
echo "时间: $(date)"
echo ""
echo "服务状态:"
echo "  - 后端: http://localhost:57988"
echo "  - 前端: http://localhost:3004"
echo ""
echo "查看服务日志:"
echo "  sudo journalctl -u psd-backend -f"
echo "  sudo journalctl -u psd-frontend -f"
echo "=========================================="

