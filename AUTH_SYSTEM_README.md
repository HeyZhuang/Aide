# 用户认证系统使用说明

## ✅ 已完成的功能

### 1. 数据库表
- ✅ `users` - 用户表（用户名、邮箱、密码哈希等）
- ✅ `device_codes` - 设备码表（用于设备认证流程）
- ✅ `auth_tokens` - Token表（存储访问令牌）

### 2. 认证服务 (`auth_service.py`)
- ✅ 用户创建和验证
- ✅ 密码哈希（SHA-256）
- ✅ 设备码管理（数据库存储）
- ✅ Token生成和验证
- ✅ Token刷新

### 3. 登录表单页面
- ✅ 美观的登录界面
- ✅ 用户名/邮箱登录
- ✅ 错误提示
- ✅ 自动授权设备

### 4. API端点
- ✅ `POST /api/device/auth` - 创建设备码
- ✅ `GET /auth/device?code=xxx` - 登录表单页面
- ✅ `POST /api/device/authorize` - 验证登录并授权设备
- ✅ `GET /api/device/poll?code=xxx` - 轮询认证状态
- ✅ `GET /api/device/refresh-token` - 刷新Token

## 🚀 使用方法

### 创建用户

使用脚本创建用户：
```bash
cd /home/ubuntu/cckz/psd-canvas-jaaz
./create_user.sh <username> <email> <password>
```

示例：
```bash
./create_user.sh admin admin@test.com admin123
```

### 默认测试账号

系统已创建默认测试账号：
- **用户名**: `admin`
- **邮箱**: `admin@test.com`
- **密码**: `admin123`

⚠️ **重要**: 请在生产环境中修改默认密码！

### 登录流程

1. 用户点击"开始登录"按钮
2. 前端调用 `POST /api/device/auth` 获取设备码
3. 浏览器打开 `/auth/device?code=xxx` 登录页面
4. 用户输入用户名和密码
5. 前端轮询 `GET /api/device/poll` 检查认证状态
6. 认证成功后获取 Token 和用户信息

## 📝 数据库结构

### users 表
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    image_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
```

### device_codes 表
```sql
CREATE TABLE device_codes (
    code TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    user_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

### auth_tokens 表
```sql
CREATE TABLE auth_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

## 🔒 安全特性

1. **密码加密**: 使用 SHA-256 哈希存储密码
2. **Token过期**: Token有效期为7天
3. **设备码过期**: 设备码有效期为10分钟
4. **自动清理**: 过期Token和设备码会被自动清理

## 🔧 二次开发建议

1. **密码加密**: 当前使用 SHA-256，建议升级为 bcrypt 或 argon2
2. **Token存储**: 当前使用数据库，可考虑迁移到 Redis 提升性能
3. **用户注册**: 可以添加注册页面和API端点
4. **密码重置**: 可以添加密码重置功能
5. **邮箱验证**: 可以添加邮箱验证功能
6. **双因素认证**: 可以添加 2FA 支持

## 📊 数据库位置

数据库文件位于：
```
/home/ubuntu/cckz/psd-canvas-jaaz/server/user_data/localmanus.db
```

## 🧪 测试

测试完整登录流程：
```bash
# 1. 创建设备码
DEVICE_CODE=$(curl -s "http://localhost:57988/api/device/auth" -X POST | jq -r '.code')

# 2. 授权设备（使用测试账号）
curl -X POST "http://localhost:57988/api/device/authorize" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$DEVICE_CODE\",\"username\":\"admin\",\"password\":\"admin123\"}"

# 3. 轮询认证状态
curl "http://localhost:57988/api/device/poll?code=$DEVICE_CODE"
```

