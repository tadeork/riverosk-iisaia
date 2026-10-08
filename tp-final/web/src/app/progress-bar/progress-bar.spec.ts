import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProgressBarComponent } from './progress-bar';

@Component({
  imports: [ProgressBarComponent],
  template: `<app-progress-bar
    [pages]="pages()"
    [pagesRead]="pagesRead()"
    [disabled]="disabled()"
    (increment)="increments = increments + 1"
    (decrement)="decrements = decrements + 1"
  />`,
})
class HostComponent {
  pages = signal(300);
  pagesRead = signal(120);
  disabled = signal(false);
  increments = 0;
  decrements = 0;
}

async function setup() {
  await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const buttons = () => ({
    minus: el.querySelector('button[aria-label="Restar una página"]') as HTMLButtonElement,
    plus: el.querySelector('button[aria-label="Sumar una página"]') as HTMLButtonElement,
  });
  return { fixture, el, host: fixture.componentInstance, buttons };
}

describe('ProgressBarComponent', () => {
  it('muestra 40% y "120 / 300 páginas"', async () => {
    const { el } = await setup();
    expect(el.textContent).toContain('40%');
    expect(el.textContent).toContain('120 / 300 páginas');
  });

  it('+ emite increment; − emite decrement', async () => {
    const { host, buttons } = await setup();
    buttons().plus.click();
    expect(host.increments).toBe(1);
    expect(host.decrements).toBe(0);
    buttons().minus.click();
    expect(host.decrements).toBe(1);
    expect(host.increments).toBe(1);
  });

  it('disabled deshabilita ambos botones', async () => {
    const { fixture, host, buttons } = await setup();
    host.disabled.set(true);
    await fixture.whenStable();
    expect(buttons().minus.disabled).toBe(true);
    expect(buttons().plus.disabled).toBe(true);
  });

  it('− deshabilitado en 0 y + deshabilitado en pages', async () => {
    const { fixture, host, buttons } = await setup();
    host.pagesRead.set(0);
    await fixture.whenStable();
    expect(buttons().minus.disabled).toBe(true);
    expect(buttons().plus.disabled).toBe(false);
    host.pagesRead.set(300);
    await fixture.whenStable();
    expect(buttons().minus.disabled).toBe(false);
    expect(buttons().plus.disabled).toBe(true);
  });
});
