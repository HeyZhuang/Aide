import { ExcalidrawTextElement } from '@excalidraw/excalidraw/element/types'
import { TextToolbar } from '../toolbar/TextToolbar'

interface TextPopbarProps {
  selectedElement: ExcalidrawTextElement
}

export function TextPopbar({ selectedElement }: TextPopbarProps) {
  return <TextToolbar selectedElement={selectedElement} />
}

