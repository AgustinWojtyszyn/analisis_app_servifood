import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { resolveAuthRedirectUrl } from '../lib/authRedirect';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

const inputClassName = 'w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 [&:-webkit-autofill]:bg-slate-900 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:shadow-[0_0_0px_1000px_#0f172a_inset]';

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
    <div className="min-h-screen flex w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative z-10">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-600/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-md w-full relative z-20">
          <div className="text-center mb-10">
            <img src={servifoodLogo} alt="Servi Food" className="h-16 w-auto mb-6 mx-auto lg:mx-0" />
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
              Portal de Calidad
            </h1>
            <p className="text-slate-400">
              Acceso centralizado al ecosistema de auditoría, SGC y salud operativa.
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

          <form className="space-y-5" onSubmit={handleSubmit}>
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className={inputClassName}
                  placeholder="Tu nombre"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className={inputClassName}
                placeholder="usuario@servifood.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={inputClassName}
                placeholder="••••••••"
                required
              />
            </div>

            {!isRegister && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => onSwitchMode?.('forgotPassword')}
                  disabled={loading}
                  className="text-sm text-slate-400 hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg px-4 py-3.5 mt-2 shadow-[0_4px_14px_0_rgba(249,115,22,0.39)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden="true" /> : (isRegister ? 'Registrarse' : 'Iniciar Sesión')}
            </button>

            {!isRegister && showResendConfirmation && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={loading}
                className="w-full rounded-lg border border-slate-800 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reenviar correo de confirmación
              </button>
            )}
          </form>

          <div className="mt-8 text-center text-sm text-slate-500">
            ¿Necesitás acceso?
            <button
              type="button"
              onClick={() => switchMode(!isRegister)}
              disabled={loading}
              className="text-orange-400 hover:text-orange-300 font-medium ml-1 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRegister ? 'Iniciá sesión' : 'Solicitar registro'}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 bg-slate-900 border-l border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30"></div>

        <div className="relative z-10 max-w-lg text-center">
          <div className="text-orange-500 tracking-[0.2em] text-sm font-bold mb-6 uppercase">Servi Food Catering</div>
          <h2 className="text-5xl font-black text-white mb-6 leading-tight">
            Nuestro compromiso es la calidad
          </h2>
          <p className="text-xl text-slate-300 leading-relaxed">
            Plataforma interna corporativa para la gestión integral de inocuidad, seguimiento de políticas operativas y salud del equipo.
          </p>
        </div>
      </div>
    </div>
  );
}
