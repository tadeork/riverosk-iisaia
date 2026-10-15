import { Injectable } from '@angular/core';
import type { Worker } from 'tesseract.js';
import { wordsToText } from './ocr-text';

/** Zona del recuadro guía, en proporción del cuadro de video. */
const GUIDE_WIDTH = 0.8;
const GUIDE_HEIGHT = 0.4;

/** Única pieza que conoce Tesseract y el canvas: en los tests se reemplaza por un falso. */
@Injectable({ providedIn: 'root' })
export class CoverOcr {
  // Se crea en la primera lectura y se reutiliza: reabrir la cámara no recarga el modelo.
  private worker?: Promise<Worker>;

  async read(video: HTMLVideoElement): Promise<string> {
    const { videoWidth, videoHeight } = video;
    if (videoWidth === 0 || videoHeight === 0) return '';

    const width = Math.round(videoWidth * GUIDE_WIDTH);
    const height = Math.round(videoHeight * GUIDE_HEIGHT);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas
      .getContext('2d')
      ?.drawImage(video, (videoWidth - width) / 2, (videoHeight - height) / 2, width, height, 0, 0, width, height);

    // Si falla la creación (por ejemplo, sin red para bajar el modelo), la próxima lectura reintenta.
    this.worker ??= import('tesseract.js')
      .then(({ createWorker }) => createWorker('spa'))
      .catch((e: unknown) => {
        this.worker = undefined;
        throw e;
      });
    // Se piden los bloques para tener la confianza de cada palabra.
    const { data } = await (await this.worker).recognize(canvas, {}, { blocks: true });
    const words = (data.blocks ?? []).flatMap((b) =>
      b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)),
    );
    return wordsToText(words);
  }
}
