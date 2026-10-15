import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Camera } from '../camera';
import { CoverOcr } from '../cover-ocr';

const READ_INTERVAL_MS = 1000;
const CAMERA_ERROR = 'No se pudo abrir la cámara. Revisá el permiso del navegador o buscá a mano.';
const READ_ERROR = 'No se pudo leer la tapa.';

@Component({
  selector: 'app-cover-scanner',
  styleUrl: './cover-scanner.scss',
  template: `
    @if (cameraFailed()) {
      <p class="error" role="alert">{{ cameraError }}</p>
    } @else {
      <div class="frame">
        <video #video autoplay muted playsinline></video>
        <div class="guide"></div>
      </div>
      @if (readFailed()) {
        <p class="error" role="alert">{{ readError }}</p>
      }
    }
  `,
})
export class CoverScannerComponent {
  private readonly camera = inject(Camera);
  private readonly ocr = inject(CoverOcr);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  /** Texto leído dentro del recuadro, una vez por lectura. */
  readonly text = output<string>();

  protected readonly cameraError = CAMERA_ERROR;
  protected readonly readError = READ_ERROR;
  protected readonly cameraFailed = signal(false);
  protected readonly readFailed = signal(false);

  private stream?: MediaStream;
  private timer?: ReturnType<typeof setInterval>;
  private reading = false;
  private destroyed = false;

  constructor() {
    afterNextRender(() => this.start());
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      clearInterval(this.timer);
      this.stream?.getTracks().forEach((t) => t.stop());
    });
  }

  private async start(): Promise<void> {
    try {
      const stream = await this.camera.open();
      // El modal se cerró mientras el navegador pedía el permiso: apagar la cámara ya abierta.
      if (this.destroyed) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      const video = this.video()?.nativeElement;
      if (video) video.srcObject = stream;
      this.timer = setInterval(() => this.tick(), READ_INTERVAL_MS);
    } catch {
      if (!this.destroyed) this.cameraFailed.set(true);
    }
  }

  private async tick(): Promise<void> {
    const video = this.video()?.nativeElement;
    if (this.reading || this.destroyed || !video) return;
    this.reading = true;
    try {
      const text = await this.ocr.read(video);
      if (this.destroyed) return;
      this.readFailed.set(false);
      this.text.emit(text);
    } catch {
      if (!this.destroyed) this.readFailed.set(true);
    } finally {
      this.reading = false;
    }
  }
}
