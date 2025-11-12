# Gemini 集成问题修正

## 🔍 发现的问题

根据测试结果，发现以下问题：

### 问题 1: Pro 模型不存在 (404 错误)

```
404 NOT_FOUND
models/gemini-2.5-pro-image is not found for API version v1beta
```

**原因**：
- Gemini 2.5 Pro Image 模型可能还未正式发布
- 当前只有 **Gemini 2.5 Flash Image** 可用
- 实际模型名称是 `gemini-2.5-flash-preview-image`（带 preview）

---

### 问题 2: API 配额耗尽 (429 错误)

```
429 RESOURCE_EXHAUSTED
You exceeded your current quota
Quota exceeded for metric: generate_content_free_tier_requests
```

**原因**：
- 免费版 API 有严格的配额限制
- 每天限制请求次数
- 已经用完今天的配额

---

## ✅ 修正方案

### 方案 1: 只使用 Flash 模型（推荐）

由于 Pro 模型暂不可用，建议只使用 Flash 模型：

#### 修改配置

编辑 `server/services/config_service.py`：

```python
'gemini': {
    'models': {
        # 只保留 Flash 模型
        'gemini-2.5-flash-preview-image': {'type': 'image'},
        # 移除 Pro 模型（暂不可用）
        # 'gemini-2.5-pro-image': {'type': 'image'},
    },
    'url': 'https://generativelanguage.googleapis.com/v1beta',
    'api_key': '',
    'use_vertexai': False,
    'project': '',
    'location': 'us-central1',
},
```

#### 修改工具文件

**方式A**：只保留 Flash 工具

1. 删除或注释掉 `server/tools/generate_image_by_gemini_2_5_pro.py`
2. 在 `server/services/tool_service.py` 中移除 Pro 工具的导入和注册

**方式B**：将 Pro 工具也指向 Flash 模型（临时方案）

编辑 `server/tools/generate_image_by_gemini_2_5_pro.py`：

```python
# 临时使用 Flash 模型
return await generate_image_with_provider(
    canvas_id=canvas_id,
    session_id=session_id,
    provider='gemini',
    model='gemini-2.5-flash-preview-image',  # ← 改为 Flash
    prompt=prompt,
    aspect_ratio=aspect_ratio,
    input_images=input_images,
)
```

---

### 方案 2: 解决配额问题

#### 选项 A: 等待配额重置

免费版配额会在每天 UTC 时间 00:00 重置，等待后可继续使用。

#### 选项 B: 升级到付费版

1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 升级到付费计划
3. 获得更高的配额

#### 选项 C: 使用 Vertex AI

Vertex AI 提供更高的配额：

编辑 `server/user_data/config.toml`：

```toml
[gemini]
use_vertexai = true
project = "your-gcp-project-id"
location = "us-central1"
api_key = ""  # Vertex AI 不需要
```

**前提**：
- 需要有 GCP 账号
- 配置好服务账号认证
- 设置环境变量 `GOOGLE_APPLICATION_CREDENTIALS`

---

## 🔧 立即修复步骤

### Step 1: 更新模型配置

```bash
# 编辑配置文件
code server/services/config_service.py
```

找到 Gemini 配置，修改为：

```python
'gemini': {
    'models': {
        # 使用正确的模型名称（带 preview）
        'gemini-2.5-flash-preview-image': {'type': 'image'},
    },
    'url': 'https://generativelanguage.googleapis.com/v1beta',
    'api_key': '',
    'use_vertexai': False,
    'project': '',
    'location': 'us-central1',
},
```

---

### Step 2: 更新 Flash 工具

编辑 `server/tools/generate_image_by_gemini_2_5_flash.py`：

```python
return await generate_image_with_provider(
    canvas_id=canvas_id,
    session_id=session_id,
    provider='gemini',
    model='gemini-2.5-flash-preview-image',  # ← 添加 preview
    prompt=prompt,
    aspect_ratio=aspect_ratio,
    input_images=input_images,
)
```

---

### Step 3: 禁用 Pro 工具（临时）

编辑 `server/services/tool_service.py`，注释掉 Pro 工具：

```python
# ============ Gemini 工具 ============
"generate_image_by_gemini_2_5_flash": {
    "display_name": "Gemini 2.5 Flash Image",
    "type": "image",
    "provider": "gemini",
    "tool_function": generate_image_by_gemini_2_5_flash,
},
# 暂时禁用 Pro 工具（模型不可用）
# "generate_image_by_gemini_2_5_pro": {
#     "display_name": "Gemini 2.5 Pro Image",
#     "type": "image",
#     "provider": "gemini",
#     "tool_function": generate_image_by_gemini_2_5_pro,
# },
```

---

### Step 4: 等待配额重置

在配额重置前，可以：

1. **查看配额使用情况**：
   访问 https://ai.dev/usage?tab=rate-limit

2. **查看重置时间**：
   错误信息中会显示 `Please retry in XXs`

3. **明天再测试**：
   等到明天 UTC 00:00 后配额会重置

---

## 🧪 修正后的测试流程

### 测试 1: 快速验证（不调用 API）

```bash
python tests/test_gemini_quick.py
```

### 测试 2: 单次生成测试

创建简单测试脚本 `test_single.py`：

```python
import asyncio
from services.config_service import config_service
from tools.image_providers.gemini_provider import GeminiImageProvider

async def test():
    await config_service.initialize()
    provider = GeminiImageProvider()

    try:
        print("🎨 生成测试图片...")
        mime_type, width, height, filename = await provider.generate(
            prompt="A simple red circle",
            model="gemini-2.5-flash-preview-image",
            aspect_ratio="1:1"
        )
        print(f"✅ 成功: {filename} ({width}x{height})")
    except Exception as e:
        print(f"❌ 失败: {e}")

asyncio.run(test())
```

运行：
```bash
python test_single.py
```

---

## 📊 当前可用的模型

根据测试结果，目前可用的模型：

| 模型名称 | 状态 | 说明 |
|---------|------|------|
| `gemini-2.5-flash-preview-image` | ✅ 可用 | 需要加 `-preview` |
| `gemini-2.5-pro-image` | ❌ 不可用 | 404 错误 |
| `gemini-2.0-flash-image` | ❓ 未测试 | 可能可用 |

---

## 📝 更新后的配置示例

完整的 `config.toml` 配置：

```toml
[gemini]
url = "https://generativelanguage.googleapis.com/v1beta"
api_key = "your-api-key-here"
use_vertexai = false
project = ""
location = "us-central1"

# 注意：不需要手动配置 models，由代码管理
```

---

## ⚠️ 配额限制说明

**免费版限制**：
- 每天有限的请求次数
- 每分钟请求频率限制
- Token 数量限制

**建议**：
- 开发测试时谨慎使用 API
- 避免运行大量测试
- 考虑升级到付费版

---

## 🔄 后续步骤

1. **立即执行**：
   - 修改模型名称为 `gemini-2.5-flash-preview-image`
   - 禁用 Pro 工具

2. **明天测试**：
   - 等待配额重置
   - 运行基础测试验证

3. **长期计划**：
   - 关注 Gemini 2.5 Pro Image 发布
   - 考虑升级到付费版
   - 或使用 Vertex AI

---

## 📧 需要帮助？

- 查看 [Gemini API 文档](https://ai.google.dev/gemini-api/docs)
- 查看 [配额限制说明](https://ai.google.dev/gemini-api/docs/rate-limits)
- 访问 [配额使用仪表板](https://ai.dev/usage)
