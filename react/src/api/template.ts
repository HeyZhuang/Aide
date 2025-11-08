/**
 * Template API Client
 * 模板管理API客户端
 */
import { getAccessToken } from './auth'

const BASE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:57988'

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

    const url = new URL(`${BASE_API_URL}/api/templates`)
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

    const response = await fetch(`${BASE_API_URL}/api/templates/${templateId}`, {
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

    const response = await fetch(`${BASE_API_URL}/api/templates/upload`, {
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

    const response = await fetch(`${BASE_API_URL}/api/templates/${templateId}/download`, {
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

    return `${BASE_API_URL}/api/templates/${templateId}/thumbnail`
}

/**
 * 删除模板（仅管理员）
 */
export async function deleteTemplate(templateId: string): Promise<void> {
    const token = getAccessToken()

    if (!token) {
        throw new Error('请先登录')
    }

    const response = await fetch(`${BASE_API_URL}/api/templates/${templateId}`, {
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
