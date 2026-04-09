import { Component, OnInit, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { PlacementResult, SubmitPlacementRequest } from '../../core/models/placement.model';
import { PlacementService } from '../../core/services/placement.service';

type Level = 'A2' | 'B1' | 'B2';
type QuestionKey = keyof SubmitPlacementRequest;

interface PlacementOption {
  level: Level;
  label: string;
  description: string;
}

interface PlacementQuestion {
  key: QuestionKey;
  prompt: string;
  support: string;
  options: PlacementOption[];
}

const QUESTIONS: PlacementQuestion[] = [
  {
    key: 'readingComfort',
    prompt: 'What kind of reading feels manageable right now?',
    support: 'Choose the level that feels closest to your normal comfort, not your best day.',
    options: [
      { level: 'A2', label: 'Short, clear paragraphs', description: 'I want simple wording and a slower load.' },
      { level: 'B1', label: 'Everyday stories with some stretch', description: 'I can handle longer scenes if the language stays practical.' },
      { level: 'B2', label: 'Nuanced reading with pressure', description: 'I am comfortable with denser wording and subtler clues.' },
    ],
  },
  {
    key: 'grammarConfidence',
    prompt: 'How secure does grammar usually feel when you read?',
    support: 'This is about how often tense, clause, and question patterns slow you down.',
    options: [
      { level: 'A2', label: 'Core forms still need support', description: 'Basic grammar still needs visible guidance.' },
      { level: 'B1', label: 'Mostly steady, with some gaps', description: 'I usually follow the form but still miss details.' },
      { level: 'B2', label: 'Usually secure in context', description: 'Grammar rarely blocks understanding.' },
    ],
  },
  {
    key: 'vocabularyIndependence',
    prompt: 'How often do you need help with vocabulary while reading?',
    support: 'Think about how often you would reach for support in a new chapter.',
    options: [
      { level: 'A2', label: 'Quite often', description: 'I need frequent support for key words.' },
      { level: 'B1', label: 'Sometimes', description: 'I can keep going, but some unknown words still interrupt me.' },
      { level: 'B2', label: 'Not often', description: 'I can infer or absorb most unfamiliar vocabulary from context.' },
    ],
  },
  {
    key: 'challengePreference',
    prompt: 'What kind of challenge do you want right now?',
    support: 'A good start point should feel workable, not punishing.',
    options: [
      { level: 'A2', label: 'A gentle start', description: 'I want to build confidence first.' },
      { level: 'B1', label: 'A balanced stretch', description: 'I want something manageable but not too easy.' },
      { level: 'B2', label: 'A demanding start', description: 'I want harder reading from the beginning.' },
    ],
  },
];

@Component({
  selector: 'app-placement',
  imports: [RouterLink],
  template: `
    <div class="container placement-page">
      <section class="section-card placement-hero">
        <div>
          <span class="eyebrow">Placement Check</span>
          <h1 class="page-title">Pick a starting level before you pick a story.</h1>
          <p class="page-subtitle">This is a short self-check, not a test. The goal is to make your first chapters feel productive rather than noisy.</p>
        </div>
        <div class="placement-hero-actions">
          <a routerLink="/browse" class="btn btn-secondary">Skip for now</a>
          @if (result()) {
            <button class="btn btn-warm" (click)="startRetake()">Retake placement</button>
          }
        </div>
      </section>

      @if (loading()) {
        <section class="card placement-result-card">
          <p class="muted-copy">Loading your placement result...</p>
        </section>
      } @else if (result() && !editing()) {
        <section class="card placement-result-card">
          <span class="eyebrow">Recommended Start</span>
          <h2>{{ resultHeadline() }}</h2>
          <p>{{ resultCopy() }}</p>

          <div class="placement-level-pills">
            @for (level of levels; track level) {
              <button class="filter-chip" [class.active]="result()!.chosenLevel === level" (click)="chooseLevel(level)">
                Use {{ level }}
              </button>
            }
          </div>

          <div class="placement-meta-row">
            <span class="filter-summary">Recommended: {{ result()!.recommendedLevel }}</span>
            <span class="filter-summary">Chosen: {{ result()!.chosenLevel }}</span>
            <span class="filter-summary">Confidence: {{ confidenceLabel(result()!.confidenceBand) }}</span>
          </div>

          <div class="placement-action-row">
            <a class="btn btn-primary" [routerLink]="['/browse']">Open {{ result()!.chosenLevel }} library</a>
            <a class="btn btn-secondary" [routerLink]="['/profile']">View study profile</a>
          </div>
        </section>
      } @else {
        <section class="placement-questions-grid">
          @for (question of questions; track question.key) {
            <article class="card placement-question-card">
              <div class="placement-question-topline">
                <span class="eyebrow">{{ question.key }}</span>
              </div>
              <h2>{{ question.prompt }}</h2>
              <p class="muted-copy">{{ question.support }}</p>
              <div class="placement-option-grid">
                @for (option of question.options; track option.level) {
                  <button
                    class="placement-option"
                    [class.active]="answers()[question.key] === option.level"
                    (click)="setAnswer(question.key, option.level)">
                    <strong>{{ option.label }}</strong>
                    <span>{{ option.description }}</span>
                    <em>{{ option.level }}</em>
                  </button>
                }
              </div>
            </article>
          }
        </section>

        <section class="card placement-submit-card">
          <div>
            <strong>{{ answeredCount() }}/{{ questions.length }} answers chosen</strong>
            <p class="muted-copy">You can still change any answer before saving the recommendation.</p>
          </div>
          <div class="placement-action-row">
            <a routerLink="/browse" class="btn btn-secondary">Back to library</a>
            <button class="btn btn-primary" [disabled]="!canSubmit() || saving()" (click)="submit()">
              {{ saving() ? 'Saving recommendation...' : 'See recommendation' }}
            </button>
          </div>
        </section>
      }
    </div>
  `,
  styles: [],
})
export class PlacementComponent implements OnInit {
  readonly questions = QUESTIONS;
  readonly levels: Level[] = ['A2', 'B1', 'B2'];

  answers = signal<Partial<Record<QuestionKey, Level>>>({});
  result = signal<PlacementResult | null>(null);
  loading = signal(false);
  saving = signal(false);
  editing = signal(false);

  readonly answeredCount = computed(() => Object.keys(this.answers()).length);
  readonly canSubmit = computed(() => this.answeredCount() === this.questions.length);

  constructor(
    private placementService: PlacementService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loading.set(true);
    this.placementService.getPlacement().pipe(catchError(() => of(null))).subscribe((result) => {
      this.result.set(result);
      this.loading.set(false);
    });
  }

  setAnswer(key: QuestionKey, value: Level) {
    this.answers.update((current) => ({ ...current, [key]: value }));
  }

  submit() {
    if (!this.canSubmit()) return;
    this.saving.set(true);

    this.placementService.submitPlacement(this.answers() as SubmitPlacementRequest).subscribe({
      next: (result) => {
        this.result.set(result);
        this.editing.set(false);
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  chooseLevel(level: Level) {
    this.placementService.updateChoice({ chosenLevel: level }).subscribe({
      next: (result) => this.result.set(result),
    });
  }

  startRetake() {
    this.editing.set(true);
    this.answers.set({});
  }

  confidenceLabel(value: string): string {
    switch (value) {
      case 'clear':
        return 'clear starting point';
      case 'mixed':
        return 'mixed signals';
      default:
        return 'leaning recommendation';
    }
  }

  resultHeadline(): string {
    const result = this.result();
    if (!result) return 'Placement ready';
    return `${result.recommendedLevel} is the recommended starting band.`;
  }

  resultCopy(): string {
    const result = this.result();
    if (!result) return '';

    switch (result.recommendedLevel) {
      case 'A2':
        return 'Start where the chapters feel manageable enough to finish cleanly. A2 is the safest place to build routine, accuracy, and confidence first.';
      case 'B1':
        return 'B1 should give you a useful amount of stretch without pushing the reading load too far. It is a balanced start for steady learners.';
      case 'B2':
        return 'B2 looks like a realistic starting point. Expect denser reading and tighter grammar pressure, but the challenge should still feel intentional.';
      default:
        return 'Use this result as a starting point, then adjust if the first chapter feels clearly too easy or too heavy.';
    }
  }
}