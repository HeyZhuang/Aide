# 端口 3004 直接访问问题修复

## 问题描述

用户直接访问 `http://54.189.143.120:3004/canvas/fault`，导致 API 请求返回 HTML 而不是 JSON。

## 根本原因

1. **直接访问前端端口**：用户访问 `:3004` 端口，绕过了 Nginx 代理
2. **相对路径 API 请求**：前端代码使用相对路径 `/api/templates/items`
3. **请求被路由到前端服务器**：
   - 访问：`http://54.189.143.120:3004/canvas/fault`
   - API 请求：`/api/templates/items`
   - 实际请求：`http://54.189.143.143:3004/api/templates/items`
   - 这个请求直接到前端服务器（serve），返回 HTML（index.html）

## 解决方案

### 方案：限制前端服务器只监听 localhost

修改 `psd-frontend.service`，将监听地址从 `0.0.0.0:3004` 改为 `127.0.0.1:3004`：

```ini
ExecStart=/usr/bin/npx --yes serve -s dist -l tcp://127.0.0.1:3004 --single
```

**效果：**
- ✅ 外部无法直接访问 `http://54.189.143.120:3004`
- ✅ 只能通过 Nginx（端口 80）访问：`http://54.189.143.120`
- ✅ Nginx 正确代理 `/api/` 请求到后端
- ✅ 所有 API 请求返回 JSON

## 正确的访问方式

**❌ 错误方式**：
```
http://54.189.143.120:3004/canvas/fault
```

**✅ 正确方式**：
```
http://54.189.143.120/canvas/fault
```

## 验证

```bash
# 测试通过 Nginx 访问（正确）
curl http://54.189.143.120/api/templates/items
# 应该返回 JSON

# 测试直接访问端口 3004（应该失败）
curl http://54.189.143.120:3004/
# 应该无法连接（如果防火墙关闭）或返回错误
```

## 配置更改

### 前端服务配置 (`psd-frontend.service`)
```ini
ExecStart=/usr/bin/npx --yes serve -s dist -l tcp://127.0.0.1:3004 --single
```

### Nginx 配置保持不变
- `location ^~ /api/` 代理到后端（端口 57988）
- `location /` 代理到前端（端口 3004，localhost）

## 状态

✅ **已修复**：
- 前端服务器现在只监听 127.0.0.1（localhost）
- 外部无法直接访问端口 3004
- 用户必须通过 Nginx（端口 80）访问
- API 请求正确路由到后端

## 注意事项

1. **端口访问**：外部用户不应该直接访问端口 3004 或 57988
2. **统一入口**：所有访问应该通过 `http://54.189.143.120`（端口 80，Nginx）
3. **浏览器缓存**：如果用户之前访问过 `:3004`，可能需要清除缓存



