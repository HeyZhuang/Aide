import { Input } from '@/components/ui/input'
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
  return (
    <TopMenu
      middle={
        <div className="px-4 py-1.5 rounded-lg bg-white/40 backdrop-blur-sm border border-white/50 shadow-sm">
          <Input
            className="text-sm font-medium text-foreground text-center bg-transparent border-none shadow-none w-fit min-w-[200px] h-8 px-3 rounded-lg hover:bg-white/30 focus:bg-white/40 focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-muted-foreground/60"
            value={canvasName}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onNameSave}
            placeholder="画布名称"
          />
        </div>
      }
      right={
        <div className="flex items-center gap-2">
          <PSDCanvasUploader
            canvasId={canvasId}
            onPSDUploaded={onPSDUpdate}
          />
          <CanvasExport />
        </div>
      }
    />
  )
}

export default CanvasHeader
