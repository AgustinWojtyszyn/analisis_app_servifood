import React from 'react';

export default function PortalActionCard({ icon: Icon, title, description, tone = 'orange', featured = false, onClick }) {
  const toneClasses = {
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    slate: 'bg-slate-500/10 text-slate-300 border-slate-600/40',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-left transition-all hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-800/50 ${
        featured ? 'md:col-span-2' : ''
      }`}
    >
      <div className="flex items-start gap-5">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${toneClasses[tone] || toneClasses.orange}`}>
          <Icon size={24} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className={`${featured ? 'text-2xl' : 'text-xl'} font-bold text-white`}>
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}
