import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppCard,
  Badge,
  SectionHeading,
} from '../components/ui';
import { colors } from '../theme/tokens';
import type { TrialData } from '../types/trial';

type VisitsScreenProps = {
  data: TrialData | null;
};

export function VisitsScreen({
  data,
}: VisitsScreenProps) {
  if (!data) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Loading visit plan...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <SectionHeading
        eyebrow="Visit flow"
        title="Upcoming study touchpoints"
      />

      <AppCard style={styles.leadCard}>
        <Text style={styles.leadTitle}>
          Next confirmed milestone
        </Text>
        <Text style={styles.leadBody}>
          {data.participant.nextVisitLabel} at the site. The experience stays calmer when the participant sees one checklist, one location, and one clear prep summary.
        </Text>
      </AppCard>

      <View style={styles.stack}>
        {data.visits.map((visit) => (
          <AppCard key={visit.id} style={styles.visitCard}>
            <View style={styles.visitHeader}>
              <View style={styles.visitCopy}>
                <Text style={styles.visitTitle}>{visit.title}</Text>
                <Text style={styles.visitMeta}>
                  {visit.dateLabel} at {visit.timeLabel}
                </Text>
                <Text style={styles.visitMeta}>
                  {visit.location}
                </Text>
              </View>
              <Badge
                label={visit.status}
                tone={
                  visit.status === 'confirmed'
                    ? 'success'
                    : visit.status === 'completed'
                      ? 'accent'
                      : 'warning'
                }
              />
            </View>

            <Text style={styles.visitSummary}>
              {visit.prepSummary}
            </Text>

            <View style={styles.checklist}>
              {visit.checklist.map((item) => (
                <View key={item} style={styles.checklistRow}>
                  <View style={styles.checklistDot} />
                  <Text style={styles.checklistText}>{item}</Text>
                </View>
              ))}
            </View>
          </AppCard>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 40,
  },
  leadCard: {
    backgroundColor: '#F3FAF9',
    gap: 10,
  },
  leadTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  leadBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.secondaryText,
  },
  stack: {
    gap: 12,
  },
  visitCard: {
    gap: 14,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  visitCopy: {
    flex: 1,
    gap: 4,
  },
  visitTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.text,
  },
  visitMeta: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.primary,
    fontWeight: '700',
  },
  visitSummary: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.secondaryText,
  },
  checklist: {
    gap: 10,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checklistDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
  checklistText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
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
