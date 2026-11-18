import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { errorToastInterceptor } from './shared/http/error-toast.interceptor';
import { ThemeService } from './shared/theme/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Creates the ThemeService at startup so that the theme is applied on every page.
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
    // Binds query parameters to inputs of routed pages; only LoansPage declares one (`droneId`).
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([errorToastInterceptor])),
  ],
};
