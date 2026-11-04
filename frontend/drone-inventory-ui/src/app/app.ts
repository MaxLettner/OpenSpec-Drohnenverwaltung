import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { ToastContainer } from './shared/toast/toast-container';
import { Theme, ThemeService } from './shared/theme/theme.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastContainer, HlmButton, NgIcon],
  providers: [provideIcons({ lucideSun, lucideMoon })],
  selector: 'app-root',
  templateUrl: './app.html',
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

  protected choose(theme: Theme): void {
    this.themeService.choose(theme);
  }
}
