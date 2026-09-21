import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function PortalActionCard({
  icon: Icon,
  title,
  description,
  actionLabel = '',
  statusText = '',
  tone = 'orange',
  featured = false,
  onClick
}) {
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
      className={`group flex min-h-[210px] w-full cursor-pointer flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-left transition-all hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 ${
        featured ? 'md:col-span-2' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-5">
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

        <ArrowRight
          size={19}
          strokeWidth={2.2}
          aria-hidden="true"
          className="mt-1 shrink-0 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-slate-200"
        />
      </div>

      <div className="mt-5 flex min-h-[28px] items-end justify-between gap-3">
        {statusText ? (
          <span className="text-sm font-bold text-sky-200">
            {statusText}
          </span>
        ) : (
          <span />
        )}

        {actionLabel ? (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100">
            {actionLabel}
            <ArrowRight size={16} strokeWidth={2.3} aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </button>
  );
}
