# 刷新页面 JSON 错误修复

## 问题
刷新页面后出现错误：`SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`

## 原因分析

这个错误表明某些 API 请求返回了 HTML（前端页面的 index.html）而不是预期的 JSON 数据。

可能的原因：
1. Nginx 配置中错误地覆盖了 Content-Type 头
2. 前端服务器的 SPA 路由配置问题
3. API 请求路径在某些情况下被错误路由

## 已实施的修复

### 1. 修复 Nginx Content-Type 覆盖
移除了强制设置 `Content-Type: application/json` 的配置，让后端正确设置 Content-Type。

**修复前：**
```nginx
add_header Content-Type "application/json" always;
```

**修复后：**
```nginx
# Don't override Content-Type - let backend set it correctly
```

### 2. 配置前端服务器为 SPA 模式
更新了 `psd-frontend.service`，添加 `--single` 参数：

```bash
ExecStart=/usr/bin/npx --yes serve -s dist -l tcp://0.0.0.0:3004 --single
```

`--single` 参数确保所有非文件请求都返回 `index.html`，这是 SPA 应用的标准行为。

### 3. 确保 API 路由优先级
Nginx 配置中 `/api/` location 块位于 `/` location 块之前，确保所有 API 请求都正确路由到后端。

## 验证

测试 API 响应：
```bash
# 测试 canvas API
curl -I http://54.189.143.120/api/canvas/default

# 应该返回正确的 Content-Type: application/json
```

## 配置要点

1. **Nginx location 顺序**：`/api/` 必须在 `/` 之前
2. **Content-Type 头**：不要强制覆盖，让后端设置
3. **前端 SPA 模式**：使用 `--single` 参数
4. **错误处理**：前端代码已有适当的错误处理

## 状态

✅ **已完成**：
- Nginx Content-Type 覆盖已移除
- 前端服务器已配置 SPA 模式
- API 路由优先级已确保
- 配置已重新加载

## 如果问题仍然存在

1. 检查浏览器控制台，查看具体哪个 API 请求返回了 HTML
2. 检查 Nginx 日志：`sudo tail -f /var/log/nginx/error.log`
3. 检查后端日志：`sudo journalctl -u psd-backend -f`
4. 确保所有 `/api/` 开头的请求都被正确代理到后端

