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

  const selectedElementIdRef = useRef<string>(selectedElement.id)

  // Excalidraw 原生字体
  const fonts = [
    { name: 'Virgil', value: 1 },
    { name: 'Helvetica', value: 2 },
    { name: 'Cascadia', value: 3 }
  ]

  const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96]

  // 加载自定义字体
  const loadCustomFonts = useCallback(async () => {
    setLoadingFonts(true)
    try {
      const fonts = await getFonts()
      setCustomFonts(fonts)

      // 预加载所有自定义字体
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

  // 初始化加载自定义字体
  useEffect(() => {
    loadCustomFonts()
  }, [loadCustomFonts])

  // 同步选中元素的状态
  useEffect(() => {
    if (selectedElement) {
      selectedElementIdRef.current = selectedElement.id
      setFontSize(Math.round(selectedElement.fontSize || 20))

      const fontFamilyNames: Record<number, string> = {
        1: 'Virgil',
        2: 'Helvetica',
        3: 'Cascadia'
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

  const handleFontChange = (fontName: string, fontValue: number) => {
    setSelectedFont(fontName)
    updateTextElement({ fontFamily: fontValue })
  }

  // 处理自定义字体选择
  const handleCustomFontSelect = (font: FontItem) => {
    setSelectedFont(font.name)
    updateTextElement({ fontFamily: 2 }) // 使用 Helvetica 作为基础

    // 确保字体已加载
    const fontFace = new FontFace(font.font_family, `url(${font.font_file_url})`)
    fontFace.load().then(() => {
      document.fonts.add(fontFace)
      toast.success(`字体 ${font.name} 已应用`)
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
            <TabsList className="w-full grid grid-cols-2 bg-white/30 backdrop-blur-sm rounded-t-xl">
              <TabsTrigger
                value="system"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-foreground rounded-tl-xl"
              >
                {t('canvas:toolbar.text.customFonts')}
              </TabsTrigger>
              <TabsTrigger
                value="upload"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-foreground rounded-tr-xl"
              >
                {t('canvas:toolbar.text.uploadFont')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="system" className="m-0">
              <ScrollArea className="h-[300px]">
                <div className="p-2">
                  {fonts.map((font) => (
                    <div
                      key={font.value}
                      onClick={() => {
                        handleFontChange(font.name, font.value)
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

            <TabsContent value="upload" className="m-0">
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-2 border-b border-white/20 rounded-t-lg">
                  <span className="text-xs text-foreground">{t('canvas:toolbar.text.customFonts')}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-white/30 backdrop-blur-sm rounded-md"
                      onClick={loadCustomFonts}
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
                      <p className="text-sm text-foreground mb-3">{t('canvas:toolbar.text.noCustomFonts')}</p>
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
                          onClick={() => handleCustomFontSelect(font)}
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
            loadCustomFonts()
            toast.success('字体上传成功')
          }}
          categories={[]}
        />
      )}
    </div>
  )
}
