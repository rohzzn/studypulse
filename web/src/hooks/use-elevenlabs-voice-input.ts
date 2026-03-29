import { useEffect, useRef, useState } from 'react';

import {
  isElevenLabsConfigured,
  transcribeAudioBlobWithElevenLabs,
} from '../lib/elevenlabs-speech';

type VoiceInputResult = {
  ok: boolean;
  transcript: string;
};

export function useElevenLabsVoiceInput() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    return () => {
      cleanupStream(streamRef.current);
    };
  }, []);

  async function startRecording() {
    setError(null);

    if (!isElevenLabsConfigured) {
      setError('Voice input is not configured yet.');
      return false;
    }

    if (
      typeof window === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setError(
        'Voice input is not supported in this browser.'
      );
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mimeType = resolveRecordingMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start();
      setIsRecording(true);

      return true;
    } catch (nextError) {
      cleanupStream(streamRef.current);
      streamRef.current = null;
      mediaRecorderRef.current = null;
      setError(resolveVoiceError(nextError));
      return false;
    }
  }

  async function stopRecording(): Promise<VoiceInputResult> {
    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      return {
        ok: false,
        transcript: '',
      };
    }

    setError(null);
    setBusy(true);

    try {
      const audioBlob = await new Promise<Blob>(
        (resolve, reject) => {
          recorder.onerror = () => {
            reject(
              new Error(
                'StudyPulse could not finish the recording.'
              )
            );
          };

          recorder.onstop = () => {
            const mimeType =
              recorder.mimeType ||
              chunksRef.current[0]?.type ||
              'audio/webm';
            const nextBlob = new Blob(chunksRef.current, {
              type: mimeType,
            });

            cleanupStream(streamRef.current);
            streamRef.current = null;
            mediaRecorderRef.current = null;
            chunksRef.current = [];
            setIsRecording(false);
            resolve(nextBlob);
          };

          recorder.stop();
        }
      );

      const transcript =
        await transcribeAudioBlobWithElevenLabs(audioBlob);

      return {
        ok: true,
        transcript,
      };
    } catch (nextError) {
      cleanupStream(streamRef.current);
      streamRef.current = null;
      mediaRecorderRef.current = null;
      chunksRef.current = [];
      setIsRecording(false);
      setError(resolveVoiceError(nextError));

      return {
        ok: false,
        transcript: '',
      };
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    clearError: () => setError(null),
    error,
    isConfigured: isElevenLabsConfigured,
    isRecording,
    startRecording,
    statusText: isRecording
      ? 'Recording...'
      : busy
        ? 'Transcribing...'
        : null,
    stopRecording,
  };
}

function cleanupStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function resolveRecordingMimeType() {
  const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
  ];

  return mimeTypes.find((nextType) =>
    MediaRecorder.isTypeSupported(nextType)
  );
}

function resolveVoiceError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Voice transcription failed. Please try again.';
}
