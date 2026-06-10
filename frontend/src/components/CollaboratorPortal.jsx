import React from 'react';
import { HeartPulse, ShieldCheck } from 'lucide-react';
import PortalActionCard from './PortalActionCard';

export default function CollaboratorPortal({ user, onNavigate }) {
  const displayName = user?.full_name || user?.name || user?.email || 'equipo';

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col justify-center p-6">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-white">
          Hola, {displayName}. Portal del colaborador
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Accedé a las acciones esenciales para iniciar la jornada y mantener tus registros al día.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <PortalActionCard
          icon={HeartPulse}
          title="Declaración de Salud"
          description="Completá o revisá tu declaración diaria antes de comenzar la jornada."
          tone="green"
          onClick={() => onNavigate?.('declaration')}
        />
        <PortalActionCard
          icon={ShieldCheck}
          title="Políticas de Seguridad"
          description="Consultá las políticas vigentes y mantené tu aceptación actualizada."
          tone="blue"
          onClick={() => onNavigate?.('policies')}
        />
      </div>
    </div>
  );
}
