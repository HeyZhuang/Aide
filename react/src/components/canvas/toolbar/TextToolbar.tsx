import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useCanvas } from '@/contexts/canvas'
import { useTranslation } from 'react-i18next'
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Palette,
  Upload,
  Star,
  RefreshCw,
  Type
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ExcalidrawTextElement } from '@excalidraw/excalidraw/element/types'
import { getFonts, type FontItem, toggleFontFavorite } from '@/api/font'
import { FontUploadDialog } from '@/components/font/FontUploadDialog'
import { toast } from 'sonner'
import { CUSTOM_FONTS, loadCustomFont } from '@/components/canvas/fonts/CustomFonts'
import FontManager from '@/components/canvas/fonts/FontManager'

interface CustomFont {
  name: string;
  fontFamily: string;
  filePath: string;
  format: 'truetype' | 'opentype' | 'woff' | 'woff2';
}

interface TextToolbarProps {
  selectedElement: ExcalidrawTextElement
}

export function TextToolbar({ selectedElement }: TextToolbarProps) {
  const { t } = useTranslation()
  const { excalidrawAPI } = useCanvas()
  const [selectedFont, setSelectedFont] = useState('Virgil')
  const [fontSize, setFontSize] = useState(20)
  const [textColor, setTextColor] = useState('#000000')
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left')
  const [opacity, setOpacity] = useState(100)
  const [customFonts, setCustomFonts] = useState<FontItem[]>([])
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [loadingFonts, setLoadingFonts] = useState(false)
  const [fontMenuOpen, setFontMenuOpen] = useState(false)
  const [localCustomFonts, setLocalCustomFonts] = useState<CustomFont[]>([])

  const selectedElementIdRef = useRef<string>(selectedElement.id)

  // Excalidraw 原生字体
  const systemFonts = [
    { name: 'Virgil', value: 1 },
    { name: 'Helvetica', value: 2 },
    { name: 'Cascadia', value: 3 },
    { name: 'Assistant', value: 4 },
    { name: 'ComicShanns', value: 5 },
    { name: 'Excalifont', value: 6 },
    { name: 'Liberation', value: 7 },
    { name: 'Lilita', value: 8 },
    { name: 'Nunito', value: 9 }
  ]

  const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96]

  // 加载本地自定义字体
  const loadLocalCustomFonts = useCallback(async () => {
    try {
      // 预加载所有本地自定义字体
      for (const font of CUSTOM_FONTS) {
        try {
          // 构造正确的字体URL路径
          const fontUrl = font.filePath.startsWith('/') ? font.filePath : `/${font.filePath}`;
          // 使用字体管理器预加载字体
          const fontManager = FontManager.getInstance();
          fontManager.preloadFont(font.fontFamily, fontUrl);
        } catch (error) {
          console.warn(`本地自定义字体 ${font.name} 预加载失败:`, error);
        }
      }
      setLocalCustomFonts(CUSTOM_FONTS);
    } catch (error) {
      console.error('Failed to load local custom fonts:', error);
    }
  }, []);

  // 加载服务器自定义字体
  const loadServerCustomFonts = useCallback(async () => {
    setLoadingFonts(true)
    try {
      const fonts = await getFonts()
      setCustomFonts(fonts)

      // 预加载所有服务器自定义字体
      fonts.forEach((font) => {
        const fontFace = new FontFace(font.font_family, `url(${font.font_file_url})`)
        fontFace.load().then(() => {
          document.fonts.add(fontFace)
        }).catch((error) => {
          console.error(`Failed to load font ${font.name}:`, error)
        })
      })
    } catch (error) {
      console.error('Failed to load custom fonts:', error)
    } finally {
      setLoadingFonts(false)
    }
  }, [])

  // 初始化加载所有自定义字体
  useEffect(() => {
    loadLocalCustomFonts();
    loadServerCustomFonts();
  }, [loadLocalCustomFonts, loadServerCustomFonts])

  // 同步选中元素的状态
  useEffect(() => {
    if (selectedElement) {
      selectedElementIdRef.current = selectedElement.id
      setFontSize(Math.round(selectedElement.fontSize || 20))

      const fontFamilyNames: Record<number, string> = {
        1: 'Virgil',
        2: 'Helvetica',
        3: 'Cascadia',
        4: 'Assistant',
        5: 'ComicShanns',
        6: 'Excalifont',
        7: 'Liberation',
        8: 'Lilita',
        9: 'Nunito'
      }
      const fontName = fontFamilyNames[selectedElement.fontFamily] || 'Virgil'
      setSelectedFont(fontName)

      setTextColor(selectedElement.strokeColor || '#000000')
      const align = selectedElement.textAlign as 'left' | 'center' | 'right'
      setTextAlign(align || 'left')
      setOpacity(selectedElement.opacity || 100)
    }
  }, [
    selectedElement?.fontSize,
    selectedElement?.fontFamily,
    selectedElement?.strokeColor,
    selectedElement?.textAlign,
    selectedElement?.opacity
  ])

  // 更新文字属性
  const updateTextElement = useCallback((updates: Partial<ExcalidrawTextElement>) => {
    if (!excalidrawAPI) return

    const elements = excalidrawAPI.getSceneElements()
    const elementIndex = elements.findIndex(el => el.id === selectedElementIdRef.current)

    if (elementIndex === -1) return

    const updatedElement = {
      ...elements[elementIndex],
      ...updates,
      versionNonce: elements[elementIndex].versionNonce + 1
    }

    const updatedElements = [
      ...elements.slice(0, elementIndex),
      updatedElement,
      ...elements.slice(elementIndex + 1)
    ]

    excalidrawAPI.updateScene({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      elements: updatedElements as any
    })
  }, [excalidrawAPI])

  const handleSystemFontChange = (fontName: string, fontValue: number) => {
    setSelectedFont(fontName)
    updateTextElement({ fontFamily: fontValue })

    // 清除自定义字体设置
    document.documentElement.style.removeProperty('--excalidraw-custom-font-family')
  }

  // 处理本地自定义字体选择
  const handleLocalCustomFontSelect = (font: CustomFont) => {
    setSelectedFont(font.name)

    // 使用字体管理器加载字体
    const fontManager = FontManager.getInstance();

    // 构造正确的字体URL路径
    const fontUrl = font.filePath.startsWith('/') ? font.filePath : `/${font.filePath}`;

    fontManager.loadFont(font.fontFamily, fontUrl).then((success) => {
      if (success) {
        // 应用字体到选中的文字元素
        // 对于自定义字体，我们使用Helvetica作为基础字体，并通过CSS变量应用实际字体
        updateTextElement({
          fontFamily: 2 // 使用Helvetica (value: 2) 作为基础字体
        })

        // 通过CSS变量设置实际的字体族名称
        document.documentElement.style.setProperty('--excalidraw-custom-font-family', font.fontFamily)

        // 强制更新所有文本元素的字体显示
        setTimeout(() => {
          const textElements = document.querySelectorAll('.excalidraw .excalidraw-element[data-type="text"]')
          textElements.forEach(element => {
            (element as HTMLElement).style.fontFamily = font.fontFamily;
          });

          // 重新渲染画布
          if (excalidrawAPI) {
            excalidrawAPI.updateScene({
              elements: excalidrawAPI.getSceneElements()
            });
          }
        }, 50);

        toast.success(`字体 ${font.name} 已应用`)
      } else {
        toast.error('字体加载失败')
      }
    }).catch((error) => {
      console.error('Failed to load font:', error)
      toast.error('字体加载失败')
    })

    setFontMenuOpen(false)
  }

  // 处理服务器自定义字体选择
  const handleServerCustomFontSelect = (font: FontItem) => {
    setSelectedFont(font.name)

    // 使用字体管理器加载字体
    const fontManager = FontManager.getInstance();

    fontManager.loadFont(font.font_family, font.font_file_url).then((success) => {
      if (success) {
        // 应用字体到选中的文字元素
        // 对于自定义字体，我们使用Helvetica作为基础字体，并通过CSS变量应用实际字体
        updateTextElement({
          fontFamily: 2 // 使用Helvetica (value: 2) 作为基础字体
        })

        // 通过CSS变量设置实际的字体族名称
        document.documentElement.style.setProperty('--excalidraw-custom-font-family', font.font_family)

        // 强制更新所有文本元素的字体显示
        setTimeout(() => {
          const textElements = document.querySelectorAll('.excalidraw .excalidraw-element[data-type="text"]')
          textElements.forEach(element => {
            (element as HTMLElement).style.fontFamily = font.font_family;
          });

          // 重新渲染画布
          if (excalidrawAPI) {
            excalidrawAPI.updateScene({
              elements: excalidrawAPI.getSceneElements()
            });
          }
        }, 50);

        toast.success(`字体 ${font.name} 已应用`)
      } else {
        toast.error('字体加载失败')
      }
    }).catch((error) => {
      console.error('Failed to load font:', error)
      toast.error('字体加载失败')
    })

    setFontMenuOpen(false)
  }

  // 切换收藏状态
  const handleToggleFavorite = useCallback(async (fontId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await toggleFontFavorite(fontId)
      setCustomFonts(prev => prev.map(f =>
        f.id === fontId ? { ...f, is_favorite: !f.is_favorite } : f
      ))
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      toast.error('操作失败')
    }
  }, [])

  const handleSizeChange = (size: number) => {
    setFontSize(size)
    updateTextElement({ fontSize: size })
  }

  const handleColorChange = (color: string) => {
    setTextColor(color)
    updateTextElement({ strokeColor: color })
  }

  const handleAlignChange = (align: 'left' | 'center' | 'right') => {
    setTextAlign(align)
    updateTextElement({ textAlign: align })
  }

  const handleOpacityChange = (value: number) => {
    setOpacity(value)
    updateTextElement({ opacity: value })
  }

  return (
    <div className="flex items-center gap-1 bg-white/50 backdrop-blur-md border border-white/60 text-foreground px-2 py-1.5 rounded-xl shadow-lg">
      {/* 字体选择 */}
      <DropdownMenu open={fontMenuOpen} onOpenChange={setFontMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs hover:bg-white/30 backdrop-blur-sm rounded-lg"
          >
            {selectedFont}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="bg-white/50 backdrop-blur-md text-foreground border border-white/60 w-[400px] p-0 rounded-xl shadow-lg"
          align="start"
        >
          <Tabs defaultValue="system" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-white/30 backdrop-blur-sm rounded-t-xl">
              <TabsTrigger
                value="system"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-foreground rounded-tl-xl"
              >
                {t('canvas:toolbar.text.systemFonts')}
              </TabsTrigger>
              <TabsTrigger
                value="local"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-foreground"
              >
                {t('canvas:toolbar.text.localFonts')}
              </TabsTrigger>
              <TabsTrigger
                value="server"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-foreground rounded-tr-xl"
              >
                {t('canvas:toolbar.text.uploadFont')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="m-0">
              <ScrollArea className="h-[300px]">
                <div className="p-2">
                  {systemFonts.map((font) => (
                    <div
                      key={font.value}
                      onClick={() => {
                        handleSystemFontChange(font.name, font.value)
                        setFontMenuOpen(false)
                      }}
                      className={`px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${selectedFont === font.name
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-white/30 text-foreground'
                        }`}
                    >
                      {font.name}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="local" className="m-0">
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-2 border-b border-white/20 rounded-t-lg">
                  <span className="text-xs text-foreground">{t('canvas:toolbar.text.localCustomFonts')}</span>
                </div>

                <ScrollArea className="h-[300px]">
                  {localCustomFonts.length === 0 ? (
                    <div className="p-6 text-center">
                      <Type className="h-8 w-8 mx-auto mb-2 text-foreground" />
                      <p className="text-sm text-foreground mb-3">{t('canvas:toolbar.text.noLocalCustomFonts')}</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {localCustomFonts.map((font, index) => (
                        <div
                          key={index}
                          onClick={() => handleLocalCustomFontSelect(font)}
                          className="px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/30 text-foreground group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="font-medium truncate"
                                  style={{ fontFamily: font.fontFamily }}
                                >
                                  {font.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs border-white/30 text-foreground rounded"
                                >
                                  {font.format.toUpperCase()}
                                </Badge>
                              </div>
                              <p
                                className="text-xs text-foreground font-preview"
                                style={{ fontFamily: font.fontFamily }}
                              >
                                {font.name} ABC abc 123
                              </p>
                            </div>

                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="server" className="m-0">
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-2 border-b border-white/20 rounded-t-lg">
                  <span className="text-xs text-foreground">{t('canvas:toolbar.text.serverCustomFonts')}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-white/30 backdrop-blur-sm rounded-md"
                      onClick={loadServerCustomFonts}
                      disabled={loadingFonts}
                      title={t('canvas:toolbar.text.refreshFontList')}
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingFonts ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs hover:bg-white/30 backdrop-blur-sm rounded-md"
                      onClick={() => {
                        setShowUploadDialog(true)
                        setFontMenuOpen(false)
                      }}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {t('canvas:toolbar.text.upload')}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[300px]">
                  {loadingFonts ? (
                    <div className="flex items-center justify-center h-32">
                      <RefreshCw className="h-5 w-5 animate-spin text-foreground" />
                    </div>
                  ) : customFonts.length === 0 ? (
                    <div className="p-6 text-center">
                      <Type className="h-8 w-8 mx-auto mb-2 text-foreground" />
                      <p className="text-sm text-foreground mb-3">{t('canvas:toolbar.text.noServerCustomFonts')}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/30 text-foreground hover:bg-white/30 backdrop-blur-sm rounded-lg"
                        onClick={() => {
                          setShowUploadDialog(true)
                          setFontMenuOpen(false)
                        }}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        {t('canvas:toolbar.text.uploadFont')}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {customFonts.map((font) => (
                        <div
                          key={font.id}
                          onClick={() => handleServerCustomFontSelect(font)}
                          className="px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/30 text-foreground group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate" style={{ fontFamily: font.font_family }}>
                                  {font.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs border-white/30 text-foreground rounded"
                                >
                                  {font.font_format.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-xs text-foreground"> {font.font_family}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white/30 backdrop-blur-sm rounded-md"
                              onClick={(e) => handleToggleFavorite(font.id, e)}
                            >
                              <Star
                                className={`h-3 w-3 ${font.is_favorite
                                  ? 'text-yellow-500 fill-current'
                                  : 'text-foreground'
                                  }`}
                              />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5 bg-white/30" />

      {/* 字号选择 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs hover:bg-white/30 backdrop-blur-sm rounded-lg"
          >
            {fontSize}
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-white/50 backdrop-blur-md text-foreground border border-white/60 max-h-60 overflow-y-auto rounded-lg shadow-lg">
          {fontSizes.map((size) => (
            <DropdownMenuItem
              key={size}
              onClick={() => handleSizeChange(size)}
              className="hover:bg-white/30 text-foreground rounded-md transition-all duration-200"
            >
              {size}px
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5 bg-white/30" />

      {/* 对齐方式 */}
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 hover:bg-white/30 backdrop-blur-sm rounded-lg ${textAlign === 'left' ? 'bg-blue-600' : ''}`}
        onClick={() => handleAlignChange('left')}
        title={t('canvas:toolbar.text.textAlignLeft')}
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 hover:bg-white/30 backdrop-blur-sm rounded-lg ${textAlign === 'center' ? 'bg-blue-600' : ''}`}
        onClick={() => handleAlignChange('center')}
        title={t('canvas:toolbar.text.textAlignCenter')}
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 w-7 p-0 hover:bg-white/30 backdrop-blur-sm rounded-lg ${textAlign === 'right' ? 'bg-blue-600' : ''}`}
        onClick={() => handleAlignChange('right')}
        title={t('canvas:toolbar.text.textAlignRight')}
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-5 bg-white/30" />

      {/* 透明度 */}
      <div className="flex items-center gap-2">
        <span className="text-xs">{t('canvas:toolbar.text.opacity')}</span>
        <div className="w-20">
          <Slider
            value={[opacity]}
            onValueChange={([value]) => handleOpacityChange(value)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
        <span className="text-xs w-8">{Math.round(opacity)}%</span>
      </div>

      <Separator orientation="vertical" className="h-5 bg-white/30" />

      {/* 文字颜色 */}
      <div className="relative group">
        <input
          type="color"
          value={textColor}
          onChange={(e) => handleColorChange(e.target.value)}
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
          title={t('canvas:toolbar.text.selectColor')}
        />
        <div className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition-colors">
          <div className="relative pointer-events-none">
            <Palette className="h-4 w-4" />
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-gray-700"
              style={{ backgroundColor: textColor }}
            />
          </div>
          <div
            className="w-6 h-6 rounded border border-gray-600 shadow-inner pointer-events-none"
            style={{ backgroundColor: textColor }}
          />
        </div>
      </div>

      {/* 字体上传对话框 */}
      {showUploadDialog && (
        <FontUploadDialog
          isOpen={showUploadDialog}
          onClose={() => setShowUploadDialog(false)}
          onSuccess={() => {
            setShowUploadDialog(false)
            loadServerCustomFonts()
            toast.success('字体上传成功')
          }}
          categories={[]}
        />
      )}
    </div>
  )
}
