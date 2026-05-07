export default function Suppliers() {
  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight mb-8">Suppliers</h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center">
        <div className="mx-auto w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6">
          <span className="text-4xl">🏭</span>
        </div>
        <h3 className="text-2xl font-semibold mb-3">Supplier Network</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          This page will show supplier performance, inventory health, and AI-driven sourcing recommendations.
        </p>
      </div>
    </div>
  );
}
