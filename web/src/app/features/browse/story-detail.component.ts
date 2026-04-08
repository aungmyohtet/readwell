import { Component, OnInit, signal, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoryService } from '../../core/services/story.service';
import { Story, ChapterSummary } from '../../core/models/story.model';

@Component({
  selector: 'app-story-detail',
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="story-detail-shell">
        @if (story()) {
          <section class="story-page-header card">
            <div class="page-header-nav">
              <a routerLink="/browse" class="back-link">← Back to Browse</a>
              <span class="page-context">Story overview</span>
            </div>
            <div class="page-header-meta">
              <span class="meta-pill">{{ story()!.level }} path</span>
              <span class="meta-pill">{{ chapters().length }} chapters</span>
              <span class="meta-pill">Focused study layout</span>
            </div>
          </section>

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

              <div class="hero-actions">
                @if (primaryChapter()) {
                  <a class="btn btn-primary" [routerLink]="['/chapters', primaryChapter()!.id]">{{ primaryChapterCta() }}</a>
                }
                <a class="btn btn-secondary" routerLink="/progress">View progress</a>
              </div>

              <div class="story-highlights">
                <div class="highlight-chip">
                  <strong>{{ estimatedStoryMinutes() }}</strong>
                  <span>Estimated study time</span>
                </div>
                <div class="highlight-chip">
                  <strong>{{ completedCount() === 0 ? 'Fresh start' : 'Pick up next' }}</strong>
                  <span>{{ nextStepSummary() }}</span>
                </div>
              </div>

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
                      <div class="chapter-status-row">
                        <span class="chapter-status" [class.review]="ch.completed" [class.current]="primaryChapter()?.id === ch.id && !ch.completed">{{ chapterStateLabel(i, ch) }}</span>
                        <span class="chapter-time">{{ chapterStudyMinutes(ch) }} min study</span>
                      </div>
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
                        <span class="chapter-cta">{{ primaryChapter()?.id === ch.id ? 'Start now' : 'Open' }}</span>
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
    </div>
  `,
  styles: [``],
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

  primaryChapter(): ChapterSummary | null {
    const chapters = this.chapters();
    return chapters.find((chapter, index) => !this.isLocked(index) && !chapter.completed) ?? chapters[0] ?? null;
  }

  primaryChapterCta(): string {
    const chapter = this.primaryChapter();
    if (!chapter) return 'Start reading';
    if (this.completedCount() === 0) return `Start Chapter ${chapter.chapterNumber}`;
    if (chapter.completed) return `Review Chapter ${chapter.chapterNumber}`;
    return `Continue Chapter ${chapter.chapterNumber}`;
  }

  estimatedStoryMinutes(): string {
    const chapters = this.chapters();
    if (!chapters.length) return '0 min';
    const total = chapters.reduce((sum, chapter) => sum + this.chapterStudyMinutes(chapter), 0);
    return `${Math.max(8, total - chapters.length)}-${total + chapters.length} min`;
  }

  chapterStudyMinutes(chapter: ChapterSummary): number {
    return Math.max(6, Math.round(chapter.vocabularyCount * 0.9 + chapter.comprehensionCount * 1.5 + 2));
  }

  nextStepSummary(): string {
    const chapter = this.primaryChapter();
    if (!chapter) return 'Choose a chapter and begin.';
    if (this.completedCount() === 0) return 'Start the opening chapter and build the story world first.';
    return `Chapter ${chapter.chapterNumber} is the clearest next step.`;
  }

  chapterStateLabel(index: number, chapter: ChapterSummary): string {
    if (chapter.completed) return 'Completed';
    if (this.primaryChapter()?.id === chapter.id) return 'Ready now';
    if (!this.isLocked(index)) return 'Available';
    return 'Locked';
  }
}
