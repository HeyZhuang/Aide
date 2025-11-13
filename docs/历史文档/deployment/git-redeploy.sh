#!/bin/bash

# ============ Git 拉取代码并重新部署脚本 ============
# 用于从 GitHub 拉取最新代码并重新部署到服务器
# 使用方法: bash docs/历史文档/deployment/git-redeploy.sh

set -e  # 遇到错误立即退出

PROJECT_DIR="/home/ubuntu/psd-canvas-jaaz"
SERVER_DIR="$PROJECT_DIR/server"
REACT_DIR="$PROJECT_DIR/react"
VENV_DIR="$SERVER_DIR/venv"

echo "=========================================="
echo "🚀 Git 拉取代码并重新部署"
echo "时间: $(date)"
echo "=========================================="

# ============ 0. 进入项目目录 ============
echo ""
echo "========== 步骤 0: 检查项目目录 =========="
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 错误：项目目录不存在: $PROJECT_DIR"
    echo "请先克隆项目到服务器:"
    echo "  cd /home/ubuntu"
    echo "  git clone <your-repo-url> psd-canvas-jaaz"
    exit 1
fi

cd "$PROJECT_DIR" || exit 1
echo "✅ 项目目录: $PROJECT_DIR"

# ============ 1. Git 拉取最新代码 ============
echo ""
echo "========== 步骤 1: 拉取最新代码 =========="

# 显示当前分支
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 当前分支: $CURRENT_BRANCH"

# 显示拉取前的最新提交
echo "📝 拉取前的最新提交:"
git log -1 --oneline

# 拉取最新代码
echo ""
echo "⬇️  正在从 GitHub 拉取最新代码..."
git pull origin $CURRENT_BRANCH || {
    echo "❌ Git 拉取失败！"
    echo "可能的原因:"
    echo "  1. 网络问题"
    echo "  2. 本地有未提交的修改"
    echo "  3. 分支冲突"
    echo ""
    echo "建议操作:"
    echo "  - 检查本地修改: git status"
    echo "  - 暂存本地修改: git stash"
    echo "  - 然后重新运行此脚本"
    exit 1
}

# 显示拉取后的最新提交
echo ""
echo "✅ 代码拉取成功！"
echo "📝 拉取后的最新提交:"
git log -1 --oneline

# ============ 2. 后端部署 ============
echo ""
echo "========== 步骤 2: 后端部署 =========="
cd "$SERVER_DIR" || exit 1

# 激活虚拟环境
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 创建 Python 虚拟环境..."
    python3 -m venv "$VENV_DIR"
fi

echo "🔧 激活虚拟环境..."
source "$VENV_DIR/bin/activate"

# 升级 pip 和安装依赖
echo "⬆️  升级 pip..."
pip install --upgrade pip -q

echo "📥 安装/更新 Python 依赖..."
pip install -r requirements.txt -q

echo "✅ 后端依赖安装完成"
deactivate

# ============ 3. 前端部署 ============
echo ""
echo "========== 步骤 3: 前端部署 =========="
cd "$REACT_DIR" || exit 1

# 检查并更新 Node.js 依赖
echo "📥 检查 Node.js 依赖更新..."
if [ -f "package-lock.json" ]; then
    # 使用 npm ci 以确保依赖与 package-lock.json 一致
    npm ci --silent || npm install --silent
else
    npm install --silent
fi

# 创建生产环境配置文件
echo "📝 创建生产环境配置文件..."
cat > .env.production << EOF
VITE_BACKEND_URL=http://127.0.0.1:57988
VITE_JAAZ_BASE_API_URL=
EOF

# 构建前端
echo "🔨 构建前端项目..."
npm run build || {
    echo "❌ 前端构建失败！"
    echo "请检查构建错误日志"
    exit 1
}

echo "✅ 前端构建完成"

# ============ 4. 重启服务 ============
echo ""
echo "========== 步骤 4: 重启服务 =========="

# 重启后端服务
echo "🔄 重启后端服务..."
sudo systemctl restart psd-backend
sleep 2

# 检查后端服务状态
if sudo systemctl is-active --quiet psd-backend; then
    echo "✅ 后端服务启动成功"
else
    echo "❌ 后端服务启动失败！"
    echo "查看日志: sudo journalctl -u psd-backend -n 50"
fi

# 重启前端服务
echo "🔄 重启前端服务..."
sudo systemctl restart psd-frontend
sleep 2

# 检查前端服务状态
if sudo systemctl is-active --quiet psd-frontend; then
    echo "✅ 前端服务启动成功"
else
    echo "❌ 前端服务启动失败！"
    echo "查看日志: sudo journalctl -u psd-frontend -n 50"
fi

# ============ 5. 检查服务状态 ============
echo ""
echo "========== 步骤 5: 服务状态检查 =========="

echo "🔍 后端服务状态:"
sudo systemctl status psd-backend --no-pager | head -5 || true

echo ""
echo "🔍 前端服务状态:"
sudo systemctl status psd-frontend --no-pager | head -5 || true

# ============ 完成 ============
echo ""
echo "=========================================="
echo "✅ Git 拉取并重新部署完成！"
echo "时间: $(date)"
echo ""
echo "📊 部署信息:"
echo "  - 分支: $CURRENT_BRANCH"
echo "  - 最新提交: $(git log -1 --oneline)"
echo ""
echo "🌐 服务地址:"
echo "  - 后端: http://localhost:57988"
echo "  - 前端: http://localhost:3004"
echo ""
echo "📋 常用命令:"
echo "  - 查看后端日志: sudo journalctl -u psd-backend -f"
echo "  - 查看前端日志: sudo journalctl -u psd-frontend -f"
echo "  - 重启后端: sudo systemctl restart psd-backend"
echo "  - 重启前端: sudo systemctl restart psd-frontend"
echo "=========================================="
