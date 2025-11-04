# 字体功能调试指南

## 问题：在 http://54.189.143.120:3004/canvas/fault 看不到字体变化

### 检查清单

#### 1. 前端代码是否已重新构建
```bash
cd /home/ubuntu/cckz/psd-canvas-jaaz/react
npm run build
# 或者如果是开发模式
npm run dev
```

#### 2. 服务器是否已重启
服务器需要重启才能加载新的静态文件路由配置
```bash
# 检查服务器进程
ps aux | grep python | grep main.py

# 重启服务器（根据实际情况）
# 如果使用 systemd:
sudo systemctl restart your-service-name

# 如果直接运行:
pkill -f main.py
cd /home/ubuntu/cckz/psd-canvas-jaaz/server
python main.py
```

#### 3. 字体文件路径是否正确
检查 fonts 文件夹是否存在：
```bash
ls -la /home/ubuntu/cckz/psd-canvas-jaaz/fonts/
```

应该看到这些文件：
- 華康超特圓體.ttf
- 江城斜黑体 900W.ttf
- 华康POP1体W9-B5.TTF
- 华康POP1体W7-B5.TTF
- 华康POP1体W5-B5.TTF
- CustomWebFont.woff2

#### 4. 测试字体文件是否可以访问
在浏览器中测试：
```
http://54.189.143.120:3004/fonts/華康超特圓體.ttf
http://54.189.143.120:3004/fonts/CustomWebFont.woff2
```

如果返回 404，说明静态文件路由没有正确配置。

#### 5. 检查浏览器控制台
1. 打开 http://54.189.143.120:3004/canvas/fault
2. 按 F12 打开开发者工具
3. 查看 Console 标签页，查找：
   - 字体加载错误
   - 网络请求失败
   - JavaScript 错误

#### 6. 检查网络请求
在浏览器开发者工具的 Network 标签页中：
1. 刷新页面
2. 查找 `/fonts/` 开头的请求
3. 检查这些请求的状态码（应该是 200）
4. 如果返回 404，说明服务器路由配置有问题

#### 7. 检查右侧边栏是否显示
确保：
- 右侧边栏是可见的
- 点击了 "Assets" 标签
- 点击了 "Fonts" 子标签

#### 8. 检查代码变更是否生效
在浏览器控制台运行：
```javascript
// 检查组件是否正确加载
document.querySelector('[data-testid="font-list"]') // 如果有的话

// 检查字体预加载
document.fonts.ready.then(() => {
  console.log('Fonts ready:', Array.from(document.fonts).map(f => f.family))
})
```

### 常见问题解决方案

#### 问题 1: 字体文件返回 404
**原因**: 服务器静态文件路由未正确配置或服务器未重启
**解决**: 
- 检查 `server/main.py` 中的字体目录挂载代码
- 确认 fonts 目录路径正确
- 重启服务器

#### 问题 2: 字体列表为空或显示旧的字体
**原因**: 前端代码未重新构建或浏览器缓存
**解决**:
- 重新构建前端：`npm run build`
- 清除浏览器缓存：Ctrl+Shift+Delete
- 硬刷新页面：Ctrl+Shift+R 或 Ctrl+F5

#### 问题 3: 字体加载失败（CORS 或网络错误）
**原因**: 字体文件路径不正确或服务器未正确配置 CORS
**解决**:
- 检查字体文件路径中的中文文件名是否正确编码
- 确保服务器返回正确的 CORS 头

#### 问题 4: 看不到字体预览
**原因**: 字体未成功加载或预览代码有问题
**解决**:
- 检查浏览器控制台是否有字体加载错误
- 确认 FontFace API 是否支持（现代浏览器都支持）

### 快速验证步骤

1. **验证服务器配置**:
   ```bash
   curl -I http://54.189.143.120:3004/fonts/CustomWebFont.woff2
   ```
   应该返回 200 OK

2. **验证前端构建**:
   ```bash
   ls -la /home/ubuntu/cckz/psd-canvas-jaaz/react/dist/
   ```
   应该看到最新的构建文件

3. **验证浏览器访问**:
   - 打开 http://54.189.143.120:3004/canvas/fault
   - 打开开发者工具
   - 查看 Console 和 Network 标签
   - 检查是否有错误或失败的请求

### 调试代码添加

如果需要更详细的调试信息，可以在浏览器控制台添加：
```javascript
// 监听字体加载
document.fonts.addEventListener('loadingdone', (e) => {
  console.log('Font loaded:', e.fontfaces)
})

// 检查已加载的字体
console.log('Loaded fonts:', Array.from(document.fonts).map(f => ({
  family: f.family,
  status: f.status,
  loaded: f.loaded
})))
```




