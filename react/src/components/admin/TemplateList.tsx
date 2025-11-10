import { useState } from 'react'
import { listTemplates, deleteTemplate } from '@/api/template'
import { BASE_API_URL } from '@/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Trash2, 
  Download, 
  Image as ImageIcon,
  FileText,
  Calendar,
  Tag
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function TemplateList() {
  const queryClient = useQueryClient()
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['templates', selectedCategory],
    queryFn: () => listTemplates(selectedCategory),
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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400">
        加载模板列表失败: {error instanceof Error ? error.message : '未知错误'}
      </div>
    )
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
          <FileText className="w-8 h-8 text-purple-300" />
        </div>
        <p className="text-slate-400 text-lg">暂无模板</p>
        <p className="text-slate-500 text-sm mt-2">上传第一个模板开始使用</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 模板网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card 
            key={template.id}
            className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 hover:bg-white/15 transition-all duration-300 overflow-hidden group"
          >
            <div className="relative h-48 bg-gradient-to-br from-purple-500/20 to-pink-500/20 overflow-hidden">
              {template.thumbnail_path ? (
                <img
                  src={`${BASE_API_URL}/api/templates/${template.id}/thumbnail`}
                  alt={template.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="w-16 h-16 text-purple-300/50" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <span className="px-2 py-1 text-xs rounded-full backdrop-blur-sm bg-black/50 text-white">
                  {template.file_type.toUpperCase()}
                </span>
              </div>
            </div>
            
            <CardHeader>
              <CardTitle className="text-white line-clamp-1">{template.name}</CardTitle>
              {template.description && (
                <CardDescription className="text-slate-400 line-clamp-2">
                  {template.description}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {/* 模板信息 */}
              <div className="space-y-2 text-sm text-slate-400">
                {template.category && (
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <span>{template.category}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(template.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-xs">
                  大小: {(template.file_size / 1024).toFixed(2)} KB
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                  className="flex-1 backdrop-blur-sm bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

