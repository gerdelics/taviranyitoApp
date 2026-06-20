let ctx = null

function getCtx() {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

export function unlockAudio() {
  try {
    const c = getCtx()
    if (c.state === 'suspended') c.resume()
    const buf = c.createBuffer(1, 1, 22050)
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(c.destination)
    src.start(0)
  } catch {}
}

export function playBeep() {
  try {
    const c = getCtx()
    if (c.state === 'suspended') c.resume()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + 0.3)
  } catch {}
}

export function playHaptic() {
  try { navigator.vibrate?.([200, 100, 200]) } catch {}
}
