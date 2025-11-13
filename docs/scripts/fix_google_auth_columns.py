#!/usr/bin/env python3
"""
修复数据库：添加 Google OAuth 所需的列
解决 "no such column: google_id" 错误
"""
import sqlite3
import os
import sys

# 添加 server 目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from services.config_service import USER_DATA_DIR

DB_PATH = os.path.join(USER_DATA_DIR, "localmanus.db")

def fix_database():
    """添加缺失的 google_id 和 provider 列"""
    if not os.path.exists(DB_PATH):
        print(f"❌ 数据库文件不存在: {DB_PATH}")
        return False
    
    print(f"📁 数据库路径: {DB_PATH}")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 检查表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("❌ users 表不存在")
            conn.close()
            return False
        
        # 检查现有列
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        print(f"📋 当前 users 表的列: {', '.join(columns)}")
        
        # 添加 google_id 列（如果不存在）
        if 'google_id' not in columns:
            print("➕ 添加 google_id 列...")
            try:
                # SQLite 不支持直接添加 UNIQUE 列，先添加普通列
                cursor.execute("ALTER TABLE users ADD COLUMN google_id TEXT")
                conn.commit()
                print("✅ 成功添加 google_id 列")
                
                # 创建唯一索引来确保唯一性
                try:
                    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL")
                    conn.commit()
                    print("✅ 创建 google_id 唯一索引")
                except sqlite3.OperationalError as e:
                    print(f"⚠️  创建 google_id 唯一索引时出错: {e}")
            except sqlite3.OperationalError as e:
                print(f"⚠️  添加 google_id 列时出错: {e}")
        else:
            print("✅ google_id 列已存在")
        
        # 添加 provider 列（如果不存在）
        if 'provider' not in columns:
            print("➕ 添加 provider 列...")
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'local'")
                conn.commit()
                print("✅ 成功添加 provider 列")
            except sqlite3.OperationalError as e:
                print(f"⚠️  添加 provider 列时出错: {e}")
        else:
            print("✅ provider 列已存在")
        
        # 为现有用户设置默认 provider（如果还没有设置）
        cursor.execute("UPDATE users SET provider = 'local' WHERE provider IS NULL OR provider = ''")
        conn.commit()
        print("✅ 更新现有用户的 provider 字段")
        
        # 创建索引（如果还没有创建唯一索引）
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL")
            print("✅ 创建 google_id 索引")
        except sqlite3.OperationalError as e:
            print(f"⚠️  创建 google_id 索引时出错: {e}")
        
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider)")
            print("✅ 创建 provider 索引")
        except sqlite3.OperationalError as e:
            print(f"⚠️  创建 provider 索引时出错: {e}")
        
        # 验证列是否已添加
        cursor.execute("PRAGMA table_info(users)")
        columns_after = [row[1] for row in cursor.fetchall()]
        print(f"📋 修复后 users 表的列: {', '.join(columns_after)}")
        
        # 检查是否成功
        if 'google_id' in columns_after and 'provider' in columns_after:
            print("\n✅ 数据库修复成功！")
            print("✅ google_id 和 provider 列已添加")
            conn.close()
            return True
        else:
            print("\n❌ 数据库修复失败")
            conn.close()
            return False
            
    except Exception as e:
        print(f"❌ 修复数据库时出错: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔧 开始修复数据库...")
    print("=" * 50)
    success = fix_database()
    print("=" * 50)
    if success:
        print("✅ 修复完成！现在可以正常使用 Google 登录了。")
        sys.exit(0)
    else:
        print("❌ 修复失败，请检查错误信息。")
        sys.exit(1)

