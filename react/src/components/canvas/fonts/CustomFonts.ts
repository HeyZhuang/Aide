// 自定义字体定义文件

export interface CustomFont {
  name: string;
  fontFamily: string;
  filePath: string;
  format: 'truetype' | 'opentype' | 'woff' | 'woff2';
}

// 本地自定义字体列表
export const CUSTOM_FONTS: CustomFont[] = [
  {
    name: 'CustomWebFont',
    fontFamily: 'CustomWebFont',
    filePath: '/fonts/CustomWebFont.ttf',
    format: 'truetype'
  },
  {
    name: '华康POP1体W5',
    fontFamily: '华康POP1体W5',
    filePath: '/fonts/华康POP1体W5-B5.TTF',
    format: 'truetype'
  },
  {
    name: '华康POP1体W7',
    fontFamily: '华康POP1体W7',
    filePath: '/fonts/华康POP1体W7-B5.TTF',
    format: 'truetype'
  },
  {
    name: '华康POP1体W9',
    fontFamily: '华康POP1体W9',
    filePath: '/fonts/华康POP1体W9-B5.TTF',
    format: 'truetype'
  },
  {
    name: '江城斜黑体',
    fontFamily: '江城斜黑体',
    filePath: '/fonts/江城斜黑体 900W.ttf',
    format: 'truetype'
  },
  {
    name: '華康超特圓體',
    fontFamily: '華康超特圓體',
    filePath: '/fonts/華康超特圓體.ttf',
    format: 'truetype'
  }
];

// 加载自定义字体的函数
export const loadCustomFont = async (font: CustomFont): Promise<boolean> => {
  try {
    // 创建字体Face
    const fontFace = new FontFace(font.fontFamily, `url(${font.filePath})`);

    // 加载字体
    const loadedFont = await fontFace.load();

    // 添加到文档字体中
    document.fonts.add(loadedFont);

    return true;
  } catch (error) {
    console.error(`Failed to load custom font ${font.name}:`, error);
    return false;
  }
};