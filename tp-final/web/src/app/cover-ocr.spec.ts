import { TestBed } from '@angular/core/testing';
import { CoverOcr, TESSERACT } from './cover-ocr';

/** Video con tamaño: jsdom no reproduce video, así que se fija a mano. */
function video(): HTMLVideoElement {
  const v = document.createElement('video');
  Object.defineProperty(v, 'videoWidth', { value: 640 });
  Object.defineProperty(v, 'videoHeight', { value: 480 });
  return v;
}

const worker = (text: string, confidence: number) => ({
  recognize: () =>
    Promise.resolve({
      data: { blocks: [{ paragraphs: [{ lines: [{ words: [{ text, confidence }] }] }] }] },
    }),
});

function setup(createWorker: (...args: any[]) => Promise<unknown>) {
  const spy = vi.fn(createWorker);
  TestBed.configureTestingModule({
    providers: [{ provide: TESSERACT, useValue: () => Promise.resolve({ createWorker: spy }) }],
  });
  return { ocr: TestBed.inject(CoverOcr), createWorker: spy };
}

describe('CoverOcr', () => {
  it('devuelve las palabras confiables del recorte', async () => {
    const { ocr } = setup(() => Promise.resolve(worker('Rayuela', 90)));
    expect(await ocr.read(video())).toBe('Rayuela');
  });

  it('reutiliza el worker entre lecturas', async () => {
    const { ocr, createWorker } = setup(() => Promise.resolve(worker('Rayuela', 90)));
    await ocr.read(video());
    await ocr.read(video());
    expect(createWorker).toHaveBeenCalledTimes(1);
  });

  it('si falla la carga del idioma, rechaza en lugar de colgarse y la próxima lectura reintenta', async () => {
    let attempt = 0;
    const { ocr, createWorker } = setup((_langs, _oem, options?: { errorHandler?: (e: unknown) => void }) => {
      attempt += 1;
      if (attempt === 1) {
        // Como tesseract.js 7: avisa solo por errorHandler (si no hay, el error queda sin capturar)
        // y la promesa de createWorker nunca se resuelve.
        setTimeout(() => options?.errorHandler?.('no se pudo bajar spa.traineddata'));
        return new Promise(() => {});
      }
      return Promise.resolve(worker('Rayuela', 90));
    });
    await expect(ocr.read(video())).rejects.toBeDefined();
    expect(await ocr.read(video())).toBe('Rayuela');
    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it('con el video sin tamaño todavía devuelve vacío sin crear el worker', async () => {
    const { ocr, createWorker } = setup(() => Promise.resolve(worker('Rayuela', 90)));
    expect(await ocr.read(document.createElement('video'))).toBe('');
    expect(createWorker).not.toHaveBeenCalled();
  });
});
