#!/bin/bash

echo "=========================================="
echo "PSD Canvas 数据库快速查看"
echo "=========================================="

# 基本统计
echo "📊 数据库统计："
sudo -u postgres psql -d psd_canvas -t -c "
SELECT 
    '用户数量: ' || COUNT(*) 
FROM users
UNION ALL
SELECT 
    '画布数量: ' || COUNT(*) 
FROM canvases
UNION ALL
SELECT 
    '聊天会话: ' || COUNT(*) 
FROM chat_sessions
UNION ALL
SELECT 
    '工作流数: ' || COUNT(*) 
FROM comfy_workflows;"

echo ""
echo "🎨 最新画布："
sudo -u postgres psql -d psd_canvas -t -c "
SELECT 
    '- ' || name || ' (ID: ' || LEFT(id::text, 8) || '...)'
FROM canvases 
ORDER BY created_at DESC 
LIMIT 3;"

echo ""
echo "=========================================="
echo "💡 查看更多信息的命令："
echo "sudo -u postgres psql -d psd_canvas"
echo "=========================================="
