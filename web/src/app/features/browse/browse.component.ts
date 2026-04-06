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

      <!-- Continue reading banner -->
      @if (lastChapter()) {
        <a class="continue-banner" [routerLink]="['/chapters', lastChapter()!.chapterId]">
          <span class="continue-icon">▶</span>
          <div class="continue-text">
            <span class="continue-label">Continue reading</span>
            <span class="continue-chapter">Chapter {{ lastChapter()!.chapterNumber }} — {{ lastChapter()!.chapterTitle }}</span>
          </div>
          <span class="continue-arrow">→</span>
        </a>
      }

      <h1 class="page-title">Stories</h1>
      <p class="page-subtitle">Choose a story to start reading</p>

      <div class="level-tabs">
        @for (lvl of levels; track lvl) {
          <button
            class="tab"
            [class.active]="selectedLevel() === lvl"
            (click)="selectLevel(lvl)"
          >{{ lvl }}</button>
        }
      </div>

      @if (loading()) {
        <div class="loading">Loading stories...</div>
      } @else if (stories().length === 0) {
        <div class="empty">No stories available for this level yet.</div>
      } @else {
        <div class="story-grid">
          @for (story of stories(); track story.id) {
            <a class="story-card" [routerLink]="['/stories', story.id]">
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
                  <span class="chapter-count">{{ story.totalChapters }} ch</span>
                </div>
                <h3>{{ story.title }}</h3>
                <p class="description">{{ story.description }}</p>
                @if (story.tags?.length) {
                  <div class="tags">
                    @for (tag of story.tags.slice(0, 3); track tag) {
                      <span class="tag">{{ tag }}</span>
                    }
                  </div>
                }
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .continue-banner {
      display: flex; align-items: center; gap: 14px;
      background: linear-gradient(135deg, #e8f0fe 0%, #f3e5f5 100%);
      border: 1px solid #c5d8fb; border-radius: 12px;
      padding: 14px 18px; margin-bottom: 28px; cursor: pointer;
      transition: box-shadow 0.15s;
      &:hover { box-shadow: 0 4px 14px rgba(45, 108, 223, 0.15); }
    }
    .continue-icon {
      width: 36px; height: 36px; border-radius: 50%;
      background: #2d6cdf; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.85rem; flex-shrink: 0;
    }
    .continue-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .continue-label { font-size: 0.75rem; font-weight: 700; color: #2d6cdf; text-transform: uppercase; letter-spacing: 0.5px; }
    .continue-chapter { font-size: 0.9rem; font-weight: 600; color: #222; }
    .continue-arrow { color: #2d6cdf; font-size: 1.1rem; }

    .level-tabs { display: flex; gap: 8px; margin-bottom: 24px; }
    .tab {
      padding: 7px 18px; border: 1px solid #ddd; border-radius: 20px;
      background: #fff; cursor: pointer; font-size: 0.9rem; color: #555;
      transition: all 0.15s;
      &.active { background: #2d6cdf; color: #fff; border-color: #2d6cdf; }
      &:hover:not(.active) { background: #f0f4ff; }
    }
    .loading, .empty { text-align: center; padding: 48px; color: #888; }
    .story-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    .story-card {
      display: block; background: #fff; border-radius: 14px;
      border: 1px solid #e8e8e8; overflow: hidden;
      transition: transform 0.15s, box-shadow 0.15s;
      &:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
    }
    .cover {
      height: 140px;
      background: linear-gradient(135deg, #e3f0ff 0%, #f3e5f5 100%);
      display: flex; align-items: center; justify-content: center; overflow: hidden;
      img { width: 100%; height: 100%; object-fit: cover; }
    }
    .cover-emoji { font-size: 3.5rem; }
    .story-info { padding: 16px; }
    .story-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .chapter-count { font-size: 0.8rem; color: #888; }
    h3 { font-size: 1rem; font-weight: 700; margin-bottom: 6px; }
    .description {
      font-size: 0.85rem; color: #666; line-height: 1.4; margin-bottom: 10px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .tag { background: #f0f0f0; color: #666; font-size: 0.75rem; padding: 2px 8px; border-radius: 10px; }
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
}
