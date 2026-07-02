'use client'

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { AudioEngine } from './AudioEngine'
import { VolumeControl } from './VolumeControl'

// ── Context ──────────────────────────────────────────────────────────────

const AudioCtx = createContext<AudioEngine | null>(null)

/**
 * Access the shared AudioEngine.  Returns null during SSR (the provider is
 * a client component, so the first render on the server will not have it).
 */
export function useSharedAudio(): AudioEngine | null {
  return useContext(AudioCtx)
}

// ── Provider ─────────────────────────────────────────────────────────────

/**
 * Mount this once in the root layout.  It:
 * 1. Creates a single AudioEngine that lives for the entire page session
 * 2. Preloads background music
 * 3. Unlocks the AudioContext on the first user gesture (click/tap/keydown)
 * 4. Starts BGM looping as soon as the context is unlocked
 *
 * Children access the engine via `useSharedAudio()`.
 */
export function AudioProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<AudioEngine | null>(null)
  if (!engineRef.current) {
    engineRef.current = new AudioEngine()
  }
  const engine = engineRef.current
  const bgmStarted = useRef(false)
  const unlocked = useRef(false)

  // Preload BGM on mount
  useEffect(() => {
    engine.preload('bgm', '/audio/word-chain/bgm.mp3')
  }, [engine])

  // Unlock AudioContext on first user gesture, then start BGM
  useEffect(() => {
    function onGesture() {
      if (unlocked.current) return
      unlocked.current = true

      engine.unlock().then((running) => {
        if (running && !bgmStarted.current) {
          bgmStarted.current = true
          // Apply stored music volume before starting playback
          try {
            const stored = localStorage.getItem('h6p_vol_music')
            if (stored !== null) {
              const v = parseFloat(stored)
              if (!isNaN(v)) engine.setVolume('bgm', Math.max(0, Math.min(1, v)))
            }
          } catch { /* localStorage blocked */ }
          engine.playLoop('bgm', 800)
        }
      })

      // Remove listeners once unlocked — no need to keep listening
      cleanup()
    }

    function onKeydown(e: KeyboardEvent) {
      // Only count actual interaction keys, not modifier-only presses
      if (['Enter', 'Space', 'Escape', 'Tab'].includes(e.code) || e.code.startsWith('Key')) {
        onGesture()
      }
    }

    function cleanup() {
      document.removeEventListener('click', onGesture)
      document.removeEventListener('touchend', onGesture)
      document.removeEventListener('keydown', onKeydown)
    }

    document.addEventListener('click', onGesture)
    document.addEventListener('touchend', onGesture)
    document.addEventListener('keydown', onKeydown)

    return cleanup
  }, [engine])

  // Cleanup on unmount (effectively never at root layout level, but safe)
  useEffect(() => {
    return () => {
      engine.destroy()
    }
  }, [engine])

  return (
    <AudioCtx.Provider value={engine}>
      {children}
      <VolumeControl />
    </AudioCtx.Provider>
  )
}
