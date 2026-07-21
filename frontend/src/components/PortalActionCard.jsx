import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function PortalActionCard({ icon: Icon, title, description, actionLabel = '', tone = 'orange', featured = false, onClick }) {
  const toneClasses = {
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    slate: 'bg-slate-500/10 text-slate-300 border-slate-600/40',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20'
  };
  const modernCard = Boolean(actionLabel);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full cursor-pointer rounded-2xl border text-left transition-all ${
        modernCard
          ? 'border-white/10 bg-slate-900/70 p-5 shadow-lg shadow-blue-950/20 hover:-translate-y-0.5 hover:border-blue-300/40 hover:bg-slate-800/75 hover:shadow-blue-900/30'
          : 'border-slate-800 bg-slate-900/50 p-6 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-800/50'
      } ${
        featured ? 'md:col-span-2' : ''
      }`}
    >
      <div className={`flex gap-5 ${modernCard ? 'items-center justify-between' : 'items-start'}`}>
        <div className="flex min-w-0 items-start gap-4">
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
        {modernCard ? (
          <span className="ml-3 hidden shrink-0 items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-3.5 py-2 text-sm font-semibold text-blue-100 transition-colors group-hover:border-blue-200/40 group-hover:bg-blue-500/20 sm:inline-flex">
            {actionLabel}
            <ArrowRight size={16} strokeWidth={2.3} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
          </span>
        ) : null}
      </div>
      {modernCard ? (
        <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-3.5 py-2 text-sm font-semibold text-blue-100 transition-colors group-hover:border-blue-200/40 group-hover:bg-blue-500/20 sm:hidden">
          {actionLabel}
          <ArrowRight size={16} strokeWidth={2.3} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
        </span>
      ) : null}
    </button>
  );
}
