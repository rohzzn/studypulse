const env =
  (
    globalThis as {
      process?: {
        env?: Record<string, string | undefined>;
      };
    }
  ).process?.env ?? {};

const elevenLabsApiKey = env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
const elevenLabsModel = 'scribe_v1';
const elevenLabsEndpoint =
  'https://api.elevenlabs.io/v1/speech-to-text';

type TranscribeAudioInput = {
  fileName?: string;
  mimeType?: string;
  uri: string;
};

type ElevenLabsTranscriptResponse = {
  text?: string;
};

export const isElevenLabsConfigured = Boolean(
  elevenLabsApiKey
);

export async function transcribeAudioWithElevenLabs({
  fileName,
  mimeType,
  uri,
}: TranscribeAudioInput): Promise<string> {
  if (!elevenLabsApiKey) {
    throw new Error('ElevenLabs voice input is not configured.');
  }

  const fileDetails = resolveAudioFileDetails(
    uri,
    fileName,
    mimeType
  );
  const formData = new FormData();

  formData.append('model_id', elevenLabsModel);
  formData.append(
    'file',
    {
      uri,
      name: fileDetails.fileName,
      type: fileDetails.mimeType,
    } as unknown as Blob
  );

  const response = await fetch(elevenLabsEndpoint, {
    method: 'POST',
    headers: {
      'xi-api-key': elevenLabsApiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const details = await safeReadResponse(response);

    throw new Error(
      details ||
        `ElevenLabs request failed with ${response.status}.`
    );
  }

  const payload =
    (await response.json()) as ElevenLabsTranscriptResponse;
  const transcript = payload.text?.trim();

  if (!transcript) {
    throw new Error('No speech was detected in the recording.');
  }

  return transcript;
}

function resolveAudioFileDetails(
  uri: string,
  fileName?: string,
  mimeType?: string
) {
  if (fileName && mimeType) {
    return {
      fileName,
      mimeType,
    };
  }

  const normalizedUri =
    uri.toLowerCase().split('?')[0] ?? uri.toLowerCase();

  if (normalizedUri.endsWith('.webm')) {
    return {
      fileName: fileName ?? 'voice-query.webm',
      mimeType: mimeType ?? 'audio/webm',
    };
  }

  if (normalizedUri.endsWith('.3gp')) {
    return {
      fileName: fileName ?? 'voice-query.3gp',
      mimeType: mimeType ?? 'audio/3gpp',
    };
  }

  if (normalizedUri.endsWith('.wav')) {
    return {
      fileName: fileName ?? 'voice-query.wav',
      mimeType: mimeType ?? 'audio/wav',
    };
  }

  if (normalizedUri.endsWith('.aac')) {
    return {
      fileName: fileName ?? 'voice-query.aac',
      mimeType: mimeType ?? 'audio/aac',
    };
  }

  return {
    fileName: fileName ?? 'voice-query.m4a',
    mimeType: mimeType ?? 'audio/mp4',
  };
}

async function safeReadResponse(response: Response) {
  try {
    const payload = (await response.json()) as {
      detail?: { message?: string };
      error?: { message?: string } | string;
      message?: string;
    };

    if (typeof payload.message === 'string') {
      return payload.message;
    }

    if (typeof payload.error === 'string') {
      return payload.error;
    }

    if (
      payload.error &&
      typeof payload.error.message === 'string'
    ) {
      return payload.error.message;
    }

    if (
      payload.detail &&
      typeof payload.detail.message === 'string'
    ) {
      return payload.detail.message;
    }
  } catch {
    return null;
  }

  return null;
}
