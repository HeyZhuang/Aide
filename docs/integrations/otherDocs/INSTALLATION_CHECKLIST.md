# Gemini 集成安装检查清单

## ✅ 完成情况概览

### 已完成的工作

- ✅ **删除 Pro 图像模型**（按用户要求）
- ✅ **配置文本模型**：`gemini-2.5-flash`
- ✅ **配置图像模型**：`gemini-2.5-flash-image`
- ✅ **实现 Gemini Provider**（图像生成）
- ✅ **实现 LangChain 工具**（图像生成）
- ✅ **集成文本模型到 agent_service**
- ✅ **注册工具到系统**
- ✅ **创建测试脚本**
- ✅ **编写完整文档**

---

## 📦 需要安装的依赖

### 必需的 Python 包

```bash
cd server
pip install langchain-google-genai
pip install google-genai
```

**检查安装**：
```bash
python -c "import langchain_google_genai; print('✅ langchain-google-genai 已安装')"
python -c "import google.genai; print('✅ google-genai 已安装')"
```

---

## ⚙️ 配置步骤

### Step 1: 获取 API Key

1. 访问：https://aistudio.google.com/app/apikey
2. 点击 "Create API Key"
3. 复制生成的 API Key

### Step 2: 配置文件

编辑 `server/user_data/config.toml`，添加：

```toml
[gemini]
api_key = "your-api-key-here"  # ← 替换为你的 API Key
```

**完整配置示例**：
```toml
[gemini]
api_key = "AIzaSyDwFK7wOw2bF..."  # 你的真实 API Key
url = "https://generativelanguage.googleapis.com/v1beta"
use_vertexai = false
project = ""
location = "us-central1"
```

### Step 3: 验证配置

```bash
cd server
python -c "
import asyncio
from services.config_service import config_service

async def test():
    await config_service.initialize()
    gemini = config_service.app_config.get('gemini', {})
    api_key = gemini.get('api_key', '')
    if api_key:
        print(f'✅ API Key 已配置: {api_key[:20]}...')
    else:
        print('❌ 未配置 API Key')

asyncio.run(test())
"
```

---

## 🧪 测试步骤

### 测试 1: 快速验证（推荐）

**不调用 API，不消耗配额**

```bash
cd server
python tests/test_gemini_quick.py
```

**预期输出**：
```
==============================================================
🚀 Gemini 快速测试
==============================================================

📋 测试 1: 检查配置文件
--------------------------------------------------------------
✅ 找到 Gemini 配置
✅ API Key 已配置 (AIzaSyDwFK7wOw2bF...)

📋 测试 2: 检查模型配置
--------------------------------------------------------------
✅ 模型已配置: gemini-2.5-flash
✅ 模型已配置: gemini-2.5-flash-image

📋 测试 3: 检查工具注册
--------------------------------------------------------------
✅ 工具已注册: Gemini 2.5 Flash Image

📋 测试 4: 检查代码文件
--------------------------------------------------------------
✅ Provider: tools/image_providers/gemini_provider.py
✅ Flash 工具: tools/generate_image_by_gemini_2_5_flash.py

==============================================================
✅ 快速测试全部通过!
==============================================================
```

### 测试 2: 基础功能测试（可选）

**会调用 API，生成 1 张测试图片**

```bash
cd server
python tests/test_gemini_basic.py
```

**注意**：此测试会消耗 API 配额！

---

## 🚀 启动服务

### 启动后端

```bash
cd server
python main.py
```

**预期日志**：
```
🟢 Using Gemini AI Studio API
✅ 工具已注册: Gemini 2.5 Flash Image
Server started on http://localhost:8000
```

### 启动前端

```bash
cd app
npm run dev
```

---

## 🎯 前端使用测试

### 测试文本模型

1. 打开前端界面
2. 在设置中选择文本模型：`gemini-2.5-flash`
3. 发送消息测试对话功能

**示例**：
```
用户: 你好，介绍一下你自己
AI: [使用 Gemini 2.5 Flash 生成回复]
```

### 测试图像模型

发送图像生成指令：

```
用户: 用 Gemini Flash 生成一只可爱的猫
```

**预期行为**：
1. AI 理解指令
2. 调用 `generate_image_by_gemini_2_5_flash` 工具
3. 生成图片并显示在界面上

---

## 📊 文件修改清单

### 新增文件

#### 核心代码
- ✅ `server/tools/image_providers/gemini_provider.py` - Gemini Provider
- ✅ `server/tools/generate_image_by_gemini_2_5_flash.py` - Flash 图像工具

#### 测试文件
- ✅ `server/tests/test_gemini_quick.py` - 快速测试
- ✅ `server/tests/test_gemini_basic.py` - 基础测试

#### 文档文件
- ✅ `docs/integrations/GEMINI_INTEGRATION_FINAL.md` - 集成文档
- ✅ `docs/integrations/TESTING_GUIDE.md` - 测试指南
- ✅ `docs/integrations/GEMINI_FIXES.md` - 问题修复记录
- ✅ `docs/integrations/README.md` - 文档目录
- ✅ `docs/integrations/INSTALLATION_CHECKLIST.md` - 本文档

### 修改的文件

#### 配置相关
- ✅ `server/services/config_service.py`
  - 添加 Gemini 配置（文本 + 图像模型）

#### 文本模型集成
- ✅ `server/services/langgraph_service/agent_service.py`
  - 在 `_create_text_model()` 函数中添加 Gemini 支持

#### 图像模型集成
- ✅ `server/services/tool_service.py`
  - 导入 Flash 图像工具
  - 在 TOOL_MAPPING 中注册工具

- ✅ `server/tools/utils/image_generation_core.py`
  - 导入 GeminiImageProvider
  - 在 IMAGE_PROVIDERS 中注册

### 删除的文件

- ❌ `server/tools/generate_image_by_gemini_2_5_pro.py` - Pro 图像工具（按用户要求删除）

---

## 🔍 验证集成是否成功

运行以下检查：

### 检查 1: 配置文件

```bash
cat server/user_data/config.toml | grep -A 5 "\[gemini\]"
```

**预期输出**：
```toml
[gemini]
api_key = "AIzaSy..."
```

### 检查 2: Python 导入

```bash
cd server
python -c "
from tools.image_providers.gemini_provider import GeminiImageProvider
from tools.generate_image_by_gemini_2_5_flash import generate_image_by_gemini_2_5_flash
from langchain_google_genai import ChatGoogleGenerativeAI
print('✅ 所有导入成功')
"
```

### 检查 3: 工具注册

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
    print(f'✅ 已注册 {len(gemini_tools)} 个 Gemini 工具:')
    for tool_id in gemini_tools:
        print(f'   - {tool_id}')

asyncio.run(test())
"
```

**预期输出**：
```
✅ 已注册 1 个 Gemini 工具:
   - generate_image_by_gemini_2_5_flash
```

### 检查 4: Provider 注册

```bash
cd server
python -c "
from tools.utils.image_generation_core import IMAGE_PROVIDERS
if 'gemini' in IMAGE_PROVIDERS:
    print('✅ Gemini Provider 已注册')
    print(f'   Provider 实例: {IMAGE_PROVIDERS[\"gemini\"].__class__.__name__}')
else:
    print('❌ Gemini Provider 未注册')
"
```

**预期输出**：
```
✅ Gemini Provider 已注册
   Provider 实例: GeminiImageProvider
```

---

## ⚠️ 常见问题快速解决

### ❌ 导入失败

**错误**：
```
ModuleNotFoundError: No module named 'langchain_google_genai'
```

**解决**：
```bash
pip install langchain-google-genai
```

---

### ❌ API Key 未配置

**错误**：
```
❌ 未配置 API Key
```

**解决**：
1. 编辑 `server/user_data/config.toml`
2. 添加 `[gemini]` 和 `api_key = "..."`
3. 重启服务器

---

### ❌ 工具未注册

**现象**：AI 不调用 Gemini 工具

**解决**：
1. 确认 API Key 已配置
2. 重启服务器
3. 运行快速测试验证

---

### ❌ 配额耗尽

**错误**：
```
429 RESOURCE_EXHAUSTED
```

**解决**：
- 等待配额重置（每天 UTC 00:00）
- 查看配额使用：https://ai.dev/usage
- 考虑升级到付费版

---

## 📋 最终检查清单

在认为集成完成前，确认以下所有项目：

### 代码文件
- [ ] ✅ `gemini_provider.py` 文件存在
- [ ] ✅ `generate_image_by_gemini_2_5_flash.py` 文件存在
- [ ] ✅ `agent_service.py` 包含 Gemini 文本模型支持
- [ ] ✅ `tool_service.py` 注册了 Flash 工具
- [ ] ✅ `image_generation_core.py` 注册了 Gemini Provider
- [ ] ✅ Pro 图像工具已删除

### 配置
- [ ] ✅ `config_service.py` 包含 Gemini 配置
- [ ] ✅ `config.toml` 配置了 API Key
- [ ] ✅ API Key 有效且有配额

### 依赖
- [ ] ✅ 已安装 `langchain-google-genai`
- [ ] ✅ 已安装 `google-genai`

### 测试
- [ ] ✅ 快速测试通过
- [ ] ✅ 基础测试通过（可选）
- [ ] ✅ 服务器可以正常启动
- [ ] ✅ 前端可以看到 Gemini 模型选项

### 文档
- [ ] ✅ 所有文档文件已创建
- [ ] ✅ 文档内容准确反映最终实现

---

## 🎉 集成完成

如果所有检查项都通过，恭喜！Gemini 集成已成功完成。

### 下一步

1. **阅读完整文档**：[GEMINI_INTEGRATION_FINAL.md](./GEMINI_INTEGRATION_FINAL.md)
2. **开始使用**：在前端界面测试 Gemini 模型
3. **遇到问题**：查看 [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

**文档版本**：v1.0
**更新日期**：2025-11-12
