import { useState, useCallback } from 'react'
import { useTheme } from '@/hooks/use-theme'
import { Button } from '@/components/ui/button'
import { useCanvas } from '@/contexts/canvas'
import { useTranslation } from 'react-i18next'
import {
    Download,
    FileImage,
    FileType,
    Layers,
    ChevronDown
} from 'lucide-react'
import { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { exportToCanvas } from '@excalidraw/excalidraw'
import { writePsd, Psd } from 'ag-psd'
import { saveAs } from 'file-saver'
import { toast } from 'sonner'

interface FrameExportToolbarProps {
    selectedElement: ExcalidrawElement
}

export function FrameExportToolbar({ selectedElement }: FrameExportToolbarProps) {
    const { t } = useTranslation()
    const { excalidrawAPI } = useCanvas()
    const { theme } = useTheme()
    const [isExporting, setIsExporting] = useState(false)

    // 加载文件URL为dataURL
    const loadFileAsDataURL = useCallback(async (url: string): Promise<string> => {
        try {
            if (url.startsWith('data:')) {
                return url
            }
            let fullUrl = url
            if (url.startsWith('/')) {
                fullUrl = window.location.origin + url
            }
            const response = await fetch(fullUrl)
            if (!response.ok) {
                throw new Error(`Failed to load file: ${response.status}`)
            }
            const blob = await response.blob()
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(blob)
            })
        } catch (error) {
            console.error('加载文件失败:', url, error)
            throw error
        }
    }, [])

    // 确保所有文件都有dataURL
    const ensureFilesHaveDataURL = useCallback(async (files: any): Promise<any> => {
        const filesWithDataURL: any = {}
        for (const [fileId, file] of Object.entries(files)) {
            const fileData = file as any
            if (fileData?.dataURL) {
                if (fileData.dataURL.startsWith('data:')) {
                    filesWithDataURL[fileId] = fileData
                } else {
                    try {
                        const dataURL = await loadFileAsDataURL(fileData.dataURL)
                        filesWithDataURL[fileId] = {
                            ...fileData,
                            dataURL: dataURL as any,
                        }
                    } catch (error) {
                        console.warn(`无法加载文件 ${fileId}:`, error)
                        filesWithDataURL[fileId] = fileData
                    }
                }
            } else {
                filesWithDataURL[fileId] = fileData
            }
        }
        return filesWithDataURL
    }, [loadFileAsDataURL])

    // 获取Frame内的所有元素
    const getFrameElements = useCallback(() => {
        if (!excalidrawAPI || !selectedElement) return []

        const elements = excalidrawAPI.getSceneElements()
        const frameElement = selectedElement

        // 获取Frame内的所有子元素
        const frameChildren = elements.filter(el => {
            return (
                el.id !== frameElement.id &&
                el.x >= frameElement.x &&
                el.y >= frameElement.y &&
                el.x + el.width <= frameElement.x + frameElement.width &&
                el.y + el.height <= frameElement.y + frameElement.height &&
                !el.isDeleted
            )
        })

        return [frameElement, ...frameChildren]
    }, [excalidrawAPI, selectedElement])

    // 导出Frame为指定格式
    const exportFrame = useCallback(async (format: 'png' | 'jpg' | 'psd') => {
        if (!excalidrawAPI || !selectedElement) {
            toast.error('Frame未选中')
            return
        }

        setIsExporting(true)
        const toastId = toast.loading(`正在导出Frame为${format.toUpperCase()}...`)

        try {
            const elements = getFrameElements()
            if (elements.length === 0) {
                toast.error('Frame为空，无法导出')
                return
            }

            const files = excalidrawAPI.getFiles()
            const appState = excalidrawAPI.getAppState()

            // 确保所有文件都有dataURL
            const filesWithDataURL = await ensureFilesHaveDataURL(files)

            // 计算Frame的边界
            const frameElement = selectedElement
            const frameX = frameElement.x
            const frameY = frameElement.y
            const frameWidth = frameElement.width
            const frameHeight = frameElement.height

            // 调整 appState，使Frame居中显示
            const adjustedAppState = {
                ...appState,
                selectedElementIds: {},
                scrollX: -frameX + frameWidth / 2,
                scrollY: -frameY + frameHeight / 2,
                zoom: {
                    value: 1,
                },
                width: frameWidth,
                height: frameHeight,
            }

            if (format === 'psd') {
                // 导出为PSD格式
                const canvas = await exportToCanvas({
                    elements: elements,
                    appState: adjustedAppState,
                    files: filesWithDataURL,
                    mimeType: 'image/png',
                    getDimensions: (width: number, height: number) => {
                        return { width: frameWidth, height: frameHeight, scale: 1 }
                    },
                })

                // 创建PSD文件
                const psd: Psd = {
                    width: canvas.width,
                    height: canvas.height,
                    children: [
                        {
                            name: 'Frame',
                            left: 0,
                            top: 0,
                            right: canvas.width,
                            bottom: canvas.height,
                            opacity: 255,
                            canvas: canvas,
                        },
                    ],
                }

                // 生成PSD文件buffer
                const psdBuffer = writePsd(psd)
                const blob = new Blob([psdBuffer], { type: 'application/octet-stream' })
                const fileName = `frame-${Date.now()}.psd`
                saveAs(blob, fileName)
                toast.success('Frame已成功导出为PSD文件', { id: toastId })

            } else {
                // 导出为PNG或JPG格式
                const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'

                const canvas = await exportToCanvas({
                    elements: elements,
                    appState: adjustedAppState,
                    files: filesWithDataURL,
                    mimeType: mimeType,
                    getDimensions: (width: number, height: number) => {
                        return { width: frameWidth, height: frameHeight, scale: 1 }
                    },
                })

                // 转换为blob并下载
                canvas.toBlob((blob: Blob | null) => {
                    if (blob) {
                        const fileName = `frame-${Date.now()}.${format}`
                        saveAs(blob, fileName)
                        toast.success(`Frame已成功导出为${format.toUpperCase()}文件`, { id: toastId })
                    } else {
                        toast.error('导出失败', { id: toastId })
                    }
                }, mimeType, format === 'jpg' ? 0.9 : undefined) // JPG质量设为90%
            }

        } catch (error) {
            console.error(`导出Frame为${format}失败:`, error)
            toast.error('导出失败: ' + (error instanceof Error ? error.message : '未知错误'), {
                id: toastId,
            })
        } finally {
            setIsExporting(false)
        }
    }, [excalidrawAPI, selectedElement, getFrameElements, ensureFilesHaveDataURL])

    // 批量导出所有格式
    const exportAllFormats = useCallback(async () => {
        if (!excalidrawAPI || !selectedElement) {
            toast.error('Frame未选中')
            return
        }

        setIsExporting(true)
        const toastId = toast.loading('正在批量导出Frame...')

        try {
            // 依次导出PNG、JPG、PSD
            await exportFrame('png')
            await new Promise(resolve => setTimeout(resolve, 500)) // 短暂延迟
            await exportFrame('jpg')
            await new Promise(resolve => setTimeout(resolve, 500))
            await exportFrame('psd')

            toast.success('Frame已成功导出为所有格式', { id: toastId })
        } catch (error) {
            console.error('批量导出失败:', error)
            toast.error('批量导出失败: ' + (error instanceof Error ? error.message : '未知错误'), {
                id: toastId,
            })
        } finally {
            setIsExporting(false)
        }
    }, [exportFrame, excalidrawAPI, selectedElement])

    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

    return (
        <div
            className="flex items-center gap-2 backdrop-blur-md border text-foreground px-3 py-1.5 rounded-xl shadow-lg"
            style={{
                background: isDark ? 'rgba(24, 24, 24, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.6)',
                color: isDark ? '#F5F5F7' : '#000000',
            }}
        >
            {/* Frame导出下拉菜单 */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3 text-xs hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center gap-1.5"
                        disabled={isExporting}
                        title="导出Frame"
                    >
                        <Download className="h-4 w-4" />
                        <span>{isExporting ? '导出中...' : '导出Frame'}</span>
                        <ChevronDown className="h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                        onClick={() => exportFrame('png')}
                        disabled={isExporting}
                        className="flex items-center gap-2"
                    >
                        <FileImage className="h-4 w-4" />
                        导出为PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => exportFrame('jpg')}
                        disabled={isExporting}
                        className="flex items-center gap-2"
                    >
                        <FileImage className="h-4 w-4" />
                        导出为JPG
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => exportFrame('psd')}
                        disabled={isExporting}
                        className="flex items-center gap-2"
                    >
                        <Layers className="h-4 w-4" />
                        导出为PSD
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={exportAllFormats}
                        disabled={isExporting}
                        className="flex items-center gap-2 font-medium"
                    >
                        <FileType className="h-4 w-4" />
                        导出所有格式
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
