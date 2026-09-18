import React, { useEffect, useState } from 'react';
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
  ArrowRight,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { normalizeRole, ROLES } from '../lib/roleRouting';
import { getAnalysisHistory } from '../services/analysis';
import { getCertifications } from '../services/certificationService';
import { getNutritionModules } from '../services/nutritionModulesService';

const toneStyles = {
  orange: 'border-orange-400/25 bg-orange-400/10 text-orange-300',
  blue: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  slate: 'border-slate-300/15 bg-slate-300/10 text-slate-200',
  violet: 'border-violet-400/20 bg-violet-400/10 text-violet-300'
};

const emptyOperationalSummary = {
  loading: true,
  analyses: null,
  latestAnalysisDate: null,
  nearExpiration: null,
  expired: null,
  documents: null,
  partialError: false
};

function formatOperationalDate(value) {
  if (!value) return 'Sin análisis recientes';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Último análisis disponible';
  return `Último: ${date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
}

function OperationalMetric({ icon: Icon, label, value, detail, tone = 'blue', onClick }) {
  const isOrange = tone === 'orange';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-[118px] flex-col justify-between rounded-xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 ${
        isOrange
          ? 'border-orange-400/20 bg-orange-400/[0.07] hover:border-orange-300/40 hover:bg-orange-400/10'
          : 'border-sky-300/15 bg-sky-300/[0.06] hover:border-sky-300/30 hover:bg-sky-300/[0.09]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-lg border ${isOrange ? toneStyles.orange : toneStyles.blue}`}>
          <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
        </span>
        <ArrowRight
          size={16}
          strokeWidth={2.2}
          aria-hidden="true"
          className="text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:text-white"
        />
      </div>
      <div className="mt-4">
        <strong className="block text-2xl font-black leading-none text-white">{value}</strong>
        <span className="mt-1.5 block text-xs font-bold text-slate-100">{label}</span>
        <span className="mt-1 block text-[11px] leading-4 text-slate-400">{detail}</span>
      </div>
    </button>
  );
}

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
  const [operationalSummary, setOperationalSummary] = useState(emptyOperationalSummary);

  useEffect(() => {
    if (!isAdmin) {
      setOperationalSummary({ ...emptyOperationalSummary, loading: false });
      return undefined;
    }

    let active = true;

    async function loadOperationalSummary() {
      const [historyResult, certificationsResult, documentsResult] = await Promise.allSettled([
        getAnalysisHistory({ page: 1, limit: 1 }),
        getCertifications(),
        getNutritionModules()
      ]);

      if (!active) return;

      const historyPayload = historyResult.status === 'fulfilled' ? historyResult.value?.data : null;
      const historyItems = Array.isArray(historyPayload?.data) ? historyPayload.data : [];
      const certificationPayload = certificationsResult.status === 'fulfilled' ? certificationsResult.value : null;
      const documentsPayload = documentsResult.status === 'fulfilled' ? documentsResult.value : null;

      setOperationalSummary({
        loading: false,
        analyses: historyResult.status === 'fulfilled' ? Number(historyPayload?.total || historyItems.length || 0) : null,
        latestAnalysisDate: historyItems[0]?.uploadDate || historyItems[0]?.createdAt || historyItems[0]?.created_at || null,
        nearExpiration: certificationsResult.status === 'fulfilled'
          ? Number(certificationPayload?.summary?.nearExpiration || 0)
          : null,
        expired: certificationsResult.status === 'fulfilled'
          ? Number(certificationPayload?.summary?.expired || 0)
          : null,
        documents: documentsResult.status === 'fulfilled'
          ? (Array.isArray(documentsPayload) ? documentsPayload.length : 0)
          : null,
        partialError: [historyResult, certificationsResult, documentsResult].some((result) => result.status === 'rejected')
      });
    }

    loadOperationalSummary();

    return () => {
      active = false;
    };
  }, [isAdmin]);

  const certificationAlerts = Number(operationalSummary.nearExpiration || 0) + Number(operationalSummary.expired || 0);
  const metricValue = (value) => operationalSummary.loading ? '—' : (value ?? '—');

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
      tone: 'orange',
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
      tone: 'blue',
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
      tone: 'blue',
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
          {isAdmin
            ? `Administración${!operationalSummary.loading && certificationAlerts > 0 ? ` · ${certificationAlerts} alertas` : ''}`
            : 'Nutrición'}
        </span>
      </div>

      {isAdmin && (
        <div className="space-y-5">
          <section
            aria-labelledby="operational-status-title"
            className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35 shadow-lg shadow-slate-950/10"
          >
            <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-300/90">
                  Estado operativo
                </p>
                <h2 id="operational-status-title" className="mt-0.5 text-lg font-bold text-white">
                  Lo importante, apenas entrás
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-400">
                {operationalSummary.partialError ? 'Actualización parcial' : 'Datos actuales'}
              </span>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <OperationalMetric
                icon={History}
                label="Análisis registrados"
                value={metricValue(operationalSummary.analyses)}
                detail={operationalSummary.loading ? 'Actualizando historial…' : formatOperationalDate(operationalSummary.latestAnalysisDate)}
                onClick={() => onNavigate?.('history')}
              />
              <OperationalMetric
                icon={Award}
                label="Próximas a vencer"
                value={metricValue(operationalSummary.nearExpiration)}
                detail="Certificaciones que requieren seguimiento"
                tone="orange"
                onClick={() => onNavigate?.('certifications')}
              />
              <OperationalMetric
                icon={AlertTriangle}
                label="Certificaciones vencidas"
                value={metricValue(operationalSummary.expired)}
                detail="Revisión prioritaria"
                tone="orange"
                onClick={() => onNavigate?.('certifications')}
              />
              <OperationalMetric
                icon={FileText}
                label="Documentos SGC"
                value={metricValue(operationalSummary.documents)}
                detail="Documentos disponibles en la biblioteca"
                onClick={() => onNavigate?.('nutritionModules')}
              />
            </div>

            <div className="mx-4 mb-4 flex flex-col gap-3 rounded-xl border border-orange-400/15 bg-gradient-to-r from-orange-400/[0.08] via-slate-950/20 to-sky-400/[0.05] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-orange-400/20 bg-orange-400/10 text-orange-300">
                  <AlertTriangle size={17} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-200">Atención hoy</p>
                  <p className="mt-0.5 text-xs text-slate-300">
                    {operationalSummary.loading
                      ? 'Revisando el estado de certificaciones…'
                      : certificationAlerts > 0
                        ? `${certificationAlerts} certificación${certificationAlerts === 1 ? '' : 'es'} requiere${certificationAlerts === 1 ? '' : 'n'} seguimiento.`
                        : 'No hay alertas de certificaciones pendientes.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('certifications')}
                className="inline-flex items-center gap-2 self-start text-xs font-bold text-orange-200 transition-colors hover:text-orange-100 sm:self-auto"
              >
                Ver certificaciones
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </section>
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
                <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-300/80">
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
              <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-300/80">
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
