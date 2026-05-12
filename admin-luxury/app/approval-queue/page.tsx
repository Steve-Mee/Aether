'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, AlertTriangle, ArrowLeft, Filter, Sparkles, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const mockPendingApprovals = [
  { id: 'apr_001', actionId: 'act_4821', title: 'Prijsverlaging SKU-4821 met 12%', description: 'Huidige marge te hoog. Concurrentie lager geprijsd. Verwachte uplift +14%.', confidence: 87, riskLevel: 'high', module: 'Pricing Agent', proposedAction: { type: 'UPDATE_PRICE', payload: { productId: '4821', newPrice: 89.99 } }, createdAt: '2026-05-12T14:32:00Z', merchantContext: 'Lage conversie op dit product (2.1%)' },
  { id: 'apr_002', actionId: 'act_1394', title: 'Automatische sync van 3 nieuwe producten van Leverancier Y', description: 'Nieuwe limited edition items gedetecteerd. Hoge marge potentieel.', confidence: 92, riskLevel: 'medium', module: 'Supplier Intelligence', proposedAction: { type: 'SYNC_SUPPLIER', payload: { supplierId: 'Y', newProducts: true } }, createdAt: '2026-05-12T11:15:00Z', merchantContext: 'Limited drop seizoensgebonden' },
];

export default function HumanApprovalQueue() {
  const [approvals, setApprovals] = useState(mockPendingApprovals);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredApprovals = approvals.filter(item => filter === 'all' || item.riskLevel === filter);

  const handleApprove = async (item: any) => {
    setProcessingId(item.id);
    await new Promise(r => setTimeout(r, 650));
    setApprovals(prev => prev.filter(a => a.id !== item.id));
    setProcessingId(null);
    toast.success('Actie goedgekeurd en uitgevoerd', { description: item.title });
  };

  const handleReject = async (item: any) => {
    setProcessingId(item.id);
    await new Promise(r => setTimeout(r, 450));
    setApprovals(prev => prev.filter(a => a.id !== item.id));
    setProcessingId(null);
    toast.error('Actie afgewezen', { description: item.title });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5]">
      <nav className="sticky top-0 z-40 border-b border-[#1F1F1F] bg-[#050505]/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4"><a href="/" className="flex items-center gap-2 text-[#A1A1AA] hover:text-white"><ArrowLeft className="w-4 h-4" /> Terug naar Dashboard</a><div className="h-5 w-px bg-[#1F1F1F]" /><div><span className="font-semibold tracking-tight">Human Approval Queue</span><span className="ml-3 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400">{approvals.length} wachtend</span></div></div>
          <div className="flex items-center gap-2 text-sm"><Filter className="w-4 h-4 text-[#666]" /><select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="bg-[#111111] border border-[#1F1F1F] rounded-xl px-3 py-1.5 text-sm outline-none"><option value="all">Alle risico’s</option><option value="high">Alleen High Risk</option><option value="medium">Alleen Medium Risk</option></select></div>
        </div>
      </nav>
      <div className="max-w-6xl mx-auto px-8 pt-10 pb-20"><div className="mb-10"><div className="flex items-center gap-3 mb-2"><div className="p-2 rounded-2xl bg-[#111111]"><AlertTriangle className="w-6 h-6 text-amber-400" /></div><h1 className="text-4xl font-semibold tracking-tighter">Human Approval Queue</h1></div><p className="text-[#A1A1AA] text-lg">High-risk acties die menselijke goedkeuring vereisen voordat AETHER ze uitvoert.</p></div>{filteredApprovals.length === 0 ? (<div className="flex flex-col items-center justify-center py-20 text-center"><div className="w-16 h-16 rounded-3xl bg-[#111111] flex items-center justify-center mb-6"><Check className="w-8 h-8 text-emerald-400" /></div><h3 className="text-2xl font-medium tracking-tight">Alles is goedgekeurd</h3><p className="text-[#A1A1AA] mt-2 max-w-md">Er zijn momenteel geen acties die wachten op jouw goedkeuring.</p></div>) : (<div className="space-y-4"><AnimatePresence>{filteredApprovals.map((item) => (<motion.div key={item.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="aether-card rounded-3xl p-7 group"><div className="flex flex-col lg:flex-row lg:items-start gap-6"><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-3 mb-1"><span className="font-semibold text-xl tracking-tight">{item.title}</span><div className={`text-xs px-2.5 py-1 rounded-full font-mono tracking-wider self-start mt-1 ${item.riskLevel === 'high' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>{item.riskLevel.toUpperCase()} RISK</div></div><p className="text-[#A1A1AA] pr-8">{item.description}</p></div></div><div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"><div className="flex items-center gap-2 text-[#A1A1AA]"><Sparkles className="w-4 h-4 text-[#C5A46E]" /><span>{item.confidence}% confidence</span></div><div className="flex items-center gap-2 text-[#A1A1AA]"><Clock className="w-4 h-4" /><span>{item.module}</span></div><div className="flex items-center gap-2 text-[#A1A1AA]"><Calendar className="w-4 h-4" /><span>{new Date(item.createdAt).toLocaleString('nl-BE')}</span></div></div>{item.merchantContext && <div className="mt-4 text-xs px-3 py-2 rounded-2xl bg-[#111111] inline-flex items-center gap-2 text-[#A1A1AA]"><User className="w-3.5 h-3.5" /> {item.merchantContext}</div>}</div><div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:w-56 flex-shrink-0"><button onClick={() => handleApprove(item)} disabled={processingId === item.id} className="aether-btn flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-60 transition-all">{processingId === item.id ? 'Bezig...' : <><Check className="w-4 h-4" /> Goedkeuren & Uitvoeren</>}</button><button onClick={() => handleReject(item)} disabled={processingId === item.id} className="aether-btn flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-[#1F1F1F] hover:bg-[#1A1A1A] text-[#A1A1AA] hover:text-white font-medium disabled:opacity-60 transition-all"><X className="w-4 h-4" /> Afwijzen</button></div></div><div className="mt-6 pt-6 border-t border-[#1F1F1F] text-xs"><div className="text-[#666] mb-1.5">VOORGESTELDE ACTIE</div><div className="font-mono text-[#A1A1AA]">{item.proposedAction.type} → {JSON.stringify(item.proposedAction.payload)}</div></div></motion.div>))}</AnimatePresence></div>)}</div></div>);
}