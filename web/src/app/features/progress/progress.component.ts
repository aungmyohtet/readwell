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
          <div class="hero-mini-topline">
            <span class="mini-label">Next focus</span>
            @if (reviewAlertCount() > 0) {
              <span class="notification-badge">{{ reviewAlertLabel() }}</span>
            }
          </div>
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
            <p>Use rescue, due now, and due soon signals to decide what to revisit next.</p>
          </div>
          <div class="insight-card card">
            <span class="insight-title">Review rhythm</span>
            <strong>{{ reviewRhythmLabel() }}</strong>
            <p>Weak chapters are rescued immediately. Stronger ones come back on a short schedule.</p>
          </div>
        </section>

        @if (reviewQueue().length > 0) {
          <section class="review-queue section-card">
            <div class="section-shell review-shell">
              <div class="section-heading">
                <div>
                  <div class="section-heading-meta">
                    <span class="section-kicker">Adaptive Review</span>
                    <span class="notification-badge">{{ reviewAlertLabel() }}</span>
                  </div>
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
                      @if (item.focusSkillLabel) {
                        <span class="review-subskill">Focus skill: {{ item.focusSkillLabel }}</span>
                      }
                      <span class="review-stage-label" [class.stage-rescue]="item.reviewStage === 'rescue'" [class.stage-now]="item.reviewStage === 'due-now'" [class.stage-soon]="item.reviewStage === 'due-soon'">
                        {{ reviewStageLabel(item) }}
                      </span>
                    </div>
                    <div class="review-meta">
                      <span class="achievement-badge" [class.close]="reviewBadgeClass(item.lastScorePct) === 'close'" [class.review]="reviewBadgeClass(item.lastScorePct) === 'review'">{{ reviewBadgeLabel(item.lastScorePct) }}</span>
                      <div class="review-score">{{ item.lastScorePct }}%</div>
                      <span class="review-score-note">quiz + practice</span>
                    </div>
                  </a>
                }
              </div>
            </div>
          </section>
        }

        @if (weakAreas().length > 0) {
          <section class="weak-areas section-card">
            <div class="section-shell weak-shell">
              <div class="section-heading compact">
                <div>
                  <span class="section-kicker">Weak Areas</span>
                  <h2 class="section-title">Grammar to revisit</h2>
                </div>
                <p class="section-note">These patterns are showing up repeatedly in missed answers.</p>
              </div>

              <div class="weak-area-list">
                @for (area of weakAreas(); track area.grammarRule) {
                  <div class="weak-area-chip card">
                    <strong>{{ area.grammarRule }}</strong>
                    <span>{{ area.missCount }} missed answers across {{ area.chapterCount }} chapter{{ area.chapterCount === 1 ? '' : 's' }}</span>
                    @if (area.focusSkillLabel) {
                      <div class="weak-area-skill">Focus skill: {{ area.focusSkillLabel }} · {{ area.focusSkillMissCount }} practice miss{{ area.focusSkillMissCount === 1 ? '' : 'es' }}</div>
                    }
                    <div class="weak-area-breakdown">Quiz {{ area.quizMissCount }} · Practice {{ area.practiceMissCount }}</div>
                  </div>
                }
              </div>
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
                    <div class="history-subline">{{ historyProgressMeta(record) }}</div>
                  </div>
                  <div class="history-score">
                    <span class="achievement-badge" [class.perfect]="historyBadgeClass(record) === 'perfect'" [class.mastered]="historyBadgeClass(record) === 'mastered'" [class.close]="historyBadgeClass(record) === 'close'" [class.review]="historyBadgeClass(record) === 'review'">{{ historyBadgeLabel(record) }}</span>
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
            <div class="section-shell mistake-shell">
              <div class="section-heading compact">
                <div>
                  <div class="section-heading-meta">
                    <span class="section-kicker">Mistake Bank</span>
                    <span class="notification-badge">{{ mistakeAlertLabel() }}</span>
                  </div>
                  <h2 class="section-title">Recent questions to learn from</h2>
                </div>
                <p class="section-note">Use these as targeted review prompts, not as a second quiz to rush through.</p>
              </div>

              <div class="mistake-list">
                @for (item of mistakeBank(); track item.chapterId + '-' + item.questionOrder + '-' + item.completedAt) {
                  <div class="mistake-item card">
                    <div class="mistake-topline">
                      <strong>{{ item.storyTitle }} · Ch. {{ item.chapterNumber }}</strong>
                      <span>{{ formatMistakeDate(item.completedAt) }}</span>
                    </div>
                    <div class="mistake-rule-row">
                      <div class="mistake-rule">{{ item.grammarRule }}</div>
                      <span class="mistake-source-badge" [class.practice]="item.source === 'practice'" [class.quiz]="item.source !== 'practice'">{{ mistakeSourceLabel(item) }}</span>
                      @if (item.skillLabel) {
                        <span class="mistake-skill-badge">{{ item.skillLabel }}</span>
                      }
                    </div>
                    <p class="mistake-question">Q{{ item.questionOrder }}. {{ item.question }}</p>
                    <p class="mistake-answer wrong-answer">Your answer: <strong>{{ item.selectedAnswer || 'No answer' }}</strong></p>
                    <p class="mistake-answer correct-answer">Correct answer: <strong>{{ item.correctAnswer }}</strong></p>
                    <p class="mistake-explanation">{{ item.explanation }}</p>
                    <a class="mistake-link" [routerLink]="['/chapters', item.chapterId]">Review chapter →</a>
                  </div>
                }
              </div>
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
    return this.history().reduce((best, record) => Math.max(best, this.effectivePct(record)), 0);
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

  reviewAlertCount(): number {
    return this.reviewQueue().length;
  }

  reviewAlertLabel(): string {
    const count = this.reviewAlertCount();
    return `${count} review ${count === 1 ? 'chapter' : 'chapters'}`;
  }

  reviewRhythmLabel(): string {
    const queue = this.reviewQueue();
    if (queue.some((item) => item.reviewStage === 'rescue')) return 'Rescue first';
    if (queue.some((item) => item.reviewStage === 'due-now')) return 'Due today';
    return 'Due soon';
  }

  weakAreas() {
    return this.insights()?.weakAreas ?? [];
  }

  mistakeBank(): MistakeBankItem[] {
    return this.insights()?.mistakeBank ?? [];
  }

  mistakeAlertLabel(): string {
    const count = this.mistakeBank().length;
    return `${count} ${count === 1 ? 'question' : 'questions'}`;
  }

  historyBadgeLabel(record: ProgressRecord): string {
    const pct = this.effectivePct(record);
    if (pct === 100) return 'Perfect';
    if (pct >= 80) return 'Mastered';
    if (pct >= 60) return 'Almost there';
    return 'Review';
  }

  historyBadgeClass(record: ProgressRecord): 'perfect' | 'mastered' | 'close' | 'review' {
    const pct = this.effectivePct(record);
    if (pct === 100) return 'perfect';
    if (pct >= 80) return 'mastered';
    if (pct >= 60) return 'close';
    return 'review';
  }

  reviewBadgeLabel(scorePct: number): string {
    return scorePct >= 60 ? 'Almost there' : 'Review';
  }

  reviewBadgeClass(scorePct: number): 'close' | 'review' {
    return scorePct >= 60 ? 'close' : 'review';
  }

  reviewStageLabel(item: ReviewRecommendation): string {
    switch (item.reviewStage) {
      case 'rescue':
        return 'Rescue now';
      case 'due-now':
        return 'Due now';
      case 'due-soon':
        return this.reviewDueLabel(item.nextReviewAt);
      default:
        return 'Review soon';
    }
  }

  reviewDueLabel(nextReviewAt?: string | null): string {
    if (!nextReviewAt) return 'Due soon';
    const reviewDate = new Date(nextReviewAt);
    const now = new Date();
    const dayDiff = Math.ceil((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (dayDiff <= 0) return 'Due now';
    if (dayDiff === 1) return 'Due tomorrow';
    return `Due in ${dayDiff} days`;
  }

  effectivePct(record: ProgressRecord): number {
    return record.effectiveScorePct || this.pct(record);
  }

  historyProgressMeta(record: ProgressRecord): string {
    const attempts = record.attemptCount || 1;
    const bestPct = record.totalQuestions ? Math.round(((record.bestScore || record.score) / record.totalQuestions) * 100) : 0;
    const practicePart = record.practiceTotal > 0 ? ` · practice ${record.practiceScore}/${record.practiceTotal}` : '';
    return `${attempts} ${attempts === 1 ? 'attempt' : 'attempts'} · best ${bestPct}% · effective ${this.effectivePct(record)}%${practicePart}`;
  }

  mistakeSourceLabel(item: MistakeBankItem): string {
    return item.source === 'practice' ? 'Practice' : 'Quiz';
  }
}
