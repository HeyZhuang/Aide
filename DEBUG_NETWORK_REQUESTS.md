# 如何在瀏覽器 Network 標籤中查找返回 HTML 的 API 請求

## 📋 快速步驟

### 1. 打開開發者工具
- **Chrome/Edge**: 按 `F12` 或 `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- **Firefox**: 按 `F12` 或 `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)

### 2. 切換到 Network（網絡）標籤
- 點擊頂部工具欄的 **Network** 標籤

### 3. 清空並重新載入
- 點擊左上角的 **清空按鈕**（🚫 或 Clear）清除現有請求
- 按 `F5` 刷新頁面，或執行會觸發錯誤的操作

### 4. 過濾 API 請求

#### 方法 A: 使用搜索框
- 在 **Filter** 輸入框（左上角）輸入: `api`
- 這會只顯示包含 "api" 的請求

#### 方法 B: 使用類型過濾
- 點擊 **XHR** 或 **Fetch** 按鈕
- 這會只顯示 AJAX/Fetch 請求（通常是 API 請求）

### 5. 識別問題請求

檢查以下列：

#### Name 列
- 應該看到請求路徑，例如：
  - `/api/canvas/list`
  - `/api/templates/categories`
  - `/api/psd/templates/list`

#### Type 列
- ✅ **正確**: `xhr`, `fetch`, `json`
- ❌ **錯誤**: `document` (這表示返回了 HTML 頁面)

#### Status 列
- 應該是 `200`（成功）
- 如果看到 `404` 或其他錯誤，點擊查看詳細信息

#### Size 列
- **JSON 響應**: 通常很小（幾 KB）
- **HTML 響應**: 通常很大（數十 KB 或更大）

### 6. 檢查響應內容

點擊可疑的請求，查看以下標籤：

#### Preview 標籤（推薦）
- 如果看到格式化後的 JSON 對象 → ✅ 正確
- 如果看到 HTML 標籤（如 `<html>`, `<!doctype>`）→ ❌ **這是問題！**

#### Response 標籤
- 查看原始響應內容
- JSON 應該以 `{` 或 `[` 開頭
- HTML 會以 `<!doctype` 或 `<html` 開頭

#### Headers 標籤
- 查看 **Response Headers** → **Content-Type**
- ✅ **正確**: `application/json` 或 `application/json; charset=utf-8`
- ❌ **錯誤**: `text/html` 或 `text/html; charset=utf-8`

## 🔍 實際示例

### 正確的 API 請求應該看起來像：

```
Name: /api/canvas/list
Type: xhr
Status: 200
Size: 2.5 KB
Content-Type: application/json

Response:
[
  {
    "id": "default",
    "name": "Default Canvas",
    ...
  }
]
```

### 錯誤的 API 請求（返回 HTML）看起來像：

```
Name: /api/canvas/list
Type: document  ← ❌ 應該是 xhr 或 fetch
Status: 200
Size: 45 KB     ← ❌ 通常很大
Content-Type: text/html  ← ❌ 應該是 application/json

Response:
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  ...
```

## 📸 截圖檢查清單

當找到問題請求時，請記錄：
1. ✅ 請求的完整 URL（Name 列）
2. ✅ 響應的 Content-Type（Headers 標籤）
3. ✅ 響應的前幾行內容（Response 標籤）
4. ✅ 請求的方法（GET/POST）和狀態碼（200/404/500 等）

## 🛠️ 常見問題位置

根據錯誤信息，重點檢查這些 API：
- `/api/canvas/{id}` - 獲取畫布數據
- `/api/templates/items` - 獲取模板列表
- `/api/templates/categories` - 獲取模板分類
- `/api/psd/templates/list` - 獲取 PSD 模板列表

## 💡 提示

- 使用 **Preserve log**（保留日誌）選項，這樣刷新頁面後請求不會消失
- 右鍵點擊請求 → **Copy** → **Copy as cURL**，可以複製完整的請求信息
- 可以將請求拖拽到其他地方查看詳細信息



