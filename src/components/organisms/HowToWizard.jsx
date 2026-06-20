import { useState } from 'react'

const STEPS = [
  {
    title: '📱 Távirányító App',
    icon: '🚀',
    content: (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-cyan-700 bg-cyan-950/50 px-4 py-3 text-sm">
          <p className="mb-1 font-bold text-cyan-300">⚡ PWA – Telepíthető alkalmazás</p>
          <p className="text-slate-300">
            Ez egy <strong className="text-white">Progressive Web App</strong> – telepítheted a
            telefonodra, és úgy használhatod, mint egy natív appot. Nincs App Store, nincs Play
            Store – egyszerűen add hozzá a kezdőképernyőhöz!
          </p>
        </div>
        <p className="text-sm text-slate-400">
          A Távirányító egy valós idejű koordinációs eszköz sofőrök és irányítók számára. GPS
          alapú pozíciókövetés, POI kezelés és Google Maps navigáció – mindez egyetlen appban.
        </p>
        <ul className="mt-1 flex flex-col gap-1 text-sm text-slate-300">
          <li>✅ Valós idejű pozíciómegosztás</li>
          <li>✅ POI (pont) kezelés térképen</li>
          <li>✅ Google Maps navigáció indítása</li>
          <li>✅ Offline-képes PWA alkalmazás</li>
        </ul>
      </div>
    ),
  },
  {
    title: '🔐 Belépés',
    icon: '🔑',
    content: (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-400">
          Az alkalmazást páros bejelentkezéssel lehet használni. Mindkét félnek be kell lépnie a
          saját fiókjába.
        </p>
        <div className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Teszt fiókok kipróbáláshoz
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-lg bg-slate-700/50 px-3 py-2">
              <span className="text-sm font-semibold text-slate-200">🚗 Sofőr</span>
              <span className="font-mono text-sm text-cyan-300">gera / qwe123</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-700/50 px-3 py-2">
              <span className="text-sm font-semibold text-slate-200">🗺️ Irányító</span>
              <span className="font-mono text-sm text-orange-300">gabi / qwe123</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          💡 Tipp: két eszközön lépj be egyszerre – az egyiken gera sofőrként, a másikon gabi
          irányítóként – és láthatod a valós idejű együttműködést!
        </p>
      </div>
    ),
  },
  {
    title: '👥 Szerepek',
    icon: '🎭',
    content: (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-400">
          Belépés után választhatsz szerepet. A két szerep különböző funkciókat biztosít.
        </p>
        <div className="rounded-xl border border-cyan-700/50 bg-slate-800 px-4 py-3">
          <p className="mb-1 flex items-center gap-2 font-bold text-cyan-300">
            <span>🚗</span> Sofőr
          </p>
          <p className="text-sm text-slate-300">
            A sofőr megosztja GPS pozícióját az irányítóval. Látja a hozzárendelt POI-kat (célpontokat),
            megjelölheti őket elvégzettnek, és Google Maps-szel navigálhat hozzájuk.
          </p>
        </div>
        <div className="rounded-xl border border-orange-700/50 bg-slate-800 px-4 py-3">
          <p className="mb-1 flex items-center gap-2 font-bold text-orange-300">
            <span>🗺️</span> Irányító
          </p>
          <p className="text-sm text-slate-300">
            Az irányító látja a sofőr valós idejű pozícióját a térképen. Kezelheti a POI-kat:
            hozzáadhat, szerkeszthet és törölhet célpontokat.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: '🚗 Sofőr nézet',
    icon: '🛣️',
    content: (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-400">
          Sofőrként az alkalmazás automatikusan megosztja a GPS pozíciódat az irányítóval.
        </p>
        <ul className="flex flex-col gap-2">
          <li className="flex gap-3 rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <span className="text-lg">📍</span>
            <div>
              <p className="font-semibold text-slate-200">Pozíciómegosztás</p>
              <p className="text-slate-400">A helyzeted valós időben jelenik meg az irányító térképén.</p>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <span className="text-lg">✅</span>
            <div>
              <p className="font-semibold text-slate-200">Pont teljesítése</p>
              <p className="text-slate-400">A POI-knál a „Kész" gombbal jelölheted teljesítettnek a feladatot.</p>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <span className="text-lg">🗺️</span>
            <div>
              <p className="font-semibold text-slate-200">Google Maps navigáció</p>
              <p className="text-slate-400">Egy gombnyomással elindíthatod a navigációt bármelyik POI-hoz.</p>
            </div>
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: '🗺️ Irányító nézet',
    icon: '🎯',
    content: (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-400">
          Irányítóként teljes rálátásod van a térképre és kezelheted a célpontokat.
        </p>
        <ul className="flex flex-col gap-2">
          <li className="flex gap-3 rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <span className="text-lg">🚗</span>
            <div>
              <p className="font-semibold text-slate-200">Sofőr követése</p>
              <p className="text-slate-400">A sofőr pozíciója élőben frissül a térképen.</p>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <span className="text-lg">📌</span>
            <div>
              <p className="font-semibold text-slate-200">POI kezelés</p>
              <p className="text-slate-400">Pontokat adhatsz hozzá, szerkeszthetsz vagy törölhetsz – azonnal látja a sofőr is.</p>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <span className="text-lg">⚡</span>
            <div>
              <p className="font-semibold text-slate-200">Valós idejű szinkron</p>
              <p className="text-slate-400">Firebase alapú szinkronizáció – nincs szükség frissítésre, minden automatikus.</p>
            </div>
          </li>
        </ul>
      </div>
    ),
  },
]

export default function HowToWizard({ onClose }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex w-full max-w-sm flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs text-slate-500">
              {step + 1} / {STEPS.length}
            </p>
            <h3 className="text-base font-bold text-slate-100">{current.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-3">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === step
                  ? 'w-6 bg-cyan-500'
                  : i < step
                    ? 'w-2 bg-cyan-800'
                    : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{current.content}</div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200 disabled:invisible"
          >
            ← Vissza
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Tovább →
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-500"
            >
              Kezdjük! 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
