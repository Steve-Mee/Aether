import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import CommandBar from './CommandBar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <div className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-xl p-4 sticky top-0 z-50">
          <CommandBar />
        </div>

        <div className="flex-1 overflow-auto p-8 bg-zinc-950">
          {children}
        </div>
      </div>
    </div>
  );
}