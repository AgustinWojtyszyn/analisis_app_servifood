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
      accent: 'text-orange-600'
    },
    green: {
      icon: 'border-emerald-200 bg-emerald-50 text-emerald-600',
      accent: 'text-emerald-700'
    },
    blue: {
      icon: 'border-blue-200 bg-blue-50 text-blue-600',
      accent: 'text-blue-700'
    },
    slate: {
      icon: 'border-slate-200 bg-slate-100 text-slate-600',
      accent: 'text-slate-700'
    },
    violet: {
      icon: 'border-violet-200 bg-violet-50 text-violet-600',
      accent: 'text-violet-700'
    }
  };

  const currentTone = tones[tone] || tones.blue;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[168px] w-full cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      data-featured={featured ? 'true' : 'false'}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${currentTone.icon}`}>
            <Icon size={21} strokeWidth={2.1} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h3 className="text-[17px] font-extrabold leading-6 text-slate-900">
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-5 text-slate-500">
              {description}
            </p>
          </div>
        </div>

        <ArrowRight
          size={18}
          strokeWidth={2.2}
          aria-hidden="true"
          className="mt-1 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-600"
        />
      </div>

      <div className="mt-4 flex min-h-[24px] items-end justify-between gap-3">
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
