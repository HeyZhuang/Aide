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
import { useTranslation } from 'react-i18next'

interface LayerArrangementDialogProps {
  isOpen: boolean
  onClose: () => void
  onArrange: (width: number, height: number) => void
  isArranging: boolean
  selectedCount: number
}

export function LayerArrangementDialog({
  isOpen,
  onClose,
  onArrange,
  isArranging,
  selectedCount,
}: LayerArrangementDialogProps) {
  const [width, setWidth] = useState(1200)
  const [height, setHeight] = useState(628)
  const { t } = useTranslation()
  
  // 将presetSizes移到组件内部，这样可以访问t函数
  const presetSizes: Array<{ name: string; width: number; height: number; recommended?: boolean }> = [
    { name: t('resize.preset.social_recommended'), width: 1200, height: 628, recommended: true },
    { name: t('resize.preset.horizontal_recommended'), width: 960, height: 270, recommended: true },
    { name: t('resize.preset.instagram_square'), width: 1080, height: 1080 },
    { name: t('resize.preset.instagram_story'), width: 1080, height: 1920 },
    { name: t('resize.preset.facebook_post'), width: 1200, height: 630 },
    { name: t('resize.preset.twitter_post'), width: 1200, height: 675 },
    // { name: 'LinkedIn 帖子', width: 1200, height: 627 },
  ]

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
      toast.error(t('resize.errors.invalid_dimensions'))
      return
    }
    
    onArrange(width, height)
  }

  // 允许在排列过程中关闭弹窗（虽然通常弹窗会在开始排列时立即关闭）
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
                {t('resize.title')}
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm text-muted-foreground/80">
                {t('resize.description', { selectedCount })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="grid gap-6 py-6">
          {/* 自定义尺寸输入区域 */}
          <div className="space-y-4 rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">{t('resize.custom_size')}</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width" className="text-sm font-medium flex items-center gap-1.5">
                  <span>{t('resize.width')}</span>
                  <span className="text-xs text-muted-foreground">(px)</span>
                </Label>
                <Input
                  id="width"
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  min="1"
                  className="w-full h-10 bg-background/50 border-border/50 focus:bg-background/80 transition-all"
                  placeholder={t('resize.width')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height" className="text-sm font-medium flex items-center gap-1.5">
                  <span>{t('resize.height')}</span>
                  <span className="text-xs text-muted-foreground">(px)</span>
                </Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  min="1"
                  className="w-full h-10 bg-background/50 border-border/50 focus:bg-background/80 transition-all"
                  placeholder={t('resize.height')}
                />
              </div>
            </div>
            {/* 显示当前尺寸比例 */}
            <div className="pt-2 border-t border-border/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('resize.current_size')}:</span>
                <span className="font-mono font-medium">
                  {width} × {height} px
                </span>
              </div>
              {width > 0 && height > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>{t('resize.aspect_ratio')}:</span>
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
              <Label className="text-base font-semibold">{t('resize.preset_sizes')}</Label>
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
                        {t('resize.recommended')}
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
                              {t('resize.recommended')}
                            </span>
                          )}
                      </div>
                      <div className={cn(
                        "text-xs",
                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {preset.name}
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
            className="backdrop-blur-sm bg-background/50 hover:bg-background/80"
          >
            {t('resize.cancel')}
          </Button>
          <Button 
            onClick={handleArrange} 
            disabled={isArranging}
            className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isArranging ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('resize.arranging')}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t('resize.start_arranging')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}