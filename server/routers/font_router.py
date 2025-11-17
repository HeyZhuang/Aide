from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Query, Form
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import os
import uuid
import shutil
from fontTools.ttLib import TTFont
import mimetypes
from services.db_service import db_service

# Pydantic模型
class FontCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = "#3b82f6"

class FontCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class FontItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[str] = None
    tags: Optional[List[str]] = []
    is_public: bool = False

class FontItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None

# 字体文件上传目录
FONT_UPLOAD_DIR = "user_data/font_uploads"
os.makedirs(FONT_UPLOAD_DIR, exist_ok=True)

# 支持的字体格式
SUPPORTED_FONT_FORMATS = {'.ttf', '.otf', '.woff', '.woff2'}

def get_font_metadata(font_path: str) -> Dict[str, Any]:
    """提取字体元数据"""
    try:
        font = TTFont(font_path)
        name_table = font['name']
        
        metadata = {
            'font_family': '',
            'font_weight': 'normal',
            'font_style': 'normal',
            'font_stretch': 'normal',
            'unicode_ranges': [],
            'glyph_count': len(font.getGlyphSet()),
            'version': '',
            'copyright': '',
            'vendor': ''
        }
        
        # 提取字体名称信息
        for record in name_table.names:
            if record.nameID == 1:  # Font Family
                metadata['font_family'] = record.toUnicode()
            elif record.nameID == 2:  # Font Subfamily
                metadata['font_style'] = record.toUnicode()
            elif record.nameID == 5:  # Version
                metadata['version'] = record.toUnicode()
            elif record.nameID == 0:  # Copyright
                metadata['copyright'] = record.toUnicode()
            elif record.nameID == 8:  # Manufacturer
                metadata['vendor'] = record.toUnicode()
        
        # 提取字重信息
        if 'OS/2' in font:
            os2_table = font['OS/2']
            weight_class = os2_table.usWeightClass
            weight_map = {
                100: 'Thin',
                200: 'Extra Light',
                300: 'Light',
                400: 'Normal',
                500: 'Medium',
                600: 'Semi Bold',
                700: 'Bold',
                800: 'Extra Bold',
                900: 'Black'
            }
            metadata['font_weight'] = weight_map.get(weight_class, 'Normal')
        
        font.close()
        return metadata
        
    except Exception as e:
        print(f"Error extracting font metadata: {e}")
        return {
            'font_family': 'Unknown',
            'font_weight': 'normal',
            'font_style': 'normal',
            'font_stretch': 'normal',
            'unicode_ranges': [],
            'glyph_count': 0,
            'version': '',
            'copyright': '',
            'vendor': ''
        }

def save_font_file(file: UploadFile) -> Dict[str, str]:
    """保存字体文件并返回文件信息"""
    # 检查文件格式
    file_extension = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if file_extension not in SUPPORTED_FONT_FORMATS:
        raise HTTPException(status_code=400, detail=f"不支持的字体格式: {file_extension}")
    
    # 生成唯一文件名
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_extension}"
    
    # 创建字体文件目录
    font_dir = os.path.join(FONT_UPLOAD_DIR, "fonts")
    os.makedirs(font_dir, exist_ok=True)
    
    file_path = os.path.join(font_dir, filename)
    
    # 保存文件
    with open(file_path, "wb") as buffer:
        content = file.file.read()
        buffer.write(content)
    
    # 获取文件大小
    file_size = os.path.getsize(file_path)
    
    # 提取字体元数据
    font_metadata = get_font_metadata(file_path)
    
    # 生成访问URL
    file_url = f"/api/fonts/files/{filename}"
    
    return {
        'file_path': file_path,
        'file_url': file_url,
        'file_size': file_size,
        'font_metadata': font_metadata,
        'font_format': file_extension[1:]  # 去掉点号
    }

# 路由
router = APIRouter(prefix="/api/fonts", tags=["fonts"])

# 分类管理
@router.get("/categories")
async def get_font_categories():
    """获取所有字体分类"""
    try:
        rows = await db_service._fetch("""
            SELECT id, name, description, icon, color, created_at, updated_at
            FROM font_categories
            ORDER BY name
        """)
        
        return [{
            "id": str(row['id']),
            "name": row['name'],
            "description": row['description'],
            "icon": row['icon'],
            "color": row['color'],
            "created_at": row['created_at'].isoformat(),
            "updated_at": row['updated_at'].isoformat(),
        } for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取字体分类失败: {str(e)}")

@router.post("/categories")
async def create_font_category(category: FontCategoryCreate):
    """创建新字体分类"""
    try:
        category_id = str(uuid.uuid4())
        await db_service._execute("""
            INSERT INTO font_categories (id, name, description, icon, color)
            VALUES ($1, $2, $3, $4, $5)
        """, category_id, category.name, category.description, category.icon, category.color)
        
        row = await db_service._fetchrow("""
            SELECT id, name, description, icon, color, created_at, updated_at
            FROM font_categories WHERE id = $1
        """, category_id)
        
        return {
            "id": str(row['id']),
            "name": row['name'],
            "description": row['description'],
            "icon": row['icon'],
            "color": row['color'],
            "created_at": row['created_at'].isoformat(),
            "updated_at": row['updated_at'].isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建字体分类失败: {str(e)}")

@router.put("/categories/{category_id}")
async def update_font_category(category_id: str, category: FontCategoryUpdate):
    """更新字体分类"""
    try:
        # 检查分类是否存在
        existing = await db_service._fetchrow("SELECT id FROM font_categories WHERE id = $1", category_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # 构建更新语句
        update_fields = []
        values = []
        param_count = 1
        
        if category.name is not None:
            update_fields.append(f"name = ${param_count}")
            values.append(category.name)
            param_count += 1
        
        if category.description is not None:
            update_fields.append(f"description = ${param_count}")
            values.append(category.description)
            param_count += 1
        
        if category.icon is not None:
            update_fields.append(f"icon = ${param_count}")
            values.append(category.icon)
            param_count += 1
        
        if category.color is not None:
            update_fields.append(f"color = ${param_count}")
            values.append(category.color)
            param_count += 1
        
        if update_fields:
            values.append(category_id)
            query = f"UPDATE font_categories SET {', '.join(update_fields)} WHERE id = ${param_count}"
            await db_service._execute(query, *values)
        
        row = await db_service._fetchrow("""
            SELECT id, name, description, icon, color, created_at, updated_at
            FROM font_categories WHERE id = $1
        """, category_id)
        
        return {
            "id": str(row['id']),
            "name": row['name'],
            "description": row['description'],
            "icon": row['icon'],
            "color": row['color'],
            "created_at": row['created_at'].isoformat(),
            "updated_at": row['updated_at'].isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新字体分类失败: {str(e)}")

@router.delete("/categories/{category_id}")
async def delete_font_category(category_id: str):
    """删除字体分类"""
    try:
        # 检查是否有字体使用此分类
        fonts_count = await db_service._fetchval("""
            SELECT COUNT(*) FROM font_items WHERE category_id = $1
        """, category_id)
        
        if fonts_count > 0:
            raise HTTPException(status_code=400, detail=f"Cannot delete category with {fonts_count} fonts")
        
        result = await db_service._execute("DELETE FROM font_categories WHERE id = $1", category_id)
        return {"message": "Category deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除字体分类失败: {str(e)}")

# 字体管理
@router.get("/items")
async def get_fonts(
    category_id: Optional[str] = Query(None),
    tags: Optional[List[str]] = Query(None),
    is_favorite: Optional[bool] = Query(None),
    is_public: Optional[bool] = Query(None),
    created_by: Optional[str] = Query(None)
):
    """获取字体列表"""
    try:
        # 构建查询条件
        conditions = []
        values = []
        param_count = 1
        
        if category_id:
            conditions.append(f"category_id = ${param_count}")
            values.append(category_id)
            param_count += 1
        
        if is_favorite is not None:
            conditions.append(f"is_favorite = ${param_count}")
            values.append(is_favorite)
            param_count += 1
        
        if is_public is not None:
            conditions.append(f"is_public = ${param_count}")
            values.append(is_public)
            param_count += 1
        
        if created_by:
            conditions.append(f"created_by = ${param_count}")
            values.append(created_by)
            param_count += 1
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        
        query = f"""
            SELECT id, name, font_family, font_file_name, font_file_url, font_format,
                   file_size, description, category_id, tags, usage_count, is_favorite,
                   is_public, font_metadata, created_by, created_at, updated_at
            FROM font_items
            {where_clause}
            ORDER BY created_at DESC
        """
        
        rows = await db_service._fetch(query, *values)
        
        return [{
            "id": str(row['id']),
            "name": row['name'],
            "font_family": row['font_family'],
            "font_file_name": row['font_file_name'],
            "font_file_url": row['font_file_url'],
            "font_format": row['font_format'],
            "file_size": row['file_size'],
            "description": row['description'],
            "category_id": str(row['category_id']) if row['category_id'] else None,
            "tags": row['tags'] or [],
            "usage_count": row['usage_count'],
            "is_favorite": row['is_favorite'],
            "is_public": row['is_public'],
            "font_metadata": row['font_metadata'] or {},
            "created_by": str(row['created_by']) if row['created_by'] else None,
            "created_at": row['created_at'].isoformat(),
            "updated_at": row['updated_at'].isoformat(),
        } for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取字体列表失败: {str(e)}")

@router.get("/items/{font_id}")
async def get_font(font_id: str):
    """获取单个字体"""
    try:
        row = await db_service._fetchrow("""
            SELECT id, name, font_family, font_file_name, font_file_url, font_format,
                   file_size, description, category_id, tags, usage_count, is_favorite,
                   is_public, font_metadata, created_by, created_at, updated_at
            FROM font_items WHERE id = $1
        """, font_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Font not found")
        
        return {
            "id": str(row['id']),
            "name": row['name'],
            "font_family": row['font_family'],
            "font_file_name": row['font_file_name'],
            "font_file_url": row['font_file_url'],
            "font_format": row['font_format'],
            "file_size": row['file_size'],
            "description": row['description'],
            "category_id": str(row['category_id']) if row['category_id'] else None,
            "tags": row['tags'] or [],
            "usage_count": row['usage_count'],
            "is_favorite": row['is_favorite'],
            "is_public": row['is_public'],
            "font_metadata": row['font_metadata'] or {},
            "created_by": str(row['created_by']) if row['created_by'] else None,
            "created_at": row['created_at'].isoformat(),
            "updated_at": row['updated_at'].isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取字体失败: {str(e)}")

@router.post("/items")
async def upload_font(
    font_file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    category_id: str = Form(""),
    tags: str = Form("[]"),
    is_public: str = Form("false")
):
    """上传字体文件"""
    try:
        tags_list = json.loads(tags)
        is_public_bool = is_public.lower() == "true"
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    
    try:
        # 保存字体文件
        file_info = save_font_file(font_file)
        
        # 创建字体记录
        font_id = str(uuid.uuid4())
        await db_service._execute("""
            INSERT INTO font_items (
                id, name, font_family, font_file_name, font_file_path, font_file_url,
                font_format, file_size, description, category_id, tags, is_public, font_metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        """, 
            font_id, name, file_info['font_metadata']['font_family'], font_file.filename,
            file_info['file_path'], file_info['file_url'], file_info['font_format'],
            file_info['file_size'], description, 
            category_id if category_id else None, json.dumps(tags_list), is_public_bool,
            json.dumps(file_info['font_metadata'])
        )
        
        # 获取创建的字体记录
        row = await db_service._fetchrow("""
            SELECT id, name, font_family, font_file_name, font_file_url, font_format,
                   file_size, description, category_id, tags, usage_count, is_favorite,
                   is_public, font_metadata, created_by, created_at, updated_at
            FROM font_items WHERE id = $1
        """, font_id)
        
        return {
            "id": str(row['id']),
            "name": row['name'],
            "font_family": row['font_family'],
            "font_file_name": row['font_file_name'],
            "font_file_url": row['font_file_url'],
            "font_format": row['font_format'],
            "file_size": row['file_size'],
            "description": row['description'],
            "category_id": str(row['category_id']) if row['category_id'] else None,
            "tags": row['tags'] or [],
            "usage_count": row['usage_count'],
            "is_favorite": row['is_favorite'],
            "is_public": row['is_public'],
            "font_metadata": row['font_metadata'] or {},
            "created_by": str(row['created_by']) if row['created_by'] else None,
            "created_at": row['created_at'].isoformat(),
            "updated_at": row['updated_at'].isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传字体失败: {str(e)}")

@router.put("/items/{font_id}")
async def update_font(
    font_id: str,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category_id: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    is_public: Optional[str] = Form(None)
):
    """更新字体信息"""
    try:
        # 检查字体是否存在
        existing = await db_service._fetchrow("SELECT id FROM font_items WHERE id = $1", font_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Font not found")
        
        # 构建更新语句
        update_fields = []
        values = []
        param_count = 1
        
        if name is not None:
            update_fields.append(f"name = ${param_count}")
            values.append(name)
            param_count += 1
        
        if description is not None:
            update_fields.append(f"description = ${param_count}")
            values.append(description)
            param_count += 1
        
        if category_id is not None:
            update_fields.append(f"category_id = ${param_count}")
            values.append(category_id if category_id else None)
            param_count += 1
        
        if tags is not None:
            try:
                tags_list = json.loads(tags)
                update_fields.append(f"tags = ${param_count}")
                values.append(json.dumps(tags_list))
                param_count += 1
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid tags JSON format")
        
        if is_public is not None:
            update_fields.append(f"is_public = ${param_count}")
            values.append(is_public.lower() == "true")
            param_count += 1
        
        if update_fields:
            values.append(font_id)
            query = f"UPDATE font_items SET {', '.join(update_fields)} WHERE id = ${param_count}"
            await db_service._execute(query, *values)
        
        # 获取更新后的字体记录
        row = await db_service._fetchrow("""
            SELECT id, name, font_family, font_file_name, font_file_url, font_format,
                   file_size, description, category_id, tags, usage_count, is_favorite,
                   is_public, font_metadata, created_by, created_at, updated_at
            FROM font_items WHERE id = $1
        """, font_id)
        
        return {
            "id": str(row['id']),
            "name": row['name'],
            "font_family": row['font_family'],
            "font_file_name": row['font_file_name'],
            "font_file_url": row['font_file_url'],
            "font_format": row['font_format'],
            "file_size": row['file_size'],
            "description": row['description'],
            "category_id": str(row['category_id']) if row['category_id'] else None,
            "tags": row['tags'] or [],
            "usage_count": row['usage_count'],
            "is_favorite": row['is_favorite'],
            "is_public": row['is_public'],
            "font_metadata": row['font_metadata'] or {},
            "created_by": str(row['created_by']) if row['created_by'] else None,
            "created_at": row['created_at'].isoformat(),
            "updated_at": row['updated_at'].isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新字体失败: {str(e)}")

@router.delete("/items/{font_id}")
async def delete_font(font_id: str):
    """删除字体"""
    try:
        # 获取字体信息
        font = await db_service._fetchrow("""
            SELECT font_file_path FROM font_items WHERE id = $1
        """, font_id)
        
        if not font:
            raise HTTPException(status_code=404, detail="Font not found")
        
        # 删除字体文件
        if os.path.exists(font['font_file_path']):
            os.remove(font['font_file_path'])
        
        # 删除数据库记录
        await db_service._execute("DELETE FROM font_items WHERE id = $1", font_id)
        return {"message": "Font deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除字体失败: {str(e)}")

@router.post("/items/{font_id}/favorite")
async def toggle_font_favorite(font_id: str):
    """切换字体收藏状态"""
    try:
        # 检查字体是否存在
        font = await db_service._fetchrow("SELECT is_favorite FROM font_items WHERE id = $1", font_id)
        if not font:
            raise HTTPException(status_code=404, detail="Font not found")
        
        new_favorite_status = not font['is_favorite']
        await db_service._execute("""
            UPDATE font_items SET is_favorite = $1 WHERE id = $2
        """, new_favorite_status, font_id)
        
        return {
            "id": font_id,
            "is_favorite": new_favorite_status,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"切换收藏状态失败: {str(e)}")

@router.post("/items/{font_id}/usage")
async def increment_font_usage(font_id: str):
    """增加字体使用次数"""
    try:
        # 检查字体是否存在
        font = await db_service._fetchrow("SELECT id FROM font_items WHERE id = $1", font_id)
        if not font:
            raise HTTPException(status_code=404, detail="Font not found")
        
        await db_service._execute("""
            UPDATE font_items SET usage_count = usage_count + 1 WHERE id = $1
        """, font_id)
        
        return {"message": "Usage count incremented"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"增加使用次数失败: {str(e)}")

@router.get("/search")
async def search_fonts(
    q: str = Query(...),
    category_id: Optional[str] = Query(None),
    tags: Optional[List[str]] = Query(None),
    is_favorite: Optional[bool] = Query(None),
    is_public: Optional[bool] = Query(None)
):
    """搜索字体"""
    try:
        # 构建查询条件
        conditions = ["(name ILIKE $1 OR font_family ILIKE $1 OR description ILIKE $1)"]
        values = [f"%{q}%"]
        param_count = 2
        
        if category_id:
            conditions.append(f"category_id = ${param_count}")
            values.append(category_id)
            param_count += 1
        
        if is_favorite is not None:
            conditions.append(f"is_favorite = ${param_count}")
            values.append(is_favorite)
            param_count += 1
        
        if is_public is not None:
            conditions.append(f"is_public = ${param_count}")
            values.append(is_public)
            param_count += 1
        
        where_clause = "WHERE " + " AND ".join(conditions)
        
        query = f"""
            SELECT id, name, font_family, font_file_name, font_file_url, font_format,
                   file_size, description, category_id, tags, usage_count, is_favorite,
                   is_public, font_metadata, created_by, created_at, updated_at
            FROM font_items
            {where_clause}
            ORDER BY created_at DESC
        """
        
        rows = await db_service._fetch(query, *values)
        
        return [{
            "id": str(row['id']),
            "name": row['name'],
            "font_family": row['font_family'],
            "font_file_name": row['font_file_name'],
            "font_file_url": row['font_file_url'],
            "font_format": row['font_format'],
            "file_size": row['file_size'],
            "description": row['description'],
            "category_id": str(row['category_id']) if row['category_id'] else None,
            "tags": row['tags'] or [],
            "usage_count": row['usage_count'],
            "is_favorite": row['is_favorite'],
            "is_public": row['is_public'],
            "font_metadata": row['font_metadata'] or {},
            "created_by": str(row['created_by']) if row['created_by'] else None,
            "created_at": row['created_at'].isoformat(),
            "updated_at": row['updated_at'].isoformat(),
        } for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索字体失败: {str(e)}")

@router.get("/stats")
async def get_font_stats():
    """获取字体统计信息"""
    try:
        # 总字体数
        total_fonts = await db_service._fetchval("SELECT COUNT(*) FROM font_items")
        
        # 总分类数
        total_categories = await db_service._fetchval("SELECT COUNT(*) FROM font_categories")
        
        # 最常用的字体
        most_used_rows = await db_service._fetch("""
            SELECT id, name, font_family, usage_count
            FROM font_items
            ORDER BY usage_count DESC
            LIMIT 5
        """)
        
        most_used_fonts = [{
            "id": str(row['id']),
            "name": row['name'],
            "font_family": row['font_family'],
            "usage_count": row['usage_count'],
        } for row in most_used_rows]
        
        # 最近的字体
        recent_rows = await db_service._fetch("""
            SELECT id, name, font_family, created_at
            FROM font_items
            ORDER BY created_at DESC
            LIMIT 5
        """)
        
        recent_fonts = [{
            "id": str(row['id']),
            "name": row['name'],
            "font_family": row['font_family'],
            "created_at": row['created_at'].isoformat(),
        } for row in recent_rows]
        
        return {
            "total_fonts": total_fonts,
            "total_categories": total_categories,
            "most_used_fonts": most_used_fonts,
            "recent_fonts": recent_fonts,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")

# 字体文件服务
@router.get("/files/{filename}")
async def get_font_file(filename: str):
    """获取字体文件"""
    file_path = os.path.join(FONT_UPLOAD_DIR, "fonts", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Font file not found")
    
    # 根据文件扩展名设置正确的媒体类型
    media_type = "application/octet-stream"
    if filename.lower().endswith('.ttf'):
        media_type = "font/ttf"
    elif filename.lower().endswith('.otf'):
        media_type = "font/otf"
    elif filename.lower().endswith('.woff'):
        media_type = "font/woff"
    elif filename.lower().endswith('.woff2'):
        media_type = "font/woff2"
    
    return FileResponse(
        file_path,
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=31536000",  # 缓存1年
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "*",
        }
    )

# 批量导入现有字体
@router.post("/import-existing")
async def import_existing_fonts():
    """导入fonts文件夹中的现有字体"""
    fonts_dir = "fonts"
    if not os.path.exists(fonts_dir):
        raise HTTPException(status_code=404, detail="Fonts directory not found")
    
    imported_count = 0
    errors = []
    
    try:
        for filename in os.listdir(fonts_dir):
            if any(filename.lower().endswith(ext) for ext in SUPPORTED_FONT_FORMATS):
                try:
                    # 检查是否已经存在
                    existing_font = await db_service._fetchrow("""
                        SELECT id FROM font_items WHERE font_file_name = $1
                    """, filename)
                    
                    if existing_font:
                        continue
                    
                    file_path = os.path.join(fonts_dir, filename)
                    
                    # 创建模拟的UploadFile对象
                    class MockUploadFile:
                        def __init__(self, file_path, filename):
                            self.filename = filename
                            self.file = open(file_path, 'rb')
                    
                    mock_file = MockUploadFile(file_path, filename)
                    
                    # 保存字体文件
                    file_info = save_font_file(mock_file)
                    mock_file.file.close()
                    
                    # 创建字体记录
                    font_id = str(uuid.uuid4())
                    await db_service._execute("""
                        INSERT INTO font_items (
                            id, name, font_family, font_file_name, font_file_path, font_file_url,
                            font_format, file_size, description, tags, is_public, font_metadata
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    """, 
                        font_id, os.path.splitext(filename)[0], file_info['font_metadata']['font_family'],
                        filename, file_info['file_path'], file_info['file_url'], file_info['font_format'],
                        file_info['file_size'], f"从现有文件导入: {filename}", json.dumps(["imported"]),
                        False, json.dumps(file_info['font_metadata'])
                    )
                    
                    imported_count += 1
                    
                except Exception as e:
                    errors.append(f"导入 {filename} 失败: {str(e)}")
        
        return {
            "message": f"成功导入 {imported_count} 个字体",
            "imported_count": imported_count,
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量导入失败: {str(e)}")
