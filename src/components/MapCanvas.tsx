import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  DeploymentZone,
  MapConfig,
  PlacedPiece,
  TerrainPiece,
} from '../types/terrain'
import {
  getPieceDef,
  pointHitsPiece,
  rotationHandlePos,
} from '../utils/geometry'
import { inchesToPx, pxToInches } from '../utils/inches'

interface MapCanvasProps {
  map: MapConfig
  library: TerrainPiece[]
  pieces: PlacedPiece[]
  selectedIds: string[]
  showGrid: boolean
  deployment: DeploymentZone
  interactive?: boolean
  onSelect: (instanceId: string | null, additive?: boolean) => void
  onMove: (instanceId: string, x: number, y: number) => void
  onRotatePiece: (instanceId: string, rotation: number) => void
}

type DragKind =
  | { type: 'piece'; id: string; offsetX: number; offsetY: number }
  | { type: 'rotate'; id: string }

/** Minimum touch-friendly hit radius in CSS pixels (~44px finger target). */
const HANDLE_HIT_CSS_PX = 28
const HANDLE_VISUAL_CSS_PX = 14

function cssPxPerMapInch(canvas: HTMLCanvasElement, mapWidthIn: number): number {
  const rect = canvas.getBoundingClientRect()
  return rect.width / mapWidthIn
}

function hitRadiusInches(canvas: HTMLCanvasElement, mapWidthIn: number, cssPx: number): number {
  return cssPx / cssPxPerMapInch(canvas, mapWidthIn)
}

function hitTest(
  library: TerrainPiece[],
  pieces: PlacedPiece[],
  xIn: number,
  yIn: number,
): string | null {
  for (let i = pieces.length - 1; i >= 0; i--) {
    const p = pieces[i]
    const def = getPieceDef(library, p.pieceId)
    if (!def) continue
    if (pointHitsPiece(xIn, yIn, p, def)) return p.instanceId
  }
  return null
}

function angleFromCenter(
  cx: number,
  cy: number,
  xIn: number,
  yIn: number,
): number {
  // 0° = up (negative Y), clockwise positive to match canvas rotate
  const rad = Math.atan2(xIn - cx, -(yIn - cy))
  let deg = (rad * 180) / Math.PI
  if (deg < 0) deg += 360
  return deg
}

export function MapCanvas({
  map,
  library,
  pieces,
  selectedIds,
  showGrid,
  deployment,
  interactive = true,
  onSelect,
  onMove,
  onRotatePiece,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drag, setDrag] = useState<DragKind | null>(null)
  const [overlayLabel, setOverlayLabel] = useState<string | null>(null)

  const widthPx = inchesToPx(map.widthIn)
  const heightPx = inchesToPx(map.heightIn)
  const singleSelected =
    selectedIds.length === 1
      ? pieces.find((p) => p.instanceId === selectedIds[0])
      : undefined

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const selectedSet = new Set(selectedIds)

    ctx.clearRect(0, 0, widthPx, heightPx)

    ctx.fillStyle = '#c4b89a'
    ctx.fillRect(0, 0, widthPx, heightPx)

    // Border buffer (placement forbidden)
    if (map.borderBufferIn > 0) {
      const b = inchesToPx(map.borderBufferIn)
      ctx.fillStyle = 'rgba(60, 50, 40, 0.12)'
      ctx.fillRect(0, 0, widthPx, b)
      ctx.fillRect(0, heightPx - b, widthPx, b)
      ctx.fillRect(0, b, b, heightPx - 2 * b)
      ctx.fillRect(widthPx - b, b, b, heightPx - 2 * b)
    }

    if (deployment.visible) {
      const dPx = inchesToPx(deployment.depthIn)
      ctx.fillStyle = 'rgba(200, 60, 60, 0.28)'
      if (deployment.axis === 'NS') {
        ctx.fillRect(0, 0, widthPx, dPx)
        ctx.fillStyle = 'rgba(50, 90, 200, 0.28)'
        ctx.fillRect(0, heightPx - dPx, widthPx, dPx)
      } else {
        ctx.fillRect(0, 0, dPx, heightPx)
        ctx.fillStyle = 'rgba(50, 90, 200, 0.28)'
        ctx.fillRect(widthPx - dPx, 0, dPx, heightPx)
      }

      ctx.strokeStyle = 'rgba(40, 40, 40, 0.55)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      if (deployment.axis === 'NS') {
        ctx.moveTo(0, dPx)
        ctx.lineTo(widthPx, dPx)
        ctx.moveTo(0, heightPx - dPx)
        ctx.lineTo(widthPx, heightPx - dPx)
      } else {
        ctx.moveTo(dPx, 0)
        ctx.lineTo(dPx, heightPx)
        ctx.moveTo(widthPx - dPx, 0)
        ctx.lineTo(widthPx - dPx, heightPx)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    if (showGrid) {
      ctx.strokeStyle = 'rgba(80, 70, 55, 0.22)'
      ctx.lineWidth = 1
      const step = inchesToPx(12)
      for (let x = step; x < widthPx; x += step) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, heightPx)
        ctx.stroke()
      }
      for (let y = step; y < heightPx; y += step) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(widthPx, y)
        ctx.stroke()
      }
      ctx.save()
      ctx.font = '10px system-ui, sans-serif'
      ctx.fillStyle = 'rgba(45, 40, 32, 0.72)'
      ctx.textBaseline = 'top'
      for (let x = 0; x <= widthPx; x += step) {
        ctx.fillText("X " + Math.round(pxToInches(x)) + "″", Math.min(x + 4, widthPx - 38), 4)
      }
      for (let y = step; y <= heightPx; y += step) {
        ctx.fillText("Y " + Math.round(pxToInches(y)) + "″", 4, Math.min(y + 3, heightPx - 14))
      }
      ctx.restore()
    }

    for (const p of pieces) {
      const def = getPieceDef(library, p.pieceId)
      if (!def) continue
      const cx = inchesToPx(p.x)
      const cy = inchesToPx(p.y)
      const w = inchesToPx(def.footprint.width)
      const h = inchesToPx(def.footprint.depth)
      const selected = selectedSet.has(p.instanceId)

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.fillStyle = def.color
      ctx.fillRect(-w / 2, -h / 2, w, h)
      if (selected) {
        ctx.strokeStyle = '#1a1a1a'
        ctx.lineWidth = 2.5
      } else {
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.lineWidth = 1
      }
      ctx.strokeRect(-w / 2, -h / 2, w, h)

      if (def.hasSecondFloor && def.secondFloor) {
        const upperW = inchesToPx(def.secondFloor.width)
        const upperH = inchesToPx(def.secondFloor.depth)
        const upperX = inchesToPx(def.secondFloor.offsetX)
        const upperY = inchesToPx(def.secondFloor.offsetY)
        ctx.fillStyle = 'rgba(255, 250, 225, 0.48)'
        ctx.fillRect(upperX - upperW / 2, upperY - upperH / 2, upperW, upperH)
        ctx.strokeStyle = 'rgba(255, 255, 245, 0.95)'
        ctx.lineWidth = 2
        ctx.strokeRect(upperX - upperW / 2, upperY - upperH / 2, upperW, upperH)
        ctx.beginPath()
        ctx.moveTo(upperX - upperW / 2 + 3, upperY - upperH / 2 + 3)
        ctx.lineTo(upperX + upperW / 2 - 3, upperY + upperH / 2 - 3)
        ctx.moveTo(upperX + upperW / 2 - 3, upperY - upperH / 2 + 3)
        ctx.lineTo(upperX - upperW / 2 + 3, upperY + upperH / 2 - 3)
        ctx.stroke()
      }

      if (def.hasLadder && def.ladderPosition) {
        const ladder = def.ladderPosition
        const marker = inchesToPx(0.8)
        const lx = inchesToPx(ladder.x)
        const ly = inchesToPx(ladder.y)
        ctx.strokeStyle = '#f5c542'
        ctx.lineWidth = 5
        ctx.lineCap = 'round'
        ctx.beginPath()
        if (ladder.side === 'N' || ladder.side === 'S') {
          const edgeY = ladder.side === 'N' ? -h / 2 : h / 2
          const edgeX = Math.max(-w / 2 + marker / 2, Math.min(w / 2 - marker / 2, lx))
          ctx.moveTo(edgeX - marker / 2, edgeY)
          ctx.lineTo(edgeX + marker / 2, edgeY)
        } else {
          const edgeX = ladder.side === 'W' ? -w / 2 : w / 2
          const edgeY = Math.max(-h / 2 + marker / 2, Math.min(h / 2 - marker / 2, ly))
          ctx.moveTo(edgeX, edgeY - marker / 2)
          ctx.lineTo(edgeX, edgeY + marker / 2)
        }
        ctx.stroke()
        ctx.lineCap = 'butt'
      }

      if (p.locked) {
        ctx.fillStyle = 'rgba(255, 220, 80, 0.95)'
        ctx.beginPath()
        ctx.arc(-w / 2 + 8, -h / 2 + 8, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#333'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      ctx.restore()
    }

    // Rotation handle for single selection (size scales with display so mobile stays tappable)
    if (interactive && singleSelected) {
      const def = getPieceDef(library, singleSelected.pieceId)
      if (def) {
        const handle = rotationHandlePos(singleSelected, def)
        const hx = inchesToPx(handle.x)
        const hy = inchesToPx(handle.y)
        const cx = inchesToPx(singleSelected.x)
        const cy = inchesToPx(singleSelected.y)
        const canvas = canvasRef.current
        const displayScale = canvas
          ? canvas.getBoundingClientRect().width / canvas.width
          : 1
        const handleR = Math.max(
          inchesToPx(0.45),
          HANDLE_VISUAL_CSS_PX / Math.max(displayScale, 0.01),
        )

        ctx.strokeStyle = 'rgba(30, 30, 30, 0.7)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(hx, hy)
        ctx.stroke()

        ctx.fillStyle = '#2d5a3d'
        ctx.beginPath()
        ctx.arc(hx, hy, handleR, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    if (overlayLabel) {
      ctx.fillStyle = 'rgba(20, 20, 20, 0.75)'
      const pad = 8
      ctx.font = '13px system-ui, sans-serif'
      const metrics = ctx.measureText(overlayLabel)
      const tw = metrics.width + pad * 2
      const th = 24
      const tx = widthPx / 2 - tw / 2
      const ty = heightPx / 2 - th / 2
      ctx.fillRect(tx, ty, tw, th)
      ctx.fillStyle = '#fff'
      ctx.fillText(overlayLabel, tx + pad, ty + 16)
    }

    ctx.strokeStyle = '#3a3428'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, widthPx - 2, heightPx - 2)
  }, [
    deployment,
    interactive,
    heightPx,
    library,
    map.borderBufferIn,
    overlayLabel,
    pieces,
    selectedIds,
    showGrid,
    singleSelected,
    widthPx,
  ])

  useEffect(() => {
    draw()
  }, [draw])

  const clientToInches = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const px = (clientX - rect.left) * scaleX
    const py = (clientY - rect.top) * scaleY
    return { xIn: pxToInches(px), yIn: pxToInches(py) }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = e.currentTarget
    const { xIn, yIn } = clientToInches(e.clientX, e.clientY)
    const additive = e.shiftKey || e.ctrlKey || e.metaKey
    const handleHitIn = hitRadiusInches(canvas, map.widthIn, HANDLE_HIT_CSS_PX)

    // Rotation handle first (single select)
    if (singleSelected && !additive) {
      const def = getPieceDef(library, singleSelected.pieceId)
      if (def) {
        const handle = rotationHandlePos(singleSelected, def)
        const dx = xIn - handle.x
        const dy = yIn - handle.y
        if (dx * dx + dy * dy <= handleHitIn * handleHitIn) {
          canvas.setPointerCapture(e.pointerId)
          setDrag({ type: 'rotate', id: singleSelected.instanceId })
          setOverlayLabel(`각도 ${singleSelected.rotation.toFixed(0)}°`)
          return
        }
      }
    }

    const hit = hitTest(library, pieces, xIn, yIn)
    if (additive) {
      onSelect(hit, true)
      return
    }
    if (!hit || !selectedIds.includes(hit)) onSelect(hit, false)
    if (hit) {
      const p = pieces.find((x) => x.instanceId === hit)!
      canvas.setPointerCapture(e.pointerId)
      setDrag({
        type: 'piece',
        id: hit,
        offsetX: xIn - p.x,
        offsetY: yIn - p.y,
      })
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag) return
    e.preventDefault()
    const { xIn, yIn } = clientToInches(e.clientX, e.clientY)

    if (drag.type === 'piece') {
      onMove(drag.id, xIn - drag.offsetX, yIn - drag.offsetY)
      return
    }

    if (drag.type === 'rotate') {
      const p = pieces.find((x) => x.instanceId === drag.id)
      if (!p) return
      const deg = angleFromCenter(p.x, p.y, xIn, yIn)
      onRotatePiece(drag.id, deg)
      setOverlayLabel(`각도 ${deg.toFixed(0)}°`)
      return
    }

  }

  const endDrag = () => {
    setDrag(null)
    setOverlayLabel(null)
  }

  return (
    <div className="map-wrap">
      <canvas
        ref={canvasRef}
        className="map-canvas"
        width={widthPx}
        height={heightPx}
        onPointerDown={interactive ? onPointerDown : undefined}
        onPointerMove={interactive ? onPointerMove : undefined}
        onPointerUp={interactive ? endDrag : undefined}
        onPointerCancel={interactive ? endDrag : undefined}
      />
    </div>
  )
}
