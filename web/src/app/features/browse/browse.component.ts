import { Component, OnInit, signal } from '@angular/core';
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
            <a class="btn btn-secondary" href="#library">Explore the library</a>
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
        } @else if (stories().length === 0) {
          <div class="empty-state section-card">
            <div class="empty-icon">📚</div>
            <h3>No stories in this level yet</h3>
            <p>Choose another CEFR band or add new story content to expand the path.</p>
          </div>
        } @else {
          <div class="story-grid">
            @for (story of stories(); track story.id) {
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
  styles: [`
    .browse-hero {
      display: grid;
      grid-template-columns: minmax(0, 1.55fr) minmax(18rem, 0.95fr);
      gap: 1.4rem;
      padding: 1.6rem;
      margin-bottom: 2rem;
      position: relative;
      overflow: hidden;
    }
    .browse-hero::after {
      content: '';
      position: absolute;
      inset: auto -10% -35% 30%;
      height: 14rem;
      background: radial-gradient(circle, rgba(15, 118, 110, 0.15), transparent 60%);
      pointer-events: none;
    }
    .hero-copy, .hero-panel { position: relative; z-index: 1; }
    .hero-actions, .hero-principles { display: flex; flex-wrap: wrap; gap: 0.8rem; }
    .hero-actions { margin-bottom: 1.25rem; }
    .hero-principles { gap: 0.6rem; }
    .principle-pill {
      padding: 0.55rem 0.85rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(29, 42, 40, 0.08);
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--ink);
    }
    .hero-panel {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.9rem;
      align-content: start;
    }
    .hero-stat {
      padding: 1rem;
      border-radius: 1.2rem;
      background: rgba(255, 255, 255, 0.64);
      border: 1px solid rgba(29, 42, 40, 0.08);
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .stat-value { font-size: 1.7rem; font-weight: 800; line-height: 1; }
    .stat-label { font-size: 0.8rem; color: var(--muted); }
    .continue-banner,
    .coach-note { grid-column: 1 / -1; border-radius: 1.3rem; }
    .continue-banner {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1rem;
      background: linear-gradient(135deg, rgba(15, 118, 110, 0.14), rgba(245, 158, 11, 0.14));
      border: 1px solid rgba(15, 118, 110, 0.15);
      transition: transform 0.18s ease, box-shadow 0.18s ease;
    }
    .continue-banner:hover { transform: translateY(-1px); box-shadow: 0 16px 24px rgba(29, 42, 40, 0.08); }
    .continue-icon {
      width: 2.8rem;
      height: 2.8rem;
      border-radius: 1rem;
      background: linear-gradient(135deg, var(--accent) 0%, #14532d 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .continue-text { display: flex; flex-direction: column; gap: 0.12rem; }
    .continue-label { font-size: 0.74rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent-strong); }
    .continue-chapter { font-size: 0.94rem; font-weight: 700; }
    .coach-note {
      padding: 1rem;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(29, 42, 40, 0.08);
    }
    .coach-note strong { display: block; margin-bottom: 0.35rem; }
    .coach-note p { color: var(--muted); font-size: 0.9rem; }

    .library-section { display: flex; flex-direction: column; gap: 1.2rem; }
    .library-header {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .library-title { font-size: clamp(1.5rem, 2.6vw, 2.2rem); }
    .level-tabs { display: flex; gap: 0.55rem; flex-wrap: wrap; }
    .tab {
      padding: 0.7rem 1rem;
      border: 1px solid rgba(29, 42, 40, 0.12);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.72);
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 800;
      color: var(--ink);
      transition: all 0.18s ease;
    }
    .tab.active {
      background: linear-gradient(135deg, var(--accent) 0%, #14532d 100%);
      color: #fff;
      border-color: transparent;
      box-shadow: 0 12px 24px rgba(15, 118, 110, 0.2);
    }
    .tab:hover:not(.active) { background: #fffdf9; }
    .empty-state { text-align: center; padding: 2rem 1.5rem; }
    .empty-icon { font-size: 2.2rem; margin-bottom: 0.5rem; }
    .empty-state h3 { font-size: 1.15rem; margin-bottom: 0.4rem; }
    .empty-state p { color: var(--muted); }

    .story-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(17.5rem, 1fr));
      gap: 1.1rem;
    }
    .story-card {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 100%;
      border-radius: 1.5rem;
      border: 1px solid rgba(29, 42, 40, 0.08);
      background: rgba(255, 252, 247, 0.84);
      overflow: hidden;
      box-shadow: 0 18px 34px rgba(29, 42, 40, 0.08);
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }
    .story-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 24px 40px rgba(29, 42, 40, 0.12);
      border-color: rgba(15, 118, 110, 0.2);
    }
    .story-glow {
      position: absolute;
      inset: auto -10% 60% 35%;
      height: 9rem;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.16), transparent 60%);
      pointer-events: none;
    }
    .cover {
      height: 11rem;
      background: linear-gradient(135deg, rgba(15, 118, 110, 0.16), rgba(245, 158, 11, 0.14));
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .cover img { width: 100%; height: 100%; object-fit: cover; }
    .cover-emoji { font-size: 4rem; }
    .story-info {
      display: flex;
      flex: 1;
      flex-direction: column;
      padding: 1.1rem;
      gap: 0.8rem;
    }
    .story-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .chapter-count { font-size: 0.78rem; font-weight: 700; color: var(--muted); }
    h3 { font-size: 1.18rem; }
    .description {
      color: var(--muted);
      font-size: 0.9rem;
      line-height: 1.55;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .story-footer {
      margin-top: auto;
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 0.8rem;
    }
    .meta-stack { display: flex; flex-direction: column; gap: 0.5rem; }
    .meta-line { font-size: 0.8rem; color: var(--muted); }
    .tags { display: flex; flex-wrap: wrap; gap: 0.45rem; }
    .tag {
      padding: 0.26rem 0.6rem;
      border-radius: 999px;
      background: rgba(29, 42, 40, 0.06);
      font-size: 0.73rem;
      font-weight: 700;
      color: var(--ink);
    }
    .story-arrow { font-size: 1.3rem; color: var(--accent-strong); font-weight: 800; }

    @media (max-width: 920px) {
      .browse-hero { grid-template-columns: 1fr; }
      .hero-panel { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }

    @media (max-width: 640px) {
      .browse-hero { padding: 1.15rem; }
      .hero-panel { grid-template-columns: 1fr; }
      .library-header { align-items: start; }
      .story-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class BrowseComponent implements OnInit {
  levels = LEVELS;
  selectedLevel = signal<string>('All');
  stories = signal<Story[]>([]);
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

  selectLevel(level: string) {
    this.selectedLevel.set(level);
    this.load();
  }

  private load() {
    this.loading.set(true);
    const level = this.selectedLevel() === 'All' ? undefined : this.selectedLevel();
    this.storyService.getStories(level).subscribe({
      next: (data) => { this.stories.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  totalChapters(): number {
    return this.stories().reduce((sum, story) => sum + story.totalChapters, 0);
  }
}
