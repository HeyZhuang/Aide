#!/bin/bash

# ============ 快速部署脚本 ============
# 用途：从GitHub拉取最新代码并快速部署上线
# 使用方法: ./quick-deploy.sh
# ======================================

set -e  # 遇到错误立即退出

PROJECT_DIR="/home/ubuntu/cckz/psd-canvas-jaaz"

echo "=========================================="
echo "🚀 开始快速部署流程"
echo "=========================================="

# 进入项目目录
cd "$PROJECT_DIR" || { echo "❌ 错误：无法进入目录 $PROJECT_DIR"; exit 1; }

# 第一步：拉取最新代码
echo ""
echo "========== 第一步：更新代码 =========="
echo "📥 拉取GitHub最新代码..."
if git pull; then
    echo "✅ 代码更新成功"
    git log -1 --oneline
else
    echo "⚠️  警告：Git拉取失败，继续使用当前代码..."
fi

# 第二步：运行部署脚本
echo ""
echo "========== 第二步：执行部署 =========="
if [ -f "deploy.sh" ]; then
    chmod +x deploy.sh
    ./deploy.sh
else
    echo "❌ 错误：未找到 deploy.sh 文件"
    exit 1
fi

# 第三步：重启服务
echo ""
echo "========== 第三步：重启服务 =========="
echo "🔄 重启后端服务..."
if sudo systemctl restart psd-backend; then
    echo "✅ 后端服务重启成功"
else
    echo "❌ 后端服务重启失败"
    exit 1
fi

echo "🔄 重启前端服务..."
if sudo systemctl restart psd-frontend; then
    echo "✅ 前端服务重启成功"
else
    echo "❌ 前端服务重启失败"
    exit 1
fi

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 第四步：验证部署
echo ""
echo "========== 第四步：验证部署 =========="
echo "📊 检查服务状态..."

# 检查后端服务
if systemctl is-active --quiet psd-backend; then
    echo "✅ 后端服务运行中"
else
    echo "❌ 后端服务未运行"
    echo "查看日志："
    sudo journalctl -u psd-backend -n 20 --no-pager
fi

# 检查前端服务
if systemctl is-active --quiet psd-frontend; then
    echo "✅ 前端服务运行中"
else
    echo "❌ 前端服务未运行"
    echo "查看日志："
    sudo journalctl -u psd-frontend -n 20 --no-pager
fi

# 检查端口监听
echo ""
echo "📡 检查端口监听..."
if netstat -tuln 2>/dev/null | grep -q ":57988"; then
    echo "✅ 后端端口 57988 正在监听"
else
    echo "⚠️  后端端口 57988 未监听"
fi

if netstat -tuln 2>/dev/null | grep -q ":3004"; then
    echo "✅ 前端端口 3004 正在监听"
else
    echo "⚠️  前端端口 3004 未监听"
fi

# 测试API
echo ""
echo "🧪 测试后端API..."
if curl -s -f -o /dev/null http://127.0.0.1:57988/api/health 2>/dev/null; then
    echo "✅ 后端API响应正常"
else
    echo "⚠️  后端API无响应（可能还在启动中）"
fi

# 完成
echo ""
echo "=========================================="
echo "✅ 部署流程完成！"
echo ""
echo "访问地址:"
echo "  - 前端: http://54.189.143.120/"
echo "  - 后端API: http://54.189.143.120:57988/"
echo ""
echo "查看日志命令:"
echo "  sudo journalctl -u psd-backend -f"
echo "  sudo journalctl -u psd-frontend -f"
echo "=========================================="

