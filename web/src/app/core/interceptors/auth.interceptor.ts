import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return from(authService.getIdToken()).pipe(
    switchMap((token) => {
      const authReq = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

      return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          // On 401: the token may have just expired. Force-refresh and retry once.
          if (error.status === 401) {
            return from(authService.getIdToken(true)).pipe(
              switchMap((freshToken) => {
                if (!freshToken) return throwError(() => error);
                const retried = req.clone({
                  setHeaders: { Authorization: `Bearer ${freshToken}` },
                });
                return next(retried);
              }),
            );
          }
          return throwError(() => error);
        }),
      );
    }),
  );
};
