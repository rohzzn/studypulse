import { useState } from 'react';

import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import {
  isElevenLabsConfigured,
  transcribeAudioWithElevenLabs,
} from '../lib/elevenLabsSpeech';

type VoiceInputResult = {
  ok: boolean;
  transcript: string;
};

export function useElevenLabsVoiceInput() {
  const recorder = useAudioRecorder(
    RecordingPresets.LOW_QUALITY
  );
  const recorderState = useAudioRecorderState(recorder, 250);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startRecording() {
    setError(null);

    if (!isElevenLabsConfigured) {
      setError('Voice input is not configured yet.');
      return false;
    }

    try {
      const permission =
        await requestRecordingPermissionsAsync();

      if (!permission.granted) {
        setError(
          'Microphone permission is required to record voice input.'
        );
        return false;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();

      return true;
    } catch (nextError) {
      setError(resolveVoiceError(nextError));
      return false;
    }
  }

  async function stopRecording(): Promise<VoiceInputResult> {
    if (!recorderState.isRecording) {
      return {
        ok: false,
        transcript: '',
      };
    }

    setError(null);
    setBusy(true);

    try {
      await recorder.stop();

      const recordingUrl =
        recorder.getStatus().url ?? recorderState.url;

      if (!recordingUrl) {
        throw new Error(
          'StudyPulse could not access the recorded audio.'
        );
      }

      const transcript =
        await transcribeAudioWithElevenLabs({
          uri: recordingUrl,
        });

      return {
        ok: true,
        transcript,
      };
    } catch (nextError) {
      setError(resolveVoiceError(nextError));

      return {
        ok: false,
        transcript: '',
      };
    } finally {
      setBusy(false);

      try {
        await setAudioModeAsync({
          allowsRecording: false,
        });
      } catch {
        // Leave the existing audio mode alone if the reset fails.
      }
    }
  }

  return {
    busy,
    clearError: () => setError(null),
    error,
    isConfigured: isElevenLabsConfigured,
    isRecording: recorderState.isRecording,
    startRecording,
    statusText: recorderState.isRecording
      ? `Recording ${formatDuration(
          recorderState.durationMillis
        )}`
      : busy
        ? 'Transcribing...'
        : null,
    stopRecording,
  };
}

function formatDuration(durationMillis: number) {
  const totalSeconds = Math.max(
    0,
    Math.floor(durationMillis / 1000)
  );
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    seconds
  ).padStart(2, '0')}`;
}

function resolveVoiceError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Voice transcription failed. Please try again.';
}
