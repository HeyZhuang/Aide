# Gemini 后端测试指南

本文档详细说明如何在后端测试 Gemini 模型集成。

---

## 📋 测试类型

| 测试脚本 | 用途 | 是否调用API | 耗时 | 适用场景 |
|---------|------|------------|------|---------|
| `test_gemini_quick.py` | 快速验证配置和文件 | ❌ 否 | ~2秒 | 初次安装后验证 |
| `test_gemini_basic.py` | 基础功能测试 | ✅ 是 | ~30秒 | 完整功能验证 |
| `test_gemini_advanced.py` | 高级功能和性能 | ✅ 是 | ~5分钟 | 深度测试 |

---

## 🚀 快速开始

### 第一步：快速测试（推荐先做）

**目的**：验证配置和文件是否正确，**不调用 API**，不消耗配额。

```bash
cd D:\company\Pi3AI\psd-canvas-jaaz\server
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
✅ 模型已配置: gemini-2.5-flash-image
✅ 模型已配置: gemini-2.5-pro-image

✅ 所有模型配置正确

📋 测试 3: 检查工具注册
--------------------------------------------------------------
✅ 工具已注册: Gemini 2.5 Flash Image
✅ 工具已注册: Gemini 2.5 Pro Image

📋 测试 4: 检查代码文件
--------------------------------------------------------------
✅ Provider: tools/image_providers/gemini_provider.py
✅ Flash 工具: tools/generate_image_by_gemini_2_5_flash.py
✅ Pro 工具: tools/generate_image_by_gemini_2_5_pro.py

==============================================================
✅ 快速测试全部通过!

下一步:
  1. 运行完整测试: python tests/test_gemini_basic.py
  2. 启动服务器: python main.py
  3. 在前端测试生成图片
==============================================================
```

**如果失败**：
1. 检查 `server/user_data/config.toml` 是否配置了 `[gemini]` 和 `api_key`
2. 确认所有文件都已创建
3. 重启 Python 环境

---

### 第二步：基础功能测试

**目的**：测试基础功能，**会调用 API** 生成一张测试图片。

```bash
cd D:\company\Pi3AI\psd-canvas-jaaz\server
python tests/test_gemini_basic.py
```

**测试内容**：
1. ✅ 配置文件加载
2. ✅ Provider 创建
3. ✅ 模型配置验证
4. ✅ 工具注册检查
5. ✅ Flash 模型生成一张图片

**预期输出**：
```
==============================================================
🧪 Gemini 模型后端测试
==============================================================

==============================================================
🔍 运行测试: 1. 配置加载
==============================================================
✅ PASS: 配置文件加载

==============================================================
🔍 运行测试: 2. Provider 创建
==============================================================
🟢 Using Gemini AI Studio API
✅ PASS: Provider 创建

==============================================================
🔍 运行测试: 3. 模型配置
==============================================================

📋 已配置的 Gemini 模型:
   - gemini-2.5-flash-image (type: image)
   - gemini-2.5-pro-image (type: image)
✅ PASS: 模型配置

==============================================================
🔍 运行测试: 4. 工具注册
==============================================================

🔧 已注册的 Gemini 工具:
   - Gemini 2.5 Flash Image
   - Gemini 2.5 Pro Image
✅ PASS: 工具注册

==============================================================
🔍 运行测试: 5. Flash 模型生成
==============================================================

🎨 开始生成图片（Flash 模型）...
   提示词: A simple red circle
   宽高比: 1:1
🚀 Starting Gemini image generation with model: gemini-2.5-flash-image
🟢 Using Gemini AI Studio API
📷 Added input image: ... (如有)
💬 Prompt: A simple red circle
📡 Calling Gemini API...
✅ Saved Gemini image: im_abc123.png (1024x1024)
   ✅ 生成成功!
   文件名: im_abc123.png
   尺寸: 1024x1024
   格式: image/png
✅ PASS: Flash 模型图片生成

==============================================================
📊 测试总结
==============================================================
总计: 5 个测试
✅ 通过: 5
❌ 失败: 0
通过率: 100.0%
==============================================================
```

**消耗配额**：生成 1 张图片

---

### 第三步：高级功能测试（可选）

**目的**：测试所有功能，**会调用 API 多次**。

```bash
cd D:\company\Pi3AI\psd-canvas-jaaz\server
python tests/test_gemini_advanced.py
```

**测试内容**：
1. ✅ Pro 模型生成
2. ✅ 图片编辑（Image-to-Image）
3. ✅ 不同宽高比（4种）
4. ✅ 性能基准测试（Flash + Pro 各3次）

**消耗配额**：生成约 **12 张图片**

---

## 📊 测试结果说明

### 成功示例

```
✅ PASS: 配置文件加载
✅ PASS: Provider 创建
✅ PASS: Flash 模型图片生成
```

### 失败示例及解决方法

#### 1. 配置文件未找到

```
❌ FAIL: 配置文件加载
   Error: 未找到 Gemini 配置
```

**解决**：
```bash
# 检查 config.toml 是否存在
cd server/user_data
cat config.toml

# 如果没有 [gemini] 部分，添加：
echo "[gemini]" >> config.toml
echo 'api_key = "your-api-key-here"' >> config.toml
```

---

#### 2. API Key 未配置

```
❌ FAIL: 配置文件加载
   Error: 未配置 API Key 且未启用 Vertex AI
```

**解决**：
1. 访问 https://aistudio.google.com/app/apikey
2. 创建 API Key
3. 编辑 `server/user_data/config.toml`：
   ```toml
   [gemini]
   api_key = "your-api-key-here"
   ```

---

#### 3. API 调用失败

```
❌ FAIL: Flash 模型图片生成
   Error: Gemini image generation failed: 403 Forbidden
```

**可能原因**：
- API Key 无效
- 超出配额
- 网络问题
- 区域限制

**解决**：
1. 检查 API Key 是否正确
2. 访问 Google AI Studio 查看配额使用情况
3. 尝试使用 VPN
4. 检查网络连接

---

#### 4. 工具未注册

```
❌ FAIL: 工具注册
   Error: 未注册的工具: Gemini 2.5 Flash Image
   提示: 请检查 config.toml 中是否配置了 [gemini] api_key
```

**解决**：
1. 确认 `config.toml` 中有 `api_key = "..."`
2. 重启服务器
3. 重新运行测试

---

## 🔍 手动测试（可选）

如果自动化测试失败，可以尝试手动测试：

### 测试 1: 检查配置

```bash
cd server
python -c "
import asyncio
from services.config_service import config_service

async def test():
    await config_service.initialize()
    gemini = config_service.app_config.get('gemini', {})
    print('Gemini Config:', gemini)

asyncio.run(test())
"
```

---

### 测试 2: 检查工具注册

```bash
cd server
python -c "
import asyncio
from services.tool_service import tool_service

async def test():
    await tool_service.initialize()
    tools = tool_service.get_all_tools()
    gemini_tools = {k: v for k, v in tools.items() if 'gemini' in k}
    for tool_id, tool_info in gemini_tools.items():
        print(f'{tool_id}: {tool_info.get(\"display_name\")}')

asyncio.run(test())
"
```

---

### 测试 3: 手动生成图片

创建 `manual_test.py`：

```python
import asyncio
from services.config_service import config_service
from tools.image_providers.gemini_provider import GeminiImageProvider

async def test():
    await config_service.initialize()
    provider = GeminiImageProvider()

    print("🎨 Generating image...")
    mime_type, width, height, filename = await provider.generate(
        prompt="A cat",
        model="gemini-2.5-flash-image",
        aspect_ratio="1:1"
    )

    print(f"✅ Success!")
    print(f"   Filename: {filename}")
    print(f"   Size: {width}x{height}")

asyncio.run(test())
```

运行：
```bash
cd server
python manual_test.py
```

---

## 🐛 常见问题排查

### Q1: 测试一直卡住不动

**原因**：可能是网络问题或 API 超时

**解决**：
1. 检查网络连接
2. 尝试使用 VPN
3. 增加超时时间（修改 Provider 代码）
4. 按 `Ctrl+C` 终止，查看错误信息

---

### Q2: ModuleNotFoundError

```
ModuleNotFoundError: No module named 'google'
```

**解决**：
```bash
pip install google-genai
```

---

### Q3: 生成的图片很小

**原因**：Gemini 会根据宽高比自动确定尺寸

**解决**：这是正常的，不需要修改

---

### Q4: 测试生成的图片在哪里？

**位置**：`server/user_data/files/im_xxxxx.png`

**查看**：
```bash
cd server/user_data/files
ls -la im_*.png
```

---

## 📝 测试检查清单

运行测试前，确认以下项目：

- [ ] ✅ 已安装 `google-genai` 包
- [ ] ✅ `config.toml` 中配置了 `[gemini]` 和 `api_key`
- [ ] ✅ API Key 有效且有配额
- [ ] ✅ 网络连接正常
- [ ] ✅ 所有代码文件已创建
- [ ] ✅ 服务器可以正常启动

测试后，确认以下结果：

- [ ] ✅ 快速测试全部通过
- [ ] ✅ 基础测试生成了图片
- [ ] ✅ 图片文件存在于 `user_data/files/`
- [ ] ✅ 日志无报错信息
- [ ] ✅ 工具已注册到系统

---

## 🎯 下一步

测试通过后：

1. **启动服务器**
   ```bash
   cd server
   python main.py
   ```

2. **前端测试**
   - 打开前端界面
   - 输入：`用 Gemini Flash 生成一只猫`
   - 观察是否正确生成图片

3. **查看文档**
   - [集成文档](./gemini-integration.md)
   - [安装指南](./gemini-installation-guide.md)

---

## 📧 需要帮助？

- 查看 [常见问题](./gemini-integration.md#常见问题)
- 提交 [GitHub Issue](https://github.com/your-repo/issues)
- 查阅 [Google Gemini 文档](https://ai.google.dev/gemini-api/docs)
