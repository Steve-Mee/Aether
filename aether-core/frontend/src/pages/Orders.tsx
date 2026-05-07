export default function Orders() {
  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight mb-8">Orders</h1>
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center">
        <div className="mx-auto w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6">
          <span className="text-4xl">📦</span>
        </div>
        <h3 className="text-2xl font-semibold mb-3">Order Management</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          This page will show all orders with status, customer info, and AI-powered insights. Coming soon in next update.
        </p>
      </div>
    </div>
  );
}