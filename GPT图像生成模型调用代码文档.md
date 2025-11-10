# GPT图像生成模型调用代码文档

## 📋 目录

1. [概述](#概述)
2. [代码结构](#代码结构)
3. [核心代码实现](#核心代码实现)
4. [调用流程](#调用流程)
5. [支持的模型](#支持的模型)
6. [配置说明](#配置说明)
7. [使用示例](#使用示例)

---

## 🎯 概述

项目支持通过多种方式调用GPT等图像生成模型：

1. **通过Jaaz Provider调用GPT Image 1** (推荐)
   - 使用 `generate_image_by_gpt_image_1_jaaz` 工具
   - 支持多张输入图像
   - 自动降级到云任务

2. **直接调用OpenAI API**
   - 使用 `OpenAIImageProvider`
   - 支持DALL-E模型
   - 支持图像编辑

---

## 📁 代码结构

```
server/
├── tools/
│   ├── generate_image_by_gpt_image_1_jaaz.py  # GPT图像生成工具
│   ├── image_providers/
│   │   ├── image_base_provider.py              # Provider基类
│   │   ├── jaaz_provider.py                    # Jaaz Provider (支持GPT Image 1)
│   │   └── openai_provider.py                  # OpenAI Provider (直接调用OpenAI)
│   └── utils/
│       └── image_generation_core.py            # 图像生成核心函数
└── services/
    └── tool_service.py                         # 工具注册服务
```

---

## 🔧 核心代码实现

### 1. GPT图像生成工具

**文件**: `server/tools/generate_image_by_gpt_image_1_jaaz.py`

```python
from typing import Annotated
from pydantic import BaseModel, Field
from langchain_core.tools import tool, InjectedToolCallId
from langchain_core.runnables import RunnableConfig
from tools.utils.image_generation_core import generate_image_with_provider

class GenerateImageByGptImage1InputSchema(BaseModel):
    prompt: str = Field(
        description="Required. The prompt for image generation. If you want to edit an image, please describe what you want to edit in the prompt."
    )
    aspect_ratio: str = Field(
        description="Required. Aspect ratio of the image, only these values are allowed: 1:1, 16:9, 4:3, 3:4, 9:16. Choose the best fitting aspect ratio according to the prompt. Best ratio for posters is 3:4"
    )
    input_images: list[str] | None = Field(
        default=None,
        description="Optional; One or multiple images to use as reference. Pass a list of image_id here, e.g. ['im_jurheut7.png', 'im_hfuiut78.png']. Best for image editing cases like: Editing specific parts of the image, Removing specific objects, Maintaining visual elements across scenes (character/object consistency), Generating new content in the style of the reference (style transfer), etc."
    )
    tool_call_id: Annotated[str, InjectedToolCallId]

@tool("generate_image_by_gpt_image_1_jaaz",
      description="Generate an image by gpt image model using text prompt or optionally pass images for reference or for editing. Use this model if you need to use multiple input images as reference. Supports multiple providers with automatic fallback.",
      args_schema=GenerateImageByGptImage1InputSchema)
async def generate_image_by_gpt_image_1_jaaz(
    prompt: str,
    aspect_ratio: str,
    config: RunnableConfig,
    tool_call_id: Annotated[str, InjectedToolCallId],
    input_images: list[str] | None = None,
) -> str:
    """GPT图像生成工具函数
    
    Args:
        prompt: 图像生成提示词
        aspect_ratio: 图像长宽比 (1:1, 16:9, 4:3, 3:4, 9:16)
        config: LangGraph运行配置，包含canvas_id和session_id
        tool_call_id: 工具调用ID
        input_images: 可选的输入图像列表（用于图像编辑或参考）
    
    Returns:
        str: 生成结果消息，包含图像ID和URL
    """
    # 从配置中获取上下文信息
    ctx = config.get('configurable', {})
    canvas_id = ctx.get('canvas_id', '')
    session_id = ctx.get('session_id', '')
    
    # 调用图像生成核心函数
    return await generate_image_with_provider(
        canvas_id=canvas_id,
        session_id=session_id,
        provider='jaaz',                    # 使用Jaaz Provider
        model='openai/gpt-image-1',        # GPT Image 1模型
        prompt=prompt,
        aspect_ratio=aspect_ratio,
        input_images=input_images,
    )
```

**关键特性**:
- ✅ 支持文本到图像生成
- ✅ 支持图像编辑（单张或多张输入图像）
- ✅ 支持多种长宽比
- ✅ 自动降级到云任务（如果API调用失败）

---

### 2. 图像生成核心函数

**文件**: `server/tools/utils/image_generation_core.py`

```python
async def generate_image_with_provider(
    canvas_id: str,
    session_id: str,
    provider: str,
    model: str,
    prompt: str,
    aspect_ratio: str = "1:1",
    input_images: Optional[list[str]] = None,
) -> str:
    """
    通用图像生成函数，支持不同的模型和提供商

    Args:
        canvas_id: 画布ID
        session_id: 会话ID
        provider: 提供商名称 (jaaz, openai, replicate, volces等)
        model: 模型标识符 (如 'openai/gpt-image-1', 'google/imagen-4')
        prompt: 图像生成提示词
        aspect_ratio: 图像长宽比
        input_images: 可选的输入参考图像列表

    Returns:
        str: 生成结果消息
    """
    # 获取提供商实例
    provider_instance = IMAGE_PROVIDERS.get(provider)
    if not provider_instance:
        raise ValueError(f"Unknown provider: {provider}")

    # 处理输入图像
    processed_input_images: list[str] | None = None
    if input_images:
        processed_input_images = []
        for image_path in input_images:
            processed_image = await process_input_image(image_path)
            if processed_image:
                processed_input_images.append(processed_image)

    # 准备元数据
    metadata: Dict[str, Any] = {
        "prompt": prompt,
        "model": model,
        "provider": provider,
        "aspect_ratio": aspect_ratio,
        "input_images": input_images or [],
    }

    # 使用提供商生成图像
    mime_type, width, height, filename = await provider_instance.generate(
        prompt=prompt,
        model=model,
        aspect_ratio=aspect_ratio,
        input_images=processed_input_images,
        metadata=metadata,
    )

    # 保存图像到画布
    image_url = await save_image_to_canvas(
        session_id, canvas_id, filename, mime_type, width, height
    )

    return f"image generated successfully ![image_id: {filename}](http://localhost:{DEFAULT_PORT}{image_url})"
```

---

### 3. Jaaz Provider实现

**文件**: `server/tools/image_providers/jaaz_provider.py`

```python
class JaazImageProvider(ImageProviderBase):
    """Jaaz Cloud image generation provider implementation"""

    async def generate(
        self,
        prompt: str,
        model: str,
        aspect_ratio: str = "1:1",
        input_images: Optional[list[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any
    ) -> tuple[str, int, int, str]:
        """
        Generate image using Jaaz API service
        Supports both Replicate format and OpenAI format models

        Returns:
            tuple[str, int, int, str]: (mime_type, width, height, filename)
        """
        # 检查是否是OpenAI模型
        if model.startswith('openai/'):
            return await self._generate_openai_image(
                prompt=prompt,
                model=model,
                input_images=input_images,
                aspect_ratio=aspect_ratio,
                metadata=metadata,
                **kwargs
            )

        # Replicate兼容逻辑
        return await self._generate_replicate_image(
            prompt=prompt,
            model=model,
            aspect_ratio=aspect_ratio,
            input_images=input_images,
            metadata=metadata,
            **kwargs
        )

    async def _generate_openai_image(
        self,
        prompt: str,
        model: str,
        input_images: Optional[list[str]] = None,
        aspect_ratio: str = "1:1",
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any
    ) -> tuple[str, int, int, str]:
        """
        Generate image using Jaaz API service calling OpenAI model
        Compatible with OpenAI image generation API
        """
        try:
            url = self._build_url()
            headers = self._build_headers()

            # 构建请求数据
            enhanced_prompt = f"{prompt} Aspect ratio: {aspect_ratio}"

            data = {
                "model": model,
                "prompt": enhanced_prompt,
                "n": kwargs.get("num_images", 1),
                "size": 'auto',
                "mask": None,
            }

            # 添加输入图像（如果提供）
            if input_images:
                data["input_images"] = input_images
                print(f"Using {len(input_images)} input images for generation")

            # 发送请求
            res = await self._make_request(url, headers, data)
            return await self._process_response(res, "Jaaz OpenAI", metadata)

        except Exception as e:
            print(f'Error generating image with Jaaz OpenAI: {e}')
            traceback.print_exc()

            # 尝试云任务降级
            print('🦄 Attempting cloud task fallback...')
            try:
                enhanced_prompt = f"{prompt} Aspect ratio: {aspect_ratio}"
                task = await self._wait_for_task_completion(enhanced_prompt)
                if task:
                    print('🦄 Successfully recovered using cloud task')
                    return await self._process_cloud_task_result(task, metadata)
            except Exception as fallback_error:
                print(f'🦄 Cloud task fallback failed: {fallback_error}')

            raise e
```

**关键特性**:
- ✅ 支持OpenAI格式模型（如 `openai/gpt-image-1`）
- ✅ 支持多张输入图像
- ✅ 自动降级到云任务（如果API调用失败）
- ✅ 支持任务搜索和等待机制

---

### 4. OpenAI Provider实现

**文件**: `server/tools/image_providers/openai_provider.py`

```python
class OpenAIImageProvider(ImageProviderBase):
    """OpenAI image generation provider implementation"""

    async def generate(
        self,
        prompt: str,
        model: str,
        aspect_ratio: str = "1:1",
        input_images: Optional[list[str]] = None,
        **kwargs: Any
    ) -> tuple[str, int, int, str]:
        """
        Generate image using OpenAI API

        Returns:
            tuple[str, int, int, str]: (mime_type, width, height, filename)
        """
        config = config_service.app_config.get('openai', {})
        self.api_key = str(config.get("api_key", ""))
        self.base_url = str(config.get("url", ""))

        if not self.api_key:
            raise ValueError("OpenAI API key is not configured")

        # 创建OpenAI客户端
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url or None
        )

        try:
            # 移除openai/前缀（如果存在）
            model = model.replace('openai/', '')

            # 判断是图像编辑还是生成
            if input_images and len(input_images) > 0:
                # 图像编辑模式
                input_image_path = input_images[0]
                full_path = os.path.join(FILES_DIR, input_image_path)

                with open(full_path, 'rb') as image_file:
                    result = self.client.images.edit(
                        model=model,
                        image=image_file,
                        prompt=prompt,
                        n=kwargs.get("num_images", 1)
                    )
            else:
                # 图像生成模式
                # 映射长宽比到尺寸
                size_map = {
                    "1:1": "1024x1024",
                    "16:9": "1792x1024",
                    "9:16": "1024x1792",
                    "4:3": "1024x768",
                    "3:4": "768x1024"
                }
                size = size_map.get(aspect_ratio, "1024x1024")

                result = self.client.images.generate(
                    model=model,
                    prompt=prompt,
                    n=kwargs.get("num_images", 1),
                    size=size,
                )

            # 处理结果
            if not result.data or len(result.data) == 0:
                raise Exception("No image data returned from OpenAI API")

            image_data = result.data[0]

            # 处理不同的响应格式
            if hasattr(image_data, 'b64_json') and image_data.b64_json:
                # Base64响应
                image_b64 = image_data.b64_json
                image_id = generate_image_id()
                mime_type, width, height, extension = await get_image_info_and_save(
                    image_b64, 
                    os.path.join(FILES_DIR, f'{image_id}'), 
                    is_b64=True
                )
            elif hasattr(image_data, 'url') and image_data.url:
                # URL响应
                image_url = image_data.url
                image_id = generate_image_id()
                mime_type, width, height, extension = await get_image_info_and_save(
                    image_url, 
                    os.path.join(FILES_DIR, f'{image_id}')
                )
            else:
                raise Exception("Invalid response format from OpenAI API")

            filename = f'{image_id}.{extension}'
            return mime_type, width, height, filename

        except Exception as e:
            print('Error generating image with OpenAI:', e)
            traceback.print_exc()
            raise e
```

**关键特性**:
- ✅ 直接调用OpenAI API
- ✅ 支持DALL-E模型
- ✅ 支持图像编辑（`images.edit`）
- ✅ 支持多种尺寸

---

## 🔄 调用流程

### 完整调用流程

```
AI Agent调用工具
  ↓
generate_image_by_gpt_image_1_jaaz()
  ↓
generate_image_with_provider()
  ↓
JaazImageProvider.generate()
  ↓
_generate_openai_image() (如果是openai/模型)
  ↓
Jaaz API请求
  ↓
处理响应
  ↓
保存图像到画布
  ↓
返回结果消息
```

### 详细步骤

1. **Agent调用工具**
   - AI Agent决定调用 `generate_image_by_gpt_image_1_jaaz` 工具
   - 传入参数：`prompt`, `aspect_ratio`, `input_images`（可选）

2. **工具函数处理**
   - 从LangGraph配置中获取 `canvas_id` 和 `session_id`
   - 调用 `generate_image_with_provider()`

3. **Provider选择**
   - 根据 `provider` 参数选择Provider实例
   - 对于GPT Image 1，使用 `JaazImageProvider`

4. **API调用**
   - 构建请求URL和Headers
   - 发送POST请求到Jaaz API
   - 请求数据包含：`model`, `prompt`, `aspect_ratio`, `input_images`

5. **响应处理**
   - 解析API响应
   - 下载图像（如果返回URL）
   - 保存图像到本地文件系统

6. **画布保存**
   - 将图像保存到画布
   - 生成图像URL

7. **返回结果**
   - 返回包含图像ID和URL的消息
   - Agent将结果发送给用户

---

## 🎨 支持的模型

### 通过Jaaz Provider

| 模型 | 标识符 | 说明 |
|------|--------|------|
| **GPT Image 1** | `openai/gpt-image-1` | OpenAI GPT图像生成模型，支持多张输入图像 |

### 直接通过OpenAI Provider

| 模型 | 标识符 | 说明 |
|------|--------|------|
| **DALL-E 3** | `dall-e-3` | OpenAI DALL-E 3模型 |
| **DALL-E 2** | `dall-e-2` | OpenAI DALL-E 2模型 |

---

## ⚙️ 配置说明

### 1. Jaaz Provider配置

在 `server/user_data/config.toml` 中配置：

```toml
[jaaz]
url = "https://jaaz.app/api/v1/"
api_key = "your-jaaz-api-key-here"
max_tokens = 8192
```

### 2. OpenAI Provider配置

在 `server/user_data/config.toml` 中配置：

```toml
[openai]
url = "https://api.openai.com/v1/"
api_key = "sk-your-openai-api-key-here"
max_tokens = 8192
```

### 3. 工具注册

工具在 `server/services/tool_service.py` 中注册：

```python
TOOL_MAPPING: Dict[str, ToolInfo] = {
    "generate_image_by_gpt_image_1_jaaz": {
        "display_name": "GPT Image 1",
        "type": "image",
        "provider": "jaaz",
        "tool_function": generate_image_by_gpt_image_1_jaaz,
    },
    # ... 其他工具
}
```

**重要**: 只有当Provider的 `api_key` 配置存在时，工具才会被注册。

---

## 💡 使用示例

### 示例1: 文本生成图像

```python
# AI Agent调用
result = await generate_image_by_gpt_image_1_jaaz(
    prompt="A beautiful sunset over the ocean",
    aspect_ratio="16:9",
    config=config,
    tool_call_id="tool_call_123"
)

# 返回结果
# "image generated successfully ![image_id: im_abc123.png](http://localhost:57988/api/files/im_abc123.png)"
```

### 示例2: 图像编辑（单张输入图像）

```python
# AI Agent调用
result = await generate_image_by_gpt_image_1_jaaz(
    prompt="Add a rainbow in the sky",
    aspect_ratio="16:9",
    input_images=["im_existing_image.png"],
    config=config,
    tool_call_id="tool_call_456"
)
```

### 示例3: 多张输入图像（风格迁移）

```python
# AI Agent调用
result = await generate_image_by_gpt_image_1_jaaz(
    prompt="Generate a new image in the style of the reference images",
    aspect_ratio="1:1",
    input_images=["im_ref1.png", "im_ref2.png", "im_ref3.png"],
    config=config,
    tool_call_id="tool_call_789"
)
```

---

## 🔍 代码位置总结

| 功能 | 文件路径 |
|------|---------|
| **GPT图像生成工具** | `server/tools/generate_image_by_gpt_image_1_jaaz.py` |
| **图像生成核心函数** | `server/tools/utils/image_generation_core.py` |
| **Jaaz Provider** | `server/tools/image_providers/jaaz_provider.py` |
| **OpenAI Provider** | `server/tools/image_providers/openai_provider.py` |
| **Provider基类** | `server/tools/image_providers/image_base_provider.py` |
| **工具注册** | `server/services/tool_service.py` |

---

## 🚀 如何启用GPT图像生成

1. **配置API密钥**
   - 编辑 `server/user_data/config.toml`
   - 添加 `jaaz` provider的 `api_key`

2. **重启服务器**
   - 工具服务会自动注册工具

3. **在AI对话中使用**
   - 告诉AI助手："生成一张图片"
   - AI会自动调用 `generate_image_by_gpt_image_1_jaaz` 工具

---

## 📝 注意事项

1. **API密钥配置**
   - 确保 `jaaz` provider的 `api_key` 已配置
   - 否则工具不会被注册

2. **输入图像格式**
   - 输入图像应该是已上传到画布的图像ID
   - 格式：`['im_abc123.png', 'im_def456.png']`

3. **长宽比支持**
   - 支持的长宽比：`1:1`, `16:9`, `4:3`, `3:4`, `9:16`
   - 海报推荐使用 `3:4`

4. **错误处理**
   - 如果API调用失败，会自动尝试云任务降级
   - 查看服务器日志获取详细错误信息

---

**总结**: GPT图像生成模型通过 `generate_image_by_gpt_image_1_jaaz` 工具调用，使用Jaaz Provider访问 `openai/gpt-image-1` 模型。确保在配置文件中添加了 `jaaz` provider的API密钥即可使用。

