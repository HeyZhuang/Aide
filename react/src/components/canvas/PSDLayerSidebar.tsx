

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from 'react-i18next'
import {
    Layers,
    Eye,
    EyeOff,
    Type,
    Image as ImageIcon,
    FolderOpen,
    Edit3,
    Move,
    X,
    Palette,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Bold,
    Italic,
    Underline,
    Bookmark,
    Star,
    Upload,
    Trash2,
    ImagePlus,
} from 'lucide-react'
import { saveCanvas } from '@/api/canvas'
import {
    updateLayerProperties,
    type PSDLayer,
    uploadPSD,
    type PSDUploadResponse,
    listPSDTemplates,
    getPSDTemplateById,
    parsePSDTemplate,
    type PSDTemplateInfo
} from '@/api/upload'
import { useCanvas } from '@/contexts/canvas'
import { TemplateManager } from '@/components/template/TemplateManager'
import { createTemplateFromPSDLayer } from '@/api/template'
import { FontUploadDialog } from '@/components/font/FontUploadDialog'
import { getFonts, getFontCategories, type FontItem, type FontCategory, searchFonts } from '@/api/font'
import { toast } from 'sonner'
import { Search } from 'lucide-react'

interface PSDLayerSidebarProps {
    psdData: {
        file_id: string
        layers: PSDLayer[]
        width: number
        height: number
    } | null
    isVisible: boolean
    onClose: () => void
    onUpdate: (updatedPsdData: any) => void
}

export function PSDLayerSidebar({ psdData, isVisible, onClose, onUpdate }: PSDLayerSidebarProps) {
    const { t } = useTranslation()
    const { excalidrawAPI, setOverlay, clearOverlay } = useCanvas()

    // 状态管理
    const [selectedLayer, setSelectedLayer] = useState<PSDLayer | null>(null)
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<'all' | 'text' | 'layer' | 'group'>('all')
    const [canvasElements, setCanvasElements] = useState<any[]>([])
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
    const [showTemplateManager, setShowTemplateManager] = useState(false)
    // UI 演示：顶部两类与资产子类
    const [uiTopTab, setUiTopTab] = useState<'layers' | 'assets'>('layers')
    const [assetSubTab, setAssetSubTab] = useState<'templates' | 'library' | 'fonts'>('library')
    const [assetSource, setAssetSource] = useState<'platform' | 'uploads'>('platform')

    // 图片数据状态管理
    const [platformImages, setPlatformImages] = useState<string[]>([])
    const [userUploadedImages, setUserUploadedImages] = useState<Array<{ id: string, name: string, url: string }>>([])
    const [draggedImageData, setDraggedImageData] = useState<{ url: string, name: string } | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // PSD模板相关状态
    const [psdTemplates, setPsdTemplates] = useState<PSDTemplateInfo[]>([])
    const [selectedPsdTemplate, setSelectedPsdTemplate] = useState<string | null>(null)
    const [psdTemplateData, setPsdTemplateData] = useState<PSDUploadResponse | null>(null)
    const [loadingPsd, setLoadingPsd] = useState(false)
    const [thumbnailLoadErrors, setThumbnailLoadErrors] = useState<Set<string>>(new Set())

    // 艺术字相关状态
    const [artisticFonts, setArtisticFonts] = useState<FontItem[]>([])
    const [fontCategories, setFontCategories] = useState<FontCategory[]>([])
    const [loadingFonts, setLoadingFonts] = useState(false)
    const [showFontUploadDialog, setShowFontUploadDialog] = useState(false)
    const [fontSearchQuery, setFontSearchQuery] = useState('')

    // 处理图片上传
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files || files.length === 0) return

        try {
            // 模拟上传过程
            setLoading(true)

            // 使用FileReader读取图片并转换为Data URL
            const readFileAsDataURL = (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => {
                        if (typeof reader.result === 'string') {
                            resolve(reader.result)
                        } else {
                            reject(new Error('无法读取文件内容'))
                        }
                    }
                    reader.onerror = () => reject(new Error('读取文件失败'))
                    reader.readAsDataURL(file)
                })
            }

            const newImages: any[] = []

            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                try {
                    // 验证是否为有效的图片文件
                    if (!file.type.startsWith('image/')) {
                        console.warn('跳过非图片文件:', file.name)
                        continue
                    }

                    // 使用FileReader读取文件为Data URL
                    const dataUrl = await readFileAsDataURL(file)
                    console.log('成功创建Data URL:', '文件名:', file.name, '类型:', file.type, '大小:', file.size)

                    const imageObj = {
                        id: Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        url: dataUrl,
                        type: file.type,
                        size: file.size
                    }

                    newImages.push(imageObj)
                } catch (fileError) {
                    console.error('读取文件失败:', fileError, '文件:', file.name)
                }
            }

            // 使用函数式更新确保状态正确合并
            setUserUploadedImages(prev => {
                const updated = [...prev, ...newImages]
                console.log('更新后的上传图片列表:', updated.length, '张图片')
                return updated
            })

            if (newImages.length > 0) {
                // 图片上传成功，但不显示overlay（因为是侧边栏操作，不需要画布中央提示）
            } else {
                setError('无法上传图片，请确保选择的是有效的图片文件')
            }

            // 清空文件输入
            event.target.value = ''
        } catch (err) {
            console.error('上传处理失败:', err)
            setError('处理图片时出错')
        } finally {
            setLoading(false)
        }
    }

    // 由于使用Data URL而非Object URL，不再需要清理临时URL
    // 保留此effect以便将来如果切换回Object URL时使用
    useEffect(() => {
        return () => {
            console.log('组件卸载，当前使用Data URL不需要清理')
        }
    }, [userUploadedImages])

    // 处理图片点击事件 - 添加图片到画布中心
    const handleImageClick = async (imageInfo: { name: string, url?: string }) => {
        try {
            console.log('🖱️ 点击图片:', imageInfo.name)

            if (!excalidrawAPI) {
                setOverlay(true, '画布未初始化', 'error')
                setTimeout(() => clearOverlay(), 2000)
                return
            }

            // 准备图片数据
            let dataURL = imageInfo.url || `/assets/${imageInfo.name}`
            let mimeType = 'image/png'

            // 如果是相对路径，需要fetch获取blob
            if (!dataURL.startsWith('data:')) {
                const response = await fetch(dataURL)
                const blob = await response.blob()
                mimeType = blob.type

                // 转换为DataURL
                dataURL = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result as string)
                    reader.onerror = reject
                    reader.readAsDataURL(blob)
                })
            }

            // 创建图片元素ID
            const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

            // 添加文件到Excalidraw
            excalidrawAPI.addFiles([{
                id: fileId as any,
                dataURL: dataURL as any,
                mimeType: mimeType as any,
                created: Date.now()
            }])

            // 获取画布状态和当前元素
            const appState = excalidrawAPI.getAppState()
            const currentElements = excalidrawAPI.getSceneElements()

            // 在画布中心创建图片元素
            const newImageElement = {
                id: `image-${fileId}`,
                type: 'image' as const,
                x: -appState.scrollX + (appState.width / 2 / appState.zoom.value) - 100,
                y: -appState.scrollY + (appState.height / 2 / appState.zoom.value) - 100,
                width: 200,
                height: 200,
                angle: 0,
                strokeColor: 'transparent',
                backgroundColor: 'transparent',
                fillStyle: 'solid' as const,
                strokeWidth: 1,
                strokeStyle: 'solid' as const,
                roughness: 0,
                opacity: 100,
                fileId: fileId,
                scale: [1, 1] as [number, number],
                status: 'saved' as const,
                locked: false,
                version: 1,
                versionNonce: Math.floor(Math.random() * 1000000000),
                isDeleted: false,
                groupIds: [],
                boundElements: null,
                updated: Date.now(),
                link: null,
                customData: {
                    libraryImage: true,
                    imageName: imageInfo.name
                }
            }

            // 添加到画布
            excalidrawAPI.updateScene({
                elements: [...currentElements, newImageElement as any]
            })

            setOverlay(true, `图片 "${imageInfo.name}" 已添加到画布`, 'success')
            setTimeout(() => clearOverlay(), 2000)
        } catch (err) {
            console.error('添加图片到画布失败:', err)
            setOverlay(true, '添加图片失败，请重试', 'error')
            setTimeout(() => clearOverlay(), 2000)
        }
    }

    // 处理图片删除事件
    const handleImageDelete = (imageId: string, imageName: string) => {
        try {
            // 显示确认对话框
            if (!window.confirm(`确定要删除图片 "${imageName}" 吗？`)) {
                return
            }

            console.log('删除图片:', imageId, imageName)

            // 更新状态，过滤掉要删除的图片
            setUserUploadedImages(prev => {
                const updated = prev.filter(image => image.id !== imageId)
                console.log('删除后的图片列表:', updated.length, '张图片')
                return updated
            })

            // 删除成功，不显示提示（侧边栏操作）
        } catch (err) {
            console.error('删除图片失败:', err)
            // 删除失败也不显示提示，避免干扰用户
        }
    }

    // 监听画布变化，实时同步图层状态
    useEffect(() => {
        if (!excalidrawAPI || !isVisible) return

        const updateCanvasElements = () => {
            const elements = excalidrawAPI.getSceneElements()
            const psdElements = elements.filter(element =>
                element.customData?.psdFileId ||
                element.customData?.psdLayerIndex !== undefined ||
                element.customData?.psdLayerName
            )

            setCanvasElements(psdElements)
            setLastUpdateTime(Date.now())

            // console.log('图层列表同步更新:', {
            //     totalElements: elements.length,
            //     psdElements: psdElements.length,
            //     timestamp: new Date().toLocaleTimeString()
            // })
        }

        // 初始更新
        updateCanvasElements()

        // 监听画布变化事件
        excalidrawAPI?.onChange(updateCanvasElements)

        // 定期检查更新（作为备用机制）
        const interval = setInterval(updateCanvasElements, 1000)

        return () => {
            clearInterval(interval)
        }
    }, [excalidrawAPI, isVisible])

    // 获取平台图片数据
    useEffect(() => {
        const fetchPlatformImages = async () => {
            if (assetSubTab !== 'library' || assetSource !== 'platform') return

            setLoading(true)
            setError(null)

            try {
                // 模拟API调用
                // 实际项目中应该替换为真实的API调用
                // const response = await fetch('/api/platform/images')
                // const data = await response.json()
                // setPlatformImages(data.images)

                // 模拟数据加载延迟
                await new Promise(resolve => setTimeout(resolve, 500))

                // 使用public/assets中的图片作为模拟数据
                const mockPlatformImages = [
                    // 素材模板中的图片
                    '01-momo-M09-鋪底_專業抗敏護齦牙膏100g-8入+買舒酸定指定品-送_1200x1200.jpg',
                    '02-momo-舒酸定-M09-0905,0908-滿888現折100_1200x1200.jpg',
                    '04-9288701-好便宜0912-_1200x628.jpg',
                    '60000000201964 舒酸定專業抗敏護齦牙膏 100g_tube.png',
                    '60000000201964 舒酸定專業抗敏護齦牙膏 100g_正面立體圖.png',
                    '60000000201964 舒酸定專業抗敏護齦牙膏 100g_直式立體圖.png',
                    '60000000211457 舒酸定專業抗敏護齦強化琺瑯質牙膏_tube.png',
                    'SSD SENSITIVITY_GUM_&_ENAMEL_100_g_正面立體圖.png',
                    'SSD SENSITIVITY_GUM_&_ENAMEL_100_g_直式立體圖.png',
                    '主圖測試.jpg',
                    // 新增的图片
                    '1.5倍渗透.png',
                    '3重焕齿.png',
                    '多效呵护.png'
                ]

                setPlatformImages(mockPlatformImages)
            } catch (err) {
                setError('获取平台图片失败')
                console.error('获取平台图片失败:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchPlatformImages()
    }, [assetSubTab, assetSource])

    // 获取PSD模板列表
    useEffect(() => {
        const fetchPsdTemplates = async () => {
            if (assetSubTab !== 'templates') return

            setLoading(true)
            setError(null)

            try {
                // 从API获取template文件夹下的PSD模板列表（包含解析状态）
                const templates = await listPSDTemplates()

                // 前端去重：基于文件名去重，保留最新的模板（作为双重保障）
                const templatesMap = new Map<string, PSDTemplateInfo>()
                templates.forEach(template => {
                    const existing = templatesMap.get(template.name)
                    if (!existing) {
                        templatesMap.set(template.name, template)
                    } else {
                        // 如果已存在，比较created_at，保留更新的
                        const existingDate = existing.created_at ? new Date(existing.created_at).getTime() : 0
                        const currentDate = template.created_at ? new Date(template.created_at).getTime() : 0
                        if (currentDate > existingDate) {
                            templatesMap.set(template.name, template)
                        }
                    }
                })

                // 转换为数组并排序
                const uniqueTemplates = Array.from(templatesMap.values())
                setPsdTemplates(uniqueTemplates)

                // 如果有未解析的模板，可以选择自动解析（或显示提示）
                const unparsedTemplates = uniqueTemplates.filter(t => !t.is_parsed)
                if (unparsedTemplates.length > 0) {
                    console.log(`发现 ${unparsedTemplates.length} 个未解析的PSD模板`)
                    // 可以选择自动后台解析，或者显示提示让用户手动触发
                }
            } catch (err) {
                setError('获取PSD模板失败')
                console.error('获取PSD模板失败:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchPsdTemplates()
    }, [assetSubTab])

    // 加载艺术字列表和分类
    const loadArtisticFonts = useCallback(async () => {
        if (assetSubTab !== 'fonts') return

        setLoadingFonts(true)
        try {
            const [fonts, categories] = await Promise.all([
                getFonts(),
                getFontCategories()
            ])
            setArtisticFonts(fonts)
            setFontCategories(categories)
        } catch (error) {
            console.error('加载艺术字失败:', error)
            toast.error('加载艺术字失败')
        } finally {
            setLoadingFonts(false)
        }
    }, [assetSubTab])

    // 搜索艺术字
    const handleFontSearch = useCallback(async (query: string) => {
        setFontSearchQuery(query)
        if (!query.trim()) {
            await loadArtisticFonts()
            return
        }

        setLoadingFonts(true)
        try {
            const results = await searchFonts(query)
            setArtisticFonts(results)
        } catch (error) {
            console.error('搜索艺术字失败:', error)
            toast.error('搜索艺术字失败')
        } finally {
            setLoadingFonts(false)
        }
    }, [loadArtisticFonts])

    // 当切换到fonts标签页时加载艺术字
    useEffect(() => {
        if (assetSubTab === 'fonts') {
            loadArtisticFonts()
        }
    }, [assetSubTab, loadArtisticFonts])

    // 处理艺术字上传成功
    const handleFontUploadSuccess = useCallback(() => {
        setShowFontUploadDialog(false)
        loadArtisticFonts()
        toast.success(t('fonts.artistic_font_uploaded'))
    }, [loadArtisticFonts, t])

    // 处理PSD模板点击 - 直接上传到画布
    const handlePsdTemplateClick = async (template: PSDTemplateInfo) => {
        try {
            console.log('🎯 点击PSD模板:', template.name)
            setLoadingPsd(true)
            setSelectedPsdTemplate(template.name)

            let result: PSDUploadResponse

            // 如果模板已解析，直接从数据库加载（快速）
            if (template.is_parsed && template.template_id) {
                setOverlay(true, t('canvas:messages.templateLoading.loadingTemplate', { name: template.display_name }), 'loading')

                try {
                    // 从数据库快速获取已解析的数据
                    result = await getPSDTemplateById(template.template_id)
                    console.log('✅ 从数据库快速加载PSD模板:', result)
                } catch (error) {
                    console.warn('从数据库加载失败，回退到解析模式:', error)
                    // 如果从数据库加载失败，回退到解析模式
                    setOverlay(true, t('canvas:messages.templateLoading.fallbackLoading'), 'loading')

                    // 从template文件夹获取PSD文件
                    const response = await fetch(`/api/psd/templates/${encodeURIComponent(template.name)}`)
                    if (!response.ok) {
                        throw new Error('获取PSD文件失败')
                    }

                    const blob = await response.blob()
                    const file = new File([blob], template.name, { type: 'application/octet-stream' })

                    // 上传并解析PSD
                    result = await uploadPSD(file)
                }
            } else {
                // 如果模板未解析，先解析再加载
                setOverlay(true, t('canvas:messages.templateLoading.parsingPSD', { name: template.name }), 'loading')

                try {
                    // 先解析PSD文件并存储到数据库
                    const parseResult = await parsePSDTemplate(template.name)

                    if (parseResult.already_parsed) {
                        // 如果已经解析过，直接从数据库加载
                        result = await getPSDTemplateById(parseResult.template_id)
                    } else {
                        // 如果刚刚解析完成，直接使用解析结果（需要再次获取）
                        setOverlay(true, t('canvas:messages.templateLoading.loadingParsed'), 'loading')
                        result = await getPSDTemplateById(parseResult.template_id)
                    }
                    console.log('✅ PSD模板解析完成并已加载:', result)
                } catch (error) {
                    // 如果解析失败，回退到传统的上传解析方式
                    console.warn('解析失败，回退到传统方式:', error)
                    setOverlay(true, t('canvas:messages.templateLoading.fallbackLoading'), 'loading')

                    // 从template文件夹获取PSD文件
                    const response = await fetch(`/api/psd/templates/${encodeURIComponent(template.name)}`)
                    if (!response.ok) {
                        throw new Error('获取PSD文件失败')
                    }

                    const blob = await response.blob()
                    const file = new File([blob], template.name, { type: 'application/octet-stream' })

                    // 上传并解析PSD
                    result = await uploadPSD(file)
                }
            }

            // 直接添加所有图层到画布（复用 PSDCanvasUploader 的逻辑）
            if (excalidrawAPI && result.layers) {
                console.log('开始添加PSD图层到画布，共', result.layers.length, '个图层')

                // 首先去除画布中所有群组
                const currentElementsBefore = excalidrawAPI.getSceneElements()
                const elementsWithoutGroups = currentElementsBefore.map(element => ({
                    ...element,
                    groupIds: [] // 移除所有群组ID
                }))
                if (currentElementsBefore.some(el => el.groupIds && el.groupIds.length > 0)) {
                    excalidrawAPI.updateScene({
                        elements: elementsWithoutGroups,
                    })
                    console.log('✅ 已去除画布中所有群组')
                }

                // 获取画布状态
                const appState = excalidrawAPI.getAppState()
                const currentElements = excalidrawAPI.getSceneElements()

                // 计算视口中心
                const viewportCenter = {
                    x: -appState.scrollX + (appState.width || 0) / 2 / appState.zoom.value,
                    y: -appState.scrollY + (appState.height || 0) / 2 / appState.zoom.value,
                }

                // 过滤有效图层：排除群组，只保留图片和文字图层
                const validLayers = result.layers.filter(layer => {
                    // 排除群组类型
                    if (layer.type === 'group') {
                        console.log(`跳过群组图层: ${layer.name}`)
                        return false
                    }

                    // 对于文字图层，即使没有image_url也允许
                    const isTextLayer = layer.type === 'text'
                    return (layer.image_url || isTextLayer) &&
                        layer.visible !== false &&
                        layer.width > 0 &&
                        layer.height > 0
                })

                console.log('有效图层数量:', validLayers.length)

                if (validLayers.length === 0) {
                    setOverlay(true, t('canvas:messages.templateLoading.noDisplayableLayers'), 'error')
                    setTimeout(() => clearOverlay(), 3000)
                    setSelectedPsdTemplate(null)
                    setLoadingPsd(false)
                    return
                }

                // 计算PSD整体边界
                const minLeft = Math.min(...validLayers.map(l => l.left || 0))
                const minTop = Math.min(...validLayers.map(l => l.top || 0))
                const maxRight = Math.max(...validLayers.map(l => (l.left || 0) + (l.width || 0)))
                const maxBottom = Math.max(...validLayers.map(l => (l.top || 0) + (l.height || 0)))
                const psdWidth = maxRight - minLeft
                const psdHeight = maxBottom - minTop

                // 计算居中偏移
                const centerOffsetX = viewportCenter.x - (minLeft + psdWidth / 2)
                const centerOffsetY = viewportCenter.y - (minTop + psdHeight / 2)

                // 按图层顺序添加
                const sortedLayers = [...validLayers].sort((a, b) => a.index - b.index)
                const newElements: any[] = []
                const totalLayers = sortedLayers.length

                // 批量添加文件，减少API调用次数
                const fileEntries: any[] = []
                const timestamp = Date.now()

                // 确保file_id有效（如果从数据库加载可能为null）
                const baseFileId = result.file_id || result.template_id || `template-${timestamp}`

                for (let i = 0; i < sortedLayers.length; i++) {
                    const layer = sortedLayers[i]

                    // 确保每个fileId都是唯一的字符串
                    const fileId = `psd-template-${baseFileId}-${layer.index}-${timestamp}-${i}-${Math.random().toString(36).substr(2, 9)}`

                    // 验证fileId不是null/undefined
                    if (!fileId || typeof fileId !== 'string') {
                        console.error('Invalid fileId generated:', fileId)
                        continue
                    }

                    // 验证image_url存在且有效
                    if (!layer.image_url || typeof layer.image_url !== 'string') {
                        console.warn('Layer missing image_url, skipping:', layer.name)
                        continue
                    }

                    fileEntries.push({
                        id: fileId,
                        dataURL: layer.image_url,
                        mimeType: 'image/png',
                        created: Date.now()
                    })

                    // 创建图层元素
                    const imageElement: any = {
                        id: `image-${fileId}`,
                        type: 'image',
                        x: (layer.left || 0) + centerOffsetX,
                        y: (layer.top || 0) + centerOffsetY,
                        width: layer.width,
                        height: layer.height,
                        angle: 0,
                        strokeColor: 'transparent',
                        backgroundColor: 'transparent',
                        fillStyle: 'solid',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roughness: 0,
                        opacity: layer.opacity ? Math.round(layer.opacity / 255 * 100) : 100,
                        fileId: fileId,
                        scale: [1, 1],
                        status: 'saved',
                        locked: false,
                        version: 1,
                        versionNonce: Math.floor(Math.random() * 1000000000),
                        isDeleted: false,
                        groupIds: [],
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                        customData: {
                            psdLayerIndex: layer.index,
                            psdLayerName: layer.name,
                            psdFileId: baseFileId,
                            templateId: result.template_id || null
                        }
                    }

                    newElements.push(imageElement)
                }

                // 批量添加所有文件到Excalidraw - 使用分批处理优化性能
                setOverlay(true, t('canvas:messages.templateLoading.addingLayers', { count: totalLayers }), 'loading')

                // 验证文件条目有效后再添加
                const validFileEntries = fileEntries.filter(entry => {
                    if (!entry || typeof entry !== 'object') {
                        console.error('Invalid file entry:', entry)
                        return false
                    }
                    if (!entry.id || typeof entry.id !== 'string') {
                        console.error('Invalid file entry id:', entry)
                        return false
                    }
                    if (!entry.dataURL || typeof entry.dataURL !== 'string') {
                        console.error('Invalid file entry dataURL:', entry)
                        return false
                    }
                    return true
                })

                if (validFileEntries.length > 0) {
                    // 使用分批处理，每批处理20个文件，避免一次性处理过多导致阻塞
                    const BATCH_SIZE = 20
                    const batches = []
                    for (let i = 0; i < validFileEntries.length; i += BATCH_SIZE) {
                        batches.push(validFileEntries.slice(i, i + BATCH_SIZE))
                    }

                    // 批量添加所有文件（一次性添加所有文件，性能更好）
                    try {
                        const allFileEntries = validFileEntries.map(entry => ({
                            id: entry.id,
                            dataURL: entry.dataURL,
                            mimeType: entry.mimeType || 'image/png',
                            created: entry.created || Date.now()
                        }))
                        excalidrawAPI.addFiles(allFileEntries)
                    } catch (error) {
                        console.error('Error adding files to Excalidraw:', error)
                        // 如果批量添加失败，尝试分批添加
                        console.log('Falling back to batch adding files')
                        for (const batch of batches) {
                            try {
                                excalidrawAPI.addFiles(batch.map(entry => ({
                                    id: entry.id,
                                    dataURL: entry.dataURL,
                                    mimeType: entry.mimeType || 'image/png',
                                    created: entry.created || Date.now()
                                })))
                                // 批次之间短暂延迟，避免阻塞
                                await new Promise(resolve => setTimeout(resolve, 10))
                            } catch (batchError) {
                                console.error('Error adding batch:', batchError)
                            }
                        }
                    }
                } else {
                    console.error('No valid file entries to add')
                    throw new Error('没有有效的图层数据')
                }

                // 更新画布 - 一次性添加所有元素（使用requestAnimationFrame优化）
                await new Promise(resolve => requestAnimationFrame(resolve))
                excalidrawAPI.updateScene({
                    elements: [...currentElements, ...newElements]
                })

                // 减少等待时间，使用requestAnimationFrame确保DOM更新
                await new Promise(resolve => requestAnimationFrame(resolve))

                // 自动聚焦到新添加的内容
                if (newElements.length > 0) {
                    try {
                        // 等待画布完全更新，获取实际添加的元素
                        const currentElementsAfterUpdate = excalidrawAPI.getSceneElements()
                        const addedElements = currentElementsAfterUpdate.filter(el =>
                            newElements.some(newEl => {
                                // 确保ID匹配且都是有效字符串
                                return el.id && newEl.id &&
                                    typeof el.id === 'string' &&
                                    typeof newEl.id === 'string' &&
                                    el.id === newEl.id
                            })
                        )

                        // 验证元素ID有效并过滤掉无效值
                        const validElements = addedElements.filter(el => {
                            const isValid = el &&
                                el.id != null &&
                                typeof el.id === 'string' &&
                                el.id.length > 0 &&
                                el.type === 'image' // 确保是图片元素
                            if (!isValid) {
                                console.warn('Invalid element found:', el)
                            }
                            return isValid
                        })

                        if (validElements.length > 0) {
                            // scrollToContent 接受单个元素ID（字符串）或undefined
                            // 使用第一个有效元素的ID，或者使用undefined聚焦到所有内容
                            const firstValidId = validElements[0].id

                            if (firstValidId && typeof firstValidId === 'string') {
                                excalidrawAPI.scrollToContent(firstValidId, {
                                    fitToContent: true,
                                    animate: true
                                })
                            } else {
                                // 如果ID无效，使用undefined聚焦到所有内容
                                excalidrawAPI.scrollToContent(undefined, {
                                    fitToContent: true,
                                    animate: true
                                })
                            }
                        } else {
                            // 如果没有有效元素，使用undefined来聚焦到所有内容
                            excalidrawAPI.scrollToContent(undefined, {
                                fitToContent: true,
                                animate: true
                            })
                        }
                    } catch (scrollError) {
                        // 如果scrollToContent失败，只记录错误但不影响主流程
                        console.warn('Error in scrollToContent, but elements were added successfully:', scrollError)
                        // 使用undefined作为fallback，这是最安全的方式
                        try {
                            excalidrawAPI.scrollToContent(undefined, {
                                fitToContent: true,
                                animate: true
                            })
                        } catch (fallbackError) {
                            // 如果连undefined都失败，就忽略这个错误，不影响主流程
                            console.warn('Fallback scrollToContent also failed, ignoring:', fallbackError)
                        }
                    }
                }

                // 关闭加载提示并显示成功消息
                setOverlay(true, t('canvas:messages.templateLoading.templateApplied', { name: template.display_name }), 'success')
                setTimeout(() => clearOverlay(), 2000)
            }

            // 重置状态
            setSelectedPsdTemplate(null)
        } catch (err) {
            console.error('加载PSD模板失败:', err)
            const errorMessage = err instanceof Error ? err.message : '加载PSD模板失败'
            setOverlay(true, errorMessage, 'error')
            setTimeout(() => clearOverlay(), 3000)
            setSelectedPsdTemplate(null)
        } finally {
            setLoadingPsd(false)
        }
    }

    // // 获取画布中图层的实时状态
    // const getLayerCanvasState = useCallback((layerIndex: number) => {
    //     const canvasElement = canvasElements.find(element =>
    //         element.customData?.psdLayerIndex === layerIndex
    //     )

    //     if (!canvasElement) {
    //         return {
    //             exists: false,
    //             visible: false,
    //             opacity: 100,
    //             element: null
    //         }
    //     }

    //     // 检查可见性：主要基于opacity，同时检查customData中的visible状态
    //     const opacityVisible = canvasElement.opacity > 0
    //     const customDataVisible = canvasElement.customData?.visible !== false
    //     const isVisible = opacityVisible && customDataVisible

    //     return {
    //         exists: true,
    //         visible: isVisible,
    //         opacity: canvasElement.opacity || 100,
    //         element: canvasElement
    //     }
    // }, [canvasElements])

    // // 保存图层为模板
    // const handleSaveLayerAsTemplate = useCallback(async (layer: PSDLayer) => {
    //     try {
    //         const templateData = {
    //             name: `${layer.name} - 模板`,
    //             description: `从PSD图层 "${layer.name}" 创建的模板`,
    //             category_id: 'default', // 默认分类，实际应用中应该让用户选择
    //             tags: ['psd', 'layer', layer.type],
    //             is_public: false,
    //         }

    //         await createTemplateFromPSDLayer(psdData!.file_id, layer.index, templateData)
    //         toast.success(`图层 "${layer.name}" 已保存为模板`)
    //     } catch (error) {
    //         console.error('保存模板失败:', error)
    //         toast.error('保存模板失败')
    //     }
    // }, [psdData])

    // // 获取图层图标
    // const getLayerIcon = (layer: PSDLayer) => {
    //     switch (layer.type) {
    //         case 'text':
    //             return <Type className="h-4 w-4 text-blue-500" />
    //         case 'group':
    //             return <FolderOpen className="h-4 w-4 text-yellow-500" />
    //         default:
    //             return <ImageIcon className="h-4 w-4 text-green-500" />
    //     }
    // }


    // console.log('PSDLayerSidebar 渲染狀態:', { isVisible, psdData: !!psdData, layersCount: psdData?.layers?.length })

    // 如果没有 PSD 数据，显示空状态（但仍然渲染面板结构）
    const hasData = psdData && psdData.layers && psdData.layers.length > 0

    // 从画布元素构建图层列表数据（按类别分组）
    const canvasLayerList = useMemo(() => {
        if (!excalidrawAPI || uiTopTab !== 'layers') return {
            all: [],
            text: [],
            layer: [],
            group: []
        }

        // 获取所有画布元素
        const elements = excalidrawAPI.getSceneElements()

        // 过滤出所有有效的图层元素（不仅仅是PSD相关的，包括所有图像、文本等元素）
        const allElements = elements.filter(element => {
            if (element.isDeleted) return false
            // 包含所有有效的元素类型：图像、文本、以及其他有内容的元素
            return element.type === 'image' ||
                element.type === 'text' ||
                element.customData?.psdFileId ||
                element.customData?.psdLayerIndex !== undefined ||
                element.customData?.psdLayerName ||
                element.customData?.templateId ||
                element.customData?.libraryImage
        })

        // 构建图层数据 - 使用图层索引作为key（而不是元素ID），以便合并同一图层的多个表示
        const layerMap = new Map<number | string, any>()

        // 第一步：处理画布中的元素
        allElements.forEach((element, elementIndex) => {
            const layerIndex = element.customData?.psdLayerIndex

            // 如果元素有 psdLayerIndex，尝试从 psdData 获取完整信息
            let layerData: any = null
            if (layerIndex !== undefined && psdData) {
                layerData = psdData.layers.find(l => l.index === layerIndex)
            }

            // 确定图层类型 - 优先使用PSD数据中的类型（更准确）
            let layerType: 'text' | 'layer' | 'group' = 'layer'
            if (layerData && layerData.type) {
                // 优先使用PSD数据中的类型
                layerType = layerData.type
            } else if (element.type === 'text') {
                layerType = 'text'
            } else if (element.type === 'image') {
                layerType = 'layer'
            } else {
                layerType = 'layer'
            }

            // 获取图层名称：优先使用PSD图层名
            let layerName = layerData?.name ||
                element.customData?.psdLayerName ||
                element.customData?.layerName ||
                element.customData?.imageName ||
                (element.type === 'text' ? (element as any).text?.substring(0, 20) || '文字图层' : null) ||
                `图层 ${elementIndex + 1}`

            if (!layerName || layerName === 'undefined') {
                layerName = element.id ? `元素 ${element.id.substring(0, 8)}` : `图层 ${elementIndex + 1}`
            }

            // 获取缩略图 URL
            let thumbnailUrl: string | null = null
            let textPreview: string | null = null

            if (layerType === 'layer' || element.type === 'image') {
                // 图像图层：优先使用 PSD 的 image_url，否则尝试从 Excalidraw 获取
                if (layerData?.image_url) {
                    thumbnailUrl = layerData.image_url
                } else if (element.type === 'image') {
                    if (element.fileId) {
                        try {
                            const files = (excalidrawAPI as any).getFiles()
                            const file = files?.[element.fileId]
                            if (file?.dataURL) {
                                thumbnailUrl = file.dataURL
                            }
                        } catch (e) {
                            console.warn('获取文件缩略图失败:', e)
                        }
                    }
                    if (!thumbnailUrl && element.customData?.imageUrl) {
                        thumbnailUrl = element.customData.imageUrl
                    }
                }
            } else if (layerType === 'text') {
                // 文字图层：获取文字内容预览
                const textContent = layerData?.text_content || (element as any).text || layerData?.name || layerName
                textPreview = textContent?.substring(0, 20) || '文字'
            }

            // 构建图层项
            const layerItem = {
                index: layerIndex ?? elementIndex,
                name: layerName,
                type: layerType,
                visible: layerData?.visible ?? (element.opacity > 0 && !element.isDeleted),
                opacity: layerData?.opacity ? Math.round(layerData.opacity / 255 * 100) : Math.round(element.opacity || 100),
                elementId: element.id,
                element: element,
                psdLayerData: layerData,
                thumbnailUrl: thumbnailUrl,
                textPreview: textPreview
            }

            // 使用图层索引作为key（如果PSD图层），否则使用元素ID
            const key = layerIndex !== undefined ? layerIndex : element.id || `element-${elementIndex}`
            if (!layerMap.has(key)) {
                layerMap.set(key, layerItem)
            } else if (layerData) {
                // 如果已有数据但新数据有完整的PSD信息，则更新
                const existing = layerMap.get(key)
                if (!existing.psdLayerData || existing.type !== layerData.type) {
                    layerMap.set(key, { ...layerItem, psdLayerData: layerData })
                }
            }
        })

        // 第二步：添加PSD数据中存在但画布中没有对应元素的图层（特别是文字和群组）
        if (psdData && psdData.layers) {
            psdData.layers.forEach((psdLayer: any) => {
                // 只处理文字和群组图层（图像图层应该已经在画布中有对应元素）
                if (psdLayer.type === 'text' || psdLayer.type === 'group') {
                    const key = psdLayer.index

                    // 如果这个图层还没有被添加，或者现有条目的类型不正确，添加它
                    if (!layerMap.has(key)) {
                        const layerItem = {
                            index: psdLayer.index,
                            name: psdLayer.name || `图层 ${psdLayer.index}`,
                            type: psdLayer.type,
                            visible: psdLayer.visible !== false,
                            opacity: psdLayer.opacity ? Math.round(psdLayer.opacity / 255 * 100) : 100,
                            elementId: null,
                            element: null,
                            psdLayerData: psdLayer,
                            thumbnailUrl: psdLayer.type === 'text' ? null : (psdLayer.image_url || null),
                            textPreview: psdLayer.type === 'text' ? (psdLayer.text_content?.substring(0, 20) || '文字') : null
                        }
                        layerMap.set(key, layerItem)
                    } else {
                        // 如果已存在但类型不对，更新类型
                        const existing = layerMap.get(key)
                        if (existing.type !== psdLayer.type && psdLayer.type) {
                            existing.type = psdLayer.type
                            existing.psdLayerData = psdLayer
                            if (psdLayer.type === 'text') {
                                existing.textPreview = psdLayer.text_content?.substring(0, 20) || '文字'
                                existing.thumbnailUrl = null
                            }
                            layerMap.set(key, existing)
                        }
                    }
                }
            })
        }

        // 转换为数组并按类型分组
        const layers = Array.from(layerMap.values())

        // 调试信息：在开发环境中输出统计
        if (process.env.NODE_ENV === 'development') {
            const psdStats = psdData ? {
                PSD总图层数: psdData.layers.length,
                PSD图像图层: psdData.layers.filter((l: any) => l.type === 'layer').length,
                PSD文字图层: psdData.layers.filter((l: any) => l.type === 'text').length,
                PSD群组图层: psdData.layers.filter((l: any) => l.type === 'group').length
            } : {}

            // console.log('📊 图层列表统计:', {
            //     总画布元素: elements.length,
            //     有效元素: allElements.length,
            //     最终图层数: layers.length,
            //     图像图层: layers.filter(l => l.type === 'layer').length,
            //     文字图层: layers.filter(l => l.type === 'text').length,
            //     群组图层: layers.filter(l => l.type === 'group').length,
            //     ...psdStats
            // })
        }

        // 按类型分组
        const grouped = {
            text: layers.filter(l => l.type === 'text'),
            layer: layers.filter(l => l.type === 'layer'),
            group: layers.filter(l => l.type === 'group')
        }

        // 应用搜索过滤
        const filterLayers = (layers: any[]): any[] => {
            return layers.filter((layer: any) => {
                const matchesSearch = layer.name.toLowerCase().includes(searchTerm.toLowerCase())
                const matchesFilter = filterType === 'all' || layer.type === filterType
                return matchesSearch && matchesFilter
            })
        }

        return {
            all: filterLayers(layers),
            text: filterLayers(grouped.text),
            layer: filterLayers(grouped.layer),
            group: filterLayers(grouped.group)
        }
    }, [excalidrawAPI, canvasElements, lastUpdateTime, uiTopTab, searchTerm, filterType, psdData])

    // 仅参照布局UI：顶部两类（Layers/Assets）+ 对应内容
    return (
        <div
            className="text-foreground h-full w-full flex flex-col overflow-hidden"
        >
            {/* 顶部两个类型（统一指示条与选中态）- 苹果风格优化 */}
            <div 
                className="relative grid grid-cols-2 border-b" 
                style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(16px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                    borderColor: 'rgba(0, 0, 0, 0.08)',
                    borderTopLeftRadius: '20px',
                    borderTopRightRadius: '20px',
                    paddingTop: '8px',
                }}
            >
                {(['layers', 'assets'] as const).map(top => {
                    const isActive = uiTopTab === top
                    return (
                        <div key={top} className="flex items-center justify-center py-3">
                            <button
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 relative ${
                                    isActive
                                        ? 'font-semibold text-foreground scale-105'
                                        : 'opacity-70 hover:opacity-100 hover:bg-white/30 dark:hover:bg-white/10 text-foreground/70'
                                }`}
                                onClick={() => setUiTopTab(top)}
                                style={{
                                    background: isActive 
                                        ? (document.documentElement.classList.contains('dark') 
                                            ? 'rgba(255, 255, 255, 0.1)' 
                                            : 'rgba(255, 255, 255, 0.5)')
                                        : 'transparent',
                                }}
                            >
                                {top === 'layers' ? (
                                    <Layers className={`h-4 w-4 transition-all ${isActive ? 'text-foreground scale-110' : 'text-foreground/70'}`} />
                                ) : (
                                    <span className={`inline-block transition-all ${isActive ? 'text-foreground scale-110' : 'text-foreground/70'}`}>
                                        <svg className="icon w-4 h-4" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M137.216 512c0 16.865882 24.696471 46.260706 81.92 75.053176 74.089412 37.345882 179.2 59.632941 292.864 59.632942s218.774588-22.287059 292.864-59.632942c57.223529-28.792471 81.92-58.187294 81.92-75.053176V395.023059C798.479059 449.957647 663.311059 485.074824 512 485.074824c-151.371294 0-286.479059-35.177412-374.784-90.051765V512z m749.568 152.455529c-88.304941 54.994824-223.472941 90.051765-374.784 90.051765-151.371294 0-286.479059-35.117176-374.784-90.051765v117.037177c0 16.865882 24.696471 46.200471 81.92 75.053176 74.089412 37.345882 179.2 59.632941 292.864 59.632942s218.774588-22.287059 292.864-59.632942c57.223529-28.852706 81.92-58.187294 81.92-75.053176V664.395294zM30.117647 781.492706V242.507294C30.117647 108.604235 245.880471 0 512 0s481.882353 108.604235 481.882353 242.507294v538.985412C993.882353 915.395765 778.119529 1024 512 1024s-481.882353-108.604235-481.882353-242.507294z m481.882353-404.178824c113.664 0 218.774588-22.407529 292.864-59.693176 57.223529-28.852706 81.92-58.247529 81.92-75.113412 0-16.865882-24.696471-46.200471-81.92-75.053176-74.089412-37.345882-179.2-59.632941-292.864-59.632942s-218.774588 22.287059-292.864 59.632942c-57.223529 28.852706-81.92 58.187294-81.92 75.053176s24.696471 46.260706 81.92 75.113412c74.089412 37.285647 179.2 59.632941 292.864 59.632941z" fill="currentColor" />
                                        </svg>
                                    </span>
                                )}
                                <span className="text-sm font-medium">{top === 'layers' ? t('sidebar.layers') : t('sidebar.assets')}</span>
                            </button>
                        </div>
                    )
                })}
                {/* 顶部滑动下划线 - 苹果风格优化 */}
                <div
                    className="absolute bottom-0 left-0 h-[3px] w-1/2 transition-transform duration-300 ease-out rounded-full"
                    style={{
                        transform: uiTopTab === 'layers' ? 'translateX(0%)' : 'translateX(100%)',
                        background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%)',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                    }}
                />
            </div>

            {/* 主体内容 */}
            {uiTopTab === 'layers' ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-border space-y-3 bg-card/50 backdrop-blur-sm">
                        <Input
                            placeholder={t('sidebar.search_layers')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-9 text-xs bg-white/60 dark:bg-white/10 border-white/40 dark:border-white/10 backdrop-blur-sm focus:bg-white/80 dark:focus:bg-white/20 focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all duration-200 rounded-lg text-foreground placeholder:text-muted-foreground"
                            style={{
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                            }}
                        />
                        <div className="flex gap-1.5 justify-center">
                            <button
                                className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 font-medium ${filterType === 'all'
                                    ? 'bg-primary text-primary-foreground shadow-md scale-105'
                                    : 'bg-white/50 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 backdrop-blur-sm text-foreground/70 hover:text-foreground border border-white/40 dark:border-white/10 hover:scale-105'
                                    }`}
                                onClick={() => setFilterType('all')}
                            >
                                {t('sidebar.all')}
                            </button>
                            <button
                                className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 font-medium ${filterType === 'text'
                                    ? 'bg-primary text-primary-foreground shadow-md scale-105'
                                    : 'bg-white/50 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 backdrop-blur-sm text-foreground/70 hover:text-foreground border border-white/40 dark:border-white/10 hover:scale-105'
                                    }`}
                                onClick={() => setFilterType('text')}
                            >
                                {t('sidebar.text')}
                            </button>
                            <button
                                className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 font-medium ${filterType === 'layer'
                                    ? 'bg-primary text-primary-foreground shadow-md scale-105'
                                    : 'bg-white/50 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 backdrop-blur-sm text-foreground/70 hover:text-foreground border border-white/40 dark:border-white/10 hover:scale-105'
                                    }`}
                                onClick={() => setFilterType('layer')}
                            >
                                {t('sidebar.image')}
                            </button>
                            <button
                                className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 font-medium ${filterType === 'group'
                                    ? 'bg-primary text-primary-foreground shadow-md scale-105'
                                    : 'bg-white/50 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 backdrop-blur-sm text-foreground/70 hover:text-foreground border border-white/40 dark:border-white/10 hover:scale-105'
                                    }`}
                                onClick={() => setFilterType('group')}
                            >
                                {t('sidebar.group')}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-3 space-y-2">
                        {canvasLayerList.all.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">{t('sidebar.no_layers_in_canvas')}</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">{t('sidebar.upload_psd_or_add_layers')}</p>
                            </div>
                        ) : (
                            <>
                                {/* 按类别显示图层 */}
                                {filterType === 'all' && (
                                    <>
                                        {/* 文字图层 */}
                                        {canvasLayerList.text.length > 0 && (
                                            <div className="mb-4">
                                                <div className="flex items-center gap-2 mb-2 px-2">
                                                    <Type className="h-3 w-3 text-blue-500" />
                                                    <span className="text-xs font-semibold text-foreground">{t('sidebar.text_layers')} ({canvasLayerList.text.length})</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {canvasLayerList.text.map((layer) => (
                                                        <div
                                                            key={layer.elementId || `text-${layer.index}`}
                                                            className="flex items-center justify-between px-3 py-2 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer gap-2"
                                                            onClick={() => {
                                                                if (excalidrawAPI) {
                                                                    if (layer.elementId) {
                                                                        try {
                                                                            excalidrawAPI.scrollToContent(layer.elementId, {
                                                                                fitToContent: true,
                                                                                animate: true
                                                                            })
                                                                        } catch (e) {
                                                                            console.warn('Failed to scroll to element:', e)
                                                                        }
                                                                    } else if (layer.psdLayerData) {
                                                                        // 如果没有画布元素，使用PSD图层位置信息滚动
                                                                        try {
                                                                            const psdLayer = layer.psdLayerData
                                                                            const appState = excalidrawAPI.getAppState()
                                                                            const centerX = psdLayer.left + (psdLayer.width || 0) / 2
                                                                            const centerY = psdLayer.top + (psdLayer.height || 0) / 2
                                                                            excalidrawAPI.scrollToContent(undefined, {
                                                                                fitToContent: false,
                                                                                animate: true
                                                                            })
                                                                        } catch (e) {
                                                                            console.warn('Failed to scroll to PSD layer position:', e)
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            {/* 文字预览缩略图 */}
                                                            <div className="w-12 h-12 flex-shrink-0 rounded border bg-gradient-to-br from-blue-900/40 to-blue-800/40 flex items-center justify-center overflow-hidden">
                                                                {layer.textPreview ? (
                                                                    <span className="text-[10px] text-blue-700 font-medium text-center px-1 leading-tight">
                                                                        {layer.textPreview}
                                                                    </span>
                                                                ) : (
                                                                    <Type className="h-5 w-5 text-blue-400" />
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                <Type className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                                                <span className="truncate text-sm">{layer.name}</span>
                                                                <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                                                                    {Math.round(layer.opacity)}%
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                {layer.visible ? (
                                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                                ) : (
                                                                    <EyeOff className="h-4 w-4 text-muted-foreground/60" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 图像图层 */}
                                        {canvasLayerList.layer.length > 0 && (
                                            <div className="mb-4">
                                                <div className="flex items-center gap-2 mb-2 px-2">
                                                    <ImageIcon className="h-3 w-3 text-green-500" />
                                                    <span className="text-xs font-semibold text-foreground">{t('sidebar.image_layers')} ({canvasLayerList.layer.length})</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {canvasLayerList.layer.map((layer) => (
                                                        <div
                                                            key={layer.elementId || `layer-${layer.index}`}
                                                            className="flex items-center justify-between px-3 py-2 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer gap-2"
                                                            onClick={() => {
                                                                if (excalidrawAPI) {
                                                                    if (layer.elementId) {
                                                                        try {
                                                                            excalidrawAPI.scrollToContent(layer.elementId, {
                                                                                fitToContent: true,
                                                                                animate: true
                                                                            })
                                                                        } catch (e) {
                                                                            console.warn('Failed to scroll to element:', e)
                                                                        }
                                                                    } else if (layer.psdLayerData) {
                                                                        // 如果没有画布元素，使用PSD图层位置信息滚动
                                                                        try {
                                                                            const psdLayer = layer.psdLayerData
                                                                            excalidrawAPI.scrollToContent(undefined, {
                                                                                fitToContent: true,
                                                                                animate: true
                                                                            })
                                                                        } catch (e) {
                                                                            console.warn('Failed to scroll to PSD layer position:', e)
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            {/* 图像缩略图 */}
                                                            <div className="w-12 h-12 flex-shrink-0 rounded border border-border bg-muted/40 overflow-hidden relative">
                                                                {layer.thumbnailUrl ? (
                                                                    <img
                                                                        src={layer.thumbnailUrl}
                                                                        alt={layer.name}
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            // 如果图片加载失败，显示占位符
                                                                            const target = e.target as HTMLImageElement
                                                                            target.style.display = 'none'
                                                                            if (target.parentElement) {
                                                                                target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>'
                                                                            }
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                <ImageIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                                <span className="truncate text-sm">{layer.name}</span>
                                                                <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                                                                    {Math.round(layer.opacity)}%
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                {layer.visible ? (
                                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                                ) : (
                                                                    <EyeOff className="h-4 w-4 text-muted-foreground/60" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 群组图层 */}
                                        {canvasLayerList.group.length > 0 && (
                                            <div className="mb-4">
                                                <div className="flex items-center gap-2 mb-2 px-2">
                                                    <FolderOpen className="h-3 w-3 text-yellow-500" />
                                                    <span className="text-xs font-semibold text-foreground">{t('sidebar.group_layers')} ({canvasLayerList.group.length})</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {canvasLayerList.group.map((layer) => (
                                                        <div
                                                            key={layer.elementId || `group-${layer.index}`}
                                                            className="flex items-center justify-between px-3 py-2 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer gap-2"
                                                            onClick={() => {
                                                                if (excalidrawAPI) {
                                                                    if (layer.elementId) {
                                                                        try {
                                                                            excalidrawAPI.scrollToContent(layer.elementId, {
                                                                                fitToContent: true,
                                                                                animate: true
                                                                            })
                                                                        } catch (e) {
                                                                            console.warn('Failed to scroll to element:', e)
                                                                        }
                                                                    } else if (layer.psdLayerData) {
                                                                        // 如果没有画布元素，使用PSD图层位置信息滚动
                                                                        try {
                                                                            excalidrawAPI.scrollToContent(undefined, {
                                                                                fitToContent: true,
                                                                                animate: true
                                                                            })
                                                                        } catch (e) {
                                                                            console.warn('Failed to scroll to PSD layer position:', e)
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            {/* 群组预览缩略图 */}
                                                            <div className="w-12 h-12 flex-shrink-0 rounded border bg-gradient-to-br from-yellow-900/40 to-yellow-800/40 flex items-center justify-center overflow-hidden">
                                                                <FolderOpen className="h-6 w-6 text-yellow-500" />
                                                            </div>
                                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                <FolderOpen className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                                                <span className="truncate text-sm">{layer.name}</span>
                                                                <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                                                                    {Math.round(layer.opacity)}%
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                {layer.visible ? (
                                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                                ) : (
                                                                    <EyeOff className="h-4 w-4 text-muted-foreground/60" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* 按过滤类型显示 */}
                                {filterType !== 'all' && (
                                    <div className="space-y-1">
                                        {canvasLayerList.all.map((layer) => (
                                            <div
                                                key={layer.elementId || `${layer.type}-${layer.index}`}
                                                className="flex items-center justify-between px-3 py-2 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer gap-2"
                                                onClick={() => {
                                                    if (excalidrawAPI) {
                                                        if (layer.elementId) {
                                                            try {
                                                                excalidrawAPI.scrollToContent(layer.elementId, {
                                                                    fitToContent: true,
                                                                    animate: true
                                                                })
                                                            } catch (e) {
                                                                console.warn('Failed to scroll to element:', e)
                                                            }
                                                        } else if (layer.psdLayerData) {
                                                            // 如果没有画布元素，使用PSD图层位置信息滚动
                                                            try {
                                                                excalidrawAPI.scrollToContent(undefined, {
                                                                    fitToContent: true,
                                                                    animate: true
                                                                })
                                                            } catch (e) {
                                                                console.warn('Failed to scroll to PSD layer position:', e)
                                                            }
                                                        }
                                                    }
                                                }}
                                            >
                                                {/* 缩略图 - 根据类型显示不同的预览 */}
                                                {layer.type === 'layer' ? (
                                                    <div className="w-12 h-12 flex-shrink-0 rounded border border-border bg-muted/40 overflow-hidden relative">
                                                        {layer.thumbnailUrl ? (
                                                            <img
                                                                src={layer.thumbnailUrl}
                                                                alt={layer.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement
                                                                    target.style.display = 'none'
                                                                    if (target.parentElement) {
                                                                        target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>'
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <ImageIcon className="h-6 w-6 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : layer.type === 'text' ? (
                                                    <div className="w-12 h-12 flex-shrink-0 rounded border bg-gradient-to-br from-blue-900/40 to-blue-800/40 flex items-center justify-center overflow-hidden">
                                                        {layer.textPreview ? (
                                                            <span className="text-[10px] text-blue-700 font-medium text-center px-1 leading-tight">
                                                                {layer.textPreview}
                                                            </span>
                                                        ) : (
                                                            <Type className="h-5 w-5 text-blue-400" />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 flex-shrink-0 rounded border bg-gradient-to-br from-yellow-900/40 to-yellow-800/40 flex items-center justify-center overflow-hidden">
                                                        <FolderOpen className="h-6 w-6 text-yellow-500" />
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    {layer.type === 'group' ? (
                                                        <FolderOpen className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                                    ) : layer.type === 'text' ? (
                                                        <Type className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                                    ) : (
                                                        <ImageIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                                                    )}
                                                    <span className="truncate text-sm">{layer.name}</span>
                                                    <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                                                        {Math.round(layer.opacity)}%
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {layer.visible ? (
                                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <EyeOff className="h-4 w-4 text-muted-foreground/60" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* 资产子级 Tabs */}
                    <div className="px-3 pt-3">
                        <div className="flex items-center">
                            {(['templates', 'library', 'fonts'] as const).map(tab => (
                                <div key={tab} className="flex-1 text-center">
                                    <button
                                        className={`py-2 w-full text-xs transition-all duration-200 font-medium ${assetSubTab === tab ? 'font-semibold' : 'opacity-70 hover:opacity-100'}`}
                                        onClick={() => setAssetSubTab(tab)}
                                    >
                                        {tab === 'templates' ? t('sidebar.templates') : tab === 'library' ? t('sidebar.library') : t('sidebar.fonts')}
                                    </button>
                                    <div className={`${assetSubTab === tab ? 'bg-foreground' : 'bg-transparent'} h-0.5 w-10 mx-auto rounded transition-colors duration-200`}></div>
                                </div>
                            ))}
                        </div>
                        {/*<div className="h-0.5 w-full bg-muted-foreground/20 mt-1" />*/}
                    </div>
                    {/* 来源切换：仅在 Library 下显示 */}
                    {assetSubTab === 'library' && (
                        <div className="px-3 py-3 grid grid-cols-2 gap-2">
                            <div className="text-center">
                                <button className={`py-2 w-full rounded-md border text-xs transition-all duration-200 font-medium ${assetSource === 'platform' ? 'font-semibold shadow-sm' : 'opacity-80 hover:opacity-100'}`} onClick={() => setAssetSource('platform')}>{t('sidebar.platform')}</button>
                                <div className={`${assetSource === 'platform' ? 'bg-foreground' : 'bg-transparent'} h-0.5 w-10 mx-auto rounded mt-1 transition-colors`}></div>
                            </div>
                            <div className="text-center">
                                <button className={`py-2 w-full rounded-md border text-xs transition-all duration-200 font-medium ${assetSource === 'uploads' ? 'font-semibold shadow-sm' : 'opacity-80 hover:opacity-100'}`} onClick={() => setAssetSource('uploads')}>{t('sidebar.my_uploads')}</button>
                                <div className={`${assetSource === 'uploads' ? 'bg-foreground' : 'bg-transparent'} h-0.5 w-10 mx-auto rounded mt-1 transition-colors`}></div>
                            </div>
                        </div>
                    )}
                    {/* 内容区：根据 Templates / Library / Fonts 显示不同结构 */}
                    {assetSubTab === 'templates' && (
                        <div className="grid grid-cols-2 gap-3 p-3 overflow-auto">
                            {/* 加载状态 */}
                            {loading && (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="aspect-[4/3] rounded-xl border bg-gray-50/60 animate-pulse flex flex-col items-center justify-center">
                                        <div className="w-10 h-10 rounded-lg bg-gray-200 mb-2"></div>
                                        <div className="w-20 h-3 bg-gray-200 rounded"></div>
                                    </div>
                                ))
                            )}

                            {/* 错误状态 */}
                            {error && (
                                <div className="col-span-2 text-center py-8 text-red-500">
                                    {error}
                                    <button
                                        className="mt-2 text-sm text-primary hover:underline block mx-auto"
                                        onClick={() => {
                                            setError(null)
                                            setPsdTemplates([])
                                        }}
                                    >
                                        {t('sidebar.retry')}
                                    </button>
                                </div>
                            )}

                            {/* 模板列表 - 网格布局显示预览图 */}
                            {!loading && !error && psdTemplates.length > 0 && (
                                psdTemplates.map((template, idx) => {
                                    const isCurrentLoading = loadingPsd && selectedPsdTemplate === template.name
                                    return (
                                        <button
                                            key={idx}
                                            className={`relative aspect-[4/3] rounded-xl border transition-all shadow-sm overflow-hidden group ${isCurrentLoading
                                                ? 'bg-purple-50 border-purple-200 hover:bg-purple-100 cursor-wait animate-pulse'
                                                : template.is_parsed
                                                    ? 'bg-white hover:bg-gray-50 hover:shadow-md cursor-pointer border-gray-200'
                                                    : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 hover:shadow-md cursor-pointer'
                                                }`}
                                            onClick={() => handlePsdTemplateClick(template)}
                                            disabled={loadingPsd}
                                        >
                                            {/* 预览图 */}
                                            <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                                                {isCurrentLoading ? (
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                                                        <span className="text-xs text-purple-600">{t('sidebar.loading')}</span>
                                                    </div>
                                                ) : template.thumbnail_url && !thumbnailLoadErrors.has(template.name) ? (
                                                    <>
                                                        <img
                                                            src={template.thumbnail_url}
                                                            alt={template.display_name}
                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                            onError={() => {
                                                                // 记录图片加载失败
                                                                setThumbnailLoadErrors(prev => new Set(prev).add(template.name))
                                                            }}
                                                        />
                                                        {/* 渐变遮罩 - 用于文字可读性 */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                                        <svg className={`w-12 h-12 mb-2 ${template.is_parsed ? 'text-purple-400' : 'text-yellow-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="text-xs">{t('templates.no_preview')}</span>
                                                    </div>
                                                )}

                                                {/* 状态标签 - 显示在右上角 */}
                                                {!template.is_parsed && (
                                                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm">
                                                        {t('templates.needs_parsing')}
                                                    </div>
                                                )}

                                                {isCurrentLoading && (
                                                    <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        {t('sidebar.loading')}
                                                    </div>
                                                )}

                                                {template.is_parsed && !isCurrentLoading && (
                                                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                                                        <span>⚡</span>
                                                        {t('templates.parsed')}
                                                    </div>
                                                )}
                                            </div>

                                            {/* 模板信息 - 显示在底部 */}
                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white">
                                                <div className="text-xs font-medium truncate mb-0.5">
                                                    {template.display_name}
                                                </div>
                                                <div className="text-[10px] opacity-90 flex items-center gap-2">
                                                    {template.is_parsed ? (
                                                        <>
                                                            <span>{template.layers_count} {t('templates.layers')}</span>
                                                            <span>•</span>
                                                            <span>{template.width}×{template.height}</span>
                                                        </>
                                                    ) : (
                                                        <span>{t('templates.click_to_parse')}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })
                            )}

                            {!loading && !error && psdTemplates.length === 0 && (
                                <div className="col-span-2 text-center py-12 text-gray-500">
                                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm">{t('templates.no_templates')}</p>
                                <p className="text-xs text-gray-400 mt-1">{t('templates.template_files_should_be_in_template_folder')}</p>
                                </div>
                            )}
                        </div>
                    )}
                    {assetSubTab === 'library' && (
                        <div className="grid grid-cols-3 gap-3 p-3 overflow-auto">
                            {/* 加载状态 */}
                            {loading && (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="aspect-square rounded-xl border bg-gray-50/60 animate-pulse flex items-center justify-center">
                                        <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                                    </div>
                                ))
                            )}

                            {/* 错误状态 */}
                            {error && (
                                <div className="col-span-3 text-center py-8 text-red-500">
                                    {error}
                                    <button
                                            className="mt-2 text-sm text-primary hover:underline"
                                            onClick={() => {
                                                setError(null)
                                                setPlatformImages([])
                                            }}
                                        >
                                            {t('sidebar.retry')}
                                        </button>
                                </div>
                            )}

                            {/* 根据选择的来源显示不同的图片 */}
                            {!loading && !error && (
                                <>
                                    {/* 仅在My Uploads标签下显示上传按钮 */}
                                    {assetSource === 'uploads' && (
                                        <div className="col-span-3 mb-3">
                                            <button
                                                onClick={() => document.getElementById('image-upload')?.click()}
                                                className="w-full py-2.5 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2.5 group relative overflow-hidden"
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.6)',
                                                    backdropFilter: 'blur(12px) saturate(150%)',
                                                    WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                                                    border: '1.5px dashed rgba(156, 163, 175, 0.4)',
                                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)'
                                                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'
                                                    e.currentTarget.style.transform = 'translateY(-1px)'
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.12)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)'
                                                    e.currentTarget.style.borderColor = 'rgba(156, 163, 175, 0.4)'
                                                    e.currentTarget.style.transform = 'translateY(0)'
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)'
                                                }}
                                            >
                                                <Upload className="h-4 w-4 text-gray-600 group-hover:text-indigo-600 transition-colors duration-300 flex-shrink-0" />
                                                <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700 transition-colors">
                                                    {t('image_library.upload_image')}
                                                </span>
                                            </button>
                                            <input
                                                id="image-upload"
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={handleImageUpload}
                                                aria-label="上传图片"
                                            />
                                        </div>
                                    )}

                                    {assetSource === 'platform' ? (
                                        platformImages.length > 0 ? (
                                            platformImages.map((imageName, i) => (
                                                <div key={i} className="aspect-square rounded-xl border bg-gray-50/60 hover:bg-gray-100/80 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer">
                                                    <img
                                                        src={`/assets/${imageName}`}
                                                        alt={`Platform image ${i + 1}`}
                                                        className="w-full h-full object-cover transition-opacity duration-200 hover:opacity-80"
                                                        // onClick={() => handleImageClick({ name: imageName })}
                                                        draggable
                                                        onDragStart={(e) => {
                                                            try {
                                                                console.log('🎯 开始拖拽平台图片:', imageName)
                                                                const dragData = {
                                                                    type: 'library-image',
                                                                    image: {
                                                                        id: `platform-${i}`,
                                                                        name: imageName,
                                                                        url: `/assets/${imageName}`
                                                                    }
                                                                };
                                                                e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                                                                e.dataTransfer.effectAllowed = 'copy';

                                                                // 设置拖拽时的视觉效果
                                                                const dragImage = e.currentTarget.cloneNode(true) as HTMLImageElement;
                                                                dragImage.style.width = '80px';
                                                                dragImage.style.height = '80px';
                                                                dragImage.style.opacity = '0.7';
                                                                document.body.appendChild(dragImage);
                                                                e.dataTransfer.setDragImage(dragImage, 40, 40);
                                                                setTimeout(() => document.body.removeChild(dragImage), 0);

                                                                // 拖拽提示已移除，避免干扰
                                                            } catch (error) {
                                                                console.error('Failed to set drag data:', error);
                                                            }
                                                        }}
                                                        onDragEnd={() => {
                                                            console.log('🏁 拖拽结束');
                                                        }}
                                                    />
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-3 text-center py-8 text-gray-500">
                                                {t('image_library.no_platform_images')}
                                            </div>
                                        )
                                    ) : (
                                        userUploadedImages.length > 0 ? (
                                            userUploadedImages.map((image) => {
                                                return (
                                                    <div 
                                                        key={image.id} 
                                                        className="aspect-square rounded-2xl overflow-hidden cursor-pointer relative group"
                                                        style={{
                                                            background: 'rgba(255, 255, 255, 0.5)',
                                                            backdropFilter: 'blur(10px) saturate(150%)',
                                                            WebkitBackdropFilter: 'blur(10px) saturate(150%)',
                                                            border: '1px solid rgba(255, 255, 255, 0.3)',
                                                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
                                                            e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.15)'
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = 'translateY(0) scale(1)'
                                                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)'
                                                        }}
                                                    >
                                                        <div className="relative w-full h-full">
                                                            <img
                                                                src={image.url}
                                                                alt={`My uploaded image: ${image.name}`}
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                                draggable
                                                                onDragStart={(e) => {
                                                                    try {
                                                                        console.log('🎯 开始拖拽上传图片:', image.name)
                                                                        const dragData = {
                                                                            type: 'library-image',
                                                                            image: {
                                                                                id: image.id,
                                                                                name: image.name,
                                                                                url: image.url
                                                                            }
                                                                        };
                                                                        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                                                                        e.dataTransfer.effectAllowed = 'copy';

                                                                        const dragImage = e.currentTarget.cloneNode(true) as HTMLImageElement;
                                                                        dragImage.style.width = '80px';
                                                                        dragImage.style.height = '80px';
                                                                        dragImage.style.opacity = '0.7';
                                                                        document.body.appendChild(dragImage);
                                                                        e.dataTransfer.setDragImage(dragImage, 40, 40);
                                                                        setTimeout(() => document.body.removeChild(dragImage), 0);
                                                                    } catch (error) {
                                                                        console.error('Failed to set drag data:', error);
                                                                    }
                                                                }}
                                                                onDragEnd={() => {
                                                                    console.log('🏁 拖拽结束');
                                                                }}
                                                                onLoad={() => console.log('图片加载成功:', image.id)}
                                                                onError={(e) => {
                                                                    console.error('图片加载失败:', image.id, image.url, e)
                                                                    const target = e.target as HTMLImageElement
                                                                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" fill="none"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Cpath d="M50 30C60 30 68 38 68 48C68 58 60 66 50 66C40 66 32 58 32 48C32 38 40 30 50 30ZM50 20C33.4 20 20 33.4 20 50C20 66.6 33.4 80 50 80C66.6 80 80 66.6 80 50C80 33.4 66.6 20 50 20ZM50 75C36.2 75 25 63.8 25 50C25 36.2 36.2 25 50 25C63.8 25 75 36.2 75 50C75 63.8 63.8 75 50 75Z" fill="%23dddddd"/%3E%3C/svg%3E'
                                                                }}
                                                            />
                                                            {/* 渐变遮罩层 - 用于文字可读性 */}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                                            
                                                            {/* 显示图片名称 - 优化样式 */}
                                                            <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                                <div 
                                                                    className="text-white text-xs font-medium truncate"
                                                                    style={{
                                                                        textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                                                                    }}
                                                                >
                                                                    {image.name}
                                                                </div>
                                                            </div>
                                                            
                                                            {/* 删除按钮 - 优化样式 */}
                                                            <button
                                                                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100"
                                                                style={{
                                                                    background: 'rgba(239, 68, 68, 0.9)',
                                                                    backdropFilter: 'blur(8px) saturate(150%)',
                                                                    WebkitBackdropFilter: 'blur(8px) saturate(150%)',
                                                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleImageDelete(image.id, image.name)
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.background = 'rgba(220, 38, 38, 1)'
                                                                    e.currentTarget.style.transform = 'scale(1.1)'
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'
                                                                    e.currentTarget.style.transform = 'scale(1)'
                                                                }}
                                                                aria-label={`${t('image_library.delete_image')} ${image.name}`}
                                                            >
                                                                <Trash2 className="w-4 h-4 text-white" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <div className="col-span-3 flex flex-col items-center justify-center py-16 px-4">
                                                <div 
                                                    className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.4)',
                                                        backdropFilter: 'blur(10px) saturate(150%)',
                                                        WebkitBackdropFilter: 'blur(10px) saturate(150%)',
                                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                                    }}
                                                >
                                                    <ImagePlus className="w-10 h-10 text-gray-400" />
                                                </div>
                                                <p className="text-sm font-medium text-gray-600 mb-1">
                                                    {t('image_library.no_uploaded_images')}
                                                </p>
                                                <p className="text-xs text-gray-400 text-center max-w-xs">
                                                    上传图片后，它们将显示在这里
                                                </p>
                                            </div>
                                        )
                                    )}
                                </>
                            )}
                        </div>
                    )}
                    {assetSubTab === 'fonts' && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-3 pt-3 space-y-2">
                                
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 模板管理器（保留占位） */}
            <TemplateManager
                isOpen={showTemplateManager}
                onClose={() => setShowTemplateManager(false)}
                onApplyTemplate={(template) => {
                    console.log('应用模板:', template)
                    setOverlay(true, t('canvas:messages.templateLoading.templateApplied', { name: template.name }), 'success')
                    setTimeout(() => clearOverlay(), 2000)
                }}
            />

            {/* 艺术字上传对话框 */}
            <FontUploadDialog
                isOpen={showFontUploadDialog}
                onClose={() => setShowFontUploadDialog(false)}
                onSuccess={handleFontUploadSuccess}
                categories={fontCategories}
            />
        </div>
    )
}




 
