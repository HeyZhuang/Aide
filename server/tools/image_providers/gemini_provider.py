"""
Gemini Image Provider - Google Gemini 2.5 图像生成提供商

本模块实现了 Google Gemini 2.5 系列图像生成模型的接入。
支持的模型：
- gemini-2.5-flash-image: 快速图像生成，适合快速原型和迭代
- gemini-2.5-pro-image: 高质量图像生成，适合专业用途

参考文档：
- https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image
- https://ai.google.dev/gemini-api/docs
"""

import os
import base64
import mimetypes
from typing import Optional, List, Any, Dict, Tuple
from PIL import Image

from google import genai
from google.genai import types

from .image_base_provider import ImageProviderBase
from ..utils.image_utils import generate_image_id
from services.config_service import FILES_DIR, config_service


class GeminiImageProvider(ImageProviderBase):
    """
    Google Gemini 图像生成提供商

    实现了基于 Google Gemini API 的图像生成功能，支持：
    - 文本生成图片（Text-to-Image）
    - 图片编辑（Image-to-Image）
    - 多图片参考
    - 自定义宽高比

    Attributes:
        None (配置从 config_service 动态读取)

    Methods:
        generate: 生成图片的主要方法
        _get_client: 创建 Gemini 客户端
        _prepare_contents: 准备 API 请求内容
        _extract_and_save_image: 提取并保存生成的图片
    """

    def __init__(self):
        """初始化 Gemini Provider"""
        pass

    def _get_client(self) -> genai.Client:
        """
        创建并返回 Gemini API 客户端

        根据配置自动选择：
        - Google AI Studio API (个人用户，使用 api_key)
        - Vertex AI (企业用户，使用 project + location)

        Returns:
            genai.Client: 配置好的 Gemini 客户端

        Raises:
            ValueError: 当配置缺失或无效时
        """
        # 从配置服务获取 Gemini 配置
        config = config_service.app_config.get('gemini', {})

        # 判断使用哪种认证方式
        use_vertexai = config.get('use_vertexai', False)

        if use_vertexai:
            # Vertex AI 模式（企业用户）
            project = config.get('project')
            location = config.get('location', 'us-central1')

            if not project:
                raise ValueError(
                    "Gemini Vertex AI mode requires 'project' in config. "
                    "Please set it in config.toml under [gemini] section."
                )

            print(f"🔵 Using Gemini Vertex AI (project: {project}, location: {location})")
            return genai.Client(
                vertexai=True,
                project=project,
                location=location,
            )
        else:
            # Google AI Studio 模式（个人用户）
            api_key = config.get('api_key')

            if not api_key:
                raise ValueError(
                    "Gemini API key is required. "
                    "Please set 'api_key' in config.toml under [gemini] section."
                )

            print(f"🟢 Using Gemini AI Studio API")
            return genai.Client(api_key=api_key)

    def _prepare_contents(
        self,
        prompt: str,
        input_images: Optional[List[str]] = None
    ) -> List[Any]:
        """
        准备 Gemini API 请求的内容列表

        Args:
            prompt: 文本提示词
            input_images: 输入图片路径列表（可选）

        Returns:
            List[Any]: 包含图片和文本的内容列表

        Note:
            内容顺序：图片在前，文本在后
            这样可以让模型更好地理解图片上下文
        """
        contents: List[Any] = []

        # 1. 添加输入图片（如果有）
        if input_images:
            for img_path in input_images:
                try:
                    # 读取并转换为 PIL Image 对象
                    pil_image = Image.open(img_path)
                    contents.append(pil_image)
                    print(f"📷 Added input image: {img_path} (size: {pil_image.size})")
                except Exception as e:
                    print(f"⚠️ Failed to load image {img_path}: {e}")

        # 2. 添加文本提示词
        contents.append(prompt)
        print(f"💬 Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")

        return contents

    def _extract_and_save_image(
        self,
        response: Any,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, int, int, str]:
        """
        从 Gemini API 响应中提取并保存图片

        Args:
            response: Gemini API 响应对象
            metadata: 要保存到图片元数据的信息

        Returns:
            Tuple[str, int, int, str]: (mime_type, width, height, filename)

        Raises:
            Exception: 当响应中没有图片时
        """
        # 1. 尝试从响应中获取 parts
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and candidate.content:
                parts = candidate.content.parts
            else:
                raise Exception("No content in Gemini response")
        else:
            raise Exception("No candidates in Gemini response")

        # 2. 遍历 parts，查找图片数据
        for part in parts:
            # 检查是否有 inline_data
            if hasattr(part, 'inline_data') and part.inline_data:
                image_data = part.inline_data.data
                mime_type = part.inline_data.mime_type or "image/png"

                # 3. 生成文件名和路径
                image_id = generate_image_id()
                ext = mime_type.split('/')[-1]  # 从 mime_type 提取扩展名
                filename = f"{image_id}.{ext}"
                filepath = os.path.join(FILES_DIR, filename)

                # 4. 保存图片
                with open(filepath, "wb") as f:
                    if isinstance(image_data, bytes):
                        # 如果是字节数据，直接写入
                        f.write(image_data)
                    else:
                        # 如果是 base64 字符串，先解码
                        binary_data = base64.b64decode(image_data)
                        f.write(binary_data)

                # 5. 获取图片尺寸
                img = Image.open(filepath)
                width, height = img.size

                # 6. 保存元数据（如果提供）
                if metadata:
                    try:
                        from PIL import PngImagePlugin
                        pnginfo = PngImagePlugin.PngInfo()
                        for key, value in metadata.items():
                            pnginfo.add_text(key, str(value))
                        img.save(filepath, pnginfo=pnginfo)
                    except Exception as e:
                        print(f"⚠️ Failed to save metadata: {e}")

                print(f"✅ Saved Gemini image: {filename} ({width}x{height})")
                return mime_type, width, height, filename

            # 7. 尝试使用 as_image() 方法（备用方案）
            elif hasattr(part, 'as_image'):
                try:
                    image = part.as_image()
                    image_id = generate_image_id()
                    filename = f"{image_id}.png"
                    filepath = os.path.join(FILES_DIR, filename)

                    image.save(filepath)
                    width, height = image.size

                    print(f"✅ Saved Gemini image (via as_image): {filename}")
                    return "image/png", width, height, filename
                except Exception as e:
                    print(f"⚠️ Failed to use as_image(): {e}")

        # 8. 如果没有找到图片，抛出异常
        raise Exception("No image data found in Gemini response")

    async def generate(
        self,
        prompt: str,
        model: str,
        aspect_ratio: str = "1:1",
        input_images: Optional[list[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any
    ) -> Tuple[str, int, int, str]:
        """
        生成图片（主要方法）

        Args:
            prompt: 图像生成提示词，描述想要生成的内容
            model: 模型名称，如 "gemini-2.5-flash-image" 或 "gemini-2.5-pro-image"
            aspect_ratio: 图片宽高比，支持：
                - 1:1 (正方形)
                - 2:3, 3:2 (传统照片)
                - 3:4, 4:3 (常见显示器)
                - 4:5, 5:4 (Instagram)
                - 9:16, 16:9 (视频/宽屏)
                - 21:9 (超宽屏)
            input_images: 输入图片路径列表（用于图片编辑或参考）
            metadata: 要保存到图片 EXIF 的元数据
            **kwargs: 额外参数（保留用于扩展）

        Returns:
            Tuple[str, int, int, str]: (mime_type, width, height, filename)
                - mime_type: 图片 MIME 类型，如 "image/png"
                - width: 图片宽度（像素）
                - height: 图片高度（像素）
                - filename: 保存的文件名，如 "im_abc123.png"

        Raises:
            ValueError: 当配置缺失或参数无效时
            Exception: 当 API 调用失败或响应异常时

        Example:
            >>> provider = GeminiImageProvider()
            >>> mime_type, width, height, filename = await provider.generate(
            ...     prompt="A beautiful sunset",
            ...     model="gemini-2.5-flash-image",
            ...     aspect_ratio="16:9"
            ... )
            >>> print(f"Generated: {filename} ({width}x{height})")
        """
        print(f"🚀 Starting Gemini image generation with model: {model}")

        # 1. 创建客户端
        client = self._get_client()

        # 2. 准备请求内容
        contents = self._prepare_contents(prompt, input_images)

        # 3. 构建生成配置
        generate_config = types.GenerateContentConfig(
            # 指定响应模态：同时返回图片和文本
            response_modalities=["IMAGE", "TEXT"],
            # 图片配置
            image_config=types.ImageConfig(
                aspect_ratio=aspect_ratio,
            ),
        )

        # 4. 调用 Gemini API
        try:
            print(f"📡 Calling Gemini API...")
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=generate_config,
            )
        except Exception as e:
            print(f"❌ Gemini API call failed: {e}")
            raise Exception(f"Gemini image generation failed: {str(e)}")

        # 5. 提取并保存图片
        try:
            return self._extract_and_save_image(response, metadata)
        except Exception as e:
            print(f"❌ Failed to extract/save image: {e}")
            raise


# 导出 Provider 类
__all__ = ["GeminiImageProvider"]
