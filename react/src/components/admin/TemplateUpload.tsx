import { useState } from 'react'
import { uploadTemplate, UploadTemplateRequest } from '@/api/template'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

interface TemplateUploadProps {
  onUploadSuccess?: () => void
}

export function TemplateUpload({ onUploadSuccess }: TemplateUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')

  const uploadMutation = useMutation({
    mutationFn: (data: UploadTemplateRequest) => uploadTemplate(data),
    onSuccess: () => {
      toast.success('模板上传成功！')
      // 重置表单
      setFile(null)
      setName('')
      setDescription('')
      setCategory('')
      setTags('')
      onUploadSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(`上传失败: ${error.message}`)
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!name) {
        // 自动填充名称（去除扩展名）
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '')
        setName(nameWithoutExt)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      toast.error('请选择要上传的文件')
      return
    }

    if (!name.trim()) {
      toast.error('请输入模板名称')
      return
    }

    uploadMutation.mutate({
      file,
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      tags: tags.trim() || undefined,
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className={cn(
        'bg-white dark:bg-card border-gray-200 dark:border-border',
        'shadow-sm'
      )}>
        <CardHeader className="p-5 pb-3">
          <CardTitle className={cn(
            'text-lg flex items-center gap-2.5 font-bold',
            'text-gray-900 dark:text-foreground'
          )}>
            <Upload className="w-5 h-5" />
            上传模板
          </CardTitle>
          <CardDescription className={cn(
            'text-sm mt-1',
            'text-gray-600 dark:text-muted-foreground'
          )}>
            支持 PSD、JSON、PNG、JPG、SVG 等格式
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 文件选择 */}
            <div className="space-y-2">
              <Label htmlFor="file" className={cn(
                'text-sm font-semibold',
                'text-gray-900 dark:text-foreground'
              )}>
                选择文件
              </Label>
              <div className="relative">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".psd,.json,.png,.jpg,.jpeg,.svg"
                  className="hidden"
                />
                <label
                  htmlFor="file"
                  className={cn(
                    'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all',
                    'border-gray-300 dark:border-border',
                    'hover:bg-gray-50 dark:hover:bg-secondary/50',
                    'bg-gray-50/50 dark:bg-secondary/20',
                    'hover:border-blue-400 dark:hover:border-blue-600'
                  )}
                >
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      <span className={cn(
                        'text-base font-semibold',
                        'text-gray-900 dark:text-foreground'
                      )}>{file.name}</span>
                      <span className={cn(
                        'text-sm',
                        'text-gray-600 dark:text-muted-foreground'
                      )}>
                        {(file.size / 1024).toFixed(2)} KB
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400 dark:text-muted-foreground" />
                      <span className={cn(
                        'text-base font-medium',
                        'text-gray-700 dark:text-muted-foreground'
                      )}>点击选择文件或拖拽到此处</span>
                      <span className={cn(
                        'text-sm',
                        'text-gray-500 dark:text-muted-foreground/80'
                      )}>支持 PSD, JSON, PNG, JPG, SVG</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* 模板名称 */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-900 dark:text-foreground">
                模板名称 <span className="text-red-600 dark:text-red-400">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入模板名称"
                required
                className="h-9 text-sm"
              />
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-gray-900 dark:text-foreground">
                描述
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请输入模板描述（可选）"
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 分类 */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-semibold text-gray-900 dark:text-foreground">
                  分类
                </Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="例如：UI设计、图标等"
                  className="h-9 text-sm"
                />
              </div>

              {/* 标签 */}
              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-semibold text-gray-900 dark:text-foreground">
                  标签
                </Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="用逗号分隔多个标签"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* 提交按钮 */}
            <Button
              type="submit"
              disabled={uploadMutation.isPending || !file || !name.trim()}
              className={cn(
                'w-full h-10 text-sm font-semibold',
                'bg-gradient-to-r from-blue-600 to-blue-700',
                'hover:from-blue-700 hover:to-blue-800',
                'text-white shadow-sm',
                'transition-all'
              )}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  上传模板
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}



