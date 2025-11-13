#!/bin/bash
# 快速修复字体功能脚本

echo "=========================================="
echo "字体功能快速修复脚本"
echo "=========================================="

# 1. 检查服务器进程
echo ""
echo "1. 检查服务器是否运行..."
if pgrep -f "main.py" > /dev/null; then
    echo "✅ 服务器正在运行"
    SERVER_PID=$(pgrep -f "main.py" | head -1)
    echo "   进程ID: $SERVER_PID"
    echo ""
    echo "⚠️  需要重启服务器以加载新的字体路由配置"
    echo "   执行: pkill -f main.py 然后重新启动服务器"
else
    echo "❌ 服务器未运行"
    echo "   请启动服务器"
fi

# 2. 检查前端构建
echo ""
echo "2. 检查前端构建..."
REACT_DIST="/home/ubuntu/cckz/psd-canvas-jaaz/react/dist"
if [ -d "$REACT_DIST" ]; then
    BUILD_TIME=$(stat -c %y "$REACT_DIST" 2>/dev/null || echo "未知")
    echo "✅ 前端构建目录存在: $REACT_DIST"
    echo "   构建时间: $BUILD_TIME"
    echo ""
    echo "⚠️  如果最近修改了代码，请重新构建:"
    echo "   cd /home/ubuntu/cckz/psd-canvas-jaaz/react"
    echo "   npm run build"
else
    echo "❌ 前端构建目录不存在"
    echo "   请执行: cd /home/ubuntu/cckz/psd-canvas-jaaz/react && npm run build"
fi

# 3. 测试字体文件访问
echo ""
echo "3. 测试字体文件访问..."
if pgrep -f "main.py" > /dev/null; then
    echo "测试字体文件URL..."
    TEST_URL="http://localhost:3004/fonts/CustomWebFont.woff2"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TEST_URL" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ 字体文件可以访问 (HTTP $HTTP_CODE)"
    elif [ "$HTTP_CODE" = "404" ]; then
        echo "❌ 字体文件返回 404"
        echo "   可能原因："
        echo "   - 服务器未重启"
        echo "   - 静态文件路由未正确配置"
        echo "   - 字体文件路径不正确"
    else
        echo "⚠️  无法测试 (HTTP $HTTP_CODE)"
        echo "   服务器可能不在 localhost:3004 运行"
    fi
else
    echo "⚠️  跳过测试（服务器未运行）"
fi

# 4. 检查浏览器缓存提示
echo ""
echo "4. 浏览器缓存清理提示..."
echo "   在浏览器中："
echo "   - 按 Ctrl+Shift+Delete 清除缓存"
echo "   - 或按 Ctrl+Shift+R (Windows/Linux) 硬刷新"
echo "   - 或按 Cmd+Shift+R (Mac) 硬刷新"

# 5. 检查清单
echo ""
echo "=========================================="
echo "修复检查清单："
echo "=========================================="
echo ""
echo "□ 1. 重启服务器（如果已修改 server/main.py）"
echo "□ 2. 重新构建前端（如果已修改 React 代码）"
echo "□ 3. 清除浏览器缓存"
echo "□ 4. 检查浏览器控制台（F12 -> Console）"
echo "□ 5. 检查网络请求（F12 -> Network，查找 /fonts/ 请求）"
echo "□ 6. 确认右侧边栏显示，点击 Assets -> Fonts 标签"
echo ""
echo "如果问题仍然存在，请查看 DEBUG_FONTS.md 获取详细调试信息"
echo ""





