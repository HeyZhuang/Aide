# ========================================
# 带代理的后端启动脚本
# ========================================
# 用途：在需要代理访问 Google API 的环境中启动后端
# ========================================

param(
    [string]$ProxyHost = "127.0.0.1",
    [string]$ProxyPort = "7890",
    [switch]$NoProxy
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 启动后端服务（带代理支持）" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($NoProxy) {
    Write-Host "⚠️  不使用代理模式" -ForegroundColor Yellow
} else {
    $ProxyUrl = "http://${ProxyHost}:${ProxyPort}"

    Write-Host "🌐 配置代理设置:" -ForegroundColor Magenta
    Write-Host "   HTTP_PROXY: $ProxyUrl" -ForegroundColor Gray
    Write-Host "   HTTPS_PROXY: $ProxyUrl" -ForegroundColor Gray
    Write-Host ""

    # 设置环境变量
    $env:HTTP_PROXY = $ProxyUrl
    $env:HTTPS_PROXY = $ProxyUrl

    # 测试代理连接
    Write-Host "🔍 测试代理连接..." -ForegroundColor Magenta
    try {
        $testResult = Invoke-WebRequest -Uri "http://www.google.com" -Proxy $ProxyUrl -TimeoutSec 5 -UseBasicParsing
        if ($testResult.StatusCode -eq 200) {
            Write-Host "✅ 代理连接正常" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  代理连接测试失败: $_" -ForegroundColor Yellow
        Write-Host "   后端可能无法访问 Google API" -ForegroundColor Gray
        Write-Host ""
        $continue = Read-Host "是否继续启动后端? (y/n)"
        if ($continue -ne 'y') {
            exit 0
        }
    }
}

Write-Host ""
Write-Host "📂 切换到 server 目录..." -ForegroundColor Magenta
Set-Location -Path "server"

Write-Host "🐍 启动 Python 后端服务..." -ForegroundColor Magenta
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 启动 Python 服务
python main.py

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "👋 后端服务已停止" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
