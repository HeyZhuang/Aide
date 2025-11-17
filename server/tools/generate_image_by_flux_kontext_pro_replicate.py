from typing import Annotated
from langchain_core.tools import tool, InjectedToolArg  # type: ignore
from langchain_core.runnables import RunnableConfig
from tools.utils.image_generation_core import generate_image_with_provider
from tools.generate_image_by_flux_kontext_pro_jaaz import GenerateImageByFluxKontextProInputSchema


@tool(args_schema=GenerateImageByFluxKontextProInputSchema)
async def generate_image_by_flux_kontext_pro_replicate(args_schema=GenerateImageByFluxKontextProInputSchema) ->  str:
    """Generate Image By Flux Kontext Pro Replicate tool function."""
    ctx = config.get('configurable', {})
    canvas_id = ctx.get('canvas_id', '')
    session_id = ctx.get('session_id', '')
    return await generate_image_with_provider(
        canvas_id=canvas_id,
        session_id=session_id,
        provider='replicate',
        model='black-forest-labs/flux-kontext-pro',
        prompt=prompt,
        aspect_ratio=aspect_ratio,
        input_images=[input_image] if input_image else None,
    )

# Export the tool for easy import
__all__ = ["generate_image_by_flux_kontext_pro_replicate"]
