"""
Migration v6: Add user_id to canvases table for user isolation
"""
import sqlite3
from . import Migration


class V6AddUserIdToCanvases(Migration):
    version = 6
    description = "Add user_id to canvases table for user isolation"

    def up(self, conn: sqlite3.Connection):
        """Add user_id column to canvases table"""
        # 添加 user_id 字段
        try:
            conn.execute("ALTER TABLE canvases ADD COLUMN user_id TEXT")
        except sqlite3.OperationalError:
            # 字段可能已存在，忽略错误
            pass
        
        # 创建索引以加速用户查询
        try:
            conn.execute("CREATE INDEX IF NOT EXISTS idx_canvases_user_id ON canvases(user_id)")
        except sqlite3.OperationalError:
            pass
        
        # 创建外键约束（如果可能）
        # SQLite 不支持在 ALTER TABLE 中添加外键，所以这里只创建索引
        
        # 对于现有的画布，如果没有 user_id，设置为 NULL（这些画布将被视为公共画布）
        # 在生产环境中，可能需要将这些画布分配给特定用户或删除
        
        print("✅ Added user_id to canvases table")

    def down(self, conn: sqlite3.Connection):
        """Remove user_id column from canvases table"""
        # SQLite 不支持直接删除列，需要重建表
        # 这里我们只删除索引
        try:
            conn.execute("DROP INDEX IF EXISTS idx_canvases_user_id")
        except sqlite3.OperationalError:
            pass


