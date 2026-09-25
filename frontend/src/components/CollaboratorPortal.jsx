import React from 'react';
import { HeartPulse, ShieldCheck } from 'lucide-react';
import PortalActionCard from './PortalActionCard';

export default function CollaboratorPortal({ onNavigate }) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h2 className="text-lg font-extrabold text-slate-900">Accesos disponibles</h2>
        <p className="mt-1 text-sm text-slate-500">
          Accedé a las acciones esenciales para iniciar la jornada y mantener tus registros al día.
        </p>
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
