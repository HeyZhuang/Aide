#!/bin/bash

echo "=========================================="
echo "PSD Canvas 数据库信息查看工具"
echo "=========================================="

# 检查数据库连接
echo "🔍 检查数据库连接状态..."
if sudo -u postgres psql -d psd_canvas -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ 数据库连接正常"
else
    echo "❌ 数据库连接失败"
    exit 1
fi

echo ""
echo "📊 数据库表结构："
echo "----------------------------------------"
sudo -u postgres psql -d psd_canvas -c "\dt"

echo ""
echo "👥 用户统计："
echo "----------------------------------------"
sudo -u postgres psql -d psd_canvas -c "
SELECT 
    COUNT(*) as 用户总数,
    COUNT(CASE WHEN provider = 'google' THEN 1 END) as Google用户,
    COUNT(CASE WHEN provider = 'local' THEN 1 END) as 本地用户
FROM users;"

echo ""
echo "🎨 画布统计："
echo "----------------------------------------"
sudo -u postgres psql -d psd_canvas -c "
SELECT 
    COUNT(*) as 画布总数,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as 有用户画布,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as 匿名画布
FROM canvases;"

echo ""
echo "💬 聊天会话统计："
echo "----------------------------------------"
sudo -u postgres psql -d psd_canvas -c "
SELECT 
    COUNT(*) as 会话总数,
    COUNT(DISTINCT canvas_id) as 关联画布数
FROM chat_sessions;"

echo ""
echo "📝 最近的画布："
echo "----------------------------------------"
sudo -u postgres psql -d psd_canvas -c "
SELECT 
    LEFT(id, 8) || '...' as 画布ID,
    name as 画布名称,
    CASE 
        WHEN user_id IS NULL THEN '匿名'
        ELSE LEFT(user_id, 8) || '...'
    END as 用户ID,
    created_at as 创建时间
FROM canvases 
ORDER BY created_at DESC 
LIMIT 5;"

echo ""
echo "🔐 认证令牌统计："
echo "----------------------------------------"
sudo -u postgres psql -d psd_canvas -c "
SELECT 
    COUNT(*) as 活跃令牌数,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as 有效令牌,
    COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as 过期令牌
FROM auth_tokens;"

echo ""
echo "🤖 ComfyUI 工作流统计："
echo "----------------------------------------"
sudo -u postgres psql -d psd_canvas -c "
SELECT 
    COUNT(*) as 工作流总数
FROM comfy_workflows;"

echo ""
echo "=========================================="
echo "查看完成！"
echo ""
echo "💡 其他有用的命令："
echo "1. 连接数据库: sudo -u postgres psql -d psd_canvas"
echo "2. 查看表结构: \\d 表名"
echo "3. 退出数据库: \\q"
echo "=========================================="
