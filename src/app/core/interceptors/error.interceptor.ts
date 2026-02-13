import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const SKIP_ERROR_NOTIFICATION = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (req.context.get(SKIP_ERROR_NOTIFICATION)) {
        return throwError(() => error);
      }

      if (error instanceof HttpErrorResponse) {
        const message =
          typeof error.error?.message === 'string'
            ? error.error.message
            : 'Ocorreu um erro na comunicação com o servidor.';
        notificationService.show('error', message);
      }

      return throwError(() => error);
    }),
  );
};
