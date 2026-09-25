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
  const tones = {
    orange: {
      icon: 'border-orange-200 bg-orange-50 text-orange-600',
      accent: 'text-orange-600',
      rail: 'bg-orange-500'
    },
    green: {
      icon: 'border-emerald-200 bg-emerald-50 text-emerald-600',
      accent: 'text-emerald-700',
      rail: 'bg-emerald-500'
    },
    blue: {
      icon: 'border-blue-200 bg-blue-50 text-blue-600',
      accent: 'text-blue-700',
      rail: 'bg-blue-500'
    },
    slate: {
      icon: 'border-slate-200 bg-slate-100 text-slate-600',
      accent: 'text-slate-700',
      rail: 'bg-slate-500'
    },
    violet: {
      icon: 'border-violet-200 bg-violet-50 text-violet-600',
      accent: 'text-violet-700',
      rail: 'bg-violet-500'
    }
  };

  const currentTone = tones[tone] || tones.blue;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[168px] w-full cursor-pointer flex-col justify-between overflow-hidden rounded-xl border-[1.5px] border-slate-400 bg-white p-5 text-left shadow-[0_4px_14px_rgba(15,23,42,0.12)] transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-500 hover:shadow-[0_10px_24px_rgba(37,99,235,0.16)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      data-featured={featured ? 'true' : 'false'}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${currentTone.rail}`} aria-hidden="true" />

      <div className="flex items-start justify-between gap-4 pl-1">
        <div className="flex min-w-0 items-start gap-4">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${currentTone.icon}`}>
            <Icon size={21} strokeWidth={2.1} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h3 className="text-[17px] font-extrabold leading-6 text-slate-950">
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-5 text-slate-600">
              {description}
            </p>
          </div>
        </div>

        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-300 bg-slate-50 text-slate-500 transition-all group-hover:border-blue-300 group-hover:bg-blue-50 group-hover:text-blue-700">
          <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>

      <div className="mt-4 flex min-h-[24px] items-end justify-between gap-3 pl-1">
        {statusText ? (
          <span className={`text-sm font-extrabold ${currentTone.accent}`}>
            {statusText}
          </span>
        ) : (
          <span />
        )}

        {actionLabel ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700">
            {actionLabel}
            <ArrowRight size={15} strokeWidth={2.3} aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </button>
  );
}
