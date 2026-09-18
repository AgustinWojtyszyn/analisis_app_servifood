import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function PortalActionCard({
  icon: Icon,
  title,
  description,
  actionLabel = 'Abrir módulo',
  tone = 'orange',
  featured = false,
  onClick
}) {
  const tones = {
    orange: {
      icon: 'border-orange-400/20 bg-orange-400/10 text-orange-300',
      glow: 'from-orange-400/10'
    },
    green: {
      icon: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
      glow: 'from-emerald-400/10'
    },
    blue: {
      icon: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
      glow: 'from-sky-400/10'
    },
    slate: {
      icon: 'border-slate-300/15 bg-slate-300/10 text-slate-200',
      glow: 'from-slate-300/10'
    },
    violet: {
      icon: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
      glow: 'from-violet-400/10'
    }
  };

  const currentTone = tones[tone] || tones.orange;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45 p-5 text-left shadow-lg shadow-slate-950/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-slate-900/65 hover:shadow-xl hover:shadow-slate-950/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-950 sm:p-6 ${
        featured ? 'md:col-span-2' : ''
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${currentTone.glow} to-transparent opacity-70 transition-opacity duration-200 group-hover:opacity-100`}
        aria-hidden="true"
      />

      <div className="relative flex h-full min-h-[138px] flex-col">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${currentTone.icon}`}
          >
            <Icon size={21} strokeWidth={2.1} aria-hidden="true" />
          </div>

          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-all duration-200 group-hover:border-sky-300/30 group-hover:bg-sky-400/10 group-hover:text-sky-200"
            aria-hidden="true"
          >
            <ArrowRight
              size={17}
              strokeWidth={2.2}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        </div>

        <div className="mt-5">
          <h3 className={`${featured ? 'text-2xl' : 'text-xl'} font-bold tracking-tight text-white`}>
            {title}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300/80">
            {description}
          </p>
        </div>

        <div className="mt-auto pt-5">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition-colors duration-200 group-hover:text-white">
            {actionLabel}
            <ArrowRight
              size={15}
              strokeWidth={2.2}
              aria-hidden="true"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </div>
    </button>
  );
}
