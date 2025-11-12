# 测试生成的图片目录

本目录用于存放 Gemini 模型测试过程中生成的图片。

## 📁 目录说明

- 运行测试脚本时，生成的图片会自动保存到此目录
- 图片文件命名格式：`gemini_flash_YYYYMMDD_HHMMSS_原始文件名.png`
- 此目录中的图片文件不会被提交到 Git（已被 `.gitignore` 忽略）

## 🧪 相关测试脚本

| 测试脚本 | 生成图片数量 | 说明 |
|---------|------------|------|
| `test_gemini_quick.py` | 0 | 快速验证测试（不调用 API，不生成图片） |
| `test_gemini_basic.py` | 1 | 基础功能测试（生成 1 张测试图片） |

## 🗑️ 清理图片

如需清理测试生成的图片，可以手动删除此目录中的所有图片文件：

### Windows
```cmd
cd server\tests\generated_images
del *.png *.jpg *.jpeg *.webp
```

### Linux/macOS
```bash
cd server/tests/generated_images
rm -f *.png *.jpg *.jpeg *.webp
```

## 📸 查看生成的图片

运行测试后，可以直接在此目录中查看生成的图片：

```bash
# 查看目录中的所有图片
cd server/tests/generated_images
ls -la

# 使用默认图片查看器打开（示例）
# Windows: start gemini_flash_*.png
# macOS: open gemini_flash_*.png
# Linux: xdg-open gemini_flash_*.png
```

## ⚠️ 注意事项

- 此目录仅用于测试目的
- 生成的图片会占用磁盘空间，建议定期清理
- 图片文件名包含时间戳，便于追溯生成时间
- 所有图片文件都被 Git 忽略，不会影响版本控制

---

**创建日期**：2025-11-12
