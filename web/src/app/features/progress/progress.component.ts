import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProgressService } from '../../core/services/progress.service';
import { ProgressRecord } from '../../core/models/progress.model';

@Component({
  selector: 'app-progress',
  imports: [RouterLink],
  template: `
    <div class="container">
      <h1 class="page-title">My Progress</h1>
      <p class="page-subtitle">Track your reading history</p>

      @if (loading()) {
        <div class="loading">Loading history...</div>
      } @else if (history().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">📖</div>
          <h3>No chapters completed yet</h3>
          <p>Start reading a story to see your progress here.</p>
          <a routerLink="/browse" class="btn btn-primary">Browse Stories</a>
        </div>
      } @else {
        <div class="stats-row">
          <div class="stat-card card">
            <div class="stat-value">{{ history().length }}</div>
            <div class="stat-label">Chapters Completed</div>
          </div>
          <div class="stat-card card">
            <div class="stat-value">{{ totalScore() }}</div>
            <div class="stat-label">Total Points</div>
          </div>
          <div class="stat-card card">
            <div class="stat-value">{{ averagePct() }}%</div>
            <div class="stat-label">Average Score</div>
          </div>
        </div>

        <h2 class="section-title">History</h2>
        <div class="history-list">
          @for (record of history(); track record.id) {
            <div class="history-item card">
              <div class="history-info">
                <div class="story-name">{{ record.storyTitle || 'Story' }}</div>
                <div class="chapter-name">Ch. {{ record.chapterNumber }}: {{ record.chapterTitle }}</div>
                <div class="completed-date">{{ formatDate(record.completedAt) }}</div>
              </div>
              <div class="history-score">
                <div class="score-value" [class.perfect]="record.score === record.totalQuestions">
                  {{ record.score }}/{{ record.totalQuestions }}
                </div>
                <div class="score-pct">{{ pct(record) }}%</div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .loading { padding: 48px; text-align: center; color: #888; }
    .empty-state { text-align: center; padding: 60px 20px; }
    .empty-icon { font-size: 3rem; margin-bottom: 12px; }
    h3 { font-size: 1.1rem; margin-bottom: 8px; }
    .empty-state p { color: #888; margin-bottom: 20px; }
    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
    .stat-card { text-align: center; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #2d6cdf; }
    .stat-label { font-size: 0.8rem; color: #888; margin-top: 4px; }
    .section-title { font-size: 1rem; font-weight: 700; margin-bottom: 12px; color: #444; }
    .history-list { display: flex; flex-direction: column; gap: 10px; }
    .history-item { display: flex; align-items: center; justify-content: space-between; }
    .story-name { font-weight: 700; font-size: 0.95rem; }
    .chapter-name { font-size: 0.85rem; color: #555; margin: 3px 0; }
    .completed-date { font-size: 0.78rem; color: #aaa; }
    .history-score { text-align: right; }
    .score-value { font-size: 1.2rem; font-weight: 700; color: #2d6cdf; &.perfect { color: #2e7d32; } }
    .score-pct { font-size: 0.78rem; color: #888; }
  `],
})
export class ProgressComponent implements OnInit {
  history = signal<ProgressRecord[]>([]);
  loading = signal(false);

  constructor(private progressService: ProgressService) {}

  ngOnInit() {
    this.loading.set(true);
    this.progressService.getHistory().subscribe({
      next: (data) => { this.history.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  totalScore(): number {
    return this.history().reduce((sum, r) => sum + r.score, 0);
  }

  averagePct(): number {
    const h = this.history();
    if (!h.length) return 0;
    const total = h.reduce((sum, r) => sum + this.pct(r), 0);
    return Math.round(total / h.length);
  }

  pct(r: ProgressRecord): number {
    if (!r.totalQuestions) return 0;
    return Math.round((r.score / r.totalQuestions) * 100);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }
}
