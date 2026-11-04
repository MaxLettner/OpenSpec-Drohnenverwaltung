import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOAST_DURATION_MS, ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a shown message to the toasts', () => {
    service.show('Drone not available');

    expect(service.toasts().map((toast) => toast.message)).toEqual(['Drone not available']);
  });

  it('dismisses a toast automatically after about five seconds', () => {
    service.show('Drone not available');

    vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
    expect(service.toasts().length).toBe(1);

    vi.advanceTimersByTime(1);
    expect(service.toasts()).toEqual([]);
  });

  it('dismisses a toast manually before its timer runs out', () => {
    service.show('first');
    const firstId = service.toasts()[0].id;

    service.dismiss(firstId);

    expect(service.toasts()).toEqual([]);
  });

  it('keeps other toasts when one is dismissed and does not dismiss them early', () => {
    service.show('first');
    const firstId = service.toasts()[0].id;
    vi.advanceTimersByTime(2000);
    service.show('second');

    service.dismiss(firstId);
    expect(service.toasts().map((toast) => toast.message)).toEqual(['second']);

    // The timer of the dismissed toast must not remove the second one early.
    vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
    expect(service.toasts().map((toast) => toast.message)).toEqual(['second']);

    vi.advanceTimersByTime(1);
    expect(service.toasts()).toEqual([]);
  });

  it('ignores a manual dismiss of an unknown toast', () => {
    service.show('still here');

    service.dismiss(9999);

    expect(service.toasts().map((toast) => toast.message)).toEqual(['still here']);
  });
});
