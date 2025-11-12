# GitHub图像生成代码位置

## 📋 GitHub仓库信息

**仓库地址**: `git@github.com:Pi3AI/psd-canvas-jaaz.git`  
**GitHub URL**: https://github.com/Pi3AI/psd-canvas-jaaz

---

## 🔍 图像生成代码位置

### 1. GPT图像生成工具

**文件路径**: `server/tools/generate_image_by_gpt_image_1_jaaz.py`

**GitHub链接**: https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/generate_image_by_gpt_image_1_jaaz.py

**关键代码**:
- 第22-47行: `generate_image_by_gpt_image_1_jaaz` 工具函数定义
- 第8-19行: `GenerateImageByGptImage1InputSchema` 输入模式定义

**功能**: GPT图像生成工具，支持文本生成图像和图像编辑

---

### 2. 图像生成核心函数

**文件路径**: `server/tools/utils/image_generation_core.py`

**GitHub链接**: https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/utils/image_generation_core.py

**关键代码**:
- 第24-30行: `IMAGE_PROVIDERS` 字典，注册所有Provider
- 第33-97行: `generate_image_with_provider()` 通用图像生成函数

**功能**: 图像生成核心函数，统一调用不同Provider

---

### 3. Provider实现

#### 3.1 Jaaz Provider

**文件路径**: `server/tools/image_providers/jaaz_provider.py`

**GitHub链接**: https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/image_providers/jaaz_provider.py

**关键代码**:
- 第29-393行: `JaazImageProvider` 类实现
- 第247-282行: `generate()` 主函数
- 第335-393行: `_generate_openai_image()` GPT图像生成实现

**功能**: Jaaz Provider实现，支持GPT Image 1模型

#### 3.2 OpenAI Provider

**文件路径**: `server/tools/image_providers/openai_provider.py`

**GitHub链接**: https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/image_providers/openai_provider.py

**关键代码**:
- 第11-110行: `OpenAIImageProvider` 类实现
- 第14-21行: `generate()` 主函数
- 第44-56行: 图像编辑模式
- 第58-74行: 图像生成模式

**功能**: 直接调用OpenAI API生成图像

#### 3.3 Provider基类

**文件路径**: `server/tools/image_providers/image_base_provider.py`

**GitHub链接**: https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/image_providers/image_base_provider.py

**关键代码**:
- 第5-30行: `ImageProviderBase` 抽象基类

**功能**: 定义所有Provider的统一接口

---

### 4. 工具注册

**文件路径**: `server/services/tool_service.py`

**GitHub链接**: https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/services/tool_service.py

**关键代码**:
- 第7行: 导入 `generate_image_by_gpt_image_1_jaaz`
- 第57-63行: `TOOL_MAPPING` 中注册GPT图像生成工具
- 第220-234行: `initialize()` 函数，根据API密钥注册工具

**功能**: 工具注册服务，管理所有图像生成工具

---

### 5. Agent配置

**文件路径**: `server/services/langgraph_service/configs/image_vide_creator_config.py`

**GitHub链接**: https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/services/langgraph_service/configs/image_vide_creator_config.py

**关键代码**:
- 第57行: 配置说明，多张输入图像时使用 `generate_image_by_gpt_image_1_jaaz`

**功能**: Image Video Creator Agent配置，定义Agent如何使用图像生成工具

---

## 📊 调用链

### 完整调用链

```
1. AI Agent调用工具
   ↓
2. server/tools/generate_image_by_gpt_image_1_jaaz.py
   generate_image_by_gpt_image_1_jaaz()
   ↓
3. server/tools/utils/image_generation_core.py
   generate_image_with_provider()
   ↓
4. server/tools/image_providers/jaaz_provider.py
   JaazImageProvider.generate()
   ↓
5. server/tools/image_providers/jaaz_provider.py
   _generate_openai_image()
   ↓
6. Jaaz API请求
   ↓
7. 处理响应并保存图像
```

---

## 🔗 GitHub文件链接汇总

| 功能 | 文件路径 | GitHub链接 |
|------|---------|-----------|
| **GPT图像生成工具** | `server/tools/generate_image_by_gpt_image_1_jaaz.py` | [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/generate_image_by_gpt_image_1_jaaz.py) |
| **图像生成核心函数** | `server/tools/utils/image_generation_core.py` | [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/utils/image_generation_core.py) |
| **Jaaz Provider** | `server/tools/image_providers/jaaz_provider.py` | [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/image_providers/jaaz_provider.py) |
| **OpenAI Provider** | `server/tools/image_providers/openai_provider.py` | [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/image_providers/openai_provider.py) |
| **Provider基类** | `server/tools/image_providers/image_base_provider.py` | [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/image_providers/image_base_provider.py) |
| **工具注册** | `server/services/tool_service.py` | [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/services/tool_service.py) |
| **Agent配置** | `server/services/langgraph_service/configs/image_vide_creator_config.py` | [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/services/langgraph_service/configs/image_vide_creator_config.py) |

---

## 📝 其他相关图像生成工具

### 其他图像生成工具文件

| 工具 | 文件路径 | GitHub链接 |
|------|---------|-----------|
| **Imagen 4 (Jaaz)** | `server/tools/generate_image_by_imagen_4_jaaz.py` | [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/generate_image_by_imagen_4_jaaz.py) |
| **Recraft v3 (Jaaz)** | `server/tools/generate_image_by_recraft_v3_jaaz.py` | [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/generate_image_by_recraft_v3_jaaz.py) |
| **Flux Kontext Pro (Jaaz)** | `server/tools/generate_image_by_flux_kontext_pro_jaaz.py` | [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/generate_image_by_flux_kontext_pro_jaaz.py) |
| **Flux Kontext Max (Jaaz)** | `server/tools/generate_image_by_flux_kontext_max_jaaz.py` | [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/generate_image_by_flux_kontext_max_jaaz.py) |
| **Midjourney (Jaaz)** | `server/tools/generate_image_by_midjourney_jaaz.py` | [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/generate_image_by_imagen_4_jaaz.py) |
| **Doubao Seedream 3 (Jaaz)** | `server/tools/generate_image_by_doubao_seedream_3_jaaz.py` | [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/generate_image_by_doubao_seedream_3_jaaz.py) |
| **Ideogram 3 Balanced (Jaaz)** | `server/tools/generate_image_by_ideogram3_bal_jaaz.py` | [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/generate_image_by_ideogram3_bal_jaaz.py) |

---

## 🔍 关键代码片段位置

### 1. GPT图像生成工具定义

**文件**: `server/tools/generate_image_by_gpt_image_1_jaaz.py`

```python
# 第22-47行
@tool("generate_image_by_gpt_image_1_jaaz",
      description="Generate an image by gpt image model...",
      args_schema=GenerateImageByGptImage1InputSchema)
async def generate_image_by_gpt_image_1_jaaz(
    prompt: str,
    aspect_ratio: str,
    config: RunnableConfig,
    tool_call_id: Annotated[str, InjectedToolCallId],
    input_images: list[str] | None = None,
) -> str:
    # ... 实现代码
```

**GitHub链接**: https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/generate_image_by_gpt_image_1_jaaz.py#L22-L47

---

### 2. 图像生成核心函数

**文件**: `server/tools/utils/image_generation_core.py`

```python
# 第33-97行
async def generate_image_with_provider(
    canvas_id: str,
    session_id: str,
    provider: str,
    model: str,
    prompt: str,
    aspect_ratio: str = "1:1",
    input_images: Optional[list[str]] = None,
) -> str:
    # ... 实现代码
```

**GitHub链接**: https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/utils/image_generation_core.py#L33-L97

---

### 3. Jaaz Provider GPT图像生成

**文件**: `server/tools/image_providers/jaaz_provider.py`

```python
# 第335-393行
async def _generate_openai_image(
    self,
    prompt: str,
    model: str,
    input_images: Optional[list[str]] = None,
    aspect_ratio: str = "1:1",
    metadata: Optional[Dict[str, Any]] = None,
    **kwargs: Any
) -> tuple[str, int, int, str]:
    # ... 实现代码
```

**GitHub链接**: https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/tools/image_providers/jaaz_provider.py#L335-L393

---

### 4. 工具注册

**文件**: `server/services/tool_service.py`

```python
# 第57-63行
"generate_image_by_gpt_image_1_jaaz": {
    "display_name": "GPT Image 1",
    "type": "image",
    "provider": "jaaz",
    "tool_function": generate_image_by_gpt_image_1_jaaz,
},
```

**GitHub链接**: https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/services/tool_service.py#L57-L63

---

## 🚀 快速访问

### 在GitHub中搜索

1. **搜索GPT图像生成工具**:
   ```
   https://github.com/Pi3AI/psd-canvas-jaaz/search?q=generate_image_by_gpt_image_1_jaaz
   ```

2. **搜索图像生成核心函数**:
   ```
   https://github.com/Pi3AI/psd-canvas-jaaz/search?q=generate_image_with_provider
   ```

3. **搜索Jaaz Provider**:
   ```
   https://github.com/Pi3AI/psd-canvas-jaaz/search?q=JaazImageProvider
   ```

---

## 📂 目录结构

```
server/
├── tools/
│   ├── generate_image_by_gpt_image_1_jaaz.py    # GPT图像生成工具
│   ├── generate_image_by_imagen_4_jaaz.py         # Imagen 4工具
│   ├── generate_image_by_recraft_v3_jaaz.py      # Recraft v3工具
│   ├── ... (其他图像生成工具)
│   ├── image_providers/
│   │   ├── image_base_provider.py                # Provider基类
│   │   ├── jaaz_provider.py                      # Jaaz Provider
│   │   ├── openai_provider.py                    # OpenAI Provider
│   │   ├── replicate_provider.py                 # Replicate Provider
│   │   ├── volces_provider.py                    # Volces Provider
│   │   └── wavespeed_provider.py                 # Wavespeed Provider
│   └── utils/
│       └── image_generation_core.py              # 图像生成核心函数
└── services/
    ├── tool_service.py                            # 工具注册服务
    └── langgraph_service/
        └── configs/
            └── image_vide_creator_config.py      # Agent配置
```

---

## 🔗 相关文件链接

### 配置文件

- **配置文件**: `server/user_data/config.toml` (不在Git中，本地文件)
- **配置服务**: `server/services/config_service.py` - [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/services/config_service.py)

### Agent相关

- **Agent服务**: `server/services/langgraph_service/agent_service.py` - [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/services/langgraph_service/agent_service.py)
- **Agent管理器**: `server/services/langgraph_service/agent_manager.py` - [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/services/langgraph_service/agent_manager.py)
- **流处理器**: `server/services/langgraph_service/StreamProcessor.py` - [查看代码](https://github.com/Pi3AI/psd-canvas-jaaz/blob/main/server/services/langgraph_service/StreamProcessor.py)

---

## 📌 总结

所有图像生成相关的代码都在 `server/tools/` 目录下：

1. **工具函数**: `server/tools/generate_image_by_*.py`
2. **Provider实现**: `server/tools/image_providers/*.py`
3. **核心函数**: `server/tools/utils/image_generation_core.py`
4. **工具注册**: `server/services/tool_service.py`

**主要入口**: `server/tools/generate_image_by_gpt_image_1_jaaz.py`

**GitHub仓库**: https://github.com/Pi3AI/psd-canvas-jaaz

