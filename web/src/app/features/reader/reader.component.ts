import { Component, OnInit, signal, Input, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StoryService } from '../../core/services/story.service';
import { ProgressService } from '../../core/services/progress.service';
import { ChapterDetail, ComprehensionQuestion, GrammarAnnotation, Paragraph } from '../../core/models/story.model';

type Tab = 'vocabulary' | 'grammar' | 'story' | 'quiz';

type GrammarTone = 'aux' | 'ending' | 'question' | 'structure' | 'modal';

interface GrammarLegendItem {
  tone: GrammarTone;
  label: string;
}

interface GrammarSpec {
  matches: string[];
  legend: GrammarLegendItem[];
  coachTip: string;
  annotate: (escapedText: string) => string;
}

interface LessonTabMeta {
  id: Tab;
  label: string;
  shortLabel: string;
  icon: string;
}

const TEXT_SEGMENT_SPLIT = /(<[^>]+>)/g;
const THIRD_PERSON_SUBJECT = String.raw`(?:He|She|It|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|[A-Z][a-z]+'s\s+[A-Za-z]+|His\s+[A-Za-z]+|Her\s+[A-Za-z]+|Their\s+[A-Za-z]+)`;
const FREQUENCY_ADVERB = String.raw`(?:always|usually|often|sometimes|never|already|still|just|really)`;

function transformTextSegments(html: string, transform: (segment: string) => string): string {
  return html
    .split(TEXT_SEGMENT_SPLIT)
    .map((segment) => (segment.startsWith('<') ? segment : transform(segment)))
    .join('');
}

function wrapMatches(html: string, regex: RegExp, className: string): string {
  return transformTextSegments(html, (segment) => segment.replace(regex, (match) => `<mark class="gh ${className}">${match}</mark>`));
}

function annotateSimplePresent(html: string): string {
  let next = wrapMatches(html, /\b(do|does|don't|doesn't|do not|does not)\b/gi, 'gh-aux');
  const thirdPersonRegex = new RegExp(
    String.raw`\b(${THIRD_PERSON_SUBJECT})(\s+(?:${FREQUENCY_ADVERB})\s+)?([A-Za-z]+?)(es|s)\b`,
    'g',
  );
  next = transformTextSegments(next, (segment) =>
    segment.replace(thirdPersonRegex, (_match, subject: string, adverb = '', stem: string, ending: string) =>
      `${subject}${adverb ?? ''}${stem}<mark class="gh gh-ending">${ending}</mark>`,
    ),
  );
  return next;
}

function annotateContinuous(html: string, helperRegex: RegExp): string {
  return transformTextSegments(html, (segment) =>
    segment.replace(helperRegex, (_match, helper: string, stem: string, ending: string) =>
      `<mark class="gh gh-aux">${helper}</mark> ${stem}<mark class="gh gh-ending">${ending}</mark>`,
    ),
  );
}

function annotateQuestionForms(html: string): string {
  let next = wrapMatches(html, /\b(what|when|where|why|who|how)\b/gi, 'gh-question');
  next = wrapMatches(next, /\b(do|does|did|is|are|was|were|can|could|will|would|has|have)\b/gi, 'gh-aux');
  return next;
}

function annotateThereIsQuantifiers(html: string): string {
  let next = wrapMatches(html, /\bthere\s+(is|are|was|were|isn't|aren't|wasn't|weren't)\b/gi, 'gh-structure');
  next = wrapMatches(next, /\b(a\s+lot\s+of|a\s+few|a\s+little|some|any|much|many|how\s+many|how\s+much|not\s+much|not\s+many)\b/gi, 'gh-modal');
  return next;
}

function annotateGoingToWill(html: string): string {
  let next = wrapMatches(html, /\b(going to)\b/gi, 'gh-structure');
  next = wrapMatches(next, /\b(will|won't)\b/gi, 'gh-modal');
  return next;
}

function annotateModalVerbs(html: string): string {
  return wrapMatches(html, /\b(can|can't|cannot|could|couldn't|should|shouldn't|must|mustn't|might|may|need|needn't)\b/gi, 'gh-modal');
}

function annotateComparatives(html: string): string {
  let next = wrapMatches(html, /\b(more\s+\w+\s+than|the\s+most\s+\w+|the\s+\w+est|as\s+\w+\s+as)\b/gi, 'gh-structure');
  next = transformTextSegments(next, (segment) => segment.replace(/\b([A-Za-z]+?)(er)(\s+than)\b/gi, (_m, stem: string, ending: string, tail: string) => `${stem}<mark class="gh gh-ending">${ending}</mark><mark class="gh gh-structure">${tail}</mark>`));
  return next;
}

function annotateSimplePast(html: string): string {
  let next = transformTextSegments(html, (segment) => segment.replace(/\b([A-Za-z]+?)(ed)\b/gi, (_m, stem: string, ending: string) => `${stem}<mark class="gh gh-ending">${ending}</mark>`));
  next = wrapMatches(next, /\b(went|saw|came|got|made|took|knew|felt|said|found|told|thought|left|gave|wrote|ran|heard|sat|stood|kept|let|set|put|cut|hit|read)\b/gi, 'gh-structure');
  return next;
}

function annotatePresentPerfect(html: string): string {
  let next = wrapMatches(html, /\b(has|have)\b/gi, 'gh-aux');
  next = wrapMatches(next, /\bbeen\b/gi, 'gh-structure');
  next = transformTextSegments(next, (segment) => segment.replace(/\b([A-Za-z]+?)(ing)\b/gi, (_m, stem: string, ending: string) => `${stem}<mark class="gh gh-ending">${ending}</mark>`));
  return next;
}

function annotatePassive(html: string): string {
  let next = wrapMatches(html, /\b(is|are|was|were|been|being|has been|have been|had been|will be)\b/gi, 'gh-aux');
  next = transformTextSegments(next, (segment) => segment.replace(/\b([A-Za-z]+?)(ed|en|wn|t)\b/gi, (_m, stem: string, ending: string) => `${stem}<mark class="gh gh-ending">${ending}</mark>`));
  return next;
}

const FALLBACK_GRAMMAR_PATTERNS: Record<string, RegExp> = {
  'used to': /\bused\s+to\s+\w+|\bwould\s+\w+/gi,
  'first conditional': /\bif\s+\w[^,.]{3,40},\s*[^.]*\bwill\b/gi,
  'second conditional': /\bif\s+\w[^,.]{3,40},\s*[^.]*\bwould\b/gi,
  'third conditional': /\bif\s+[^,]{5,50}\bhad\s+\w+[^,]*,\s*[^.]*\bwould\s+have\b/gi,
  'mixed conditional': /\bif\s+[^,]{5,50}\bhad\s+\w+[^,]*,\s*[^.]*\bwould\b|\bif\s+[^,]{5,50}\bwere?\b[^,]*,\s*[^.]*\bwould\s+have\b/gi,
  'reported speech': /\b(said\s+that|told\s+\w+\s+that|asked\s+(if|whether|what|when|where|why|how)|explained\s+that|confirmed\s+that|mentioned\s+that|reminded\s+\w+\s+that)\b/gi,
  'defining relative': /\b(who|which|that|where|whose)\b(?=\s+\w)/gi,
  'time clauses': /\b(as\s+soon\s+as|by\s+the\s+time|while|before|after|until|when)\b/gi,
  'countable': /\b(how\s+many|a\s+few|several|many|a\s+number\s+of|how\s+much|a\s+little|much)\b/gi,
};

const GRAMMAR_SPECS: GrammarSpec[] = [
  {
    matches: ['simple present'],
    legend: [
      { tone: 'ending', label: 'Third-person -s or -es' },
      { tone: 'aux', label: 'Do and does in questions or negatives' },
    ],
    coachTip: 'For routines and habits, notice the small grammar markers. In he, she, or it sentences, the verb often adds -s or -es. In questions and negatives, look for do or does.',
    annotate: annotateSimplePresent,
  },
  {
    matches: ['present continuous'],
    legend: [
      { tone: 'aux', label: 'Am, is, are' },
      { tone: 'ending', label: 'Verb + -ing' },
    ],
    coachTip: 'Present continuous is a two-part signal: the be verb first, then the -ing form. Train your eye to spot both parts together.',
    annotate: (html) => annotateContinuous(html, /\b(am|is|are)\s+([A-Za-z]+?)(ing)\b/gi),
  },
  {
    matches: ['past continuous'],
    legend: [
      { tone: 'aux', label: 'Was or were' },
      { tone: 'ending', label: 'Verb + -ing' },
    ],
    coachTip: 'Past continuous also has two parts. Look for was or were plus the -ing form to spot an action in progress in the past.',
    annotate: (html) => annotateContinuous(html, /\b(was|were)\s+([A-Za-z]+?)(ing)\b/gi),
  },
  {
    matches: ['question forms'],
    legend: [
      { tone: 'question', label: 'Question word' },
      { tone: 'aux', label: 'Question auxiliary' },
    ],
    coachTip: 'Question forms are easier to read when you see the front-loaded markers first: question word, then auxiliary, then subject and verb.',
    annotate: annotateQuestionForms,
  },
  {
    matches: ['there is / there are', 'there is'],
    legend: [
      { tone: 'structure', label: 'There is or there are' },
      { tone: 'modal', label: 'Quantifier' },
    ],
    coachTip: 'This pattern has two parts: the there is or there are frame, and the quantity expression that follows it.',
    annotate: annotateThereIsQuantifiers,
  },
  {
    matches: ['going to + will', 'going to'],
    legend: [
      { tone: 'structure', label: 'Going to for plans' },
      { tone: 'modal', label: 'Will or won\'t for predictions or decisions' },
    ],
    coachTip: 'Treat going to and will as different future signals. One often points to a plan already formed, the other to a decision, prediction, or promise.',
    annotate: annotateGoingToWill,
  },
  {
    matches: ['modal verbs'],
    legend: [{ tone: 'modal', label: 'Modal verb' }],
    coachTip: 'Modal verbs carry attitude or certainty. Focus on the modal first, then ask what meaning it adds: ability, advice, necessity, or deduction.',
    annotate: annotateModalVerbs,
  },
  {
    matches: ['comparatives', 'superlatives'],
    legend: [
      { tone: 'ending', label: 'Comparative ending' },
      { tone: 'structure', label: 'Than, as...as, or superlative frame' },
    ],
    coachTip: 'Comparison language often signals itself twice: an adjective change like -er, and a comparison frame like than or as...as.',
    annotate: annotateComparatives,
  },
  {
    matches: ['simple past'],
    legend: [
      { tone: 'ending', label: 'Regular -ed ending' },
      { tone: 'structure', label: 'Irregular past form' },
    ],
    coachTip: 'Past time is often marked by either a regular -ed ending or an irregular verb form. Notice which type the sentence uses.',
    annotate: annotateSimplePast,
  },
  {
    matches: ['present perfect'],
    legend: [
      { tone: 'aux', label: 'Has or have' },
      { tone: 'structure', label: 'Been or past participle frame' },
      { tone: 'ending', label: '-ing when the action is ongoing' },
    ],
    coachTip: 'Present perfect links past and present. The helper verb matters first, then the participle or continuous form shows the type of meaning.',
    annotate: annotatePresentPerfect,
  },
  {
    matches: ['passive voice', 'passive'],
    legend: [
      { tone: 'aux', label: 'Be verb' },
      { tone: 'ending', label: 'Past participle ending' },
    ],
    coachTip: 'Passive voice is easiest to spot as a pair: a be verb and a past participle. Once you see both, ask what the sentence focuses on.',
    annotate: annotatePassive,
  },
];

function getGrammarSpec(rule: string): GrammarSpec | null {
  const key = rule.toLowerCase();
  return GRAMMAR_SPECS.find((spec) => spec.matches.some((match) => key.includes(match))) ?? null;
}

function getFallbackRegex(rule: string): RegExp | null {
  const key = rule.toLowerCase();
  for (const [pattern, regex] of Object.entries(FALLBACK_GRAMMAR_PATTERNS)) {
    if (key.includes(pattern)) return regex;
  }
  return null;
}

const CONFETTI_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#c084fc', '#f06595', '#74c0fc'];
const CONFETTI_PIECES = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  left: `${((i * 17 + 5) % 94) + 3}%`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: `${((i * 0.04) % 0.8).toFixed(2)}s`,
  duration: `${(1.4 + (i % 4) * 0.2).toFixed(1)}s`,
  width: `${6 + (i % 5)}px`,
  height: `${8 + (i % 5) * 2}px`,
}));

const LESSON_TABS: LessonTabMeta[] = [
  { id: 'vocabulary', label: 'Vocabulary', shortLabel: 'Words', icon: '📚' },
  { id: 'grammar', label: 'Grammar', shortLabel: 'Grammar', icon: '✏️' },
  { id: 'story', label: 'Story', shortLabel: 'Read', icon: '📖' },
  { id: 'quiz', label: 'Quiz', shortLabel: 'Quiz', icon: '🎯' },
];

@Component({
  selector: 'app-reader',
  imports: [RouterLink],
  template: `
    @if (chapter()) {
      <div class="reader">
        <div class="reader-header section-card">
          <div class="header-topline">
            <a [routerLink]="['/stories', chapter()!.storyId]" class="back-link">← Back to story</a>
            <span class="chapter-label">Chapter {{ chapter()!.chapterNumber }}</span>
          </div>

          <div class="chapter-meta">
            <div>
              <h2>{{ chapter()!.title }}</h2>
              <p class="chapter-subtitle">{{ chapter()!.grammarFocus.rule }} taught through reading, vocabulary, and guided retrieval.</p>
            </div>

            <div class="chapter-stats">
              <div class="stat-pill">
                <strong>{{ chapter()!.vocabulary.length }}</strong>
                <span>Vocabulary</span>
              </div>
              <div class="stat-pill">
                <strong>{{ chapter()!.content.length }}</strong>
                <span>Paragraphs</span>
              </div>
              <div class="stat-pill">
                <strong>{{ chapter()!.comprehension.length }}</strong>
                <span>Questions</span>
              </div>
            </div>
          </div>
        </div>

        <div class="learning-loop card">
          <div class="loop-step" [class.active]="activeTab() === 'vocabulary'">
            <span>1</span>
            <div>
              <strong>Preview words</strong>
              <small>Flip cards and mark what you know.</small>
            </div>
          </div>
          <div class="loop-step" [class.active]="activeTab() === 'grammar' || activeTab() === 'story'">
            <span>2</span>
            <div>
              <strong>Notice grammar</strong>
              <small>Spot the pattern inside real sentences.</small>
            </div>
          </div>
          <div class="loop-step" [class.active]="activeTab() === 'quiz'">
            <span>3</span>
            <div>
              <strong>Retrieve meaning</strong>
              <small>Check understanding with immediate feedback.</small>
            </div>
          </div>
        </div>

        <div class="mobile-stage-nav card">
          <div class="mobile-stage-topline">
            <span class="mobile-stage-count">Step {{ activeTabIndex() + 1 }} of {{ lessonTabs.length }}</span>
            <span class="mobile-stage-current">{{ activeTabMeta().icon }} {{ activeTabMeta().label }}</span>
          </div>

          <div class="mobile-stage-track" role="tablist" aria-label="Lesson sections">
            @for (tab of lessonTabs; track tab.id; let i = $index) {
              <button class="mobile-stage-chip" [class.active]="activeTab() === tab.id" (click)="goToTab(tab.id)">
                <span class="mobile-stage-chip-index">{{ i + 1 }}</span>
                <span>{{ tab.shortLabel }}</span>
              </button>
            }
          </div>

          <div class="mobile-stage-actions">
            <button class="mobile-nav-btn" [disabled]="!canGoPrevious()" (click)="goPrevious()">← Previous</button>
            <button class="mobile-nav-btn mobile-nav-btn-primary" [disabled]="!canGoNext()" (click)="goNext()">{{ nextTabCta() }}</button>
          </div>
        </div>

        <div class="tab-bar">
          <button class="tab" [class.active]="activeTab() === 'vocabulary'" (click)="goToTab('vocabulary')">
            <span>📚</span> Vocabulary
          </button>
          <button class="tab" [class.active]="activeTab() === 'grammar'" (click)="goToTab('grammar')">
            <span>✏️</span> Grammar
          </button>
          <button class="tab" [class.active]="activeTab() === 'story'" (click)="goToTab('story')">
            <span>📖</span> Story
          </button>
          <button class="tab" [class.active]="activeTab() === 'quiz'" (click)="goToTab('quiz')">
            <span>🎯</span> Quiz
          </button>
        </div>

        <div class="tab-content">
          @if (activeTab() === 'vocabulary') {
            <div class="vocab-header">
              <div class="vocab-copy">
                <h3>Preview the key words before reading.</h3>
                <div class="vocab-hint">Tap a card to reveal its definition, then mark what you can already use confidently.</div>
              </div>

              @if (knownWords().size > 0) {
                <div class="vocab-progress">
                  <div class="vocab-progress-bar">
                    <div class="vocab-progress-fill" [style.width.%]="masteredWordsPct()"></div>
                  </div>
                  <span class="vocab-progress-label">{{ knownWords().size }}/{{ chapter()!.vocabulary.length }} mastered</span>
                </div>
              }
            </div>

            <div class="vocab-grid">
              @for (item of chapter()!.vocabulary; track item.word) {
                <div class="vocab-card" [class.flipped]="flippedCards().has(item.word)" [class.known]="knownWords().has(item.word)" (click)="toggleCard(item.word)">
                  <div class="vocab-card-inner">
                    <div class="vocab-card-front">
                      @if (knownWords().has(item.word)) {
                        <div class="known-badge">✓</div>
                      }
                      <div class="vocab-emoji">{{ item.emoji || '📝' }}</div>
                      <div class="vocab-word">{{ item.word }}</div>
                      <div class="vocab-tap-hint">tap to reveal</div>
                    </div>

                    <div class="vocab-card-back">
                      <div class="vocab-def">{{ item.definition }}</div>
                      <div class="vocab-example">"{{ item.exampleSentence }}"</div>
                      <div class="vocab-actions" (click)="$event.stopPropagation()">
                        <button class="know-btn" [class.active]="knownWords().has(item.word)" (click)="markKnown(item.word)">✅ Got it</button>
                        <button class="review-btn" (click)="markReview(item.word)">🔁 Review</button>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          @if (activeTab() === 'grammar') {
            @if (chapter()!.grammarFocus) {
              <div class="grammar-card card">
                <span class="eyebrow">Grammar Focus</span>
                <h3>{{ chapter()!.grammarFocus.rule }}</h3>
                <p class="grammar-explanation">{{ chapter()!.grammarFocus.explanation }}</p>
                @if (grammarLegend().length) {
                  <div class="grammar-legend">
                    @for (item of grammarLegend(); track item.label) {
                      <div class="legend-chip">
                        <span class="legend-swatch" [class.aux]="item.tone === 'aux'" [class.ending]="item.tone === 'ending'" [class.question]="item.tone === 'question'" [class.structure]="item.tone === 'structure'" [class.modal]="item.tone === 'modal'"></span>
                        <span>{{ item.label }}</span>
                      </div>
                    }
                  </div>
                }
                <div class="grammar-coach">
                  <strong>What to notice</strong>
                  <p>{{ grammarCoachTip() }}</p>
                </div>
                <p class="examples-label">Examples in context:</p>
                <div class="grammar-examples">
                  @for (ex of chapter()!.grammarFocus.examples; track ex) {
                    <div class="grammar-example">
                      <p class="grammar-ex-text" [innerHTML]="highlightExample(ex)"></p>
                    </div>
                  }
                </div>
              </div>
            }
          }

          @if (activeTab() === 'story') {
            <div class="reading-progress-bar">
              <div class="reading-progress-fill" [style.width.%]="readingProgress()"></div>
            </div>

            <div class="story-focus card">
              <div>
                <span class="eyebrow">Reading Lens</span>
                <h3>Look for {{ chapter()!.grammarFocus.rule.toLowerCase() }} while you read.</h3>
                <p>{{ chapter()!.grammarFocus.explanation }}</p>
              </div>
              <div class="focus-metrics">
                <div>
                  <strong>{{ readingStageLabel() }}</strong>
                  <span>Current reading stage</span>
                </div>
                <div>
                  <strong>{{ readingProgress().toFixed(0) }}%</strong>
                  <span>Page progress</span>
                </div>
              </div>
            </div>

            <div class="story-toolbar">
              <button class="grammar-toggle" [class.active]="grammarMode()" (click)="toggleGrammarMode()">
                🔦 {{ grammarMode() ? 'Grammar On' : 'Highlight Grammar' }}
              </button>
              @if (!grammarMode()) {
                <span class="vocab-toggle-hint">Tap underlined words for definitions.</span>
              } @else {
                <span class="grammar-rule-label">{{ chapter()!.grammarFocus.rule }}</span>
                @for (item of grammarLegend(); track item.label) {
                  <span class="story-legend-chip" [class.aux]="item.tone === 'aux'" [class.ending]="item.tone === 'ending'" [class.question]="item.tone === 'question'" [class.structure]="item.tone === 'structure'" [class.modal]="item.tone === 'modal'">{{ item.label }}</span>
                }
              }
            </div>

            <div class="story-content" (click)="onStoryClick($event)">
              @for (para of chapter()!.content; track para.order) {
                <div class="paragraph-block">
                  <div class="para-order">{{ para.order }}</div>
                  <div class="para-image">
                    @if (para.imageUrl) {
                      <img [src]="para.imageUrl" alt="" />
                    } @else {
                      <span class="para-emoji">{{ para.imagePlaceholder || '📖' }}</span>
                    }
                  </div>
                  <p class="para-text" [innerHTML]="highlightParagraph(para)"></p>
                </div>
              }
            </div>

            <div class="story-nav">
              <button class="btn btn-primary" (click)="activeTab.set('quiz')">Take the Quiz →</button>
            </div>
          }

          @if (activeTab() === 'quiz') {
            @if (quizSubmitted()) {
              @if (getStars() === 3) {
                <div class="confetti-container">
                  @for (p of confettiPieces; track p.id) {
                    <div class="c-piece" [style.left]="p.left" [style.width]="p.width" [style.height]="p.height" [style.background]="p.color" [style.animation-delay]="p.delay" [style.animation-duration]="p.duration"></div>
                  }
                </div>
              }

              <div class="quiz-result card">
                <div class="result-stars">{{ starsDisplay() }}</div>
                <div class="result-score">{{ score() }} / {{ chapter()!.comprehension.length }}</div>
                <p class="result-label">{{ resultMessage() }}</p>

                <div class="result-answers">
                  @for (q of chapter()!.comprehension; track q.order) {
                    <div class="answer-review" [class.correct]="answers()[q.order] === q.correctAnswer" [class.wrong]="answers()[q.order] !== q.correctAnswer">
                      <div class="review-status-icon">{{ answers()[q.order] === q.correctAnswer ? '✓' : '✗' }}</div>
                      <div class="review-body">
                        <p class="q-text">{{ q.question }}</p>
                        @if (answers()[q.order] !== q.correctAnswer) {
                          <p class="your-answer">Your answer: <strong>{{ answers()[q.order] }}</strong></p>
                          <p class="correct-answer">Correct: <strong>{{ q.correctAnswer }}</strong></p>
                          <p class="explanation">{{ q.explanation }}</p>
                        }
                      </div>
                    </div>
                  }
                </div>

                <div class="result-actions">
                  <button class="btn btn-secondary" (click)="retryQuiz()">Retry Quiz</button>
                  <a [routerLink]="['/stories', chapter()!.storyId]" class="btn btn-primary">Back to Story</a>
                </div>
              </div>
            } @else {
              <div class="quiz-progress-row">
                <span class="quiz-progress-text">{{ revealedQuestions().size }} / {{ chapter()!.comprehension.length }} answered</span>
                <span class="quiz-progress-pct">{{ quizProgressPct() }}%</span>
                <div class="quiz-progress-dots">
                  @for (q of chapter()!.comprehension; track q.order) {
                    <span class="q-dot" [class.answered]="revealedQuestions().has(q.order)" [class.correct]="revealedQuestions().has(q.order) && answers()[q.order] === q.correctAnswer"></span>
                  }
                </div>
              </div>

              <div class="quiz-questions">
                @for (q of chapter()!.comprehension; track q.order) {
                  <div class="question-block card" [class.revealed]="revealedQuestions().has(q.order)">
                    <div class="question-header">
                      <span class="q-number">Q{{ q.order }}</span>
                      @if (revealedQuestions().has(q.order)) {
                        <span class="q-verdict" [class.q-correct]="isCorrect(q)" [class.q-wrong]="!isCorrect(q)">
                          {{ isCorrect(q) ? '✓ Correct' : '✗ Incorrect' }}
                        </span>
                      }
                    </div>

                    <p class="question-text">{{ q.question }}</p>

                    <div class="options">
                      @for (opt of q.options; track opt) {
                        <button
                          class="option"
                          [class.opt-selected]="!revealedQuestions().has(q.order) && answers()[q.order] === opt"
                          [class.opt-correct]="revealedQuestions().has(q.order) && opt === q.correctAnswer"
                          [class.opt-wrong]="revealedQuestions().has(q.order) && answers()[q.order] === opt && opt !== q.correctAnswer"
                          [class.opt-dim]="revealedQuestions().has(q.order) && opt !== q.correctAnswer && opt !== answers()[q.order]"
                          [disabled]="revealedQuestions().has(q.order)"
                          (click)="selectAnswer(q.order, opt)">
                          <span class="opt-letter">{{ optLetter(q.options, opt) }}</span>
                          <span class="opt-text">{{ opt }}</span>
                          @if (revealedQuestions().has(q.order) && opt === q.correctAnswer) {
                            <span class="opt-icon">✓</span>
                          }
                          @if (revealedQuestions().has(q.order) && answers()[q.order] === opt && opt !== q.correctAnswer) {
                            <span class="opt-icon">✗</span>
                          }
                        </button>
                      }
                    </div>

                    @if (revealedQuestions().has(q.order) && !isCorrect(q)) {
                      <div class="inline-explanation">
                        <span class="expl-bulb">💡</span>
                        <span>{{ q.explanation }}</span>
                      </div>
                    }
                  </div>
                }

                @if (allAnswered()) {
                  <button class="btn btn-primary btn-full see-results-btn" (click)="submitQuiz()">See Results →</button>
                }
              </div>
            }
          }
        </div>

        <div class="mobile-stage-footer card">
          <div class="mobile-stage-footer-copy">
            <strong>{{ activeTabMeta().label }}</strong>
            <span>{{ mobileSupportText() }}</span>
          </div>
          <div class="mobile-stage-actions footer-actions">
            <button class="mobile-nav-btn" [disabled]="!canGoPrevious()" (click)="goPrevious()">← Previous</button>
            <button class="mobile-nav-btn mobile-nav-btn-primary" [disabled]="!canGoNext()" (click)="goNext()">{{ nextTabCta() }}</button>
          </div>
        </div>
      </div>

      @if (activeVocabPopup()) {
        <div class="vocab-popup-backdrop" (click)="activeVocabPopup.set(null)">
          <div class="vocab-popup-sheet" (click)="$event.stopPropagation()">
            <div class="popup-top">
              <div class="popup-emoji-word">
                <span class="popup-emoji">{{ activeVocabPopup()!.emoji }}</span>
                <span class="popup-word">{{ activeVocabPopup()!.word }}</span>
              </div>
              <button class="popup-close" (click)="activeVocabPopup.set(null)">✕</button>
            </div>
            <p class="popup-def">{{ activeVocabPopup()!.definition }}</p>
            <p class="popup-example">"{{ activeVocabPopup()!.exampleSentence }}"</p>
          </div>
        </div>
      }
    } @else {
      <div class="container">
        <p class="loading">Loading chapter...</p>
      </div>
    }
  `,
  styles: [``],
})
export class ReaderComponent implements OnInit {
  @Input() chapterId!: string;

  readonly lessonTabs = LESSON_TABS;

  chapter = signal<ChapterDetail | null>(null);
  activeTab = signal<Tab>('vocabulary');
  answers = signal<Record<number, string>>({});
  revealedQuestions = signal<Set<number>>(new Set());
  quizSubmitted = signal(false);
  score = signal(0);
  grammarMode = signal(false);
  flippedCards = signal<Set<string>>(new Set());
  knownWords = signal<Set<string>>(new Set());
  activeVocabPopup = signal<{ word: string; definition: string; exampleSentence: string; emoji: string } | null>(null);
  readingProgress = signal(0);

  readonly confettiPieces = CONFETTI_PIECES;

  constructor(
    private storyService: StoryService,
    private progressService: ProgressService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.storyService.getChapter(this.chapterId).subscribe((c) => {
      this.chapter.set(c);
      this.saveLastChapter(c);
    });
  }

  private saveLastChapter(c: ChapterDetail) {
    localStorage.setItem('lastChapter', JSON.stringify({
      chapterId: c.id,
      storyId: c.storyId,
      chapterNumber: c.chapterNumber,
      chapterTitle: c.title,
    }));
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (this.activeTab() !== 'story') return;
    const el = document.querySelector('.story-content') as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const totalHeight = el.offsetHeight;
    const scrolled = -rect.top + window.innerHeight * 0.6;
    this.readingProgress.set(Math.min(100, Math.max(0, (scrolled / totalHeight) * 100)));
  }

  toggleCard(word: string) {
    this.flippedCards.update((set) => {
      const next = new Set(set);
      next.has(word) ? next.delete(word) : next.add(word);
      return next;
    });
  }

  markKnown(word: string) {
    this.knownWords.update((set) => new Set([...set, word]));
  }

  markReview(word: string) {
    this.knownWords.update((set) => {
      const next = new Set(set);
      next.delete(word);
      return next;
    });
    this.flippedCards.update((set) => {
      const next = new Set(set);
      next.delete(word);
      return next;
    });
  }

  onStoryClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('vw')) {
      const word = target.dataset['word'] ?? '';
      const item = this.chapter()?.vocabulary.find((v) => v.word.toLowerCase() === word.toLowerCase());
      if (item) {
        this.activeVocabPopup.set({ ...item, emoji: item.emoji || '📝' });
        return;
      }
    }
    this.activeVocabPopup.set(null);
  }

  toggleGrammarMode() {
    this.grammarMode.update((value) => !value);
  }

  goToTab(tab: Tab) {
    this.activeTab.set(tab);
  }

  highlightParagraph(paragraph: Paragraph): SafeHtml {
    const escaped = this.escapeHtml(paragraph.text);

    if (this.grammarMode()) {
      if (paragraph.grammarAnnotations?.length) {
        return this.sanitizer.bypassSecurityTrustHtml(this.annotateExplicitGrammar(escaped, paragraph.grammarAnnotations));
      }
      return this.sanitizer.bypassSecurityTrustHtml(this.annotateGrammar(escaped));
    }

    const vocab = this.chapter()?.vocabulary ?? [];
    let result = escaped;
    const sorted = [...vocab].sort((a, b) => b.word.length - a.word.length);
    for (const item of sorted) {
      const safe = item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b(${safe})\\b`, 'gi');
      result = result.replace(regex, `<span class="vw" data-word="${item.word.toLowerCase()}">$1</span>`);
    }

    return this.sanitizer.bypassSecurityTrustHtml(result);
  }

  highlightExample(text: string): SafeHtml {
    const escaped = this.escapeHtml(text);
    return this.sanitizer.bypassSecurityTrustHtml(this.annotateGrammar(escaped));
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  selectAnswer(questionOrder: number, opt: string) {
    if (this.revealedQuestions().has(questionOrder)) return;
    this.answers.update((answers) => ({ ...answers, [questionOrder]: opt }));
    this.revealedQuestions.update((set) => {
      const next = new Set(set);
      next.add(questionOrder);
      return next;
    });
  }

  isCorrect(q: ComprehensionQuestion): boolean {
    return this.answers()[q.order] === q.correctAnswer;
  }

  allAnswered(): boolean {
    const chapter = this.chapter();
    if (!chapter) return false;
    return chapter.comprehension.every((q) => this.revealedQuestions().has(q.order));
  }

  submitQuiz() {
    const chapter = this.chapter();
    if (!chapter) return;
    let correct = 0;
    chapter.comprehension.forEach((q) => {
      if (this.answers()[q.order] === q.correctAnswer) correct++;
    });
    this.score.set(correct);
    this.quizSubmitted.set(true);
    this.progressService.submit({ storyId: chapter.storyId, chapterId: chapter.id, score: correct, totalQuestions: chapter.comprehension.length }).subscribe();
  }

  retryQuiz() {
    this.answers.set({});
    this.revealedQuestions.set(new Set());
    this.quizSubmitted.set(false);
    this.score.set(0);
  }

  optLetter(options: string[], opt: string): string {
    return String.fromCharCode(65 + options.indexOf(opt));
  }

  getStars(): number {
    const total = this.chapter()?.comprehension.length ?? 1;
    const pct = this.score() / total;
    if (pct === 1) return 3;
    if (pct >= 0.8) return 2;
    if (pct >= 0.6) return 1;
    return 0;
  }

  starsDisplay(): string {
    const n = this.getStars();
    return '⭐'.repeat(n) + '☆'.repeat(3 - n);
  }

  resultMessage(): string {
    const stars = this.getStars();
    if (stars === 3) return '🎉 Perfect score! Outstanding work!';
    if (stars === 2) return 'Great job! Almost perfect.';
    if (stars === 1) return 'Good effort. Review the story and try again.';
    return 'Keep practising — you can do it!';
  }

  masteredWordsPct(): number {
    const total = this.chapter()?.vocabulary.length ?? 0;
    if (!total) return 0;
    return (this.knownWords().size / total) * 100;
  }

  quizProgressPct(): number {
    const total = this.chapter()?.comprehension.length ?? 0;
    if (!total) return 0;
    return Math.round((this.revealedQuestions().size / total) * 100);
  }

  readingStageLabel(): string {
    const progress = this.readingProgress();
    if (progress < 33) return 'Entering the chapter';
    if (progress < 75) return 'Building understanding';
    return 'Ready to retrieve';
  }

  activeTabIndex(): number {
    return this.lessonTabs.findIndex((tab) => tab.id === this.activeTab());
  }

  activeTabMeta(): LessonTabMeta {
    return this.lessonTabs[this.activeTabIndex()] ?? this.lessonTabs[0];
  }

  canGoPrevious(): boolean {
    return this.activeTabIndex() > 0;
  }

  canGoNext(): boolean {
    return this.activeTabIndex() < this.lessonTabs.length - 1;
  }

  goPrevious() {
    const previousIndex = this.activeTabIndex() - 1;
    if (previousIndex < 0) return;
    this.goToTab(this.lessonTabs[previousIndex].id);
  }

  goNext() {
    const nextIndex = this.activeTabIndex() + 1;
    if (nextIndex >= this.lessonTabs.length) return;
    this.goToTab(this.lessonTabs[nextIndex].id);
  }

  nextTabCta(): string {
    const nextIndex = this.activeTabIndex() + 1;
    if (nextIndex >= this.lessonTabs.length) return 'Finished';
    const next = this.lessonTabs[nextIndex];
    return `Next: ${next.label} →`;
  }

  mobileSupportText(): string {
    switch (this.activeTab()) {
      case 'vocabulary':
        return 'Flip cards, review meaning, then continue when ready.';
      case 'grammar':
        return 'Use the examples to notice the exact pattern before reading.';
      case 'story':
        return 'Read carefully, tap vocabulary, and toggle grammar cues when needed.';
      case 'quiz':
        return 'Finish the questions, then review the feedback before moving on.';
    }
  }

  grammarLegend(): GrammarLegendItem[] {
    const rule = this.chapter()?.grammarFocus?.rule ?? '';
    return getGrammarSpec(rule)?.legend ?? [];
  }

  grammarCoachTip(): string {
    const rule = this.chapter()?.grammarFocus?.rule ?? '';
    return getGrammarSpec(rule)?.coachTip ?? 'Use the highlight mode to connect the grammar explanation with the exact words that carry the meaning in the sentence.';
  }

  private annotateGrammar(escapedText: string): string {
    const rule = this.chapter()?.grammarFocus?.rule ?? '';
    const spec = getGrammarSpec(rule);
    if (spec) return spec.annotate(escapedText);

    const fallback = getFallbackRegex(rule);
    if (!fallback) return escapedText;
    fallback.lastIndex = 0;
    return escapedText.replace(fallback, (match) => `<mark class="gh gh-structure">${match}</mark>`);
  }

  private annotateExplicitGrammar(escapedText: string, annotations: GrammarAnnotation[]): string {
    let next = escapedText;

    for (const annotation of annotations) {
      const targetText = annotation.targetText?.trim();
      if (!targetText) continue;

      const targetEscaped = this.escapeHtml(targetText);
      const occurrence = Math.max(1, annotation.occurrence ?? 1);
      const tone = this.normalizeTone(annotation.tone);
      const regex = new RegExp(this.escapeForRegex(targetEscaped), 'g');
      let seen = 0;

      next = transformTextSegments(next, (segment) =>
        segment.replace(regex, (match) => {
          seen += 1;
          if (seen !== occurrence) return match;

          const inner = annotation.highlightText?.trim();
          if (inner) {
            const innerEscaped = this.escapeHtml(inner);
            const innerRegex = new RegExp(this.escapeForRegex(innerEscaped), 'g');
            let innerSeen = 0;
            const highlighted = match.replace(innerRegex, (innerMatch) => {
              innerSeen += 1;
              if (innerSeen > 1) return innerMatch;
              return `<mark class="gh gh-${tone}">${innerMatch}</mark>`;
            });
            if (highlighted !== match) return highlighted;
          }

          return `<mark class="gh gh-${tone}">${match}</mark>`;
        }),
      );
    }

    return next;
  }

  private normalizeTone(tone?: GrammarAnnotation['tone']): GrammarTone {
    return tone ?? 'structure';
  }

  private escapeForRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
