# Gemini 模型集成文档（最终版本）

## 📋 概述

本文档描述了 Google Gemini 模型在 PSD Canvas 项目中的最终集成方案。

### 集成的模型

根据实际测试和用户需求，最终集成了以下 Gemini 模型：

| 模型名称 | 类型 | 用途 | 状态 |
|---------|------|------|------|
| `gemini-2.5-flash` | 文本模型 | AI 对话和推理 | ✅ 已集成 |
| `gemini-2.5-flash-image` | 图像模型 | 图像生成和编辑 | ✅ 已集成 |

**注意**：初始计划包含 `gemini-2.5-pro-image` 模型，但因该模型在 API v1beta 中尚未发布（返回 404 错误），已被移除。

---

## 🔧 技术架构

### 1. 文本模型集成

文本模型使用 **LangChain** 框架集成，遵循项目现有的多智能体架构。

#### 代码位置

- **配置文件**：`server/services/config_service.py`
- **模型创建**：`server/services/langgraph_service/agent_service.py`

#### 实现方式

```python
# 在 agent_service.py 中的 _create_text_model() 函数
elif provider == 'gemini':
    # Gemini 使用 ChatGoogleGenerativeAI (通过 langchain-google-genai)
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=api_key,  # 从 config.toml 读取
        timeout=300,
        temperature=0,
    )
```

#### 依赖包

```bash
pip install langchain-google-genai
```

---

### 2. 图像模型集成

图像模型使用 **Provider 模式**，与其他图像生成工具（Replicate、Jaaz 等）保持一致。

#### 核心组件

1. **Gemini Provider**
   - 文件：`server/tools/image_providers/gemini_provider.py`
   - 类：`GeminiImageProvider(ImageProviderBase)`
   - 功能：
     - 支持 API Key 和 Vertex AI 两种认证方式
     - 支持文本生成图像（Text-to-Image）
     - 支持图像编辑（Image-to-Image）
     - 自动处理图像保存和元数据

2. **LangChain 工具**
   - 文件：`server/tools/generate_image_by_gemini_2_5_flash.py`
   - 工具名：`generate_image_by_gemini_2_5_flash`
   - 功能：
     - 接收用户提示词和参数
     - 调用 Gemini Provider 生成图像
     - 返回生成结果给用户

3. **工具注册**
   - 文件：`server/services/tool_service.py`
   - 注册条件：检测到 `config.toml` 中配置了 `[gemini]` 的 `api_key`
   - 工具映射：
     ```python
     "generate_image_by_gemini_2_5_flash": {
         "display_name": "Gemini 2.5 Flash Image",
         "type": "image",
         "provider": "gemini",
         "tool_function": generate_image_by_gemini_2_5_flash,
     }
     ```

4. **Provider 注册**
   - 文件：`server/tools/utils/image_generation_core.py`
   - 注册代码：
     ```python
     IMAGE_PROVIDERS: dict[str, ImageProviderBase] = {
         "jaaz": JaazImageProvider(),
         "openai": OpenAIImageProvider(),
         "replicate": ReplicateImageProvider(),
         "volces": VolcesProvider(),
         "wavespeed": WavespeedProvider(),
         "gemini": GeminiImageProvider(),  # ← Gemini Provider
     }
     ```

---

## ⚙️ 配置说明

### 1. 默认配置

在 `server/services/config_service.py` 中的默认配置：

```python
'gemini': {
    'models': {
        # 文本模型（用于对话和推理）
        'gemini-2.5-flash': {'type': 'text'},
        # 图像生成模型（硬编码，不会从 config.toml 读取）
        'gemini-2.5-flash-image': {'type': 'image'},
    },
    'url': 'https://generativelanguage.googleapis.com/v1beta',
    'api_key': '',  # 从 config.toml 或前端配置
    # Vertex AI 配置（企业用户）
    'use_vertexai': False,  # 是否使用 Vertex AI
    'project': '',          # GCP 项目 ID（使用 Vertex AI 时必填）
    'location': 'us-central1',  # GCP 区域（使用 Vertex AI 时必填）
},
```

### 2. 用户配置

用户需要在 `server/user_data/config.toml` 中配置：

#### 方式 A: 使用 Google AI Studio API Key（推荐）

```toml
[gemini]
api_key = "your-api-key-here"
```

**获取 API Key**：
1. 访问 https://aistudio.google.com/app/apikey
2. 创建或复制 API Key
3. 粘贴到配置文件中

#### 方式 B: 使用 Vertex AI（企业用户）

```toml
[gemini]
use_vertexai = true
project = "your-gcp-project-id"
location = "us-central1"
```

**前提条件**：
- 拥有 GCP 账号和项目
- 配置服务账号认证
- 设置环境变量 `GOOGLE_APPLICATION_CREDENTIALS`

---

## 🚀 使用方法

### 1. 文本模型使用

用户在聊天界面输入消息时，系统会自动调用配置的文本模型。

**示例对话**：
```
用户: 帮我写一个关于春天的诗
AI: [使用 gemini-2.5-flash 生成回复]
```

**模型选择**：
- 在前端配置界面选择 `gemini-2.5-flash` 作为文本模型
- 系统会自动使用该模型进行对话

### 2. 图像模型使用

用户可以通过自然语言指令触发图像生成。

**示例指令**：

```
# 文本生成图像
用户: 用 Gemini Flash 生成一只可爱的猫

# 图像编辑
用户: 用 Gemini Flash 把这张图片变成卡通风格
```

**AI 行为**：
1. 理解用户意图
2. 调用 `generate_image_by_gemini_2_5_flash` 工具
3. 生成图片并返回给用户

**支持的宽高比**：
- `1:1` - 正方形（1024x1024）
- `16:9` - 横向宽屏（1792x1024）
- `9:16` - 竖向（1024x1792）
- `4:3` - 标准横向（1536x1152）
- `3:4` - 标准竖向（1152x1536）

---

## 🧪 测试指南

### 测试前准备

1. **安装依赖**：
   ```bash
   cd server
   pip install langchain-google-genai google-genai
   ```

2. **配置 API Key**：
   编辑 `server/user_data/config.toml`，添加：
   ```toml
   [gemini]
   api_key = "your-api-key-here"
   ```

### 测试步骤

#### 1. 快速测试（不调用 API）

```bash
cd server
python tests/test_gemini_quick.py
```

**验证项**：
- ✅ 配置文件加载
- ✅ 模型配置正确
- ✅ 工具注册成功
- ✅ 代码文件存在

#### 2. 基础功能测试（调用 API）

```bash
cd server
python tests/test_gemini_basic.py
```

**测试内容**：
- ✅ 配置服务初始化
- ✅ Provider 创建
- ✅ 图像生成功能
- ✅ 生成的图片保存

**注意**：此测试会消耗 API 配额（生成 1 张图片）

#### 3. 手动测试文本模型

创建测试脚本 `test_text_model.py`：

```python
import asyncio
from services.config_service import config_service
from services.langgraph_service.agent_service import _create_text_model

async def test():
    await config_service.initialize()

    text_model_info = {
        'provider': 'gemini',
        'model': 'gemini-2.5-flash',
        'url': config_service.app_config['gemini']['url']
    }

    model = _create_text_model(text_model_info)
    print(f"✅ 成功创建 Gemini 文本模型: {model}")

    # 测试简单调用
    response = model.invoke("Say hello in Chinese")
    print(f"🤖 模型回复: {response.content}")

asyncio.run(test())
```

运行：
```bash
cd server
python test_text_model.py
```

---

## 🐛 常见问题

### Q1: API 配额耗尽

**错误**：
```
429 RESOURCE_EXHAUSTED
You exceeded your current quota
```

**原因**：免费版 API 有每日请求限制

**解决方案**：
1. 等待配额重置（每天 UTC 00:00）
2. 升级到付费计划
3. 使用 Vertex AI

**查看配额**：https://ai.dev/usage?tab=rate-limit

---

### Q2: 模型不存在

**错误**：
```
404 NOT_FOUND
models/gemini-xxx is not found
```

**原因**：使用了不存在或未发布的模型

**解决方案**：
- 只使用官方支持的模型
- 当前可用：`gemini-2.5-flash`（文本）、`gemini-2.5-flash-image`（图像）

---

### Q3: API Key 无效

**错误**：
```
403 Forbidden
API key not valid
```

**解决方案**：
1. 检查 API Key 是否正确复制
2. 确认 API Key 未过期
3. 在 Google AI Studio 重新生成

---

### Q4: 工具未注册

**现象**：AI 不调用 Gemini 工具

**原因**：
- 未配置 API Key
- 服务未重启

**解决方案**：
1. 确认 `config.toml` 中有 `api_key = "..."`
2. 重启服务器：`python main.py`
3. 检查日志是否有错误

---

### Q5: 图片生成失败

**错误**：
```
Gemini image generation failed: ...
```

**排查步骤**：
1. 检查 API 配额是否充足
2. 验证提示词是否符合内容政策
3. 检查网络连接
4. 查看完整错误日志

---

## 📊 API 配额说明

### 免费版限制

| 限制类型 | 限制值 |
|---------|-------|
| 每天请求次数 | 有限制（具体值见官方文档） |
| 每分钟请求数 | 有限制 |
| Token 数量 | 有限制 |

### 建议

- 开发测试时谨慎使用 API
- 避免运行大量自动化测试
- 考虑升级到付费版或使用 Vertex AI

---

## 📁 文件清单

### 核心代码文件

| 文件路径 | 说明 | 行数 |
|---------|------|------|
| `server/tools/image_providers/gemini_provider.py` | Gemini 图像生成 Provider | 280 |
| `server/tools/generate_image_by_gemini_2_5_flash.py` | Flash 图像生成工具 | 120 |
| `server/services/config_service.py` | 配置管理（包含 Gemini 配置） | 191 |
| `server/services/langgraph_service/agent_service.py` | 多智能体服务（包含文本模型创建） | 192 |
| `server/services/tool_service.py` | 工具注册服务 | 300 |
| `server/tools/utils/image_generation_core.py` | Provider 注册 | - |

### 测试文件

| 文件路径 | 说明 |
|---------|------|
| `server/tests/test_gemini_quick.py` | 快速验证测试（不调用 API） |
| `server/tests/test_gemini_basic.py` | 基础功能测试 |

### 文档文件

| 文件路径 | 说明 |
|---------|------|
| `docs/integrations/GEMINI_INTEGRATION_FINAL.md` | 最终集成文档（本文档） |
| `docs/integrations/TESTING_GUIDE.md` | 测试指南 |
| `docs/integrations/GEMINI_FIXES.md` | 问题修复记录 |

---

## 🔄 集成历史

### 初始计划

- `gemini-2.5-flash` - 文本模型 ✅
- `gemini-2.5-pro` - 文本模型 ❌（用户要求使用 Flash）
- `gemini-2.5-flash-image` - 图像模型 ✅
- `gemini-2.5-pro-image` - 图像模型 ❌（API 返回 404，已移除）

### 最终实现

根据测试结果和用户反馈，最终实现：

1. **文本模型**：`gemini-2.5-flash`
2. **图像模型**：`gemini-2.5-flash-image`

**用户指示**：
> "直接删除2.5的图片生成；后端模型文本用2.5 flash；图片用2.5 flash image"

---

## 🎯 下一步

集成完成后的使用流程：

1. **启动服务器**
   ```bash
   cd server
   python main.py
   ```

2. **前端配置**
   - 打开前端配置界面
   - 在模型选择中选择 `gemini-2.5-flash`（文本）
   - Gemini 图像工具会自动可用

3. **开始使用**
   - 文本对话：直接发送消息
   - 图像生成：输入类似 "用 Gemini Flash 生成一只猫" 的指令

---

## 📚 参考资源

- [Google Gemini API 文档](https://ai.google.dev/gemini-api/docs)
- [Gemini 模型列表](https://ai.google.dev/gemini-api/docs/models/gemini)
- [LangChain Google GenAI](https://python.langchain.com/docs/integrations/chat/google_generative_ai)
- [API 配额限制](https://ai.google.dev/gemini-api/docs/rate-limits)
- [配额使用仪表板](https://ai.dev/usage)

---

## 📧 技术支持

如遇到问题，请：

1. 查看本文档的常见问题部分
2. 查看 `TESTING_GUIDE.md` 的排查步骤
3. 查看 `GEMINI_FIXES.md` 的已知问题
4. 查阅 Google Gemini 官方文档
5. 提交 GitHub Issue

---

**文档版本**：v1.0 - 最终版本
**更新日期**：2025-11-12
**维护者**：Claude Code AI Assistant
