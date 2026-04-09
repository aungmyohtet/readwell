import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProgressInsights, ProgressRecord, RetrySession, SubmitProgressRequest, SubmitRetryRequest } from '../models/progress.model';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  submit(request: SubmitProgressRequest): Observable<ProgressRecord> {
    return this.http.post<ProgressRecord>(`${this.base}/api/progress`, request);
  }

  submitRetry(request: SubmitRetryRequest): Observable<ProgressRecord> {
    return this.http.post<ProgressRecord>(`${this.base}/api/progress/retry`, request);
  }

  getHistory(): Observable<ProgressRecord[]> {
    return this.http.get<ProgressRecord[]>(`${this.base}/api/progress/history`);
  }

  getInsights(): Observable<ProgressInsights> {
    return this.http.get<ProgressInsights>(`${this.base}/api/progress/insights`);
  }

  getRetrySession(chapterId: string): Observable<RetrySession> {
    return this.http.get<RetrySession>(`${this.base}/api/progress/retry/${chapterId}`);
  }
}
