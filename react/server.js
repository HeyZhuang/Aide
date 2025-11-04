#!/usr/bin/env node

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3004;
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:57988';

// 代理所有 /api/* 请求到后端 - 必须在最前面
// 注意：createProxyMiddleware 在 app.use('/api', ...) 时会自动去掉 /api 前缀
// 例如：/api/list_models 会被转发为 /list_models
// 我们需要使用 pathRewrite 将路径重新加上 /api 前缀
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  secure: false,
  pathRewrite: (path, req) => {
    // path 已经被去掉了 /api 前缀，例如: /list_models
    // 我们需要加回 /api 前缀: /api/list_models
    return `/api${path}`;
  },
  onError: (err, req, res) => {
    console.error('[PROXY] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Proxy error', message: err.message });
    }
  },
  onProxyReq: (proxyReq, req) => {
    const targetHost = new URL(BACKEND_URL).host;
    proxyReq.setHeader('Host', targetHost);
    // 确保路径包含 /api 前缀
    const targetPath = req.originalUrl || req.url;
    console.log(`[PROXY] ${req.method} ${targetPath} -> ${BACKEND_URL}${targetPath}`);
  },
  onProxyRes: (proxyRes, req) => {
    console.log(`[PROXY] Response ${proxyRes.statusCode} for ${req.originalUrl || req.url}`);
    // 确保 Content-Type 是正确的
    if (!proxyRes.headers['content-type']) {
      proxyRes.headers['content-type'] = 'application/json';
    }
  },
}));

// 代理 WebSocket 连接
app.use('/socket.io', createProxyMiddleware({
  target: BACKEND_URL,
  ws: true,
  changeOrigin: true,
}));

// 代理认证页面路由到后端
app.use('/auth', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  secure: false,
}));

// 提供静态文件 - 只在非 API 路径时处理
const distDir = join(__dirname, 'dist');
const staticMiddleware = express.static(distDir, {
  index: false, // 不自动返回 index.html
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      // HTML 文件不缓存，确保总是获取最新版本
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (path.match(/\.(js|css)$/)) {
      // JS/CSS 文件（带hash）可以长期缓存，因为hash变化时文件名也会变
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // 其他静态资源缓存1年
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  },
});

app.use((req, res, next) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io') && !req.path.startsWith('/auth')) {
    staticMiddleware(req, res, next);
  } else {
    next();
  }
});

// SPA 路由回退 - 使用 use 而不是 get
app.use((req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/assets') && !req.path.startsWith('/socket.io') && !req.path.startsWith('/auth')) {
    // 确保 index.html 不被缓存
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(join(distDir, 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend server listening on http://0.0.0.0:${PORT}`);
  console.log(`Proxying /api/* to ${BACKEND_URL}`);
});
