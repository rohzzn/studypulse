export const colors = {
  accent: '#111111',
  background: '#F5F5F5',
  line: '#D9D9D9',
  muted: '#737373',
  primary: '#111111',
  secondaryText: '#5C5C5C',
  successText: '#111111',
  surface: '#FFFFFF',
  text: '#111111',
  warningText: '#111111',
} as const;

export const gradients = {
  action: ['#111111', '#111111'] as const,
  hero: ['#111111', '#111111', '#111111'] as const,
} as const;

export const radii = {
  md: 18,
  lg: 24,
  xl: 30,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 3,
  },
} as const;
