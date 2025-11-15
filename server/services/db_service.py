import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncpg
from .config_service import USER_DATA_DIR
from utils.logger import get_logger

logger = get_logger("services.db_service")

# Supabase PostgreSQL 連接配置
# 優先從環境變數讀取，支持本地和雲端 Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL", "") or os.getenv("DATABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# 如果沒有提供直接的 DB URL，嘗試從 SUPABASE_URL 構建
# 格式: postgresql://postgres:[password]@[host]:5432/postgres
if not SUPABASE_DB_URL:
    logger.warning("⚠️  未找到 SUPABASE_DB_URL 或 DATABASE_URL 環境變數")
    logger.warning("⚠️  請在 config.env 中設置 SUPABASE_DB_URL")
    logger.warning("⚠️  本地格式: postgresql://user:password@localhost:5432/database")

class DatabaseService:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self._connection_string = SUPABASE_DB_URL
        self._initialized = False
        
        if not self._connection_string:
            logger.warning("⚠️  Supabase 連接字符串未配置，請設置 SUPABASE_DB_URL 或 DATABASE_URL 環境變數")
            logger.warning("⚠️  格式: postgresql://postgres:[password]@[host]:5432/postgres")

    async def _init_pool(self):
        """初始化連接池"""
        if not self._connection_string:
            return
            
        try:
            self.pool = await asyncpg.create_pool(
                self._connection_string,
                min_size=1,
                max_size=10,
                command_timeout=60
            )
            logger.info("✅ Supabase PostgreSQL 連接池初始化成功")
            
            # 測試連接
            async with self.pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            logger.info("✅ Supabase 連接測試成功")
        except Exception as e:
            logger.error(f"❌ Supabase 連接池初始化失敗: {str(e)}", exc_info=True)
            raise

    async def _ensure_pool(self):
        """確保連接池已初始化"""
        if not self._initialized and self._connection_string:
            await self._init_pool()
            self._initialized = True

    async def _execute(self, query: str, *args):
        """執行查詢（無返回）"""
        await self._ensure_pool()
        if not self.pool:
            raise RuntimeError("資料庫連接池未初始化，請檢查 SUPABASE_DB_URL 配置")
        async with self.pool.acquire() as conn:
            await conn.execute(query, *args)

    async def _fetch(self, query: str, *args) -> List[asyncpg.Record]:
        """執行查詢並返回結果"""
        await self._ensure_pool()
        if not self.pool:
            raise RuntimeError("資料庫連接池未初始化，請檢查 SUPABASE_DB_URL 配置")
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def _fetchrow(self, query: str, *args) -> Optional[asyncpg.Record]:
        """執行查詢並返回單行結果"""
        await self._ensure_pool()
        if not self.pool:
            raise RuntimeError("資料庫連接池未初始化，請檢查 SUPABASE_DB_URL 配置")
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def _fetchval(self, query: str, *args):
        """執行查詢並返回單個值"""
        await self._ensure_pool()
        if not self.pool:
            raise RuntimeError("資料庫連接池未初始化，請檢查 SUPABASE_DB_URL 配置")
        async with self.pool.acquire() as conn:
            return await conn.fetchval(query, *args)

    async def create_canvas(self, id: str, name: str, user_id: str):
        """创建新画布，关联到用户"""
        logger.debug(f"[DB] 开始创建画布: canvas_id={id}, name={name}, user_id={user_id}")
        
        # 验证画布名称长度
        if not name or len(name) > 30:
            raise ValueError(f"画布名称长度必须在1-30字符之间，当前长度: {len(name) if name else 0}")
        
        try:
            await self._execute("""
                INSERT INTO canvases (id, name, user_id)
                VALUES ($1, $2, $3)
            """, id, name, user_id)
            logger.debug(f"[DB] 成功创建画布: canvas_id={id}, user_id={user_id}")
        except Exception as e:
            logger.error(f"[DB] 创建画布失败: canvas_id={id}, name={name}, user_id={user_id}, 错误: {str(e)}", exc_info=True)
            raise

    async def list_canvases(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all canvases for a specific user"""
        logger.debug(f"[DB] 开始查询画布列表: user_id={user_id}")
        try:
            rows = await self._fetch("""
                SELECT id, name, description, thumbnail, created_at, updated_at
                FROM canvases
                WHERE user_id = $1
                ORDER BY updated_at DESC
            """, user_id)
            
            result = [dict(row) for row in rows]
            logger.debug(f"[DB] 成功查询画布列表: user_id={user_id}, 返回 {len(result)} 个画布")
            return result
        except Exception as e:
            logger.error(f"[DB] 查询画布列表失败: user_id={user_id}, 错误: {str(e)}", exc_info=True)
            raise

    async def get_canvas_owner(self, canvas_id: str) -> Optional[str]:
        """Get the owner (user_id) of a canvas"""
        logger.debug(f"[DB] 开始查询画布所有者: canvas_id={canvas_id}")
        try:
            user_id = await self._fetchval("""
                SELECT user_id
                FROM canvases
                WHERE id = $1
            """, canvas_id)
            
            if user_id:
                logger.debug(f"[DB] 画布所有者: canvas_id={canvas_id}, user_id={user_id}")
                return user_id
            else:
                logger.debug(f"[DB] 画布不存在: canvas_id={canvas_id}")
                return None
        except Exception as e:
            logger.error(f"[DB] 查询画布所有者失败: canvas_id={canvas_id}, 错误: {str(e)}", exc_info=True)
            raise

    async def create_chat_session(self, id: str, model: str, provider: str, canvas_id: str, title: Optional[str] = None):
        """保存新的聊天会话"""
        # 验证字段长度
        if model and len(model) > 30:
            raise ValueError(f"AI模型名称最长30字符，当前长度: {len(model)}")
        if provider and len(provider) > 30:
            raise ValueError(f"AI服务提供者名称最长30字符，当前长度: {len(provider)}")
        
        # 会话标题超长时自动截取前200字符
        if title and len(title) > 200:
            original_length = len(title)
            title = title[:200]
            logger.debug(f"[DB] 会话标题超长，已自动截取: 原长度={original_length}, 截取后={len(title)}")
        
        await self._execute("""
            INSERT INTO chat_sessions (id, model, provider, canvas_id, title)
            VALUES ($1, $2, $3, $4, $5)
        """, id, model, provider, canvas_id, title)

    async def create_message(self, session_id: str, role: str, message: str):
        """Save a chat message"""
        await self._execute("""
            INSERT INTO chat_messages (session_id, role, message)
            VALUES ($1, $2, $3)
        """, session_id, role, message)

    async def get_chat_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get chat history for a session"""
        rows = await self._fetch("""
            SELECT role, message, id
            FROM chat_messages
            WHERE session_id = $1
            ORDER BY id ASC
        """, session_id)
        
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
        if canvas_id:
            rows = await self._fetch("""
                SELECT id, title, model, provider, created_at, updated_at
                FROM chat_sessions
                WHERE canvas_id = $1
                ORDER BY updated_at DESC
            """, canvas_id)
        else:
            rows = await self._fetch("""
                SELECT id, title, model, provider, created_at, updated_at
                FROM chat_sessions
                ORDER BY updated_at DESC
            """)
        
        return [dict(row) for row in rows]

    async def save_canvas_data(self, id: str, data: str, thumbnail: Optional[str] = None):
        """Save canvas data"""
        data_size = len(data) if data else 0
        logger.debug(f"[DB] 开始保存画布数据: canvas_id={id}, 数据大小={data_size}字符, 缩略图={bool(thumbnail)}")
        try:
            # PostgreSQL 使用 NOW() 而不是 STRFTIME
            await self._execute("""
                UPDATE canvases 
                SET data = $1::jsonb, thumbnail = $2, updated_at = NOW()
                WHERE id = $3
            """, data, thumbnail, id)
            logger.debug(f"[DB] 成功保存画布数据: canvas_id={id}, 数据大小={data_size}字符")
        except Exception as e:
            logger.error(f"[DB] 保存画布数据失败: canvas_id={id}, 错误: {str(e)}", exc_info=True)
            raise

    async def get_canvas_data(self, id: str) -> Dict[str, Any]:
        """Get canvas data"""
        logger.debug(f"[DB] 开始查询画布数据: canvas_id={id}")
        try:
            row = await self._fetchrow("""
                SELECT data, name
                FROM canvases
                WHERE id = $1
            """, id)

            sessions = await self.list_sessions(id)
            
            if row:
                try:
                    canvas_data = row['data'] if row['data'] else {}
                    # 如果 data 是字符串，解析為 JSON
                    if isinstance(canvas_data, str):
                        canvas_data = json.loads(canvas_data)
                except (json.JSONDecodeError, TypeError) as e:
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
            await self._execute("DELETE FROM canvases WHERE id = $1", id)
            logger.debug(f"[DB] 成功删除画布: canvas_id={id}")
        except Exception as e:
            logger.error(f"[DB] 删除画布失败: canvas_id={id}, 错误: {str(e)}", exc_info=True)
            raise

    async def rename_canvas(self, id: str, name: str):
        """重命名画布"""
        logger.debug(f"[DB] 开始重命名画布: canvas_id={id}, 新名称={name}")
        
        # 验证画布名称长度
        if not name or len(name) > 30:
            raise ValueError(f"画布名称长度必须在1-30字符之间，当前长度: {len(name) if name else 0}")
        
        try:
            await self._execute("UPDATE canvases SET name = $1 WHERE id = $2", name, id)
            logger.debug(f"[DB] 成功重命名画布: canvas_id={id}, 新名称={name}")
        except Exception as e:
            logger.error(f"[DB] 重命名画布失败: canvas_id={id}, 新名称={name}, 错误: {str(e)}", exc_info=True)
            raise

    async def create_comfy_workflow(self, name: str, api_json: str, description: str, inputs: str, outputs: Optional[str] = None):
        """Create a new comfy workflow"""
        await self._execute("""
            INSERT INTO comfy_workflows (name, api_json, description, inputs, outputs)
            VALUES ($1, $2::jsonb, $3, $4::jsonb, $5::jsonb)
        """, name, api_json, description, inputs, outputs)

    async def list_comfy_workflows(self) -> List[Dict[str, Any]]:
        """List all comfy workflows"""
        rows = await self._fetch("""
            SELECT id, name, description, api_json, inputs, outputs 
            FROM comfy_workflows 
            ORDER BY id DESC
        """)
        return [dict(row) for row in rows]

    async def delete_comfy_workflow(self, id: int):
        """Delete a comfy workflow"""
        await self._execute("DELETE FROM comfy_workflows WHERE id = $1", id)

    async def get_comfy_workflow(self, id: int):
        """获取 ComfyUI 工作流字典"""
        row = await self._fetchrow("SELECT api_json FROM comfy_workflows WHERE id = $1", id)
        
        if not row:
            raise ValueError(f"Workflow with id {id} not found")
        
        try:
            workflow_json = row["api_json"]
            if isinstance(workflow_json, str):
                workflow_json = json.loads(workflow_json)
            return workflow_json
        except json.JSONDecodeError as exc:
            raise ValueError(f"Stored workflow api_json is not valid JSON: {exc}")

    # ============ 用戶相關方法 ============
    
    async def create_user(self, user_id: str, username: str, email: str, password_hash: str, 
                         provider: str = "local", google_id: Optional[str] = None, 
                         image_url: Optional[str] = None, role: str = "viewer") -> Dict[str, Any]:
        """創建新用戶"""
        try:
            if google_id:
                await self._execute("""
                    INSERT INTO users (id, username, email, password_hash, provider, google_id, image_url, role)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, user_id, username, email, password_hash, provider, google_id, image_url, role)
            else:
                await self._execute("""
                    INSERT INTO users (id, username, email, password_hash, provider, role)
                    VALUES ($1, $2, $3, $4, $5, $6)
                """, user_id, username, email, password_hash, provider, role)
            
            row = await self._fetchrow("SELECT * FROM users WHERE id = $1", user_id)
            return dict(row) if row else {}
        except asyncpg.UniqueViolationError as e:
            error_msg = str(e)
            if "username" in error_msg:
                raise ValueError("用户名已存在")
            elif "email" in error_msg:
                raise ValueError("邮箱已存在")
            elif "google_id" in error_msg:
                raise ValueError("Google账户已关联其他用户")
            raise

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """根據ID獲取用戶信息"""
        row = await self._fetchrow("""
            SELECT id, username, email, image_url, provider, google_id, role, created_at, updated_at
            FROM users
            WHERE id = $1
        """, user_id)
        return dict(row) if row else None

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """根據郵箱獲取用戶信息"""
        row = await self._fetchrow("""
            SELECT id, username, email, password_hash, image_url, provider, google_id, role, created_at, updated_at
            FROM users
            WHERE email = $1
        """, email)
        return dict(row) if row else None

    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """根據用戶名獲取用戶信息"""
        row = await self._fetchrow("""
            SELECT id, username, email, password_hash, image_url, provider, google_id, role, created_at, updated_at
            FROM users
            WHERE username = $1
        """, username)
        return dict(row) if row else None

    async def get_user_by_google_id(self, google_id: str) -> Optional[Dict[str, Any]]:
        """根據Google ID獲取用戶信息"""
        row = await self._fetchrow("""
            SELECT id, username, email, image_url, provider, google_id, role, created_at, updated_at
            FROM users
            WHERE google_id = $1
        """, google_id)
        return dict(row) if row else None

    async def update_user(self, user_id: str, **kwargs):
        """更新用戶信息"""
        if not kwargs:
            return
        
        set_clauses = []
        values = []
        param_num = 1
        
        for key, value in kwargs.items():
            set_clauses.append(f"{key} = ${param_num}")
            values.append(value)
            param_num += 1
        
        values.append(user_id)
        query = f"UPDATE users SET {', '.join(set_clauses)}, updated_at = NOW() WHERE id = ${param_num}"
        await self._execute(query, *values)

    # ============ 認證令牌相關方法 ============
    
    async def create_auth_token(self, token: str, user_id: str, expires_at: str, created_at: str):
        """創建認證令牌"""
        # 将字符串时间戳转换为 datetime 对象
        try:
            expires_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            created_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        except ValueError:
            # 如果解析失败，尝试其他格式
            from dateutil.parser import parse
            expires_dt = parse(expires_at)
            created_dt = parse(created_at)
        
        await self._execute("""
            INSERT INTO auth_tokens (token, user_id, expires_at, created_at)
            VALUES ($1, $2, $3, $4)
        """, token, user_id, expires_dt, created_dt)

    async def get_auth_token(self, token: str) -> Optional[Dict[str, Any]]:
        """獲取認證令牌信息（包含用戶信息）"""
        row = await self._fetchrow("""
            SELECT t.token, t.user_id, t.expires_at, u.username, u.email, u.image_url, u.role
            FROM auth_tokens t
            JOIN users u ON t.user_id = u.id
            WHERE t.token = $1
        """, token)
        return dict(row) if row else None

    async def delete_auth_token(self, token_or_user_id: str, by_user_id: bool = False):
        """刪除認證令牌"""
        if by_user_id:
            await self._execute("DELETE FROM auth_tokens WHERE user_id = $1", token_or_user_id)
        else:
            await self._execute("DELETE FROM auth_tokens WHERE token = $1", token_or_user_id)

    async def cleanup_expired_tokens(self):
        """清理過期的令牌"""
        await self._execute("DELETE FROM auth_tokens WHERE expires_at < NOW()")

    # ============ 設備碼相關方法 ============
    
    async def create_device_code(self, code: str, status: str, expires_at: str, created_at: str):
        """創建設備碼"""
        # 将字符串时间戳转换为 datetime 对象
        try:
            expires_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            created_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        except ValueError:
            # 如果解析失败，尝试其他格式
            from dateutil.parser import parse
            expires_dt = parse(expires_at)
            created_dt = parse(created_at)
        
        await self._execute("""
            INSERT INTO device_codes (code, status, expires_at, created_at)
            VALUES ($1, $2, $3, $4)
        """, code, status, expires_dt, created_dt)

    async def get_device_code(self, code: str) -> Optional[Dict[str, Any]]:
        """獲取設備碼信息"""
        row = await self._fetchrow("""
            SELECT code, status, expires_at, created_at, user_id
            FROM device_codes
            WHERE code = $1
        """, code)
        return dict(row) if row else None

    async def update_device_code(self, code: str, status: str, user_id: Optional[str] = None):
        """更新設備碼狀態"""
        if user_id:
            await self._execute("""
                UPDATE device_codes
                SET status = $1, user_id = $2
                WHERE code = $3
            """, status, user_id, code)
        else:
            await self._execute("""
                UPDATE device_codes
                SET status = $1
                WHERE code = $2
            """, status, code)

    async def delete_device_code(self, code: str):
        """刪除設備碼"""
        await self._execute("DELETE FROM device_codes WHERE code = $1", code)

    async def cleanup_expired_device_codes(self):
        """清理過期的設備碼"""
        await self._execute("DELETE FROM device_codes WHERE expires_at < NOW()")

    async def close(self):
        """關閉連接池"""
        if self.pool:
            await self.pool.close()
            logger.info("✅ Supabase 連接池已關閉")

# Create a singleton instance
db_service = DatabaseService()
