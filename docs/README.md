<div align="center">

# 🎨 kklay | 智能电商与广告设计垂直 SaaS 平台

**在线 PSD 解析 · 智能自动排版 · Gen-AI 内容生成**

[![Project Status](https://img.shields.io/badge/Status-Prototype-orange)](https://github.com/HeyZhuang/kklay)
[![Tech Stack](https://img.shields.io/badge/Stack-Fullstack-blue)](https://github.com/HeyZhuang/kklay)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[🌐 在线演示 (Demo)](http://54.189.143.120:3004/canvas/default) | [🎨 UI 设计 (Figma)](https://www.figma.com/design/NyTzlErt4jqPZfr3OCR3hU/Canvas-Design-System--Community-?node-id=936-52339&t=RdAjnRZb4uTMxEWW-0) | [🏠 项目主页](https://ch-love.online)

---


</div>

## 📖 项目介绍 | Introduction

[cite_start]**kklay** 是一个针对电商与广告领域的垂直 SaaS 出海设计平台 [cite: 116][cite_start]。立足于 AI 设计工具市场年复合增长率超 30% 的背景，我们致力于解决传统设计软件无法高效批量生产、通用工具缺乏深度 PSD 图层支持的痛点 [cite: 116]。

[cite_start]本项目构建了一套**“在线 PSD 解析 + 智能编辑 + AI 生成”**的完整工作流 [cite: 117]。通过后端解析引擎与前端画布的无缝映射，结合生成式 AI 技术，帮助电商运营与广告投放人员快速产出符合品牌规范的高质量视觉素材。

### 💡 核心痛点解决
* [cite_start]**PSD 深度支持**：解决 Web 端无法完美解析和编辑复杂 PSD 图层（图层组、蒙版、效果）的难题 [cite: 116, 120]。
* **跨尺寸自动适配**：基于布局算法，一键将主图转换为 Banner、Instagram Story 等多尺寸格式，解决多平台投放适配繁琐的问题。
* [cite_start]**AI 赋能提效**：集成 Gen-AI (Nano-banana/GPT)，实现文案润色、文生图及智能填充 [cite: 117, 122]。

## ✨ 核心功能 | Key Features

| 功能模块 | 描述 |
| :--- | :--- |
| **🛠️ 核心解析服务** | [cite_start]独立开发的高风险模块 **PSD 解析服务**，精准识别图层、文本元数据及图像占位符，实现后端解析与前端画布的像素级映射 [cite: 118, 120]。 |
| **📐 智能排版引擎** | 创新性开发基于预设布局的**“自动尺寸重生成”算法** (Dynamic Content Engine)，支持 1:1, 9:16 等多比例一键适配，保持视觉层次平衡。 |
| **🤖 AI 创意集成** | [cite_start]封装 **Gen-AI (Nano-banana/GPT) API**，支持 AI 辅助文案生成、图像背景替换与智能填充 [cite: 122]。 |
| **🎨 实时可视化编辑** | 强大的 Web 端编辑器，支持拖拽替换、文本实时编辑 (WYSIWYG)、样式调整以及图层管理。 |
| **🚀 高保真渲染导出** | 自研后端渲染引擎，确保 Web 预览与最终导出文件 (JPG/PNG/PDF) 的视觉一致性，支持透明背景与打印级输出。 |

## 🛠️ 技术架构 | Tech Stack

* **Frontend**: React, Canvas API (Konva.js/Fabric.js), CSS Modules
* [cite_start]**Backend**: PSD Parsing Service, Rendering Engine, RESTful API, JWT Auth [cite: 120, 123]
* [cite_start]**AI/LLM**: GPT API (Text), Nano-banana/Gemini (Image) [cite: 122, 155]
* [cite_start]**DevOps**: Docker, GitHub Actions, Vercel/AWS [cite: 131, 296]

## 🚀 快速开始 | Getting Started

### 环境要求
* Node.js >= 16
* PostgreSQL
* Backend Environment (Java/Python based on your actual stack)

### 安装步骤

1.  **克隆仓库**
    ```bash
    git clone git@github.com:HeyZhuang/kklay.git
    cd kklay
    ```

2.  **前端启动**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

3.  **后端启动**
    ```bash
    # 请根据实际后端文档配置环境变量
    cd backend
    # 启动服务命令
    ```

4.  **访问项目**
    打开浏览器访问 `http://localhost:3000`

## 📅 路线图 | Roadmap

依据 [产品第一阶段规划](产品第一阶段.md)：

- [x] **Phase 1.0: 基础架构** (用户认证、PSD 模板解析、模板库展示)
- [x] **Phase 2.0: 核心编辑** (文本/图片拖拽替换、实时预览、样式调整)
- [ ] **Phase 3.0: 智能与增强** (自动尺寸重生成算法、AI 图像/文本生成集成)
- [ ] **Phase 4.0: 生产与交付** (后端高保真渲染、多格式导出、支付系统)


## 📄 License

This project is licensed under the MIT License.

---

<div align="center">
  <p>如果这个项目对你有帮助，请给我们一个 ⭐️ <b>Star</b> 支持一下！</p>
  <p><sub>Built with ❤️ by HeyZhuang and the Team.</sub></p>
</div>
