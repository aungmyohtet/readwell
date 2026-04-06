import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take, map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait for Firebase to restore session from local storage before deciding.
  // Without this, every page refresh redirects to /login because the guard
  // runs before onIdTokenChanged has fired.
  return toObservable(auth.initialized).pipe(
    filter(Boolean),
    take(1),
    map(() => auth.isLoggedIn() ? true : router.createUrlTree(['/login'])),
  );
};
