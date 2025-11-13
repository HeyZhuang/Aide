# 项目脚本目录

本目录包含项目的各类工具脚本。

## 📁 目录结构

```
docs/scripts/
├── README.md                        # 本文档
├── 用户管理脚本
│   ├── create_user.py              # 创建用户
│   ├── create_user.sh              # 创建用户（Shell 版本）
│   ├── create_test_accounts.py     # 创建测试账户
│   ├── verify_test_accounts.py     # 验证测试账户
│   └── fix_admin_accounts.py       # 修复管理员账户
├── API 和认证脚本
│   ├── setup_api_key.py            # 配置 API Key
│   ├── setup_gemini_key.py         # 配置 Gemini API Key
│   ├── verify_api_key.py           # 验证 API Key
│   └── fix_google_auth_columns.py  # 修复 Google 认证数据库列
├── 系统配置脚本
│   ├── quick_fix_fonts.sh          # 快速修复字体
│   ├── verify_fonts_setup.py       # 验证字体配置
│   ├── 检查配额状态.py              # 检查 API 配额
│   └── 检查智能缩放配置.py          # 检查智能缩放配置
```

## 🚀 使用说明

### 用户管理

#### 创建新用户
```bash
# Python 版本
python docs/scripts/create_user.py

# Shell 版本
bash docs/scripts/create_user.sh
```

#### 创建测试账户
```bash
python docs/scripts/create_test_accounts.py
```

#### 验证测试账户
```bash
python docs/scripts/verify_test_accounts.py
```

### API 配置

#### 配置 Jaaz API Key
```bash
python docs/scripts/setup_api_key.py
```

#### 配置 Gemini API Key
```bash
python docs/scripts/setup_gemini_key.py
```

#### 验证 API Key
```bash
python docs/scripts/verify_api_key.py
```

### 系统维护

#### 修复字体问题
```bash
bash docs/scripts/quick_fix_fonts.sh
```

#### 检查配额状态
```bash
python docs/scripts/检查配额状态.py
```

#### 检查智能缩放配置
```bash
python docs/scripts/检查智能缩放配置.py
```

## ⚠️ 注意事项

1. **数据库访问**: 大部分脚本需要访问数据库，确保在 `server/` 目录下运行
2. **环境变量**: 某些脚本需要配置环境变量（如 API Keys）
3. **权限**: 部分脚本可能需要管理员权限
4. **备份**: 运行修改数据库的脚本前请先备份数据

## 📝 脚本说明

### create_user.py
创建新的用户账户，包括设置用户名、密码、邮箱等信息。

### create_test_accounts.py
批量创建测试账户，用于开发和测试环境。

### setup_api_key.py
交互式配置 Jaaz API Key 到 config.toml 文件。

### setup_gemini_key.py
交互式配置 Google Gemini API Key。

### verify_api_key.py
验证配置的 API Key 是否有效，测试 API 连接。

### fix_admin_accounts.py
修复管理员账户权限问题。

### fix_google_auth_columns.py
修复 Google OAuth 认证相关的数据库列问题。

### quick_fix_fonts.sh
快速修复字体渲染问题，重新安装字体依赖。

### verify_fonts_setup.py
验证字体配置是否正确，检查字体文件是否存在。

### 检查配额状态.py
检查各个 API 提供商的配额使用情况。

### 检查智能缩放配置.py
检查 PSD 智能缩放功能的配置状态。

---

**最后更新**: 2025-11-13
