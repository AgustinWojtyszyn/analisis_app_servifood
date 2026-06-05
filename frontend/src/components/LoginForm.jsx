import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { resolveAuthRedirectUrl } from '../lib/authRedirect';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

function mapSupabaseUser(user) {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};

  return {
    id: user.id,
    email: user.email,
    name: metadata.name || metadata.full_name || user.email,
    role: appMetadata.role || 'user'
  };
}

function sanitizeAuthErrorMessage(err) {
  const message = (err?.message || '').toLowerCase();
  const status = err?.status;

  if (message.includes('user already registered') || message.includes('already been registered')) {
    return 'Este email ya está registrado. Iniciá sesión o reenviá el correo de confirmación.';
  }

  if (message.includes('invalid login credentials')) {
    return 'Credenciales inválidas. Verificá email y contraseña.';
  }

  if (message.includes('email not confirmed')) {
    return 'Tu email todavía no está confirmado. Revisá tu correo o reenviá la confirmación.';
  }

  if (message.includes('password should be at least') || message.includes('password is too weak')) {
    return 'La contraseña es muy corta. Usá al menos 6 caracteres.';
  }

  if (status === 400 && (message.includes('redirect') || message.includes('site url') || message.includes('not allowed'))) {
    return 'Error de configuración de redirección de email. Contactá a soporte.';
  }

  return err?.message || 'Error de autenticación. Intentá nuevamente.';
}

function DailyDateWidget() {
  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  }, []);

  return (
    <div className="mt-9 inline-flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-5 py-3 text-left text-slate-200 shadow-2xl shadow-black/20 backdrop-blur-md">
      <span className="grid h-10 w-10 place-items-center rounded-md bg-orange-500/90 text-white">
        <CalendarClock size={20} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span>
        <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Declaración diaria
        </span>
        <time className="block text-sm font-medium capitalize text-slate-100">
          {formattedDate}
        </time>
      </span>
    </div>
  );
}

function FieldIcon({ children }) {
  return (
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
      {children}
    </span>
  );
}

export default function LoginForm({ onLoginSuccess, initialMode = 'login', onSwitchMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);

  React.useEffect(() => {
    setIsRegister(initialMode === 'register');
  }, [initialMode]);

  const validateInputs = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Ingresá un email válido.');
      return false;
    }

    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return false;
    }

    if (isRegister && !name.trim()) {
      setError('Ingresá tu nombre.');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    const emailRedirectTo = resolveAuthRedirectUrl();
    console.info('[auth] register_attempt', { email: email.trim(), emailRedirectTo });

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
          full_name: name.trim()
        },
        emailRedirectTo
      }
    });

    if (signUpError) {
      console.warn('[auth] register_error', {
        message: signUpError.message,
        status: signUpError.status
      });
      throw signUpError;
    }

    if (!data?.session) {
      setInfoMessage('Cuenta creada. Revisá tu correo para confirmar la cuenta.');
      return;
    }

    onLoginSuccess(mapSupabaseUser(data.session.user));
  };

  const handleLogin = async () => {
    console.info('[auth] login_attempt', { email: email.trim() });

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (signInError) {
      console.warn('[auth] login_error', {
        message: signInError.message,
        status: signInError.status
      });
      throw signInError;
    }

    onLoginSuccess(mapSupabaseUser(data.user));
  };

  const handleResendConfirmation = async () => {
    setError('');
    setInfoMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Ingresá el email para reenviar la confirmación.');
      return;
    }

    try {
      setLoading(true);
      const emailRedirectTo = resolveAuthRedirectUrl();
      console.info('[auth] resend_confirmation_attempt', { email: trimmedEmail, emailRedirectTo });

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail,
        options: { emailRedirectTo }
      });

      if (resendError) {
        console.warn('[auth] resend_confirmation_error', {
          message: resendError.message,
          status: resendError.status
        });
        throw resendError;
      }

      setInfoMessage('Correo de confirmación reenviado. Revisá tu bandeja y spam.');
    } catch (err) {
      setError(sanitizeAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextIsRegister) => {
    if (onSwitchMode) {
      onSwitchMode(nextIsRegister ? 'register' : 'login');
    } else {
      setIsRegister(nextIsRegister);
    }
    setError('');
    setInfoMessage('');
    setShowResendConfirmation(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setInfoMessage('');
    setShowResendConfirmation(false);

    if (!validateInputs()) return;

    setLoading(true);

    try {
      if (isRegister) {
        await handleRegister();
        return;
      }

      await handleLogin();
    } catch (err) {
      const message = String(err?.message || '').toLowerCase();
      if (!isRegister && message.includes('email not confirmed')) {
        setShowResendConfirmation(true);
      }
      setError(sanitizeAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-6 py-10 sm:px-8 lg:min-h-screen">
          <div className="w-full max-w-md">
            <div className="mb-10">
              <img
                src={servifoodLogo}
                alt="Servi Food"
                className="mb-7 h-20 w-auto object-contain"
              />
              <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
                Portal de Calidad y Operaciones
              </h1>
              <p className="mt-5 text-base leading-7 text-slate-400">
                Acceso centralizado al sistema de auditoría, SGC y declaraciones diarias de salud.
              </p>
            </div>

            {(error || infoMessage) && (
              <div
                className={`mb-5 flex gap-3 rounded-lg border px-4 py-3 text-sm ${
                  error
                    ? 'border-red-400/20 bg-red-500/10 text-red-100'
                    : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                }`}
                role="alert"
              >
                {error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{error || infoMessage}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {isRegister && (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Nombre</span>
                  <span className="relative block">
                    <FieldIcon>
                      <User size={18} aria-hidden="true" />
                    </FieldIcon>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      required
                      autoComplete="name"
                      className="h-12 w-full rounded-lg border border-slate-800 bg-slate-900 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="Tu nombre"
                    />
                  </span>
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
                <span className="relative block">
                  <FieldIcon>
                    <Mail size={18} aria-hidden="true" />
                  </FieldIcon>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="email"
                    className="h-12 w-full rounded-lg border border-slate-800 bg-slate-900 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="nombre@servifood.com"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Contraseña</span>
                <span className="relative block">
                  <FieldIcon>
                    <Lock size={18} aria-hidden="true" />
                  </FieldIcon>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    className="h-12 w-full rounded-lg border border-slate-800 bg-slate-900 pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </span>
              </label>

              {!isRegister && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSwitchMode?.('forgotPassword')}
                    disabled={loading}
                    className="text-sm font-medium text-slate-500 transition hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-lg bg-orange-500 px-4 text-sm font-bold text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : (isRegister ? 'Crear Cuenta' : 'Iniciar Sesión')}
              </button>

              {!isRegister && showResendConfirmation && (
                <button
                  type="button"
                  className="w-full rounded-lg border border-slate-800 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleResendConfirmation}
                  disabled={loading}
                >
                  Reenviar correo de confirmación
                </button>
              )}
            </form>

            <div className="mt-6 space-y-3 text-center">
              <p className="text-sm text-slate-500">
                ¿Necesitás acceso? Contactá a un administrador.
              </p>
              <button
                type="button"
                onClick={() => switchMode(!isRegister)}
                disabled={loading}
                className="text-sm font-medium text-slate-400 transition hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRegister ? 'Ya tengo acceso' : 'Solicitar registro'}
              </button>
            </div>
          </div>
        </section>

        <section className="relative hidden min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 px-10 lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(249,115,22,0.18),transparent_30%),radial-gradient(circle_at_70%_80%,rgba(14,165,233,0.16),transparent_35%)]" />
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" />
          <div className="relative z-10 max-w-2xl text-center">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.28em] text-orange-300/90">
              Servi Food
            </p>
            <h2 className="text-5xl font-bold leading-tight text-white xl:text-6xl">
              Nuestro compromiso es la calidad
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Portal interno para la gestión de inocuidad, políticas operativas y salud del equipo.
            </p>
            <DailyDateWidget />
          </div>
        </section>
      </div>
    </main>
  );
}
