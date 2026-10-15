import { Injectable } from '@angular/core';

/** Única pieza que toca navigator.mediaDevices: en los tests se reemplaza por un falso. */
@Injectable({ providedIn: 'root' })
export class Camera {
  open(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  }
}
