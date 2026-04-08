import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProgressService } from '../../core/services/progress.service';
import { MistakeBankItem, ProgressInsights, ProgressRecord, ReviewRecommendation } from '../../core/models/progress.model';

@Component({
  selector: 'app-progress',
  imports: [RouterLink],
  template: `
    <div class="container progress-page">
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
  styles: [],
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
