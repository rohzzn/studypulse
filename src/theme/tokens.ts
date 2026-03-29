export const colors = {
  accent: '#1A9D8F',
  background: '#F3F7FB',
  line: '#D9E3EB',
  muted: '#6F8092',
  primary: '#174A71',
  secondaryText: '#5D6E7E',
  successText: '#156B4A',
  surface: '#FFFFFF',
  text: '#0E2030',
  warningText: '#8A5A00',
} as const;

export const gradients = {
  action: ['#186B8B', '#169C90'] as const,
  hero: ['#102338', '#184B71', '#1B8A88'] as const,
} as const;

export const radii = {
  md: 18,
  lg: 24,
  xl: 30,
} as const;

export const shadow = {
  card: {
    shadowColor: '#0B1C2A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 4,
  },
} as const;
