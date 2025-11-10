# Google OAuth 登录配置指南

本文档说明如何配置 Google OAuth 登录功能。

## 📋 前置要求

1. 已安装 Google OAuth 依赖包（已在 `requirements.txt` 中添加）
2. 拥有 Google Cloud Platform (GCP) 账户
3. 已创建 Google Cloud 项目

## 🔧 配置步骤

### 1. 在 Google Cloud Console 中创建 OAuth 2.0 客户端 ID

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择或创建项目
3. 启用 **Google+ API** 或 **Google Identity API**
4. 导航到 **API 和服务** > **凭据**
5. 点击 **创建凭据** > **OAuth 客户端 ID**
6. 如果首次创建，需要先配置 OAuth 同意屏幕：
   - 选择用户类型（内部或外部）
   - 填写应用名称、用户支持电子邮件等
   - 添加测试用户（如果应用未发布）
7. 创建 OAuth 客户端 ID：
   - **应用类型**: 选择 "Web 应用"
   - **名称**: 输入应用名称（例如：PSD Canvas Jaaz）
   - **已授权的 JavaScript 来源**: 
     - 开发环境: `http://localhost:57988`
     - 生产环境: `https://your-domain.com`
   - **已授权的重定向 URI**:
     - 开发环境: `http://localhost:57988/api/auth/google/callback`
     - 生产环境: `https://your-domain.com/api/auth/google/callback`
8. 点击 **创建**，保存 **客户端 ID** 和 **客户端密钥**

### 2. 设置环境变量

在服务器环境中设置以下环境变量：

```bash
# Google OAuth 配置
export GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
export GOOGLE_REDIRECT_URI="http://localhost:57988/api/auth/google/callback"  # 可选，如果不设置会自动从请求中获取
```

或者在 `.env` 文件中添加：

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:57988/api/auth/google/callback
```

### 3. 安装依赖包

确保已安装 Google OAuth 依赖包：

```bash
pip install google-auth google-auth-oauthlib google-auth-httplib2
```

或者使用 requirements.txt：

```bash
pip install -r server/requirements.txt
```

### 4. 运行数据库迁移

确保数据库已更新以支持 Google 登录：

```bash
# 数据库迁移会自动运行，确保 users 表包含以下字段：
# - google_id (TEXT UNIQUE)
# - provider (TEXT DEFAULT 'local')
```

## 🚀 使用方法

### 前端使用

用户可以在登录对话框中点击 **"使用 Google 登录"** 按钮：

1. 点击 Google 登录按钮
2. 系统会打开新窗口，跳转到 Google 登录页面
3. 用户选择 Google 账户并授权
4. 授权成功后，窗口自动关闭
5. 系统自动完成登录并保存用户信息

### API 端点

#### 启动 Google OAuth 流程

```http
GET /api/auth/google/start
```

**响应**:
```json
{
  "status": "pending",
  "code": "device-code",
  "auth_url": "https://accounts.google.com/o/oauth2/auth?...",
  "expires_at": "2024-01-01T12:00:00",
  "message": "请在新打开的浏览器窗口中完成 Google 认证"
}
```

#### Google OAuth 回调

```http
GET /api/auth/google/callback?code=authorization-code&state=oauth-state&device_code=device-code
```

**响应**:
```json
{
  "status": "success",
  "message": "Google 认证成功",
  "code": "device-code",
  "token": "access-token",
  "user_info": {
    "id": "user-id",
    "username": "username",
    "email": "user@example.com",
    "image_url": "https://...",
    "provider": "google",
    "google_id": "google-user-id"
  }
}
```

## 🔒 安全注意事项

1. **保护客户端密钥**: 永远不要将 `GOOGLE_CLIENT_SECRET` 提交到代码仓库
2. **使用环境变量**: 在生产环境中使用环境变量或密钥管理服务
3. **限制重定向 URI**: 在 Google Cloud Console 中只添加必要的重定向 URI
4. **HTTPS**: 在生产环境中必须使用 HTTPS
5. **定期轮换密钥**: 定期更新 OAuth 客户端密钥

## 🐛 故障排除

### 问题：Google 登录按钮不可用

**可能原因**:
- Google OAuth 依赖包未安装
- 环境变量未设置

**解决方法**:
1. 检查依赖包是否已安装：`pip list | grep google-auth`
2. 检查环境变量是否设置：`echo $GOOGLE_CLIENT_ID`
3. 查看服务器日志，确认是否有错误信息

### 问题：重定向 URI 不匹配

**错误信息**: `redirect_uri_mismatch`

**解决方法**:
1. 检查 Google Cloud Console 中配置的重定向 URI
2. 确保与 `GOOGLE_REDIRECT_URI` 环境变量或实际请求的 URI 完全匹配
3. 注意协议（http/https）和端口号必须完全一致

### 问题：无法获取用户信息

**可能原因**:
- OAuth 同意屏幕未配置
- 未请求必要的权限范围

**解决方法**:
1. 确保在 Google Cloud Console 中配置了 OAuth 同意屏幕
2. 检查 `SCOPES` 配置是否包含必要的权限：
   - `openid`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

### 问题：用户已存在但无法关联 Google 账户

**可能原因**:
- 邮箱已被其他账户使用
- Google ID 已关联其他用户

**解决方法**:
- 系统会自动处理：如果邮箱已存在但未关联 Google，会自动关联
- 如果邮箱已关联其他 Google 账户，会返回错误信息

## 📝 数据库结构

Google 登录功能在 `users` 表中添加了以下字段：

- `google_id` (TEXT UNIQUE): Google 用户 ID
- `provider` (TEXT DEFAULT 'local'): 登录提供者（'local' 或 'google'）

## 🔄 用户创建逻辑

1. **首次 Google 登录**: 自动创建新用户，使用邮箱前缀作为用户名
2. **已存在 Google 用户**: 更新用户信息（邮箱、头像等）
3. **邮箱已存在但未关联**: 自动关联 Google 账户到现有用户
4. **邮箱已关联其他 Google 账户**: 返回错误，不允许关联

## 📚 相关文档

- [Google OAuth 2.0 文档](https://developers.google.com/identity/protocols/oauth2)
- [Google Identity API](https://developers.google.com/identity)
- [FastAPI 文档](https://fastapi.tiangolo.com/)

## ✅ 验证配置

配置完成后，可以通过以下方式验证：

1. 启动服务器
2. 打开登录对话框
3. 点击 "使用 Google 登录" 按钮
4. 应该能够成功跳转到 Google 登录页面
5. 完成登录后，应该能够成功返回并完成认证

如果遇到问题，请查看服务器日志以获取详细的错误信息。


