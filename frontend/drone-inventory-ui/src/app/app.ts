import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { AppLogo } from './shared/logo/app-logo';
import { ToastContainer } from './shared/toast/toast-container';
import { Theme, ThemeService } from './shared/theme/theme.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastContainer, HlmButton, NgIcon, AppLogo],
  providers: [provideIcons({ lucideSun, lucideMoon })],
  selector: 'app-root',
  templateUrl: './app.html',
  host: {
    '(document:pointermove)': 'trackPointer($event)',
    '(document:pointerout)': 'pointerOut($event)',
  },
})
export class App {
  private readonly themeService = inject(ThemeService);

  protected readonly theme = this.themeService.theme;

  protected readonly links = [
    { path: '/drones', label: 'Drones', exact: false },
    { path: '/student-groups', label: 'Student groups', exact: false },
    { path: '/loans', label: 'Loans', exact: true },
    { path: '/loans/history', label: 'History', exact: false },
  ];

  /**
   * Hands the pointer position to the card under it, which draws its border highlight there
   * (styles.css, add-home-dashboard design D7). One listener serves every card.
   */
  /**
   * Hands the pointer position to every card, the dialogs included, for its border highlight
   * (design D7). All boxes are read before any is written, so the browser lays out once.
   */
  protected trackPointer(event: PointerEvent): void {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="card"]'));
    const boxes = cards.map((card) => card.getBoundingClientRect());
    cards.forEach((card, i) => {
      card.style.setProperty('--pointer-x', `${event.clientX - boxes[i].left}px`);
      card.style.setProperty('--pointer-y', `${event.clientY - boxes[i].top}px`);
    });
    document.documentElement.classList.add('pointer-inside');
  }

  /** Leaving to no element means the pointer left the window: no card shows the highlight. */
  protected pointerOut(event: PointerEvent): void {
    if (event.relatedTarget === null) {
      document.documentElement.classList.remove('pointer-inside');
    }
  }

  protected choose(theme: Theme): void {
    this.themeService.choose(theme);
  }
}
