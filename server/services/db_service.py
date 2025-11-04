import sqlite3
import json
import os
from typing import List, Dict, Any, Optional
import aiosqlite
from .config_service import USER_DATA_DIR
from .migrations.manager import MigrationManager, CURRENT_VERSION
from utils.logger import get_logger

logger = get_logger("services.db_service")

DB_PATH = os.path.join(USER_DATA_DIR, "localmanus.db")

class DatabaseService:
    def __init__(self):
        self.db_path = DB_PATH
        self._ensure_db_directory()
        self._migration_manager = MigrationManager()
        self._init_db()

    def _ensure_db_directory(self):
        """Ensure the database directory exists"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

    def _init_db(self):
        """Initialize the database with the current schema"""
        with sqlite3.connect(self.db_path) as conn:
            # Create version table if it doesn't exist
            conn.execute("""
                CREATE TABLE IF NOT EXISTS db_version (
                    version INTEGER PRIMARY KEY
                )
            """)
            
            # Get current version
            cursor = conn.execute("SELECT version FROM db_version")
            current_version = cursor.fetchone()
            print('local db version', current_version, 'latest version', CURRENT_VERSION)
            
            if current_version is None:
                # First time setup - start from version 0
                conn.execute("INSERT INTO db_version (version) VALUES (0)")
                self._migration_manager.migrate(conn, 0, CURRENT_VERSION)
            elif current_version[0] < CURRENT_VERSION:
                print('Migrating database from version', current_version[0], 'to', CURRENT_VERSION)
                # Need to migrate
                self._migration_manager.migrate(conn, current_version[0], CURRENT_VERSION)

    async def create_canvas(self, id: str, name: str):
        """Create a new canvas"""
        logger.debug(f"[DB] 开始创建画布: canvas_id={id}, name={name}")
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    INSERT INTO canvases (id, name)
                    VALUES (?, ?)
                """, (id, name))
                await db.commit()
            logger.debug(f"[DB] 成功创建画布: canvas_id={id}")
        except Exception as e:
            logger.error(f"[DB] 创建画布失败: canvas_id={id}, name={name}, 错误: {str(e)}", exc_info=True)
            raise

    async def list_canvases(self) -> List[Dict[str, Any]]:
        """Get all canvases"""
        logger.debug("[DB] 开始查询画布列表")
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = sqlite3.Row
                cursor = await db.execute("""
                    SELECT id, name, description, thumbnail, created_at, updated_at
                    FROM canvases
                    ORDER BY updated_at DESC
                """)
                rows = await cursor.fetchall()
                result = [dict(row) for row in rows]
                logger.debug(f"[DB] 成功查询画布列表，返回 {len(result)} 个画布")
                return result
        except Exception as e:
            logger.error(f"[DB] 查询画布列表失败: {str(e)}", exc_info=True)
            raise

    async def create_chat_session(self, id: str, model: str, provider: str, canvas_id: str, title: Optional[str] = None):
        """Save a new chat session"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO chat_sessions (id, model, provider, canvas_id, title)
                VALUES (?, ?, ?, ?, ?)
            """, (id, model, provider, canvas_id, title))
            await db.commit()

    async def create_message(self, session_id: str, role: str, message: str):
        """Save a chat message"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO chat_messages (session_id, role, message)
                VALUES (?, ?, ?)
            """, (session_id, role, message))
            await db.commit()

    async def get_chat_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get chat history for a session"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = sqlite3.Row
            cursor = await db.execute("""
                SELECT role, message, id
                FROM chat_messages
                WHERE session_id = ?
                ORDER BY id ASC
            """, (session_id,))
            rows = await cursor.fetchall()
            
            messages = []
            for row in rows:
                row_dict = dict(row)
                if row_dict['message']:
                    try:
                        msg = json.loads(row_dict['message'])
                        messages.append(msg)
                    except:
                        pass
                
            return messages

    async def list_sessions(self, canvas_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all chat sessions"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = sqlite3.Row
            if canvas_id:
                cursor = await db.execute("""
                    SELECT id, title, model, provider, created_at, updated_at
                    FROM chat_sessions
                    WHERE canvas_id = ?
                    ORDER BY updated_at DESC
                """, (canvas_id,))
            else:
                cursor = await db.execute("""
                    SELECT id, title, model, provider, created_at, updated_at
                    FROM chat_sessions
                    ORDER BY updated_at DESC
                """)
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def save_canvas_data(self, id: str, data: str, thumbnail: Optional[str] = None):
        """Save canvas data"""
        data_size = len(data) if data else 0
        logger.debug(f"[DB] 开始保存画布数据: canvas_id={id}, 数据大小={data_size}字符, 缩略图={bool(thumbnail)}")
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("""
                    UPDATE canvases 
                    SET data = ?, thumbnail = ?, updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
                    WHERE id = ?
                """, (data, thumbnail, id))
                await db.commit()
            logger.debug(f"[DB] 成功保存画布数据: canvas_id={id}, 数据大小={data_size}字符")
        except Exception as e:
            logger.error(f"[DB] 保存画布数据失败: canvas_id={id}, 错误: {str(e)}", exc_info=True)
            raise

    async def get_canvas_data(self, id: str) -> Dict[str, Any]:
        """Get canvas data"""
        logger.debug(f"[DB] 开始查询画布数据: canvas_id={id}")
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = sqlite3.Row
                cursor = await db.execute("""
                    SELECT data, name
                    FROM canvases
                    WHERE id = ?
                """, (id,))
                row = await cursor.fetchone()

                sessions = await self.list_sessions(id)
                
                if row:
                    try:
                        canvas_data = json.loads(row['data']) if row['data'] else {}
                    except (json.JSONDecodeError, TypeError) as e:
                        # 如果JSON解析失败，使用空对象
                        logger.warning(f"[DB] 画布数据JSON解析失败: canvas_id={id}, 错误: {str(e)}")
                        canvas_data = {}
                    
                    result = {
                        'data': canvas_data,
                        'name': row['name'] or '未命名画布',
                        'sessions': sessions
                    }
                    data_size = len(str(canvas_data))
                    logger.debug(f"[DB] 成功查询画布数据: canvas_id={id}, name={result['name']}, "
                               f"数据大小={data_size}字符, 会话数={len(sessions)}")
                    return result
                else:
                    # 如果画布不存在，返回默认数据而不是 None
                    logger.debug(f"[DB] 画布不存在，返回默认数据: canvas_id={id}")
                    return {
                        'data': {},
                        'name': '未命名画布',
                        'sessions': []
                    }
        except Exception as e:
            logger.error(f"[DB] 查询画布数据失败: canvas_id={id}, 错误: {str(e)}", exc_info=True)
            raise

    async def delete_canvas(self, id: str):
        """Delete canvas and related data"""
        logger.debug(f"[DB] 开始删除画布: canvas_id={id}")
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("DELETE FROM canvases WHERE id = ?", (id,))
                await db.commit()
            logger.debug(f"[DB] 成功删除画布: canvas_id={id}")
        except Exception as e:
            logger.error(f"[DB] 删除画布失败: canvas_id={id}, 错误: {str(e)}", exc_info=True)
            raise

    async def rename_canvas(self, id: str, name: str):
        """Rename canvas"""
        logger.debug(f"[DB] 开始重命名画布: canvas_id={id}, 新名称={name}")
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("UPDATE canvases SET name = ? WHERE id = ?", (name, id))
                await db.commit()
            logger.debug(f"[DB] 成功重命名画布: canvas_id={id}, 新名称={name}")
        except Exception as e:
            logger.error(f"[DB] 重命名画布失败: canvas_id={id}, 新名称={name}, 错误: {str(e)}", exc_info=True)
            raise

    async def create_comfy_workflow(self, name: str, api_json: str, description: str, inputs: str, outputs: Optional[str] = None):
        """Create a new comfy workflow"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO comfy_workflows (name, api_json, description, inputs, outputs)
                VALUES (?, ?, ?, ?, ?)
            """, (name, api_json, description, inputs, outputs))
            await db.commit()

    async def list_comfy_workflows(self) -> List[Dict[str, Any]]:
        """List all comfy workflows"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = sqlite3.Row
            cursor = await db.execute("SELECT id, name, description, api_json, inputs, outputs FROM comfy_workflows ORDER BY id DESC")
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def delete_comfy_workflow(self, id: int):
        """Delete a comfy workflow"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM comfy_workflows WHERE id = ?", (id,))
            await db.commit()

    async def get_comfy_workflow(self, id: int):
        """Get comfy workflow dict"""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = sqlite3.Row
            cursor = await db.execute(
                "SELECT api_json FROM comfy_workflows WHERE id = ?", (id,)
            )
            row = await cursor.fetchone()
        try:
            workflow_json = (
                row["api_json"]
                if isinstance(row["api_json"], dict)
                else json.loads(row["api_json"])
            )
            return workflow_json
        except json.JSONDecodeError as exc:
            raise ValueError(f"Stored workflow api_json is not valid JSON: {exc}")

# Create a singleton instance
db_service = DatabaseService()