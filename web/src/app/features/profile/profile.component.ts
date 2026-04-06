import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProgressService } from '../../core/services/progress.service';
import { ProgressRecord } from '../../core/models/progress.model';

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  template: `
    <div class="container">
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
          <span class="note-label">Current direction</span>
          <strong>{{ focusMessage() }}</strong>
          <p>{{ focusDetail() }}</p>
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
        </section>

        <section class="card guidance-panel">
          <h2>Recommended next step</h2>
          <p>{{ recommendation() }}</p>
          <div class="guidance-actions">
            <a routerLink="/browse" class="btn btn-primary">Go to Library</a>
            <a routerLink="/progress" class="btn btn-secondary">Review Progress</a>
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
  styles: [`
    .profile-hero {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(18rem, 0.9fr);
      gap: 1rem;
      padding: 1.4rem;
      margin-bottom: 1rem;
    }
    .identity-block {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .profile-avatar {
      width: 5.3rem;
      height: 5.3rem;
      border-radius: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f766e 0%, #14532d 100%);
      color: #fff;
      font-size: 1.8rem;
      font-weight: 800;
      flex-shrink: 0;
      box-shadow: 0 18px 30px rgba(15, 118, 110, 0.2);
    }
    .hero-note {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 0.35rem;
      background: linear-gradient(180deg, rgba(245, 158, 11, 0.12), rgba(239, 111, 83, 0.08));
    }
    .note-label {
      font-size: 0.76rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .hero-note strong {
      font-size: 1.35rem;
    }
    .hero-note p,
    .muted-copy {
      color: var(--muted);
    }
    .identity-meta {
      display: flex;
      gap: 0.55rem;
      flex-wrap: wrap;
      margin-top: 0.85rem;
    }
    .identity-meta span {
      display: inline-flex;
      align-items: center;
      min-height: 2rem;
      padding: 0.38rem 0.7rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(29, 42, 40, 0.08);
      color: var(--ink);
      font-size: 0.8rem;
      font-weight: 700;
    }

    .profile-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .secondary-grid {
      align-items: start;
    }
    .summary-panel h2,
    .guidance-panel h2,
    .habit-panel h2,
    .recent-panel h2 {
      font-size: 1.15rem;
      margin-bottom: 1rem;
    }
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.8rem;
    }
    .summary-stats div {
      padding: 0.9rem;
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.6);
      border: 1px solid rgba(29, 42, 40, 0.08);
    }
    .summary-stats strong {
      display: block;
      font-size: 1.6rem;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 0.25rem;
      color: var(--accent-strong);
    }
    .summary-stats span,
    .guidance-panel p,
    .recent-item span,
    .habit-list {
      color: var(--muted);
    }
    .guidance-actions {
      display: flex;
      gap: 0.8rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    .habit-list {
      padding-left: 1.1rem;
      display: grid;
      gap: 0.6rem;
    }
    .recent-list {
      display: grid;
      gap: 0.75rem;
    }
    .recent-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.9rem 1rem;
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.62);
      border: 1px solid rgba(29, 42, 40, 0.08);
    }
    .recent-item strong {
      display: block;
      margin-bottom: 0.15rem;
    }
    .recent-score {
      font-weight: 800;
      color: var(--accent-strong);
      white-space: nowrap;
    }

    @media (max-width: 860px) {
      .profile-hero,
      .profile-grid,
      .summary-stats {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .profile-hero {
        padding: 1.05rem;
        gap: 1rem;
      }

      .identity-block,
      .recent-item {
        align-items: flex-start;
        flex-direction: column;
      }

      .identity-meta {
        flex-wrap: nowrap;
        overflow-x: auto;
        padding-bottom: 0.35rem;
        scrollbar-width: none;
      }

      .identity-meta::-webkit-scrollbar {
        display: none;
      }

      .identity-meta span {
        flex: 0 0 auto;
      }

      .guidance-actions {
        display: grid;
        grid-template-columns: 1fr;
      }

      .guidance-actions .btn {
        width: 100%;
      }

      .summary-stats {
        display: flex;
        overflow-x: auto;
        gap: 0.75rem;
        padding-bottom: 0.35rem;
        scroll-snap-type: x proximity;
        scrollbar-width: none;
      }

      .summary-stats::-webkit-scrollbar {
        display: none;
      }

      .summary-stats div {
        min-width: min(74vw, 13rem);
        flex: 0 0 auto;
        scroll-snap-align: start;
      }

      .recent-item {
        padding: 0.95rem 1rem;
      }

      .recent-score {
        display: inline-flex;
        min-height: 2.2rem;
        align-items: center;
        justify-content: center;
        padding: 0.35rem 0.7rem;
        border-radius: 999px;
        background: rgba(15, 118, 110, 0.08);
      }
    }

    @media (max-width: 520px) {
      .profile-avatar {
        width: 4.4rem;
        height: 4.4rem;
        border-radius: 1.2rem;
        font-size: 1.5rem;
      }

      .hero-note strong {
        font-size: 1.18rem;
      }
    }
  `],
})
export class ProfileComponent implements OnInit {
  history = signal<ProgressRecord[]>([]);

  readonly displayName = computed(() => this.auth.user()?.displayName || 'Reader');
  readonly email = computed(() => this.auth.user()?.email || '');
  readonly initial = computed(() => {
    const base = this.auth.user()?.displayName || this.auth.user()?.email || 'R';
    return base.charAt(0).toUpperCase();
  });

  constructor(
    private auth: AuthService,
    private progressService: ProgressService,
  ) {}

  ngOnInit() {
    this.progressService.getHistory().subscribe({
      next: (records) => this.history.set(records),
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
    if (!this.history().length) return 'Build your first reading habit';
    if (this.averagePct() >= 85) return 'You are ready for harder chapters';
    if (this.averagePct() >= 70) return 'Your comprehension is developing well';
    return 'Slow down and review more deliberately';
  }

  focusDetail(): string {
    if (!this.history().length) return 'Start with one story chapter and aim to finish the quiz with feedback.';
    if (this.averagePct() >= 85) return 'Try a higher-level story or revisit grammar mode to notice more nuanced patterns.';
    if (this.averagePct() >= 70) return 'Keep going, but revisit incorrect answers and compare them with the highlighted grammar.';
    return 'Re-read completed chapters with grammar highlighting turned on before attempting new material.';
  }

  recommendation(): string {
    if (!this.history().length) return 'Choose a level-appropriate story and finish one full chapter today.';
    if (this.averagePct() < 80) return 'Review your recent lower-scoring chapters and retry them before moving to a new story.';
    return 'Continue to the next unlocked chapter or step up to a harder level if reading feels comfortable.';
  }
}
