import { useMemo, useState } from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  FloatingTabs,
  InlineBanner,
} from './src/components/ui';
import { defaultCheckInDraft } from './src/data/mockData';
import { useTrialData } from './src/hooks/useTrialData';
import { CheckInScreen } from './src/screens/CheckInScreen';
import { OverviewScreen } from './src/screens/OverviewScreen';
import { SignalsScreen } from './src/screens/SignalsScreen';
import { VisitsScreen } from './src/screens/VisitsScreen';
import { colors } from './src/theme/tokens';
import type {
  DailyCheckInDraft,
  FeedbackTone,
  TabKey,
} from './src/types/trial';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [draft, setDraft] = useState<DailyCheckInDraft>(defaultCheckInDraft);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: FeedbackTone;
  } | null>(null);

  const {
    data,
    error,
    loading,
    refreshing,
    source,
    submitCheckIn,
    submitting,
    refresh,
  } = useTrialData();

  async function handleSubmitCheckIn() {
    const result = await submitCheckIn(draft);

    setFeedback({
      message: result.message,
      tone: result.ok ? 'success' : 'warning',
    });

    if (result.ok) {
      setDraft(defaultCheckInDraft);
      setActiveTab('signals');
    }
  }

  const screen = useMemo(() => {
    switch (activeTab) {
      case 'checkin':
        return (
          <CheckInScreen
            draft={draft}
            feedback={feedback}
            onSubmit={handleSubmitCheckIn}
            recentCheckIn={data?.recentCheckIn ?? null}
            setDraft={setDraft}
            source={source}
            submitting={submitting}
          />
        );
      case 'signals':
        return (
          <SignalsScreen
            data={data}
            error={error}
            loading={loading}
            refreshing={refreshing}
            source={source}
            onRefresh={refresh}
          />
        );
      case 'visits':
        return <VisitsScreen data={data} />;
      case 'overview':
      default:
        return (
          <OverviewScreen
            data={data}
            error={error}
            loading={loading}
            refreshing={refreshing}
            source={source}
            onRefresh={refresh}
          />
        );
    }
  }, [
    activeTab,
    data,
    draft,
    error,
    feedback,
    loading,
    refreshing,
    source,
    submitting,
  ]);

  return (
    <View style={styles.app}>
      <StatusBar
        backgroundColor={colors.background}
        barStyle="dark-content"
      />
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>StudyPulse</Text>
            <Text style={styles.brandCaption}>
              Clinical trial operations, tuned for a smoother participant day.
            </Text>
          </View>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>Medpace-ready</Text>
          </View>
        </View>

        {feedback ? (
          <InlineBanner
            message={feedback.message}
            tone={feedback.tone}
          />
        ) : null}

        <View style={styles.screen}>{screen}</View>
      </View>

      <FloatingTabs
        activeTab={activeTab}
        onChange={setActiveTab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.background,
  },
  orbOne: {
    position: 'absolute',
    top: -120,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#CDEDF0',
    opacity: 0.75,
  },
  orbTwo: {
    position: 'absolute',
    top: 180,
    left: -95,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#DDE8FF',
    opacity: 0.65,
  },
  content: {
    flex: 1,
    paddingTop:
      Platform.OS === 'android'
        ? (StatusBar.currentHeight ?? 0) + 16
        : 20,
    paddingHorizontal: 20,
    paddingBottom: 108,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 18,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.7,
  },
  brandCaption: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    maxWidth: 240,
  },
  brandBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
  },
  brandBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  screen: {
    flex: 1,
  },
});
