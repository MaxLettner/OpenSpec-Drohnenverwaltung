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
});
