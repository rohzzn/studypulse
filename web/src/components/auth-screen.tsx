import { useMemo, useState } from 'react';

import { Button, Card, Input, Pill } from './ui';
import type {
  AuthSignInInput,
  AuthSignUpInput,
  PortalRole,
} from '../lib/types';

type AuthScreenProps = {
  busy: boolean;
  configured: boolean;
  onSignIn: (input: AuthSignInInput) => Promise<void>;
  onSignUp: (input: AuthSignUpInput) => Promise<void>;
  onToggleTheme: () => void;
  themeLabel: string;
};

export function AuthScreen({
  busy,
  configured,
  onSignIn,
  onSignUp,
  onToggleTheme,
  themeLabel,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(
    'signin'
  );
  const [role, setRole] = useState<PortalRole>('patient');
  const [signInForm, setSignInForm] = useState<AuthSignInInput>({
    email: '',
    password: '',
  });
  const [signUpForm, setSignUpForm] = useState<AuthSignUpInput>({
    email: '',
    password: '',
    role: 'patient',
    fullName: '',
    phone: '',
    city: '',
    state: '',
    siteName: '',
    title: '',
  });

  const heroCopy = useMemo(() => {
    if (role === 'clinician') {
      return {
        eyebrow: 'Clinician Portal',
        title: 'Recruit, screen, and move patients forward.',
        body:
          'Create studies, review applicants, ask for follow-up details, and schedule screening calls in one shared system.',
      };
    }

    return {
      eyebrow: 'Patient Portal',
      title: 'Find a trial and stay in sync with the clinic.',
      body:
        'Browse open studies, apply in minutes, reply to clinician requests, and track your status from one account.',
    };
  }, [role]);

  return (
    <div className="auth-shell">
      <div className="hero-panel">
        <div className="hero-topline">
          <span className="hero-brand">StudyPulse</span>
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            type="button"
          >
            {themeLabel}
          </button>
        </div>

        <div className="hero-copy">
          <p className="eyebrow">{heroCopy.eyebrow}</p>
          <h1>{heroCopy.title}</h1>
          <p>{heroCopy.body}</p>
        </div>

        <div className="hero-grid">
          <Card>
            <p className="eyebrow">Patient flow</p>
            <h3>Find study</h3>
            <p>Apply, answer follow-ups, and track eligibility.</p>
          </Card>
          <Card>
            <p className="eyebrow">Clinician flow</p>
            <h3>Review applicants</h3>
            <p>Filter candidates, request info, and schedule calls.</p>
          </Card>
        </div>
      </div>

      <Card className="auth-card">
        {!configured ? (
          <>
            <p className="eyebrow">Configuration needed</p>
            <h2>Supabase keys are missing.</h2>
            <p>
              Add <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in{' '}
              <code>web/.env</code>.
            </p>
          </>
        ) : null}

        <div className="auth-tabs">
          <Pill
            active={mode === 'signin'}
            onClick={() => setMode('signin')}
          >
            Sign in
          </Pill>
          <Pill
            active={mode === 'signup'}
            onClick={() => setMode('signup')}
          >
            Create account
          </Pill>
        </div>

        {mode === 'signin' ? (
          <div className="stack">
            <h2>Welcome back</h2>
            <Input
              label="Email"
              placeholder="you@example.com"
              type="email"
              value={signInForm.email}
              onChange={(value) =>
                setSignInForm((current) => ({
                  ...current,
                  email: value,
                }))
              }
            />
            <Input
              label="Password"
              placeholder="Enter your password"
              type="password"
              value={signInForm.password}
              onChange={(value) =>
                setSignInForm((current) => ({
                  ...current,
                  password: value,
                }))
              }
            />
            <Button
              disabled={busy || !configured}
              onClick={() => void onSignIn(signInForm)}
            >
              {busy ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        ) : (
          <div className="stack">
            <div className="role-switch">
              <Pill
                active={role === 'patient'}
                onClick={() => {
                  setRole('patient');
                  setSignUpForm((current) => ({
                    ...current,
                    role: 'patient',
                  }));
                }}
              >
                Patient
              </Pill>
              <Pill
                active={role === 'clinician'}
                onClick={() => {
                  setRole('clinician');
                  setSignUpForm((current) => ({
                    ...current,
                    role: 'clinician',
                  }));
                }}
              >
                Clinician
              </Pill>
            </div>

            <h2>Create your account</h2>
            <Input
              label="Full name"
              placeholder="Jamie Brooks"
              value={signUpForm.fullName}
              onChange={(value) =>
                setSignUpForm((current) => ({
                  ...current,
                  fullName: value,
                }))
              }
            />
            <div className="two-col">
              <Input
                label="Email"
                placeholder="you@example.com"
                type="email"
                value={signUpForm.email}
                onChange={(value) =>
                  setSignUpForm((current) => ({
                    ...current,
                    email: value,
                  }))
                }
              />
              <Input
                label="Password"
                placeholder="Create a password"
                type="password"
                value={signUpForm.password}
                onChange={(value) =>
                  setSignUpForm((current) => ({
                    ...current,
                    password: value,
                  }))
                }
              />
            </div>
            <div className="two-col">
              <Input
                label="Phone"
                placeholder="(555) 555-5555"
                value={signUpForm.phone}
                onChange={(value) =>
                  setSignUpForm((current) => ({
                    ...current,
                    phone: value,
                  }))
                }
              />
              <Input
                label="City"
                placeholder="Cincinnati"
                value={signUpForm.city}
                onChange={(value) =>
                  setSignUpForm((current) => ({
                    ...current,
                    city: value,
                  }))
                }
              />
            </div>
            <Input
              label="State"
              placeholder="OH"
              value={signUpForm.state}
              onChange={(value) =>
                setSignUpForm((current) => ({
                  ...current,
                  state: value,
                }))
              }
            />
            {role === 'clinician' ? (
              <div className="two-col">
                <Input
                  label="Title"
                  placeholder="Clinical Research Coordinator"
                  value={signUpForm.title}
                  onChange={(value) =>
                    setSignUpForm((current) => ({
                      ...current,
                      title: value,
                    }))
                  }
                />
                <Input
                  label="Site name"
                  placeholder="StudyPulse Research Network"
                  value={signUpForm.siteName}
                  onChange={(value) =>
                    setSignUpForm((current) => ({
                      ...current,
                      siteName: value,
                    }))
                  }
                />
              </div>
            ) : null}

            <Button
              disabled={busy || !configured}
              onClick={() => void onSignUp(signUpForm)}
            >
              {busy ? 'Creating...' : 'Create account'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
