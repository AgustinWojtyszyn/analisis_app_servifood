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
  Users
} from 'lucide-react';
import PortalActionCard from './PortalActionCard';
import { normalizeRole, ROLES } from '../lib/roleRouting';

export default function InternalManagementPortal({ user, role, onNavigate }) {
  const normalizedRole = normalizeRole(role || user?.role);
  const isAdmin = normalizedRole === ROLES.ADMIN;
  const isNutritionist = normalizedRole === ROLES.NUTRITIONIST;
  const displayName = user?.full_name || user?.name || user?.email || 'equipo';
  const enabledModules = isAdmin ? 11 : 4;

  return (
    <div className="mx-auto max-w-7xl px-6 py-7 lg:px-8 lg:py-8">
      <div className="mb-7 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
              Centro de operaciones
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
              {enabledModules} módulos habilitados
            </span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Gestión interna
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300/80">
            Hola, {displayName}. Accedé a las herramientas disponibles para tu perfil.
          </p>
        </div>

        <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right sm:block">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Perfil activo
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {isAdmin ? 'Administración' : 'Nutrición'}
          </p>
        </div>
      </div>

      {isAdmin && (
        <>
          <section aria-labelledby="analysis-operations-title">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-300/80">
                Análisis y operación
              </p>
              <h3 id="analysis-operations-title" className="mt-1 text-lg font-semibold text-white">
                Trabajo diario
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              <PortalActionCard
                icon={FileSpreadsheet}
                title="Cargar archivos"
                description="Subí planillas, clasificá desvíos y generá resultados operativos trazables."
                actionLabel="Cargar archivo"
                tone="orange"
                featured
                onClick={() => onNavigate?.('upload')}
              />
              <PortalActionCard
                icon={BarChart3}
                title="Indicadores y comparador"
                description="Analizá gráficos del análisis actual o compará períodos históricos para detectar mejoras y desvíos."
                actionLabel="Ver indicadores"
                tone="blue"
                onClick={() => onNavigate?.('charts')}
              />
              <PortalActionCard
                icon={ClipboardList}
                title="NC Clientes"
                description="Cargá reclamos de clientes, normalizá datos y analizá KPIs por mes, peligro y sector."
                actionLabel="Gestionar NC"
                tone="green"
                onClick={() => onNavigate?.('customerNonconformities')}
              />
              <PortalActionCard
                icon={History}
                title="Historial"
                description="Consultá análisis anteriores, estados y resultados exportables."
                actionLabel="Ver historial"
                tone="orange"
                onClick={() => onNavigate?.('history')}
              />
            </div>
          </section>

          <section className="mt-9" aria-labelledby="quality-management-title">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300/80">
                Calidad y gestión
              </p>
              <h3 id="quality-management-title" className="mt-1 text-lg font-semibold text-white">
                Administración interna
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              <PortalActionCard
                icon={Activity}
                title="Declaraciones administrativas"
                description="Consultá el estado diario del equipo y administrá registros de salud."
                actionLabel="Revisar registros"
                tone="green"
                onClick={() => onNavigate?.('adminHealthDeclarations')}
              />
              <PortalActionCard
                icon={ClipboardCheck}
                title="Reglas"
                description="Administrá criterios de clasificación y acciones sugeridas."
                actionLabel="Administrar reglas"
                tone="slate"
                onClick={() => onNavigate?.('rules')}
              />
              <PortalActionCard
                icon={UserCog}
                title="Gestión de usuarios"
                description="Controlá roles, estado de acceso y perfiles internos."
                actionLabel="Gestionar usuarios"
                tone="blue"
                onClick={() => onNavigate?.('adminUsers')}
              />
              <PortalActionCard
                icon={Users}
                title="Documentos SGC"
                description="Consultá procedimientos, registros, estrategias y archivos asociados."
                actionLabel="Ver documentos"
                tone="slate"
                onClick={() => onNavigate?.('nutritionModules')}
              />
              <PortalActionCard
                icon={Award}
                title="Certificaciones"
                description="Gestioná vencimientos, responsables y alertas preventivas."
                actionLabel="Ver certificaciones"
                tone="violet"
                onClick={() => onNavigate?.('certifications')}
              />
              <PortalActionCard
                icon={ShieldCheck}
                title="Políticas"
                description="Accedé a las políticas internas vigentes."
                actionLabel="Ver políticas"
                tone="blue"
                onClick={() => onNavigate?.('policies')}
              />
              <PortalActionCard
                icon={HeartPulse}
                title="Declaración de Salud"
                description="Completá o revisá tu declaración personal."
                actionLabel="Abrir declaración"
                tone="green"
                onClick={() => onNavigate?.('declaration')}
              />
            </div>
          </section>
        </>
      )}

      {isNutritionist && (
        <section aria-labelledby="nutrition-modules-title">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300/80">
              Calidad y gestión
            </p>
            <h3 id="nutrition-modules-title" className="mt-1 text-lg font-semibold text-white">
              Herramientas habilitadas
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <PortalActionCard
              icon={Users}
              title="Documentos SGC"
              description="Consultá procedimientos, registros, estrategias y archivos asociados."
              actionLabel="Ver documentos"
              tone="slate"
              onClick={() => onNavigate?.('nutritionModules')}
            />
            <PortalActionCard
              icon={Award}
              title="Certificaciones"
              description="Gestioná vencimientos, responsables y alertas preventivas."
              actionLabel="Ver certificaciones"
              tone="violet"
              onClick={() => onNavigate?.('certifications')}
            />
            <PortalActionCard
              icon={ShieldCheck}
              title="Políticas"
              description="Accedé a las políticas internas vigentes."
              actionLabel="Ver políticas"
              tone="blue"
              onClick={() => onNavigate?.('policies')}
            />
            <PortalActionCard
              icon={HeartPulse}
              title="Declaración de Salud"
              description="Completá o revisá tu declaración personal."
              actionLabel="Abrir declaración"
              tone="green"
              onClick={() => onNavigate?.('declaration')}
            />
          </div>
        </section>
      )}
    </div>
  );
}
