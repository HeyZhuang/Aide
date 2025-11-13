# 🚀 GitHub Actions 自动部署指南

本文档提供基于 GitHub Actions 的 Jaaz Web 版本自动化部署方案。

> **注意**: 本文档针对 **Web 版本** 的 Docker 部署，桌面版 Electron 应用请参考 `.github/workflows/build.yml`。

---

## 📋 部署架构

```
GitHub Repository (main 分支)
    ↓ push/merge
GitHub Actions Workflow 触发
    ↓
构建 Docker 镜像 (Backend + Frontend)
    ↓
推送到容器镜像仓库 (Docker Hub / Aliyun / 私有仓库)
    ↓
SSH 登录到生产服务器
    ↓
拉取最新镜像并重启容器
    ↓
健康检查 & 自动回滚
```

---

## 🎯 部署方式

### 方式一：推送镜像 + SSH 部署（推荐）

**优点**：
- 简单可靠，适合中小型项目
- 支持多服务器部署
- 部署过程可控，易于调试

**缺点**：
- 需要服务器开放 SSH 访问
- 需要手动管理服务器环境

### 方式二：Docker Compose 自托管 Runner

**优点**：
- 无需暴露 SSH 端口
- 可在内网环境部署

**缺点**：
- 需要额外运行 GitHub Actions Runner
- 资源占用较高

### 方式三：Kubernetes (K8s) 集群部署

**优点**：
- 高可用、自动扩缩容
- 适合大规模生产环境

**缺点**：
- 配置复杂，学习成本高
- 需要 K8s 集群基础设施

---

## 🚀 快速开始（方式一：SSH 部署）

### 前置要求

1. **服务器准备**
   - Linux 服务器（Ubuntu 20.04+ / CentOS 7+ / Debian 11+）
   - 已安装 Docker 20.10+ 和 Docker Compose 2.0+
   - 开放 80 端口（HTTP）和 443 端口（HTTPS，可选）
   - 开放 SSH 端口（默认 22）

2. **容器镜像仓库**
   - Docker Hub 账号（免费）
   - 或阿里云容器镜像服务
   - 或私有 Harbor 仓库

3. **GitHub Secrets 配置**
   - SSH 私钥
   - Docker 镜像仓库凭证
   - API Keys（Gemini, OpenAI 等）

---

## 📝 配置步骤

### 步骤 1: 创建 GitHub Actions Workflow

创建 `.github/workflows/deploy-web.yml`:

```yaml
name: Deploy Web Version to Production

on:
  push:
    branches: [main]
  workflow_dispatch: # 支持手动触发

env:
  DOCKER_REGISTRY: docker.io # Docker Hub，也可改为 registry.cn-hangzhou.aliyuncs.com
  IMAGE_NAME: your-dockerhub-username/jaaz # 修改为你的镜像名

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      # 1. 检出代码
      - name: Checkout code
        uses: actions/checkout@v3

      # 2. 设置 Docker Buildx（支持多平台构建）
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      # 3. 登录到 Docker 镜像仓库
      - name: Log in to Docker Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.DOCKER_REGISTRY }}
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      # 4. 构建并推送后端镜像
      - name: Build and push backend image
        uses: docker/build-push-action@v4
        with:
          context: ./server
          file: ./server/Dockerfile
          push: true
          tags: |
            ${{ env.IMAGE_NAME }}-backend:latest
            ${{ env.IMAGE_NAME }}-backend:${{ github.sha }}
          cache-from: type=registry,ref=${{ env.IMAGE_NAME }}-backend:latest
          cache-to: type=inline

      # 5. 构建并推送前端镜像
      - name: Build and push frontend image
        uses: docker/build-push-action@v4
        with:
          context: ./react
          file: ./react/Dockerfile
          push: true
          tags: |
            ${{ env.IMAGE_NAME }}-frontend:latest
            ${{ env.IMAGE_NAME }}-frontend:${{ github.sha }}
          cache-from: type=registry,ref=${{ env.IMAGE_NAME }}-frontend:latest
          cache-to: type=inline

      # 6. SSH 登录到生产服务器并部署
      - name: Deploy to production server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          port: ${{ secrets.SERVER_PORT || 22 }}
          script: |
            # 进入部署目录
            cd /opt/jaaz || exit 1

            # 备份当前环境变量
            cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

            # 拉取最新镜像
            docker pull ${{ env.IMAGE_NAME }}-backend:latest
            docker pull ${{ env.IMAGE_NAME }}-frontend:latest

            # 停止旧容器
            docker-compose down

            # 启动新容器
            docker-compose up -d

            # 等待服务启动
            sleep 10

            # 健康检查
            if curl -f http://localhost:3004/api/health; then
              echo "✅ Backend health check passed"
            else
              echo "❌ Backend health check failed, rolling back..."
              docker-compose down
              docker-compose up -d
              exit 1
            fi

            if curl -f http://localhost; then
              echo "✅ Frontend health check passed"
            else
              echo "❌ Frontend health check failed"
              exit 1
            fi

            # 清理旧镜像（保留最近3个版本）
            docker image prune -af --filter "until=72h"

            echo "🎉 Deployment completed successfully!"

      # 7. 发送部署通知（可选）
      - name: Send deployment notification
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: |
            Deployment to production: ${{ job.status }}
            Commit: ${{ github.sha }}
            Author: ${{ github.actor }}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

### 步骤 2: 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets（Settings → Secrets and variables → Actions）：

#### 必需的 Secrets

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `DOCKER_USERNAME` | Docker Hub 用户名 | `your-username` |
| `DOCKER_PASSWORD` | Docker Hub 密码或 Access Token | `dckr_pat_xxxxx` |
| `SERVER_HOST` | 生产服务器 IP 或域名 | `123.45.67.89` |
| `SERVER_USER` | SSH 用户名 | `ubuntu` |
| `SERVER_SSH_KEY` | SSH 私钥（完整内容） | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |
| `GEMINI_API_KEY` | Gemini API Key | `AIzaSyXXXXXX` |
| `OPENAI_API_KEY` | OpenAI API Key（可选） | `sk-XXXXXX` |

#### 可选的 Secrets

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `SERVER_PORT` | SSH 端口 | `22` |
| `HTTP_PROXY` | 代理地址（中国大陆服务器访问 Google API） | `http://proxy.example.com:7890` |
| `SLACK_WEBHOOK_URL` | Slack 通知 Webhook | `https://hooks.slack.com/...` |

---

### 步骤 3: 准备生产服务器

#### 3.1 安装 Docker 和 Docker Compose

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | bash
sudo systemctl enable docker
sudo systemctl start docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 3.2 创建部署目录

```bash
# 创建部署目录
sudo mkdir -p /opt/jaaz
cd /opt/jaaz

# 设置权限
sudo chown -R $USER:$USER /opt/jaaz
```

#### 3.3 创建 docker-compose.yml

```bash
cat > docker-compose.yml <<'EOF'
version: '3.8'

services:
  backend:
    image: your-dockerhub-username/jaaz-backend:latest
    container_name: jaaz-backend
    restart: unless-stopped
    ports:
      - "3004:3004"
    volumes:
      - ./user_data:/app/user_data
      - ./logs:/app/logs
    environment:
      - DEFAULT_PORT=3004
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - HTTP_PROXY=${HTTP_PROXY:-}
      - HTTPS_PROXY=${HTTPS_PROXY:-}
    networks:
      - jaaz-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3004/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: your-dockerhub-username/jaaz-frontend:latest
    container_name: jaaz-frontend
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - jaaz-network

networks:
  jaaz-network:
    driver: bridge

volumes:
  user_data:
  logs:
EOF
```

#### 3.4 创建环境变量文件

```bash
cat > .env <<'EOF'
# AI API Keys
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# 代理配置（可选）
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
EOF

# 设置权限
chmod 600 .env
```

#### 3.5 创建数据目录

```bash
mkdir -p user_data logs
```

---

### 步骤 4: 配置 SSH 密钥（本地操作）

```bash
# 1. 生成 SSH 密钥对（如果没有）
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/jaaz_deploy

# 2. 复制公钥到服务器
ssh-copy-id -i ~/.ssh/jaaz_deploy.pub user@your-server-ip

# 3. 测试连接
ssh -i ~/.ssh/jaaz_deploy user@your-server-ip

# 4. 复制私钥内容到 GitHub Secrets
cat ~/.ssh/jaaz_deploy
# 将输出的完整内容（包括 BEGIN 和 END 行）粘贴到 GitHub Secrets 的 SERVER_SSH_KEY
```

---

### 步骤 5: 测试部署

```bash
# 方式一：推送代码到 main 分支触发
git add .
git commit -m "feat: 添加 GitHub Actions 自动部署"
git push origin main

# 方式二：手动触发（GitHub 网页）
# 进入仓库 → Actions → Deploy Web Version to Production → Run workflow
```

---

## 🔍 监控和调试

### 查看 GitHub Actions 日志

1. 进入 GitHub 仓库 → Actions
2. 点击最新的 workflow run
3. 查看每个步骤的详细日志

### 查看服务器日志

```bash
# 进入部署目录
cd /opt/jaaz

# 查看容器状态
docker-compose ps

# 查看后端日志
docker-compose logs -f backend

# 查看前端日志
docker-compose logs -f frontend

# 查看所有日志（最近100行）
docker-compose logs --tail=100
```

### 健康检查

```bash
# 检查后端
curl http://your-server-ip:3004/api/health

# 检查前端
curl http://your-server-ip

# 检查容器健康状态
docker ps --filter "health=healthy"
```

---

## 🛡️ 安全最佳实践

### 1. SSH 安全

```bash
# 仅允许密钥登录（服务器上操作）
sudo nano /etc/ssh/sshd_config

# 修改以下配置
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no

# 重启 SSH 服务
sudo systemctl restart sshd
```

### 2. 防火墙配置

```bash
# 安装 ufw
sudo apt install ufw

# 允许必要端口
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# 启用防火墙
sudo ufw enable
```

### 3. Secrets 管理

- ❌ **不要**将 API Keys 硬编码在代码中
- ✅ **使用** GitHub Secrets 存储敏感信息
- ✅ **定期轮换** API Keys 和 SSH 密钥
- ✅ **使用** Docker Secrets 或 Kubernetes Secrets（生产环境）

### 4. 镜像安全扫描

```yaml
# 在 workflow 中添加镜像扫描步骤
- name: Scan Docker image for vulnerabilities
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.IMAGE_NAME }}-backend:latest
    format: 'sarif'
    output: 'trivy-results.sarif'

- name: Upload Trivy results to GitHub Security
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: 'trivy-results.sarif'
```

---

## 🔄 高级配置

### 1. 多环境部署（开发/测试/生产）

```yaml
# .github/workflows/deploy-web.yml
on:
  push:
    branches:
      - main        # 生产环境
      - develop     # 开发环境
      - staging     # 测试环境

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Set environment variables
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "ENV=production" >> $GITHUB_ENV
            echo "SERVER_HOST=${{ secrets.PROD_SERVER_HOST }}" >> $GITHUB_ENV
          elif [[ "${{ github.ref }}" == "refs/heads/staging" ]]; then
            echo "ENV=staging" >> $GITHUB_ENV
            echo "SERVER_HOST=${{ secrets.STAGING_SERVER_HOST }}" >> $GITHUB_ENV
          else
            echo "ENV=development" >> $GITHUB_ENV
            echo "SERVER_HOST=${{ secrets.DEV_SERVER_HOST }}" >> $GITHUB_ENV
          fi
```

### 2. 蓝绿部署（零停机）

```bash
# 服务器上准备两套环境
/opt/jaaz-blue/
/opt/jaaz-green/

# 在 workflow 中切换
- name: Blue-Green Deployment
  run: |
    CURRENT=$(readlink /opt/jaaz-current)
    if [[ "$CURRENT" == "/opt/jaaz-blue" ]]; then
      DEPLOY_TO="green"
    else
      DEPLOY_TO="blue"
    fi

    cd /opt/jaaz-$DEPLOY_TO
    docker-compose up -d

    # 健康检查通过后切换流量
    ln -sfn /opt/jaaz-$DEPLOY_TO /opt/jaaz-current
    nginx -s reload
```

### 3. 自动回滚

```yaml
- name: Deploy with auto-rollback
  run: |
    # 记录当前镜像版本
    CURRENT_IMAGE=$(docker inspect jaaz-backend --format='{{.Image}}')

    # 部署新版本
    docker-compose pull
    docker-compose up -d

    # 等待启动
    sleep 15

    # 健康检查
    if ! curl -f http://localhost:3004/api/health; then
      echo "❌ Health check failed, rolling back..."
      docker tag $CURRENT_IMAGE jaaz-backend:latest
      docker-compose up -d
      exit 1
    fi
```

---

## 📊 常见问题

### 问题 1: 部署失败 - "Permission denied"

**原因**: SSH 私钥权限问题

**解决**:
```bash
# 检查私钥权限
chmod 600 ~/.ssh/jaaz_deploy

# 确保公钥已添加到服务器
ssh-copy-id -i ~/.ssh/jaaz_deploy.pub user@server-ip
```

### 问题 2: Docker 镜像推送失败

**原因**: Docker Hub 登录凭证错误

**解决**:
1. 检查 `DOCKER_USERNAME` 和 `DOCKER_PASSWORD` 是否正确
2. 使用 Access Token 代替密码：https://hub.docker.com/settings/security

### 问题 3: 健康检查失败

**原因**: 服务未完全启动或配置错误

**解决**:
```bash
# 增加等待时间
sleep 30

# 检查日志
docker-compose logs backend

# 手动测试
curl -v http://localhost:3004/api/health
```

### 问题 4: 中国大陆服务器无法访问 Google API

**解决**:
1. 在服务器上配置代理
2. 在 `.env` 中设置 `HTTP_PROXY` 和 `HTTPS_PROXY`
3. 或使用国内镜像加速器（Docker）

---

## 📚 相关文档

- [Docker 部署指南](./DOCKER_DEPLOYMENT.md)
- [Gemini 配置说明](./GEMINI_SETUP.md)
- [Git 提交规范](./GIT_COMMIT_GUIDE.md)
- [项目结构说明](./PROJECT_STRUCTURE.md)

---

*最后更新：2025-11-13*
