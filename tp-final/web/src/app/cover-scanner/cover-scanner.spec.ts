import { TestBed } from '@angular/core/testing';
import { Camera } from '../camera';
import { CoverOcr } from '../cover-ocr';
import { CoverScannerComponent } from './cover-scanner';

const CAMERA_ERROR = 'No se pudo abrir la cámara. Revisá el permiso del navegador o buscá a mano.';
const READ_ERROR = 'No se pudo leer la tapa.';

/** Promesa que se resuelve o rechaza desde el test. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function setup(opts: { open?: () => Promise<MediaStream>; read?: () => Promise<string> } = {}) {
  vi.useFakeTimers();
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const camera = { open: vi.fn(opts.open ?? (() => Promise.resolve(stream))) };
  const ocr = { read: vi.fn(opts.read ?? (() => Promise.resolve('RAYUELA'))) };
  await TestBed.configureTestingModule({
    imports: [CoverScannerComponent],
    providers: [
      { provide: Camera, useValue: camera },
      { provide: CoverOcr, useValue: ocr },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(CoverScannerComponent);
  const el = fixture.nativeElement as HTMLElement;
  const texts: string[] = [];
  fixture.componentInstance.text.subscribe((t) => texts.push(t));
  fixture.detectChanges();
  // Deja resolver open() y asignar el stream.
  await vi.advanceTimersByTimeAsync(0);
  fixture.detectChanges();
  const advance = async (ms: number) => {
    await vi.advanceTimersByTimeAsync(ms);
    fixture.detectChanges();
  };
  const alert = () => el.querySelector('[role="alert"]')?.textContent?.trim();
  return { fixture, el, camera, ocr, track, stream, texts, advance, alert };
}

describe('CoverScannerComponent', () => {
  afterEach(() => vi.useRealTimers());

  it('pide la cámara y asigna el stream al video', async () => {
    const { el, camera, stream } = await setup();
    expect(camera.open).toHaveBeenCalledTimes(1);
    expect(el.querySelector('video')?.srcObject).toBe(stream);
  });

  it('cada segundo emite el texto leído', async () => {
    const { texts, advance } = await setup();
    await advance(1000);
    expect(texts).toEqual(['RAYUELA']);
    await advance(1000);
    expect(texts).toEqual(['RAYUELA', 'RAYUELA']);
  });

  it('no lanza una lectura nueva mientras la anterior sigue en curso', async () => {
    const { ocr, advance } = await setup({ read: () => new Promise<string>(() => {}) });
    await advance(3000);
    expect(ocr.read).toHaveBeenCalledTimes(1);
  });

  it('al destruirse apaga las pistas y no lee más', async () => {
    const { fixture, ocr, track } = await setup();
    fixture.destroy();
    expect(track.stop).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2000);
    expect(ocr.read).not.toHaveBeenCalled();
  });

  it('una lectura que termina después de destruirse no emite', async () => {
    const pending = deferred<string>();
    const { fixture, texts, advance } = await setup({ read: () => pending.promise });
    await advance(1000);
    fixture.destroy();
    pending.resolve('TARDE');
    await vi.advanceTimersByTimeAsync(0);
    expect(texts).toEqual([]);
  });

  it('si se destruye mientras se pide el permiso, apaga la cámara al abrirse', async () => {
    const opening = deferred<MediaStream>();
    const { fixture, track, stream } = await setup({ open: () => opening.promise });
    fixture.destroy();
    opening.resolve(stream);
    await vi.advanceTimersByTimeAsync(0);
    expect(track.stop).toHaveBeenCalled();
  });

  it('si la cámara falla muestra el error y no lee', async () => {
    const { ocr, advance, alert } = await setup({
      open: () => Promise.reject(new DOMException('denied', 'NotAllowedError')),
    });
    await advance(2000);
    expect(alert()).toBe(CAMERA_ERROR);
    expect(ocr.read).not.toHaveBeenCalled();
  });

  it('si una lectura falla muestra el error y sigue leyendo', async () => {
    const results = [() => Promise.reject(new Error('sin modelo')), () => Promise.resolve('X')];
    const { texts, advance, alert } = await setup({ read: () => results.shift()!() });
    await advance(1000);
    expect(alert()).toBe(READ_ERROR);
    await advance(1000);
    expect(texts).toEqual(['X']);
    expect(alert()).toBeUndefined();
  });
});
