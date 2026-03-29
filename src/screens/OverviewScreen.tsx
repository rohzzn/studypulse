import { LinearGradient } from 'expo-linear-gradient';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppCard,
  Badge,
  ProgressBar,
  SectionHeading,
} from '../components/ui';
import { gradients, colors, radii } from '../theme/tokens';
import type {
  DataSource,
  TrialData,
} from '../types/trial';

type OverviewScreenProps = {
  data: TrialData | null;
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  source: DataSource;
};

export function OverviewScreen({
  data,
  error,
  loading,
  onRefresh,
  refreshing,
  source,
}: OverviewScreenProps) {
  if (!data) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Loading trial dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <LinearGradient
        colors={gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTopRow}>
          <Badge
            label={
              source === 'supabase'
                ? 'Supabase live'
                : 'Demo mode'
            }
            tone={source === 'supabase' ? 'success' : 'warning'}
          />
          <Text style={styles.heroRefresh}>
            {refreshing ? 'Refreshing...' : 'Synced'}
          </Text>
        </View>
        <Text style={styles.heroEyebrow}>
          Participant overview
        </Text>
        <Text style={styles.heroTitle}>
          Keep the day simple, keep the study moving.
        </Text>
        <Text style={styles.heroBody}>
          {data.participant.firstName} is in{' '}
          {data.participant.studyName}. Next visit:{' '}
          {data.participant.nextVisitLabel}. Next dose:{' '}
          {data.participant.nextDoseLabel}.
        </Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>
              {data.trendSummary.adherencePercent}%
            </Text>
            <Text style={styles.heroStatLabel}>Adherence</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>
              {data.trendSummary.signalLabel}
            </Text>
            <Text style={styles.heroStatLabel}>Signal status</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>
              {data.trendSummary.responseTimeLabel}
            </Text>
            <Text style={styles.heroStatLabel}>Response</Text>
          </View>
        </View>
      </LinearGradient>

      {error ? (
        <AppCard style={styles.infoCard}>
          <Text style={styles.infoTitle}>Status note</Text>
          <Text style={styles.infoBody}>{error}</Text>
        </AppCard>
      ) : null}

      <SectionHeading
        eyebrow="Today"
        title="Operational snapshot"
        action={{
          label: loading ? 'Loading' : 'Refresh',
          onPress: onRefresh,
        }}
      />
      <View style={styles.metricGrid}>
        {data.metrics.map((metric) => (
          <View key={metric.id} style={styles.metricWrap}>
            <AppCard style={styles.metricCard}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricCaption}>
                {metric.caption}
              </Text>
            </AppCard>
          </View>
        ))}
      </View>

      <SectionHeading
        eyebrow="Sponsor fit"
        title="Why this helps Medpace"
      />
      <AppCard>
        <Text style={styles.infoBody}>{data.sponsorFit}</Text>
      </AppCard>

      <SectionHeading
        eyebrow="Participant flow"
        title="What happens next"
      />
      <AppCard style={styles.timelineCard}>
        <Text style={styles.focusText}>{data.todaysFocus}</Text>
        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              Check-in completion
            </Text>
            <Text style={styles.progressValue}>
              {data.trendSummary.checkInsCompleted}/
              {data.trendSummary.checkInsTarget}
            </Text>
          </View>
          <ProgressBar
            value={
              (data.trendSummary.checkInsCompleted /
                data.trendSummary.checkInsTarget) *
              100
            }
          />
        </View>
      </AppCard>

      <SectionHeading
        eyebrow="Tasks"
        title="Today\'s operational checklist"
      />
      <View style={styles.stack}>
        {data.tasks.map((task) => (
          <AppCard key={task.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Badge
                label={task.status}
                tone={
                  task.status === 'done'
                    ? 'success'
                    : task.status === 'attention'
                      ? 'warning'
                      : 'accent'
                }
              />
            </View>
            <Text style={styles.taskDetail}>{task.detail}</Text>
            <Text style={styles.taskDue}>{task.dueLabel}</Text>
          </AppCard>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
    gap: 18,
  },
  hero: {
    borderRadius: radii.xl,
    padding: 22,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroRefresh: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  heroBody: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    lineHeight: 20,
  },
  heroStatsRow: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
  },
  heroDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricWrap: {
    width: '48%',
  },
  metricCard: {
    padding: 16,
    minHeight: 118,
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
  },
  metricCaption: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: '#FFF7E8',
    borderColor: '#FFE1A8',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.warningText,
    marginBottom: 6,
  },
  infoBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  timelineCard: {
    gap: 18,
  },
  focusText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontWeight: '600',
  },
  progressBlock: {
    gap: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  stack: {
    gap: 12,
  },
  taskCard: {
    gap: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 21,
  },
  taskDetail: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.secondaryText,
  },
  taskDue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
});
