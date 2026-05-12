'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, ArrowRight, Check, Clock, AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { processNaturalLanguageCommand, executeProposedAction, type CommandResult } from '../lib/api';
import { toast } from 'sonner';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommandResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setError(null);
      setIsProcessing(false);
      setIsExecuting(null);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleExecute(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [results, selectedIndex, onClose]);

  const handleSearch = async (value: string) => {
    setQuery(value);
    setError(null);
    if (value.length < 3) { setResults([]); return; }
    setIsProcessing(true);
    try {
      const data = await processNaturalLanguageCommand(value);
      setResults(data);
      setSelectedIndex(0);
    } catch (err: any) {
      setError('AETHER Intelligence kon het commando niet verwerken. Probeer specifieker te zijn.');
      setResults([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecute = async (result: CommandResult) => {
    if (!result.proposedAction) { toast.error("Geen uitvoerbare actie"); return; }
    setIsExecuting(result.id);
    try {
      const res = await executeProposedAction(result.id, result.proposedAction);
      if (res.success) {
        toast.success(res.message || `Uitgevoerd: ${result.title}`);
        onClose();
      } else throw new Error(res.message);
    } catch (err: any) {
      toast.error("Uitvoering mislukt", { description: err.message });
    } finally { setIsExecuting(null); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-black/90 backdrop-blur-xl p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }} transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }} className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-3xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F1F1F]">
                <div className="flex items-center gap-3"><div className="flex items-center gap-2 text-[#C5A46E]"><Sparkles className="w-5 h-5" /><span className="font-semibold tracking-tight text-lg">AETHER Command</span></div><div className="text-xs px-2.5 py-1 rounded-full bg-[#C5A46E]/10 text-[#C5A46E] font-mono">LLM + DECISION ENGINE</div></div>
                <button onClick={onClose} className="text-[#A1A1AA] hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1F1F1F]">
                <Search className="w-5 h-5 text-[#A1A1AA] flex-shrink-0" />
                <input autoFocus value={query} onChange={(e) => handleSearch(e.target.value)} onKeyDown={handleKeyDown} placeholder="Natuurlijk commando... bijv. 'verlaag prijzen met lage marge'" className="flex-1 bg-transparent text-[#F5F5F5] text-[17px] placeholder-[#666] outline-none" />
                {isProcessing && <div className="w-4 h-4 border-2 border-[#C5A46E] border-t-transparent rounded-full animate-spin" />}
              </div>
              <div className="min-h-[320px] max-h-[520px] overflow-y-auto p-2">
                {error && <div className="flex items-center gap-3 px-6 py-8 text-red-400"><AlertTriangle className="w-5 h-5" /> {error}</div>}
                {results.length > 0 && results.map((result, index) => (
                  <div key={result.id} onClick={() => handleExecute(result)} className={cn("group mx-2 mb-1 flex items-start gap-4 rounded-2xl p-5 cursor-pointer transition-all border border-transparent", index === selectedIndex && "bg-[#111111] border-[#C5A46E]/40", isExecuting === result.id && "opacity-60 pointer-events-none")}>
                    <div className="mt-1 flex-shrink-0">{result.type === 'insight' && <Sparkles className="w-5 h-5 text-[#C5A46E]" />}{result.type === 'action' && <Check className="w-5 h-5 text-[#22C55E]" />}</div>
                    <div className="flex-1 min-w-0 pr-4"><div className="flex items-center gap-3"><div className="font-medium text-[15px] text-[#F5F5F5] group-hover:text-[#C5A46E] transition-colors tracking-tight">{result.title}</div><div className={cn("text-[10px] px-2 py-px rounded-full font-mono flex-shrink-0", result.riskLevel === 'high' && "bg-red-500/10 text-red-400", result.riskLevel === 'medium' && "bg-yellow-500/10 text-yellow-400", result.riskLevel === 'low' && "bg-emerald-500/10 text-emerald-400")}>{result.confidence}% • {result.riskLevel}</div></div><p className="text-[#A1A1AA] text-sm mt-1.5 leading-snug">{result.description}</p>{result.module && <div className="mt-3 text-xs text-[#666] flex items-center gap-1.5"><Clock className="w-3 h-3" />{result.module}</div>}</div>
                    <div className="flex-shrink-0 pt-1 text-right">{isExecuting === result.id ? <div className="text-xs text-[#C5A46E]">Uitvoeren...</div> : result.proposedAction ? <div className="text-[#C5A46E] text-sm font-medium flex items-center gap-1 opacity-70 group-hover:opacity-100">Uitvoeren <ArrowRight className="w-4 h-4" /></div> : <div className="text-xs text-[#666]">Inzicht</div>}</div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3.5 border-t border-[#1F1F1F] bg-[#050505] text-xs flex justify-between text-[#666]"><div>↑↓ • Enter uitvoeren • Esc sluiten</div><div className="font-mono">LOCAL LLM + CONTEXT PROVIDER + DECISION ENGINE</div></div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
