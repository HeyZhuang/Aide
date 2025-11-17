from typing import Annotated
from pydantic import BaseModel, Field
from langchain_core.tools import tool, InjectedToolArg  # type: ignore
from langchain_core.runnables import RunnableConfig
from tools.utils.image_generation_core import generate_image_with_provider


class GenerateImageByIdeogram3InputSchema(BaseModel):
    prompt: str = Field(
        description="Required. The prompt for image generation. If you want to edit an image, please describe what you want to edit in the prompt."
    )
    aspect_ratio: str = Field(
        description="Required. Aspect ratio of the image, only these values are allowed: 1:1, 16:9, 4:3, 3:4, 9:16. Choose the best fitting aspect ratio according to the prompt. Best ratio for posters is 3:4"
    )
    tool_call_id: Annotated[str, InjectedToolArg]


@tool(args_schema=GenerateImageByIdeogram3InputSchema)
async def generate_image_by_ideogram3_bal_jaaz(args_schema=GenerateImageByIdeogram3InputSchema) ->  str:
    """Generate Image By Ideogram3 Bal Jaaz tool function."""
    ctx = config.get('configurable', {})
    canvas_id = ctx.get('canvas_id', '')
    session_id = ctx.get('session_id', '')

    return await generate_image_with_provider(
        canvas_id=canvas_id,
        session_id=session_id,
        provider='jaaz',
        prompt=prompt,
        aspect_ratio=aspect_ratio,
        model="ideogram-ai/ideogram-v3-balanced",
        input_images=None,
    )


# Export the tool for easy import
__all__ = ["generate_image_by_ideogram3_bal_jaaz"]
