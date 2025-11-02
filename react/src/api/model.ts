export type ModelInfo = {
  provider: string
  model: string
  type: 'text' | 'image' | 'tool' | 'video'
  url: string
}

export type ToolInfo = {
  provider: string
  id: string
  display_name?: string | null
  type?: 'image' | 'tool' | 'video'
}

export async function listModels(): Promise<{
  llm: ModelInfo[]
  tools: ToolInfo[]
}> {
  const modelsResp = await fetch('/api/list_models')
    .then((res) => {
      if (!res.ok) {
        console.error(`list_models API returned ${res.status}: ${res.statusText}`)
        return []
      }
      return res.json().then((data) => {
        // 确保返回的是数组，如果不是则返回空数组
        return Array.isArray(data) ? data : []
      })
    })
    .catch((err) => {
      console.error('Error fetching list_models:', err)
      return []
    })
  const toolsResp = await fetch('/api/list_tools')
    .then((res) => {
      if (!res.ok) {
        console.error(`list_tools API returned ${res.status}: ${res.statusText}`)
        return []
      }
      return res.json().then((data) => {
        // 确保返回的是数组，如果不是则返回空数组
        return Array.isArray(data) ? data : []
      })
    })
    .catch((err) => {
      console.error('Error fetching list_tools:', err)
      return []
    })

  return {
    llm: modelsResp,
    tools: toolsResp,
  }
}
