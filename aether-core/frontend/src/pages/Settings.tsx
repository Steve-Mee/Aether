export default function Settings() {
  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight mb-8">Settings</h1>
      
      <div className="max-w-2xl">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <h3 className="font-semibold text-xl mb-6">AI Configuration</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Local LLM Model</label>
              <select className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-4 py-3 text-white">
                <option>llama3.1:8b (Recommended)</option>
                <option>mistral:7b</option>
                <option>qwen2.5:14b</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Autonomous Mode</label>
              <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-700 rounded-2xl px-4 py-3">
                <input type="checkbox" defaultChecked className="accent-purple-600" />
                <span>Allow AI to make decisions without approval (Low risk only)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}