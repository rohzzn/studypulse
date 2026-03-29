import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

const env =
  (
    globalThis as {
      process?: {
        env?: Record<string, string | undefined>;
      };
    }
  ).process?.env ?? {};

const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey
);

export const supabase: SupabaseClient | null =
  isSupabaseConfigured
    ? createClient(
        supabaseUrl as string,
        supabasePublishableKey as string,
        {
          auth: {
            storage: localStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
          },
        }
      )
    : null;
