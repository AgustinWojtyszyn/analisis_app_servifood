import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { resolveAuthRedirectUrl } from '../lib/authRedirect';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

const inputClassName = 'w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors [&:-webkit-autofill]:bg-slate-900 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s] [&:-webkit-autofill]:shadow-[0_0_0px_1000px_#0f172a_inset] disabled:cursor-not-allowed disabled:opacity-60';

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

export default function LoginForm({ onLoginSuccess, initialMode = 'login', onSwitchMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [name, setName] = useState('');
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

    if (data?.user) {
      onLoginSuccess(mapSupabaseUser(data.user));
    }
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
    <main className="flex min-h-screen w-full bg-slate-950 text-slate-100">
      <section className="relative flex w-full flex-col items-center justify-center overflow-hidden p-8 lg:w-1/2">
        <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-orange-600/10 blur-[120px]" />

        <div className="relative z-10 w-full max-w-md">
          <img
            src={servifoodLogo}
            alt="Servi Food"
            className="mb-8 h-20 w-auto object-contain"
          />

          <h1 className="mb-2 text-4xl font-black leading-tight text-white">
            Portal de Calidad y Operaciones
          </h1>
          <p className="mb-8 text-slate-400">
            Acceso centralizado al ecosistema de auditoría y salud.
          </p>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-md sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">
                {isRegister ? 'Registrarse' : 'Iniciar Sesión'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {isRegister ? 'Creá tu acceso para operar dentro del portal.' : 'Ingresá con tus credenciales corporativas.'}
              </p>
            </div>

            {(error || infoMessage) && (
              <div
                className={`mb-5 flex gap-3 rounded-xl border px-4 py-3 text-sm ${
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

            <form onSubmit={handleSubmit}>
              {isRegister && (
                <div className="mb-4 flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-300">Nombre</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="name"
                    className={inputClassName}
                    placeholder="Tu nombre"
                  />
                </div>
              )}

              <div className="mb-4 flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="email"
                  className={inputClassName}
                  placeholder="tu@email.com"
                />
              </div>

              <div className="mb-4 flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-300">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  className={inputClassName}
                  placeholder="••••••••"
                />
              </div>

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
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3.5 font-bold text-white shadow-[0_4px_14px_0_rgba(249,115,22,0.39)] transition-all hover:-translate-y-0.5 hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : (isRegister ? 'Registrarse' : 'Iniciar Sesión')}
              </button>

              {!isRegister && showResendConfirmation && (
                <button
                  type="button"
                  className="mt-3 w-full rounded-xl border border-slate-800 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
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
                {isRegister ? '¿Ya tenés cuenta? Iniciá sesión' : '¿No tenés cuenta? Registrate aquí'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative hidden items-center justify-center bg-[url('https://images.unsplash.com/photo-1577906096429-f73c2c312435?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center p-12 lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]" />
        <div className="relative z-10 max-w-xl">
          <p className="mb-4 text-sm font-bold tracking-widest text-orange-500">
            SERVI FOOD CATERING
          </p>
          <h2 className="mb-6 text-5xl font-bold leading-tight text-white">
            Nuestro compromiso es la calidad
          </h2>
          <p className="text-lg leading-8 text-slate-300">
            Herramienta interna para la gestión integral de inocuidad, políticas operativas y salud del equipo.
          </p>
        </div>
      </section>
    </main>
  );
}
