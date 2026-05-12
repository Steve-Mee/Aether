'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, ArrowRight, Check, Clock, AlertTriangle, X, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { processNaturalLanguageCommand, executeProposedAction, type CommandResult } from '../lib/api';
import { toast } from 'sonner';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTED_PROMPTS = [
  "Verlaag prijzen van low-margin producten met 5%",
  "Sync alle leveranciers en update stock",
  "Toon orders die vertraging hebben",
  "Maak een limited drop voor Black Friday",
];

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
      setSelectedIndex(prev => Math.min(prev + 1, Math.max(0, results.length - 1)));
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
      setError('AETHER kon dit commando niet begrijpen. Probeer specifieker te zijn.');
      setResults([]);
    } finally { setIsProcessing(false); }
  };

  const handleExecute = async (result: CommandResult) => {
    if (!result.proposedAction) { toast.error("Dit is een inzicht zonder directe actie"); return; }
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

  const handleSuggestedPrompt = (prompt: string) => { setQuery(prompt); handleSearch(prompt); };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-black/95 backdrop-blur-2xl p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="w-full max-w-[720px]" onClick={e => e.stopPropagation()}>
            <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-3xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F1F1F] bg-[#050505]">
                <div className="flex items-center gap-3"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-[#C5A46E] via-[#A17C4E] to-[#C5A46E] flex items-center justify-center"><Sparkles className="w-4 h-4 text-[#050505]" /></div><div><div className="font-semibold tracking-[-0.3px] text-lg">AETHER Command</div><div className="text-[10px] text-[#666] -mt-0.5">Natural Language • Local LLM</div></div></div></div>
                <button onClick={onClose} className="text-[#666] hover:text-white transition-colors p-1"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1F1F1F]">
                <Search className="w-5 h-5 text-[#666] flex-shrink-0" />
                <input autoFocus value={query} onChange={(e) => handleSearch(e.target.value)} onKeyDown={handleKeyDown} placeholder="Wat wil je dat AETHER vandaag voor je regelt?" className="flex-1 bg-transparent text-[#F5F5F5] text-[17px] placeholder-[#555] outline-none" />
                {isProcessing && <div className="flex items-center gap-2 text-xs text-[#C5A46E]"><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Denkt na...</div>}
              </div>
              {!query && results.length === 0 && <div className="px-6 py-4 border-b border-[#1F1F1F] bg-[#050505]"><div className="text-xs text-[#666] mb-2.5 flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> SUGGESTED COMMANDS</div><div className="flex flex-wrap gap-2">{SUGGESTED_PROMPTS.map((prompt, i) => (<button key={i} onClick={() => handleSuggestedPrompt(prompt)} className="text-xs px-3 py-1.5 rounded-2xl bg-[#111111] hover:bg-[#1A1A1A] border border-[#1F1F1F] text-[#A1A1AA] hover:text-[#F5F5F5] transition-all">{prompt}</button>))}</div></div>}
              <div className="max-h-[460px] overflow-y-auto p-2">
                {error && <div className="px-6 py-8 flex items-center gap-3 text-red-400"><AlertTriangle className="w-5 h-5 flex-shrink-0" /><span>{error}</span></div>}
                {results.length > 0 && results.map((result, index) => (<motion.div key={result.id} whileHover={{ backgroundColor: '#111111' }} onClick={() => handleExecute(result)} className={cn("group mx-2 mb-1 flex items-start gap-4 rounded-2xl p-5 cursor-pointer transition-all border border-transparent", index === selectedIndex && "bg-[#111111] border-[#C5A46E]/30", isExecuting === result.id && "opacity-60")}><div className="mt-1">{result.type === 'insight' && <Sparkles className="w-5 h-5 text-[#C5A46E]" />}{result.type === 'action' && <Check className="w-5 h-5 text-emerald-400" />}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-3"><div className="font-medium text-[15px] tracking-tight text-[#F5F5F5] group-hover:text-[#C5A46E] transition-colors">{result.title}</div><div className={cn("text-[10px] px-2 py-px rounded-full font-mono tracking-wider flex-shrink-0", result.riskLevel === 'high' && "bg-red-500/10 text-red-400", result.riskLevel === 'medium' && "bg-amber-500/10 text-amber-400", result.riskLevel === 'low' && "bg-emerald-500/10 text-emerald-400")}>{result.confidence}% • {result.riskLevel.toUpperCase()}</div></div><p className="text-[#A1A1AA] text-[13px] mt-1.5 pr-4 leading-snug">{result.description}</p><div className="mt-3 text-xs text-[#666] flex items-center gap-1.5"><Clock className="w-3 h-3" /> {result.module}</div></div><div className="pt-1 flex-shrink-0">{isExecuting === result.id ? <div className="text-xs text-[#C5A46E] flex items-center gap-2 pr-2">Uitvoeren...</div> : result.proposedAction ? <div className="flex items-center text-[#C5A46E] text-sm font-medium opacity-60 group-hover:opacity-100 transition-all pr-1">Uitvoeren <ArrowRight className="ml-1.5 w-4 h-4" /></div> : null}</div></motion.div>))}
              </div>
              <div className="px-6 py-3.5 border-t border-[#1F1F1F] bg-[#050505] text-xs flex items-center justify-between text-[#555]"><div>↑↓ navigeren • Enter uitvoeren • Esc sluiten</div><div className="font-mono tracking-[1px] text-[10px]">POWERED BY LOCAL LLM + DECISION ENGINE</div></div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
