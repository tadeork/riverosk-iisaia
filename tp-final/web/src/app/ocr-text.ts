/** Debajo de esta confianza (0–100), Tesseract suele estar leyendo bordes o texturas, no letras. */
const MIN_CONFIDENCE = 60;
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** Arma el texto con las palabras confiables: deja afuera el ruido del fondo dentro del recuadro. */
export function wordsToText(words: readonly { text: string; confidence: number }[]): string {
  return words
    .filter((w) => w.confidence >= MIN_CONFIDENCE && HAS_LETTER_OR_DIGIT.test(w.text))
    .map((w) => w.text)
    .join(' ');
}
