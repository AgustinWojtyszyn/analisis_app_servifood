import React from 'react';
import {
  Activity,
  Award,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  HeartPulse,
  History,
  ShieldCheck,
  UserCog,
  Users,
  ArrowRight
} from 'lucide-react';
import { normalizeRole, ROLES } from '../lib/roleRouting';

const toneStyles = {
  orange: 'border-orange-400/20 bg-orange-400/10 text-orange-300',
  green: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  blue: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  slate: 'border-slate-300/15 bg-slate-300/10 text-slate-200',
  violet: 'border-violet-400/20 bg-violet-400/10 text-violet-300'
};

function CompactAction({ icon: Icon, title, description, tone = 'blue', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${toneStyles[tone] || toneStyles.blue}`}
      >
        <Icon size={19} strokeWidth={2.1} aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-white">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-300/75">{description}</span>
      </span>

      <ArrowRight
        size={17}
        strokeWidth={2.2}
        aria-hidden="true"
        className="shrink-0 text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:text-sky-200"
      />
    </button>
  );
}

export default function InternalManagementPortal({ user, role, onNavigate }) {
  const normalizedRole = normalizeRole(role || user?.role);
  const isAdmin = normalizedRole === ROLES.ADMIN;
  const isNutritionist = normalizedRole === ROLES.NUTRITIONIST;
  const displayName = user?.full_name || user?.name || user?.email || 'equipo';
  const enabledModules = isAdmin ? 11 : 4;

  const dailyActions = [
    {
      icon: BarChart3,
      title: 'Indicadores y comparador',
      description: 'Gráficos actuales y comparación histórica.',
      tone: 'blue',
      target: 'charts'
    },
    {
      icon: ClipboardList,
      title: 'NC Clientes',
      description: 'Reclamos, normalización y KPIs de clientes.',
      tone: 'green',
      target: 'customerNonconformities'
    },
    {
      icon: History,
      title: 'Historial',
      description: 'Análisis anteriores y resultados exportables.',
      tone: 'orange',
      target: 'history'
    }
  ];

  const managementActions = [
    {
      icon: Activity,
      title: 'Declaraciones administrativas',
      description: 'Estado diario y registros de salud.',
      tone: 'green',
      target: 'adminHealthDeclarations'
    },
    {
      icon: ClipboardCheck,
      title: 'Reglas',
      description: 'Criterios de clasificación y acciones.',
      tone: 'slate',
      target: 'rules'
    },
    {
      icon: UserCog,
      title: 'Gestión de usuarios',
      description: 'Roles, accesos y perfiles internos.',
      tone: 'blue',
      target: 'adminUsers'
    },
    {
      icon: Users,
      title: 'Documentos SGC',
      description: 'Procedimientos, registros y archivos.',
      tone: 'slate',
      target: 'nutritionModules'
    },
    {
      icon: Award,
      title: 'Certificaciones',
      description: 'Vencimientos, responsables y alertas.',
      tone: 'violet',
      target: 'certifications'
    },
    {
      icon: ShieldCheck,
      title: 'Políticas',
      description: 'Políticas internas vigentes.',
      tone: 'blue',
      target: 'policies'
    },
    {
      icon: HeartPulse,
      title: 'Declaración de Salud',
      description: 'Declaración personal de salud.',
      tone: 'green',
      target: 'declaration'
    }
  ];

  const nutritionActions = managementActions.filter(({ target }) =>
    ['nutritionModules', 'certifications', 'policies', 'declaration'].includes(target)
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8 lg:py-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
              Centro de operaciones
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-300">
              {enabledModules} módulos habilitados
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-300/80">
            Hola, {displayName}. Elegí una herramienta para continuar.
          </p>
        </div>

        <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">
          {isAdmin ? 'Administración' : 'Nutrición'}
        </span>
      </div>

      {isAdmin && (
        <div className="space-y-5">
          <section
            aria-labelledby="daily-work-title"
            className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35 shadow-lg shadow-slate-950/10"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-300/80">
                  Análisis y operación
                </p>
                <h2 id="daily-work-title" className="mt-0.5 text-lg font-bold text-white">
                  Trabajo diario
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-400">4 accesos</span>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr]">
              <div className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
                <button
                  type="button"
                  onClick={() => onNavigate?.('upload')}
                  className="group flex h-full min-h-[178px] w-full flex-col justify-between rounded-xl border border-orange-400/15 bg-gradient-to-br from-orange-400/10 via-slate-900/35 to-slate-950/20 p-5 text-left transition-all hover:border-orange-300/30 hover:from-orange-400/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-orange-400/20 bg-orange-400/10 text-orange-300">
                      <FileSpreadsheet size={21} strokeWidth={2.1} aria-hidden="true" />
                    </span>
                    <ArrowRight
                      size={19}
                      strokeWidth={2.2}
                      aria-hidden="true"
                      className="text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:text-orange-200"
                    />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white">Cargar archivos</h3>
                    <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-300/80">
                      Subí planillas, clasificá desvíos y generá resultados operativos trazables.
                    </p>
                    <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-orange-100">
                      Cargar archivo
                      <ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" />
                    </span>
                  </div>
                </button>
              </div>

              <div className="divide-y divide-white/10 p-2">
                {dailyActions.map((action) => (
                  <CompactAction
                    key={action.target}
                    icon={action.icon}
                    title={action.title}
                    description={action.description}
                    tone={action.tone}
                    onClick={() => onNavigate?.(action.target)}
                  />
                ))}
              </div>
            </div>
          </section>

          <section
            aria-labelledby="management-title"
            className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35 shadow-lg shadow-slate-950/10"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300/80">
                  Calidad y gestión
                </p>
                <h2 id="management-title" className="mt-0.5 text-lg font-bold text-white">
                  Administración interna
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-400">7 accesos</span>
            </div>

            <div className="grid gap-x-2 p-2 md:grid-cols-2 xl:grid-cols-3">
              {managementActions.map((action) => (
                <CompactAction
                  key={action.target}
                  icon={action.icon}
                  title={action.title}
                  description={action.description}
                  tone={action.tone}
                  onClick={() => onNavigate?.(action.target)}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {isNutritionist && (
        <section
          aria-labelledby="nutrition-tools-title"
          className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35 shadow-lg shadow-slate-950/10"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300/80">
                Calidad y gestión
              </p>
              <h2 id="nutrition-tools-title" className="mt-0.5 text-lg font-bold text-white">
                Herramientas habilitadas
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-400">4 accesos</span>
          </div>

          <div className="grid gap-x-2 p-2 md:grid-cols-2">
            {nutritionActions.map((action) => (
              <CompactAction
                key={action.target}
                icon={action.icon}
                title={action.title}
                description={action.description}
                tone={action.tone}
                onClick={() => onNavigate?.(action.target)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
