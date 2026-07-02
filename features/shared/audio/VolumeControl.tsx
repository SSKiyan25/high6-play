'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { useSharedAudio } from './AudioProvider'

// ── Constants ────────────────────────────────────────────────────────────

const VOLUME_GROUPS = {
  music: {
    label: 'Music',
    layers: ['bgm'],
    storageKey: 'h6p_vol_music',
    default: 0.6,
  },
  timer: {
    label: 'Timer',
    layers: ['timer'],
    storageKey: 'h6p_vol_timer',
    default: 0.8,
  },
  sfx: {
    label: 'SFX',
    layers: ['skipped', 'eliminated', 'passed', 'times-up'],
    storageKey: 'h6p_vol_sfx',
    default: 1.0,
  },
} as const

type VolumeGroup = keyof typeof VOLUME_GROUPS

function readStoredVolume(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      const v = parseFloat(raw)
      if (!isNaN(v)) return Math.max(0, Math.min(1, v))
    }
  } catch { /* localStorage blocked */ }
  return fallback
}

function writeStoredVolume(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(Math.round(value * 100) / 100))
  } catch { /* localStorage blocked */ }
}

// ── Component ────────────────────────────────────────────────────────────

export function VolumeControl() {
  const engine = useSharedAudio()
  const [open, setOpen] = useState(false)
  const [volumes, setVolumes] = useState<Record<VolumeGroup, number>>(() => ({
    music: readStoredVolume('h6p_vol_music', 0.6),
    timer: readStoredVolume('h6p_vol_timer', 0.8),
    sfx: readStoredVolume('h6p_vol_sfx', 1.0),
  }))
  const panelRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  // Apply stored volumes to engine once it's available
  useEffect(() => {
    if (!engine || initialized.current) return
    initialized.current = true
    for (const [group, cfg] of Object.entries(VOLUME_GROUPS)) {
      const v = volumes[group as VolumeGroup]
      for (const layer of cfg.layers) {
        engine.setVolume(layer, v)
      }
    }
  }, [engine, volumes])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const handleChange = useCallback(
    (group: VolumeGroup, value: number) => {
      setVolumes((prev) => ({ ...prev, [group]: value }))
      writeStoredVolume(VOLUME_GROUPS[group].storageKey, value)
      if (engine) {
        for (const layer of VOLUME_GROUPS[group].layers) {
          engine.setVolume(layer, value)
        }
      }
    },
    [engine],
  )

  // Don't render anything until client-side hydration (engine is null during SSR)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  // Muted state for icon — muted if all groups are at 0
  const allMuted = Object.values(volumes).every((v) => v === 0)

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Popover */}
      {open && (
        <div className="w-56 rounded-xl border border-border/40 bg-card/95 backdrop-blur-sm px-4 py-3 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <p className="mb-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Volume
          </p>
          {(
            Object.entries(VOLUME_GROUPS) as [VolumeGroup, (typeof VOLUME_GROUPS)[VolumeGroup]][]
          ).map(([group, cfg]) => (
            <div key={group} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor={`vol-${group}`}
                  className="text-xs font-medium text-foreground/80"
                >
                  {cfg.label}
                </label>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {Math.round(volumes[group] * 100)}%
                </span>
              </div>
              <input
                id={`vol-${group}`}
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volumes[group]}
                onChange={(e) => handleChange(group, parseFloat(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border/40
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:size-3.5
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-primary
                           [&::-webkit-slider-thumb]:shadow-md
                           [&::-webkit-slider-thumb]:cursor-pointer
                           [&::-moz-range-thumb]:size-3.5
                           [&::-moz-range-thumb]:rounded-full
                           [&::-moz-range-thumb]:border-0
                           [&::-moz-range-thumb]:bg-primary
                           [&::-moz-range-thumb]:cursor-pointer"
              />
            </div>
          ))}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`
          flex size-10 items-center justify-center rounded-full
          border border-border/30 bg-card/80 backdrop-blur-sm
          text-muted-foreground shadow-lg
          transition-all duration-200
          hover:border-border/60 hover:text-foreground hover:bg-card
          ${open ? 'text-foreground border-primary/40 bg-card' : 'opacity-60 hover:opacity-100'}
        `}
        aria-label={open ? 'Close volume controls' : 'Open volume controls'}
        title="Volume"
      >
        {allMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
    </div>
  )
}
