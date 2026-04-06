import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Story, ChapterSummary, ChapterDetail } from '../models/story.model';

@Injectable({ providedIn: 'root' })
export class StoryService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getStories(level?: string): Observable<Story[]> {
    const url = `${this.base}/api/stories`;
    if (level) {
      return this.http.get<Story[]>(url, { params: { level } });
    }
    return this.http.get<Story[]>(url);
  }

  getStory(id: string): Observable<Story> {
    return this.http.get<Story>(`${this.base}/api/stories/${id}`);
  }

  getChapters(storyId: string): Observable<ChapterSummary[]> {
    return this.http.get<ChapterSummary[]>(`${this.base}/api/stories/${storyId}/chapters`);
  }

  getChapter(chapterId: string): Observable<ChapterDetail> {
    return this.http.get<ChapterDetail>(`${this.base}/api/stories/chapters/${chapterId}`);
  }
}
