"""
Migration v5: Add Google OAuth support to users table
"""
import sqlite3
from . import Migration


class V5AddGoogleAuth(Migration):
    version = 5
    description = "Add Google OAuth support to users table"

    def up(self, conn: sqlite3.Connection):
        """Add Google OAuth fields to users table"""
        # 添加 google_id 字段（用于存储 Google 用户 ID）
        # SQLite 不支持在 ALTER TABLE ADD COLUMN 时直接添加 UNIQUE 约束
        # 所以先添加普通列，然后创建唯一索引
        try:
            conn.execute("ALTER TABLE users ADD COLUMN google_id TEXT")
            conn.commit()
        except sqlite3.OperationalError:
            # 字段可能已存在，忽略错误
            pass
        
        # 添加 provider 字段（用于标识登录提供者：local, google）
        try:
            conn.execute("ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'local'")
            conn.commit()
        except sqlite3.OperationalError:
            # 字段可能已存在，忽略错误
            pass
        
        # 为现有用户设置默认 provider（如果还没有设置）
        try:
            conn.execute("UPDATE users SET provider = 'local' WHERE provider IS NULL OR provider = ''")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        
        # 修改 password_hash 为可选（Google 用户不需要密码）
        # SQLite 不支持直接修改列，但我们可以通过创建新表来迁移
        # 这里我们保持 password_hash 为 NOT NULL，但允许空字符串
        
        # 创建唯一索引来确保 google_id 的唯一性
        try:
            conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        
        # 创建索引以加速 Google ID 查询
        try:
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        
        try:
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider)")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        
        print("✅ Added Google OAuth support to users table")

    def down(self, conn: sqlite3.Connection):
        """Remove Google OAuth fields from users table"""
        # SQLite 不支持直接删除列，需要重建表
        # 这里我们只删除索引
        try:
            conn.execute("DROP INDEX IF EXISTS idx_users_google_id")
        except sqlite3.OperationalError:
            pass
        
        try:
            conn.execute("DROP INDEX IF EXISTS idx_users_provider")
        except sqlite3.OperationalError:
            pass


