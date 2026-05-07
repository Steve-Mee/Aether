import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import React from 'react';

export default function CommandBar() {
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('http://localhost:9000/api/admin/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: command.trim() }),
      });
      const data = await res.json();
      alert(`✅ Command uitgevoerd!\n\n${JSON.stringify(data, null, 2)}`);
    } catch {
      alert('❌ Fout bij uitvoeren commando');
    } finally {
      setLoading(false);
      setCommand('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-purple-400">
        <Sparkles size={20} />
        <span className="font-semibold tracking-[3px] text-sm">AETHER</span>
      </div>
      <input
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        placeholder="Typ een commando... (bijv. Lower all red sneakers by 8%)"
        className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-purple-500 rounded-3xl px-6 py-3.5 text-white placeholder-zinc-500 outline-none text-sm"
        disabled={loading}
      />
      <button 
        type="submit" 
        disabled={loading || !command.trim()}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 px-8 py-3.5 rounded-3xl flex items-center gap-2 font-medium transition-all active:scale-[0.985]"
      >
        {loading ? '...' : <Send size={18} />}
      </button>
    </form>
  );
}