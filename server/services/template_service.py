"""
Template Service - 模板管理服务
提供模板的创建、查询、删除等功能
"""
import os
import uuid
import shutil
from datetime import datetime
from typing import Optional, Dict, List, Any
import aiosqlite
from pathlib import Path

from services.db_service import db_service
from utils.logger import get_logger

logger = get_logger("services.template_service")


class TemplateService:
    """模板管理服务"""
    
    def __init__(self):
        # 模板存储目录（使用项目目录下的相对路径）
        base_dir = Path(__file__).parent.parent.parent
        self.templates_dir = base_dir / "templates"
        self.templates_dir.mkdir(parents=True, exist_ok=True)
        
        # 缩略图存储目录
        self.thumbnails_dir = self.templates_dir / "thumbnails"
        self.thumbnails_dir.mkdir(parents=True, exist_ok=True)
    
    async def create_template(
        self,
        name: str,
        file_path: str,
        file_type: str,
        file_size: int,
        created_by: str,
        description: Optional[str] = None,
        category: Optional[str] = None,
        tags: Optional[str] = None,
        thumbnail_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """创建模板"""
        template_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(db_service.db_path) as db:
            await db.execute("""
                INSERT INTO templates (
                    id, name, description, file_path, file_type, file_size,
                    thumbnail_path, category, tags, created_by, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                template_id, name, description, file_path, file_type, file_size,
                thumbnail_path, category, tags, created_by, now, now
            ))
            await db.commit()
        
        logger.info(f"Created template: {name} (id: {template_id})")
        
        return {
            "id": template_id,
            "name": name,
            "description": description,
            "file_path": file_path,
            "file_type": file_type,
            "file_size": file_size,
            "thumbnail_path": thumbnail_path,
            "category": category,
            "tags": tags,
            "created_by": created_by,
            "created_at": now,
            "updated_at": now,
        }
    
    async def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """获取模板信息"""
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT * FROM templates WHERE id = ?
            """, (template_id,))
            
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            return dict(row)
    
    async def list_templates(
        self,
        category: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """列出模板"""
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            if category:
                cursor = await db.execute("""
                    SELECT * FROM templates
                    WHERE category = ?
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                """, (category, limit, offset))
            else:
                cursor = await db.execute("""
                    SELECT * FROM templates
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                """, (limit, offset))
            
            rows = await cursor.fetchall()
            
            return [dict(row) for row in rows]
    
    async def delete_template(self, template_id: str, user_id: str, user_role: str) -> bool:
        """删除模板（仅管理员）"""
        if user_role != "admin":
            raise PermissionError("只有管理员可以删除模板")
        
        async with aiosqlite.connect(db_service.db_path) as db:
            # 获取模板信息
            template = await self.get_template(template_id)
            if not template:
                return False
            
            # 删除数据库记录
            await db.execute("DELETE FROM templates WHERE id = ?", (template_id,))
            await db.commit()
            
            # 删除文件
            if template.get("file_path") and os.path.exists(template["file_path"]):
                try:
                    os.remove(template["file_path"])
                except Exception as e:
                    logger.warning(f"Failed to delete template file: {e}")
            
            # 删除缩略图
            if template.get("thumbnail_path") and os.path.exists(template["thumbnail_path"]):
                try:
                    os.remove(template["thumbnail_path"])
                except Exception as e:
                    logger.warning(f"Failed to delete thumbnail: {e}")
            
            logger.info(f"Deleted template: {template_id}")
            return True
    
    def get_template_file_path(self, template_id: str, filename: str) -> Path:
        """获取模板文件存储路径"""
        return self.templates_dir / template_id / filename
    
    def get_thumbnail_path(self, template_id: str, filename: str) -> Path:
        """获取缩略图存储路径"""
        return self.thumbnails_dir / f"{template_id}_{filename}"


template_service = TemplateService()

