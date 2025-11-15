# GitHub Actions 优化和计费问题解决方案

## 问题描述

原始的GitHub Actions配置 (`.github/workflows/build.yml`) 存在以下问题：

1. **高成本运行器使用**：同时使用 `macos-latest` 和 `windows-latest` 运行器
2. **频繁触发**：每次推送和PR都会触发所有平台的构建
3. **资源浪费**：即使是小的代码更改也会触发完整的构建流程
4. **计费问题**：导致GitHub Actions分钟数快速消耗，触发计费限制

## 解决方案

### 1. 优化的工作流程 (`.github/workflows/build-optimized.yml`)

**主要改进：**

- ✅ **智能触发**：只在相关文件更改时触发构建
- ✅ **分层构建**：先进行免费的Linux测试，再决定是否进行付费构建
- ✅ **手动控制**：付费平台（macOS/Windows）仅在手动触发时构建
- ✅ **成本控制**：默认只构建Linux版本（免费）

### 2. 触发条件优化

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'server/**'
      - 'react/**'
      - 'electron/**'
      - 'package.json'
      - '.github/workflows/**'
  workflow_dispatch:
    inputs:
      build_platforms:
        description: 'Platforms to build'
        type: choice
        options: [linux, macos, windows, all]
```

### 3. 构建策略

| 平台 | 运行器 | 触发条件 | 成本 |
|------|--------|----------|------|
| Linux | `ubuntu-latest` | 自动 | 免费 |
| macOS | `macos-latest` | 手动触发 | 付费 (10x) |
| Windows | `windows-latest` | 手动触发 | 付费 (2x) |

## 使用指南

### 日常开发
- 推送代码时只会触发Linux构建和测试
- 快速反馈，无额外成本

### 发布构建
1. 进入GitHub仓库的Actions页面
2. 选择"Build and Package Desktop App (Optimized)"
3. 点击"Run workflow"
4. 选择需要构建的平台：
   - `linux`：仅Linux（推荐用于测试）
   - `macos`：仅macOS
   - `windows`：仅Windows  
   - `all`：所有平台（发布时使用）

## 计费问题解决

### 立即解决方案
1. **禁用原工作流程**：已将 `build.yml` 重命名为 `build.yml.disabled`
2. **使用优化工作流程**：新的配置大幅减少付费运行器使用

### GitHub账户设置
如果仍然遇到计费问题，请检查：

1. **账户计费设置**：
   - 进入 GitHub Settings > Billing & plans
   - 检查付款方式是否有效
   - 确认支出限制设置

2. **仓库设置**：
   - 进入仓库 Settings > Actions > General
   - 可以设置"Disable actions"暂时停用所有Actions
   - 或设置"Allow select actions"仅允许特定Actions

3. **分钟数使用情况**：
   - 查看 Settings > Billing & plans > Plans and usage
   - 监控Actions分钟数使用情况

## 成本对比

### 原配置（每次构建）
- Linux: 0分钟（免费）
- macOS: ~20分钟 × 10 = 200计费分钟
- Windows: ~15分钟 × 2 = 30计费分钟
- **总计：230计费分钟/次**

### 优化配置（日常开发）
- Linux: 0分钟（免费）
- **总计：0计费分钟/次**

### 优化配置（发布构建，手动触发）
- Linux: 0分钟（免费）
- macOS: ~20分钟 × 10 = 200计费分钟（可选）
- Windows: ~15分钟 × 2 = 30计费分钟（可选）
- **总计：按需使用**

## 建议

1. **日常开发**：使用默认的Linux构建进行测试
2. **发布前测试**：手动触发单个平台构建
3. **正式发布**：手动触发所有平台构建
4. **监控使用**：定期检查GitHub Actions使用情况
5. **预算控制**：在GitHub设置中配置支出限制

这样可以在保持开发效率的同时，大幅降低GitHub Actions的使用成本。
