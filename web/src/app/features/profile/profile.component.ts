import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ProgressService } from '../../core/services/progress.service';
import { ProgressRecord } from '../../core/models/progress.model';
import { PlacementResult } from '../../core/models/placement.model';
import { PlacementService } from '../../core/services/placement.service';

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  template: `
    <div class="container profile-page">
      <section class="profile-hero section-card">
        <div class="identity-block">
          <div class="profile-avatar">{{ initial() }}</div>
          <div>
            <span class="eyebrow">Study Profile</span>
            <h1 class="page-title">{{ displayName() }}</h1>
            <p class="page-subtitle">{{ email() || 'Signed in learner' }}</p>
            <div class="identity-meta">
              <span>{{ history().length }} chapters</span>
              <span>{{ averagePct() }}% avg</span>
              <span>{{ storiesExplored() }} stories</span>
            </div>
          </div>
        </div>

        <div class="hero-note card">
          <span class="note-label">Reading identity</span>
          <strong>{{ focusMessage() }}</strong>
          <p>{{ focusDetail() }}</p>
          <div class="hero-note-meta">
            <span>{{ readingIdentity() }}</span>
            <span>{{ studyPaceLabel() }}</span>
          </div>
        </div>
      </section>

      <div class="profile-grid">
        <section class="card summary-panel">
          <h2>Learning snapshot</h2>
          <div class="summary-stats">
            <div>
              <strong>{{ history().length }}</strong>
              <span>Chapters finished</span>
            </div>
            <div>
              <strong>{{ averagePct() }}%</strong>
              <span>Average quiz score</span>
            </div>
            <div>
              <strong>{{ storiesExplored() }}</strong>
              <span>Stories explored</span>
            </div>
          </div>
          <div class="trajectory-strip">
            <div class="trajectory-card">
              <span class="trajectory-label">Current band</span>
              <strong>{{ readinessLabel() }}</strong>
              <p>{{ readinessCopy() }}</p>
            </div>
            <div class="trajectory-card">
              <span class="trajectory-label">Study rhythm</span>
              <strong>{{ studyPaceLabel() }}</strong>
              <p>{{ studyPaceCopy() }}</p>
            </div>
          </div>
        </section>

        <section class="card guidance-panel">
          <span class="eyebrow">Recommended next step</span>
          <h2>{{ recommendationHeadline() }}</h2>
          <p>{{ recommendation() }}</p>
          <div class="guidance-actions">
            <a routerLink="/browse" class="btn btn-primary">Go to Library</a>
            <a routerLink="/progress" class="btn btn-secondary">Review Progress</a>
          </div>
        </section>

        <section class="card guidance-panel">
          <span class="eyebrow">Placement</span>
          <h2>{{ placementHeadline() }}</h2>
          <p>{{ placementCopy() }}</p>
          <div class="guidance-actions">
            <a routerLink="/placement" class="btn btn-primary">{{ placement() ? 'Retake placement' : 'Start placement' }}</a>
            @if (placement()) {
              <a routerLink="/browse" class="btn btn-secondary">Open {{ placement()!.chosenLevel }} library</a>
            }
          </div>
        </section>
      </div>

      <section class="profile-grid secondary-grid">
        <section class="card habit-panel">
          <h2>Strong study routine</h2>
          <ul class="habit-list">
            <li>Read one chapter without rushing to the quiz.</li>
            <li>Turn grammar highlighting on and notice the target pattern.</li>
            <li>Tap unfamiliar vocabulary in the story before checking the answer.</li>
            <li>Retry any chapter scored below 80%.</li>
          </ul>
        </section>

        <section class="card recent-panel">
          <h2>Recent completions</h2>
          @if (history().length === 0) {
            <p class="muted-copy">You have not completed a chapter yet.</p>
          } @else {
            <div class="recent-list">
              @for (record of recentHistory(); track record.id) {
                <div class="recent-item">
                  <div>
                    <strong>{{ record.storyTitle }}</strong>
                    <span>Chapter {{ record.chapterNumber }} · {{ record.chapterTitle }}</span>
                  </div>
                  <span class="recent-score">{{ pct(record) }}%</span>
                </div>
              }
            </div>
          }
        </section>
      </section>
    </div>
  `,
  styles: [],
})
export class ProfileComponent implements OnInit {
  history = signal<ProgressRecord[]>([]);
  placement = signal<PlacementResult | null>(null);

  readonly displayName = computed(() => this.auth.user()?.displayName || 'Reader');
  readonly email = computed(() => this.auth.user()?.email || '');
  readonly initial = computed(() => {
    const base = this.auth.user()?.displayName || this.auth.user()?.email || 'R';
    return base.charAt(0).toUpperCase();
  });

  constructor(
    private auth: AuthService,
    private progressService: ProgressService,
    private placementService: PlacementService,
  ) {}

  ngOnInit() {
    this.progressService.getHistory().subscribe({
      next: (records) => this.history.set(records),
    });
    this.placementService.getPlacement().pipe(catchError(() => of(null))).subscribe({
      next: (result) => this.placement.set(result),
    });
  }

  averagePct(): number {
    const records = this.history();
    if (!records.length) return 0;
    const total = records.reduce((sum, record) => sum + this.pct(record), 0);
    return Math.round(total / records.length);
  }

  storiesExplored(): number {
    return new Set(this.history().map((record) => record.storyId)).size;
  }

  pct(record: ProgressRecord): number {
    if (!record.totalQuestions) return 0;
    return Math.round((record.score / record.totalQuestions) * 100);
  }

  recentHistory(): ProgressRecord[] {
    return this.history().slice(0, 4);
  }

  focusMessage(): string {
    if (!this.history().length) return 'You are still at the starting line';
    if (this.averagePct() >= 85) return 'You look comfortable at the current level';
    if (this.averagePct() >= 70) return 'You are building steadier control';
    return 'You are still rebuilding confidence';
  }

  focusDetail(): string {
    if (!this.history().length) return 'One completed chapter is enough to turn this page from a placeholder into something useful.';
    if (this.averagePct() >= 85) return 'Your results suggest the current level is manageable and that a harder path would not be unreasonable.';
    if (this.averagePct() >= 70) return 'The base is there. What matters now is turning decent scores into steadier, repeatable control.';
    return 'The fastest way forward is not more volume. It is cleaner review on the chapters you have already opened.';
  }

  readingIdentity(): string {
    if (!this.history().length) return 'New learner';
    if (this.averagePct() >= 85) return 'Confident reader';
    if (this.averagePct() >= 70) return 'Steady learner';
    return 'Careful rebuilder';
  }

  studyPaceLabel(): string {
    const recent = this.recentHistory().length;
    if (!this.history().length) return 'No recent rhythm yet';
    if (recent >= 4) return 'Active this week';
    if (recent >= 2) return 'Steady progress';
    return 'Light momentum';
  }

  studyPaceCopy(): string {
    const recent = this.recentHistory().length;
    if (!this.history().length) return 'Complete one chapter to start building a study pattern.';
    if (recent >= 4) return 'You are building repetition well. Keep review and new reading balanced.';
    if (recent >= 2) return 'You have a workable rhythm. Stay consistent rather than speeding up too much.';
    return 'A little more repetition this week would make the learning feel more stable.';
  }

  readinessLabel(): string {
    if (!this.history().length) return 'Starting point';
    if (this.averagePct() >= 85) return 'Ready to stretch';
    if (this.averagePct() >= 70) return 'Building confidence';
    return 'Review before pushing ahead';
  }

  readinessCopy(): string {
    if (!this.history().length) return 'Choose an accessible story and complete one full chapter first.';
    if (this.averagePct() >= 85) return 'Your results suggest you can handle harder chapters or a higher level.';
    if (this.averagePct() >= 70) return 'You are progressing well, but keep reinforcing errors before leveling up.';
    return 'Consolidate recent chapters first so the next challenge does not become noise.';
  }

  recommendationHeadline(): string {
    if (!this.history().length) return 'Begin with one complete chapter';
    if (this.averagePct() < 80) return 'Consolidate before stretching';
    return 'Keep the current pace';
  }

  recommendation(): string {
    if (!this.history().length) return 'Choose a level-appropriate story and finish one full chapter today.';
    if (this.averagePct() < 80) return 'Review your weaker recent chapters first, then add something new once the errors feel less noisy.';
    return 'Continue to the next unlocked chapter and move up only if the current level is starting to feel easy.';
  }

  placementHeadline(): string {
    const placement = this.placement();
    if (!placement) return 'No placement saved yet';
    return `${placement.chosenLevel} is your current library start point`;
  }

  placementCopy(): string {
    const placement = this.placement();
    if (!placement) return 'Take the short placement check so the library opens at a level that feels realistic from the first chapter.';
    if (placement.chosenLevel !== placement.recommendedLevel) {
      return `The placement check recommended ${placement.recommendedLevel}, but you chose ${placement.chosenLevel}. That override is saved and currently drives your starting band.`;
    }
    return `${placement.recommendedLevel} is the saved recommendation. Retake the check any time if your confidence or reading load has shifted.`;
  }
}
