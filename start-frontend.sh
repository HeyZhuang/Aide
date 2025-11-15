#!/bin/bash

# 1. 加载 NVM 环境 (使用点命令)
. /home/ubuntu/.nvm/nvm.sh

# 2. 切换到应用所在的目录 (之前成功的配置中是 react 目录)
cd /home/ubuntu/ckz/psd-canvas-jaaz/react

# 3. 使用 nvm 切换到 v20.19.5（系統中實際存在的版本）
nvm use v20.19.5

# 4. 运行你的应用，使用 exec 确保 PID 传递给 systemd
exec node server.js

