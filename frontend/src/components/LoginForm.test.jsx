import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resend: vi.fn()
    }
  }
}));

const { supabase } = await import('../lib/supabaseClient');
const { default: LoginForm } = await import('./LoginForm.jsx');

function fillLoginForm() {
  fireEvent.change(screen.getByPlaceholderText('usuario@servifood.com'), {
    target: { value: 'usuario@servifood.com' }
  });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), {
    target: { value: 'secret123' }
  });
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra error user-friendly para credenciales inválidas', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid login credentials' }
    });

    render(<LoginForm onLoginSuccess={vi.fn()} />);
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas. Verificá email y contraseña.');
  });

  it('llama onLoginSuccess cuando el login es exitoso', async () => {
    const onLoginSuccess = vi.fn();
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: {
          id: 'u1',
          email: 'usuario@servifood.com',
          user_metadata: { name: 'Usuario' },
          app_metadata: { role: 'admin' }
        }
      },
      error: null
    });

    render(<LoginForm onLoginSuccess={onLoginSuccess} />);
    fillLoginForm();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledWith({
        id: 'u1',
        email: 'usuario@servifood.com',
        name: 'Usuario',
        role: 'admin'
      });
    });
  });

  it('bloquea doble submit mientras está cargando', async () => {
    let resolveLogin;
    supabase.auth.signInWithPassword.mockReturnValueOnce(new Promise((resolve) => {
      resolveLogin = resolve;
    }));

    render(<LoginForm onLoginSuccess={vi.fn()} />);
    fillLoginForm();
    const submit = screen.getByRole('button', { name: 'Iniciar Sesión' });

    fireEvent.click(submit);
    fireEvent.submit(submit.closest('form'));

    await waitFor(() => {
      expect(submit).toBeDisabled();
    });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLogin({
        data: {
          user: {
            id: 'u1',
            email: 'usuario@servifood.com',
            user_metadata: {},
            app_metadata: {}
          }
        },
        error: null
      });
    });
  });

  it('valida campos requeridos antes de llamar a Supabase', async () => {
    render(<LoginForm onLoginSuccess={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('usuario@servifood.com'), {
      target: { value: 'usuario@servifood.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: '123' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña debe tener al menos 6 caracteres.');
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });
});
