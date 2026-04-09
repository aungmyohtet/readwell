import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlacementResult, SubmitPlacementRequest, UpdatePlacementChoiceRequest } from '../models/placement.model';

@Injectable({ providedIn: 'root' })
export class PlacementService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getPlacement(): Observable<PlacementResult | null> {
    return this.http.get<PlacementResult | null>(`${this.base}/api/placement`);
  }

  submitPlacement(request: SubmitPlacementRequest): Observable<PlacementResult> {
    return this.http.post<PlacementResult>(`${this.base}/api/placement`, request);
  }

  updateChoice(request: UpdatePlacementChoiceRequest): Observable<PlacementResult> {
    return this.http.put<PlacementResult>(`${this.base}/api/placement/choice`, request);
  }
}