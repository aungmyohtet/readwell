import { Component, HostListener, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { StoryService } from '../../core/services/story.service';
import { ChapterSummary, Story } from '../../core/models/story.model';
import { ProgressService } from '../../core/services/progress.service';
import { ProgressInsights, ProgressRecord } from '../../core/models/progress.model';
import { PlacementResult } from '../../core/models/placement.model';
import { PlacementService } from '../../core/services/placement.service';

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
          <span class="eyebrow">Story-First English</span>
          <h1 class="page-title">Choose a story path, then keep the next chapter easy to find.</h1>
          <p class="page-subtitle">
            The library is for picking the right next read. Each chapter then handles vocabulary, grammar, story, and quiz inside one clear loop.
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
            <span>How to use one chapter</span>
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

      @if (showPlacementCallout()) {
        <section class="card placement-callout">
          <div>
            <span class="eyebrow">Starting Point</span>
            <strong>{{ placementCalloutTitle() }}</strong>
            <p>{{ placementCalloutCopy() }}</p>
            @if (placement()) {
              <div class="placement-level-pills">
                <span class="filter-chip active">Chosen {{ placement()!.chosenLevel }}</span>
                <span class="filter-chip">Recommended {{ placement()!.recommendedLevel }}</span>
              </div>
            }
          </div>
          <div class="placement-action-row">
            <a class="btn btn-primary" [routerLink]="placement() ? ['/browse'] : ['/placement']" (click)="placement() ? selectLevel(placement()!.chosenLevel) : null">
              {{ placement() ? 'Open recommended level' : 'Start placement check' }}
            </a>
            <a class="btn btn-secondary" routerLink="/placement">{{ placement() ? 'Retake placement' : 'Skip and choose manually' }}</a>
          </div>
        </section>
      }

      @if (showHomeTips()) {
        <div class="guide-modal-backdrop" (click)="closeHomeTips()">
          <div class="guide-modal" (click)="$event.stopPropagation()">
            <div class="hero-study-guide card">
              <div class="guide-header">
                <div>
                  <span class="eyebrow">{{ guideMode() === 'onboarding' ? 'Welcome to ReadWell' : 'Study Guide' }}</span>
                  <h3 class="guide-title">Use one chapter as a short study cycle, not just a text to finish.</h3>
                  <p class="guide-subtitle">
                    {{ guideMode() === 'onboarding'
                      ? 'This quick onboarding shows the simplest way to move through a chapter without wasting effort.'
                      : 'Use the chapter loop to decide what to preview, what to notice, and what deserves review after the quiz.' }}
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
            <p class="library-guidance">A2 helps you settle in, B1 asks for more control, and B2 rewards slower, closer reading.</p>
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

        <div class="library-filters card">
          <div class="filter-input-shell">
            <label class="filter-label" for="library-search">Search stories</label>
            <input
              id="library-search"
              class="filter-input"
              type="search"
              [value]="searchTerm()"
              (input)="setSearchTerm($any($event.target).value)"
              placeholder="Search by title, grammar, or topic"
            />
          </div>

          <div class="filter-select-grid">
            <div class="filter-select-shell">
              <label class="filter-label" for="grammar-filter">Grammar</label>
              <select id="grammar-filter" class="filter-select" [value]="selectedGrammar()" (change)="setGrammarFilter($any($event.target).value)">
                @for (rule of grammarOptions(); track rule) {
                  <option [value]="rule">{{ rule }}</option>
                }
              </select>
            </div>

            <div class="filter-select-shell">
              <label class="filter-label" for="topic-filter">Topic</label>
              <select id="topic-filter" class="filter-select" [value]="selectedTopic()" (change)="setTopicFilter($any($event.target).value)">
                @for (topic of topicOptions(); track topic) {
                  <option [value]="topic">{{ topic }}</option>
                }
              </select>
            </div>
          </div>

          <div class="filter-chip-row">
            <button class="filter-chip" [class.active]="selectedReviewFilter() === 'all'" (click)="setReviewFilter('all')">All stories</button>
            <button class="filter-chip" [class.active]="selectedReviewFilter() === 'needs-review'" (click)="setReviewFilter('needs-review')">Needs review</button>
            <button class="filter-chip" [class.active]="selectedReviewFilter() === 'continue'" (click)="setReviewFilter('continue')">Continue learning</button>
            <button class="filter-chip" [class.active]="selectedReviewFilter() === 'new'" (click)="setReviewFilter('new')">New to me</button>
          </div>

          <div class="filter-summary-row">
            <span class="filter-summary">{{ displayedStories().length }} {{ displayedStories().length === 1 ? 'story' : 'stories' }} shown</span>
            @if (hasActiveFilters()) {
              <button class="filter-clear" (click)="clearFilters()">Clear filters</button>
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
            <h3>{{ hasActiveFilters() ? 'No stories match these filters yet' : 'No stories in this level yet' }}</h3>
            <p>{{ hasActiveFilters() ? 'Try clearing one or two filters to widen the library.' : 'Choose another CEFR band or add new story content to expand the path.' }}</p>
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
  searchTerm = signal('');
  selectedGrammar = signal('All grammar');
  selectedTopic = signal('All topics');
  selectedReviewFilter = signal<'all' | 'needs-review' | 'continue' | 'new'>('all');
  stories = signal<Story[]>([]);
  storyChapters = signal<Record<string, ChapterSummary[]>>({});
  grammarOptions = computed(() => {
    const rules = this.stories()
      .flatMap((story) => story.grammarRules ?? [])
      .map((rule) => rule.trim())
      .filter(Boolean);

    return ['All grammar', ...Array.from(new Set(rules)).sort((left, right) => left.localeCompare(right))];
  });
  topicOptions = computed(() => {
    const topics = this.stories()
      .flatMap((story) => story.tags ?? [])
      .map((tag) => tag.trim())
      .filter(Boolean);

    return ['All topics', ...Array.from(new Set(topics)).sort((left, right) => left.localeCompare(right))];
  });
  displayedStories = computed(() => {
    const selectedLevel = this.selectedLevel();
    const selectedGrammar = this.selectedGrammar();
    const selectedTopic = this.selectedTopic();
    const selectedReviewFilter = this.selectedReviewFilter();
    const searchTerm = this.searchTerm().trim().toLowerCase();

    return this.stories().filter((story) => {
      if (selectedLevel !== 'All' && story.level !== selectedLevel) return false;
      if (selectedGrammar !== 'All grammar' && !(story.grammarRules ?? []).includes(selectedGrammar)) return false;
      if (selectedTopic !== 'All topics' && !(story.tags ?? []).includes(selectedTopic)) return false;
      if (!this.matchesReviewFilter(story, selectedReviewFilter)) return false;

      if (!searchTerm) return true;

      const searchHaystack = [
        story.title,
        story.description,
        ...(story.tags ?? []),
        ...(story.grammarRules ?? []),
      ].join(' ').toLowerCase();

      return searchHaystack.includes(searchTerm);
    });
  });
  loading = signal(false);
  lastChapter = signal<LastChapter | null>(null);
  history = signal<ProgressRecord[]>([]);
  insights = signal<ProgressInsights | null>(null);
  placement = signal<PlacementResult | null>(null);
  showHomeTips = signal(false);
  guideMode = signal<'onboarding' | 'manual'>('manual');
  private placementApplied = false;

  constructor(
    private storyService: StoryService,
    private progressService: ProgressService,
    private placementService: PlacementService,
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
    this.placementApplied = true;
    this.selectedLevel.set(level);
  }

  setSearchTerm(value: string) {
    this.searchTerm.set(value);
  }

  setGrammarFilter(value: string) {
    this.selectedGrammar.set(value);
  }

  setTopicFilter(value: string) {
    this.selectedTopic.set(value);
  }

  setReviewFilter(value: 'all' | 'needs-review' | 'continue' | 'new') {
    this.selectedReviewFilter.set(value);
  }

  clearFilters() {
    this.searchTerm.set('');
    this.selectedGrammar.set('All grammar');
    this.selectedTopic.set('All topics');
    this.selectedReviewFilter.set('all');
    this.placementApplied = false;
    this.selectedLevel.set('All');
    this.applyPlacementRecommendation();
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
      placement: this.placementService.getPlacement().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ history, insights, placement }) => {
        this.history.set(history);
        this.insights.set(insights);
        this.placement.set(placement);
        this.applyPlacementRecommendation();
      },
      error: () => {
        this.history.set([]);
        this.insights.set(null);
        this.placement.set(null);
      },
    });
  }

  private applyPlacementRecommendation() {
    if (this.placementApplied) return;
    const placement = this.placement();
    if (!placement || this.history().length) return;
    this.selectedLevel.set(placement.chosenLevel);
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

  hasActiveFilters(): boolean {
    return this.selectedLevel() !== 'All'
      || this.selectedGrammar() !== 'All grammar'
      || this.selectedTopic() !== 'All topics'
      || this.selectedReviewFilter() !== 'all'
      || !!this.searchTerm().trim();
  }

  showPlacementCallout(): boolean {
    return !this.history().length;
  }

  placementCalloutTitle(): string {
    const placement = this.placement();
    if (!placement) return 'Use the placement check to avoid starting too high or too low.';
    return `${placement.chosenLevel} is your current starting band.`;
  }

  placementCalloutCopy(): string {
    const placement = this.placement();
    if (!placement) {
      return 'A short self-check will recommend A2, B1, or B2 before you commit to a story path.';
    }
    if (placement.confidenceBand === 'mixed') {
      return `Your answers were mixed, so ${placement.recommendedLevel} is a reasonable start and ${placement.chosenLevel} is the band currently selected for the library.`;
    }
    return `${placement.recommendedLevel} is the recommended band and the library is ready to start there unless you want to override it.`;
  }

  matchesReviewFilter(story: Story, filter: 'all' | 'needs-review' | 'continue' | 'new'): boolean {
    switch (filter) {
      case 'needs-review':
        return this.storyReviewStage(story.id) !== null;
      case 'continue':
        return this.hasStoryProgress(story.id) && this.nextStudyChapter(story.id) !== null;
      case 'new':
        return !this.hasStoryProgress(story.id);
      default:
        return true;
    }
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
    const latest = this.history().find((record) => record.storyId === storyId);
    switch (latest?.masteryState) {
      case 'mastered':
        return this.latestScorePctForStory(storyId) === 100 ? 'Perfect' : 'Mastered';
      case 'stabilising':
        return 'Stabilising';
      case 'needs_review':
        return 'Needs review';
      default:
        return 'In progress';
    }
  }

  storyBadgeClass(storyId: string): 'perfect' | 'mastered' | 'close' | 'review' {
    const latest = this.history().find((record) => record.storyId === storyId);
    if (latest?.masteryState === 'mastered') {
      return this.latestScorePctForStory(storyId) === 100 ? 'perfect' : 'mastered';
    }
    if (latest?.masteryState === 'stabilising') return 'close';
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
      return 'Story reading, grammar noticing, and quiz recall in one loop.';
    }

    const reviewStage = this.storyReviewStage(story.id);
    if (reviewStage === 'rescue') {
      return 'This story has a chapter that needs rescue before the pattern slips further.';
    }

    if (reviewStage === 'due-now') {
      return 'A completed chapter in this story is due for review now.';
    }

    if (reviewStage === 'due-soon') {
      return `This story has review coming up ${this.storyReviewDueLine(story.id)}.`;
    }

    const completed = this.completedChaptersForStory(story.id);
    if (completed >= story.totalChapters) {
      return 'All chapters attempted. Revisit weaker spots or push for a cleaner finish.';
    }

    return `${completed} chapter${completed === 1 ? '' : 's'} completed. The next step is ready.`;
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
        detail: `Chapter ${review.chapterNumber} is the best review target right now. ${review.reason}`,
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
          ? `${recommendedChapter.title} is the clearest next chapter in ${story.title}.`
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
        detail: `Return to ${lastChapter.chapterTitle} if you want to resume exactly where you left off.`,
        cta: 'Continue chapter',
        route: ['/chapters', lastChapter.chapterId],
      };
    }

    const starter = this.stories()[0];
    if (starter) {
      return {
        label: 'Start your path',
        title: `Begin with ${starter.title}`,
        detail: 'One finished chapter is enough to establish a baseline and make the next recommendation more useful.',
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
        return 'Handle longer scenes, stronger inference, and more flexible grammar';
      case 'B2':
        return 'Read for nuance, pressure points, and more demanding structures';
      default:
        return 'Choose a level';
    }
  }

  levelDescription(level: string): string {
    switch (level) {
      case 'A2':
        return 'Best for establishing routine, spotting core forms, and finishing short chapters confidently.';
      case 'B1':
        return 'A balanced step for learners ready to connect grammar, meaning, and longer story arcs.';
      case 'B2':
        return 'Designed for richer language, subtler clues, and tighter comprehension pressure.';
      default:
        return '';
    }
  }
}
