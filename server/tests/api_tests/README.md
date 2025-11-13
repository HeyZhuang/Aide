# API 测试目录

本目录包含项目的 API 集成测试脚本。

## 📁 目录结构

```
server/tests/api_tests/
├── README.md                      # 本文档
├── Gemini API 测试
│   ├── test_gemini_api.py         # Gemini API 完整测试
│   └── test_gemini_connection.py  # Gemini 连接测试
├── PSD API 测试
│   ├── test_psd_api.py            # PSD 文件处理 API 测试
│   └── test_resize_by_id.py       # PSD 缩放 API 测试
└── 模板 API 测试
    ├── test_template_api.py       # 模板 API 测试
    └── test_template_preview.py   # 模板预览测试
```

## 🧪 测试说明

### Gemini API 测试

#### test_gemini_api.py
完整的 Gemini API 功能测试。

**测试内容**:
- ✅ API 连接验证
- ✅ 图像生成功能
- ✅ 不同宽高比测试
- ✅ 错误处理

**运行**:
```bash
cd server
python tests/api_tests/test_gemini_api.py
```

**前置条件**:
- Gemini API Key 已配置
- 服务器正在运行

---

#### test_gemini_connection.py
快速的 Gemini 连接测试。

**测试内容**:
- ✅ API Key 验证
- ✅ 网络连接
- ✅ 认证状态

**运行**:
```bash
cd server
python tests/api_tests/test_gemini_connection.py
```

---

### PSD API 测试

#### test_psd_api.py
PSD 文件处理 API 的完整测试。

**测试内容**:
- ✅ PSD 文件上传
- ✅ 图层提取
- ✅ 缩略图生成
- ✅ 元数据读取

**运行**:
```bash
cd server
python tests/api_tests/test_psd_api.py
```

**测试文件**:
- 需要准备测试用的 PSD 文件
- 放在 `server/tests/fixtures/` 目录

---

#### test_resize_by_id.py
PSD 缩放功能测试。

**测试内容**:
- ✅ 按 ID 查找 PSD
- ✅ 智能缩放
- ✅ 自动适配画布
- ✅ 图层重排

**运行**:
```bash
cd server
python tests/api_tests/test_resize_by_id.py
```

---

### 模板 API 测试

#### test_template_api.py
模板管理 API 测试。

**测试内容**:
- ✅ 创建模板
- ✅ 获取模板列表
- ✅ 更新模板
- ✅ 删除模板

**运行**:
```bash
cd server
python tests/api_tests/test_template_api.py
```

---

#### test_template_preview.py
模板预览功能测试。

**测试内容**:
- ✅ 预览图生成
- ✅ 不同尺寸预览
- ✅ 缓存机制

**运行**:
```bash
cd server
python tests/api_tests/test_template_preview.py
```

---

## 🚀 运行所有测试

### 运行单个测试
```bash
cd server
python tests/api_tests/test_gemini_api.py
```

### 运行所有 API 测试
```bash
cd server
python -m pytest tests/api_tests/ -v
```

### 运行特定类别的测试
```bash
# 只运行 Gemini 测试
python -m pytest tests/api_tests/test_gemini*.py -v

# 只运行 PSD 测试
python -m pytest tests/api_tests/test_psd*.py -v

# 只运行模板测试
python -m pytest tests/api_tests/test_template*.py -v
```

---

## ⚙️ 测试配置

### 环境变量

某些测试需要配置环境变量：

```bash
# Gemini API Key
export GEMINI_API_KEY="your-api-key"

# 服务器地址
export API_BASE_URL="http://localhost:8000"

# 测试数据库
export TEST_DATABASE_URL="sqlite:///test.db"
```

### 测试数据

测试所需的数据文件放在：
- `server/tests/fixtures/` - 测试文件
- `server/tests/data/` - 测试数据

---

## 📊 测试覆盖率

查看测试覆盖率：

```bash
cd server
pytest tests/api_tests/ --cov=. --cov-report=html
```

生成的报告在 `htmlcov/index.html`

---

## ⚠️ 注意事项

### API 配额

1. **Gemini API**: 免费版有配额限制，测试时注意
2. **避免频繁测试**: 可能耗尽配额
3. **使用 Mock**: 开发时考虑使用 Mock 数据

### 测试数据

1. **清理测试数据**: 测试后清理生成的文件
2. **不要提交测试文件**: 大文件不要提交到 Git
3. **使用临时目录**: 生成的文件放在临时目录

### 并发测试

1. **避免并发**: 某些 API 测试不支持并发运行
2. **数据库锁**: 注意数据库锁问题
3. **端口冲突**: 确保测试端口不冲突

---

## 🐛 故障排除

### 测试失败

**问题**: 测试运行失败

**检查**:
1. 服务器是否运行
2. API Key 是否配置
3. 网络连接是否正常
4. 测试数据是否存在

### API 超时

**问题**: 测试超时

**解决**:
1. 增加超时时间
2. 检查网络速度
3. 验证 API 服务状态

### 权限错误

**问题**: 文件权限错误

**解决**:
1. 检查文件权限
2. 确保测试目录可写
3. 使用正确的用户运行

---

## 📚 相关文档

- [../test_gemini_quick.py](../test_gemini_quick.py) - Gemini 快速测试
- [../test_gemini_basic.py](../test_gemini_basic.py) - Gemini 基础测试
- [../../docs/integrations/TESTING_GUIDE.md](../../docs/integrations/TESTING_GUIDE.md) - 测试指南

---

**最后更新**: 2025-11-13
