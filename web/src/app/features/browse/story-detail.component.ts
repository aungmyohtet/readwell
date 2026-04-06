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
        <div class="story-hero">
          <div class="hero-cover">
            @if (story()!.coverImageUrl) {
              <img [src]="story()!.coverImageUrl" [alt]="story()!.title" />
            } @else {
              <span class="hero-emoji">{{ story()!.coverEmoji || '📖' }}</span>
            }
          </div>
          <div class="hero-info">
            <span class="level-badge {{ story()!.level }}">{{ story()!.level }}</span>
            <h1>{{ story()!.title }}</h1>
            <p class="description">{{ story()!.description }}</p>
            @if (story()!.author) {
              <p class="author">by {{ story()!.author }}</p>
            }
          </div>
        </div>

        <div class="progress-bar-wrap">
          <div class="progress-bar-track">
            <div class="progress-bar-fill" [style.width.%]="completionPct()"></div>
          </div>
          <span class="progress-label">{{ completedCount() }}/{{ chapters().length }} completed</span>
        </div>

        <h2 class="section-title">Chapters</h2>
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
                      <span>Complete Chapter {{ i }} to unlock</span>
                    </div>
                  </div>
                </div>
              } @else {
                <a class="chapter-item" [routerLink]="['/chapters', ch.id]">
                  <div class="chapter-num" [class.done]="ch.completed">
                    @if (ch.completed) { ✓ } @else { {{ ch.chapterNumber }} }
                  </div>
                  <div class="chapter-info">
                    <div class="chapter-title">{{ ch.title }}</div>
                    <div class="chapter-meta">
                      <span>{{ ch.vocabularyCount }} words</span>
                      <span>{{ ch.comprehensionCount }} questions</span>
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
    .back-link { color: #2d6cdf; font-size: 0.9rem; display: inline-block; margin-bottom: 20px; }
    .story-hero { display: flex; gap: 24px; margin-bottom: 24px; align-items: flex-start; }
    .hero-cover {
      flex-shrink: 0; width: 120px; height: 120px;
      border-radius: 12px; overflow: hidden;
      background: linear-gradient(135deg, #e3f0ff 0%, #f3e5f5 100%);
      display: flex; align-items: center; justify-content: center;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .hero-emoji { font-size: 3rem; }
    .hero-info { flex: 1; }
    h1 { font-size: 1.5rem; margin: 8px 0 6px; }
    .description { color: #555; font-size: 0.9rem; margin-bottom: 6px; }
    .author { color: #888; font-size: 0.85rem; }

    .progress-bar-wrap {
      display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
    }
    .progress-bar-track {
      flex: 1; height: 8px; background: #e8e8e8; border-radius: 4px; overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%; background: #2d6cdf; border-radius: 4px;
      transition: width 0.4s ease;
    }
    .progress-label { font-size: 0.8rem; color: #888; white-space: nowrap; }

    .section-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 12px; }
    .loading { color: #888; padding: 24px 0; }
    .chapter-list { display: flex; flex-direction: column; gap: 10px; }

    .chapter-item {
      display: flex; align-items: center; gap: 16px;
      background: #fff; border: 1px solid #e8e8e8; border-radius: 10px;
      padding: 14px 16px;
      transition: background 0.15s, box-shadow 0.15s;
      &:not(.locked) {
        cursor: pointer;
        &:hover { background: #f8f9ff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
      }
      &.locked { opacity: 0.5; cursor: default; background: #fafafa; }
    }
    .chapter-num {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      background: #e8f0fe; color: #2d6cdf;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.9rem;
      &.done { background: #e8f5e9; color: #2e7d32; }
    }
    .locked-num {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      background: #f0f0f0;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem;
    }
    .chapter-info { flex: 1; }
    .chapter-title { font-weight: 600; font-size: 0.95rem; }
    .chapter-meta { display: flex; gap: 12px; font-size: 0.8rem; color: #888; margin-top: 3px; }
    .chapter-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .stars { font-size: 0.95rem; }
    .score-text { font-size: 0.75rem; color: #888; }
    .arrow { color: #aaa; font-size: 1.2rem; }
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
}
