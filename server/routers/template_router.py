"""
Template Router - 模板管理路由
提供模板的上传、查询、删除等功能
"""
import os
import shutil
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel

from services.template_service import template_service
from utils.permission_dependency import require_admin, get_user_role_optional, get_current_user_optional
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


@router.post("/api/templates/upload", response_model=TemplateResponse)
async def upload_template(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: dict = Depends(require_admin)
):
    """
    上传模板文件（仅管理员）
    """
    # 检查文件类型
    file_extension = Path(file.filename).suffix.lower().lstrip(".")
    if file_extension not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {file_extension}。支持的类型: {', '.join(ALLOWED_FILE_TYPES.keys())}"
        )
    
    # 读取文件内容
    file_content = await file.read()
    file_size = len(file_content)
    
    # 生成模板ID和文件路径
    template_id = str(uuid.uuid4())
    template_dir = template_service.templates_dir / template_id
    template_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = template_dir / file.filename
    
    # 保存文件
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    logger.info(f"Uploaded template file: {file.filename} (size: {file_size} bytes)")
    
    # 创建模板记录
    template = await template_service.create_template(
        name=name,
        file_path=str(file_path),
        file_type=file_extension,
        file_size=file_size,
        created_by=current_user["user_id"],
        description=description,
        category=category,
        tags=tags,
        thumbnail_path=None  # TODO: 生成缩略图
    )
    
    return template


@router.get("/api/templates", response_model=List[TemplateResponse])
async def list_templates(
    category: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    列出模板
    游客可以查看模板列表，但只能看到基本信息
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
    游客只能查看基本信息
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
    游客无法下载
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


@router.delete("/api/templates/{template_id}")
async def delete_template(
    template_id: str,
    current_user: dict = Depends(require_admin)
):
    """
    删除模板（仅管理员）
    """
    success = await template_service.delete_template(
        template_id=template_id,
        user_id=current_user["user_id"],
        user_role=current_user.get("role", "user")
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="模板不存在")
    
    return {"message": "模板已删除"}


@router.get("/api/templates/{template_id}/thumbnail")
async def get_template_thumbnail(
    template_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    获取模板缩略图
    所有用户（包括游客）都可以查看缩略图
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
