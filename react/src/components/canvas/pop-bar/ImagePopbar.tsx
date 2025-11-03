import { ExcalidrawImageElement } from '@excalidraw/excalidraw/element/types'
import { ImageToolbar } from '../toolbar/ImageToolbar'

interface ImagePopbarProps {
  selectedElement: ExcalidrawImageElement
}

export function ImagePopbar({ selectedElement }: ImagePopbarProps) {
  return <ImageToolbar selectedElement={selectedElement} />
}

