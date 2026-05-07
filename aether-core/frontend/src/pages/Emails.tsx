export default function Emails() {
  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight mb-8">AETHER Mail</h1>
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center">
        <div className="mx-auto w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6">
          <span className="text-4xl">📧</span>
        </div>
        <h3 className="text-2xl font-semibold mb-3">Smart Email Management</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          AI classifies and handles your emails automatically. High-risk emails go to approval queue. Coming in next sprint.
        </p>
      </div>
    </div>
  );
}