import { LinearGradient } from 'expo-linear-gradient';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppCard, Badge, ChoiceChip } from './ui';
import { colors, gradients, radii } from '../theme/tokens';

export { AppCard, Badge, ChoiceChip };

export function PrimaryButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={styles.buttonWrap}
    >
      <LinearGradient
        colors={
          disabled
            ? (['#BCC6D0', '#BCC6D0'] as const)
            : gradients.action
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.secondaryButton}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function PillButton({
  active = false,
  label,
  onPress,
}: {
  active?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pillButton,
        active && styles.pillButtonActive,
      ]}
    >
      <Text
        style={[
          styles.pillButtonText,
          active && styles.pillButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  autoCapitalize = 'sentences',
  editable = true,
  keyboardType,
  label,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  value,
}: {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'numeric'
    | 'phone-pad';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        editable={editable}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#8FA0B2"
        secureTextEntry={secureTextEntry}
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

export function MultiLineField({
  label,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        multiline
        placeholder={placeholder}
        placeholderTextColor="#8FA0B2"
        style={styles.multiLineInput}
        textAlignVertical="top"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  buttonWrap: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  primaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  pillButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F3F7FA',
    borderWidth: 1,
    borderColor: colors.line,
  },
  pillButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  pillButtonTextActive: {
    color: '#FFFFFF',
  },
  fieldWrap: {
    gap: 7,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.2,
  },
  fieldInput: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#F8FBFD',
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 14,
  },
  multiLineInput: {
    minHeight: 104,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#F8FBFD',
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
