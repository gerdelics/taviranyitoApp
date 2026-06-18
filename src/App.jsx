import PoisPage from './pages/PoisPage'

export default function App() {
  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold">Távirányító · POIs</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl min-h-0 flex-1 px-4 py-3">
        <PoisPage />
      </main>
    </div>
  )
}
