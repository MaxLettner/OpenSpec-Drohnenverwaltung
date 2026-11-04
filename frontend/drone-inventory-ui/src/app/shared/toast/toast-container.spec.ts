import { TestBed } from '@angular/core/testing';
import { ToastContainer } from './toast-container';
import { ToastService } from './toast.service';

describe('ToastContainer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ToastContainer] });
  });

  it('renders the shown messages and removes one when its close button is clicked', () => {
    const fixture = TestBed.createComponent(ToastContainer);
    const toasts = TestBed.inject(ToastService);
    toasts.show('Drone not available');
    toasts.show('Group 9 does not exist');
    fixture.detectChanges();

    const messages = () =>
      Array.from(fixture.nativeElement.querySelectorAll('.toast-message')).map((element) =>
        (element as HTMLElement).textContent?.trim(),
      );
    expect(messages()).toEqual(['Drone not available', 'Group 9 does not exist']);

    const closeButtons = fixture.nativeElement.querySelectorAll(
      '.toast-close',
    ) as NodeListOf<HTMLButtonElement>;
    closeButtons[0].click();
    fixture.detectChanges();

    expect(messages()).toEqual(['Group 9 does not exist']);
  });

  // ui-theme: "Backend error is shown"
  it('shows a backend error message in an alert with the error colors', () => {
    const fixture = TestBed.createComponent(ToastContainer);
    TestBed.inject(ToastService).show('Drone not available');
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('Drone not available');
    expect(alert.classList.contains('bg-destructive/10')).toBe(true);
    expect(alert.classList.contains('border-destructive/40')).toBe(true);
    expect(alert.classList.contains('text-foreground')).toBe(true);
  });

  // ui-theme: "Dismiss a notification"
  it('dismisses a notification with the shared ghost icon button', () => {
    const fixture = TestBed.createComponent(ToastContainer);
    TestBed.inject(ToastService).show('Drone not available');
    fixture.detectChanges();

    const close = fixture.nativeElement.querySelector(
      'button[aria-label="Close notification"]',
    ) as HTMLButtonElement;
    expect(close.getAttribute('data-slot')).toBe('button');
    expect(close.textContent?.trim()).toBe('×');
    close.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });
});
