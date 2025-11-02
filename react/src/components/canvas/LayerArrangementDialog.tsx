import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Sparkles, Loader2, Ruler, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LayerArrangementDialogProps {
  isOpen: boolean
  onClose: () => void
  onArrange: (width: number, height: number) => void
  isArranging: boolean
  selectedCount: number
}

const presetSizes: Array<{ name: string; width: number; height: number; recommended?: boolean }> = [
  { name: '推荐尺寸', width: 1200, height: 628, recommended: true },
  { name: '推荐尺寸', width: 960, height: 270, recommended: true },
  { name: 'Instagram 方形', width: 1080, height: 1080 },
  { name: 'Instagram 故事', width: 1080, height: 1920 },
  { name: 'Facebook 帖子', width: 1200, height: 630 },
  { name: 'Twitter 帖子', width: 1200, height: 675 },
  // { name: 'LinkedIn 帖子', width: 1200, height: 627 },
]

export function LayerArrangementDialog({
  isOpen,
  onClose,
  onArrange,
  isArranging,
  selectedCount,
}: LayerArrangementDialogProps) {
  const [width, setWidth] = useState(1200)
  const [height, setHeight] = useState(628)

  // 重置表单当对话框打开时，使用推荐的默认尺寸
  useEffect(() => {
    if (isOpen) {
      setWidth(1200)
      setHeight(628)
    }
  }, [isOpen])

  const handlePresetSelect = (preset: { width: number; height: number; recommended?: boolean }) => {
    setWidth(preset.width)
    setHeight(preset.height)
  }

  const handleArrange = () => {
    if (width <= 0 || height <= 0) {
      toast.error('请输入有效的尺寸（宽度和高度必须大于0）')
      return
    }
    
    onArrange(width, height)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* 毛玻璃遮罩层 */}
      <DialogContent 
        className={cn(
          "sm:max-w-2xl",
          // 毛玻璃效果
          "backdrop-blur-xl bg-background/80",
          "border border-white/20 dark:border-white/10",
          "shadow-2xl",
          "bg-gradient-to-br from-background/90 via-background/80 to-background/90",
          // 动画效果
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
        style={{
          background: 'rgba(var(--background-rgb, 255, 255, 255), 0.8)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <DialogHeader className="space-y-3 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold tracking-tight">
                智能缩放
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm text-muted-foreground/80">
                已选择 {selectedCount} 个元素，请设置目标画布尺寸进行智能排列
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="grid gap-6 py-6">
          {/* 自定义尺寸输入区域 */}
          <div className="space-y-4 rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">自定义尺寸</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width" className="text-sm font-medium flex items-center gap-1.5">
                  <span>宽度</span>
                  <span className="text-xs text-muted-foreground">(px)</span>
                </Label>
                <Input
                  id="width"
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  min="1"
                  className="w-full h-10 bg-background/50 border-border/50 focus:bg-background/80 transition-all"
                  placeholder="宽度"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height" className="text-sm font-medium flex items-center gap-1.5">
                  <span>高度</span>
                  <span className="text-xs text-muted-foreground">(px)</span>
                </Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  min="1"
                  className="w-full h-10 bg-background/50 border-border/50 focus:bg-background/80 transition-all"
                  placeholder="高度"
                />
              </div>
            </div>
            {/* 显示当前尺寸比例 */}
            <div className="pt-2 border-t border-border/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>当前尺寸:</span>
                <span className="font-mono font-medium">
                  {width} × {height} px
                </span>
              </div>
              {width > 0 && height > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>宽高比:</span>
                  <span className="font-mono font-medium">
                    {(width / height).toFixed(2)}:1
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* 预设尺寸区域 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">预设尺寸</Label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {presetSizes.map((preset, index) => {
                const isSelected = width === preset.width && height === preset.height
                const isRecommended = preset.recommended
                return (
                  <Button
                    key={index}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-auto py-3 px-4 text-left transition-all duration-200 relative",
                      "hover:scale-[1.02] hover:shadow-md",
                      "border-border/50 bg-background/40 backdrop-blur-sm",
                      isSelected && "bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/20",
                      isRecommended && !isSelected && "border-primary/30 bg-primary/5"
                    )}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    {isRecommended && (
                      <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
                        推荐
                      </span>
                    )}
                    <div className="space-y-1">
                      <div className={cn(
                        "font-semibold text-sm flex items-center gap-1.5",
                        isSelected ? "text-primary-foreground" : "text-foreground"
                      )}>
                        {preset.width} × {preset.height}
                        {isRecommended && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                            推荐
                          </span>
                        )}
                      </div>
                      <div className={cn(
                        "text-xs",
                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {isRecommended 
                          ? index === 0 ? '社交媒体推荐' : '横版推荐'
                          : preset.name}
                      </div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
        
        <DialogFooter className="gap-3 pt-4 border-t border-border/50">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isArranging}
            className="backdrop-blur-sm bg-background/50 hover:bg-background/80"
          >
            取消
          </Button>
          <Button 
            onClick={handleArrange} 
            disabled={isArranging}
            className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isArranging ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                排列中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                开始排列
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}