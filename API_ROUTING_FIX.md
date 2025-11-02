# API 路由修复说明

## 问题
刷新页面后出现错误：`SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`

这个错误表明某些 API 请求返回了 HTML（前端页面的 index.html）而不是 JSON 数据。

## 原因分析

1. **Nginx 路由优先级问题**：虽然 `/api/` location 块在 `/` 之前，但在某些情况下，请求可能仍被路由到前端服务器
2. **SPA 路由处理**：前端服务器（serve）需要配置为 SPA 模式，以便正确处理客户端路由
3. **Content-Type 设置**：确保 API 响应返回正确的 Content-Type

## 解决方案

### 1. 优化 Nginx 配置

- ✅ 确保 `/api/` location 块在所有其他 location 之前（已有）
- ✅ 在 `/api/` location 中添加明确的 Content-Type 头
- ✅ 移除不适合 proxy_pass 的 `try_files` 指令

### 2. 配置前端服务器为 SPA 模式

更新 `psd-frontend.service` 文件，添加 `--single` 参数：

```bash
ExecStart=/usr/bin/npx --yes serve -s dist -l tcp://0.0.0.0:3004 --single
```

`--single` 参数让 serve 服务器将所有非文件请求都返回 `index.html`，这是 SPA 应用的标准行为。

### 3. 配置要点

#### Nginx 配置顺序（重要！）
```nginx
location /api/ {          # 必须在最前面
    # 代理到后端
}

location /socket.io/ {    # WebSocket 连接
    # 代理到后端
}

location / {              # 最后处理，匹配所有其他请求
    # 代理到前端
}
```

#### API 请求处理
- 所有 `/api/` 开头的请求必须被代理到后端（端口 57988）
- 确保不会意外路由到前端服务器
- 设置正确的 Content-Type 响应头

### 4. 验证修复

测试 API 端点：

```bash
# 测试 canvas 列表 API
curl http://54.189.143.120/api/canvas/list

# 应该返回 JSON，而不是 HTML
```

### 5. 常见问题

#### Q: 为什么刷新页面时会出现这个问题？
A: 当用户刷新 `/canvas/default` 这样的路由时，浏览器会向服务器请求该路径。如果前端服务器没有正确配置 SPA 模式，可能会返回错误页面，导致某些 API 调用也被错误处理。

#### Q: `try_files` 为什么不适用于 proxy_pass？
A: `try_files` 是 Nginx 用于静态文件服务的指令，不适用于 `proxy_pass`。对于代理场景，应该让后端或前端服务器处理路由逻辑。

### 6. 状态

✅ **已完成**：
- Nginx 配置已优化
- 前端服务器已配置为 SPA 模式（`--single` 参数）
- API 路由优先级已确保
- Content-Type 头已添加

## 后续建议

1. 监控 API 响应：确保所有 `/api/` 请求都返回 JSON
2. 检查浏览器控制台：查看是否还有其他路由问题
3. 前端错误处理：增强前端代码的错误处理，优雅处理 API 错误

