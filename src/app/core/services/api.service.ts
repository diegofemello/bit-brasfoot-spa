import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SKIP_ERROR_NOTIFICATION } from '../interceptors/error.interceptor';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:3000/api';

  constructor(private readonly http: HttpClient) {}

  get<T>(path: string, params?: Record<string, string | number | boolean>) {
    const httpParams = this.toHttpParams(params);
    return this.http.get<T>(`${this.baseUrl}/${path}`, { params: httpParams });
  }

  getSilently<T>(path: string, params?: Record<string, string | number | boolean>) {
    const httpParams = this.toHttpParams(params);
    return this.http.get<T>(`${this.baseUrl}/${path}`, {
      params: httpParams,
      context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
    });
  }

  post<T>(path: string, body: unknown) {
    return this.http.post<T>(`${this.baseUrl}/${path}`, body);
  }

  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(`${this.baseUrl}/${path}`, body);
  }

  delete<T>(path: string) {
    return this.http.delete<T>(`${this.baseUrl}/${path}`);
  }

  put<T>(path: string, body: unknown) {
    return this.http.put<T>(`${this.baseUrl}/${path}`, body);
  }

  private toHttpParams(params?: Record<string, string | number | boolean>) {
    if (!params) {
      return undefined;
    }

    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) {
        return;
      }
      httpParams = httpParams.set(key, String(value));
    });

    return httpParams;
  }
}
