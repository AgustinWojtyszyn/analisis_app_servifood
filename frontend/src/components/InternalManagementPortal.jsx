import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
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
import { getCertifications } from '../services/certificationService';
import { getAdminHealthDeclarations } from '../services/healthDeclarations';

export default function InternalManagementPortal({ user, role, onNavigate }) {
  const normalizedRole = normalizeRole(role || user?.role);
  const isAdmin = normalizedRole === ROLES.ADMIN;
  const isNutritionist = normalizedRole === ROLES.NUTRITIONIST;
  const displayName = user?.full_name || user?.name || user?.email || 'equipo';

  const [expiredCertifications, setExpiredCertifications] = useState(null);
  const [healthAlerts, setHealthAlerts] = useState(null);

  useEffect(() => {
    if (!isAdmin) return undefined;

    let active = true;

    Promise.allSettled([
      getCertifications(),
      getAdminHealthDeclarations()
    ]).then(([certResult, healthResult]) => {
      if (!active) return;

      if (certResult.status === 'fulfilled') {
        const payload = certResult.value;
        const expired = Number(
          payload?.summary?.expired
          ?? payload?.items?.filter?.((item) => Number(item.daysUntilExpiration) < 0)?.length
          ?? 0
        );
        setExpiredCertifications(expired);
      } else {
        setExpiredCertifications(null);
      }

      if (healthResult.status === 'fulfilled') {
        const rows = Array.isArray(healthResult.value) ? healthResult.value : [];
        const alerts = rows.filter((row) =>
          ['rojo', 'amarillo'].includes(String(row.trafficLight || '').toLowerCase())
        ).length;
        setHealthAlerts(alerts);
      } else {
        setHealthAlerts(null);
      }
    });

    return () => {
      active = false;
    };
  }, [isAdmin]);

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
              title="Indicadores y comparador"
              description="Analizá gráficos del análisis actual o compará períodos históricos para detectar mejoras y desvíos."
              tone="blue"
              onClick={() => onNavigate?.('charts')}
            />

            <PortalActionCard
              icon={ClipboardList}
              title="NC Clientes"
              description="Cargá reclamos de clientes, normalizá datos y analizá KPIs por mes, peligro y sector."
              tone="green"
              onClick={() => onNavigate?.('customerNonconformities')}
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
              title="Solicitudes de salud"
              description="Abrí el gestor de declaraciones y revisá los casos que requieren atención."
              statusText={healthAlerts == null ? 'Ver solicitudes' : `${healthAlerts} alertas activas`}
              tone={healthAlerts > 0 ? 'orange' : 'green'}
              onClick={() => onNavigate?.('adminHealthDeclarations')}
            />

            <PortalActionCard
              icon={AlertTriangle}
              title="Certificaciones vencidas"
              description="Entrá directo al control de renovaciones vencidas y responsables."
              statusText={expiredCertifications == null ? 'Ver vencimientos' : `${expiredCertifications} vencidas`}
              tone={expiredCertifications > 0 ? 'orange' : 'violet'}
              onClick={() => onNavigate?.('certifications')}
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
              description="Gestioná próximos vencimientos, responsables y alertas preventivas."
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
