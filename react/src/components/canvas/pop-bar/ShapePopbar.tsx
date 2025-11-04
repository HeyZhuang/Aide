import {
  ExcalidrawRectangleElement,
  ExcalidrawEllipseElement,
  ExcalidrawDiamondElement,
  ExcalidrawLinearElement,
  ExcalidrawArrowElement
} from '@excalidraw/excalidraw/element/types'
import { ShapeToolbar } from '../toolbar/ShapeToolbar'

interface ShapePopbarProps {
  selectedElement: ExcalidrawRectangleElement | ExcalidrawEllipseElement | ExcalidrawDiamondElement | ExcalidrawLinearElement | ExcalidrawArrowElement
}

export function ShapePopbar({ selectedElement }: ShapePopbarProps) {
  return <ShapeToolbar selectedElement={selectedElement} />
}

