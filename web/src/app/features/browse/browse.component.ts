import { Component, HostListener, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { StoryService } from '../../core/services/story.service';
import { ChapterSummary, Story } from '../../core/models/story.model';
import { ProgressService } from '../../core/services/progress.service';
import { ProgressInsights, ProgressRecord } from '../../core/models/progress.model';

interface LastChapter {
  chapterId: string;
  storyId: string;
  chapterNumber: number;
  chapterTitle: string;
}

interface BrowseAction {
  label: string;
  title: string;
  detail: string;
  cta: string;
  route: string[];
}

const LEVELS = ['All', 'A2', 'B1', 'B2'] as const;
const STUDY_GUIDE_STORAGE_KEY = 'browseStudyGuideSeen';

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
            @if (primaryAction().route[0] !== '/browse') {
              <a class="btn btn-primary" [routerLink]="primaryAction().route">
                {{ primaryAction().cta }}
              </a>
            }
            <button class="btn btn-warm" (click)="scrollToLibrary()">Explore the library</button>
          </div>

          <button class="hero-toggle" (click)="openHomeTips('manual')">
            <span class="hero-toggle-icon">?</span>
            <span>How ReadWell works</span>
          </button>
        </div>

        <div class="hero-panel card">
          <div class="hero-next-step">
            <div class="hero-next-topline">
              <span class="continue-label">{{ primaryAction().label }}</span>
              @if (priorityReview()) {
                <span class="review-stage-pill" [class.stage-rescue]="priorityReview()!.reviewStage === 'rescue'" [class.stage-now]="priorityReview()!.reviewStage === 'due-now'" [class.stage-soon]="priorityReview()!.reviewStage === 'due-soon'">{{ browseReviewStageLabel(priorityReview()!) }}</span>
              }
              @if (reviewAlertCount() > 0) {
                <span class="notification-badge notification-badge-soft">{{ reviewAlertLabel() }}</span>
              }
            </div>
            <h2 class="hero-next-title">{{ primaryAction().title }}</h2>
            <p class="hero-next-copy">{{ primaryAction().detail }}</p>

            <div class="hero-next-actions">
              <a class="btn btn-primary" [routerLink]="primaryAction().route">{{ primaryAction().cta }}</a>
              @if (shouldShowResumeAction()) {
                <a class="btn btn-secondary" [routerLink]="['/chapters', lastChapter()!.chapterId]">Resume last chapter</a>
              }
            </div>
          </div>

          <div class="hero-stat-row">
            <div class="hero-stat">
              <span class="stat-value">{{ stories().length || '...' }}</span>
              <span class="stat-label">Story paths</span>
            </div>
            <div class="hero-stat">
              <span class="stat-value">{{ totalChapters() || '...' }}</span>
              <span class="stat-label">Chapters ready</span>
            </div>
            <div class="hero-stat">
              <span class="stat-value">{{ averageScorePct() }}%</span>
              <span class="stat-label">Average quiz score</span>
            </div>
          </div>
        </div>

      </section>

      @if (showHomeTips()) {
        <div class="guide-modal-backdrop" (click)="closeHomeTips()">
          <div class="guide-modal" (click)="$event.stopPropagation()">
            <div class="hero-study-guide card">
              <div class="guide-header">
                <div>
                  <span class="eyebrow">{{ guideMode() === 'onboarding' ? 'Welcome to ReadWell' : 'Study Guide' }}</span>
                  <h3 class="guide-title">Use one chapter as a full lesson, not just a text to finish.</h3>
                  <p class="guide-subtitle">
                    {{ guideMode() === 'onboarding'
                      ? 'This quick onboarding shows the reading routine that makes the app feel easiest and most effective from the first chapter.'
                      : 'ReadWell works best when learners move through one clear loop: preview, notice, retrieve, then review only where needed.' }}
                  </p>
                </div>

                <button class="guide-close" (click)="closeHomeTips()">Close</button>
              </div>

              <div class="guide-grid">
                <div class="guide-card-grid">
                  <div class="guide-card">
                    <div class="guide-card-topline">
                      <span class="guide-card-kicker">Words</span>
                      <span class="guide-card-number">01</span>
                    </div>
                    <strong class="guide-card-title">Preview the words first</strong>
                    <p class="guide-card-copy">Flip vocabulary cards before reading so the story feels lighter and faster to process.</p>
                  </div>

                  <div class="guide-card">
                    <div class="guide-card-topline">
                      <span class="guide-card-kicker">Pattern</span>
                      <span class="guide-card-number">02</span>
                    </div>
                    <strong class="guide-card-title">Notice the grammar in context</strong>
                    <p class="guide-card-copy">Use the grammar view to spot the pattern, then return to the story and see it working in real lines.</p>
                  </div>

                  <div class="guide-card">
                    <div class="guide-card-topline">
                      <span class="guide-card-kicker">Recall</span>
                      <span class="guide-card-number">03</span>
                    </div>
                    <strong class="guide-card-title">Use the quiz as retrieval</strong>
                    <p class="guide-card-copy">Finish with the quiz, then review missed answers inside the story instead of moving on too quickly.</p>
                  </div>

                  <div class="guide-card guide-card-accent">
                    <div class="guide-card-topline">
                      <span class="guide-card-kicker">{{ guideInsightKicker() }}</span>
                      <span class="guide-card-number">04</span>
                    </div>
                    <strong class="guide-card-title">{{ guideInsightTitle() }}</strong>
                    <p class="guide-card-copy">{{ guideInsightSummary() }}</p>
                    <span class="guide-card-meta">{{ guideInsightMeta() }}</span>
                  </div>
                </div>
              </div>

              <div class="guide-footer">
                <span class="guide-footer-copy">{{ guideMode() === 'onboarding' ? 'You will only see this automatically once.' : 'Reopen this anytime from the homepage.' }}</span>
                <div class="guide-footer-actions">
                  <button class="btn btn-secondary" (click)="closeHomeTips()">Close guide</button>
                  <button class="btn btn-primary" (click)="closeHomeTips(); scrollToLibrary()">Go to library</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

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

        <div class="path-overview">
          @for (lvl of ['A2', 'B1', 'B2']; track lvl) {
            <button class="path-card" [class.active]="selectedLevel() === lvl" (click)="selectLevel(lvl)">
              <div class="path-topline">
                <span class="level-badge {{ lvl }}">{{ lvl }}</span>
                <span class="path-count">{{ storyCountFor(levelAsStoryLevel(lvl)) }} stories</span>
              </div>
              <strong>{{ levelHeading(lvl) }}</strong>
              <p>{{ levelDescription(lvl) }}</p>
            </button>
          }
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
              <article class="story-card">
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
                    <div class="story-header-meta">
                      @if (storyReviewStage(story.id)) {
                        <span class="review-stage-pill" [class.stage-rescue]="storyReviewStage(story.id) === 'rescue'" [class.stage-now]="storyReviewStage(story.id) === 'due-now'" [class.stage-soon]="storyReviewStage(story.id) === 'due-soon'">{{ storyReviewStageLabel(story.id) }}</span>
                      }
                      @if (hasStoryProgress(story.id)) {
                        <span class="achievement-badge" [class.perfect]="storyBadgeClass(story.id) === 'perfect'" [class.mastered]="storyBadgeClass(story.id) === 'mastered'" [class.close]="storyBadgeClass(story.id) === 'close'" [class.review]="storyBadgeClass(story.id) === 'review'">{{ storyBadgeLabel(story.id) }}</span>
                      }
                      <span class="chapter-count">{{ story.totalChapters }} chapters</span>
                    </div>
                  </div>

                  <a class="story-title-link" [routerLink]="['/stories', story.id]">
                    <h3>{{ story.title }}</h3>
                  </a>
                  <p class="description">{{ story.description }}</p>

                  @if (hasStoryProgress(story.id)) {
                    <div class="story-progress-snapshot">
                      <div class="snapshot-item">
                        <strong>{{ completedChaptersForStory(story.id) }}/{{ story.totalChapters }}</strong>
                        <span>chapters done</span>
                      </div>
                      <div class="snapshot-item">
                        <strong>{{ bestScorePctForStory(story.id) }}%</strong>
                        <span>best result</span>
                      </div>
                    </div>
                  }

                  <div class="story-footer">
                    <div class="meta-stack">
                      <span class="meta-line">{{ storyMetaLine(story) }}</span>
                      @if (story.tags.length) {
                        <div class="tags">
                          @for (tag of story.tags.slice(0, 3); track tag) {
                            <span class="tag">{{ tag }}</span>
                          }
                        </div>
                      }
                    </div>
                    <div class="story-action-row">
                      <a class="story-action-link" [routerLink]="['/stories', story.id]">Open story</a>
                      @if (storyUrgentReview(story.id)) {
                        <a class="story-action-link story-action-link-accent" [routerLink]="['/chapters', storyUrgentReview(story.id)!.chapterId]">{{ storyReviewCta(story.id) }}</a>
                      }
                    </div>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      </section>
    </div>
  `,
})
export class BrowseComponent implements OnInit {
  levels = LEVELS;
  selectedLevel = signal<string>('All');
  stories = signal<Story[]>([]);
  storyChapters = signal<Record<string, ChapterSummary[]>>({});
  displayedStories = computed(() => {
    const selectedLevel = this.selectedLevel();
    const stories = this.stories();
    if (selectedLevel === 'All') return stories;
    return stories.filter((story) => story.level === selectedLevel);
  });
  loading = signal(false);
  lastChapter = signal<LastChapter | null>(null);
  history = signal<ProgressRecord[]>([]);
  insights = signal<ProgressInsights | null>(null);
  showHomeTips = signal(false);
  guideMode = signal<'onboarding' | 'manual'>('manual');

  constructor(
    private storyService: StoryService,
    private progressService: ProgressService,
  ) {}

  ngOnInit() {
    this.loadLastChapter();
    this.initializeStudyGuide();
    this.load();
    this.loadProgressContext();
  }

  private initializeStudyGuide() {
    try {
      if (!localStorage.getItem(STUDY_GUIDE_STORAGE_KEY)) {
        localStorage.setItem(STUDY_GUIDE_STORAGE_KEY, 'seen');
        this.guideMode.set('onboarding');
        this.showHomeTips.set(true);
      }
    } catch {
      this.guideMode.set('onboarding');
      this.showHomeTips.set(true);
    }
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

  openHomeTips(mode: 'onboarding' | 'manual') {
    this.guideMode.set(mode);
    this.showHomeTips.set(true);
  }

  closeHomeTips() {
    this.showHomeTips.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.showHomeTips()) {
      this.closeHomeTips();
    }
  }

  private load() {
    this.loading.set(true);
    this.storyService.getStories().subscribe({
      next: (data) => {
        this.stories.set(data);
        this.loadStoryChapters(data);
        this.loading.set(false);
      },
      error: () => {
        this.storyChapters.set({});
        this.loading.set(false);
      },
    });
  }

  private loadStoryChapters(stories: Story[]) {
    if (!stories.length) {
      this.storyChapters.set({});
      return;
    }

    forkJoin(
      stories.map((story) =>
        this.storyService.getChapters(story.id).pipe(
          map((chapters) => ({ storyId: story.id, chapters })),
          catchError(() => of({ storyId: story.id, chapters: [] as ChapterSummary[] })),
        ),
      ),
    ).subscribe((results) => {
      const chaptersByStory = results.reduce<Record<string, ChapterSummary[]>>((acc, result) => {
        acc[result.storyId] = result.chapters;
        return acc;
      }, {});

      this.storyChapters.set(chaptersByStory);
    });
  }

  private loadProgressContext() {
    forkJoin({
      history: this.progressService.getHistory(),
      insights: this.progressService.getInsights(),
    }).subscribe({
      next: ({ history, insights }) => {
        this.history.set(history);
        this.insights.set(insights);
      },
      error: () => {
        this.history.set([]);
        this.insights.set(null);
      },
    });
  }

  totalChapters(): number {
    return this.stories().reduce((sum, story) => sum + story.totalChapters, 0);
  }

  reviewAlertCount(): number {
    return this.insights()?.reviewQueue.length ?? 0;
  }

  reviewAlertLabel(): string {
    const count = this.reviewAlertCount();
    return `${count} review ${count === 1 ? 'chapter' : 'chapters'}`;
  }

  priorityReview(): ProgressInsights['reviewQueue'][number] | null {
    return this.insights()?.reviewQueue[0] ?? null;
  }

  urgentPriorityReview(): ProgressInsights['reviewQueue'][number] | null {
    return this.insights()?.reviewQueue.find(
      (review) => review.reviewStage === 'rescue' || review.reviewStage === 'due-now',
    ) ?? null;
  }

  browseReviewStageLabel(review: ProgressInsights['reviewQueue'][number]): string {
    switch (review.reviewStage) {
      case 'rescue':
        return 'Rescue now';
      case 'due-now':
        return 'Due now';
      case 'due-soon':
        return this.reviewDueLabel(review.nextReviewAt);
      default:
        return 'Review next';
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

  storyCountFor(level: Story['level']): number {
    return this.stories().filter((story) => story.level === level).length;
  }

  hasStoryProgress(storyId: string): boolean {
    return this.history().some((record) => record.storyId === storyId);
  }

  completedChaptersForStory(storyId: string): number {
    return new Set(this.history().filter((record) => record.storyId === storyId).map((record) => record.chapterId)).size;
  }

  nextStudyChapter(storyId: string): ChapterSummary | null {
    const chapters = this.storyChapters()[storyId] ?? [];
    return chapters.find((chapter, index) => !this.isChapterLocked(chapters, index) && !chapter.completed) ?? null;
  }

  isChapterLocked(chapters: ChapterSummary[], index: number): boolean {
    if (index === 0) return false;
    return !chapters[index - 1]?.completed;
  }

  recommendedChapter(): ChapterSummary | null {
    const lastChapter = this.lastChapter();
    if (lastChapter) {
      const lastStoryNextChapter = this.nextStudyChapter(lastChapter.storyId);
      if (lastStoryNextChapter) return lastStoryNextChapter;
    }

    for (const story of this.stories()) {
      const nextChapter = this.nextStudyChapter(story.id);
      if (nextChapter) return nextChapter;
    }

    return null;
  }

  bestScorePctForStory(storyId: string): number {
    return this.history()
      .filter((record) => record.storyId === storyId)
      .reduce((best, record) => Math.max(best, Math.round((record.score / record.totalQuestions) * 100)), 0);
  }

  latestScorePctForStory(storyId: string): number {
    const latest = this.history().find((record) => record.storyId === storyId);
    if (!latest || !latest.totalQuestions) return 0;
    return Math.round((latest.score / latest.totalQuestions) * 100);
  }

  storyBadgeLabel(storyId: string): string {
    const pct = this.latestScorePctForStory(storyId);
    if (pct === 100) return 'Perfect';
    if (pct >= 80) return 'Mastered';
    if (pct >= 60) return 'Almost there';
    return 'Review';
  }

  storyBadgeClass(storyId: string): 'perfect' | 'mastered' | 'close' | 'review' {
    const pct = this.latestScorePctForStory(storyId);
    if (pct === 100) return 'perfect';
    if (pct >= 80) return 'mastered';
    if (pct >= 60) return 'close';
    return 'review';
  }

  storyReviewStage(storyId: string): 'rescue' | 'due-now' | 'due-soon' | null {
    const records = this.history().filter((record) => record.storyId === storyId && !!record.reviewStage);
    if (!records.length) return null;

    const strongest = records
      .slice()
      .sort((left, right) => this.reviewStagePriority(left.reviewStage) - this.reviewStagePriority(right.reviewStage))[0];

    return strongest?.reviewStage as 'rescue' | 'due-now' | 'due-soon' | null;
  }

  storyReviewStageLabel(storyId: string): string {
    const stage = this.storyReviewStage(storyId);
    switch (stage) {
      case 'rescue':
        return 'Rescue now';
      case 'due-now':
        return 'Due now';
      case 'due-soon':
        return this.storyReviewDueLine(storyId);
      default:
        return 'Review next';
    }
  }

  storyReviewDueLine = (storyId: string): string => {
    const nextDue = this.history()
      .filter((record) => record.storyId === storyId && record.reviewStage === 'due-soon' && !!record.nextReviewAt)
      .map((record) => new Date(record.nextReviewAt!))
      .sort((left, right) => left.getTime() - right.getTime())[0];

    if (!nextDue) return 'due soon';

    const now = new Date();
    const dayDiff = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (dayDiff <= 0) return 'now';
    if (dayDiff === 1) return 'tomorrow';
    return `in ${dayDiff} days`;
  };

  storyPriorityReview = (storyId: string): ProgressRecord | null => {
    const candidates = this.history()
      .filter((record) => record.storyId === storyId && !!record.reviewStage)
      .slice()
      .sort((left, right) => {
        const stageDiff = this.reviewStagePriority(left.reviewStage) - this.reviewStagePriority(right.reviewStage);
        if (stageDiff !== 0) return stageDiff;

        const leftTime = left.nextReviewAt ? new Date(left.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.nextReviewAt ? new Date(right.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      });

    return candidates[0] ?? null;
  };

  storyUrgentReview = (storyId: string): ProgressRecord | null => {
    return this.history()
      .filter(
        (record) =>
          record.storyId === storyId &&
          (record.reviewStage === 'rescue' || record.reviewStage === 'due-now'),
      )
      .slice()
      .sort((left, right) => {
        const stageDiff = this.reviewStagePriority(left.reviewStage) - this.reviewStagePriority(right.reviewStage);
        if (stageDiff !== 0) return stageDiff;

        const leftTime = left.nextReviewAt ? new Date(left.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.nextReviewAt ? new Date(right.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      })[0] ?? null;
  };

  storyReviewCta = (storyId: string): string => {
    const review = this.storyUrgentReview(storyId);
    if (!review) return 'Review next';

    switch (review.reviewStage) {
      case 'rescue':
        return `Rescue Ch ${review.chapterNumber}`;
      case 'due-now':
        return `Review Ch ${review.chapterNumber}`;
      case 'due-soon':
        return `Revisit Ch ${review.chapterNumber}`;
      default:
        return `Review Ch ${review.chapterNumber}`;
    }
  };

  reviewStagePriority = (stage?: string | null): number => {
    switch (stage) {
      case 'rescue':
        return 0;
      case 'due-now':
        return 1;
      case 'due-soon':
        return 2;
      default:
        return 3;
    }
  };

  storyMetaLine(story: Story): string {
    if (!this.hasStoryProgress(story.id)) {
      return 'Interactive reading, grammar noticing, and quiz recall';
    }

    const reviewStage = this.storyReviewStage(story.id);
    if (reviewStage === 'rescue') {
      return 'This story has a chapter that needs rescue now before the pattern slips further.';
    }

    if (reviewStage === 'due-now') {
      return 'A completed chapter in this story is due for review today.';
    }

    if (reviewStage === 'due-soon') {
      return `This story has review coming up ${this.storyReviewDueLine(story.id)}.`;
    }

    const completed = this.completedChaptersForStory(story.id);
    if (completed >= story.totalChapters) {
      return 'All chapters attempted. Revisit weaker spots or aim for stronger mastery.';
    }

    return `${completed} chapter${completed === 1 ? '' : 's'} completed. Keep the story path moving.`;
  }

  levelAsStoryLevel(level: string): Story['level'] {
    return level as Story['level'];
  }

  primaryAction(): BrowseAction {
    const review = this.urgentPriorityReview();
    if (review) {
      return {
        label: review.reviewStage === 'rescue' ? 'Rescue chapter' : review.reviewStage === 'due-now' ? 'Due today' : 'Due soon',
        title: `${this.browseReviewStageLabel(review)} in ${review.storyTitle}`,
        detail: `Chapter ${review.chapterNumber} is the most useful review right now. ${review.reason}`,
        cta: `Review Chapter ${review.chapterNumber}`,
        route: ['/chapters', review.chapterId],
      };
    }

    const recommendedChapter = this.recommendedChapter();
    if (recommendedChapter) {
      const story = this.stories().find((item) => item.id === recommendedChapter.storyId);
      const hasProgress = this.hasStoryProgress(recommendedChapter.storyId);
      return {
        label: hasProgress ? 'Continue learning' : 'Start your path',
        title: `${hasProgress ? 'Pick up' : 'Begin'} Chapter ${recommendedChapter.chapterNumber}`,
        detail: story
          ? `${recommendedChapter.title} is ready next in ${story.title}. Keep the story moving while the last chapter is still fresh.`
          : 'A clear next chapter is ready for you.',
        cta: hasProgress ? 'Continue chapter' : 'Start chapter',
        route: ['/chapters', recommendedChapter.id],
      };
    }

    const lastChapter = this.lastChapter();
    if (lastChapter) {
      return {
        label: 'Continue learning',
        title: `Pick up Chapter ${lastChapter.chapterNumber}`,
        detail: `Return to ${lastChapter.chapterTitle} and keep the story active in memory before too much fades.`,
        cta: 'Continue chapter',
        route: ['/chapters', lastChapter.chapterId],
      };
    }

    const starter = this.stories()[0];
    if (starter) {
      return {
        label: 'Start your path',
        title: `Begin with ${starter.title}`,
        detail: 'One finished chapter is enough to create useful progress data and make the next recommendation smarter.',
        cta: 'Open story',
        route: ['/stories', starter.id],
      };
    }

    return {
      label: 'Library warming up',
      title: 'Stories are loading',
      detail: 'Once content is ready, choose a level and enter a story world that matches your confidence.',
      cta: 'Explore the library',
      route: ['/browse'],
    };
  }

  shouldShowResumeAction(): boolean {
    const lastChapter = this.lastChapter();
    if (!lastChapter) return false;
    const [route, chapterId] = this.primaryAction().route;
    return route !== '/chapters' || chapterId !== lastChapter.chapterId;
  }

  averageScorePct(): number {
    const history = this.history();
    if (!history.length) return 0;
    const total = history.reduce((sum, item) => sum + (item.score / item.totalQuestions) * 100, 0);
    return Math.round(total / history.length);
  }

  showProgressSignals(): boolean {
    if (this.guideMode() !== 'manual') return false;
    return this.history().length > 0 && (this.insights()?.weakAreas.length ?? 0) > 0;
  }

  guideInsightKicker(): string {
    return this.showProgressSignals() ? 'Signals' : 'Review';
  }

  guideInsightTitle(): string {
    return this.showProgressSignals()
      ? 'Use your progress to decide what to revisit'
      : 'Know when to review and when to move on';
  }

  guideInsightSummary(): string {
    if (this.showProgressSignals()) {
      return `${this.weakestAreaLabel()}. ${this.weakestAreaDetail()}`;
    }

    return 'After the quiz, move on when the score is strong. Review only the unstable parts, and turn highlights on when meaning starts to slip.';
  }

  guideInsightMeta(): string {
    if (this.showProgressSignals()) {
      return this.momentumLabel();
    }

    return 'Read for meaning first, then add support with purpose.';
  }

  weakestAreaLabel(): string {
    const weakest = this.insights()?.weakAreas[0];
    return weakest ? `Revisit ${weakest.grammarRule}` : 'Best first step';
  }

  weakestAreaDetail(): string {
    const weakest = this.insights()?.weakAreas[0];
    if (!weakest) {
      return 'Finish one chapter, then use the progress view to see where review will matter most.';
    }
    return `${weakest.missCount} missed answers across ${weakest.chapterCount} chapter${weakest.chapterCount === 1 ? '' : 's'}.`;
  }

  momentumLabel(): string {
    const count = this.history().length;
    if (!count) return 'Momentum starts small';
    if (count === 1) return 'You have started the habit';
    return 'Recent momentum';
  }

  momentumDetail(): string {
    const count = this.history().length;
    if (!count) return 'Complete one chapter to unlock smarter review suggestions and progress trends.';
    if (count === 1) return 'One chapter finished. The next chapter will make the progress dashboard more useful.';
    return `${count} chapters completed so far. Alternate new reading with review to keep gains stable.`;
  }

  levelHeading(level: string): string {
    switch (level) {
      case 'A2':
        return 'Build confidence with clear, high-frequency English';
      case 'B1':
        return 'Deepen inference, fluency, and flexible grammar control';
      case 'B2':
        return 'Read for nuance, style, and more demanding structures';
      default:
        return 'Choose a level';
    }
  }

  levelDescription(level: string): string {
    switch (level) {
      case 'A2':
        return 'Best for establishing routine, spotting core forms, and finishing chapters with confidence.';
      case 'B1':
        return 'A balanced step for learners ready to connect grammar, meaning, and longer story arcs.';
      case 'B2':
        return 'Designed for richer language, subtler clues, and more advanced comprehension pressure.';
      default:
        return '';
    }
  }
}
