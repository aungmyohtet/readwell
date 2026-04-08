import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProgressService } from '../../core/services/progress.service';
import { MistakeBankItem, ProgressInsights, ProgressRecord, ReviewRecommendation } from '../../core/models/progress.model';

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
          <div class="progress-hero-actions">
            <a routerLink="/browse" class="btn btn-primary">Browse Stories</a>
            <a routerLink="/profile" class="btn btn-secondary">Study Profile</a>
          </div>
        </div>

        <div class="hero-mini card">
          <span class="mini-label">Next focus</span>
          <strong>{{ focusHeadline() }}</strong>
          <p>{{ focusSupport() }}</p>
          <div class="hero-mini-actions">
            @if (priorityReview()) {
              <a class="btn btn-primary btn-full" [routerLink]="['/chapters', priorityReview()!.chapterId]">Review chapter</a>
            } @else {
              <a class="btn btn-primary btn-full" routerLink="/browse">Choose a story</a>
            }
          </div>
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
            <div class="stat-value">{{ dashboardAveragePct() }}%</div>
            <div class="stat-label">Average Score</div>
          </div>
          <div class="stat-card card accent-card">
            <div class="stat-value">{{ storiesExplored() }}</div>
            <div class="stat-label">Stories Explored</div>
          </div>
        </div>

        <section class="focus-board">
          <div class="focus-card card focus-card-strong">
            <span class="focus-label">Current direction</span>
            <strong>{{ focusHeadline() }}</strong>
            <p>{{ focusSupport() }}</p>
          </div>
          <div class="focus-card card">
            <span class="focus-label">Recent momentum</span>
            <strong>{{ recentCompletions() }}</strong>
            <p>chapters completed in the last 30 days</p>
          </div>
          <div class="focus-card card">
            <span class="focus-label">Best result</span>
            <strong>{{ strongestResult() }}%</strong>
            <p>Your top quiz performance so far.</p>
          </div>
        </section>

        <section class="insight-strip">
          <div class="insight-card card">
            <span class="insight-title">Recommended habit</span>
            <strong>Read → notice → quiz</strong>
            <p>Revisit chapters below 80% before moving too far ahead.</p>
          </div>
          <div class="insight-card card">
            <span class="insight-title">Review threshold</span>
            <strong>Below 80%</strong>
            <p>Treat those chapters as active review, not finished work.</p>
          </div>
        </section>

        @if (reviewQueue().length > 0) {
          <section class="review-queue section-card">
            <div class="section-shell review-shell">
              <div class="section-heading">
                <div>
                  <span class="section-kicker">Adaptive Review</span>
                  <h2 class="section-title">Recommended next review</h2>
                </div>
                <p class="section-note">These chapters are the best places to revisit before moving ahead.</p>
              </div>

              <div class="review-list grouped-list">
                @for (item of reviewQueue(); track item.chapterId) {
                  <a class="review-item list-row" [routerLink]="['/chapters', item.chapterId]">
                    <div class="review-copy">
                      <strong>{{ item.storyTitle }}</strong>
                      <span>Ch. {{ item.chapterNumber }}: {{ item.chapterTitle }}</span>
                      <p>{{ item.grammarRule }} · {{ item.reason }}</p>
                    </div>
                    <div class="review-score">{{ item.lastScorePct }}%</div>
                  </a>
                }
              </div>
            </div>
          </section>
        }

        @if (weakAreas().length > 0) {
          <section class="weak-areas section-card">
            <div class="section-heading compact">
              <div>
                <span class="section-kicker">Weak Areas</span>
                <h2 class="section-title">Grammar to revisit</h2>
              </div>
            </div>

            <div class="weak-area-list">
              @for (area of weakAreas(); track area.grammarRule) {
                <div class="weak-area-chip card">
                  <strong>{{ area.grammarRule }}</strong>
                  <span>{{ area.missCount }} missed answers across {{ area.chapterCount }} chapter{{ area.chapterCount === 1 ? '' : 's' }}</span>
                </div>
              }
            </div>
          </section>
        }

        <section class="history-section section-card">
          <div class="section-shell history-shell">
            <div class="section-heading compact history-heading">
              <div>
                <span class="section-kicker">History</span>
                <h2 class="section-title">Completed chapters</h2>
              </div>
              <p class="section-note">Use this as your trail of finished work, not your next-action list.</p>
            </div>
            <div class="history-list grouped-list">
              @for (record of history(); track record.id) {
                <div class="history-item list-row">
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
          </div>
        </section>

        @if (mistakeBank().length > 0) {
          <section class="mistake-bank section-card">
            <div class="section-heading compact">
              <div>
                <span class="section-kicker">Mistake Bank</span>
                <h2 class="section-title">Recent questions to learn from</h2>
              </div>
            </div>

            <div class="mistake-list">
              @for (item of mistakeBank(); track item.chapterId + '-' + item.questionOrder + '-' + item.completedAt) {
                <div class="mistake-item card">
                  <div class="mistake-topline">
                    <strong>{{ item.storyTitle }} · Ch. {{ item.chapterNumber }}</strong>
                    <span>{{ formatMistakeDate(item.completedAt) }}</span>
                  </div>
                  <div class="mistake-rule">{{ item.grammarRule }}</div>
                  <p class="mistake-question">Q{{ item.questionOrder }}. {{ item.question }}</p>
                  <p class="mistake-answer wrong-answer">Your answer: <strong>{{ item.selectedAnswer || 'No answer' }}</strong></p>
                  <p class="mistake-answer correct-answer">Correct answer: <strong>{{ item.correctAnswer }}</strong></p>
                  <p class="mistake-explanation">{{ item.explanation }}</p>
                  <a class="mistake-link" [routerLink]="['/chapters', item.chapterId]">Review chapter →</a>
                </div>
              }
            </div>
          </section>
        }
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
    .hero-mini strong { font-size: 1.45rem; line-height: 1.1; }
    .mini-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent-strong); }
    .hero-mini p { color: var(--muted); font-size: 0.88rem; }
    .hero-mini-actions { margin-top: 0.75rem; }
    .progress-hero-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
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
    .focus-board { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 14px; margin-bottom: 1rem; }
    .focus-card { background: rgba(255, 255, 255, 0.74); }
    .focus-card-strong { background: linear-gradient(160deg, rgba(15, 118, 110, 0.14), rgba(255, 255, 255, 0.92) 60%, rgba(245, 158, 11, 0.08)); }
    .focus-label { display: block; font-size: 0.76rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 0.45rem; }
    .focus-card strong { display: block; font-size: 1.3rem; margin-bottom: 0.25rem; }
    .focus-card p { color: var(--muted); font-size: 0.88rem; line-height: 1.5; }
    .insight-strip { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 1rem; }
    .insight-card { background: rgba(255, 255, 255, 0.7); }
    .insight-title { display: block; font-size: 0.78rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.35rem; }
    .insight-card strong { display: block; font-size: 1.4rem; margin-bottom: 0.2rem; }
    .insight-card p { color: var(--muted); font-size: 0.88rem; }
    .section-kicker {
      display: inline-flex;
      margin-bottom: 0.35rem;
      color: var(--muted);
      font-size: 0.74rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .section-shell {
      padding: 1rem 1rem 1.05rem;
      border-radius: calc(var(--radius-lg) - 4px);
      background: rgba(255, 255, 255, 0.58);
      border: 1px solid rgba(29, 42, 40, 0.06);
    }
    .review-shell {
      background: linear-gradient(180deg, rgba(15, 118, 110, 0.08), rgba(255, 255, 255, 0.7));
    }
    .history-shell {
      background: rgba(255, 252, 247, 0.76);
    }
    .section-heading {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
      padding-bottom: 0.9rem;
      border-bottom: 1px solid rgba(29, 42, 40, 0.08);
    }
    .section-heading.compact { margin-bottom: 0.85rem; }
    .section-note { color: var(--muted); max-width: 28rem; font-size: 0.88rem; }
    .section-title { font-size: 1.15rem; font-weight: 800; margin-bottom: 0; color: var(--ink); }
    .history-section { margin-bottom: 1rem; }
    .history-heading { margin-top: 0; }
    .grouped-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      border: 1px solid rgba(29, 42, 40, 0.08);
      border-radius: calc(var(--radius-md) + 2px);
      overflow: hidden;
      background: rgba(255, 255, 255, 0.78);
    }
    .history-list { display: flex; flex-direction: column; }
    .list-row {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.05rem;
      background: transparent;
    }
    .list-row + .list-row {
      border-top: 1px solid rgba(29, 42, 40, 0.08);
    }
    .history-item { align-items: center; }
    .story-name { font-weight: 800; font-size: 1rem; }
    .chapter-name { font-size: 0.88rem; color: var(--ink); margin: 3px 0; }
    .completed-date { font-size: 0.78rem; color: var(--muted); }
    .history-score { text-align: right; }
    .score-value { font-size: 1.25rem; font-weight: 800; color: var(--accent-strong); &.perfect { color: #236342; } }
    .score-pct { font-size: 0.8rem; color: var(--muted); }
    .review-queue, .weak-areas, .mistake-bank { margin-bottom: 1rem; }
    .review-list, .mistake-list { display: flex; flex-direction: column; }
    .review-item {
      align-items: flex-start;
      text-decoration: none;
      color: inherit;
      background: transparent;
    }
    .review-copy { display: flex; flex-direction: column; gap: 0.18rem; }
    .review-copy span, .review-copy p { color: var(--muted); font-size: 0.88rem; }
    .review-score {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--accent-strong);
      white-space: nowrap;
      padding: 0.45rem 0.7rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(15, 118, 110, 0.12);
    }
    .weak-area-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.85rem; }
    .weak-area-chip { display: flex; flex-direction: column; gap: 0.25rem; background: rgba(255, 247, 237, 0.92); }
    .weak-area-chip span { color: var(--muted); font-size: 0.85rem; }
    .mistake-item { background: rgba(255, 255, 255, 0.78); padding: 1rem 1.05rem; }
    .mistake-topline { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 0.3rem; font-size: 0.82rem; }
    .mistake-topline span { color: var(--muted); white-space: nowrap; }
    .mistake-rule {
      display: inline-flex;
      width: fit-content;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      background: rgba(15, 118, 110, 0.12);
      color: var(--accent-strong);
      font-size: 0.76rem;
      font-weight: 700;
      margin-bottom: 0.55rem;
    }
    .mistake-question { font-weight: 700; margin-bottom: 0.5rem; }
    .mistake-answer, .mistake-explanation { font-size: 0.9rem; margin-bottom: 0.32rem; }
    .wrong-answer { color: #b45309; }
    .mistake-link { display: inline-flex; margin-top: 0.35rem; font-weight: 700; color: var(--accent-strong); text-decoration: none; }

    @media (max-width: 860px) {
      .progress-hero,
      .insight-strip,
      .focus-board {
        grid-template-columns: 1fr;
      }

      .stats-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .weak-area-list {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .progress-hero {
        padding: 1.05rem;
        gap: 1rem;
      }

      .section-shell {
        padding: 0.85rem 0.85rem 0.9rem;
      }

      .progress-hero-actions {
        display: grid;
        grid-template-columns: 1fr;
      }

      .progress-hero-actions .btn {
        width: 100%;
      }

      .stats-row,
      .insight-strip,
      .focus-board {
        display: flex;
        overflow-x: auto;
        gap: 0.85rem;
        padding-bottom: 0.35rem;
        margin-inline: -0.15rem;
        scroll-snap-type: x proximity;
        scrollbar-width: none;
      }

      .stats-row::-webkit-scrollbar,
      .insight-strip::-webkit-scrollbar,
      .focus-board::-webkit-scrollbar {
        display: none;
      }

      .stat-card,
      .insight-card,
      .focus-card {
        min-width: min(82vw, 15.5rem);
        flex: 0 0 auto;
        scroll-snap-align: start;
      }

      .history-item {
        flex-direction: column;
        align-items: flex-start;
        padding: 0.95rem 1rem;
        border-radius: 1.15rem;
      }

      .section-heading,
      .review-item,
      .history-item,
      .mistake-topline {
        flex-direction: column;
        align-items: flex-start;
      }

      .review-score,
      .history-score {
        text-align: left;
      }

      .history-info {
        width: 100%;
      }

      .history-score {
        text-align: left;
        width: 100%;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
      }
    }

    @media (max-width: 520px) {
      .hero-mini strong {
        font-size: 2rem;
      }

      .history-score {
        align-items: flex-start;
        flex-direction: column;
        gap: 0.25rem;
      }

      .score-value {
        font-size: 1.15rem;
      }
    }
  `],
})
export class ProgressComponent implements OnInit {
  history = signal<ProgressRecord[]>([]);
  insights = signal<ProgressInsights | null>(null);
  loading = signal(false);

  constructor(private progressService: ProgressService) {}

  ngOnInit() {
    this.loading.set(true);
    forkJoin({
      history: this.progressService.getHistory(),
      insights: this.progressService.getInsights(),
    }).subscribe({
      next: ({ history, insights }) => {
        this.history.set(history);
        this.insights.set(insights);
        this.loading.set(false);
      },
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

  dashboardAveragePct(): number {
    return this.insights()?.averageScorePct ?? this.averagePct();
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

  formatMistakeDate(iso: string): string {
    return this.formatDate(iso);
  }

  storiesExplored(): number {
    return new Set(this.history().map((record) => record.storyId)).size;
  }

  strongestResult(): number {
    return this.history().reduce((best, record) => Math.max(best, this.pct(record)), 0);
  }

  priorityReview(): ReviewRecommendation | null {
    return this.reviewQueue()[0] ?? null;
  }

  focusHeadline(): string {
    const review = this.priorityReview();
    if (review) return `Review ${review.storyTitle} Chapter ${review.chapterNumber}`;
    if (!this.history().length) return 'Build your first reading habit';
    if (this.dashboardAveragePct() >= 85) return 'You are ready for harder chapters';
    if (this.dashboardAveragePct() >= 70) return 'Your comprehension is developing well';
    return 'Slow down and review more deliberately';
  }

  focusSupport(): string {
    const review = this.priorityReview();
    if (review) return `${review.grammarRule} is the strongest review target right now. ${review.reason}`;
    if (!this.history().length) return 'Finish one chapter and use the quiz feedback to create your first progress signal.';
    if (this.dashboardAveragePct() >= 85) return 'Continue to the next unlocked chapter or step into a harder level if reading feels comfortable.';
    if (this.dashboardAveragePct() >= 70) return 'Keep moving, but revisit incorrect answers and compare them with the highlighted grammar.';
    return 'Re-read completed chapters with grammar highlighting turned on before attempting new material.';
  }

  recentCompletions(): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return this.history().filter((record) => new Date(record.completedAt) >= cutoff).length;
  }

  reviewQueue(): ReviewRecommendation[] {
    return this.insights()?.reviewQueue ?? [];
  }

  weakAreas() {
    return this.insights()?.weakAreas ?? [];
  }

  mistakeBank(): MistakeBankItem[] {
    return this.insights()?.mistakeBank ?? [];
  }
}
