# 模型集成文档目录

本目录包含 PSD Canvas 项目中各个 AI 模型的集成文档。

---

## 📚 Gemini 集成文档

### 核心文档

| 文档 | 说明 | 适用对象 |
|------|------|---------|
| [GEMINI_INTEGRATION_COMPLETE.md](./GEMINI_INTEGRATION_COMPLETE.md) | **集成完成报告**（总览） | 所有用户 |
| [GEMINI_INTEGRATION_FINAL.md](./GEMINI_INTEGRATION_FINAL.md) | **Gemini 集成完整指南**（推荐阅读） | 所有用户 |
| [INSTALLATION_CHECKLIST.md](./INSTALLATION_CHECKLIST.md) | 安装检查清单 | 所有用户 |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | 后端测试指南 | 开发者 |
| [GEMINI_FIXES.md](./GEMINI_FIXES.md) | 问题修复记录 | 开发者 |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd server
pip install langchain-google-genai google-genai
```

### 2. 配置 API Key

编辑 `server/user_data/config.toml`：

```toml
[gemini]
api_key = "your-api-key-here"
```

获取 API Key：https://aistudio.google.com/app/apikey

### 3. 测试集成

```bash
cd server
python tests/test_gemini_quick.py
```

### 4. 启动服务

```bash
cd server
python main.py
```

---

## 📋 已集成的 Gemini 模型

| 模型名称 | 类型 | 用途 | 状态 |
|---------|------|------|------|
| `gemini-2.5-flash` | 文本 | AI 对话和推理 | ✅ 可用 |
| `gemini-2.5-flash-image` | 图像 | 图像生成和编辑 | ✅ 可用 |

---

## 📖 文档阅读顺序

### 对于新用户

1. 阅读 [GEMINI_INTEGRATION_COMPLETE.md](./GEMINI_INTEGRATION_COMPLETE.md) - 快速了解集成概况
2. 阅读 [INSTALLATION_CHECKLIST.md](./INSTALLATION_CHECKLIST.md) - 按照清单安装配置
3. 按照快速开始步骤配置
4. 启动服务并在前端测试

### 对于开发者

1. 阅读 [GEMINI_INTEGRATION_COMPLETE.md](./GEMINI_INTEGRATION_COMPLETE.md) - 了解整体架构
2. 阅读 [GEMINI_INTEGRATION_FINAL.md](./GEMINI_INTEGRATION_FINAL.md) - 深入技术细节
3. 阅读 [TESTING_GUIDE.md](./TESTING_GUIDE.md) - 学习如何测试
4. 参考 [GEMINI_FIXES.md](./GEMINI_FIXES.md) - 了解已知问题

### 遇到问题时

1. 查看 [INSTALLATION_CHECKLIST.md](./INSTALLATION_CHECKLIST.md) 的验证步骤
2. 查看 [GEMINI_INTEGRATION_FINAL.md](./GEMINI_INTEGRATION_FINAL.md) 的常见问题部分
3. 查看 [GEMINI_FIXES.md](./GEMINI_FIXES.md) 的问题修复记录
4. 参考 [TESTING_GUIDE.md](./TESTING_GUIDE.md) 的排查步骤

---

## 🔧 技术架构概述

### 文本模型集成

- **框架**：LangChain
- **实现位置**：`server/services/langgraph_service/agent_service.py`
- **使用的库**：`langchain-google-genai`

### 图像模型集成

- **架构模式**：Provider Pattern
- **核心文件**：
  - Provider: `server/tools/image_providers/gemini_provider.py`
  - Tool: `server/tools/generate_image_by_gemini_2_5_flash.py`
  - 注册: `server/services/tool_service.py`

---

## 📁 相关代码文件

### 配置文件

- `server/services/config_service.py` - 模型配置定义
- `server/user_data/config.toml` - 用户配置（需手动创建）

### 核心实现

- `server/tools/image_providers/gemini_provider.py` - Gemini Provider 实现
- `server/tools/generate_image_by_gemini_2_5_flash.py` - 图像生成工具
- `server/services/langgraph_service/agent_service.py` - 文本模型集成
- `server/services/tool_service.py` - 工具注册逻辑

### 测试文件

- `server/tests/test_gemini_quick.py` - 快速测试（不调用 API）
- `server/tests/test_gemini_basic.py` - 基础功能测试

---

## ⚠️ 重要提示

### API 配额限制

Gemini 免费版 API 有每日配额限制，测试时请注意：

- 快速测试（`test_gemini_quick.py`）不消耗配额 ✅
- 基础测试（`test_gemini_basic.py`）会生成 1 张图片 ⚠️
- 高级测试会生成多张图片 ❌（谨慎使用）

查看配额使用：https://ai.dev/usage?tab=rate-limit

### 模型可用性

- ✅ `gemini-2.5-flash` - 文本模型，已验证可用
- ✅ `gemini-2.5-flash-image` - 图像模型，已验证可用
- ❌ `gemini-2.5-pro-image` - 尚未发布（404 错误），已移除

---

## 🆘 获取帮助

- 查看文档的常见问题部分
- 访问 [Google Gemini API 文档](https://ai.google.dev/gemini-api/docs)
- 提交 GitHub Issue

---

**最后更新**：2025-11-12
