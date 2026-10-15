import { wordsToText } from './ocr-text';

const w = (text: string, confidence: number) => ({ text, confidence });

describe('wordsToText', () => {
  it('une las palabras con confianza suficiente', () => {
    expect(wordsToText([w('La', 91), w('invención', 88), w('del', 90)])).toBe('La invención del');
  });

  it('descarta las palabras con confianza menor a 60', () => {
    expect(wordsToText([w('E', 31), w('ES', 45), w('Shlomo', 89), w('rr', 59), w('Sand', 60)])).toBe(
      'Shlomo Sand',
    );
  });

  it('descarta las palabras sin letras ni números aunque tengan confianza alta', () => {
    expect(wordsToText([w('==', 95), w('judío', 87), w('—', 90), w('1984', 92)])).toBe('judío 1984');
  });

  it('devuelve vacío si no queda ninguna palabra', () => {
    expect(wordsToText([w('==', 20)])).toBe('');
    expect(wordsToText([])).toBe('');
  });
});
