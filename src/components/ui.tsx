import type { PropsWithChildren } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadow } from '../theme/tokens';
import type {
  FeedbackTone,
  MetricTone,
  TabKey,
} from '../types/trial';

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

type BadgeProps = {
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
};

type MetricTileProps = {
  caption: string;
  label: string;
  tone: MetricTone;
  value: string;
};

type ChoiceChipProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
};

type SectionHeadingProps = {
  action?: {
    label: string;
    onPress: () => void;
  };
  eyebrow?: string;
  title: string;
};

type ActionButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

type InlineBannerProps = {
  message: string;
  tone: FeedbackTone;
};

type FloatingTabsProps = {
  activeTab: TabKey;
  onChange: (nextTab: TabKey) => void;
};

const TAB_ITEMS: Array<{
  key: TabKey;
  label: string;
  marker: string;
}> = [
  { key: 'overview', label: 'Today', marker: 'TD' },
  { key: 'checkin', label: 'Check-in', marker: 'CI' },
  { key: 'signals', label: 'Signals', marker: 'SG' },
  { key: 'visits', label: 'Visits', marker: 'VS' },
];

export function AppCard({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({
  label,
  tone = 'neutral',
}: BadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'accent' && styles.badgeAccent,
        tone === 'success' && styles.badgeSuccess,
        tone === 'warning' && styles.badgeWarning,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          tone === 'accent' && styles.badgeAccentText,
          tone === 'success' && styles.badgeSuccessText,
          tone === 'warning' && styles.badgeWarningText,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function MetricTile({
  caption,
  label,
  tone,
  value,
}: MetricTileProps) {
  return (
    <View
      style={[
        styles.metricTile,
        tone === 'blue' && styles.metricTileBlue,
        tone === 'mint' && styles.metricTileMint,
        tone === 'amber' && styles.metricTileAmber,
        tone === 'rose' && styles.metricTileRose,
      ]}
    >
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricCaption}>{caption}</Text>
    </View>
  );
}

export function ChoiceChip({
  label,
  onPress,
  selected,
}: ChoiceChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.choiceChip,
        selected && styles.choiceChipSelected,
      ]}
    >
      <Text
        style={[
          styles.choiceChipText,
          selected && styles.choiceChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SectionHeading({
  action,
  eyebrow,
  title,
}: SectionHeadingProps) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingCopy}>
        {eyebrow ? (
          <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        ) : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action ? (
        <Pressable
          onPress={action.onPress}
          style={styles.sectionAction}
        >
          <Text style={styles.sectionActionText}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ProgressBar({
  value,
}: {
  value: number;
}) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.max(4, Math.min(value, 100))}%` },
        ]}
      />
    </View>
  );
}

export function ActionButton({
  disabled = false,
  label,
  onPress,
}: ActionButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        disabled && styles.actionButtonDisabled,
      ]}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

export function InlineBanner({
  message,
  tone,
}: InlineBannerProps) {
  return (
    <View
      style={[
        styles.banner,
        tone === 'success'
          ? styles.bannerSuccess
          : styles.bannerWarning,
      ]}
    >
      <Text
        style={[
          styles.bannerText,
          tone === 'success'
            ? styles.bannerSuccessText
            : styles.bannerWarningText,
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

export function FloatingTabs({
  activeTab,
  onChange,
}: FloatingTabsProps) {
  return (
    <View style={styles.tabsShell}>
      {TAB_ITEMS.map((tab) => {
        const isActive = tab.key === activeTab;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[
              styles.tabButton,
              isActive && styles.tabButtonActive,
            ]}
          >
            <View
              style={[
                styles.tabMarker,
                isActive && styles.tabMarkerActive,
              ]}
            >
              <Text
                style={[
                  styles.tabMarkerText,
                  isActive && styles.tabMarkerTextActive,
                ]}
              >
                {tab.marker}
              </Text>
            </View>
            <Text
              style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F2F2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeAccent: {
    backgroundColor: '#EBEBEB',
  },
  badgeSuccess: {
    backgroundColor: '#EBEBEB',
  },
  badgeWarning: {
    backgroundColor: '#EBEBEB',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.2,
  },
  badgeAccentText: {
    color: colors.text,
  },
  badgeSuccessText: {
    color: colors.text,
  },
  badgeWarningText: {
    color: colors.text,
  },
  metricTile: {
    flexBasis: '48%',
    minWidth: 150,
    borderRadius: radii.md,
    padding: 16,
    gap: 8,
  },
  metricTileBlue: {
    backgroundColor: '#F3F3F3',
  },
  metricTileMint: {
    backgroundColor: '#F3F3F3',
  },
  metricTileAmber: {
    backgroundColor: '#F3F3F3',
  },
  metricTileRose: {
    backgroundColor: '#F3F3F3',
  },
  metricLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  metricCaption: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 18,
  },
  choiceChip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
  },
  choiceChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  choiceChipTextSelected: {
    color: '#FFFFFF',
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 12,
  },
  sectionHeadingCopy: {
    flexShrink: 1,
    gap: 4,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
  },
  sectionAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F2F2F2',
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E5E5E5',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  actionButtonDisabled: {
    backgroundColor: '#8C8C8C',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  banner: {
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  bannerSuccess: {
    backgroundColor: '#F3F3F3',
    borderColor: colors.line,
  },
  bannerWarning: {
    backgroundColor: '#F3F3F3',
    borderColor: colors.line,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  bannerSuccessText: {
    color: colors.text,
  },
  bannerWarningText: {
    color: colors.text,
  },
  tabsShell: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    padding: 10,
    ...shadow.card,
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#F2F2F2',
  },
  tabMarker: {
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
  },
  tabMarkerActive: {
    backgroundColor: colors.primary,
  },
  tabMarkerText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.5,
  },
  tabMarkerTextActive: {
    color: '#FFFFFF',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },
  tabLabelActive: {
    color: colors.text,
  },
});
