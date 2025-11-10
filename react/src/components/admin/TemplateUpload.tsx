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
    <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Upload className="w-5 h-5" />
          上传模板
        </CardTitle>
        <CardDescription className="text-slate-400">
          支持 PSD、JSON、PNG、JPG、SVG 等格式
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 文件选择 */}
          <div className="space-y-2">
            <Label htmlFor="file" className="text-white">
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
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/30 rounded-lg cursor-pointer hover:bg-white/5 transition-colors backdrop-blur-sm bg-white/5"
              >
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-purple-300" />
                    <span className="text-sm text-white">{file.name}</span>
                    <span className="text-xs text-slate-400">
                      {(file.size / 1024).toFixed(2)} KB
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-slate-400" />
                    <span className="text-sm text-slate-400">点击选择文件或拖拽到此处</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* 模板名称 */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">
              模板名称 <span className="text-red-400">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入模板名称"
              required
              className="backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder:text-slate-500"
            />
          </div>

          {/* 描述 */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">
              描述
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入模板描述（可选）"
              rows={3}
              className="backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder:text-slate-500"
            />
          </div>

          {/* 分类 */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-white">
              分类
            </Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="例如：UI设计、图标、插画等（可选）"
              className="backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder:text-slate-500"
            />
          </div>

          {/* 标签 */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-white">
              标签
            </Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="用逗号分隔多个标签（可选）"
              className="backdrop-blur-sm bg-white/10 border-white/20 text-white placeholder:text-slate-500"
            />
          </div>

          {/* 提交按钮 */}
          <Button
            type="submit"
            disabled={uploadMutation.isPending || !file || !name.trim()}
            className="w-full backdrop-blur-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
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
  )
}



