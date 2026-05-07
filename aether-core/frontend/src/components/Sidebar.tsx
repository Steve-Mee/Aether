import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Mail, 
  Users, 
  Bot, 
  History, 
  Settings 
} from 'lucide-react';
import React from 'react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/emails', label: 'Emails', icon: Mail },
  { to: '/suppliers', label: 'Suppliers', icon: Users },
  { to: '/autonomous', label: 'Autonomous', icon: Bot },
  { to: '/history', label: 'Command History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <div className="w-72 bg-zinc-950 border-r border-zinc-800 flex flex-col">
      <div className="p-8 flex items-center gap-3 border-b border-zinc-800">
        <div className="w-9 h-9 bg-purple-600 rounded-2xl flex items-center justify-center">
          <span className="text-white font-bold text-xl">A</span>
        </div>
        <div>
          <div className="font-semibold text-xl tracking-tight">AETHER</div>
          <div className="text-[10px] text-zinc-500 -mt-1">THE LIVING STANDARD</div>
        </div>
      </div>

      <div className="flex-1 px-4 py-8">
        <div className="px-4 text-xs font-semibold text-zinc-500 mb-3 tracking-widest">MAIN</div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all ${
                    isActive 
                      ? 'bg-zinc-800 text-white' 
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-zinc-800 text-xs text-zinc-500">
        AETHER Core v0.6.0
      </div>
    </div>
  );
}