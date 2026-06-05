import React from 'react';
import {
  Activity,
  BarChart3,
  FileSpreadsheet,
  HeartPulse,
  ShieldCheck,
  UserCog,
  Users,
  Award
} from 'lucide-react';

function PortalCard({ icon: Icon, title, description, tone = 'orange', featured = false, onClick }) {
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
        featured ? 'md:col-span-2 lg:col-span-2' : ''
      }`}
    >
      <div className="flex items-start gap-5">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${toneClasses[tone] || toneClasses.orange}`}>
          <Icon size={24} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className={`${featured ? 'text-2xl' : 'text-xl'} font-bold text-white`}>
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

function UserView({ user, onNavigate }) {
  const displayName = user?.name || user?.email || 'equipo';

  return (
    <main className="flex min-h-[calc(100vh-180px)] items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-400">
            Servi Food
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
            Hola, {displayName}. ¿Cómo te sentís hoy?
          </h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PortalCard
            icon={HeartPulse}
            title="Declaración Diaria de Salud"
            description="Completá tu estado antes de iniciar la jornada."
            tone="green"
            onClick={() => onNavigate?.('declaration')}
          />
          <PortalCard
            icon={ShieldCheck}
            title="Políticas de Seguridad SGC"
            description="Revisá las normativas vigentes."
            tone="blue"
            onClick={() => onNavigate?.('policies')}
          />
        </div>
      </section>
    </main>
  );
}

function AdminView({ onNavigate }) {
  return (
    <main className="min-h-[calc(100vh-180px)] bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-400">
            Servi Food
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
            Panel de Gestión y Calidad
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
            Accedé al ecosistema operativo para auditoría, salud, documentación, certificaciones y administración.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <PortalCard
            icon={FileSpreadsheet}
            title="Auditoría Excel"
            description="Subí planillas, clasificá desvíos y generá resultados operativos trazables."
            tone="orange"
            featured
            onClick={() => onNavigate?.('upload')}
          />
          <PortalCard
            icon={BarChart3}
            title="Dashboard de Desvíos"
            description="Visualizá gráficos y patrones por categoría, área e impacto."
            tone="blue"
            onClick={() => onNavigate?.('charts')}
          />
          <PortalCard
            icon={Activity}
            title="Control de Salud"
            description="Ver declaraciones de los empleados y el estado diario del equipo."
            tone="green"
            onClick={() => onNavigate?.('adminHealthDeclarations')}
          />
          <PortalCard
            icon={Award}
            title="Gestión SGC y Certificaciones"
            description="Administrá documentos, vencimientos y alertas preventivas."
            tone="violet"
            onClick={() => onNavigate?.('certifications')}
          />
          <PortalCard
            icon={Users}
            title="Documentos SGC"
            description="Gestioná procedimientos, registros, estrategias y archivos asociados."
            tone="slate"
            onClick={() => onNavigate?.('nutritionModules')}
          />
          <PortalCard
            icon={UserCog}
            title="Gestión de Usuarios"
            description="Controlá roles, estado de acceso y perfiles internos."
            tone="blue"
            onClick={() => onNavigate?.('adminUsers')}
          />
        </div>
      </section>
    </main>
  );
}

export default function DynamicWelcomePortal({ user, role, onNavigate }) {
  if (String(role || '').toLowerCase() === 'admin') {
    return <AdminView user={user} onNavigate={onNavigate} />;
  }

  return <UserView user={user} onNavigate={onNavigate} />;
}
