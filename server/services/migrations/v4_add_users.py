"""
Migration v4: Add users and authentication tables
"""
import sqlite3
from . import Migration


class V4AddUsers(Migration):
    version = 4
    description = "Add users table and authentication tables"

    def up(self, conn: sqlite3.Connection):
        """Create users and authentication tables"""
        # 用户表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                image_url TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # 设备码表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS device_codes (
                code TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                user_id TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # Token表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS auth_tokens (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # 创建索引
        conn.execute("CREATE INDEX IF NOT EXISTS idx_device_codes_expires ON device_codes(expires_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at)")
        
        print("✅ Created users, device_codes, and auth_tokens tables")

    def down(self, conn: sqlite3.Connection):
        """Drop users and authentication tables"""
        conn.execute("DROP TABLE IF EXISTS auth_tokens")
        conn.execute("DROP TABLE IF EXISTS device_codes")
        conn.execute("DROP TABLE IF EXISTS users")

