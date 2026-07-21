import React from 'react';
import { HeartPulse, ShieldCheck } from 'lucide-react';
import PortalActionCard from './PortalActionCard';

export default function CollaboratorPortal({ user, onNavigate }) {
  const displayName = user?.full_name || user?.name || user?.email || 'equipo';

  return (
    <div className="mx-auto flex max-w-5xl flex-col px-6 pb-6 pt-2 md:pt-4">
      <div className="mb-5 text-center">
        <h2 className="text-3xl font-bold text-white">
          Hola, {displayName}. Portal del colaborador
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Accedé a las acciones esenciales para iniciar la jornada y mantener tus registros al día.
        </p>
      </div>

      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/80">
        Accesos disponibles
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PortalActionCard
          icon={HeartPulse}
          title="Declaración de Salud"
          description="Completá o revisá tu declaración diaria antes de comenzar la jornada."
          actionLabel="Completar declaración"
          tone="green"
          onClick={() => onNavigate?.('declaration')}
        />
        <PortalActionCard
          icon={ShieldCheck}
          title="Políticas de Seguridad"
          description="Consultá las políticas vigentes y mantené tu aceptación actualizada."
          actionLabel="Ver políticas"
          tone="blue"
          onClick={() => onNavigate?.('policies')}
        />
      </div>
    </div>
  );
}
