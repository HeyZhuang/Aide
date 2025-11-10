import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import CanvasExport from './CanvasExport'
import { PSDCanvasUploader } from './PSDCanvasUploader'
import TopMenu from '../TopMenu'

type CanvasHeaderProps = {
  canvasName: string
  canvasId: string
  onNameChange: (name: string) => void
  onNameSave: () => void
  psdData?: any
  onPSDUpdate?: (psdData: any) => void
  onApplyTemplate?: (template: any) => void
}

const CanvasHeader: React.FC<CanvasHeaderProps> = ({
  canvasName,
  canvasId,
  onNameChange,
  onNameSave,
  psdData,
  onPSDUpdate,
  onApplyTemplate,
}) => {
  const { authStatus } = useAuth()
  // 未登录用户视为 viewer（只读模式）
  const userRole = authStatus.is_logged_in ? (authStatus.user_info?.role || 'viewer') : 'viewer'
  const isViewer = userRole === 'viewer' || !authStatus.is_logged_in

  return (
    <TopMenu
      middle={
        // <div className="px-3 py-1 bg-white/50 backdrop-blur-md border border-white/60 shadow-sm hover:bg-white/60 transition-all duration-300 ease-in-out transform hover:scale-105">
          <Input
            className="text-base font-semibold text-foreground text-center bg-transparent border-none shadow-none w-fit min-w-[180px] h-7 px-2 focus:outline-none focus:ring-0 placeholder:text-muted-foreground/70 transition-all duration-200"
            value={canvasName}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onNameSave}
            placeholder="画布名称"
            disabled={isViewer}
            readOnly={isViewer}
          />
        // {/* </div> */}
      }
      right={
        <div className="flex items-center gap-2">
          {/* 只有 Editor 和 Admin 可以上传 PSD */}
          {!isViewer && (
            <PSDCanvasUploader
              canvasId={canvasId}
              onPSDUploaded={onPSDUpdate}
            />
          )}
          <CanvasExport />
        </div>
      }
    />
  )
}

export default CanvasHeader