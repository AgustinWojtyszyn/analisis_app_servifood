import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  ClipboardList,
  FileSpreadsheet,
  HeartPulse,
  ShieldCheck,
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
    <div className="mx-auto max-w-7xl">
      <section className="rounded-2xl border border-slate-300 bg-slate-100 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-300 pb-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950">Accesos disponibles</h2>
            <p className="mt-1 text-sm text-slate-600">
              Ingresá directamente al módulo que necesitás gestionar.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isAdmin && (
          <>
            <PortalActionCard
              icon={FileSpreadsheet}
              title="Cargar y analizar"
              description="Subí una planilla y empezá un nuevo análisis. El historial, gráficos y análisis anual quedan disponibles desde el menú lateral."
              actionLabel="Cargar archivo"
              tone="orange"
              featured
              onClick={() => onNavigate?.('upload')}
            />

            <PortalActionCard
              icon={Activity}
              title="Solicitudes de salud"
              description="Revisá directamente los casos Amarillo/Rojo del personal."
              statusText={healthAlerts == null ? 'Ver solicitudes' : `${healthAlerts} alertas activas`}
              tone={healthAlerts > 0 ? 'orange' : 'green'}
              onClick={() => onNavigate?.('adminHealthDeclarations')}
            />

            <PortalActionCard
              icon={AlertTriangle}
              title="Certificaciones vencidas"
              description="Revisá renovaciones vencidas y responsables pendientes."
              statusText={expiredCertifications == null ? 'Ver vencimientos' : `${expiredCertifications} vencidas`}
              tone={expiredCertifications > 0 ? 'orange' : 'violet'}
              onClick={() => onNavigate?.('certifications')}
            />

            <PortalActionCard
              icon={ClipboardList}
              title="NC Clientes"
              description="Gestioná reclamos, estados y seguimiento de no conformidades."
              tone="green"
              onClick={() => onNavigate?.('customerNonconformities')}
            />

            <PortalActionCard
              icon={Users}
              title="Documentos SGC"
              description="Consultá procedimientos, registros, estrategias y archivos asociados."
              tone="slate"
              onClick={() => onNavigate?.('nutritionModules')}
            />
          </>
        )}

        {isNutritionist && (
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
      </section>
    </div>
  );
}
