"""
Template Router - 模板管理路由
提供模板的查询、下载等功能（普通用户和游客）
管理员相关功能已迁移到 manager_route.py
"""
import os
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel

from services.template_service import template_service
from utils.permission_dependency import get_user_role_optional, get_current_user_optional
from utils.logger import get_logger

logger = get_logger("routers.template_router")

router = APIRouter()

# 允许的文件类型
ALLOWED_FILE_TYPES = {
    "psd": "application/vnd.adobe.photoshop",
    "json": "application/json",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "svg": "image/svg+xml",
}


class TemplateResponse(BaseModel):
    """模板响应模型"""
    id: str
    name: str
    description: Optional[str] = None
    file_path: str
    file_type: str
    file_size: int
    thumbnail_path: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    created_by: str
    created_at: str
    updated_at: str



@router.get("/api/templates", response_model=List[TemplateResponse])
async def list_templates(
    category: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    列出模板
    游客可以查看模板列表，但只能看到基本信息（不包含文件路径）
    
    接口名：列出模板
    请求地址：/api/templates
    请求方法：GET
    入参：
      - category: str（查询参数，可选）- 模板分类
      - limit: int（查询参数）- 返回的记录数，默认100
      - offset: int（查询参数）- 跳过的记录数，默认0
    出参：
      - list[TemplateResponse] - 模板列表
    """
    templates = await template_service.list_templates(
        category=category,
        limit=limit,
        offset=offset
    )
    
    user_role = get_user_role_optional(current_user)
    
    # 如果是游客，只返回基本信息（不包含文件路径）
    if user_role == "guest":
        for template in templates:
            template.pop("file_path", None)
            template.pop("thumbnail_path", None)
    
    return templates


@router.get("/api/templates/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    获取模板详情
    游客只能查看基本信息（不包含文件路径）
    
    接口名：获取模板详情
    请求地址：/api/templates/{template_id}
    请求方法：GET
    入参：
      - template_id: str - 模板ID（路径参数）
    出参：
      - TemplateResponse - 模板详细信息
    """
    template = await template_service.get_template(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    
    user_role = get_user_role_optional(current_user)
    
    # 如果是游客，不返回文件路径
    if user_role == "guest":
        template.pop("file_path", None)
        template.pop("thumbnail_path", None)
    
    return template


@router.get("/api/templates/{template_id}/download")
async def download_template(
    template_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    下载模板文件
    游客无法下载，需要登录后才能下载
    
    接口名：下载模板文件
    请求地址：/api/templates/{template_id}/download
    请求方法：GET
    入参：
      - template_id: str - 模板ID（路径参数）
    出参：
      - FileResponse - 模板文件
    """
    user_role = get_user_role_optional(current_user)
    
    if user_role == "guest":
        raise HTTPException(
            status_code=403,
            detail="游客无法下载模板，请先登录"
        )
    
    template = await template_service.get_template(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    
    file_path = Path(template["file_path"])
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="模板文件不存在")
    
    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type=ALLOWED_FILE_TYPES.get(template["file_type"], "application/octet-stream")
    )



@router.get("/api/templates/{template_id}/thumbnail")
async def get_template_thumbnail(
    template_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    获取模板缩略图
    所有用户（包括游客）都可以查看缩略图
    
    接口名：获取模板缩略图
    请求地址：/api/templates/{template_id}/thumbnail
    请求方法：GET
    入参：
      - template_id: str - 模板ID（路径参数）
    出参：
      - FileResponse - 缩略图文件
    """
    template = await template_service.get_template(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    
    thumbnail_path = template.get("thumbnail_path")
    
    if not thumbnail_path or not Path(thumbnail_path).exists():
        # 如果没有缩略图，返回默认图片或404
        raise HTTPException(status_code=404, detail="缩略图不存在")
    
    return FileResponse(
        path=thumbnail_path,
        media_type="image/png"
    )
