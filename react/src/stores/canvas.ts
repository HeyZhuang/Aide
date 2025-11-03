import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { create } from 'zustand'

type CanvasStore = {
  canvasId: string
  excalidrawAPI: ExcalidrawImperativeAPI | null
  // Overlay状态管理
  overlayLoading: boolean
  overlayMessage: string | null
  overlayType: 'loading' | 'success' | 'error'

  setCanvasId: (canvasId: string) => void
  setExcalidrawAPI: (excalidrawAPI: ExcalidrawImperativeAPI) => void
  setOverlay: (loading: boolean, message: string | null, type?: 'loading' | 'success' | 'error') => void
  clearOverlay: () => void
}

const useCanvasStore = create<CanvasStore>((set) => ({
  canvasId: '',
  excalidrawAPI: null,
  overlayLoading: false,
  overlayMessage: null,
  overlayType: 'loading',

  setCanvasId: (canvasId) => set({ canvasId }),
  setExcalidrawAPI: (excalidrawAPI) => set({ excalidrawAPI }),
  setOverlay: (loading, message, type = 'loading') => set({ 
    overlayLoading: loading, 
    overlayMessage: message, 
    overlayType: type 
  }),
  clearOverlay: () => set({ 
    overlayLoading: false, 
    overlayMessage: null, 
    overlayType: 'loading' 
  }),
}))

export default useCanvasStore
