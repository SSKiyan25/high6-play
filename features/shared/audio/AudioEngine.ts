// ── AudioEngine — reusable Web Audio API wrapper ──────────────────────────
//
// Designed for layered game audio: background music loops, timer tension
// loops, and one-shot SFX — each on its own GainNode for independent
// volume / fade / duck control.
//
// Not coupled to any game or framework.  One instance per screen
// (host / player).  Call destroy() on unmount to release the AudioContext.

type LayerKind = 'loop' | 'one-shot'

interface LayerState {
  gain: GainNode
  source: AudioBufferSourceNode | null
  kind: LayerKind
  /** Active one-shot sources — tracked so they can be force-stopped. */
  activeSources: Set<AudioBufferSourceNode>
}

interface DuckTask {
  layer: string
  originalGain: number
  timeoutId: ReturnType<typeof setTimeout>
}

const DEFAULT_FADE = {
  sfxIn: 0.01,          // one-shot attacks are instant (sound-file dependent)
  sfxOut: 0.3,
  bgmStop: 1.0,
  timerStop: 0.15,
  duckAmount: 0.3,
  duckDurationMs: 1500,
} as const

export class AudioEngine {
  private ctx: AudioContext | null = null
  private layers = new Map<string, LayerState>()
  private buffers = new Map<string, AudioBuffer>()
  private _destroyed = false
  private activeDucks = new Map<string, DuckTask>()
  private missingLogged = new Set<string>()
  private pendingPreloads = new Map<string, Promise<void>>()

  // ── Lifecycle ──────────────────────────────────────────────────────────

  /** Returns the AudioContext, creating it lazily on first access. */
  private getCtx(): AudioContext | null {
    if (this._destroyed) return null
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext()
      } catch {
        console.warn('[AudioEngine] Failed to create AudioContext')
        return null
      }
    }
    return this.ctx
  }

  get state(): string {
    return this.ctx?.state ?? 'closed'
  }

  /**
   * Resume a suspended AudioContext (browser autoplay policy).
   * Idempotent — safe to call any number of times.
   * Returns true if the context is now running.
   */
  async unlock(): Promise<boolean> {
    const ctx = this.getCtx()
    if (!ctx) return false
    if ((ctx.state as string) === 'running') return true
    try {
      await ctx.resume()
      return (ctx.state as string) === 'running'
    } catch {
      return false
    }
  }

  /** Release the AudioContext and all resources. Call on unmount. */
  destroy(): void {
    this._destroyed = true

    // Cancel all pending duck restores
    for (const [, task] of this.activeDucks) {
      clearTimeout(task.timeoutId)
    }
    this.activeDucks.clear()
    this.pendingPreloads.clear()

    // Stop all active sources
    for (const [, layer] of this.layers) {
      try { layer.source?.stop() } catch { /* already stopped */ }
      for (const src of layer.activeSources) {
        try { src.stop() } catch { /* already stopped */ }
      }
      layer.activeSources.clear()
      try { layer.gain.disconnect() } catch { /* already disconnected */ }
    }
    this.layers.clear()

    if (this.ctx && this.ctx.state !== 'closed') {
      try { this.ctx.close() } catch { /* ignore */ }
    }
    this.ctx = null
  }

  // ── Asset Loading ──────────────────────────────────────────────────────

  /**
   * Fetch + decode an audio file and cache it by name.
   * Safe to call multiple times — subsequent calls skip if already cached.
   * Missing files are logged once and silently skipped.
   */
  async preload(name: string, url: string): Promise<void> {
    if (this._destroyed) return
    if (this.buffers.has(name)) return
    if (this.pendingPreloads.has(name)) return this.pendingPreloads.get(name)!

    const promise = this._preloadInner(name, url)
    this.pendingPreloads.set(name, promise)
    try {
      await promise
    } finally {
      this.pendingPreloads.delete(name)
    }
  }

  private async _preloadInner(name: string, url: string): Promise<void> {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const arrayBuffer = await response.arrayBuffer()
      const ctx = this.getCtx()
      if (!ctx) return
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      this.buffers.set(name, audioBuffer)
    } catch (err) {
      if (!this.missingLogged.has(name)) {
        this.missingLogged.add(name)
        console.warn(
          `[AudioEngine] Could not preload "${name}" from ${url} — audio will be silent for this layer.`,
          err instanceof Error ? err.message : '',
        )
      }
    }
  }

  // ── Internal helpers ───────────────────────────────────────────────────

  /** Get or create a GainNode + layer state for a named layer. */
  private ensureLayer(name: string, kind: LayerKind): LayerState {
    const existing = this.layers.get(name)
    if (existing) return existing

    const ctx = this.getCtx()!
    const gain = ctx.createGain()
    gain.gain.value = 1
    gain.connect(ctx.destination)

    const state: LayerState = { gain, source: null, kind, activeSources: new Set() }
    this.layers.set(name, state)
    return state
  }

  /** Internal: play a buffer through a layer. */
  private playBuffer(
    layerName: string,
    buffer: AudioBuffer,
    opts: { loop: boolean; fadeInMs: number },
  ): AudioBufferSourceNode | null {
    const ctx = this.getCtx()
    if (!ctx) return null

    const layer = this.ensureLayer(layerName, opts.loop ? 'loop' : 'one-shot')

    // If this is a loop layer, stop any existing loop first
    if (opts.loop && layer.source) {
      try { layer.source.stop() } catch { /* ok */ }
      layer.source = null
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = opts.loop
    source.connect(layer.gain)

    // Fade in
    if (opts.fadeInMs > 0) {
      layer.gain.gain.setValueAtTime(0.001, ctx.currentTime)
      layer.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + opts.fadeInMs / 1000)
    }

    source.start(0)

    if (opts.loop) {
      layer.source = source
    } else {
      layer.activeSources.add(source)
      source.onended = () => {
        layer.activeSources.delete(source)
      }
    }

    return source
  }

  // ── Public Playback API ────────────────────────────────────────────────

  /**
   * Start a looping sound (BGM, timer tension).  Stops any previous loop
   * on the same layer automatically.
   */
  playLoop(layerName: string, fadeInMs = 0): void {
    const buffer = this.buffers.get(layerName)
    if (buffer) {
      this.playBuffer(layerName, buffer, { loop: true, fadeInMs })
      return
    }

    // Buffer not ready — wait for in-flight preload if one exists
    const pending = this.pendingPreloads.get(layerName)
    if (pending) {
      pending.then(() => this.playLoop(layerName, fadeInMs)).catch(() => {})
      return
    }

    if (!this.missingLogged.has(layerName)) {
      this.missingLogged.add(layerName)
      console.warn(`[AudioEngine] Buffer "${layerName}" not preloaded — call preload() first.`)
    }
  }

  /** Play a one-shot sound effect. Overlapping calls are allowed. */
  playOneShot(layerName: string, fadeInMs = DEFAULT_FADE.sfxIn): void {
    const buffer = this.buffers.get(layerName)
    if (buffer) {
      this.playBuffer(layerName, buffer, { loop: false, fadeInMs })
      return
    }

    // Buffer not ready — wait for in-flight preload if one exists
    const pending = this.pendingPreloads.get(layerName)
    if (pending) {
      pending.then(() => this.playOneShot(layerName, fadeInMs)).catch(() => {})
      return
    }

    if (!this.missingLogged.has(layerName)) {
      this.missingLogged.add(layerName)
      console.warn(`[AudioEngine] Buffer "${layerName}" not preloaded — call preload() first.`)
    }
  }

  // ── Volume / Ducking ───────────────────────────────────────────────────

  /**
   * Temporarily reduce a layer's volume, then restore it.
   * Safe to call while a previous duck on the same layer is still active
   * (cancels the previous restore and re-bases).
   */
  duck(layerName: string, amount: number, durationMs: number): void {
    const ctx = this.getCtx()
    if (!ctx) return

    const layer = this.layers.get(layerName)
    if (!layer) return

    // Cancel any pending restore for this layer
    const existing = this.activeDucks.get(layerName)
    if (existing) {
      clearTimeout(existing.timeoutId)
    }

    const now = ctx.currentTime
    const originalGain = existing?.originalGain ?? 1

    layer.gain.gain.cancelScheduledValues(now)
    layer.gain.gain.setValueAtTime(originalGain, now)
    layer.gain.gain.linearRampToValueAtTime(amount, now + 0.05)

    const timeoutId = setTimeout(() => {
      const ctx2 = this.getCtx()
      if (ctx2 && !this._destroyed) {
        const t = ctx2.currentTime
        layer.gain.gain.cancelScheduledValues(t)
        layer.gain.gain.setValueAtTime(amount, t)
        layer.gain.gain.linearRampToValueAtTime(originalGain, t + DEFAULT_FADE.sfxOut)
      }
      this.activeDucks.delete(layerName)
    }, durationMs)

    this.activeDucks.set(layerName, { layer: layerName, originalGain, timeoutId })
  }

  /** Set a layer's volume directly (0..1). */
  setVolume(layerName: string, value: number): void {
    const layer = this.layers.get(layerName)
    if (!layer) return
    const ctx = this.getCtx()
    if (!ctx) return
    layer.gain.gain.cancelScheduledValues(ctx.currentTime)
    layer.gain.gain.setValueAtTime(Math.max(0, Math.min(1, value)), ctx.currentTime)
  }

  // ── Stop ───────────────────────────────────────────────────────────────

  /**
   * Stop a layer (with optional fade-out).  For loops, stops the current
   * source.  For one-shot layers, stops all active sources.
   */
  stop(layerName: string, fadeOutMs = 0): void {
    const layer = this.layers.get(layerName)
    if (!layer) return

    const ctx = this.getCtx()

    if (fadeOutMs > 0 && ctx) {
      const now = ctx.currentTime
      layer.gain.gain.cancelScheduledValues(now)
      layer.gain.gain.setValueAtTime(layer.gain.gain.value, now)
      layer.gain.gain.linearRampToValueAtTime(0.001, now + fadeOutMs / 1000)
    }

    const stopSource = (src: AudioBufferSourceNode | null) => {
      if (!src) return
      try {
        if (fadeOutMs > 0 && ctx) {
          // Schedule stop after fade completes
          const stopTime = ctx.currentTime + fadeOutMs / 1000 + 0.05
          src.stop(stopTime)
        } else {
          src.stop(0)
        }
      } catch {
        // Already stopped
      }
    }

    stopSource(layer.source)
    layer.source = null

    for (const src of layer.activeSources) {
      stopSource(src)
    }
    layer.activeSources.clear()
  }

  /**
   * Stop all layers with an optional fade-out.
   * After stopping, resets gain on all layers to 1 so the next play
   * starts clean.
   */
  stopAll(fadeOutMs = 0): void {
    for (const [name] of this.layers) {
      this.stop(name, fadeOutMs)
    }

    // Reset all gains after fade completes
    if (fadeOutMs > 0) {
      setTimeout(() => {
        for (const [, layer] of this.layers) {
          const ctx = this.getCtx()
          if (ctx && !this._destroyed) {
            layer.gain.gain.cancelScheduledValues(ctx.currentTime)
            layer.gain.gain.setValueAtTime(1, ctx.currentTime)
          }
        }
      }, fadeOutMs + 100)
    }
  }
}
