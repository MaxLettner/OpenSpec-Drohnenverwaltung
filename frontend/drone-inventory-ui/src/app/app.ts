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
  host: { '(document:pointermove)': 'trackPointer($event)' },
})
export class App {
  private readonly themeService = inject(ThemeService);

  protected readonly theme = this.themeService.theme;

  protected readonly links = [
    { path: '/', label: 'Home', exact: true },
    { path: '/drones', label: 'Drones', exact: false },
    { path: '/student-groups', label: 'Student groups', exact: false },
    { path: '/loans', label: 'Loans', exact: true },
    { path: '/loans/history', label: 'History', exact: false },
  ];

  /**
   * Hands the pointer position to the card under it, which draws its border highlight there
   * (styles.css, add-home-dashboard design D7). One listener serves every card.
   */
  protected trackPointer(event: PointerEvent): void {
    const card = (event.target as Element | null)?.closest?.<HTMLElement>('[data-slot="card"]');
    if (!card) {
      return;
    }
    const box = card.getBoundingClientRect();
    card.style.setProperty('--pointer-x', `${event.clientX - box.left}px`);
    card.style.setProperty('--pointer-y', `${event.clientY - box.top}px`);
  }

  protected choose(theme: Theme): void {
    this.themeService.choose(theme);
  }
}
