"""
Gemini 2.5 Flash Image 生成工具

本模块定义了基于 Google Gemini 2.5 Flash Image 模型的图像生成工具。
Flash 模型特点：
- 速度快：通常 5-10 秒生成一张图片
- 成本低：适合大量快速迭代
- 质量好：满足大多数场景需求

使用场景：
- 快速原型设计
- 批量图片生成
- 实时图像编辑
- 低成本应用

相关文档：
- https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image
"""

from typing import Annotated
from pydantic import BaseModel, Field
from langchain_core.tools import tool, InjectedToolCallId
from langchain_core.runnables import RunnableConfig

from tools.utils.image_generation_core import generate_image_with_provider


class GenerateImageByGemini25FlashInputSchema(BaseModel):
    """
    Gemini 2.5 Flash Image 工具的输入参数模式

    Attributes:
        prompt: 图像生成提示词
        aspect_ratio: 图片宽高比
        input_images: 输入参考图片列表（可选）
        tool_call_id: 工具调用ID（由 LangChain 自动注入）
    """

    prompt: str = Field(
        description=(
            "Required. The prompt for image generation. "
            "Describe clearly and specifically what you want to generate or edit. "
            "Examples: "
            "'A serene mountain landscape at sunset with purple sky', "
            "'Transform this image to have a vintage film aesthetic', "
            "'A modern minimalist logo for a coffee shop'"
        )
    )

    aspect_ratio: str = Field(
        description=(
            "Required. Aspect ratio of the generated image. "
            "Allowed values: "
            "1:1 (square), "
            "2:3 or 3:2 (photo), "
            "3:4 or 4:3 (screen), "
            "4:5 or 5:4 (Instagram), "
            "9:16 or 16:9 (video/widescreen), "
            "21:9 (ultrawide). "
            "Choose based on the use case: "
            "- Social media posts: 1:1 or 4:5 "
            "- Posters: 3:4 "
            "- Banners: 16:9 or 21:9"
        )
    )

    input_images: list[str] | None = Field(
        default=None,
        description=(
            "Optional. One or multiple reference images. "
            "Pass a list of image IDs from the canvas, e.g., ['im_abc123.png', 'im_def456.png']. "
            "Use cases: "
            "- Image editing (change colors, style, objects) "
            "- Style transfer (apply the style of reference image) "
            "- Object replacement (replace specific elements) "
            "- Image variation (generate similar images)"
        )
    )

    tool_call_id: Annotated[str, InjectedToolCallId]


@tool(
    "generate_image_by_gemini_2_5_flash",
    description=(
        "Generate or edit images using Google Gemini 2.5 Flash Image model. "
        "This is a fast and cost-effective model suitable for: "
        "- Quick image generation (5-10 seconds) "
        "- Rapid prototyping and iteration "
        "- Image editing and transformation "
        "- Style transfer and variations "
        "Supports both text-to-image (without input_images) and image-to-image (with input_images). "
        "For higher quality images, use the Pro version instead."
    ),
    args_schema=GenerateImageByGemini25FlashInputSchema
)
async def generate_image_by_gemini_2_5_flash(
    prompt: str,
    aspect_ratio: str,
    config: RunnableConfig,
    tool_call_id: Annotated[str, InjectedToolCallId],
    input_images: list[str] | None = None,
) -> str:
    """
    生成或编辑图片（Gemini 2.5 Flash Image 模型）

    本函数是 LangChain Tool 的实际执行函数，会被 AI 代理调用。

    Args:
        prompt: 图像生成或编辑的提示词
        aspect_ratio: 图片宽高比（如 "1:1", "16:9" 等）
        config: LangChain 运行配置，包含 canvas_id 和 session_id
        tool_call_id: 工具调用的唯一标识符（自动注入）
        input_images: 可选的输入图片ID列表（用于图片编辑）

    Returns:
        str: 生成结果消息，包含图片URL和markdown格式的预览

    Raises:
        Exception: 当图片生成失败时

    Example:
        由 AI 代理自动调用：
        >>> # 用户输入: "用 Gemini Flash 生成一只香蕉"
        >>> result = await generate_image_by_gemini_2_5_flash(
        ...     prompt="A ripe yellow banana on a white background",
        ...     aspect_ratio="1:1",
        ...     config={...},
        ...     tool_call_id="call_abc123"
        ... )
        >>> print(result)
        "image generated successfully ![image_id: im_xyz789.png](http://localhost:57988/psd/im_xyz789.png)"
    """
    # 从配置中提取上下文信息
    ctx = config.get('configurable', {})
    canvas_id = ctx.get('canvas_id', '')
    session_id = ctx.get('session_id', '')

    print(f"🛠️ Gemini 2.5 Flash tool called:")
    print(f"   - Canvas ID: {canvas_id}")
    print(f"   - Session ID: {session_id}")
    print(f"   - Tool Call ID: {tool_call_id}")

    # 调用通用图像生成函数
    return await generate_image_with_provider(
        canvas_id=canvas_id,
        session_id=session_id,
        provider='gemini',  # 使用 Gemini Provider
        model='gemini-2.5-flash-image',  # 指定 Flash 模型
        prompt=prompt,
        aspect_ratio=aspect_ratio,
        input_images=input_images,
    )


# 导出工具函数
__all__ = ["generate_image_by_gemini_2_5_flash"]
