import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppCard,
  Field,
  PillButton,
  PrimaryButton,
  SecondaryButton,
} from '../components/studyPulseUi';
import { colors } from '../theme/tokens';
import type {
  AccountRole,
  AuthSignInDraft,
  AuthSignUpDraft,
} from '../types/studypulse';

type AuthScreenProps = {
  authConfigured: boolean;
  busy: boolean;
  onOpenDemo: () => void;
  onSignIn: (draft: AuthSignInDraft) => Promise<unknown>;
  onSignUp: (draft: AuthSignUpDraft) => Promise<unknown>;
};

export function AuthScreen({
  authConfigured,
  busy,
  onOpenDemo,
  onSignIn,
  onSignUp,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(
    'signin'
  );
  const [role, setRole] = useState<AccountRole>('patient');
  const [signInDraft, setSignInDraft] =
    useState<AuthSignInDraft>({
      email: '',
      password: '',
    });
  const [signUpDraft, setSignUpDraft] =
    useState<AuthSignUpDraft>({
      city: '',
      email: '',
      fullName: '',
      password: '',
      phone: '',
      role: 'patient',
      siteName: '',
      state: '',
      title: '',
    });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={12}
      style={styles.keyboardShell}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppCard style={styles.formCard}>
          {!authConfigured ? (
            <>
              <Text style={styles.sectionTitle}>
                Supabase Auth is not configured
              </Text>
              <Text style={styles.bodyText}>
                Use demo mode for now, or add the Supabase keys
                first.
              </Text>
              <PrimaryButton
                label="Open demo mode"
                onPress={onOpenDemo}
              />
            </>
          ) : null}

          {authConfigured ? (
            <>
              <View style={styles.modeRow}>
                <PillButton
                  active={mode === 'signin'}
                  label="Sign in"
                  onPress={() => setMode('signin')}
                />
                <PillButton
                  active={mode === 'signup'}
                  label="Create account"
                  onPress={() => setMode('signup')}
                />
              </View>

              {mode === 'signin' ? (
                <View style={styles.formStack}>
                  <Text style={styles.sectionTitle}>
                    Welcome back
                  </Text>
                  <Field
                    autoCapitalize="none"
                    keyboardType="email-address"
                    label="Email"
                    placeholder="you@example.com"
                    value={signInDraft.email}
                    onChangeText={(value) =>
                      setSignInDraft((current) => ({
                        ...current,
                        email: value,
                      }))
                    }
                  />
                  <Field
                    autoCapitalize="none"
                    label="Password"
                    placeholder="Enter your password"
                    secureTextEntry
                    value={signInDraft.password}
                    onChangeText={(value) =>
                      setSignInDraft((current) => ({
                        ...current,
                        password: value,
                      }))
                    }
                  />
                  <PrimaryButton
                    disabled={busy}
                    label={busy ? 'Signing in...' : 'Sign in'}
                    onPress={() => {
                      void onSignIn(signInDraft);
                    }}
                  />
                </View>
              ) : (
                <View style={styles.formStack}>
                  <View style={styles.modeRow}>
                    <PillButton
                      active={role === 'patient'}
                      label="Patient"
                      onPress={() => {
                        setRole('patient');
                        setSignUpDraft((current) => ({
                          ...current,
                          role: 'patient',
                        }));
                      }}
                    />
                    <PillButton
                      active={role === 'clinician'}
                      label="Clinician"
                      onPress={() => {
                        setRole('clinician');
                        setSignUpDraft((current) => ({
                          ...current,
                          role: 'clinician',
                        }));
                      }}
                    />
                  </View>

                  <Text style={styles.sectionTitle}>
                    Create your account
                  </Text>
                  <Field
                    label="Full name"
                    placeholder="Jamie Brooks"
                    value={signUpDraft.fullName}
                    onChangeText={(value) =>
                      setSignUpDraft((current) => ({
                        ...current,
                        fullName: value,
                      }))
                    }
                  />
                  <Field
                    autoCapitalize="none"
                    keyboardType="email-address"
                    label="Email"
                    placeholder="you@example.com"
                    value={signUpDraft.email}
                    onChangeText={(value) =>
                      setSignUpDraft((current) => ({
                        ...current,
                        email: value,
                      }))
                    }
                  />
                  <Field
                    autoCapitalize="none"
                    label="Password"
                    placeholder="Create a password"
                    secureTextEntry
                    value={signUpDraft.password}
                    onChangeText={(value) =>
                      setSignUpDraft((current) => ({
                        ...current,
                        password: value,
                      }))
                    }
                  />
                  <Field
                    keyboardType="phone-pad"
                    label="Phone"
                    placeholder="(555) 555-5555"
                    value={signUpDraft.phone}
                    onChangeText={(value) =>
                      setSignUpDraft((current) => ({
                        ...current,
                        phone: value,
                      }))
                    }
                  />
                  <Field
                    label="City"
                    placeholder="Cincinnati"
                    value={signUpDraft.city}
                    onChangeText={(value) =>
                      setSignUpDraft((current) => ({
                        ...current,
                        city: value,
                      }))
                    }
                  />
                  <Field
                    autoCapitalize="characters"
                    label="State"
                    placeholder="OH"
                    value={signUpDraft.state}
                    onChangeText={(value) =>
                      setSignUpDraft((current) => ({
                        ...current,
                        state: value,
                      }))
                    }
                  />
                  {role === 'clinician' ? (
                    <>
                      <Field
                        label="Title"
                        placeholder="Clinical Research Coordinator"
                        value={signUpDraft.title}
                        onChangeText={(value) =>
                          setSignUpDraft((current) => ({
                            ...current,
                            title: value,
                          }))
                        }
                      />
                      <Field
                        label="Site name"
                        placeholder="StudyPulse Research Network"
                        value={signUpDraft.siteName}
                        onChangeText={(value) =>
                          setSignUpDraft((current) => ({
                            ...current,
                            siteName: value,
                          }))
                        }
                      />
                    </>
                  ) : null}
                  <PrimaryButton
                    disabled={busy}
                    label={busy ? 'Creating...' : 'Create account'}
                    onPress={() => {
                      void onSignUp(signUpDraft);
                    }}
                  />
                </View>
              )}

              <SecondaryButton
                label="Open demo mode"
                onPress={onOpenDemo}
              />
            </>
          ) : null}
        </AppCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardShell: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 36,
  },
  formCard: {
    gap: 14,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formStack: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.secondaryText,
  },
});
