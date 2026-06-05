import React from 'react';
import {
  Activity,
  BarChart3,
  FileSpreadsheet,
  HeartPulse,
  Lock,
  Mail,
  ShieldCheck,
  UserCog,
  Award
} from 'lucide-react';

const isAuthenticated = true;
const role = 'admin';
const mockUser = {
  name: 'Bruno',
  email: 'bruno@servifood.com'
};

function AmbientBackground() {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-blue-600/10 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-2/3 bg-orange-600/10 blur-[100px]" />
    </>
  );
}

function FieldIcon({ children }) {
  return (
    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
      {children}
    </span>
  );
}

function PublicLandingLogin() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <AmbientBackground />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-orange-400">
          Servi Food
        </p>
        <h1 className="mt-5 text-5xl font-black leading-tight text-white md:text-6xl">
          Portal de Calidad y Operaciones
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
          Centralizá declaraciones de salud, auditorías operativas, SGC, certificaciones y control de calidad desde una plataforma interna premium.
        </p>

        <form className="mx-auto mt-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-left shadow-2xl backdrop-blur-md">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Iniciar sesión</h2>
            <p className="mt-2 text-sm text-slate-500">
              Accedé con tu cuenta corporativa.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Email</span>
              <span className="relative block">
                <FieldIcon>
                  <Mail size={18} aria-hidden="true" />
                </FieldIcon>
                <input
                  type="email"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 pl-11 text-white focus:border-orange-500 focus:outline-none"
                  placeholder="nombre@servifood.com"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Contraseña</span>
              <span className="relative block">
                <FieldIcon>
                  <Lock size={18} aria-hidden="true" />
                </FieldIcon>
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 pl-11 text-white focus:border-orange-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="mt-7 w-full rounded-xl bg-orange-500 px-4 py-3.5 font-bold text-white shadow-[0_10px_30px_rgba(249,115,22,0.24)] transition-all hover:-translate-y-0.5 hover:bg-orange-600"
          >
            Iniciar Sesión
          </button>

          <p className="mt-5 text-center text-sm text-slate-500">
            ¿Necesitás acceso? Contactá a un administrador.
          </p>
        </form>
      </section>
    </main>
  );
}

function FeatureCard({ icon: Icon, title, description, accent = 'orange', featured = false }) {
  const accents = {
    orange: 'border-orange-500/20 bg-orange-500/10 text-orange-400',
    blue: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
    green: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    violet: 'border-violet-500/20 bg-violet-500/10 text-violet-400',
    slate: 'border-slate-700 bg-slate-800/70 text-slate-300'
  };

  return (
    <article
      className={`group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/40 p-6 transition-all hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-800/60 ${
        featured ? 'md:col-span-2' : ''
      }`}
    >
      <div className={`grid h-14 w-14 place-items-center rounded-2xl border ${accents[accent] || accents.orange}`}>
        <Icon size={26} strokeWidth={2.2} aria-hidden="true" />
      </div>
      <h2 className={`${featured ? 'mt-7 text-3xl' : 'mt-6 text-xl'} font-bold text-white`}>
        {title}
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
        {description}
      </p>
    </article>
  );
}

function AdminLanding({ user }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <AmbientBackground />

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-12 lg:py-16">
        <header className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.26em] text-orange-400">
              Servi Food
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">
              Hola, {user?.name || 'equipo'} - Panel de Administración
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
              Gestioná auditorías, indicadores, salud del equipo, documentación SGC, certificaciones, usuarios y reglas desde un único centro operativo.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-4 backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Sesión activa
            </p>
            <p className="mt-1 text-sm font-medium text-slate-200">{user?.email}</p>
          </div>
        </header>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={FileSpreadsheet}
            title="Auditoría Excel"
            description="Subí planillas, clasificá desvíos, normalizá datos críticos y generá resultados listos para revisión operativa."
            accent="orange"
            featured
          />
          <FeatureCard
            icon={BarChart3}
            title="Panel de Desvíos"
            description="Visualizá patrones, categorías, áreas afectadas y evolución de indicadores de calidad."
            accent="blue"
          />
          <FeatureCard
            icon={Activity}
            title="Declaraciones de Salud"
            description="Monitoreá el estado diario del equipo y detectá alertas antes del inicio de jornada."
            accent="green"
          />
          <FeatureCard
            icon={Award}
            title="Gestión SGC y Certificaciones"
            description="Administrá documentos, vencimientos, responsables y alertas preventivas."
            accent="violet"
          />
          <FeatureCard
            icon={UserCog}
            title="Usuarios y Reglas"
            description="Controlá accesos, roles y reglas que sostienen la clasificación operativa."
            accent="slate"
          />
        </div>
      </section>
    </main>
  );
}

function UserLanding({ user }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <AmbientBackground />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <header className="mb-10 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.26em] text-orange-400">
            Servi Food
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">
            Hola, {user?.name || 'equipo'}. ¿Cómo te sentís hoy?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-400">
            Accedé rápido a las acciones importantes antes de iniciar tu jornada.
          </p>
        </header>

        <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-8 md:grid-cols-2">
          <FeatureCard
            icon={HeartPulse}
            title="Declaración Diaria de Salud"
            description="Completá tu estado de salud antes de iniciar la jornada."
            accent="green"
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Políticas de Seguridad SGC"
            description="Revisá las normativas vigentes y mantené tu aceptación actualizada."
            accent="blue"
          />
        </div>
      </section>
    </main>
  );
}

export default function SmartHome() {
  if (!isAuthenticated) {
    return <PublicLandingLogin />;
  }

  if (role === 'admin') {
    return <AdminLanding user={mockUser} />;
  }

  return <UserLanding user={mockUser} />;
}
