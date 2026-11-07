type ElevenLabsTranscript = {
  text?: string;
  language_code?: string;
  language_probability?: number;
};

export async function transcribeWithElevenLabs(file: File) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("transcription_not_configured");

  const body = new FormData();
  body.set("file", file, file.name || "meal-audio.webm");
  body.set("model_id", "scribe_v2");
  body.set("language_code", "por");
  body.set("tag_audio_events", "false");
  body.set("diarize", "false");

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body,
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) throw new Error(`transcription_provider_${response.status}`);
  const payload = (await response.json()) as ElevenLabsTranscript;
  if (!payload.text?.trim()) throw new Error("empty_transcript");

  return {
    text: payload.text.trim(),
    languageCode: payload.language_code ?? "por",
    languageProbability: payload.language_probability ?? null,
  };
}
