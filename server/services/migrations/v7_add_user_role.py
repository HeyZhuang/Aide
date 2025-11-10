"""
Migration v7: Add role field to users table
"""
import sqlite3
from . import Migration


class V7AddUserRole(Migration):
    version = 7
    description = "Add role field to users table for user identity system"

    def up(self, conn: sqlite3.Connection):
        """Add role column to users table"""
        # 添加 role 字段，默认为 'user'
        try:
            conn.execute("""
                ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' NOT NULL;
            """)
        except sqlite3.OperationalError:
            # 字段可能已存在，忽略错误
            pass
        
        # 创建索引以加速角色查询
        try:
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)")
        except sqlite3.OperationalError:
            pass
        
        # 将现有用户的角色设置为 'user'（如果还没有设置）
        try:
            conn.execute("""
                UPDATE users SET role = 'user' WHERE role IS NULL OR role = '';
            """)
        except sqlite3.OperationalError:
            pass
        
        print("✅ Added role field to users table")

    def down(self, conn: sqlite3.Connection):
        """Remove role column from users table"""
        # SQLite 不支持直接删除列，需要重建表
        # 这里我们只删除索引
        try:
            conn.execute("DROP INDEX IF EXISTS idx_users_role")
        except sqlite3.OperationalError:
            pass



