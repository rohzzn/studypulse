import type {
  ApplicantMatchResponse,
  ApplicantMatchResult,
  ApplicantMatchStatus,
  PatientApplication,
  StudyProgram,
} from './types';

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY as
  | string
  | undefined;
const geminiModel = 'gemini-2.5-flash-lite';

type MatchApplicantsInput = {
  applications: PatientApplication[];
  clinicianQuery: string;
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

export async function matchApplicantsWithGemini({
  applications,
  clinicianQuery,
  studies,
}: MatchApplicantsInput): Promise<ApplicantMatchResponse> {
  const trimmedQuery = clinicianQuery.trim();

  if (!trimmedQuery) {
    return {
      matches: [],
      source: 'local',
    };
  }

  if (!geminiApiKey) {
    return {
      matches: buildLocalApplicantMatches(
        trimmedQuery,
        applications,
        studies
      ),
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
                  text: buildApplicantMatchingPrompt(
                    trimmedQuery,
                    applications,
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
                      applicationId: { type: 'string' },
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
                      'applicationId',
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

    const parsed = parseGeminiMatches(text, applications);

    if (parsed.length === 0) {
      throw new Error(
        'Gemini returned no usable applicant matches.'
      );
    }

    return {
      matches: parsed,
      source: 'gemini',
    };
  } catch {
    return {
      matches: buildLocalApplicantMatches(
        trimmedQuery,
        applications,
        studies
      ),
      source: 'local',
    };
  }
}

function buildApplicantMatchingPrompt(
  clinicianQuery: string,
  applications: PatientApplication[],
  studies: StudyProgram[]
) {
  const studyMap = new Map(
    studies.map((study) => [study.id, study] as const)
  );

  const applicationText = applications
    .map((application) => {
      const study = studyMap.get(application.studyId);

      return [
        `Application ID: ${application.id}`,
        `Applicant name: ${application.fullName}`,
        `Age: ${application.age}`,
        `Location: ${application.city}, ${application.state}`,
        `Email: ${application.email}`,
        `Condition: ${application.condition}`,
        `Current medications: ${application.currentMedications || 'None listed'}`,
        `Availability: ${application.availability || 'Not provided'}`,
        `Motivation: ${application.motivation || 'Not provided'}`,
        `Current status: ${application.status}`,
        `Clinician notes: ${application.clinicianNotes || 'None yet'}`,
        `Study title: ${study?.title ?? 'Unknown study'}`,
        `Study condition: ${study?.condition ?? 'Unknown'}`,
        `Study eligibility summary: ${study?.eligibilitySummary ?? 'Unknown'}`,
        `Study requirements: ${study?.requirements ?? 'Unknown'}`,
        `Study age range: ${study ? `${study.ageMin}-${study.ageMax}` : 'Unknown'}`,
        `Study location: ${study?.locationLabel ?? 'Unknown'}`,
        `Study location type: ${study?.locationType ?? 'unknown'}`,
      ].join('\n');
    })
    .join('\n\n');

  return [
    'You are helping a clinical research coordinator filter applicants.',
    'Rank each applicant against the clinician query.',
    'Consider condition, age, location, medications, availability, current status, and the linked study requirements.',
    'Do not make a medical decision. This is operational pre-screening support only.',
    'Use these statuses only: likely_fit, possible_fit, review_needed, not_a_fit.',
    'Return every applicant once.',
    `Clinician request:\n${clinicianQuery}`,
    `Applicants:\n${applicationText}`,
  ].join('\n\n');
}

function parseGeminiMatches(
  text: string,
  applications: PatientApplication[]
): ApplicantMatchResult[] {
  try {
    const parsed = JSON.parse(text) as {
      matches?: unknown[];
    };
    const validApplicationIds = new Set(
      applications.map((application) => application.id)
    );

    return (parsed.matches ?? [])
      .map((item) => sanitizeMatch(item))
      .filter(
        (item): item is ApplicantMatchResult =>
          item !== null &&
          validApplicationIds.has(item.applicationId)
      )
      .sort((left, right) => right.score - left.score);
  } catch {
    return [];
  }
}

function sanitizeMatch(
  item: unknown
): ApplicantMatchResult | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const next = item as Record<string, unknown>;
  const applicationId =
    typeof next.applicationId === 'string'
      ? next.applicationId
      : null;
  const status = sanitizeStatus(next.status);
  const reason =
    typeof next.reason === 'string'
      ? next.reason.trim()
      : 'Potential match based on the request.';
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

  if (!applicationId || !status) {
    return null;
  }

  return {
    applicationId,
    status,
    score: Math.max(0, Math.min(100, Math.round(rawScore))),
    reason,
    caution,
  };
}

function sanitizeStatus(
  value: unknown
): ApplicantMatchStatus | null {
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

function buildLocalApplicantMatches(
  clinicianQuery: string,
  applications: PatientApplication[],
  studies: StudyProgram[]
) {
  return applications
    .map((application) =>
      scoreApplicantLocally(
        clinicianQuery,
        application,
        studies.find((study) => study.id === application.studyId) ?? null
      )
    )
    .sort((left, right) => right.score - left.score);
}

function scoreApplicantLocally(
  clinicianQuery: string,
  application: PatientApplication,
  study: StudyProgram | null
): ApplicantMatchResult {
  const query = clinicianQuery.toLowerCase();
  const haystack = [
    application.fullName,
    application.email,
    application.city,
    application.state,
    application.condition,
    application.currentMedications,
    application.availability,
    application.motivation,
    application.status,
    application.clinicianNotes,
    study?.title ?? '',
    study?.condition ?? '',
    study?.eligibilitySummary ?? '',
    study?.requirements ?? '',
    study?.locationLabel ?? '',
    study?.locationType ?? '',
  ]
    .join(' ')
    .toLowerCase();

  const tokens = query
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

  let score = 22;
  const reasons: string[] = [];
  const cautions: string[] = [];
  const age = extractAge(query);
  const fitsStudyAge =
    study !== null &&
    application.age >= study.ageMin &&
    application.age <= study.ageMax;
  const missingInfo =
    !application.currentMedications.trim() ||
    !application.availability.trim() ||
    !application.motivation.trim();

  if (age !== null) {
    if (application.age === age) {
      score += 14;
      reasons.push('Age exactly matches the requested age.');
    } else if (Math.abs(application.age - age) <= 4) {
      score += 8;
      reasons.push('Age is close to the requested range.');
    } else {
      score -= 6;
      cautions.push('Age may not be the closest fit for this request.');
    }
  }

  if (
    query.includes(application.city.toLowerCase()) ||
    query.includes(application.state.toLowerCase())
  ) {
    score += 10;
    reasons.push('Location matches the request.');
  }

  const matchedTokens = tokens.filter((token) =>
    haystack.includes(token)
  );

  if (matchedTokens.length > 0) {
    score += Math.min(30, matchedTokens.length * 5);
    reasons.push('Condition or applicant details overlap with the request.');
  }

  if (
    query.includes('eligible') ||
    query.includes('best fit') ||
    query.includes('strong fit')
  ) {
    if (application.status === 'not_eligible') {
      return {
        applicationId: application.id,
        status: 'not_a_fit',
        score: 4,
        reason: 'Applicant is already marked not eligible.',
        caution: 'This record is not currently a fit for an eligible-only request.',
      };
    }

    if (fitsStudyAge) {
      score += 15;
      reasons.push('Applicant fits the linked study age range.');
    } else {
      score -= 10;
      cautions.push('Study age fit may need coordinator review.');
    }
  }

  if (
    query.includes('missing info') ||
    query.includes('needs info') ||
    query.includes('follow up')
  ) {
    if (application.status === 'info_requested' || missingInfo) {
      score += 16;
      reasons.push('Applicant already needs follow-up or has missing details.');
    } else {
      score -= 8;
    }
  }

  if (query.includes('call') && application.status === 'scheduled_call') {
    score += 16;
    reasons.push('Applicant already has a scheduled call.');
  }

  if (query.includes('remote')) {
    if (
      application.availability.toLowerCase().includes('remote') ||
      study?.locationType === 'remote'
    ) {
      score += 10;
      reasons.push('Remote participation looks feasible.');
    } else if (study?.locationType === 'hybrid') {
      score += 4;
      cautions.push('Hybrid participation may still require a visit.');
    } else {
      score -= 8;
      cautions.push('This study appears to require in-person participation.');
    }
  }

  const status: ApplicantMatchStatus =
    score >= 72
      ? 'likely_fit'
      : score >= 52
        ? 'possible_fit'
        : score >= 30
          ? 'review_needed'
          : 'not_a_fit';

  return {
    applicationId: application.id,
    status,
    score: Math.max(0, Math.min(100, score)),
    reason:
      reasons[0] ??
      'Some applicant details overlap with the requested criteria.',
    caution:
      cautions[0] ??
      (status === 'likely_fit'
        ? 'No major issues flagged from the available data.'
        : 'Review the application details before deciding.'),
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
