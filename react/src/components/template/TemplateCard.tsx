import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
    Star,
    StarOff,
    MoreHorizontal,
    Download,
    Trash2,
    Edit3,
    Copy,
    Eye,
    Heart,
    Tag,
    Calendar,
    User,
    Image as ImageIcon,
    Type,
    Layers,
    FolderOpen,
    Palette,
} from 'lucide-react'
import { TemplateItem } from '@/types/types'
import { toast } from 'sonner'

interface TemplateCardProps {
    template: TemplateItem
    viewMode: 'grid' | 'list'
    isSelected: boolean
    onSelect: (selected: boolean) => void
    onToggleFavorite: () => void
    onDelete: () => void
    onApply: () => void
    onEdit: () => void
}

export function TemplateCard({
    template,
    viewMode,
    isSelected,
    onSelect,
    onToggleFavorite,
    onDelete,
    onApply,
    onEdit,
}: TemplateCardProps) {
    const [imageError, setImageError] = useState(false)
    const [imageLoading, setImageLoading] = useState(true)

    // 获取模板类型图标
    const getTypeIcon = (type: TemplateItem['type']) => {
        switch (type) {
            case 'psd_file':
                return <Layers className="h-4 w-4" />
            case 'psd_layer':
                return <Layers className="h-4 w-4" />
            case 'image':
                return <ImageIcon className="h-4 w-4" />
            case 'text_style':
                return <Type className="h-4 w-4" />
            case 'layer_group':
                return <FolderOpen className="h-4 w-4" />
            case 'canvas_element':
                return <Palette className="h-4 w-4" />
            default:
                return <Layers className="h-4 w-4" />
        }
    }

    // 获取模板类型标签
    const getTypeLabel = (type: TemplateItem['type']) => {
        switch (type) {
            case 'psd_file':
                return 'PSD文件'
            case 'psd_layer':
                return 'PSD图层'
            case 'image':
                return '图片'
            case 'text_style':
                return '文字样式'
            case 'layer_group':
                return '图层组'
            case 'canvas_element':
                return '画布元素'
            default:
                return '模板'
        }
    }

    // 格式化日期
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    // 复制模板信息
    const handleCopyInfo = () => {
        let info = `模板名称: ${template.name}
描述: ${template.description || '无'}
类型: ${getTypeLabel(template.type)}
标签: ${template.tags.join(', ')}
使用次数: ${template.usage_count}`

        // 为PSD文件添加额外信息
        if (template.type === 'psd_file' && template.metadata) {
            const metadata = template.metadata
            info += `\n原始文件名: ${metadata.original_filename || '未知'}\n尺寸: ${metadata.width || 0}x${metadata.height || 0}\n图层数量: ${metadata.layers_count || 0}`
        }

        navigator.clipboard.writeText(info)
        toast.success('模板信息已复制到剪贴板')
    }

    // 获取PSD文件信息
    const getPSDFileInfo = () => {
        if (template.type !== 'psd_file' || !template.metadata) return null

        const metadata = template.metadata
        return {
            originalFilename: metadata.original_filename,
            dimensions: `${metadata.width || 0} × ${metadata.height || 0}`,
            layersCount: metadata.layers_count || 0
        }
    }

    if (viewMode === 'list') {
        return (
            <Card className={`transition-all duration-200 hover:shadow-md bg-white/50 backdrop-blur-md border border-white/30 rounded-lg ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        {/* 选择框 */}
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={onSelect}
                            className="rounded-md"
                        />

                        {/* 缩略图 */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/30 backdrop-blur-sm flex-shrink-0 relative border border-white/30">
                            {template.thumbnail_url && !imageError ? (
                                <>
                                    {imageLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-sm">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                        </div>
                                    )}
                                    <img
                                        src={template.thumbnail_url}
                                        alt={template.name}
                                        className={`w-full h-full object-contain transition-opacity duration-200 ${imageLoading ? 'opacity-0' : 'opacity-100'
                                            }`}
                                        onLoad={() => setImageLoading(false)}
                                        onError={() => {
                                            setImageError(true)
                                            setImageLoading(false)
                                        }}
                                    />
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="text-center">
                                        {getTypeIcon(template.type)}
                                        <p className="text-xs text-foreground/70 mt-0.5">
                                            {template.type === 'psd_file' ? 'PSD文件' :
                                                template.type === 'psd_layer' ? 'PSD图层' :
                                                    template.type === 'image' ? 'IMG' :
                                                        template.type === 'text_style' ? 'TXT' : 'TPL'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 模板信息 */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium truncate text-foreground">{template.name}</h3>
                                {template.is_favorite && (
                                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                )}
                                <Badge variant="secondary" className="text-xs bg-white/50 backdrop-blur-sm border border-white/30">
                                    {getTypeLabel(template.type)}
                                </Badge>
                                {template.is_public && (
                                    <Badge variant="outline" className="text-xs border-white/30">
                                        公开
                                    </Badge>
                                )}
                            </div>

                            {template.description && (
                                <p className="text-sm text-foreground/70 line-clamp-2 mb-2">
                                    {template.description}
                                </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-foreground/60">
                                <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {template.created_by || '未知作者'}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(template.created_at)}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {template.usage_count}
                                </div>
                            </div>
                        </div>

                        {/* 标签 */}
                        {template.tags && template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 max-w-32">
                                {template.tags.slice(0, 2).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs border-white/30">
                                        {tag}
                                    </Badge>
                                ))}
                                {template.tags.length > 2 && (
                                    <Badge variant="outline" className="text-xs border-white/30">
                                        +{template.tags.length - 2}
                                    </Badge>
                                )}
                            </div>
                        )}

                        {/* 操作菜单 */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/30 backdrop-blur-sm rounded-md">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white/50 backdrop-blur-md border border-white/30 rounded-lg">
                                <DropdownMenuItem onClick={onApply} className="hover:bg-white/30 rounded-md">
                                    <Eye className="h-4 w-4 mr-2" />
                                    应用
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onEdit} className="hover:bg-white/30 rounded-md">
                                    <Edit3 className="h-4 w-4 mr-2" />
                                    编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onToggleFavorite} className="hover:bg-white/30 rounded-md">
                                    {template.is_favorite ? (
                                        <>
                                            <StarOff className="h-4 w-4 mr-2" />
                                            取消收藏
                                        </>
                                    ) : (
                                        <>
                                            <Star className="h-4 w-4 mr-2" />
                                            收藏
                                        </>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleCopyInfo} className="hover:bg-white/30 rounded-md">
                                    <Copy className="h-4 w-4 mr-2" />
                                    复制信息
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onDelete} className="hover:bg-white/30 rounded-md text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    删除
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // 网格视图
    return (
        <Card className={`transition-all duration-200 hover:shadow-lg bg-white/50 backdrop-blur-md border border-white/30 rounded-xl overflow-hidden ${isSelected ? 'ring-2 ring-primary' : ''}`}>
            <CardContent className="p-0">
                {/* 选择框 */}
                <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={onSelect}
                        className="rounded-md bg-white/50 backdrop-blur-sm border-white/30"
                    />
                </div>

                {/* 收藏标记 */}
                {template.is_favorite && (
                    <div className="absolute top-2 right-2 z-10">
                        <Star className="h-5 w-5 text-yellow-500 fill-current drop-shadow-md" />
                    </div>
                )}

                {/* 缩略图 */}
                <div className="relative h-48 bg-white/30 backdrop-blur-sm border-b border-white/30">
                    {template.thumbnail_url && !imageError ? (
                        <>
                            {imageLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-sm">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                </div>
                            )}
                            <img
                                src={template.thumbnail_url}
                                alt={template.name}
                                className={`w-full h-full object-contain transition-opacity duration-200 ${imageLoading ? 'opacity-0' : 'opacity-100'
                                    }`}
                                onLoad={() => setImageLoading(false)}
                                onError={() => {
                                    setImageError(true)
                                    setImageLoading(false)
                                }}
                            />
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                                {getTypeIcon(template.type)}
                                <p className="text-sm text-foreground/70 mt-2">
                                    {getTypeLabel(template.type)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 模板信息 */}
                <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-foreground truncate flex-1 mr-2">{template.name}</h3>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-white/30 backdrop-blur-sm rounded-md">
                                    <MoreHorizontal className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white/50 backdrop-blur-md border border-white/30 rounded-lg">
                                <DropdownMenuItem onClick={onApply} className="hover:bg-white/30 rounded-md">
                                    <Eye className="h-4 w-4 mr-2" />
                                    应用
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onEdit} className="hover:bg-white/30 rounded-md">
                                    <Edit3 className="h-4 w-4 mr-2" />
                                    编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onToggleFavorite} className="hover:bg-white/30 rounded-md">
                                    {template.is_favorite ? (
                                        <>
                                            <StarOff className="h-4 w-4 mr-2" />
                                            取消收藏
                                        </>
                                    ) : (
                                        <>
                                            <Star className="h-4 w-4 mr-2" />
                                            收藏
                                        </>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleCopyInfo} className="hover:bg-white/30 rounded-md">
                                    <Copy className="h-4 w-4 mr-2" />
                                    复制信息
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onDelete} className="hover:bg-white/30 rounded-md text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    删除
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {template.description && (
                        <p className="text-sm text-foreground/70 line-clamp-2 mb-3">
                            {template.description}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs bg-white/50 backdrop-blur-sm border border-white/30">
                            {getTypeLabel(template.type)}
                        </Badge>
                        {template.is_public && (
                            <Badge variant="outline" className="text-xs border-white/30">
                                公开
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-foreground/60">
                        <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {template.usage_count}
                        </div>
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(template.created_at)}
                        </div>
                    </div>

                    {/* 标签 */}
                    {template.tags && template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                            {template.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs border-white/30">
                                    {tag}
                                </Badge>
                            ))}
                            {template.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs border-white/30">
                                    +{template.tags.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
