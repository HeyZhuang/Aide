# 部署指南

## 项目部署说明

本项目已配置为在服务器上运行：
- **前端端口**: 3004 (不占用 3000、3001 端口)
- **后端端口**: 57988
- **服务器 IP**: http://54.189.143.120/

## 部署步骤

### 1. 安装依赖和构建

运行部署脚本：

```bash
cd /home/ubuntu/cckz/psd-canvas-jaaz
./deploy.sh
```

**注意**：如果前端构建失败（TypeScript 错误），您需要先修复代码错误，或者暂时跳过类型检查：

```bash
cd /home/ubuntu/cckz/psd-canvas-jaaz/react
# 临时跳过类型检查构建（仅用于部署测试）
vite build
```

### 2. 安装 systemd 服务

服务文件已复制到系统目录，重新加载 systemd：

```bash
sudo systemctl daemon-reload
```

### 3. 启动服务

```bash
# 启动后端服务（端口 57988）
sudo systemctl start psd-backend

# 启动前端服务（端口 3004）
sudo systemctl start psd-frontend
```

### 4. 查看服务状态

```bash
# 查看后端服务状态
sudo systemctl status psd-backend

# 查看前端服务状态
sudo systemctl status psd-frontend

# 查看后端日志
sudo journalctl -u psd-backend -f

# 查看前端日志
sudo journalctl -u psd-frontend -f
```

### 5. 设置开机自启

```bash
sudo systemctl enable psd-backend
sudo systemctl enable psd-frontend
```

### 6. 停止服务

```bash
sudo systemctl stop psd-backend
sudo systemctl stop psd-frontend
```

### 7. 重启服务

```bash
sudo systemctl restart psd-backend
sudo systemctl restart psd-frontend
```

## 访问地址

- **前端**: http://54.189.143.120:3004/
- **后端 API**: http://54.189.143.120:57988/
- **Socket.IO**: http://54.189.143.120:57988/socket.io/

## 配置说明

### 后端配置
- 配置文件: `/home/ubuntu/cckz/psd-canvas-jaaz/server/main.py`
- 监听地址: `0.0.0.0:57988` (可从外部访问)
- CORS 已配置允许来自 `http://54.189.143.120:3004` 的请求

### 前端配置
- 环境变量文件: `/home/ubuntu/cckz/psd-canvas-jaaz/react/.env.production`
- 后端 API 地址: `http://54.189.143.120:57988`
- Socket.IO 地址: 自动配置为后端地址

## 常见问题

### 1. 端口被占用

检查端口占用情况：

```bash
# 检查 3004 端口
sudo lsof -i :3004
# 或
sudo netstat -tulpn | grep 3004

# 检查 57988 端口
sudo lsof -i :57988
# 或
sudo netstat -tulpn | grep 57988
```

### 2. 服务无法启动

查看详细日志：

```bash
sudo journalctl -u psd-backend -n 50
sudo journalctl -u psd-frontend -n 50
```

### 3. 前端无法连接后端

确保：
- 后端服务正在运行
- 防火墙允许 57988 端口
- CORS 配置正确

### 4. 更新代码后重新部署

```bash
# 1. 更新代码（git pull 等）
# 2. 重新运行部署脚本
cd /home/ubuntu/cckz/psd-canvas-jaaz
./deploy.sh

# 3. 重启服务
sudo systemctl restart psd-backend
sudo systemctl restart psd-frontend
```

## 防火墙配置

如果使用 UFW，需要开放端口：

```bash
sudo ufw allow 3004/tcp
sudo ufw allow 57988/tcp
```

如果使用 firewalld：

```bash
sudo firewall-cmd --permanent --add-port=3004/tcp
sudo firewall-cmd --permanent --add-port=57988/tcp
sudo firewall-cmd --reload
```

## 注意事项

1. **端口占用**: 确保 3004 和 57988 端口未被其他服务占用
2. **Python 虚拟环境**: 后端依赖位于 `/home/ubuntu/cckz/psd-canvas-jaaz/server/venv`
3. **前端构建**: 生产环境使用构建后的静态文件，位于 `/home/ubuntu/cckz/psd-canvas-jaaz/react/dist`
4. **日志查看**: 使用 `journalctl` 查看服务日志，有助于排查问题


