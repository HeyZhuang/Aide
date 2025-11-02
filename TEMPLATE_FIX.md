# 模板文件公网访问修复说明

## 问题
模板文件（PSD 文件）无法在公网上正确显示和下载。

## 解决方案

### 1. 优化 Nginx 配置以支持大文件传输

已更新 `/etc/nginx/sites-available/psd-canvas` 配置文件，添加了以下优化：

#### 主要改进：
- **增加超时时间**：`proxy_read_timeout` 从 300s 增加到 600s，模板下载路径增加到 900s
- **支持大文件传输**：
  - `client_max_body_size 500M` - 支持最大 500MB 文件
  - `proxy_buffering off` - 关闭代理缓冲，支持流式传输
  - `proxy_request_buffering off` - 关闭请求缓冲

#### 特殊配置 `/api/psd/templates/`：
- 专门针对模板文件下载路径优化
- 超时时间增加到 900s（15分钟）以支持大文件下载
- 添加 CORS 头支持跨域访问
- 合理的缓存策略（1小时）

### 2. 模板文件路径

模板文件存储在：
```
/home/ubuntu/cckz/psd-canvas-jaaz/template/
```

当前模板文件：
1. `01 momo M09 鋪底_專業抗敏護齦牙膏100g 8入+買舒酸定指定品 送_1200x1200.psd` (11MB)
2. `02 momo 舒酸定 M09 0905,0908 滿888現折100_1200x1200.psd` (69MB)
3. `04 9288701 好便宜0912 _1200x628.psd` (124MB)
4. `主圖測試.psd` (121MB)

### 3. API 端点

#### 模板列表
```
GET http://54.189.143.120/api/psd/templates/list
```

#### 获取模板文件（通过文件名）
```
GET http://54.189.143.120/api/psd/templates/{filename}
```
文件名需要 URL 编码（前端已使用 `encodeURIComponent` 处理）

#### 获取模板数据（通过模板ID）
```
GET http://54.189.143.120/api/psd/templates/by-id/{template_id}
```

#### 解析模板文件
```
POST http://54.189.143.120/api/psd/templates/parse/{filename}
```

### 4. 测试结果

✅ 模板列表 API 正常工作
✅ 模板文件下载返回 200 状态码
✅ Nginx 配置已更新并重新加载
✅ 大文件传输支持已配置

### 5. 前端使用方式

前端代码已正确使用 `encodeURIComponent` 对文件名进行编码：

```typescript
// react/src/api/upload.ts
export async function listPSDTemplates(): Promise<PSDTemplateInfo[]> {
  const response = await fetch('/api/psd/templates/list')
  // ...
}

export async function parsePSDTemplate(filename: string): Promise<...> {
  const response = await fetch(`/api/psd/templates/parse/${encodeURIComponent(filename)}`, {
    method: 'POST'
  })
  // ...
}
```

### 6. 注意事项

1. **文件名编码**：所有包含中文或特殊字符的文件名都需要 URL 编码
2. **文件大小**：PSD 文件可能很大（100MB+），需要足够的时间完成下载
3. **网络稳定性**：大文件传输需要稳定的网络连接
4. **CORS 配置**：已配置允许跨域访问，支持从浏览器直接访问模板文件

### 7. 验证模板文件访问

可以使用以下命令验证模板文件是否可以访问：

```bash
# 获取模板列表
curl http://54.189.143.120/api/psd/templates/list

# 测试模板文件下载（注意文件名需要 URL 编码）
curl -I "http://54.189.143.120/api/psd/templates/主圖測試.psd"
```

## 状态

✅ **已完成**：模板文件公网访问配置已优化并生效

