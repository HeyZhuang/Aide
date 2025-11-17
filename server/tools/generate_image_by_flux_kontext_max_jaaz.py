from typing import Annotated
from pydantic import BaseModel, Field
from langchain_core.tools import tool, InjectedToolArg  # type: ignore
from langchain_core.runnables import RunnableConfig
from tools.utils.image_generation_core import generate_image_with_provider

class GenerateImageByFluxKontextMaxInputSchema(BaseModel):
    prompt: str = Field(
        description="Required. The prompt for image generation. If you want to edit an image, please describe what you want to edit in the prompt."
    )
    aspect_ratio: str = Field(
        description="Required. Aspect ratio of the image, only these values are allowed: 1:1, 16:9, 4:3, 3:4, 9:16. Choose the best fitting aspect ratio according to the prompt. Best ratio for posters is 3:4"
    )
    input_images: list[str]| None = Field(
        default=None,
        description="Optional; Image to use as reference. Only one image is allowed, e.g. ['im_jurheut7.png']. Best for image editing cases like: Editing specific parts of the image, Removing specific objects, Maintaining visual elements across scenes (character/object consistency), Generating new content in the style of the reference (style transfer), etc."
    )
    tool_call_id: Annotated[str, InjectedToolArg]


@tool(args_schema=GenerateImageByFluxKontextMaxInputSchema)
async def generate_image_by_flux_kontext_max(
    prompt: str,
    aspect_ratio: str,
    config: RunnableConfig,
    tool_call_id: Annotated[str, InjectedToolArg],
    input_images: list[str] | None = None,
) -> str:
    """
    Generate an image using Flux Kontext Max model via the provider framework
    """
    ctx = config.get('configurable', {})
    canvas_id = ctx.get('canvas_id', '')
    session_id = ctx.get('session_id', '')

    return await generate_image_with_provider(
        canvas_id=canvas_id,
        session_id=session_id,
        provider='jaaz',
        model="black-forest-labs/flux-kontext-max",
        prompt=prompt,
        aspect_ratio=aspect_ratio,
        input_images=input_images,
    )

# Export the tool for easy import
__all__ = ["generate_image_by_flux_kontext_max"]
