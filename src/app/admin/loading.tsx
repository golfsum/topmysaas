export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-[#070909] px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl animate-pulse motion-reduce:animate-none">
        <div className="h-12 w-56 rounded-xl bg-white/6" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-32 rounded-2xl border border-white/6 bg-white/3"
            />
          ))}
        </div>
        <div className="mt-8 h-96 rounded-2xl border border-white/6 bg-white/3" />
      </div>
    </main>
  );
}
