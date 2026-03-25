import * as Speech from "expo-speech";

// Language code mapping for TTS
const LANG_MAP: Record<string, string> = {
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  ja: "ja-JP",
  zh: "zh-CN",
  ko: "ko-KR",
  it: "it-IT",
  pt: "pt-BR",
  ru: "ru-RU",
  ar: "ar-SA",
  hi: "hi-IN",
  nl: "nl-NL",
  en: "en-US",
};

export async function speakWord(
  text: string,
  langCode: string = "en",
): Promise<void> {
  const language = LANG_MAP[langCode] ?? "en-US";

  // Stop any currently speaking
  await Speech.stop();

  Speech.speak(text, {
    language,
    pitch: 1.0,
    rate: 0.85, // Slightly slower for learning
  });
}

export async function stopSpeaking(): Promise<void> {
  await Speech.stop();
}

export function isSpeakingAsync(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}
