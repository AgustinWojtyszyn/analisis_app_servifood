import React, { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Plus, Minus } from 'lucide-react';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';
import './PublicLanding.css';

const screens = {
  management: { file: 'internalManagement', title: 'Gestión interna', alt: 'Pantalla real de Gestión interna con los accesos a los módulos operativos de ServiFood' },
  charts: { file: 'charts', title: 'Gráficos', alt: 'Pantalla real de Gráficos con distribución de desvíos por área y clasificación' },
  annual: { file: 'annualAnalysis', title: 'Análisis anual', alt: 'Pantalla real de Análisis anual con filtros, indicadores y desvíos por mes' },
  customers: { file: 'customerNonconformities', title: 'NC Clientes', alt: 'Pantalla real de NC Clientes con carga de Excel y filtros de reclamos' },
  documents: { file: 'nutritionModules', title: 'Documentos SGC', alt: 'Biblioteca real de Documentos SGC con carpetas, procedimientos y registros' },
  certifications: { file: 'certifications', title: 'Certificaciones', alt: 'Pantalla real de Certificaciones con vencimientos, responsables y estados' },
  users: { file: 'adminUsers', title: 'Usuarios', alt: 'Pantalla real de Gestión de usuarios con roles y estado de acceso' }
};

const analysisViews = [
  { key: 'charts', number: '01', description: 'Del registro al patrón.', detail: 'Visualizá los desvíos por área y clasificación. Compará períodos para entender dónde concentrar la atención.' },
  { key: 'annual', number: '02', description: 'Tomá distancia. Mirá el año.', detail: 'Reuní los desvíos anuales, filtrá por mes o sector y consultá los resultados de calidad y logística.' },
  { key: 'customers', number: '03', description: 'Cada reclamo, en contexto.', detail: 'Cargá las no conformidades de clientes desde Excel y analizalas por mes, tipo de peligro, área y estado.' }
];
const controlViews = [
  { key: 'documents', number: 'A', description: 'Procedimientos, registros y archivos asociados. Una biblioteca organizada para consultar la documentación del SGC.' },
  { key: 'certifications', number: 'B', description: 'Vencimientos, responsables y alertas preventivas. La información necesaria para dar seguimiento a cada certificación.' },
  { key: 'users', number: 'C', description: 'Roles y estado de acceso del equipo. Cada persona accede a las herramientas habilitadas para su perfil.' }
];

function Screenshot({ screen, className = '', priority = false }) {
  return <img className={`sf-screen ${className}`} src={`/landing/${screen.file}.webp`} alt={screen.alt} width="1440" height="960" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" />;
}

function Brand() {
  return <a className="sf-brand" href="#top" aria-label="ServiFood Análisis — inicio"><img src={servifoodLogo} alt="ServiFood Catering" width="62" height="62" /><span>Análisis<span className="sf-brand-sub">SERVIFOOD · PLATAFORMA INTERNA</span></span></a>;
}

function SectionLabel({ number, children }) {
  return <div className="sf-section-label"><span>{number}</span><p>{children}</p></div>;
}

export default function PublicLanding({ onLogin, onRegister }) {
  const [analysisKey, setAnalysisKey] = useState('charts');
  const [controlKey, setControlKey] = useState('documents');
  const activeAnalysis = analysisViews.find((view) => view.key === analysisKey);

  const handleTabKey = (event, views, key, setKey, prefix) => {
    const index = views.findIndex((view) => view.key === key);
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % views.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + views.length) % views.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = views.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    setKey(views[next].key);
    document.getElementById(`${prefix}-${views[next].key}`)?.focus();
  };

  return (
    <div className="sf-landing" id="top">
      <a className="sf-skip" href="#contenido">Ir al contenido</a>
      <header className="sf-header sf-shell">
        <Brand />
        <nav aria-label="Navegación principal"><a href="#operacion">Operación</a><a href="#analisis">Análisis</a><a href="#control">Control documental</a></nav>
        <button className="sf-text-button sf-header-login" onClick={onLogin}>Ingresar <ArrowUpRight size={17} aria-hidden="true" /></button>
      </header>

      <main id="contenido" tabIndex={-1}>
        <section className="sf-hero sf-shell" aria-labelledby="hero-title">
          <div className="sf-hero-kicker"><span className="sf-eyebrow">SGC · CALIDAD · OPERACIÓN</span><span className="sf-edition">SERVIFOOD ANALYSIS / SISTEMA DE GESTIÓN</span></div>
          <h1 id="hero-title">La operación, clara.<br /><span>Las decisiones,</span> con respaldo.</h1>
          <div className="sf-hero-workspace">
            <div className="sf-hero-copy">
              <p>Detrás de cada servicio,<br /> hay información que importa.</p>
              <p className="sf-muted">De la primera planilla al seguimiento de calidad. Conectá análisis, documentación y equipo en un mismo espacio de trabajo.</p>
              <button className="sf-primary" onClick={onLogin}>Ingresar a la plataforma <ArrowUpRight size={20} aria-hidden="true" /></button>
              <span className="sf-access-note">Acceso según tu perfil de usuario.</span>
              <a className="sf-explore" href="#operacion"><ArrowDown size={15} aria-hidden="true" /> Conocé el recorrido</a>
            </div>
            <div className="sf-screen-composition">
              <figure className="sf-hero-main"><figcaption><span>01 / GESTIÓN INTERNA</span><span>VISTA DE LA APLICACIÓN</span></figcaption><Screenshot screen={screens.management} priority /></figure>
              <figure className="sf-hero-overlay"><figcaption><span>02 / GRÁFICOS</span><ArrowUpRight size={14} aria-hidden="true" /></figcaption><Screenshot screen={screens.charts} priority /></figure>
              <div className="sf-composition-note"><span className="sf-note-line" />Pantallas reales · datos de demostración</div>
            </div>
          </div>
        </section>

        <section className="sf-workflow sf-shell" id="operacion" aria-labelledby="workflow-title">
          <SectionLabel number="01">EL RECORRIDO OPERATIVO</SectionLabel>
          <div className="sf-workflow-heading"><h2 id="workflow-title">Una forma de trabajar.<br />De principio a fin.</h2><p>La información entra una vez.<br />El trabajo continúa en cada módulo.</p></div>
          <ol className="sf-flow">
            {[
              ['Cargar', 'Planillas y registros', 'Subí archivos Excel para iniciar el análisis.', '#analisis'],
              ['Analizar', 'Indicadores y desvíos', 'Encontrá patrones, compará períodos y revisá resultados.', '#analisis'],
              ['Documentar', 'Biblioteca SGC', 'Consultá procedimientos y sus archivos asociados.', '#control'],
              ['Gestionar', 'Equipo y seguimiento', 'Administrá accesos y seguí los vencimientos.', '#control']
            ].map(([title, label, description, href], index) => <li key={title}><a href={href}><span className="sf-flow-index">0{index + 1}<ArrowRight size={20} aria-hidden="true" /></span><h3>{title}</h3><span className="sf-flow-label">{label}</span><p>{description}</p></a></li>)}
          </ol>
        </section>

        <section className="sf-analysis" id="analisis" aria-labelledby="analysis-title">
          <div className="sf-shell">
            <SectionLabel number="02">LECTURA DE LA OPERACIÓN</SectionLabel>
            <div className="sf-analysis-heading"><h2 id="analysis-title">Menos datos sueltos.<br />Más perspectiva.</h2><p>El detalle de hoy y la evolución del año.<br />Explorá las herramientas con las que el equipo analiza la operación.</p></div>
            <div className="sf-analysis-tabs" role="tablist" aria-label="Módulos de análisis">
              {analysisViews.map((view) => <button key={view.key} id={`analysis-tab-${view.key}`} role="tab" aria-selected={analysisKey === view.key} aria-controls={`analysis-panel-${view.key}`} tabIndex={analysisKey === view.key ? 0 : -1} onClick={() => setAnalysisKey(view.key)} onKeyDown={(event) => handleTabKey(event, analysisViews, analysisKey, setAnalysisKey, 'analysis-tab')}><span>{view.number}</span>{screens[view.key].title}<ArrowUpRight size={17} aria-hidden="true" /></button>)}
            </div>
            {analysisViews.map((view) => <div key={view.key} id={`analysis-panel-${view.key}`} role="tabpanel" aria-labelledby={`analysis-tab-${view.key}`} hidden={analysisKey !== view.key} tabIndex={0}>
              {analysisKey === view.key && <figure className="sf-analysis-figure"><Screenshot screen={screens[view.key]} /><figcaption><span>SERVIFOOD ANALYSIS / {screens[view.key].title.toUpperCase()}</span><span>Interfaz real · datos de demostración</span></figcaption></figure>}
            </div>)}
            <div className="sf-analysis-caption"><h3>{activeAnalysis.description}</h3><p>{activeAnalysis.detail}</p></div>
          </div>
        </section>

        <section className="sf-control sf-shell" id="control" aria-labelledby="control-title">
          <SectionLabel number="03">DOCUMENTACIÓN Y RESPONSABILIDADES</SectionLabel>
          <h2 id="control-title">El respaldo de<br />cada <span>decisión.</span></h2>
          <div className="sf-control-layout">
            <div className="sf-control-index" role="tablist" aria-label="Módulos de gestión" aria-orientation="vertical">
              {controlViews.map((view) => <div className={`sf-control-item ${controlKey === view.key ? 'is-active' : ''}`} key={view.key}><button id={`control-tab-${view.key}`} role="tab" aria-selected={controlKey === view.key} aria-controls={`control-panel-${view.key}`} tabIndex={controlKey === view.key ? 0 : -1} onClick={() => setControlKey(view.key)} onKeyDown={(event) => handleTabKey(event, controlViews, controlKey, setControlKey, 'control-tab')}><span>{view.number}</span>{screens[view.key].title}{controlKey === view.key ? <Minus size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}</button>{controlKey === view.key && <p>{view.description}</p>}</div>)}
              <p className="sf-control-note">La herramienta adecuada.<br />Para la persona responsable.</p>
            </div>
            <div className="sf-control-view">
              {controlViews.map((view) => <div key={view.key} id={`control-panel-${view.key}`} role="tabpanel" aria-labelledby={`control-tab-${view.key}`} hidden={controlKey !== view.key} tabIndex={0}>{controlKey === view.key && <figure><Screenshot screen={screens[view.key]} /><figcaption><span>{screens[view.key].title}</span><span>Vista real · demostración</span></figcaption></figure>}</div>)}
            </div>
          </div>
        </section>

        <section className="sf-access sf-shell" aria-labelledby="access-title">
          <div><span className="sf-eyebrow">TU ESPACIO DE TRABAJO</span><h2 id="access-title">La próxima decisión<br />empieza acá.</h2></div>
          <div className="sf-access-actions"><button className="sf-primary" onClick={onLogin}>Ingresar a la plataforma <ArrowUpRight size={20} aria-hidden="true" /></button>{onRegister && <button className="sf-register" onClick={onRegister}>¿Todavía no tenés cuenta? <span>Solicitar registro <ArrowRight size={14} aria-hidden="true" /></span></button>}</div>
        </section>
      </main>
      <footer className="sf-footer sf-shell"><Brand /><span>© {new Date().getFullYear()} ServiFood Catering</span><a href="#top">Volver arriba <ArrowUpRight size={15} aria-hidden="true" /></a></footer>
    </div>
  );
}
