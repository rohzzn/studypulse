import { useEffect, useState } from 'react';

import {
  loadTrialData,
  submitDailyCheckIn,
} from '../lib/trialRepository';
import type {
  DailyCheckInDraft,
  DataSource,
  TrialData,
} from '../types/trial';

type SubmitResult = {
  message: string;
  ok: boolean;
};

export function useTrialData() {
  const [data, setData] = useState<TrialData | null>(null);
  const [source, setSource] = useState<DataSource>('demo');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function syncData(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await loadTrialData();
      setData(result.data);
      setSource(result.source);
      setError(result.error ?? null);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load trial data.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void syncData();
  }, []);

  async function refresh() {
    await syncData(true);
  }

  async function submitCheckIn(
    draft: DailyCheckInDraft
  ): Promise<SubmitResult> {
    setSubmitting(true);

    try {
      const result = await submitDailyCheckIn(draft, data ?? undefined);
      setData(result.data);
      setSource(result.source);
      setError(result.error ?? null);

      return {
        ok: true,
        message:
          result.source === 'supabase'
            ? 'Check-in saved to Supabase and reflected in the coordinator signal board.'
            : 'Check-in saved locally. Add Supabase keys to sync it live.',
      };
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to save the check-in right now.';

      setError(message);

      return {
        ok: false,
        message,
      };
    } finally {
      setSubmitting(false);
    }
  }

  return {
    data,
    error,
    loading,
    refreshing,
    refresh,
    source,
    submitCheckIn,
    submitting,
  };
}
