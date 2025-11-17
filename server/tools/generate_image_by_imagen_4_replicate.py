from typing import Annotated
from langchain_core.tools import tool, InjectedToolArg  # type: ignore
from langchain_core.runnables import RunnableConfig
from tools.utils.image_generation_core import generate_image_with_provider
from tools.generate_image_by_imagen_4_jaaz import GenerateImageByImagen4InputSchema


@tool(args_schema=GenerateImageByImagen4InputSchema)
async def generate_image_by_imagen_4_replicate(args_schema=GenerateImageByImagen4InputSchema) ->  str:
    """Generate Image By Imagen 4 Replicate tool function."""
    ctx = config.get('configurable', {})
    canvas_id = ctx.get('canvas_id', '')
    session_id = ctx.get('session_id', '')
    print(f'🛠️ canvas_id {canvas_id} session_id {session_id}')
    return await generate_image_with_provider(
        canvas_id=canvas_id,
        session_id=session_id,
        provider='replicate',
        model='google/imagen-4',
        prompt=prompt,
        aspect_ratio=aspect_ratio,
    )


# Export the tool for easy import
__all__ = ["generate_image_by_imagen_4_replicate"]
