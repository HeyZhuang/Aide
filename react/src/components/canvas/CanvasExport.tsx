import { useCanvas } from '@/contexts/canvas'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { ImageDown, Download, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { exportToCanvas } from '@excalidraw/excalidraw'
import { writePsd, Psd } from 'ag-psd'


const CanvasExport = () => {
  const { excalidrawAPI } = useCanvas()
  const { t } = useTranslation()

  const downloadImage = async (imageUrl: string): Promise<string> => {
    const image = new Image()
    image.src = imageUrl
    return new Promise((resolve, reject) => {
      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(image, 0, 0)
        const dataURL = canvas.toDataURL('image/png')
        resolve(dataURL)
      }
      image.onerror = () => {
        reject(new Error('Failed to load image'))
      }
    })
  }

  // 加载文件URL为dataURL
  const loadFileAsDataURL = async (url: string): Promise<string> => {
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
  }

  // 确保所有文件都有dataURL
  const ensureFilesHaveDataURL = async (files: any): Promise<any> => {
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
  }

  // 保存整个画布为图片
  const handleExportCanvasAsImage = async () => {
    if (!excalidrawAPI) {
      toast.error('画布未初始化')
      return
    }

    const toastId = toast.loading('正在导出画布为图片...')
    try {
      const elements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()
      const files = excalidrawAPI.getFiles()

      // 过滤掉已删除的元素
      const visibleElements = elements.filter((el) => !el.isDeleted)

      if (visibleElements.length === 0) {
        toast.error('画布为空，无法导出')
        toast.dismiss(toastId)
        return
      }

      // 确保所有文件都有dataURL
      const filesWithDataURL = await ensureFilesHaveDataURL(files)

      // 计算所有元素的边界框
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      visibleElements.forEach((element) => {
        const x = element.x
        const y = element.y
        const width = 'width' in element ? element.width : 0
        const height = 'height' in element ? element.height : 0

        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x + width)
        maxY = Math.max(maxY, y + height)
      })

      // 计算画布的中心点和尺寸
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      const canvasWidth = maxX - minX
      const canvasHeight = maxY - minY

      // 添加边距（20%）
      const padding = Math.max(canvasWidth, canvasHeight) * 0.2
      const viewportWidth = canvasWidth + padding * 2
      const viewportHeight = canvasHeight + padding * 2

      // 调整 appState，使所有元素都在视图中
      const adjustedAppState = {
        ...appState,
        selectedElementIds: {},
        scrollX: -centerX + viewportWidth / 2,
        scrollY: -centerY + viewportHeight / 2,
        zoom: {
          value: 1,
        },
        width: viewportWidth,
        height: viewportHeight,
      }

      // 使用 exportToCanvas 导出整个画布
      const canvas = await exportToCanvas({
        elements: visibleElements,
        appState: adjustedAppState,
        files: filesWithDataURL,
        mimeType: 'image/png',
        getDimensions: (width: number, height: number) => {
          // 返回实际尺寸，不限制最大尺寸
          return { width, height, scale: 1 }
        },
      })

      // 转换为blob并下载
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const fileName = `canvas-${Date.now()}.png`
          saveAs(blob, fileName)
          toast.success('画布已成功导出为图片', { id: toastId })
        } else {
          toast.error('导出失败', { id: toastId })
        }
      }, 'image/png')
    } catch (error) {
      console.error('导出画布为图片失败:', error)
      toast.error('导出失败: ' + (error instanceof Error ? error.message : '未知错误'), {
        id: toastId,
      })
    }
  }

  // 保存整个画布为PSD文件
  const handleExportCanvasAsPSD = async () => {
    if (!excalidrawAPI) {
      toast.error('画布未初始化')
      return
    }

    const toastId = toast.loading('正在导出画布为PSD文件...')
    try {
      const elements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()
      const files = excalidrawAPI.getFiles()

      // 过滤掉已删除的元素
      const visibleElements = elements.filter((el) => !el.isDeleted)

      if (visibleElements.length === 0) {
        toast.error('画布为空，无法导出')
        toast.dismiss(toastId)
        return
      }

      // 确保所有文件都有dataURL
      const filesWithDataURL = await ensureFilesHaveDataURL(files)

      // 计算所有元素的边界框
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      visibleElements.forEach((element) => {
        const x = element.x
        const y = element.y
        const width = 'width' in element ? element.width : 0
        const height = 'height' in element ? element.height : 0

        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x + width)
        maxY = Math.max(maxY, y + height)
      })

      // 计算画布的中心点和尺寸
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      const canvasWidth = maxX - minX
      const canvasHeight = maxY - minY

      // 添加边距（20%）
      const padding = Math.max(canvasWidth, canvasHeight) * 0.2
      const viewportWidth = Math.ceil(canvasWidth + padding * 2)
      const viewportHeight = Math.ceil(canvasHeight + padding * 2)

      // 调整 appState，使所有元素都在视图中
      const adjustedAppState = {
        ...appState,
        selectedElementIds: {},
        scrollX: -centerX + viewportWidth / 2,
        scrollY: -centerY + viewportHeight / 2,
        zoom: {
          value: 1,
        },
        width: viewportWidth,
        height: viewportHeight,
      }

      // 使用 exportToCanvas 导出整个画布
      const canvas = await exportToCanvas({
        elements: visibleElements,
        appState: adjustedAppState,
        files: filesWithDataURL,
        mimeType: 'image/png',
        getDimensions: (width: number, height: number) => {
          return { width, height, scale: 1 }
        },
      })

      // 创建PSD文件
      const psd: Psd = {
        width: canvas.width,
        height: canvas.height,
        children: [
          {
            name: 'Canvas',
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

      // 下载PSD文件
      const blob = new Blob([psdBuffer], { type: 'application/octet-stream' })
      const fileName = `canvas-${Date.now()}.psd`
      saveAs(blob, fileName)
      toast.success('画布已成功导出为PSD文件', { id: toastId })
    } catch (error) {
      console.error('导出画布为PSD失败:', error)
      toast.error('导出失败: ' + (error instanceof Error ? error.message : '未知错误'), {
        id: toastId,
      })
    }
  }

  const handleExportImages = async () => {
    if (!excalidrawAPI) return
    const toastId = toast.loading(t('canvas:messages.exportingAssets'))
    try {
      const appState = excalidrawAPI.getAppState()
      const elements = excalidrawAPI.getSceneElements()

      const selectedIds = Object.keys(appState.selectedElementIds).filter(
        (id) => appState.selectedElementIds[id]
      )

      const images = elements.filter(
        (element) =>
          selectedIds.includes(element.id) &&
          (element.type === 'image' || element.type === 'embeddable')
      )

      if (images.length === 0) {
        toast.error(t('canvas:messages.nothingSelected'))
        return
      }

      const files = excalidrawAPI.getFiles()

      // Separate embeddable elements (videos) and regular images
      const embeddableElements = images.filter(element => element.type === 'embeddable')
      const imageElements = images.filter(element => element.type === 'image')

      // Get video URLs from embeddable elements
      const videoUrls = embeddableElements
        .map((element) => {
          if ('link' in element && element.link) {
            return element.link
          }
          return null
        })
        .filter((url) => url !== null)

      // Get image URLs from regular image elements
      const imageUrls = imageElements
        .map((element) => {
          if ('fileId' in element && element.fileId) {
            const file = files[element.fileId]
            return file?.dataURL
          }
          return null
        })
        .filter((url) => url !== null)

      if (imageUrls.length === 0 && videoUrls.length === 0) {
        toast.error(t('canvas:messages.nothingSelected'))
        return
      }

      // Generate random ID for the asset package
      const randomId = Math.random().toString(36).substring(2, 15)
      const packageName = `Asset-${randomId}.zip`

      // If only one image and no videos, save directly
      if (imageUrls.length === 1 && videoUrls.length === 0) {
        const imageUrl = imageUrls[0]
        const dataURL = await downloadImage(imageUrl)
        saveAs(dataURL, `Asset-${randomId}.png`)
        return
      }

      // If only one video and no images, save directly
      if (videoUrls.length === 1 && imageUrls.length === 0) {
        const videoUrl = videoUrls[0]
        const response = await fetch(videoUrl)
        const blob = await response.blob()
        saveAs(blob, `Asset-${randomId}.mp4`)
        return
      }

      // Create a zip package for multiple assets or mixed types
      const zip = new JSZip()

      // Add videos to zip
      await Promise.all(
        videoUrls.map(async (videoUrl, index) => {
          const response = await fetch(videoUrl)
          const blob = await response.blob()
          zip.file(`video-${index + 1}.mp4`, blob)
        })
      )

      // Add images to zip
      await Promise.all(
        imageUrls.map(async (imageUrl, index) => {
          const dataURL = await downloadImage(imageUrl)
          if (dataURL) {
            zip.file(
              `image-${index + 1}.png`,
              dataURL.replace('data:image/png;base64,', ''),
              { base64: true }
            )
          }
        })
      )

      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, packageName)
    } catch (error) {
      toast.error(t('canvas:messages.failedToExportImages'), {
        id: toastId,
      })
    } finally {
      toast.dismiss(toastId)
    }
  }

  return (
    <div className="inline-flex -space-x-px rounded-md shadow-xs rtl:space-x-reverse">
      <Button
        className="rounded-none shadow-none first:rounded-s-md last:rounded-e-md h-8"
        variant="outline"
        onClick={handleExportImages}
      >
        <ImageDown />
        {t('canvas:exportImages')}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="rounded-none shadow-none first:rounded-s-md last:rounded-e-md h-8"
            variant="outline"
          >
            <Download className="mr-1" />
            保存画布
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportCanvasAsImage}>
            <ImageDown className="mr-2 h-4 w-4" />
            保存为图片 (PNG)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportCanvasAsPSD}>
            <Download className="mr-2 h-4 w-4" />
            保存为PSD文件
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default CanvasExport
