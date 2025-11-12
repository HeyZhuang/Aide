# ========================================
# Gemini 图片生成测试脚本（带实时监控）
# ========================================
# 功能：通过 /api/chat 接口调用 Gemini 生成图片，并实时监控进度
# ========================================

# ========== 配置参数 ==========
$BASE_URL = "http://localhost:3004"
$CANVAS_ID = "test-canvas-$(Get-Random)"
$SESSION_ID = "test-session-$(Get-Random)"

# ========== 测试用例 ==========
$TEST_PROMPT = "一只可爱的橙色小猫，坐在窗台上看着窗外的风景，温馨的光线，高质量摄影"
$ASPECT_RATIO = "16:9"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 开始测试 Gemini 图片生成（带监控）" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📍 后端地址: $BASE_URL" -ForegroundColor Yellow
Write-Host "🎨 画布 ID: $CANVAS_ID" -ForegroundColor Yellow
Write-Host "💬 会话 ID: $SESSION_ID" -ForegroundColor Yellow
Write-Host "📝 提示词: $TEST_PROMPT" -ForegroundColor Yellow
Write-Host ""

# ========== 步骤 1: 获取工具 ==========
Write-Host "🔍 [1/3] 获取可用的图片生成工具..." -ForegroundColor Magenta
try {
    $toolsResponse = Invoke-RestMethod -Uri "$BASE_URL/api/list_tools" -Method GET
    $geminiTools = $toolsResponse | Where-Object { $_.provider -eq "gemini" -and $_.type -eq "image" }

    if ($geminiTools.Count -eq 0) {
        Write-Host "❌ 未找到 Gemini 图片生成工具" -ForegroundColor Red
        exit 1
    }

    $selectedTool = $geminiTools[0]
    Write-Host "✅ 选择工具: $($selectedTool.id)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ 获取工具列表失败: $_" -ForegroundColor Red
    exit 1
}

# ========== 步骤 2: 构建请求 ==========
Write-Host "📦 [2/3] 发送生成请求..." -ForegroundColor Magenta

$requestBody = @{
    messages = @(
        @{
            role = "user"
            content = $TEST_PROMPT
        }
    )
    canvas_id = $CANVAS_ID
    session_id = $SESSION_ID
    text_model = @{
        provider = "gemini"
        model = "gemini-2.5-flash"
        url = "https://generativelanguage.googleapis.com/v1beta"
        type = "text"
    }
    tool_list = @(
        @{
            provider = $selectedTool.provider
            id = $selectedTool.id
            display_name = $selectedTool.display_name
            type = $selectedTool.type
        }
    )
    system_prompt = $null
} | ConvertTo-Json -Depth 10

# ========== 步骤 3: 发送请求（后台运行） ==========
Write-Host "⏳ 正在调用 API（后台运行）..." -ForegroundColor Yellow
Write-Host ""

# 创建后台任务
$job = Start-Job -ScriptBlock {
    param($url, $body)
    try {
        $response = Invoke-RestMethod `
            -Uri $url `
            -Method POST `
            -ContentType "application/json; charset=utf-8" `
            -Body $body `
            -TimeoutSec 300
        return @{ success = $true; data = $response }
    } catch {
        return @{ success = $false; error = $_.Exception.Message }
    }
} -ArgumentList "$BASE_URL/api/chat", $requestBody

Write-Host "🔄 后台任务已启动，开始监控进度..." -ForegroundColor Cyan
Write-Host ""

# ========== 步骤 4: 实时监控 ==========
$startTime = Get-Date
$checkInterval = 3  # 每 3 秒检查一次
$maxWaitTime = 300  # 最多等待 5 分钟

$spinnerChars = @('|', '/', '-', '\')
$spinnerIndex = 0

while ($job.State -eq 'Running') {
    $elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 0)

    # 显示动画进度
    $spinner = $spinnerChars[$spinnerIndex % 4]
    Write-Host "`r⏱️  已等待 ${elapsed} 秒 $spinner " -NoNewline -ForegroundColor Yellow
    $spinnerIndex++

    # 每隔一段时间尝试查询会话历史
    if ($elapsed % 10 -eq 0 -and $elapsed -gt 0) {
        try {
            $history = Invoke-RestMethod -Uri "$BASE_URL/api/chat_session/$SESSION_ID" -Method GET -ErrorAction SilentlyContinue
            if ($history -and $history.Count -gt 0) {
                $lastMsg = $history[-1] | ConvertFrom-Json
                if ($lastMsg.role -eq "assistant" -and $lastMsg.content) {
                    Write-Host ""
                    Write-Host "   💬 AI 响应: $($lastMsg.content.Substring(0, [Math]::Min(50, $lastMsg.content.Length)))..." -ForegroundColor Gray
                }
            }
        } catch {
            # 忽略查询错误
        }
    }

    # 超时检查
    if ($elapsed -ge $maxWaitTime) {
        Write-Host ""
        Write-Host "⚠️  等待超时（${maxWaitTime} 秒），停止任务" -ForegroundColor Yellow
        Stop-Job -Job $job
        Remove-Job -Job $job
        exit 1
    }

    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host ""

# ========== 步骤 5: 获取结果 ==========
$result = Receive-Job -Job $job
Remove-Job -Job $job

if ($result.success) {
    Write-Host "✅ API 调用成功！" -ForegroundColor Green
    Write-Host ""

    if ($result.data.status -eq "done") {
        Write-Host "🎉 图片生成任务已完成" -ForegroundColor Green
    }
} else {
    Write-Host "❌ API 调用失败: $($result.error)" -ForegroundColor Red
}

Write-Host ""

# ========== 步骤 6: 查询生成结果 ==========
Write-Host "📊 [3/3] 查询生成结果..." -ForegroundColor Magenta
Write-Host "⏳ 等待 5 秒后查询..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $historyResponse = Invoke-RestMethod -Uri "$BASE_URL/api/chat_session/$SESSION_ID" -Method GET

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "📋 会话历史记录" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    $imageFound = $false

    $historyResponse | ForEach-Object {
        $msg = $_ | ConvertFrom-Json
        Write-Host ""
        Write-Host "角色: $($msg.role)" -ForegroundColor Yellow

        if ($msg.role -eq "tool") {
            Write-Host "工具结果: $($msg.content)" -ForegroundColor Green

            # 提取图片 URL
            if ($msg.content -match "http://[^\)]+") {
                $imageUrl = $matches[0]
                $imageFound = $true
                Write-Host ""
                Write-Host "========================================" -ForegroundColor Cyan
                Write-Host "🎉 图片生成成功！" -ForegroundColor Green
                Write-Host "========================================" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "🖼️  图片 URL:" -ForegroundColor Cyan
                Write-Host "   $imageUrl" -ForegroundColor White
                Write-Host ""
                Write-Host "📥 在浏览器中打开查看:" -ForegroundColor Yellow
                Write-Host "   $imageUrl" -ForegroundColor Cyan
                Write-Host ""

                # 尝试打开图片
                try {
                    Start-Process $imageUrl
                    Write-Host "✅ 已在浏览器中打开图片" -ForegroundColor Green
                } catch {
                    Write-Host "⚠️  无法自动打开浏览器，请手动访问上方 URL" -ForegroundColor Yellow
                }
            }
        } elseif ($msg.tool_calls) {
            Write-Host "工具调用: $($msg.tool_calls.Count) 个" -ForegroundColor Magenta
            $msg.tool_calls | ForEach-Object {
                Write-Host "  - 函数: $($_.function.name)" -ForegroundColor Gray
                $args = $_.function.arguments | ConvertFrom-Json
                if ($args.prompt) {
                    Write-Host "    提示词: $($args.prompt.Substring(0, [Math]::Min(50, $args.prompt.Length)))..." -ForegroundColor Gray
                }
            }
        } elseif ($msg.content) {
            Write-Host "内容: $($msg.content)" -ForegroundColor Gray
        }
    }

    Write-Host ""

    if (-not $imageFound) {
        Write-Host "⚠️  未在历史记录中找到生成的图片" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "可能的原因:" -ForegroundColor Yellow
        Write-Host "  1. 图片仍在生成中，请稍后再次运行查询" -ForegroundColor Gray
        Write-Host "  2. 生成过程中出现错误，请检查后端日志" -ForegroundColor Gray
        Write-Host "  3. Gemini API 调用失败（API Key、网络等问题）" -ForegroundColor Gray
    }

} catch {
    Write-Host "❌ 查询会话历史失败: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 测试完成" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示:" -ForegroundColor Yellow
Write-Host "  - 如果图片未生成，请检查后端日志:" -ForegroundColor Gray
Write-Host "    查看 server/user_data/logs/ 目录" -ForegroundColor Gray
Write-Host "  - 生成的图片保存在:" -ForegroundColor Gray
Write-Host "    server/user_data/files/" -ForegroundColor Gray
