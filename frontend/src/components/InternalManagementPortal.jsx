import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  HeartPulse,
  History,
  ShieldCheck,
  UserCog
} from 'lucide-react';
import { normalizeRole, ROLES } from '../lib/roleRouting';
import { getAnalysisHistory } from '../services/analysis';
import { getCertifications } from '../services/certificationService';
import { getNutritionModules } from '../services/nutritionModulesService';
import { getAdminHealthDeclarations } from '../services/healthDeclarations';

const emptySummary = {
  loading: true,
  analyses: null,
  latestAnalysisDate: null,
  documents: null,
  expired: null,
  nearExpiration: null,
  healthAlerts: null
};

function formatLatest(value) {
  if (!value) return 'Sin análisis recientes';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Último análisis disponible';
  return `Último: ${date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}`;
}

function DashboardCard({
  icon: Icon,
  title,
  description,
  metric,
  metricLabel,
  alert = false,
  featured = false,
  onClick
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-[166px] w-full flex-col justify-between overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80 ${
        alert
          ? 'border-amber-300/25 bg-amber-300/[0.08] hover:border-amber-200/45 hover:bg-amber-300/[0.11]'
          : featured
            ? 'border-sky-300/25 bg-sky-300/[0.10] hover:border-sky-200/45 hover:bg-sky-300/[0.14]'
            : 'border-white/10 bg-white/[0.045] hover:border-sky-200/25 hover:bg-white/[0.07]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className={`grid h-11 w-11 place-items-center rounded-xl border ${
          alert
            ? 'border-amber-300/25 bg-amber-300/10 text-amber-200'
            : 'border-sky-300/20 bg-sky-300/10 text-sky-200'
        }`}>
          <Icon size={21} strokeWidth={2.1} aria-hidden="true" />
        </span>
        <ArrowRight
          size={18}
          strokeWidth={2.2}
          aria-hidden="true"
          className="text-slate-500 transition-all duration-200 group-hover:translate-x-1 group-hover:text-white"
        />
      </div>

      <div className="mt-5">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[17px] font-extrabold leading-tight text-white">
            {title}
          </h2>
          {metric !== undefined && metric !== null && (
            <strong className={`shrink-0 text-2xl font-black leading-none ${alert ? 'text-amber-200' : 'text-sky-200'}`}>
              {metric}
            </strong>
          )}
        </div>

        {metricLabel && (
          <p className={`mt-1 text-[11px] font-bold ${alert ? 'text-amber-200/90' : 'text-sky-200/80'}`}>
            {metricLabel}
          </p>
        )}

        <p className="mt-2 text-xs leading-5 text-slate-300/75">
          {description}
        </p>
      </div>
    </button>
  );
}

export default function InternalManagementPortal({ user, role, onNavigate }) {
  const normalizedRole = normalizeRole(role || user?.role);
  const isAdmin = normalizedRole === ROLES.ADMIN;
  const isNutritionist = normalizedRole === ROLES.NUTRITIONIST;
  const displayName = user?.full_name || user?.name || user?.email || 'equipo';
  const [summary, setSummary] = useState(emptySummary);

  useEffect(() => {
    if (!isAdmin) {
      setSummary({ ...emptySummary, loading: false });
      return undefined;
    }

    let active = true;

    async function loadSummary() {
      const [historyResult, certResult, docsResult, healthResult] = await Promise.allSettled([
        getAnalysisHistory({ page: 1, limit: 1 }),
        getCertifications(),
        getNutritionModules(),
        getAdminHealthDeclarations()
      ]);

      if (!active) return;

      const historyPayload = historyResult.status === 'fulfilled' ? historyResult.value?.data : null;
      const historyItems = Array.isArray(historyPayload?.data) ? historyPayload.data : [];
      const certifications = certResult.status === 'fulfilled' ? certResult.value : null;
      const documents = docsResult.status === 'fulfilled' ? docsResult.value : null;
      const healthRows = healthResult.status === 'fulfilled' && Array.isArray(healthResult.value) ? healthResult.value : null;

      setSummary({
        loading: false,
        analyses: historyResult.status === 'fulfilled'
          ? Number(historyPayload?.total || historyItems.length || 0)
          : null,
        latestAnalysisDate: historyItems[0]?.uploadDate || historyItems[0]?.createdAt || historyItems[0]?.created_at || null,
        documents: docsResult.status === 'fulfilled'
          ? (Array.isArray(documents) ? documents.length : 0)
          : null,
        expired: certResult.status === 'fulfilled'
          ? Number(certifications?.summary?.expired || certifications?.items?.filter?.((item) => item.daysUntilExpiration < 0)?.length || 0)
          : null,
        nearExpiration: certResult.status === 'fulfilled'
          ? Number(certifications?.summary?.nearExpiration || certifications?.items?.filter?.((item) => item.daysUntilExpiration >= 0 && item.daysUntilExpiration <= 30)?.length || 0)
          : null,
        healthAlerts: healthRows
          ? healthRows.filter((row) => ['rojo', 'amarillo'].includes(String(row.trafficLight || '').toLowerCase())).length
          : null
      });
    }

    loadSummary();

    return () => {
      active = false;
    };
  }, [isAdmin]);

  const metric = (value) => summary.loading ? '—' : (value ?? '—');

  const adminCards = useMemo(() => [
    {
      icon: FileSpreadsheet,
      title: 'Cargar archivos',
      description: 'Subí planillas y generá nuevos análisis.',
      featured: true,
      target: 'upload'
    },
    {
      icon: BarChart3,
      title: 'Análisis anual',
      description: 'Resumen, sectores, clasificaciones y evolución anual.',
      target: 'annualAnalysis'
    },
    {
      icon: History,
      title: 'Historial',
      description: formatLatest(summary.latestAnalysisDate),
      metric: metric(summary.analyses),
      metricLabel: 'análisis',
      target: 'history'
    },
    {
      icon: ClipboardList,
      title: 'NC Clientes',
      description: 'Reclamos, estados y seguimiento de no conformidades.',
      target: 'customerNonconformities'
    },
    {
      icon: Activity,
      title: 'Solicitudes de salud',
      description: 'Abrí directamente los casos Amarillo/Rojo del personal.',
      metric: metric(summary.healthAlerts),
      metricLabel: 'alertas activas',
      alert: Number(summary.healthAlerts || 0) > 0,
      target: 'adminHealthDeclarations'
    },
    {
      icon: AlertTriangle,
      title: 'Certificaciones vencidas',
      description: 'Revisá renovaciones y responsables pendientes.',
      metric: metric(summary.expired),
      metricLabel: 'vencidas',
      alert: Number(summary.expired || 0) > 0,
      target: 'certifications'
    },
    {
      icon: Award,
      title: 'Certificaciones',
      description: 'Próximos vencimientos y control general.',
      metric: metric(summary.nearExpiration),
      metricLabel: 'próximas',
      target: 'certifications'
    },
    {
      icon: FileText,
      title: 'Documentos SGC',
      description: 'Procedimientos, registros y documentación vigente.',
      metric: metric(summary.documents),
      metricLabel: 'documentos',
      target: 'nutritionModules'
    },
    {
      icon: ShieldCheck,
      title: 'Políticas',
      description: 'Políticas internas y aceptación del personal.',
      target: 'policies'
    },
    {
      icon: UserCog,
      title: 'Usuarios y permisos',
      description: 'Roles, accesos y administración de usuarios.',
      target: 'adminUsers'
    },
    {
      icon: HeartPulse,
      title: 'Mi declaración',
      description: 'Completá o revisá tu declaración diaria de salud.',
      target: 'declaration'
    }
  ], [
    summary.analyses,
    summary.latestAnalysisDate,
    summary.healthAlerts,
    summary.expired,
    summary.nearExpiration,
    summary.documents,
    summary.loading
  ]);

  const nutritionCards = [
    {
      icon: FileText,
      title: 'Documentos SGC',
      description: 'Procedimientos, registros y documentación disponible.',
      target: 'nutritionModules'
    },
    {
      icon: Award,
      title: 'Certificaciones',
      description: 'Vencimientos, responsables y seguimiento.',
      target: 'certifications'
    },
    {
      icon: ShieldCheck,
      title: 'Políticas',
      description: 'Políticas internas vigentes.',
      target: 'policies'
    },
    {
      icon: HeartPulse,
      title: 'Mi declaración',
      description: 'Declaración diaria de salud.',
      target: 'declaration'
    }
  ];

  const cards = isAdmin ? adminCards : nutritionCards;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#18283e] shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300">
              Gestión interna
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Hola, {displayName}
            </h1>
            <p className="mt-1 text-sm text-slate-300/70">
              Elegí un módulo y entrá directo a gestionar.
            </p>
          </div>

          <p className="text-xs font-semibold text-slate-400">
            {isAdmin ? 'Administración' : isNutritionist ? 'Nutrición' : 'Accesos habilitados'}
          </p>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:p-5 xl:grid-cols-3">
          {cards.map((card) => (
            <DashboardCard
              key={card.title}
              {...card}
              onClick={() => onNavigate?.(card.target)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
