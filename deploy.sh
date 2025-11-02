#!/bin/bash

# ============ 部署配置 ============
PROJECT_DIR="/home/ubuntu/cckz/psd-canvas-jaaz"
SERVER_DIR="$PROJECT_DIR/server"
REACT_DIR="$PROJECT_DIR/react"
VENV_DIR="$SERVER_DIR/venv"
FRONTEND_PORT=3004
BACKEND_PORT=57988
SERVER_IP="54.189.143.120"
# ================================

set -e  # 遇到错误立即退出

echo "=========================================="
echo "开始部署项目"
echo "项目目录: $PROJECT_DIR"
echo "前端端口: $FRONTEND_PORT"
echo "后端端口: $BACKEND_PORT"
echo "=========================================="

# 进入项目目录
cd "$PROJECT_DIR" || { echo "❌ 错误：无法进入目录 $PROJECT_DIR"; exit 1; }

# ============ 后端部署 ============
echo ""
echo "========== 后端部署 =========="
cd "$SERVER_DIR" || { echo "❌ 错误：无法进入服务器目录"; exit 1; }

# 创建虚拟环境（如果不存在）
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 创建 Python 虚拟环境..."
    python3 -m venv "$VENV_DIR" || { echo "❌ 创建虚拟环境失败"; exit 1; }
else
    echo "✅ 虚拟环境已存在"
fi

# 激活虚拟环境
echo "🔧 激活虚拟环境..."
source "$VENV_DIR/bin/activate" || { echo "❌ 激活虚拟环境失败"; exit 1; }

# 升级 pip
echo "⬆️  升级 pip..."
pip install --upgrade pip > /dev/null 2>&1

# 安装依赖
if [ -f "requirements.txt" ]; then
    echo "📥 安装 Python 依赖..."
    pip install -r requirements.txt > /dev/null 2>&1 || { echo "❌ 安装依赖失败"; exit 1; }
    echo "✅ Python 依赖安装完成"
else
    echo "⚠️  警告：未找到 requirements.txt"
fi

deactivate

# ============ 前端部署 ============
echo ""
echo "========== 前端部署 =========="
cd "$REACT_DIR" || { echo "❌ 错误：无法进入前端目录"; exit 1; }

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "📥 安装 Node.js 依赖..."
    npm install || { echo "❌ 安装依赖失败"; exit 1; }
    echo "✅ Node.js 依赖安装完成"
else
    echo "✅ Node.js 依赖已存在，跳过安装"
fi

# 创建 .env.production 文件
echo "📝 创建生产环境配置文件..."
cat > .env.production << EOF
VITE_BACKEND_URL=http://${SERVER_IP}:${BACKEND_PORT}
VITE_JAAZ_BASE_API_URL=http://${SERVER_IP}:${BACKEND_PORT}
EOF
echo "✅ 环境配置文件已创建/更新"

# 构建前端
echo "🔨 构建前端项目..."
# 如果正常构建失败，尝试跳过类型检查构建（仅用于部署）
if ! npm run build 2>&1 | tee /tmp/build.log; then
    echo "⚠️  标准构建失败，尝试跳过类型检查构建..."
    cd "$REACT_DIR"
    # 直接使用 vite build，跳过 tsc 类型检查
    npx vite build || { 
        echo "❌ 前端构建失败，请查看错误信息："
        cat /tmp/build.log
        exit 1
    }
fi
echo "✅ 前端构建完成"

cd "$PROJECT_DIR"

# ============ 完成 ============
echo ""
echo "=========================================="
echo "✅ 部署准备完成！"
echo ""
echo "下一步操作："
echo "1. 启动后端服务："
echo "   sudo systemctl start psd-backend"
echo ""
echo "2. 启动前端服务："
echo "   sudo systemctl start psd-frontend"
echo ""
echo "3. 查看服务状态："
echo "   sudo systemctl status psd-backend"
echo "   sudo systemctl status psd-frontend"
echo ""
echo "4. 设置开机自启："
echo "   sudo systemctl enable psd-backend"
echo "   sudo systemctl enable psd-frontend"
echo "=========================================="

