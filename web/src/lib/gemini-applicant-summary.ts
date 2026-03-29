import type {
  ApplicantSubmissionSummary,
  ApplicantSubmissionSummaryResponse,
  PatientApplication,
  StudyProgram,
} from './types';

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY as
  | string
  | undefined;
const geminiModel = 'gemini-2.5-flash-lite';

type SummarizeApplicantInput = {
  application: PatientApplication;
  study: StudyProgram | null;
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

export async function summarizeApplicantSubmissionWithGemini({
  application,
  study,
}: SummarizeApplicantInput): Promise<ApplicantSubmissionSummaryResponse> {
  if (!geminiApiKey) {
    return {
      source: 'local',
      summary: buildApplicantSubmissionSummaryLocal(
        application,
        study
      ),
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
                  text: buildApplicantSummaryPrompt(
                    application,
                    study
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
                summary: {
                  type: 'object',
                  properties: {
                    applicationId: { type: 'string' },
                    availabilitySummary: { type: 'string' },
                    clinicianSummary: { type: 'string' },
                    conditionSummary: { type: 'string' },
                    followUpSuggestion: { type: 'string' },
                    medicationSummary: { type: 'string' },
                    motivationSummary: { type: 'string' },
                  },
                  required: [
                    'applicationId',
                    'availabilitySummary',
                    'clinicianSummary',
                    'conditionSummary',
                    'followUpSuggestion',
                    'medicationSummary',
                    'motivationSummary',
                  ],
                },
              },
              required: ['summary'],
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
    const parsed = parseGeminiSummary(text, application.id);

    if (!parsed) {
      throw new Error(
        'Gemini returned no usable applicant submission summary.'
      );
    }

    return {
      source: 'gemini',
      summary: parsed,
    };
  } catch {
    return {
      source: 'local',
      summary: buildApplicantSubmissionSummaryLocal(
        application,
        study
      ),
    };
  }
}

export function buildApplicantSubmissionSummaryLocal(
  application: PatientApplication,
  study: StudyProgram | null
): ApplicantSubmissionSummary {
  return buildLocalSummary(application, study);
}

function buildApplicantSummaryPrompt(
  application: PatientApplication,
  study: StudyProgram | null
) {
  return [
    'You are helping a clinical trial coordinator review a patient application.',
    'Rewrite the patient-submitted answers into short, clear, clinician-friendly notes.',
    'Do not invent facts, diagnoses, medication names, dosages, or availability details that were not provided.',
    'This is operational pre-screening support only, not a medical determination.',
    'Be concise, specific, and neutral.',
    `Applicant name: ${application.fullName}`,
    `Applicant age: ${application.age}`,
    `Applicant location: ${application.city}, ${application.state}`,
    `Applicant condition: ${application.condition || 'Not provided'}`,
    `Current medications: ${application.currentMedications || 'Not provided'}`,
    `Availability: ${application.availability || 'Not provided'}`,
    `Motivation: ${application.motivation || 'Not provided'}`,
    `Target study title: ${study?.title ?? 'Unknown study'}`,
    `Study eligibility summary: ${study?.eligibilitySummary ?? 'Unknown'}`,
    `Study requirements: ${study?.requirements ?? 'Unknown'}`,
    `Study medications or exclusions: ${study?.medicationsExclusions ?? 'Unknown'}`,
    'Return a structured summary with a short follow-up suggestion if clarification would help the coordinator.',
  ].join('\n\n');
}

function parseGeminiSummary(
  text: string,
  applicationId: string
): ApplicantSubmissionSummary | null {
  try {
    const parsed = JSON.parse(text) as {
      summary?: unknown;
    };

    return sanitizeSummary(parsed.summary, applicationId);
  } catch {
    return null;
  }
}

function sanitizeSummary(
  item: unknown,
  applicationId: string
): ApplicantSubmissionSummary | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const next = item as Record<string, unknown>;
  const summaryApplicationId =
    typeof next.applicationId === 'string' &&
    next.applicationId.trim().length > 0
      ? next.applicationId.trim()
      : applicationId;

  if (summaryApplicationId !== applicationId) {
    return null;
  }

  return {
    applicationId,
    availabilitySummary: sanitizeSummaryField(
      next.availabilitySummary,
      'Availability needs coordinator review.'
    ),
    clinicianSummary: sanitizeSummaryField(
      next.clinicianSummary,
      'Review the submitted application details directly.'
    ),
    conditionSummary: sanitizeSummaryField(
      next.conditionSummary,
      'Condition details were not clearly provided.'
    ),
    followUpSuggestion: sanitizeSummaryField(
      next.followUpSuggestion,
      'Confirm any missing medication, availability, or symptom details before screening.'
    ),
    medicationSummary: sanitizeSummaryField(
      next.medicationSummary,
      'Medication details were not clearly provided.'
    ),
    motivationSummary: sanitizeSummaryField(
      next.motivationSummary,
      'Motivation was not clearly provided.'
    ),
  };
}

function sanitizeSummaryField(
  value: unknown,
  fallback: string
) {
  return typeof value === 'string' && value.trim().length > 0
    ? collapseWhitespace(value)
    : fallback;
}

function buildLocalSummary(
  application: PatientApplication,
  study: StudyProgram | null
): ApplicantSubmissionSummary {
  const condition = normalizePatientText(
    application.condition,
    'Condition not clearly provided.'
  );
  const medications = normalizePatientText(
    application.currentMedications,
    'Patient did not list current medications.'
  );
  const availability = normalizePatientText(
    application.availability,
    'Availability not provided.'
  );
  const motivation = normalizePatientText(
    application.motivation,
    'Motivation not provided.'
  );
  const followUpSuggestion = buildFollowUpSuggestion(
    application,
    study
  );

  return {
    applicationId: application.id,
    availabilitySummary: availability,
    clinicianSummary: [
      `${application.fullName} is a ${application.age}-year-old applicant from ${application.city}, ${application.state}.`,
      `They applied to ${study?.title ?? 'the selected study'} and reported ${lowercaseFirst(condition)}.`,
      `Medication summary: ${lowercaseFirst(medications)}`,
      `Availability summary: ${lowercaseFirst(availability)}`,
    ].join(' '),
    conditionSummary: condition,
    followUpSuggestion,
    medicationSummary: medications,
    motivationSummary: motivation,
  };
}

function buildFollowUpSuggestion(
  application: PatientApplication,
  study: StudyProgram | null
) {
  if (!application.currentMedications.trim()) {
    return 'Ask the patient to confirm current medications, dosage, and any recent changes.';
  }

  if (!application.availability.trim()) {
    return 'Ask the patient to share weekday and weekend availability for screening and follow-up visits.';
  }

  if (!application.motivation.trim()) {
    return 'Ask the patient why they want to participate and whether they understand the study time commitment.';
  }

  if (
    study?.locationType === 'in_person' &&
    !application.availability.toLowerCase().includes('in-person')
  ) {
    return 'Confirm that the patient can attend required in-person visits for this study.';
  }

  if (
    study?.medicationsExclusions.trim() &&
    application.currentMedications.trim()
  ) {
    return 'Review the patient medication list against the study exclusions and confirm anything that may need manual screening.';
  }

  return 'No major gaps stand out from the submitted answers, but confirm eligibility details during coordinator review.';
}

function normalizePatientText(
  value: string,
  fallback: string
) {
  const trimmed = collapseWhitespace(value);

  if (!trimmed) {
    return fallback;
  }

  return trimmed.endsWith('.')
    ? trimmed
    : `${trimmed}.`;
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function lowercaseFirst(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toLowerCase() + value.slice(1);
}
