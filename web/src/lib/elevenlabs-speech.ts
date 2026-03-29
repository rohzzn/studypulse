const elevenLabsApiKey = import.meta.env
  .VITE_ELEVENLABS_API_KEY as string | undefined;
const elevenLabsModel = 'scribe_v1';
const elevenLabsEndpoint =
  'https://api.elevenlabs.io/v1/speech-to-text';

type ElevenLabsTranscriptResponse = {
  text?: string;
};

export const isElevenLabsConfigured = Boolean(
  elevenLabsApiKey
);

export async function transcribeAudioBlobWithElevenLabs(
  audioBlob: Blob
): Promise<string> {
  if (!elevenLabsApiKey) {
    throw new Error('ElevenLabs voice input is not configured.');
  }

  const fileExtension = resolveAudioExtension(audioBlob.type);
  const formData = new FormData();

  formData.append('model_id', elevenLabsModel);
  formData.append(
    'file',
    new File([audioBlob], `voice-query.${fileExtension}`, {
      type: audioBlob.type || 'audio/webm',
    })
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

function resolveAudioExtension(mimeType: string) {
  if (mimeType.includes('wav')) {
    return 'wav';
  }

  if (mimeType.includes('mp4')) {
    return 'm4a';
  }

  if (mimeType.includes('ogg')) {
    return 'ogg';
  }

  return 'webm';
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
