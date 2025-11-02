# API 路由问题最终修复总结

## 问题
除了外部 API `https://api-gateway.umami.dev/api/send` 外，所有其他 API 请求都返回 HTML 而不是 JSON。

## 根本原因
1. **Location 匹配优先级不足**：普通前缀匹配 `location /api/` 可能被其他 location 块覆盖
2. **缺少明确的匹配优先级控制**

## 解决方案

### 关键修复：使用 `^~` 前缀匹配

**修复前：**
```nginx
location /api/ {
    proxy_pass http://localhost:57988;
    ...
}
```

**修复后：**
```nginx
location ^~ /api/ {
    proxy_pass http://127.0.0.1:57988;
    ...
}
```

### `^~` 前缀的作用：
- **立即停止搜索**：一旦匹配到 `^~` location，Nginx 不再尝试其他 location 块
- **最高优先级**：优先级高于普通前缀匹配和正则匹配（除了精确匹配 `=`）
- **确保 API 路由优先**：所有 `/api/` 请求都会被优先路由到后端

### 其他改进：
1. 使用 `127.0.0.1` 替代 `localhost`（避免 DNS 解析问题）
2. 增强请求头设置（添加 `X-Forwarded-Host` 和 `X-Forwarded-Port`）
3. 改进缓存控制（`proxy_no_cache` 和 `proxy_cache_bypass`）
4. 添加 CORS 支持

## 配置顺序（重要！）

正确的 location 顺序：
1. `location ^~ /api/` - **最高优先级，立即匹配**
2. `location /api/psd/templates/` - 特定 API 子路径（虽然被上面的匹配，但更具体）
3. `location /socket.io/` - WebSocket 路由
4. `location /` - 前端路由，**最低优先级**

## 验证结果

所有 API 端点测试通过：

```bash
✅ /api/canvas/list - 返回 JSON (182 字节)
✅ /api/templates/categories - 返回 JSON (207 字节)
✅ /api/psd/templates/list - 返回 JSON (1607 字节)
✅ /api/canvas/default - 返回 JSON (16MB+)
```

## 最终配置要点

```nginx
server {
    listen 80;
    server_name 54.189.143.120;

    # 使用 ^~ 确保最高优先级
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:57988;
        # ... 其他配置
    }

    # 前端路由（最低优先级）
    location / {
        proxy_pass http://localhost:3004;
    }
}
```

## 注意事项

1. **外部 API**：`https://api-gateway.umami.dev/api/send` 是外部 API，不受此配置影响，这是正常的
2. **浏览器缓存**：如果浏览器仍显示问题，请清除缓存或硬刷新（Ctrl+F5 / Cmd+Shift+R）
3. **服务状态**：确保后端服务正在运行：`sudo systemctl status psd-backend`

## 状态

✅ **问题已解决**：
- 所有 `/api/` 请求正确路由到后端（端口 57988）
- 所有 API 返回正确的 JSON 响应
- Nginx 配置已重新加载并生效
- 使用 `^~` 前缀确保 API 路由最高优先级

