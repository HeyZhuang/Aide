# API 路由完整修复

## 问题描述
除了外部 API `https://api-gateway.umami.dev/api/send` 请求外，所有其他 API 请求都返回了 HTML 而不是 JSON。

## 根本原因

1. **Location 匹配优先级问题**：虽然 `/api/` location 块在 `/` 之前，但 Nginx 可能在某些情况下仍然匹配到更通用的 location 块
2. **proxy_pass 配置**：需要确保正确转发请求到后端
3. **Location 匹配类型**：需要使用更精确的匹配类型（`^~`）来确保 API 请求优先级

## 解决方案

### 1. 使用 `^~` 前缀匹配
使用 `location ^~ /api/` 而不是 `location /api/`，`^~` 表示：
- 如果匹配到，立即停止搜索其他 location 块
- 优先级高于普通前缀匹配和正则匹配

### 2. 改进 proxy_pass 配置
```nginx
location ^~ /api/ {
    proxy_pass http://127.0.0.1:57988;
    # 使用 127.0.0.1 而不是 localhost 可以避免 DNS 解析问题
}
```

### 3. 添加 WebSocket 连接映射
```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
```

### 4. 增强请求头设置
添加更多的 proxy_set_header 以确保请求信息正确传递：
- `X-Forwarded-Host`
- `X-Forwarded-Port`

### 5. 改进缓存控制
```nginx
proxy_cache off;
proxy_no_cache 1;
proxy_cache_bypass 1;
```

### 6. CORS 配置
添加 CORS 头以支持跨域请求：
```nginx
add_header Access-Control-Allow-Origin "*" always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
```

## 配置顺序

正确的配置顺序应该是：

1. `map` 指令（在 server 块内，location 块外）
2. `location ^~ /api/` （API 路由，最高优先级）
3. `location /api/psd/templates/` （特定的 API 子路径）
4. `location /socket.io/` （WebSocket 路由）
5. `location /` （前端路由，最低优先级）

## 验证

测试所有 API 端点：

```bash
# 测试 canvas API
curl http://54.189.143.120/api/canvas/list

# 测试 templates API  
curl http://54.189.143.120/api/templates/categories

# 测试 PSD templates API
curl http://54.189.143.120/api/psd/templates/list
```

所有请求都应该返回 JSON，而不是 HTML。

## 注意事项

1. **外部 API**：`https://api-gateway.umami.dev/api/send` 是外部 API，不受 Nginx 配置影响
2. **浏览器缓存**：如果问题仍然存在，清除浏览器缓存或使用硬刷新（Ctrl+F5）
3. **服务重启**：确保 Nginx 配置已重新加载：`sudo systemctl reload nginx`

## 状态

✅ **已完成**：
- 使用 `^~` 前缀匹配确保 API 路由优先级
- 改进 proxy_pass 配置
- 添加 WebSocket 连接映射
- 增强请求头设置
- 改进缓存控制
- 添加 CORS 支持

