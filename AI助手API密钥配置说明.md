# AI助手API密钥配置说明

## 🔍 问题诊断

经过代码分析，发现AI助手模型调用系统需要API密钥才能正常工作。系统会检查每个Provider的`api_key`配置，只有当API密钥存在时才会注册相应的工具。

## 📁 配置文件位置

**主要配置文件**: `server/user_data/config.toml`

这是AI助手模型调用系统使用的配置文件，格式为TOML。

## 🔑 如何添加API密钥

### 方法1：直接编辑配置文件（推荐）

1. **打开配置文件**:
   ```bash
   # 配置文件路径
   server/user_data/config.toml
   ```

2. **编辑配置文件**，添加API密钥:
   ```toml
   [openai]
   url = "https://api.openai.com/v1/"
   api_key = "sk-your-openai-api-key-here"
   max_tokens = 8192
   
   [jaaz]
   url = "https://jaaz.app/api/v1/"
   api_key = "your-jaaz-api-key-here"
   max_tokens = 8192
   
   [anthropic]
   url = "https://api.anthropic.com/v1/"
   api_key = "sk-ant-your-anthropic-api-key-here"
   max_tokens = 8192
   
   [volces]
   url = "https://api.volces.com/v1/"
   api_key = "your-volces-api-key-here"
   max_tokens = 8192
   
   [replicate]
   url = "https://api.replicate.com/v1/"
   api_key = "r8_your-replicate-api-key-here"
   max_tokens = 8192
   
   [wavespeed]
   url = "https://api.wavespeed.com/v1/"
   api_key = "your-wavespeed-api-key-here"
   max_tokens = 8192
   ```

3. **保存文件并重启服务器**

### 方法2：通过前端界面配置

1. **启动服务器**:
   ```bash
   cd server
   python main.py
   ```

2. **访问前端界面**，进入设置页面

3. **在配置页面添加API密钥**:
   - 找到对应的Provider（如OpenAI、Jaaz等）
   - 输入API密钥
   - 保存配置

4. **系统会自动重新初始化工具服务**

### 方法3：通过API接口配置

```bash
# 获取当前配置
curl http://localhost:57988/api/config

# 更新配置
curl -X POST http://localhost:57988/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "openai": {
      "url": "https://api.openai.com/v1/",
      "api_key": "sk-your-api-key-here",
      "max_tokens": 8192,
      "models": {
        "gpt-4o": {"type": "text"},
        "gpt-4o-mini": {"type": "text"}
      }
    }
  }'
```

## 📋 支持的Provider列表

### 文本模型Provider

| Provider | 用途 | 获取API密钥 |
|----------|------|------------|
| **openai** | OpenAI GPT-4o, GPT-4o-mini | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **anthropic** | Claude Sonnet 4, Claude 3.7 Sonnet | [Anthropic Console](https://console.anthropic.com/) |
| **jaaz** | Jaaz API (GPT-4o等) | [Jaaz.app](https://jaaz.app) |
| **ollama** | 本地Ollama模型 | 无需API密钥（本地运行） |

### 图像生成Provider

| Provider | 用途 | 获取API密钥 |
|----------|------|------------|
| **jaaz** | GPT Image 1, Imagen 4, Recraft v3等 | [Jaaz.app](https://jaaz.app) |
| **openai** | DALL-E | [OpenAI Platform](https://platform.openai.com/api-keys) |
| **replicate** | Flux, Imagen等 | [Replicate](https://replicate.com/account/api-tokens) |
| **volces** | 火山引擎图像生成 | [火山引擎控制台](https://console.volcengine.com/) |
| **wavespeed** | Wavespeed图像生成 | [Wavespeed](https://wavespeed.ai) |
| **comfyui** | 本地ComfyUI | 无需API密钥（本地运行） |

### 视频生成Provider

| Provider | 用途 | 获取API密钥 |
|----------|------|------------|
| **jaaz** | VEO3, Kling, Seedance等 | [Jaaz.app](https://jaaz.app) |
| **volces** | 火山引擎视频生成 | [火山引擎控制台](https://console.volcengine.com/) |

## 🔧 工具注册机制

系统在启动时会自动检查每个Provider的API密钥：

```python
# server/services/tool_service.py
async def initialize(self):
    for provider_name, provider_config in config_service.app_config.items():
        # 只有当API密钥存在时才注册工具
        if provider_config.get("api_key", ""):
            for tool_id, tool_info in TOOL_MAPPING.items():
                if tool_info.get("provider") == provider_name:
                    self.register_tool(tool_id, tool_info)
```

**重要**: 如果某个Provider的`api_key`为空，该Provider的所有工具都不会被注册，AI助手将无法使用这些工具。

## ✅ 验证配置

### 1. 检查配置文件

```bash
# 查看配置文件内容
cat server/user_data/config.toml
```

### 2. 检查工具注册

启动服务器后，查看日志输出：
- 如果看到 `📸 图像工具: [...]` 和 `🎬 视频工具: [...]`，说明工具已注册
- 如果列表为空，说明API密钥未配置

### 3. 通过API检查

```bash
# 获取当前配置
curl http://localhost:57988/api/config

# 检查工具列表（需要查看前端界面）
```

## 🚨 常见问题

### 问题1: 工具列表为空

**原因**: API密钥未配置或配置错误

**解决方案**:
1. 检查 `server/user_data/config.toml` 文件
2. 确认对应Provider的`api_key`字段不为空
3. 重启服务器

### 问题2: API调用失败

**原因**: API密钥无效或过期

**解决方案**:
1. 验证API密钥是否正确
2. 检查API密钥是否有足够的配额
3. 查看服务器日志获取详细错误信息

### 问题3: 配置文件不存在

**原因**: 首次启动时配置文件未创建

**解决方案**:
1. 启动服务器，系统会自动创建默认配置文件
2. 然后编辑配置文件添加API密钥

## 📝 配置文件示例

完整的`config.toml`文件示例：

```toml
[jaaz]
url = "https://jaaz.app/api/v1/"
api_key = "your-jaaz-api-key-here"
max_tokens = 8192

[jaaz.models]
gpt-4o = { type = "text" }
gpt-4o-mini = { type = "text" }
deepseek/deepseek-chat-v3-0324 = { type = "text" }
anthropic/claude-sonnet-4 = { type = "text" }
anthropic/claude-3.7-sonnet = { type = "text" }

[openai]
url = "https://api.openai.com/v1/"
api_key = "sk-your-openai-api-key-here"
max_tokens = 8192

[openai.models]
gpt-4o = { type = "text" }
gpt-4o-mini = { type = "text" }

[anthropic]
url = "https://api.anthropic.com/v1/"
api_key = "sk-ant-your-anthropic-api-key-here"
max_tokens = 8192

[anthropic.models]
claude-sonnet-4 = { type = "text" }
claude-3.7-sonnet = { type = "text" }

[volces]
url = "https://api.volces.com/v1/"
api_key = "your-volces-api-key-here"
max_tokens = 8192

[replicate]
url = "https://api.replicate.com/v1/"
api_key = "r8_your-replicate-api-key-here"
max_tokens = 8192

[wavespeed]
url = "https://api.wavespeed.com/v1/"
api_key = "your-wavespeed-api-key-here"
max_tokens = 8192

[comfyui]
url = "http://127.0.0.1:8188"
api_key = ""

[ollama]
url = "http://localhost:11434"
api_key = ""
max_tokens = 8192
```

## 🔒 安全提示

1. **不要提交配置文件到Git**:
   - `server/user_data/config.toml` 应该添加到 `.gitignore`
   - API密钥是敏感信息，不应公开

2. **定期更换API密钥**:
   - 如果密钥泄露，立即在对应平台重新生成

3. **使用环境变量（可选）**:
   - 某些Provider支持从环境变量读取API密钥
   - 但主要配置仍通过`config.toml`文件管理

## 📞 获取帮助

如果遇到问题：

1. **查看服务器日志**:
   ```bash
   # 查看服务器启动日志
   tail -f server/logs/*.log
   ```

2. **检查工具注册状态**:
   - 启动服务器后查看控制台输出
   - 查找 `📸 图像工具:` 和 `🎬 视频工具:` 日志

3. **验证API密钥**:
   - 在对应平台测试API密钥是否有效

---

**总结**: AI助手模型调用系统需要在 `server/user_data/config.toml` 文件中配置各个Provider的API密钥。只有当API密钥存在时，相应的工具才会被注册，AI助手才能正常使用这些工具。

