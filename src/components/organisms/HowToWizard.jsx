import { useState } from 'react'

const STEPS = [
  {
    title: '📱 Remote Controller App',
    icon: '🚀',
    content: (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-cyan-700 bg-cyan-950/50 px-4 py-3 text-sm">
          <p className="mb-1 font-bold text-cyan-300">⚡ PWA – Installable app</p>
          <p className="text-slate-300">
            This is a <strong className="text-white">Progressive Web App</strong> – you can install it
            on your phone and use it like a native app. No App Store, no Play
            Store – just add it to your home screen!
          </p>
        </div>
        <p className="text-sm text-slate-400">
          Remote Controller is a real-time coordination tool for drivers and controllers. GPS-based
          position tracking, POI management and Google Maps navigation – all in one app.
        </p>
        <ul className="mt-1 flex flex-col gap-1 text-sm text-slate-300">
          <li>✅ Real-time position sharing</li>
          <li>✅ POI management on map</li>
          <li>✅ Google Maps navigation</li>
          <li>✅ Offline-capable PWA</li>
        </ul>
      </div>
    ),
  },
  {
    title: '🔐 Login',
    icon: '🔑',
    content: (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-400">
          The app uses paired logins. Both parties need to sign in with their own account.
        </p>
        <div className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Test accounts
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-lg bg-slate-700/50 px-3 py-2">
              <span className="text-sm font-semibold text-slate-200">🚗 Driver</span>
              <span className="font-mono text-sm text-cyan-300">sofor / qwe123</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-700/50 px-3 py-2">
              <span className="text-sm font-semibold text-slate-200">🗺️ Controller</span>
              <span className="font-mono text-sm text-orange-300">iranyito / qwe123</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          💡 Tip: sign in on two devices at the same time – on one as sofor (Driver), on the other
          as iranyito (Controller) – and see the real-time collaboration in action!
        </p>
      </div>
    ),
  },
  {
    title: '👥 Roles',
    icon: '🎭',
    content: (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-400">
          After login you choose a role. The two roles provide different functionality.
        </p>
        <div className="rounded-xl border border-cyan-700/50 bg-slate-800 px-4 py-3">
          <p className="mb-1 flex items-center gap-2 font-bold text-cyan-300">
            <span>🚗</span> Driver
          </p>
          <p className="text-sm text-slate-300">
            The driver shares their GPS position with the controller. They can see assigned POIs,
            mark them as done, and navigate to them via Google Maps.
          </p>
        </div>
        <div className="rounded-xl border border-orange-700/50 bg-slate-800 px-4 py-3">
          <p className="mb-1 flex items-center gap-2 font-bold text-orange-300">
            <span>🗺️</span> Controller
          </p>
          <p className="text-sm text-slate-300">
            The controller sees the driver's live position on the map. They can manage POIs:
            add, edit and delete waypoints.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: '🚗 Driver view',
    icon: '🛣️',
    content: (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-400">
          As a driver, the app automatically shares your GPS position with the controller.
        </p>
        <ul className="flex flex-col gap-2">
          <li className="flex gap-3 rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <span className="text-lg">📍</span>
            <div>
              <p className="font-semibold text-slate-200">Position sharing</p>
              <p className="text-slate-400">Your location appears in real time on the controller's map.</p>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <span className="text-lg">✅</span>
            <div>
              <p className="font-semibold text-slate-200">Completing a POI</p>
              <p className="text-slate-400">Tap "Done" at a POI to mark the task as completed.</p>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <span className="text-lg">🗺️</span>
            <div>
              <p className="font-semibold text-slate-200">Google Maps navigation</p>
              <p className="text-slate-400">Start navigation to any POI with a single tap.</p>
            </div>
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: '🗺️ Controller view',
    icon: '🎯',
    content: (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-400">
          As a controller you have full visibility of the map and can manage all waypoints.
        </p>
        <ul className="flex flex-col gap-2">
          <li className="flex gap-3 rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <span className="text-lg">🚗</span>
            <div>
              <p className="font-semibold text-slate-200">Driver tracking</p>
              <p className="text-slate-400">The driver's position updates live on the map.</p>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <span className="text-lg">📌</span>
            <div>
              <p className="font-semibold text-slate-200">POI management</p>
              <p className="text-slate-400">Add, edit or delete waypoints – the driver sees changes instantly.</p>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg bg-slate-800 px-3 py-2 text-sm">
            <span className="text-lg">⚡</span>
            <div>
              <p className="font-semibold text-slate-200">Real-time sync</p>
              <p className="text-slate-400">Firebase-powered sync – no refresh needed, everything is automatic.</p>
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
            ← Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-500"
            >
              Let's go! 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
