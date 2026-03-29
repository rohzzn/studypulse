import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppCard,
  Badge,
  MetricTile,
  SectionHeading,
} from '../components/ui';
import { colors } from '../theme/tokens';
import type {
  DataSource,
  TrialData,
} from '../types/trial';

type SignalsScreenProps = {
  data: TrialData | null;
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  source: DataSource;
};

export function SignalsScreen({
  data,
  error,
  loading,
  onRefresh,
  refreshing,
  source,
}: SignalsScreenProps) {
  if (!data) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Loading signals...</Text>
      </View>
    );
  }

  const highCount = data.alerts.filter(
    (alert) => alert.severity === 'high'
  ).length;
  const mediumCount = data.alerts.filter(
    (alert) => alert.severity === 'medium'
  ).length;
  const lowCount = data.alerts.filter(
    (alert) => alert.severity === 'low'
  ).length;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <SectionHeading
        eyebrow="Coordinator lens"
        title="Signal board"
        action={{
          label:
            loading || refreshing ? 'Updating' : 'Refresh',
          onPress: onRefresh,
        }}
      />

      <AppCard style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>
            Surface risks early, without adding participant burden
          </Text>
          <Badge
            label={
              source === 'supabase'
                ? 'Live study feed'
                : 'Demo fallback'
            }
            tone={source === 'supabase' ? 'success' : 'warning'}
          />
        </View>
        <Text style={styles.summaryBody}>
          The coordinator view distills missed check-ins, symptom clusters, and visit readiness into a few clear actions the site team can take quickly.
        </Text>
      </AppCard>

      {error ? (
        <AppCard style={styles.warningCard}>
          <Text style={styles.warningText}>{error}</Text>
        </AppCard>
      ) : null}

      <View style={styles.metricGrid}>
        <MetricTile
          label="High priority"
          value={String(highCount)}
          caption="Immediate outreach recommended"
          tone="rose"
        />
        <MetricTile
          label="Watch list"
          value={String(mediumCount)}
          caption="Review before next contact"
          tone="amber"
        />
        <MetricTile
          label="Stable items"
          value={String(lowCount)}
          caption="Trend looks manageable"
          tone="mint"
        />
      </View>

      <SectionHeading
        eyebrow="Active alerts"
        title="Latest participant signals"
      />
      <View style={styles.stack}>
        {data.alerts.map((alert) => (
          <AppCard key={alert.id} style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Badge
                label={alert.severity}
                tone={
                  alert.severity === 'high'
                    ? 'warning'
                    : alert.severity === 'medium'
                      ? 'accent'
                      : 'success'
                }
              />
            </View>
            <Text style={styles.alertDescription}>
              {alert.description}
            </Text>
            <View style={styles.alertFooter}>
              <Text style={styles.alertMeta}>
                {alert.patientLabel}
              </Text>
              <Text style={styles.alertMeta}>
                {alert.windowLabel}
              </Text>
            </View>
          </AppCard>
        ))}
      </View>

      <SectionHeading
        eyebrow="Coordinator note"
        title="Suggested follow-up"
      />
      <AppCard>
        <Text style={styles.noteBody}>
          {data.participant.coordinatorName}: {data.participant.coordinatorNote}
        </Text>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 40,
  },
  summaryCard: {
    gap: 10,
    backgroundColor: '#F7FBFE',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  summaryTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
    color: colors.text,
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.secondaryText,
  },
  warningCard: {
    backgroundColor: '#FFF6E6',
    borderColor: '#FFD58A',
  },
  warningText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.warningText,
    fontWeight: '700',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stack: {
    gap: 12,
  },
  alertCard: {
    gap: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  alertTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 21,
  },
  alertDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.secondaryText,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  alertMeta: {
    flex: 1,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  noteBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
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
