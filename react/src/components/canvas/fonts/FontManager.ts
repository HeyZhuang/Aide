// 字体管理器简化版

class FontManager {
  private static instance: FontManager;
  private fontCache: Map<string, boolean> = new Map();

  private constructor() { }

  static getInstance(): FontManager {
    if (!FontManager.instance) {
      FontManager.instance = new FontManager();
    }
    return FontManager.instance;
  }

  // 预加载字体
  async preloadFont(fontFamily: string, fontUrl: string): Promise<boolean> {
    try {
      // 如果已经加载过，直接返回
      if (this.fontCache.has(fontFamily)) {
        return true;
      }

      // 创建字体Face
      const fontFace = new FontFace(fontFamily, `url(${fontUrl})`);

      // 加载字体
      await fontFace.load();

      // 添加到文档字体中
      document.fonts.add(fontFace);

      // 缓存字体
      this.fontCache.set(fontFamily, true);

      return true;
    } catch (error) {
      console.error(`Failed to preload font ${fontFamily}:`, error);
      return false;
    }
  }

  // 加载字体
  async loadFont(fontFamily: string, fontUrl: string): Promise<boolean> {
    return this.preloadFont(fontFamily, fontUrl);
  }
}

export default FontManager;