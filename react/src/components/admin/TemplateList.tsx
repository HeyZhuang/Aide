import { useState } from 'react'
import { listTemplates, deleteTemplate } from '@/api/template'
import { BASE_API_URL } from '@/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Trash2,
  Image as ImageIcon,
  FileText,
  Calendar,
  Tag
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export function TemplateList() {
  const queryClient = useQueryClient()
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['templates', selectedCategory],
    queryFn: () => listTemplates(selectedCategory),
    retry: 1,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('模板已删除')
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`)
    },
  })

  const handleDelete = async (templateId: string) => {
    if (!confirm('确定要删除这个模板吗？')) {
      return
    }
    deleteMutation.mutate(templateId)
  }

  if (isLoading) {
    console.log('TemplateList: Loading templates...')
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    console.error('TemplateList: Error loading templates:', error)
    return (
      <div className={cn(
        'text-center py-12',
        'text-red-600 dark:text-red-400'
      )}>
        加载模板列表失败: {error instanceof Error ? error.message : '未知错误'}
      </div>
    )
  }

  console.log('TemplateList: Templates loaded:', templates)

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className={cn(
          'inline-flex items-center justify-center w-12 h-12 rounded-full mb-3',
          'bg-blue-100 dark:bg-blue-900/20'
        )}>
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <p className={cn(
          'text-base font-medium',
          'text-gray-900 dark:text-foreground'
        )}>暂无模板</p>
        <p className={cn(
          'text-sm mt-1',
          'text-gray-600 dark:text-muted-foreground'
        )}>上传第一个模板开始使用</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 模板网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={cn(
              'overflow-hidden group transition-all',
              'bg-white dark:bg-card border-gray-200 dark:border-border',
              'hover:shadow-lg hover:border-gray-400 dark:hover:border-primary/40'
            )}
          >
            <div className={cn(
              'relative h-40 overflow-hidden',
              'bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-500/20 dark:to-blue-500/20'
            )}>
              {template.thumbnail_path ? (
                <img
                  src={`${BASE_API_URL}/api/templates/${template.id}/thumbnail`}
                  alt={template.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <span className={cn(
                  'px-2 py-0.5 text-xs rounded-md font-medium',
                  'bg-black/50 backdrop-blur-sm text-white'
                )}>
                  {template.file_type.toUpperCase()}
                </span>
              </div>
            </div>

            <CardHeader className="p-4">
              <CardTitle className={cn(
                'text-sm line-clamp-1',
                'text-gray-900 dark:text-foreground'
              )}>{template.name}</CardTitle>
              {template.description && (
                <CardDescription className={cn(
                  'text-xs line-clamp-2',
                  'text-gray-600 dark:text-muted-foreground'
                )}>
                  {template.description}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="p-4 pt-0 space-y-3">
              {/* 模板信息 */}
              <div className={cn(
                'space-y-1.5 text-xs',
                'text-gray-600 dark:text-muted-foreground'
              )}>
                {template.category && (
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{template.category}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(template.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-xs">
                  大小: {(template.file_size / 1024).toFixed(2)} KB
                </div>
              </div>

              {/* 操作按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(template.id)}
                className={cn(
                  'w-full h-8',
                  'border-red-200 dark:border-red-900/30',
                  'text-red-600 dark:text-red-400',
                  'hover:bg-red-50 dark:hover:bg-red-900/20'
                )}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                删除
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

