# Git 提交与分支规范

本规范适用于 `psd-canvas-jaaz` 仓库的所有代码贡献，用于统一分支命名、提交信息、代码对齐与 PR 的最小要求。除非产品负责人另行说明，请默认以 `main`（或当前发布分支）作为基线。

## 1. 分支策略

### 1.1 基线分支职责
- `main`：发布用的稳定分支，只能通过受控的 PR 合并。
- `release/<version>`：存在时用于特定版本封板，热修需从对应 release 分支创建。
- `hotfix/<issue>`：紧急修复，完成后需同时合并回 `main` 与仍在维护的 release。

### 1.2 工作分支命名
| 类型 | 说明 | 命名示例 |
| --- | --- | --- |
| 功能 | 新增或大改功能 | `feat/canvas-auto-resize` |
| 修复 | Bug 修复 | `fix/template-null-error` |
| 重构 | 无业务变化的结构优化 | `refactor/react-store` |
| 文档 | 仅文档或配置说明 | `docs/git-guide` |
| 任务/杂项 | 构建、依赖、脚本等 | `chore/update-deps` |

- 命名使用小写 + 中划线，必要时追加工单号，例如 `feat/PSD-123-layer-panel`。

### 1.3 创建与维护流程
1. `git fetch origin`
2. `git switch main`（或指定 release 分支）
3. `git pull --ff-only`
4. `git switch -c feat/canvas-auto-resize`
5. 开发中保持分支干净：避免直接在基线分支开发，必要时 `git rebase origin/main` 以同步最新变更，合并时优先使用 `rebase` 或 `squash` 保持线性历史。

## 2. 提交信息规范

### 2.1 基础格式（Conventional Commits）
```
<type>(<scope>): <subject>
```
- `<type>`：`feat` `fix` `refactor` `docs` `chore` `perf` `test` `build`。
- `<scope>`：可选，标记影响模块（如 `canvas`、`server/config`、`electron`）。
- `<subject>`：50 字符以内，使用祈使句，描述改动目的而非过程。

### 2.2 编写要点
- 一次提交解决一个明确问题，避免将不相关改动堆在同一 commit。
- 如关联缺陷或需求，使用 `Refs #123`/`Fixes #123`。
- 需要补充背景或方案细节时，在正文（空一行后）描述，保持段落短小。

## 3. 提交前代码对齐与自检

1. **依赖与环境**
   - Node/Electron：在根目录与 `react/` 分别执行 `npm install`，确保 lock 文件同步。
   - Python/Server：使用 `pip install -r requirements.txt` 或 `uv pip sync`（若适用）。
2. **格式化与静态检查**
   - React 前端：`cd react && npx prettier --write "src/**/*.{ts,tsx,css,md}"`。
   - React Lint：`cd react && npm run lint`。
   - Electron/TS：`npm run build:ts` 及时发现类型问题。
   - Python：`ruff format && ruff check`（或团队指定命令）。
3. **测试与构建**
   - 前端：必要时 `npm run dev` 自测交互，提交前至少构建一次 `npm run build`。
   - Node/Electron：`npm run test` / `npm run test:run`。
   - Server：执行对应的 `pytest` 或脚本（如 `python test_psd_api.py`）。
4. **差异检查**
   - `git status` 确认无多余文件。
   - `git diff --stat` 审核改动范围，避免混入调试代码/日志。
5. **安全检查**
   - 核对 `.env`、密钥、证书等敏感文件未被加入暂存区。
   - 若需要更新配置示例，请在 `config.env.example` 等文件中给出占位符。

## 4. 推送与 PR 建议

1. **推送前的最后步骤**
   - 使用 `git rebase -i origin/main` 整理 commit，保持语义化历史。
   - 解决冲突后重新运行关键构建/测试，确认无回归。
   - `git push -u origin feat/canvas-auto-resize`（如已重写历史需使用 `--force-with-lease`）。
2. **创建 PR 的建议**
   - PR 标题沿用主 commit，摘要中写清楚“做了什么 + 为什么 + 如何验证”。
   - 勾选或手写自测清单（构建、lint、关键脚本截图等）。
   - 附上关键界面/日志截图，方便 Reviewer 复现。
   - 指定至少一名相关领域 Reviewer，并在讨论中保持每条评论有回应。
3. **合并前确认**
   - 所有 CI 通过。
   - PR 与基线 branch 无冲突（必要时再 rebase 一次）。
   - 合并策略：普通需求使用 `Squash & Merge`，需要精准保留历史时使用 `Rebase & Merge`；避免 `Merge commit` 拉长主干。

## 5. 常见问题与解法

- **提交后发现遗漏文件**：追加 commit 前务必重新跑对齐命令，再使用 `git commit --amend`，随后以 `--force-with-lease` 推送。
- **多人协作分支冲突频繁**：缩短分支生命周期，小步提交，频繁 rebase 并与团队同步进度。
- **大文件或编译产物误提交**：立刻 `git rm --cached <file>` 并追加 `.gitignore`，必要时通知维护者清理历史。

遵循以上规范可以让历史记录更易追踪、降低冲突成本，也便于快速定位问题与复现发布流程。
