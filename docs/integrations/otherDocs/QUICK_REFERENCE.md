# Gemini 集成快速参考

快速查找常用命令和配置的参考卡片。

---

## 📦 安装

```bash
cd server
pip install langchain-google-genai google-genai
```

---

## ⚙️ 配置

### 最小配置

编辑 `server/user_data/config.toml`：

```toml
[gemini]
api_key = "your-api-key-here"
```

### 获取 API Key

https://aistudio.google.com/app/apikey

---

## 🧪 测试命令

### 快速测试（不调用 API）

```bash
cd server
python tests/test_gemini_quick.py
```

### 基础测试（生成 1 张图片）

```bash
cd server
python tests/test_gemini_basic.py
```

### 查看测试图片

```bash
cd server/tests/generated_images
ls -la
```

### 清理测试图片

**Windows**:
```cmd
cd server\tests\generated_images
del *.png
```

**Linux/macOS**:
```bash
cd server/tests/generated_images
rm -f *.png
```

---

## 🚀 启动服务

```bash
cd server
python main.py
```

---

## 🎨 前端使用

### 文本对话

在设置中选择 `gemini-2.5-flash` 作为文本模型

### 图像生成

发送指令：
```
用 Gemini Flash 生成一只可爱的猫
```

---

## 🔍 验证命令

### 检查配置

```bash
cd server
python -c "
import asyncio
from services.config_service import config_service

async def test():
    await config_service.initialize()
    gemini = config_service.app_config.get('gemini', {})
    print('API Key:', gemini.get('api_key', '')[:20] + '...')

asyncio.run(test())
"
```

### 检查工具注册

```bash
cd server
python -c "
import asyncio
from services.config_service import config_service
from services.tool_service import tool_service

async def test():
    await config_service.initialize()
    await tool_service.initialize()
    tools = tool_service.get_all_tools()
    gemini_tools = [k for k in tools.keys() if 'gemini' in k]
    print('Gemini 工具:', gemini_tools)

asyncio.run(test())
"
```

### 检查 Python 导入

```bash
cd server
python -c "
from tools.image_providers.gemini_provider import GeminiImageProvider
from tools.generate_image_by_gemini_2_5_flash import generate_image_by_gemini_2_5_flash
from langchain_google_genai import ChatGoogleGenerativeAI
print('✅ 所有导入成功')
"
```

---

## 📁 重要文件位置

### 核心代码

```
server/tools/image_providers/gemini_provider.py
server/tools/generate_image_by_gemini_2_5_flash.py
server/services/langgraph_service/agent_service.py
server/services/config_service.py
server/services/tool_service.py
```

### 测试文件

```
server/tests/test_gemini_quick.py
server/tests/test_gemini_basic.py
server/tests/generated_images/
```

### 文档

```
docs/integrations/GEMINI_INTEGRATION_COMPLETE.md   # 完成报告
docs/integrations/GEMINI_INTEGRATION_FINAL.md      # 完整指南
docs/integrations/INSTALLATION_CHECKLIST.md        # 安装清单
docs/integrations/TESTING_GUIDE.md                 # 测试指南
```

### 配置文件

```
server/user_data/config.toml                       # 用户配置
server/services/config_service.py                  # 默认配置
```

---

## 🔗 常用链接

| 资源 | URL |
|------|-----|
| 获取 API Key | https://aistudio.google.com/app/apikey |
| 查看配额 | https://ai.dev/usage?tab=rate-limit |
| Gemini API 文档 | https://ai.google.dev/gemini-api/docs |
| LangChain 集成 | https://python.langchain.com/docs/integrations/chat/google_generative_ai |

---

## 🐛 常见错误

### ModuleNotFoundError

```bash
pip install langchain-google-genai google-genai
```

### 429 RESOURCE_EXHAUSTED

等待配额重置（每天 UTC 00:00）或升级到付费版

### 403 Forbidden

检查 API Key 是否正确配置

### 工具未注册

确认 `config.toml` 中有 `api_key` 并重启服务器

---

## 📊 集成的模型

| 模型 | 类型 | 用途 |
|------|------|------|
| `gemini-2.5-flash` | 文本 | AI 对话 |
| `gemini-2.5-flash-image` | 图像 | 图像生成 |

---

## 🎯 支持的宽高比

| 宽高比 | 尺寸示例 | 用途 |
|-------|---------|------|
| 1:1 | 1024x1024 | 正方形 |
| 16:9 | 1792x1024 | 横向宽屏 |
| 9:16 | 1024x1792 | 竖向 |
| 4:3 | 1536x1152 | 标准横向 |
| 3:4 | 1152x1536 | 标准竖向 |

---

## 💡 快速提示

### 测试前

1. ✅ 安装依赖
2. ✅ 配置 API Key
3. ✅ 运行快速测试

### 遇到问题

1. 📖 查看 [INSTALLATION_CHECKLIST.md](./INSTALLATION_CHECKLIST.md)
2. 🧪 运行 `test_gemini_quick.py` 诊断
3. 📚 查看 [TESTING_GUIDE.md](./TESTING_GUIDE.md)

### 日常使用

1. 🚀 启动服务：`python main.py`
2. 🎨 前端选择 Gemini 模型
3. 💬 发送消息或图片生成指令

---

**版本**：v1.0
**更新**：2025-11-12
