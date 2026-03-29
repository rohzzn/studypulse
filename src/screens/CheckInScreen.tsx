import { KeyboardAvoidingView } from 'react-native';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  ActionButton,
  AppCard,
  Badge,
  ChoiceChip,
  SectionHeading,
} from '../components/ui';
import { colors } from '../theme/tokens';
import type {
  DailyCheckIn,
  DailyCheckInDraft,
  DataSource,
  FeedbackTone,
} from '../types/trial';

type CheckInScreenProps = {
  draft: DailyCheckInDraft;
  feedback: {
    message: string;
    tone: FeedbackTone;
  } | null;
  onSubmit: () => void;
  recentCheckIn: DailyCheckIn | null;
  setDraft: (nextDraft: DailyCheckInDraft) => void;
  source: DataSource;
  submitting: boolean;
};

const ENERGY_OPTIONS = ['Low', 'Steady', 'High'] as const;
const SYMPTOM_OPTIONS = [
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'headache', label: 'Headache' },
  { key: 'nausea', label: 'Nausea' },
  { key: 'dizziness', label: 'Dizziness' },
  { key: 'sleep', label: 'Sleep change' },
] as const;

export function CheckInScreen({
  draft,
  feedback,
  onSubmit,
  recentCheckIn,
  setDraft,
  source,
  submitting,
}: CheckInScreenProps) {
  const canSubmit =
    draft.medicationTaken !== null && draft.energyLevel !== null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <SectionHeading
          eyebrow="Daily capture"
          title="Participant check-in"
        />

        <AppCard style={styles.callout}>
          <View style={styles.calloutHeader}>
            <Text style={styles.calloutTitle}>
              Make the participant workflow feel easy
            </Text>
            <Badge
              label={
                source === 'supabase'
                  ? 'Live sync'
                  : 'Local demo'
              }
              tone={source === 'supabase' ? 'success' : 'warning'}
            />
          </View>
          <Text style={styles.calloutBody}>
            The goal is fast and low-friction reporting: one clear dose confirmation, quick symptom choices, and an easy support request path.
          </Text>
          {recentCheckIn ? (
            <Text style={styles.calloutMeta}>
              Last saved: {recentCheckIn.submittedAt}
            </Text>
          ) : null}
        </AppCard>

        {feedback ? (
          <AppCard
            style={[
              styles.feedbackCard,
              feedback.tone === 'success'
                ? styles.feedbackSuccess
                : styles.feedbackWarning,
            ]}
          >
            <Text style={styles.feedbackText}>
              {feedback.message}
            </Text>
          </AppCard>
        ) : null}

        <AppCard style={styles.formCard}>
          <Text style={styles.formLabel}>
            Did the participant take the planned dose?
          </Text>
          <View style={styles.rowWrap}>
            <ChoiceChip
              label="Yes, taken"
              onPress={() =>
                setDraft({
                  ...draft,
                  medicationTaken: true,
                })
              }
              selected={draft.medicationTaken === true}
            />
            <ChoiceChip
              label="Not yet"
              onPress={() =>
                setDraft({
                  ...draft,
                  medicationTaken: false,
                })
              }
              selected={draft.medicationTaken === false}
            />
          </View>
        </AppCard>

        <AppCard style={styles.formCard}>
          <Text style={styles.formLabel}>Energy level today</Text>
          <View style={styles.rowWrap}>
            {ENERGY_OPTIONS.map((energy) => (
              <ChoiceChip
                key={energy}
                label={energy}
                onPress={() =>
                  setDraft({
                    ...draft,
                    energyLevel: energy,
                  })
                }
                selected={draft.energyLevel === energy}
              />
            ))}
          </View>
        </AppCard>

        <AppCard style={styles.formCard}>
          <Text style={styles.formLabel}>
            Stress load from 1 to 5
          </Text>
          <Text style={styles.formHelper}>
            This can help coordinators catch participant strain before it turns into dropout risk.
          </Text>
          <View style={styles.rowWrap}>
            {[1, 2, 3, 4, 5].map((level) => (
              <ChoiceChip
                key={level}
                label={String(level)}
                onPress={() =>
                  setDraft({
                    ...draft,
                    stressLevel: level,
                  })
                }
                selected={draft.stressLevel === level}
              />
            ))}
          </View>
        </AppCard>

        <AppCard style={styles.formCard}>
          <Text style={styles.formLabel}>
            Which symptoms showed up today?
          </Text>
          <Text style={styles.formHelper}>
            Tap any that apply. No selection means no symptom change was noticed.
          </Text>
          <View style={styles.rowWrap}>
            {SYMPTOM_OPTIONS.map((symptom) => {
              const selected = draft.symptoms.includes(symptom.key);

              return (
                <ChoiceChip
                  key={symptom.key}
                  label={symptom.label}
                  onPress={() =>
                    setDraft({
                      ...draft,
                      symptoms: selected
                        ? draft.symptoms.filter(
                            (item) => item !== symptom.key
                          )
                        : [...draft.symptoms, symptom.key],
                    })
                  }
                  selected={selected}
                />
              );
            })}
          </View>
        </AppCard>

        <AppCard style={styles.formCard}>
          <Text style={styles.formLabel}>
            Free-text note for the site team
          </Text>
          <TextInput
            multiline
            placeholder="Anything worth reviewing before the next visit?"
            placeholderTextColor="#8E9AA6"
            style={styles.textArea}
            textAlignVertical="top"
            value={draft.note}
            onChangeText={(note) =>
              setDraft({
                ...draft,
                note,
              })
            }
          />
        </AppCard>

        <AppCard style={styles.formCard}>
          <Text style={styles.formLabel}>
            Does the participant want support today?
          </Text>
          <View style={styles.rowWrap}>
            <ChoiceChip
              label="No support needed"
              onPress={() =>
                setDraft({
                  ...draft,
                  supportRequested: false,
                })
              }
              selected={!draft.supportRequested}
            />
            <ChoiceChip
              label="Yes, please follow up"
              onPress={() =>
                setDraft({
                  ...draft,
                  supportRequested: true,
                })
              }
              selected={draft.supportRequested}
            />
          </View>
        </AppCard>

        <ActionButton
          disabled={!canSubmit || submitting}
          label={
            submitting
              ? 'Saving check-in...'
              : 'Save today\'s check-in'
          }
          onPress={onSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    gap: 14,
    paddingBottom: 42,
  },
  callout: {
    gap: 10,
    backgroundColor: '#F6FBFF',
  },
  calloutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  calloutTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 22,
  },
  calloutBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.secondaryText,
  },
  calloutMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  feedbackCard: {
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: '#EAF8F0',
    borderColor: '#B7E4C7',
  },
  feedbackWarning: {
    backgroundColor: '#FFF6E6',
    borderColor: '#FFD58A',
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: colors.text,
  },
  formCard: {
    gap: 12,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  formHelper: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondaryText,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  textArea: {
    minHeight: 116,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#F9FBFD',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
