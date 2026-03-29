import type {
  Profile,
  StudyMatchResponse,
  StudyMatchResult,
  StudyMatchStatus,
  StudyProgram,
} from './types';

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY as
  | string
  | undefined;
const geminiModel = 'gemini-2.5-flash-lite';

export const isGeminiMatcherConfigured = Boolean(geminiApiKey);

type MatchStudiesInput = {
  patientQuery: string;
  profile?: Profile | null;
  studies: StudyProgram[];
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export async function matchStudiesWithGemini({
  patientQuery,
  profile,
  studies,
}: MatchStudiesInput): Promise<StudyMatchResponse> {
  const trimmedQuery = patientQuery.trim();

  if (!trimmedQuery) {
    return {
      matches: [],
      source: 'local',
    };
  }

  if (!geminiApiKey) {
    return {
      matches: buildLocalStudyMatches(trimmedQuery, studies),
      source: 'local',
    };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildStudyMatchingPrompt(
                    trimmedQuery,
                    profile,
                    studies
                  ),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseJsonSchema: {
              type: 'object',
              properties: {
                matches: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      studyId: { type: 'string' },
                      status: {
                        type: 'string',
                        enum: [
                          'likely_fit',
                          'possible_fit',
                          'review_needed',
                          'not_a_fit',
                        ],
                      },
                      score: { type: 'integer' },
                      reason: { type: 'string' },
                      caution: { type: 'string' },
                    },
                    required: [
                      'studyId',
                      'status',
                      'score',
                      'reason',
                      'caution',
                    ],
                  },
                },
              },
              required: ['matches'],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed with ${response.status}.`);
    }

    const payload = (await response.json()) as GeminiResponse;
    const text =
      payload.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    const parsed = parseGeminiMatches(text, studies);

    if (parsed.length === 0) {
      throw new Error('Gemini returned no usable study matches.');
    }

    return {
      matches: parsed,
      source: 'gemini',
    };
  } catch {
    return {
      matches: buildLocalStudyMatches(trimmedQuery, studies),
      source: 'local',
    };
  }
}

function buildStudyMatchingPrompt(
  patientQuery: string,
  profile: Profile | null | undefined,
  studies: StudyProgram[]
) {
  const patientContext = [
    profile?.city ? `City: ${profile.city}` : null,
    profile?.state ? `State: ${profile.state}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const studyText = studies
    .map((study) =>
      [
        `Study ID: ${study.id}`,
        `Title: ${study.title}`,
        `Condition: ${study.condition}`,
        `Eligibility summary: ${study.eligibilitySummary}`,
        `Requirements: ${study.requirements}`,
        `Medication exclusions: ${study.medicationsExclusions || 'None listed'}`,
        `Availability requirements: ${study.availabilityRequirements || 'None listed'}`,
        `Location: ${study.locationLabel}`,
        `Location type: ${study.locationType}`,
        `Age range: ${study.ageMin}-${study.ageMax}`,
        `Time commitment: ${study.timeCommitment}`,
      ].join('\n')
    )
    .join('\n\n');

  return [
    'You are matching a patient to clinical trials.',
    'Rank each study by likely fit based on age, condition, location, medications, exclusions, and visit requirements.',
    'Do not make a medical decision. This is a trial pre-screening recommendation only.',
    'Use these statuses only: likely_fit, possible_fit, review_needed, not_a_fit.',
    'Use higher scores for stronger fits and lower scores for poor fits.',
    'Return every study once.',
    patientContext ? `Patient profile:\n${patientContext}` : null,
    `Patient request:\n${patientQuery}`,
    `Studies:\n${studyText}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function parseGeminiMatches(
  text: string,
  studies: StudyProgram[]
): StudyMatchResult[] {
  try {
    const parsed = JSON.parse(text) as {
      matches?: unknown[];
    };
    const validStudyIds = new Set(studies.map((study) => study.id));

    return (parsed.matches ?? [])
      .map((item) => sanitizeMatch(item))
      .filter(
        (item): item is StudyMatchResult =>
          item !== null && validStudyIds.has(item.studyId)
      )
      .sort((left, right) => right.score - left.score);
  } catch {
    return [];
  }
}

function sanitizeMatch(item: unknown): StudyMatchResult | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const next = item as Record<string, unknown>;
  const studyId =
    typeof next.studyId === 'string' ? next.studyId : null;
  const status = sanitizeStatus(next.status);
  const reason =
    typeof next.reason === 'string'
      ? next.reason.trim()
      : 'Potential fit based on the supplied details.';
  const caution =
    typeof next.caution === 'string'
      ? next.caution.trim()
      : '';
  const rawScore =
    typeof next.score === 'number'
      ? next.score
      : typeof next.score === 'string'
        ? Number(next.score)
        : 0;

  if (!studyId || !status) {
    return null;
  }

  return {
    studyId,
    status,
    score: Math.max(0, Math.min(100, Math.round(rawScore))),
    reason,
    caution,
  };
}

function sanitizeStatus(
  value: unknown
): StudyMatchStatus | null {
  switch (value) {
    case 'likely_fit':
    case 'possible_fit':
    case 'review_needed':
    case 'not_a_fit':
      return value;
    default:
      return null;
  }
}

function buildLocalStudyMatches(
  patientQuery: string,
  studies: StudyProgram[]
) {
  return studies
    .map((study) => scoreStudyLocally(patientQuery, study))
    .sort((left, right) => right.score - left.score);
}

function scoreStudyLocally(
  patientQuery: string,
  study: StudyProgram
): StudyMatchResult {
  const query = patientQuery.toLowerCase();
  const haystack = [
    study.title,
    study.condition,
    study.shortDescription,
    study.description,
    study.eligibilitySummary,
    study.requirements,
    study.medicationsExclusions,
    study.availabilityRequirements,
    study.locationLabel,
    study.locationType,
    study.timeCommitment,
  ]
    .join(' ')
    .toLowerCase();

  const tokens = query
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

  let score = 25;
  const reasons: string[] = [];
  const cautions: string[] = [];

  const age = extractAge(query);

  if (age !== null) {
    if (age < study.ageMin || age > study.ageMax) {
      return {
        studyId: study.id,
        status: 'not_a_fit',
        score: 4,
        reason: 'Age does not match the stated study range.',
        caution: `Outside the study age range of ${study.ageMin}-${study.ageMax}.`,
      };
    }

    score += 18;
    reasons.push('Age fits the study range.');
  }

  if (query.includes('remote')) {
    if (study.locationType === 'remote') {
      score += 16;
      reasons.push('Supports remote participation.');
    } else if (study.locationType === 'hybrid') {
      score += 8;
      cautions.push('Includes some in-person requirements.');
    } else {
      return {
        studyId: study.id,
        status: 'not_a_fit',
        score: 6,
        reason: 'Requested remote participation only.',
        caution: 'This study requires in-person participation.',
      };
    }
  }

  const matchedTokens = tokens.filter((token) =>
    haystack.includes(token)
  );

  if (matchedTokens.length > 0) {
    score += Math.min(32, matchedTokens.length * 6);
    reasons.push('Condition or preference details overlap with the study.');
  }

  if (
    query.includes('weekend') &&
    study.availabilityRequirements.toLowerCase().includes('weekday')
  ) {
    cautions.push('Availability requirements may need coordinator review.');
    score -= 8;
  }

  if (
    query.includes('beta blocker') &&
    study.medicationsExclusions.toLowerCase().includes('beta blocker')
  ) {
    cautions.push('Medication history may need manual review.');
    score -= 10;
  }

  const status: StudyMatchStatus =
    score >= 72
      ? 'likely_fit'
      : score >= 52
        ? 'possible_fit'
        : score >= 30
          ? 'review_needed'
          : 'not_a_fit';

  return {
    studyId: study.id,
    status,
    score: Math.max(0, Math.min(100, score)),
    reason:
      reasons[0] ?? 'Basic details overlap with this study.',
    caution:
      cautions[0] ??
      (status === 'likely_fit'
        ? 'No major issues flagged.'
        : 'Review details with the clinic.'),
  };
}

function extractAge(value: string) {
  const match = value.match(/\b(\d{2,3})\b/);

  if (!match) {
    return null;
  }

  const age = Number(match[1]);
  return Number.isFinite(age) ? age : null;
}
