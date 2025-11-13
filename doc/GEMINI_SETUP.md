# Gemini 图片生成配置指南

## 🔑 获取 API Key

访问 https://aistudio.google.com/apikey 获取免费 API Key

---

## ⚙️ 配置步骤

### 1. 编辑配置文件

编辑 `server/user_data/config.toml`：

```toml
[gemini]
url = "https://generativelanguage.googleapis.com/v1beta"
api_key = "AIzaSy..."  # 你的 API Key（39 字符）
use_vertexai = false

[gemini.models]
"gemini-2.5-flash" = { type = "text" }
"gemini-2.5-flash-image" = { type = "image" }
```

### 2. 配置代理（仅在中国大陆需要）

在启动后端前设置环境变量：

```powershell
# PowerShell
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
cd server
python main.py
```

或使用启动脚本：
```powershell
.\start_server_with_proxy.ps1
```

**常见代理端口**：
- Clash: 7890
- V2RayN: 10809
- Shadowsocks: 1080

### 3. 启动后端

```bash
cd server
python main.py
```

---

## 🧪 测试

### 运行测试脚本

```powershell
.\test_gemini_with_monitoring.ps1
```

### 预期结果

```
✅ 选择工具: generate_image_by_gemini_2_5_flash
✅ API 调用成功！
🎉 图片生成成功！
🖼️  图片 URL: http://localhost:3004/api/file/im_xxx.png
```

---

## 🐛 常见问题

### 1. 未找到 Gemini 工具

**原因**：API Key 未配置或太短

**解决**：
- 检查 `config.toml` 中 API Key 是否完整（39 字符）
- 重启后端服务

### 2. 连接超时

**错误**：`503 failed to connect to all addresses`

**原因**：无法访问 Google API（网络问题）

**解决**：配置代理后重启后端

### 3. API Key 无效

**错误**：`401 Unauthorized`

**解决**：访问 https://aistudio.google.com/apikey 重新生成 API Key

---

## 📂 生成的图片

- **保存位置**：`server/user_data/files/im_*.png`
- **访问 URL**：`http://localhost:3004/api/file/im_xxx.png`
