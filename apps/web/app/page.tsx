export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">OneChat</p>
            <h1 className="mt-3 text-4xl font-bold">Omnichannel Chat Operations</h1>
          </div>
          <div className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200">
            Rebuild scaffold
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Messaging</p>
            <h2 className="mt-3 text-2xl font-semibold">Inbox</h2>
            <p className="mt-2 text-sm text-slate-300">LINE / Telegram / Facebook unified view</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Operations</p>
            <h2 className="mt-3 text-2xl font-semibold">Queue</h2>
            <p className="mt-2 text-sm text-slate-300">Auto assignment and locks for duplicate work</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Workforce</p>
            <h2 className="mt-3 text-2xl font-semibold">Schedule</h2>
            <p className="mt-2 text-sm text-slate-300">Attendance, leave, payroll-ready domain</p>
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Status</p>
          <p className="mt-3 text-lg text-slate-100">
            This app is the new baseline scaffold for the OneChat rebuild.
          </p>
        </section>
      </div>
    </main>
  );
}
