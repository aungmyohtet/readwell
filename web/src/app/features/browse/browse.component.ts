import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoryService } from '../../core/services/story.service';
import { Story } from '../../core/models/story.model';

interface LastChapter {
  chapterId: string;
  storyId: string;
  chapterNumber: number;
  chapterTitle: string;
}

const LEVELS = ['All', 'A2', 'B1', 'B2'] as const;

@Component({
  selector: 'app-browse',
  imports: [RouterLink],
  template: `
    <div class="container">
      <section class="browse-hero section-card">
        <div class="hero-copy">
          <span class="eyebrow">English Through Story Worlds</span>
          <h1 class="page-title">A reading app that teaches grammar in context, not in isolation.</h1>
          <p class="page-subtitle">
            Build vocabulary, notice grammar patterns inside real paragraphs, and finish each chapter with retrieval-based quizzes.
          </p>

          <div class="hero-actions">
            @if (lastChapter()) {
              <a class="btn btn-primary" [routerLink]="['/chapters', lastChapter()!.chapterId]">
                Resume Chapter {{ lastChapter()!.chapterNumber }}
              </a>
            }
            <button class="btn btn-secondary" (click)="scrollToLibrary()">Explore the library</button>
          </div>

          <div class="hero-principles">
            <div class="principle-pill">Notice grammar in authentic lines</div>
            <div class="principle-pill">Tap vocabulary in the story itself</div>
            <div class="principle-pill">Review with immediate quiz feedback</div>
          </div>
        </div>

        <div class="hero-panel card">
          <div class="hero-stat">
            <span class="stat-value">{{ stories().length || '...' }}</span>
            <span class="stat-label">Story paths</span>
          </div>
          <div class="hero-stat">
            <span class="stat-value">{{ totalChapters() || '...' }}</span>
            <span class="stat-label">Chapters ready</span>
          </div>
          <div class="hero-stat">
            <span class="stat-value">3</span>
            <span class="stat-label">CEFR bands</span>
          </div>

          @if (lastChapter()) {
            <a class="continue-banner" [routerLink]="['/chapters', lastChapter()!.chapterId]">
              <span class="continue-icon">▶</span>
              <div class="continue-text">
                <span class="continue-label">Continue reading</span>
                <span class="continue-chapter">Chapter {{ lastChapter()!.chapterNumber }} · {{ lastChapter()!.chapterTitle }}</span>
              </div>
            </a>
          } @else {
            <div class="coach-note">
              <strong>Best first step</strong>
              <p>Start with an A2 or B1 story, finish one chapter, then use the progress view to track your growth.</p>
            </div>
          }
        </div>
      </section>

      <section id="library" class="library-section">
        <div class="library-header">
          <div>
            <span class="eyebrow">Library</span>
            <h2 class="library-title">Choose a level, then enter a story world.</h2>
            <p class="library-guidance">A2 builds confidence, B1 deepens inference, and B2 focuses on nuance and style.</p>
          </div>

          <div class="level-tabs">
            @for (lvl of levels; track lvl) {
              <button
                class="tab"
                [class.active]="selectedLevel() === lvl"
                (click)="selectLevel(lvl)"
              >{{ lvl }}</button>
            }
          </div>
        </div>

        @if (loading()) {
          <div class="empty-state section-card">
            <div class="empty-icon">⏳</div>
            <h3>Loading stories...</h3>
            <p>The library is being prepared.</p>
          </div>
        } @else if (displayedStories().length === 0) {
          <div class="empty-state section-card">
            <div class="empty-icon">📚</div>
            <h3>No stories in this level yet</h3>
            <p>Choose another CEFR band or add new story content to expand the path.</p>
          </div>
        } @else {
          <div class="story-grid">
            @for (story of displayedStories(); track story.id) {
              <a class="story-card" [routerLink]="['/stories', story.id]">
                <div class="story-glow"></div>
                <div class="cover">
                  @if (story.coverImageUrl) {
                    <img [src]="story.coverImageUrl" [alt]="story.title" />
                  } @else {
                    <span class="cover-emoji">{{ story.coverEmoji || '📖' }}</span>
                  }
                </div>

                <div class="story-info">
                  <div class="story-header">
                    <span class="level-badge {{ story.level }}">{{ story.level }}</span>
                    <span class="chapter-count">{{ story.totalChapters }} chapters</span>
                  </div>

                  <h3>{{ story.title }}</h3>
                  <p class="description">{{ story.description }}</p>

                  <div class="story-footer">
                    <div class="meta-stack">
                      <span class="meta-line">Interactive reading, grammar noticing, and quiz recall</span>
                      @if (story.tags.length) {
                        <div class="tags">
                          @for (tag of story.tags.slice(0, 3); track tag) {
                            <span class="tag">{{ tag }}</span>
                          }
                        </div>
                      }
                    </div>
                    <span class="story-arrow">→</span>
                  </div>
                </div>
              </a>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [``],
})
export class BrowseComponent implements OnInit {
  levels = LEVELS;
  selectedLevel = signal<string>('All');
  stories = signal<Story[]>([]);
  displayedStories = computed(() => {
    const selectedLevel = this.selectedLevel();
    const stories = this.stories();
    if (selectedLevel === 'All') return stories;
    return stories.filter((story) => story.level === selectedLevel);
  });
  loading = signal(false);
  lastChapter = signal<LastChapter | null>(null);

  constructor(private storyService: StoryService) {}

  ngOnInit() {
    this.loadLastChapter();
    this.load();
  }

  private loadLastChapter() {
    try {
      const raw = localStorage.getItem('lastChapter');
      if (raw) this.lastChapter.set(JSON.parse(raw));
    } catch {
      // ignore
    }
  }

  scrollToLibrary() {
    document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' });
  }

  selectLevel(level: string) {
    this.selectedLevel.set(level);
  }

  private load() {
    this.loading.set(true);
    this.storyService.getStories().subscribe({
      next: (data) => { this.stories.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  totalChapters(): number {
    return this.stories().reduce((sum, story) => sum + story.totalChapters, 0);
  }

  storyCountFor(level: Story['level']): number {
    return this.stories().filter((story) => story.level === level).length;
  }
}
