import React from 'react';
import StatCard from '../components/StatCard';
import { TrendingUp, Users, Package, DollarSign } from 'lucide-react';

export default function Dashboard() {
  return (
    <div>
      <div className="mb-10">
        <h1 className="text-5xl font-semibold tracking-tighter">Good morning, Steve</h1>
        <p className="text-xl text-zinc-400 mt-3">Here's what's happening with your store today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title="Total Revenue" 
          value="€124,892" 
          change="+18.2%" 
          icon={<DollarSign className="text-emerald-400" />} 
          trend="up"
        />
        <StatCard 
          title="Orders Today" 
          value="184" 
          change="+12.4%" 
          icon={<Package className="text-purple-400" />} 
          trend="up"
        />
        <StatCard 
          title="Active Customers" 
          value="8,942" 
          change="+4.1%" 
          icon={<Users className="text-blue-400" />} 
          trend="up"
        />
        <StatCard 
          title="Avg. Order Value" 
          value="€97.40" 
          change="-2.3%" 
          icon={<TrendingUp className="text-orange-400" />} 
          trend="down"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <h3 className="font-semibold text-xl mb-6">Recent Activity</h3>
          <div className="space-y-5 text-sm">
            {[
              { text: "New order #2841 from customer Alex", time: "2 min ago", color: "emerald" },
              { text: "Price updated on 12 products via AI", time: "14 min ago", color: "purple" },
              { text: "Supplier price change detected (+7%)", time: "1 hour ago", color: "orange" },
              { text: "Autonomous agent approved 4 low-risk emails", time: "3 hours ago", color: "blue" },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-zinc-800 last:border-0">
                <span>{item.text}</span>
                <span className={`text-${item.color}-400 text-xs`}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <h3 className="font-semibold text-xl mb-6 flex items-center gap-2">
            <span>🧠</span> AI Insights
          </h3>
          <div className="space-y-4 text-sm text-zinc-400">
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
              Demand for "Limited Drop Hoodie" is expected to rise <span className="text-emerald-400">+47%</span> next week.
            </div>
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
              3 products have margin below 25%. Consider price adjustment.
            </div>
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
              Customer agent "Alex" is negotiating on 4 orders right now.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}