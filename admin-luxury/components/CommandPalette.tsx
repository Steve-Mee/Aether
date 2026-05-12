'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, ArrowRight, Check, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface CommandResult { id: string; type: 'insight' | 'action' | 'module'; title: string; description: string; confidence?: number; actionLabel?: string; module?: string; }

const mockResults = [ { id: '1', type: 'insight', title: 'Prijsverlaging Product X aanbevolen', description: 'Verlaag prijs met 7% om stockout te voorkomen. Verwachte uplift +12%.', confidence: 87, actionLabel: 'Pas toe', module: 'Pricing' }, { id: '2', type: 'action', title: '47 emails verwerkt', description: '12 auto beantwoord, 3 high-risk in approval queue.', module: 'AETHER Mail' }, { id: '3', type: 'insight', title: 'Supplier prijsdaling gedetecteerd', description: 'Leverancier Y heeft 3 producten met lagere prijzen. Sync aanbevolen.', confidence: 94, actionLabel: 'Sync nu', module: 'Supplier Intelligence' } ] as const;

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>(mockResults as any);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { if (!isOpen) { setQuery(''); setSelectedIndex(0); } }, [isOpen]);

  const handleSearch = (value: string) => { setQuery(value); if (value.length > 2) { const filtered = (mockResults as any).filter((r: any) => r.title.toLowerCase().includes(value.toLowerCase()) || r.description.toLowerCase().includes(value.toLowerCase())); setResults(filtered.length > 0 ? filtered : mockResults as any); } else { setResults(mockResults as any); } };

  const executeCommand = (result: any) => { setIsProcessing(true); setTimeout(() => { setIsProcessing(false); onClose(); const event = new CustomEvent('aether-toast', { detail: { title: "Commando uitgevoerd", description: result.title, type: "success" } }); window.dispatchEvent(event); }, 850); };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'ArrowDown') setSelectedIndex(prev => Math.min(prev + 1, results.length - 1)); else if (e.key === 'ArrowUp') setSelectedIndex(prev => Math.max(prev - 1, 0)); else if (e.key === 'Enter' && results[selectedIndex]) executeCommand(results[selectedIndex]); else if (e.key === 'Escape') onClose(); };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/80 backdrop-blur-md" onClick={onClose}>
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
            <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1F1F1F]">
                <div className="flex items-center gap-2 text-[#C5A46E]"><Sparkles className="w-5 h-5" /><span className="font-medium tracking-tight">AETHER Command</span></div>
                <div className="ml-auto text-xs text-[#A1A1AA] font-mono">⌘K • Natural Language</div>
              </div>
              <div className="flex items-center px-5 py-4 border-b border-[#1F1F1F]">
                <Search className="w-5 h-5 text-[#A1A1AA] mr-3" />
                <input autoFocus value={query} onChange={(e) => handleSearch(e.target.value)} onKeyDown={handleKeyDown} placeholder="Wat wil je dat AETHER vandaag voor je regelt?" className="flex-1 bg-transparent text-[#F5F5F5] placeholder-[#A1A1AA] text-lg outline-none" />
              </div>
              <div className="max-h-[420px] overflow-y-auto p-2">
                {isProcessing ? <div className="flex flex-col items-center justify-center py-16"><div className="w-8 h-8 border-2 border-[#C5A46E] border-t-transparent rounded-full animate-spin mb-4" /><p className="text-[#A1A1AA]">AETHER verwerkt je commando...</p></div> : results.map((result, index) => (
                  <div key={result.id} onClick={() => executeCommand(result)} className={"group flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all " + (index === selectedIndex ? "bg-[#111111] ring-1 ring-[#C5A46E]/30" : "")}>
                    <div className="mt-1">{result.type === 'insight' ? <Sparkles className="w-5 h-5 text-[#C5A46E]" /> : <Check className="w-5 h-5 text-[#22C55E]" />}</div>
                    <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><div className="font-medium text-[#F5F5F5] group-hover:text-[#C5A46E] transition-colors">{result.title}</div>{result.confidence && <div className="text-[10px] px-2 py-0.5 rounded-full bg-[#C5A46E]/10 text-[#C5A46E] font-mono">{result.confidence}%</div>}</div><p className="text-sm text-[#A1A1AA] mt-1 pr-8">{result.description}</p>{result.module && <div className="mt-2 text-xs text-[#A1A1AA] flex items-center gap-1"><Clock className="w-3 h-3" /> {result.module}</div>}</div>
                    {result.actionLabel && <div className="flex items-center text-[#C5A46E] text-sm font-medium opacity-0 group-hover:opacity-100 transition-all">{result.actionLabel} <ArrowRight className="ml-1 w-4 h-4" /></div>}
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-[#1F1F1F] text-xs text-[#A1A1AA] flex items-center justify-between bg-[#050505]"><div>Enter om uit te voeren • ↑↓ navigeren • Esc sluiten</div><div className="font-mono">Powered by AETHER Intelligence</div></div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
