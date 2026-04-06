import { Component, OnInit, signal, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoryService } from '../../core/services/story.service';
import { Story, ChapterSummary } from '../../core/models/story.model';

@Component({
  selector: 'app-story-detail',
  imports: [RouterLink],
  template: `
    <div class="container">
      <a routerLink="/browse" class="back-link">← Back to Browse</a>

      @if (story()) {
        <section class="story-hero section-card">
          <div class="hero-cover">
            @if (story()!.coverImageUrl) {
              <img [src]="story()!.coverImageUrl" [alt]="story()!.title" />
            } @else {
              <span class="hero-emoji">{{ story()!.coverEmoji || '📖' }}</span>
            }
          </div>
          <div class="hero-info">
            <div class="hero-topline">
              <span class="level-badge {{ story()!.level }}">{{ story()!.level }}</span>
              <span class="reading-copy">Read for meaning. Notice the form. Retrieve with the quiz.</span>
            </div>
            <h1>{{ story()!.title }}</h1>
            <p class="description">{{ story()!.description }}</p>
            @if (story()!.author) {
              <p class="author">Written by {{ story()!.author }}</p>
            }

            <div class="hero-metrics">
              <div class="metric card">
                <span class="metric-value">{{ chapters().length }}</span>
                <span class="metric-label">Chapters</span>
              </div>
              <div class="metric card">
                <span class="metric-value">{{ totalVocabulary() }}</span>
                <span class="metric-label">Vocabulary items</span>
              </div>
              <div class="metric card">
                <span class="metric-value">{{ totalQuestions() }}</span>
                <span class="metric-label">Quiz questions</span>
              </div>
            </div>
          </div>
        </section>

        <section class="progress-panel card">
          <div>
            <span class="eyebrow">Story Progress</span>
            <h2 class="section-title">Move chapter by chapter, with visible mastery.</h2>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-track">
              <div class="progress-bar-fill" [style.width.%]="completionPct()"></div>
            </div>
            <span class="progress-label">{{ completedCount() }}/{{ chapters().length }} completed</span>
          </div>
        </section>

        <h2 class="section-title chapter-heading">Chapters</h2>
        @if (loading()) {
          <div class="loading">Loading chapters...</div>
        } @else {
          <div class="chapter-list">
            @for (ch of chapters(); track ch.id; let i = $index) {
              @if (isLocked(i)) {
                <div class="chapter-item locked">
                  <div class="chapter-num locked-num">🔒</div>
                  <div class="chapter-info">
                    <div class="chapter-title">{{ ch.title }}</div>
                    <div class="chapter-meta">
                      <span>Complete Chapter {{ i }} to unlock this one</span>
                    </div>
                  </div>
                </div>
              } @else {
                <a class="chapter-item" [routerLink]="['/chapters', ch.id]">
                  <div class="chapter-num" [class.done]="ch.completed">
                    @if (ch.completed) { ✓ } @else { {{ ch.chapterNumber }} }
                  </div>
                  <div class="chapter-info">
                    <div class="chapter-kicker">Chapter {{ ch.chapterNumber }}</div>
                    <div class="chapter-title">{{ ch.title }}</div>
                    <div class="chapter-meta">
                      <span>{{ ch.vocabularyCount }} vocabulary targets</span>
                      <span>{{ ch.comprehensionCount }} quiz prompts</span>
                    </div>
                  </div>
                  <div class="chapter-right">
                    @if (ch.completed) {
                      <div class="stars">{{ starsDisplay(ch) }}</div>
                      <div class="score-text">{{ ch.score }}/{{ ch.comprehensionCount }}</div>
                    } @else {
                      <span class="arrow">→</span>
                    }
                  </div>
                </a>
              }
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .back-link { color: var(--accent-strong); font-size: 0.92rem; display: inline-block; margin-bottom: 1rem; font-weight: 700; }
    .story-hero {
      display: grid;
      grid-template-columns: 14rem minmax(0, 1fr);
      gap: 1.35rem;
      align-items: stretch;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .hero-cover {
      width: 100%; min-height: 14rem;
      border-radius: 1.5rem; overflow: hidden;
      background: linear-gradient(135deg, rgba(15, 118, 110, 0.16), rgba(245, 158, 11, 0.14));
      display: flex; align-items: center; justify-content: center;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .hero-emoji { font-size: 4.4rem; }
    .hero-info { display: flex; flex-direction: column; justify-content: center; }
    .hero-topline { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
    .reading-copy { color: var(--muted); font-size: 0.84rem; font-weight: 700; }
    h1 { font-size: clamp(2rem, 4vw, 3rem); margin: 0.8rem 0 0.55rem; }
    .description { color: var(--muted); font-size: 1rem; max-width: 42rem; }
    .author { color: var(--muted); font-size: 0.88rem; margin-top: 0.55rem; }

    .hero-metrics {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.85rem;
      margin-top: 1.2rem;
    }
    .metric {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.66);
    }
    .metric-value { font-size: 1.6rem; font-weight: 800; }
    .metric-label { font-size: 0.8rem; color: var(--muted); }

    .progress-panel {
      display: grid;
      gap: 0.9rem;
      margin-bottom: 1.25rem;
    }
    .section-title { font-size: 1.4rem; }
    .chapter-heading { margin-bottom: 0.95rem; }
    .progress-bar-wrap { display: flex; align-items: center; gap: 12px; }
    .progress-bar-track {
      flex: 1; height: 10px; background: rgba(29, 42, 40, 0.08); border-radius: 999px; overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%; background: linear-gradient(90deg, var(--accent), #14532d); border-radius: 999px;
      transition: width 0.4s ease;
    }
    .progress-label { font-size: 0.82rem; color: var(--muted); white-space: nowrap; font-weight: 700; }

    .loading { color: var(--muted); padding: 24px 0; }
    .chapter-list { display: flex; flex-direction: column; gap: 12px; }

    .chapter-item {
      display: flex; align-items: center; gap: 16px;
      background: rgba(255, 252, 247, 0.8); border: 1px solid rgba(29, 42, 40, 0.08); border-radius: 20px;
      padding: 16px 18px;
      transition: background 0.15s, box-shadow 0.15s, transform 0.15s, border-color 0.15s;
      &:not(.locked) {
        cursor: pointer;
        &:hover {
          background: #fffdf9;
          box-shadow: 0 18px 30px rgba(29, 42, 40, 0.08);
          transform: translateY(-2px);
          border-color: rgba(15, 118, 110, 0.16);
        }
      }
      &.locked { opacity: 0.58; cursor: default; background: rgba(255, 255, 255, 0.52); }
    }
    .chapter-num {
      width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0;
      background: rgba(15, 118, 110, 0.12); color: var(--accent-strong);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 0.95rem;
      &.done { background: rgba(47, 133, 90, 0.14); color: #236342; }
    }
    .locked-num {
      width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0;
      background: rgba(29, 42, 40, 0.08);
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem;
    }
    .chapter-info { flex: 1; }
    .chapter-kicker { font-size: 0.74rem; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.2rem; }
    .chapter-title { font-weight: 800; font-size: 1.02rem; }
    .chapter-meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: 0.82rem; color: var(--muted); margin-top: 4px; }
    .chapter-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .stars { font-size: 1rem; }
    .score-text { font-size: 0.76rem; color: var(--muted); }
    .arrow { color: var(--accent-strong); font-size: 1.2rem; }

    @media (max-width: 860px) {
      .story-hero { grid-template-columns: 1fr; }
      .hero-cover { min-height: 12rem; }
      .hero-metrics { grid-template-columns: 1fr; }
    }

    @media (max-width: 640px) {
      .progress-bar-wrap { flex-direction: column; align-items: stretch; }
      .chapter-item { align-items: start; }
      .chapter-right { align-items: start; }
    }
  `],
})
export class StoryDetailComponent implements OnInit {
  @Input() storyId!: string;

  story = signal<Story | null>(null);
  chapters = signal<ChapterSummary[]>([]);
  loading = signal(false);

  constructor(private storyService: StoryService) {}

  ngOnInit() {
    this.storyService.getStory(this.storyId).subscribe((s) => this.story.set(s));
    this.loading.set(true);
    this.storyService.getChapters(this.storyId).subscribe({
      next: (data) => { this.chapters.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  isLocked(index: number): boolean {
    if (index === 0) return false;
    return !this.chapters()[index - 1]?.completed;
  }

  completedCount(): number {
    return this.chapters().filter((c) => c.completed).length;
  }

  completionPct(): number {
    const total = this.chapters().length;
    if (!total) return 0;
    return (this.completedCount() / total) * 100;
  }

  getStars(ch: ChapterSummary): number {
    if (!ch.completed) return 0;
    const pct = ch.score / ch.comprehensionCount;
    if (pct === 1) return 3;
    if (pct >= 0.8) return 2;
    if (pct >= 0.6) return 1;
    return 0;
  }

  starsDisplay(ch: ChapterSummary): string {
    const n = this.getStars(ch);
    return '⭐'.repeat(n) + '☆'.repeat(3 - n);
  }

  totalVocabulary(): number {
    return this.chapters().reduce((sum, chapter) => sum + chapter.vocabularyCount, 0);
  }

  totalQuestions(): number {
    return this.chapters().reduce((sum, chapter) => sum + chapter.comprehensionCount, 0);
  }
}
