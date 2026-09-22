// Som da roleta sintetizado na hora (Web Audio), sem arquivo de áudio:
// o "tique" mecânico a cada card que passa pelo marcador.

let ctx: AudioContext | null = null
let noiseBuffer: AudioBuffer | null = null

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    try {
      ctx = new Ctor()
    } catch {
      return null
    }
  }
  if (ctx.state === "suspended") void ctx.resume()
  return ctx
}

/** Chamar dentro do handler do clique: destrava o áudio (política de autoplay). */
export function primeAudio() {
  getCtx()
}

function getNoise(ac: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ac.sampleRate) {
    const len = Math.floor(ac.sampleRate * 0.05)
    noiseBuffer = ac.createBuffer(1, len, ac.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

/**
 * Clique seco: rajada curta de ruído passando por um bandpass.
 * `intensity` (0..1) abre um pouco o volume e o brilho — usado para os
 * tiques ficarem mais "pesados" conforme a roleta desacelera.
 */
export function playTick(intensity = 1) {
  const ac = getCtx()
  if (!ac) return
  const t = ac.currentTime

  const src = ac.createBufferSource()
  src.buffer = getNoise(ac)

  const bp = ac.createBiquadFilter()
  bp.type = "bandpass"
  bp.frequency.value = 1500 + 900 * (1 - intensity)
  bp.Q.value = 1.4

  const gain = ac.createGain()
  const peak = 0.05 + 0.07 * intensity
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.linearRampToValueAtTime(peak, t + 0.002)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035)

  src.connect(bp)
  bp.connect(gain)
  gain.connect(ac.destination)
  src.start(t)
  src.stop(t + 0.06)
}
