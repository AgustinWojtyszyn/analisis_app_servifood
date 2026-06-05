import React from 'react';
import {
  Activity,
  Award,
  BarChart3,
  FileSpreadsheet,
  HeartPulse,
  ShieldCheck,
  UserCog,
  Users
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
        featured ? 'md:col-span-2' : ''
      }`}
    >
      <div className="flex items-start gap-5">
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
    </button>
  );
}

function AdminView({ role, onNavigate }) {
  const isNutritionist = role === 'nutricionista';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-white mb-8">Panel de Gestión y Calidad</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!isNutritionist && (
          <>
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
          </>
        )}

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

        {!isNutritionist && (
          <PortalCard
            icon={UserCog}
            title="Gestión de Usuarios"
            description="Controlá roles, estado de acceso y perfiles internos."
            tone="blue"
            onClick={() => onNavigate?.('adminUsers')}
          />
        )}
      </div>
    </div>
  );
}

function UserView({ user, onNavigate }) {
  const displayName = user?.full_name || user?.name || user?.email || 'Equipo';

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
      <h2 className="text-3xl font-bold text-white mb-10 text-center">
        Hola, {displayName}. ¿Cómo te sentís hoy?
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <button
          type="button"
          onClick={() => onNavigate?.('declaration')}
          className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:bg-slate-800 transition-all cursor-pointer text-center group"
        >
          <div className="bg-emerald-500/10 text-emerald-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <HeartPulse className="w-8 h-8" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Declaración de Salud</h3>
          <p className="text-slate-400">Completá tu estado antes de iniciar la jornada.</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('policies')}
          className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:bg-slate-800 transition-all cursor-pointer text-center group"
        >
          <div className="bg-blue-500/10 text-blue-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-8 h-8" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Políticas de Seguridad</h3>
          <p className="text-slate-400">Revisá las normativas vigentes del SGC.</p>
        </button>
      </div>
    </div>
  );
}

export default function DynamicWelcomePortal(props) {
  const { user, role, onNavigate } = props;
  const currentRole = (props.role || role || '').trim().toLowerCase();
  const isAdmin = currentRole === 'admin' || currentRole === 'nutricionista';

  if (isAdmin) {
    return <AdminView user={user} role={currentRole} onNavigate={onNavigate} />;
  }

  return <UserView user={user} onNavigate={onNavigate} />;
}
