#!/usr/bin/env python3
"""
SQLite 到 Supabase 資料遷移腳本
將本地 SQLite 資料庫的數據遷移到 Supabase PostgreSQL
"""
import asyncio
import json
import os
import sys
import sqlite3
import asyncpg
from datetime import datetime
from typing import Dict, Any, List

# 添加項目路徑
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 配置
SQLITE_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "user_data", "localmanus.db")
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")

if not SUPABASE_DB_URL:
    print("❌ 錯誤: 請設置 SUPABASE_DB_URL 或 DATABASE_URL 環境變數")
    print("格式: postgresql://postgres:[password]@[host]:5432/postgres")
    sys.exit(1)


async def migrate_table(conn: asyncpg.Connection, table_name: str, sqlite_conn: sqlite3.Connection):
    """遷移單個表的數據"""
    print(f"\n📦 遷移表: {table_name}")
    
    # 從 SQLite 讀取數據
    cursor = sqlite_conn.execute(f"SELECT * FROM {table_name}")
    columns = [description[0] for description in cursor.description]
    rows = cursor.fetchall()
    
    if not rows:
        print(f"  ⚠️  表 {table_name} 為空，跳過")
        return 0
    
    print(f"  📊 找到 {len(rows)} 條記錄")
    
    # 轉換數據並插入到 PostgreSQL
    inserted = 0
    for row in rows:
        try:
            row_dict = dict(zip(columns, row))
            
            # 處理特殊字段
            if 'data' in row_dict and row_dict['data']:
                # JSON 字段在 PostgreSQL 中需要特殊處理
                if isinstance(row_dict['data'], str):
                    try:
                        row_dict['data'] = json.loads(row_dict['data'])
                    except:
                        pass
            
            # 構建 INSERT 語句
            placeholders = ', '.join([f'${i+1}' for i in range(len(columns))])
            column_names = ', '.join(columns)
            
            # 處理 JSONB 字段
            values = []
            for col in columns:
                val = row_dict[col]
                if col in ['data', 'api_json', 'inputs', 'outputs', 'template_metadata', 'tags'] and val:
                    if isinstance(val, str):
                        try:
                            val = json.loads(val)
                        except:
                            pass
                    values.append(json.dumps(val) if val else None)
                else:
                    values.append(val)
            
            # 執行插入（使用 ON CONFLICT 避免重複）
            query = f"""
                INSERT INTO {table_name} ({column_names})
                VALUES ({placeholders})
                ON CONFLICT DO NOTHING
            """
            
            await conn.execute(query, *values)
            inserted += 1
            
        except Exception as e:
            print(f"  ⚠️  插入記錄失敗: {e}")
            continue
    
    print(f"  ✅ 成功插入 {inserted}/{len(rows)} 條記錄")
    return inserted


async def main():
    """主遷移函數"""
    print("🚀 開始遷移 SQLite 到 Supabase...")
    print(f"📁 SQLite 資料庫: {SQLITE_DB_PATH}")
    print(f"🔗 Supabase 連接: {SUPABASE_DB_URL.split('@')[1] if '@' in SUPABASE_DB_URL else '已配置'}")
    
    # 檢查 SQLite 文件是否存在
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"❌ 錯誤: SQLite 資料庫文件不存在: {SQLITE_DB_PATH}")
        sys.exit(1)
    
    # 連接 SQLite
    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    
    # 連接 Supabase
    try:
        pg_conn = await asyncpg.connect(SUPABASE_DB_URL)
        print("✅ 成功連接到 Supabase")
    except Exception as e:
        print(f"❌ 連接 Supabase 失敗: {e}")
        sys.exit(1)
    
    try:
        # 獲取所有表
        cursor = sqlite_conn.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        """)
        tables = [row[0] for row in cursor.fetchall()]
        
        print(f"\n📋 找到 {len(tables)} 個表: {', '.join(tables)}")
        
        # 遷移每個表
        total_inserted = 0
        for table in tables:
            if table == 'db_version':
                print(f"\n⏭️  跳過系統表: {table}")
                continue
            
            try:
                inserted = await migrate_table(pg_conn, table, sqlite_conn)
                total_inserted += inserted
            except Exception as e:
                print(f"❌ 遷移表 {table} 失敗: {e}")
                continue
        
        print(f"\n✅ 遷移完成！總共遷移 {total_inserted} 條記錄")
        
    finally:
        sqlite_conn.close()
        await pg_conn.close()
        print("\n🔒 連接已關閉")


if __name__ == "__main__":
    asyncio.run(main())





