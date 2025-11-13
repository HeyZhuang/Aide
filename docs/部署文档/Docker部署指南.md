# 🐳 Docker 部署指南

本文档提供 Jaaz 项目的 Docker 容器化部署完整方案。

> **注意**: Jaaz 主要是 Electron 桌面应用，本文档提供的是 **Web 版本** 的 Docker 部署方案（仅后端 + 前端静态文件）。

---

## 📋 部署架构

```
┌─────────────────────────────────────────┐
│            Nginx (容器)                  │
│  ┌──────────────────────────────────┐   │
│  │  静态文件服务 (React 构建产物)    │   │
│  │  /                                │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  反向代理                         │   │
│  │  /api → Python 后端               │   │
│  │  /socket.io → WebSocket           │   │
│  └──────────────────────────────────┘   │
└───────────────┬─────────────────────────┘
                │
┌───────────────┴─────────────────────────┐
│          Python 后端 (容器)              │
│  ┌──────────────────────────────────┐   │
│  │  FastAPI + Uvicorn               │   │
│  │  Socket.IO                       │   │
│  │  LangGraph                       │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  SQLite 数据库 (Volume 挂载)      │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 🚀 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ 可用内存
- 10GB+ 磁盘空间

### 一键部署

```bash
# 1. 克隆项目
git clone <repository-url>
cd psd-canvas-jaaz

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 API Keys

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f

# 5. 访问应用
# 浏览器打开: http://localhost
```

---

## 📝 Docker 配置文件

### 1. Dockerfile (Python 后端)

创建 `server/Dockerfile`:

```dockerfile
# 使用 Python 3.11 官方镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p user_data/files logs

# 暴露端口
EXPOSE 3004

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV DEFAULT_PORT=3004

# 启动命令
CMD ["uvicorn", "main:socket_app", "--host", "0.0.0.0", "--port", "3004"]
```

### 2. Dockerfile (前端构建)

创建 `react/Dockerfile`:

```dockerfile
# 第一阶段：构建
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# 第二阶段：Nginx 服务
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 3. docker-compose.yml

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # Python 后端服务
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: jaaz-backend
    restart: unless-stopped
    ports:
      - "3004:3004"
    volumes:
      # 持久化用户数据
      - ./server/user_data:/app/user_data
      - ./server/logs:/app/logs
    environment:
      # 从 .env 文件读取
      - DEFAULT_PORT=3004
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      # 代理配置（如需要）
      - HTTP_PROXY=${HTTP_PROXY:-}
      - HTTPS_PROXY=${HTTPS_PROXY:-}
    networks:
      - jaaz-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3004/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Nginx 前端服务
  frontend:
    build:
      context: ./react
      dockerfile: Dockerfile
    container_name: jaaz-frontend
    restart: unless-stopped
    ports:
      - "80:80"
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
```

### 4. Nginx 配置

创建 `react/nginx.conf`:

```nginx
user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout  65;
    types_hash_max_size 2048;

    # Gzip 压缩
    gzip  on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss;

    upstream backend {
        server backend:3004;
    }

    server {
        listen       80;
        server_name  localhost;

        # React 前端静态文件
        location / {
            root   /usr/share/nginx/html;
            index  index.html index.htm;
            try_files $uri $uri/ /index.html;
        }

        # API 反向代理
        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # 超时设置
            proxy_connect_timeout 600s;
            proxy_send_timeout 600s;
            proxy_read_timeout 600s;
        }

        # WebSocket 支持
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

            # WebSocket 超时
            proxy_connect_timeout 7d;
            proxy_send_timeout 7d;
            proxy_read_timeout 7d;
        }

        # 错误页面
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   /usr/share/nginx/html;
        }
    }
}
```

### 5. 环境变量文件

创建 `.env.example`:

```env
# AI API Keys
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
JAAZ_API_KEY=your_jaaz_api_key_here

# 代理配置（可选，中国大陆访问 Google API 需要）
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890

# 数据库配置
DB_PATH=/app/user_data/localmanus.db

# 日志级别
LOG_LEVEL=INFO
```

---

## 🔧 部署步骤详解

### 步骤 1: 准备配置文件

```bash
# 1. 创建 .env 文件
cp .env.example .env

# 2. 编辑 .env，填入你的 API Keys
nano .env

# 3. 检查配置文件
cat .env
```

### 步骤 2: 构建镜像

```bash
# 构建后端镜像
docker build -t jaaz-backend:latest ./server

# 构建前端镜像
docker build -t jaaz-frontend:latest ./react

# 查看镜像
docker images | grep jaaz
```

### 步骤 3: 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 步骤 4: 验证部署

```bash
# 检查后端健康状态
curl http://localhost:3004/api/health

# 检查前端访问
curl http://localhost

# 测试 WebSocket
curl http://localhost/socket.io/
```

---

## 📊 常用命令

### 服务管理

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose stop

# 重启服务
docker-compose restart

# 停止并删除容器
docker-compose down

# 停止并删除容器+数据卷
docker-compose down -v
```

### 日志查看

```bash
# 查看所有日志
docker-compose logs

# 实时跟踪日志
docker-compose logs -f

# 查看指定服务日志
docker-compose logs backend
docker-compose logs frontend

# 查看最近 100 行日志
docker-compose logs --tail=100
```

### 进入容器

```bash
# 进入后端容器
docker-compose exec backend bash

# 进入前端容器
docker-compose exec frontend sh

# 以 root 用户进入
docker-compose exec -u root backend bash
```

### 数据备份

```bash
# 备份数据库
docker-compose exec backend cp /app/user_data/localmanus.db /app/user_data/backup.db

# 导出到宿主机
docker cp jaaz-backend:/app/user_data/localmanus.db ./backup/

# 备份生成的文件
docker cp jaaz-backend:/app/user_data/files ./backup/files
```

---

## 🔒 安全配置

### 1. 添加 HTTPS 支持

修改 `nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # ... 其他配置
}
```

### 2. 环境变量加密

使用 Docker Secrets:

```yaml
secrets:
  gemini_api_key:
    file: ./secrets/gemini_api_key.txt

services:
  backend:
    secrets:
      - gemini_api_key
```

### 3. 限制访问

添加 IP 白名单:

```nginx
# nginx.conf
location /api/admin/ {
    allow 192.168.1.0/24;
    deny all;
    # ...
}
```

---

## 🐛 故障排查

### 问题 1: 后端无法启动

```bash
# 查看详细日志
docker-compose logs backend

# 检查端口占用
netstat -tulpn | grep 3004

# 重新构建镜像
docker-compose build --no-cache backend
docker-compose up -d
```

### 问题 2: 前端无法访问

```bash
# 检查 Nginx 配置
docker-compose exec frontend nginx -t

# 重载 Nginx
docker-compose exec frontend nginx -s reload
```

### 问题 3: WebSocket 连接失败

```bash
# 检查 Nginx 配置
grep -A 10 "socket.io" react/nginx.conf

# 查看网络连接
docker-compose exec backend netstat -tuln
```

### 问题 4: 图片无法加载

```bash
# 检查文件权限
docker-compose exec backend ls -la /app/user_data/files

# 检查 DEFAULT_PORT 环境变量
docker-compose exec backend env | grep DEFAULT_PORT
```

---

## 📈 性能优化

### 1. 多 Worker 配置

修改 `docker-compose.yml`:

```yaml
backend:
  command: >
    gunicorn main:socket_app
    --workers 4
    --worker-class uvicorn.workers.UvicornWorker
    --bind 0.0.0.0:3004
```

### 2. 资源限制

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

### 3. Redis 缓存

添加 Redis 服务:

```yaml
services:
  redis:
    image: redis:alpine
    restart: unless-stopped
    networks:
      - jaaz-network
```

---

## 🚀 生产环境建议

1. **使用 HTTPS** - Let's Encrypt 免费证书
2. **配置 CDN** - 加速静态资源访问
3. **监控日志** - 集成 ELK 或 Prometheus
4. **定期备份** - 自动化备份数据库和文件
5. **限流保护** - Nginx 限速防止滥用
6. **健康检查** - 自动重启异常容器

---

## 🤖 CI/CD 自动化部署

### GitHub Actions 自动部署

本项目支持通过 GitHub Actions 实现自动化部署。当代码推送到 `main` 分支时，会自动触发部署流程。

**核心流程**：
1. 代码推送到 `main` 分支
2. GitHub Actions 自动构建 Docker 镜像
3. 推送镜像到 Docker Hub / 阿里云镜像仓库
4. SSH 登录到生产服务器
5. 拉取最新镜像并重启容器
6. 执行健康检查，失败则自动回滚

**详细配置步骤请参考**：[GitHub Actions 部署指南](./GITHUB_ACTIONS_DEPLOYMENT.md)

### 快速启用 CI/CD

```bash
# 1. 创建 GitHub Actions workflow 文件
mkdir -p .github/workflows
cp docs/examples/deploy-web.yml .github/workflows/

# 2. 配置 GitHub Secrets（在仓库设置中添加）
# - DOCKER_USERNAME: Docker Hub 用户名
# - DOCKER_PASSWORD: Docker Hub 密码
# - SERVER_HOST: 服务器 IP
# - SERVER_USER: SSH 用户名
# - SERVER_SSH_KEY: SSH 私钥
# - GEMINI_API_KEY: Gemini API Key

# 3. 推送代码触发部署
git add .
git commit -m "feat: 启用 CI/CD 自动部署"
git push origin main
```

### 部署架构（带 CI/CD）

```
开发者本地 → Git Push → GitHub Repository (main)
                              ↓
                      GitHub Actions Workflow
                              ↓
                    构建 Docker 镜像 (Backend + Frontend)
                              ↓
                    推送到 Docker Hub/阿里云镜像仓库
                              ↓
                    SSH 登录生产服务器
                              ↓
                    docker-compose pull & up -d
                              ↓
                    健康检查 & 自动回滚
                              ↓
                    🎉 部署完成
```

### 本地测试 Docker 镜像构建

```bash
# 测试后端镜像构建
docker build -t jaaz-backend:test ./server

# 测试前端镜像构建
docker build -t jaaz-frontend:test ./react

# 测试完整部署
docker-compose -f docker-compose.test.yml up -d
```

---

## 📚 相关文档

- [GitHub Actions 部署指南](./GITHUB_ACTIONS_DEPLOYMENT.md) - 详细的 CI/CD 配置步骤
- [Gemini 配置说明](./GEMINI_SETUP.md) - Gemini API 配置
- [Git 提交规范](./GIT_COMMIT_GUIDE.md) - Git 提交信息格式
- [项目结构说明](./PROJECT_STRUCTURE.md) - 项目目录结构

---

*最后更新：2025-11-13*
