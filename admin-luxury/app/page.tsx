'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Command, Mail, Truck, Package, ShoppingCart, Sparkles, ArrowUpRight } from 'lucide-react';
import { CommandPalette } from '../components/CommandPalette';
import { Toaster } from 'sonner';

export default function AetherAdminCommandCenter() {
  const [commandOpen, setCommandOpen] = useState(false);

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCommandOpen(true); } };
    window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const modules = [
    { icon: Mail, name: "AETHER Mail", status: "Actief", metric: "47 verwerkt vandaag", detail: "12 auto + 3 in approval", color: "text-[#22C55E]" },
    { icon: Truck, name: "Supplier Intelligence", status: "Monitoring", metric: "8 leveranciers", detail: "3 prijsdalingen gedetecteerd", color: "text-[#3B82F6]" },
    { icon: Package, name: "Product Catalog", status: "Synced", metric: "1.284 producten", detail: "+23 nieuwe deze week", color: "text-[#C5A46E]" },
    { icon: ShoppingCart, name: "Orders", status: "Flowing", metric: "89 vandaag", detail: "94% fulfillment rate", color: "text-[#22C55E]" },
  ];

  const aiInsights = [
    { title: "Dynamische prijsstrategie geactiveerd", impact: "+14% marge potentieel", confidence: 91, module: "Pricing Agent" },
    { title: "Low-stock waarschuwing: 4 SKU's", impact: "Auto-reorder suggesties klaar", confidence: 78, module: "Inventory" },
    { title: "Nieuwe limited drop aanbevolen", impact: "Hoge conversie in niche", confidence: 85, module: "Product Genesis" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5]">
      <Toaster position="top-center" richColors />
      <nav className="sticky top-0 z-40 border-b border-[#1F1F1F] bg-[#050505]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C5A46E] to-[#A17C4E] flex items-center justify-center"><span className="text-[#050505] font-semibold text-sm tracking-[-1px]">LC</span></div><div><div className="font-semibold tracking-[-0.5px] text-lg">AETHER</div><div className="text-[10px] text-[#A1A1AA] -mt-1">COMMAND CENTER</div></div></div>
          <div className="flex items-center gap-4"><button onClick={() => setCommandOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#111111] hover:bg-[#1A1A1A] border border-[#1F1F1F] text-sm transition-all"><Command className="w-4 h-4" /><span className="hidden md:inline">Command</span><span className="text-[#A1A1AA] text-xs ml-1 font-mono">⌘K</span></button><div className="flex items-center gap-2 text-sm"><div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" /><span className="text-[#A1A1AA]">AETHER Intelligence actief</span></div></div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-8 pt-10 pb-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12"><div><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] border border-[#1F1F1F] text-xs mb-4"><Sparkles className="w-3.5 h-3.5 text-[#C5A46E]" /> PHASE 1 • FOUNDATION COMPLETE</div><h1 className="text-6xl font-semibold tracking-tighter">Goedemorgen, Steve.</h1><p className="text-2xl text-[#A1A1AA] mt-2 tracking-tight">AETHER runt je business vandaag autonoom.</p></div><div className="mt-6 md:mt-0 text-right"><div className="text-sm text-[#A1A1AA]">Gemiddelde uplift vandaag</div><div className="text-5xl font-semibold text-[#22C55E] tracking-tighter">+23.4%</div></div></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">{[{"label":"Actieve Merchants","value":"3","sub":"PoC"},{"label":"AI Decisions","value":"184","sub":"vandaag"},{"label":"Auto-handled","value":"91%","sub":"low risk"},{"label":"Response Time","value":"<180ms","sub":"p95"}].map((stat, i) => (<div key={i} className="aether-card rounded-3xl p-6"><div className="text-[#A1A1AA] text-sm">{stat.label}</div><div className="text-4xl font-semibold tracking-tighter mt-2">{stat.value}</div><div className="text-xs text-[#A1A1AA] mt-1">{stat.sub}</div></div>))}</div>
        <div className="mb-12"><div className="flex items-center justify-between mb-6"><div className="text-xl font-medium tracking-tight">Actieve Modules</div><button onClick={() => setCommandOpen(true)} className="text-sm flex items-center gap-1 text-[#C5A46E] hover:underline">Alles beheren via Command <ArrowUpRight className="w-4 h-4" /></button></div><div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">{modules.map((mod, index) => { const Icon = mod.icon; return (<motion.div key={index} whileHover={{ y: -2 }} className="aether-card rounded-3xl p-6 group cursor-pointer" onClick={() => setCommandOpen(true)}><div className="flex justify-between items-start"><div className={`p-3 rounded-2xl bg-[#1A1A1A] ${mod.color}`}><Icon className="w-6 h-6" /></div><div className="text-xs px-3 py-1 rounded-full bg-[#1F1F1F] text-[#A1A1AA]">{mod.status}</div></div><div className="mt-6"><div className="font-semibold text-xl tracking-tight">{mod.name}</div><div className="text-3xl font-semibold tracking-tighter mt-3 text-white">{mod.metric}</div><div className="text-sm text-[#A1A1AA] mt-1.5">{mod.detail}</div></div></motion.div>); })}</div></div>
        <div><div className="flex items-center justify-between mb-6"><div><div className="text-xl font-medium tracking-tight flex items-center gap-2">AETHER Intelligence Insights<div className="px-2.5 py-px text-xs rounded-full bg-[#C5A46E]/10 text-[#C5A46E]">LIVE</div></div><p className="text-[#A1A1AA] text-sm">Proactieve aanbevelingen met confidence scores</p></div><button onClick={() => setCommandOpen(true)} className="aether-btn px-5 py-2.5 rounded-2xl bg-[#C5A46E] text-[#050505] text-sm font-medium flex items-center gap-2"><Command className="w-4 h-4" /> Open Command Center</button></div><div className="space-y-3">{aiInsights.map((insight, index) => (<div key={index} className="aether-card rounded-3xl p-6 flex flex-col md:flex-row md:items-center gap-6 group"><div className="flex-1"><div className="flex items-center gap-3"><div className="font-medium text-lg tracking-tight">{insight.title}</div><div className="text-xs px-2.5 py-1 rounded-full border border-[#C5A46E]/30 text-[#C5A46E] font-mono self-start mt-1">{insight.confidence}%</div></div><div className="text-[#A1A1AA] mt-1">{insight.impact}</div></div><div className="flex items-center gap-3 md:justify-end"><div className="text-xs text-[#A1A1AA]">{insight.module}</div><button className="aether-btn px-6 py-2 rounded-2xl border border-[#C5A46E] text-[#C5A46E] text-sm hover:bg-[#C5A46E] hover:text-[#050505] transition-all">Bekijk details</button><button className="aether-btn px-6 py-2 rounded-2xl bg-white text-[#050505] text-sm font-medium">Uitvoeren</button></div></div>))}</div></div>
      </div>
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
