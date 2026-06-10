import React from 'react';
import {
  Activity,
  Award,
  BarChart3,
  ClipboardCheck,
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

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">
          Gestión interna
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Hola, {displayName}. Accedé a los módulos habilitados para tu rol.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isAdmin && (
          <>
            <PortalActionCard
              icon={FileSpreadsheet}
              title="Cargar archivos"
              description="Subí planillas, clasificá desvíos y generá resultados operativos trazables."
              tone="orange"
              featured
              onClick={() => onNavigate?.('upload')}
            />
            <PortalActionCard
              icon={BarChart3}
              title="Dashboard e indicadores"
              description="Visualizá patrones por categoría, área, estado e impacto operativo."
              tone="blue"
              onClick={() => onNavigate?.('charts')}
            />
            <PortalActionCard
              icon={History}
              title="Historial"
              description="Consultá análisis anteriores, estados y resultados exportables."
              tone="orange"
              onClick={() => onNavigate?.('history')}
            />
            <PortalActionCard
              icon={Activity}
              title="Declaraciones administrativas"
              description="Consultá el estado diario del equipo y administrá registros de salud."
              tone="green"
              onClick={() => onNavigate?.('adminHealthDeclarations')}
            />
            <PortalActionCard
              icon={ClipboardCheck}
              title="Reglas"
              description="Administrá criterios de clasificación y acciones sugeridas."
              tone="slate"
              onClick={() => onNavigate?.('rules')}
            />
            <PortalActionCard
              icon={UserCog}
              title="Gestión de usuarios"
              description="Controlá roles, estado de acceso y perfiles internos."
              tone="blue"
              onClick={() => onNavigate?.('adminUsers')}
            />
          </>
        )}

        {(isAdmin || isNutritionist) && (
          <>
            <PortalActionCard
              icon={Users}
              title="Documentos SGC"
              description="Consultá procedimientos, registros, estrategias y archivos asociados."
              tone="slate"
              onClick={() => onNavigate?.('nutritionModules')}
            />
            <PortalActionCard
              icon={Award}
              title="Certificaciones"
              description="Gestioná vencimientos, responsables y alertas preventivas."
              tone="violet"
              onClick={() => onNavigate?.('certifications')}
            />
            <PortalActionCard
              icon={ShieldCheck}
              title="Políticas"
              description="Accedé a las políticas internas vigentes."
              tone="blue"
              onClick={() => onNavigate?.('policies')}
            />
            <PortalActionCard
              icon={HeartPulse}
              title="Declaración de Salud"
              description="Completá o revisá tu declaración personal."
              tone="green"
              onClick={() => onNavigate?.('declaration')}
            />
          </>
        )}
      </div>
    </div>
  );
}
