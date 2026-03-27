import { MessageCircle, User, Heart } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'discovery', label: 'Discovery', isLogo: true },
    { id: 'likes', icon: Heart, label: 'Likes' },
    { id: 'messages', icon: MessageCircle, label: 'Messages' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-[#1e293b] border-t border-slate-700 px-6 py-3 flex justify-between items-center z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300",
              isActive ? "text-emerald-400 scale-110" : "text-slate-400 hover:text-slate-200"
            )}
          >
            {tab.isLogo ? (
              <span className={cn(
                "text-2xl font-black italic tracking-tighter leading-none mb-0.5",
                isActive ? "gradient-text" : "text-slate-400"
              )}>
                S
              </span>
            ) : (
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} fill={isActive ? "currentColor" : "none"} fillOpacity={isActive ? 0.2 : 0} />
            )}
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest transition-opacity duration-300",
              isActive ? "opacity-100" : "opacity-60"
            )}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
