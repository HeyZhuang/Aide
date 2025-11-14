/**
 * Template API Client
 * 模板管理API客户端
 */
import { getAccessToken } from './auth'

// 使用相对路径，通过前端服务器代理到后端
// 如果设置了 VITE_API_URL 且不为空，使用它；否则使用相对路径
const BASE_API_URL = import.meta.env.VITE_API_URL || ''

// 辅助函数：构建API URL
function buildApiUrl(path: string): string {
    if (BASE_API_URL) {
        return `${BASE_API_URL}${path}`
    }
    return path
}

export interface Template {
    id: string
    name: string
    description?: string
    file_path?: string
    file_type: string
    file_size: number
    thumbnail_path?: string
    category?: string
    tags?: string
    created_by: string
    created_at: string
    updated_at: string
}

export interface UploadTemplateRequest {
    file: File
    name: string
    description?: string
    category?: string
    tags?: string
}

/**
 * 获取模板列表
 */
export async function listTemplates(category?: string): Promise<Template[]> {
    const token = getAccessToken()
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const url = new URL(buildApiUrl('/api/templates'), BASE_API_URL ? undefined : window.location.origin)
    if (category) {
        url.searchParams.append('category', category)
    }

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
    })

    if (!response.ok) {
        throw new Error(`获取模板列表失败: ${response.statusText}`)
    }

    return response.json()
}

/**
 * 获取模板详情
 */
export async function getTemplate(templateId: string): Promise<Template> {
    const token = getAccessToken()
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(buildApiUrl(`/api/templates/${templateId}`), {
        method: 'GET',
        headers,
    })

    if (!response.ok) {
        throw new Error(`获取模板详情失败: ${response.statusText}`)
    }

    return response.json()
}

/**
 * 上传模板（仅管理员）
 */
export async function uploadTemplate(request: UploadTemplateRequest): Promise<Template> {
    const token = getAccessToken()

    if (!token) {
        throw new Error('请先登录')
    }

    const formData = new FormData()
    formData.append('file', request.file)
    formData.append('name', request.name)

    if (request.description) {
        formData.append('description', request.description)
    }
    if (request.category) {
        formData.append('category', request.category)
    }
    if (request.tags) {
        formData.append('tags', request.tags)
    }

    const response = await fetch(buildApiUrl('/api/templates/upload'), {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: '上传失败' }))
        throw new Error(error.detail || `上传模板失败: ${response.statusText}`)
    }

    return response.json()
}

/**
 * 下载模板（仅注册用户）
 */
export async function downloadTemplate(templateId: string): Promise<Blob> {
    const token = getAccessToken()

    if (!token) {
        throw new Error('请先登录')
    }

    const response = await fetch(buildApiUrl(`/api/templates/${templateId}/download`), {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    })

    if (!response.ok) {
        throw new Error(`下载模板失败: ${response.statusText}`)
    }

    return response.blob()
}

/**
 * 获取模板缩略图
 */
export async function getTemplateThumbnail(templateId: string): Promise<string> {
    const token = getAccessToken()
    const headers: HeadersInit = {}

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    return buildApiUrl(`/api/templates/${templateId}/thumbnail`)
}

/**
 * 删除模板（仅管理员）
 */
export async function deleteTemplate(templateId: string): Promise<void> {
    const token = getAccessToken()

    if (!token) {
        throw new Error('请先登录')
    }

    const response = await fetch(buildApiUrl(`/api/templates/${templateId}`), {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: '删除失败' }))
        throw new Error(error.detail || `删除模板失败: ${response.statusText}`)
    }
}

/**
 * 获取模板分类列表
 */
export interface TemplateCategory {
    id: string
    name: string
    description?: string
    icon?: string
    color?: string
    created_at: string
    updated_at: string
}

export async function getTemplateCategories(): Promise<TemplateCategory[]> {
    const token = getAccessToken()
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(buildApiUrl('/api/templates/categories'), {
        method: 'GET',
        headers,
    })

    if (!response.ok) {
        // 如果接口不存在，返回空数组
        if (response.status === 404) {
            return []
        }
        throw new Error(`获取模板分类失败: ${response.statusText}`)
    }

    const categories = await response.json()
    // 确保所有分类都有 created_at 和 updated_at
    return categories.map((cat: any) => ({
        ...cat,
        created_at: cat.created_at || new Date().toISOString(),
        updated_at: cat.updated_at || new Date().toISOString(),
    }))
}

/**
 * 获取模板列表（支持过滤）
 */
export interface GetTemplatesParams {
    category?: string
    is_favorite?: boolean
    search?: string
}

export async function getTemplates(params?: GetTemplatesParams): Promise<Template[]> {
    const token = getAccessToken()
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const url = new URL(buildApiUrl('/api/templates'), BASE_API_URL ? undefined : window.location.origin)
    if (params) {
        if (params.category) {
            url.searchParams.append('category', params.category)
        }
        if (params.is_favorite !== undefined) {
            url.searchParams.append('is_favorite', String(params.is_favorite))
        }
        if (params.search) {
            url.searchParams.append('search', params.search)
        }
    }

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
    })

    if (!response.ok) {
        throw new Error(`获取模板列表失败: ${response.statusText}`)
    }

    return response.json()
}

/**
 * 获取模板统计信息
 */
export interface TemplateStats {
    total: number
    by_category: Record<string, number>
    favorites: number
    recent: number
}

export async function getTemplateStats(): Promise<TemplateStats> {
    const token = getAccessToken()
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(buildApiUrl('/api/templates/stats'), {
        method: 'GET',
        headers,
    })

    if (!response.ok) {
        // 如果接口不存在，返回默认值
        if (response.status === 404) {
            return {
                total: 0,
                by_category: {},
                favorites: 0,
                recent: 0,
            }
        }
        throw new Error(`获取模板统计失败: ${response.statusText}`)
    }

    return response.json()
}
