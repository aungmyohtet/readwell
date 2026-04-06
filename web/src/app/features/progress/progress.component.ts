import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProgressService } from '../../core/services/progress.service';
import { ProgressRecord } from '../../core/models/progress.model';

@Component({
  selector: 'app-progress',
  imports: [RouterLink],
  template: `
    <div class="container">
      <section class="progress-hero section-card">
        <div>
          <span class="eyebrow">Learning Dashboard</span>
          <h1 class="page-title">See what you are mastering, not just what you finished.</h1>
          <p class="page-subtitle">Use your history to spot strengths, weak points, and where to review next.</p>
        </div>

        <div class="hero-mini card">
          <span class="mini-label">Recent momentum</span>
          <strong>{{ recentCompletions() }}</strong>
          <p>chapters completed in the last 30 days</p>
        </div>
      </section>

      @if (loading()) {
        <div class="loading">Loading history...</div>
      } @else if (history().length === 0) {
        <div class="empty-state section-card">
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
          <div class="stat-card card accent-card">
            <div class="stat-value">{{ storiesExplored() }}</div>
            <div class="stat-label">Stories Explored</div>
          </div>
        </div>

        <section class="insight-strip">
          <div class="insight-card card">
            <span class="insight-title">Best result</span>
            <strong>{{ strongestResult() }}%</strong>
            <p>Your top quiz performance so far.</p>
          </div>
          <div class="insight-card card">
            <span class="insight-title">Recommended habit</span>
            <strong>Read → notice → quiz</strong>
            <p>Revisit chapters below 80% before moving too far ahead.</p>
          </div>
        </section>

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
    .progress-hero {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) minmax(16rem, 0.85fr);
      gap: 1rem;
      align-items: stretch;
      padding: 1.4rem;
      margin-bottom: 1.4rem;
    }
    .hero-mini {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.35rem;
      background: linear-gradient(180deg, rgba(15, 118, 110, 0.12), rgba(245, 158, 11, 0.12));
    }
    .hero-mini strong { font-size: 2.4rem; line-height: 1; }
    .mini-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent-strong); }
    .hero-mini p { color: var(--muted); font-size: 0.88rem; }
    .loading { padding: 48px; text-align: center; color: var(--muted); }
    .empty-state { text-align: center; padding: 60px 20px; }
    .empty-icon { font-size: 3rem; margin-bottom: 12px; }
    h3 { font-size: 1.1rem; margin-bottom: 8px; }
    .empty-state p { color: var(--muted); margin-bottom: 20px; }
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
    .stat-card { text-align: center; background: rgba(255, 252, 247, 0.8); }
    .accent-card { background: linear-gradient(180deg, rgba(245, 158, 11, 0.12), rgba(239, 111, 83, 0.12)); }
    .stat-value { font-size: 2rem; font-weight: 800; color: var(--accent-strong); }
    .stat-label { font-size: 0.8rem; color: var(--muted); margin-top: 4px; }
    .insight-strip { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 1rem; }
    .insight-card { background: rgba(255, 255, 255, 0.7); }
    .insight-title { display: block; font-size: 0.78rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.35rem; }
    .insight-card strong { display: block; font-size: 1.4rem; margin-bottom: 0.2rem; }
    .insight-card p { color: var(--muted); font-size: 0.88rem; }
    .section-title { font-size: 1.15rem; font-weight: 800; margin-bottom: 12px; color: var(--ink); }
    .history-list { display: flex; flex-direction: column; gap: 10px; }
    .history-item { display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: rgba(255, 252, 247, 0.8); }
    .story-name { font-weight: 800; font-size: 1rem; }
    .chapter-name { font-size: 0.88rem; color: var(--ink); margin: 3px 0; }
    .completed-date { font-size: 0.78rem; color: var(--muted); }
    .history-score { text-align: right; }
    .score-value { font-size: 1.25rem; font-weight: 800; color: var(--accent-strong); &.perfect { color: #236342; } }
    .score-pct { font-size: 0.8rem; color: var(--muted); }

    @media (max-width: 860px) {
      .progress-hero,
      .stats-row,
      .insight-strip {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .history-item { flex-direction: column; align-items: flex-start; }
      .history-score { text-align: left; }
    }
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

  storiesExplored(): number {
    return new Set(this.history().map((record) => record.storyId)).size;
  }

  strongestResult(): number {
    return this.history().reduce((best, record) => Math.max(best, this.pct(record)), 0);
  }

  recentCompletions(): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return this.history().filter((record) => new Date(record.completedAt) >= cutoff).length;
  }
}
