import { useEffect, useState } from 'react'

export function useRelativeTime(timestamp) {
  const [result, setResult] = useState({ text: null, isStale: false })

  useEffect(() => {
    if (!timestamp) {
      setResult({ text: null, isStale: false })
      return
    }

    function tick() {
      const age = Date.now() - timestamp
      const secs = Math.floor(age / 1000)
      const text = secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`
      setResult({ text, isStale: age > 10_000 })
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timestamp])

  return result
}
