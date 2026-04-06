import { Component, OnInit, signal, Input, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StoryService } from '../../core/services/story.service';
import { ProgressService } from '../../core/services/progress.service';
import { ChapterDetail, ComprehensionQuestion } from '../../core/models/story.model';

type Tab = 'vocabulary' | 'grammar' | 'story' | 'quiz';

const GRAMMAR_PATTERNS: Record<string, RegExp> = {
  'present perfect continuous': /(has|have)\s+been\s+\w+ing\b/gi,
  'present perfect simple': /\b(has|have)\s+(just|already|never|ever|always|recently|finally)?\s*\w+(ed|en|ne|wn|t|d)\b/gi,
  'present perfect vs simple past': /\b(has|have)\s+\w+\b|\b(went|saw|came|got|made|took|knew|felt|said|wrote|spoke|gave|found|left|told|thought)\b/gi,
  'past continuous': /\b(was|were)\s+\w+ing\b/gi,
  'present continuous': /\b(am|is|are)\s+\w+ing\b/gi,
  'simple past': /\b\w+(ed)\b|\b(went|saw|came|got|made|took|knew|felt|said|found|told|thought|left|gave|wrote|ran|heard)\b/gi,
  'simple past – irregular': /\b(went|saw|came|got|made|took|knew|felt|said|found|told|thought|left|gave|wrote|ran|heard|sat|stood|kept|let|set|put|cut|hit|read)\b/gi,
  'going to': /\b(going to|will|won't)\s+\w+/gi,
  'comparatives': /\b(\w+er\s+than|more\s+\w+\s+than|the\s+most\s+\w+|the\s+\w+est\b|as\s+\w+\s+as)\b/gi,
  'modal verbs': /\b(can|can't|cannot|could|couldn't|should|shouldn't|must|mustn't|might|may|need|needn't)\b/gi,
  'used to': /\bused\s+to\s+\w+|\bwould\s+\w+/gi,
  'first conditional': /\bif\s+\w[^,.]{3,40},\s*[^.]*\bwill\b/gi,
  'second conditional': /\bif\s+\w[^,.]{3,40},\s*[^.]*\bwould\b/gi,
  'third conditional': /\bif\s+[^,]{5,50}\bhad\s+\w+[^,]*,\s*[^.]*\bwould\s+have\b/gi,
  'mixed conditional': /\bif\s+[^,]{5,50}\bhad\s+\w+[^,]*,\s*[^.]*\bwould\b|\bif\s+[^,]{5,50}\bwere?\b[^,]*,\s*[^.]*\bwould\s+have\b/gi,
  'passive': /\b(is|are|was|were|been|being|has\s+been|have\s+been|had\s+been|will\s+be|being)\s+\w+(ed|en|t|wn)\b/gi,
  'there is': /\bthere\s+(is|are|was|were|isn't|aren't|wasn't|weren't)\b/gi,
  'quantifiers': /\b(some|any|a\s+lot\s+of|a\s+few|a\s+little|how\s+many|how\s+much)\b/gi,
  'question forms': /\b(do|does|did)\s+\w+\s|\b(what|when|where|why|who|how)\s+(is|are|was|were|did|do|does|will|can|could)\b/gi,
  'reported speech': /\b(said\s+that|told\s+\w+\s+that|asked\s+(if|whether|what|when|where|why|how)|explained\s+that|confirmed\s+that|mentioned\s+that|reminded\s+\w+\s+that)\b/gi,
  'defining relative': /\b(who|which|that|where|whose)\b(?=\s+\w)/gi,
  'time clauses': /\b(as\s+soon\s+as|by\s+the\s+time|while|before|after|until|when)\b/gi,
  'countable': /\b(how\s+many|a\s+few|several|many|a\s+number\s+of|how\s+much|a\s+little|much)\b/gi,
};

function getGrammarRegex(rule: string): RegExp | null {
  const key = rule.toLowerCase();
  for (const [pattern, regex] of Object.entries(GRAMMAR_PATTERNS)) {
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

        <div class="tab-bar">
          <button class="tab" [class.active]="activeTab() === 'vocabulary'" (click)="activeTab.set('vocabulary')">
            <span>📚</span> Vocabulary
          </button>
          <button class="tab" [class.active]="activeTab() === 'grammar'" (click)="activeTab.set('grammar')">
            <span>✏️</span> Grammar
          </button>
          <button class="tab" [class.active]="activeTab() === 'story'" (click)="activeTab.set('story')">
            <span>📖</span> Story
          </button>
          <button class="tab" [class.active]="activeTab() === 'quiz'" (click)="activeTab.set('quiz')">
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
                  <p class="para-text" [innerHTML]="highlightParagraph(para.text)"></p>
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
  styles: [`
    .reader { max-width: 880px; margin: 0 auto; padding: 0 0 60px; }
    .reader-header { padding: 1.4rem; margin-bottom: 0.9rem; }
    .header-topline { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.8rem; flex-wrap: wrap; }
    .back-link { color: var(--accent-strong); font-size: 0.88rem; display: inline-flex; font-weight: 700; }
    .chapter-label { font-size: 0.76rem; color: var(--muted); font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    .chapter-meta { display: flex; align-items: end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    h2 { font-size: clamp(1.9rem, 4vw, 2.8rem); margin-top: 2px; }
    .chapter-subtitle { color: var(--muted); max-width: 44rem; margin-top: 0.45rem; }
    .chapter-stats { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .stat-pill { min-width: 6.2rem; padding: 0.85rem 0.95rem; border-radius: 1rem; background: rgba(255, 255, 255, 0.68); border: 1px solid rgba(29, 42, 40, 0.08); display: flex; flex-direction: column; }
    .stat-pill strong { font-size: 1.15rem; }
    .stat-pill span { color: var(--muted); font-size: 0.75rem; }

    .learning-loop { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 0.9rem; background: rgba(255, 252, 247, 0.78); }
    .loop-step { display: flex; align-items: center; gap: 0.8rem; padding: 0.85rem 0.95rem; border-radius: 1rem; background: rgba(255, 255, 255, 0.52); border: 1px solid rgba(29, 42, 40, 0.06); }
    .loop-step.active { background: linear-gradient(135deg, rgba(15, 118, 110, 0.13), rgba(245, 158, 11, 0.12)); border-color: rgba(15, 118, 110, 0.14); }
    .loop-step span { width: 2rem; height: 2rem; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; background: rgba(15, 118, 110, 0.12); color: var(--accent-strong); font-weight: 800; flex-shrink: 0; }
    .loop-step strong { display: block; font-size: 0.92rem; }
    .loop-step small { color: var(--muted); }

    .tab-bar { display: flex; gap: 0.55rem; background: transparent; position: sticky; top: 96px; z-index: 10; padding-bottom: 0.7rem; }
    .tab { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; padding: 0.95rem 0.75rem; border: 1px solid rgba(29, 42, 40, 0.08); border-radius: 1.15rem; background: rgba(255, 251, 245, 0.82); font-size: 0.86rem; font-weight: 800; cursor: pointer; color: var(--muted); transition: all 0.15s; }
    .tab.active { color: var(--accent-strong); background: rgba(255, 255, 255, 0.96); border-color: rgba(15, 118, 110, 0.2); box-shadow: 0 14px 26px rgba(29, 42, 40, 0.08); }
    .tab:hover:not(.active) { background: #fffdf9; }
    .tab-content { padding: 0.2rem 0; }

    .vocab-header { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 16px; flex-wrap: wrap; }
    .vocab-copy h3 { font-size: 1.25rem; margin-bottom: 0.25rem; }
    .vocab-hint { font-size: 0.88rem; color: var(--muted); }
    .vocab-progress { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
    .vocab-progress-bar { flex: 1; height: 8px; background: rgba(29, 42, 40, 0.08); border-radius: 999px; overflow: hidden; }
    .vocab-progress-fill { height: 100%; background: linear-gradient(90deg, #6bcb77, #2f855a); border-radius: 999px; transition: width 0.4s ease; }
    .vocab-progress-label { font-size: 0.78rem; color: var(--muted); white-space: nowrap; font-weight: 700; }
    .vocab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .vocab-card { perspective: 1000px; height: 200px; cursor: pointer; }
    .vocab-card.known .vocab-card-front { border-color: #a5d6a7; background: #f4fbf5; }
    .vocab-card.known .vocab-card-back { border-color: #a5d6a7; }
    .vocab-card-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.45s ease; }
    .vocab-card.flipped .vocab-card-inner { transform: rotateY(180deg); }
    .vocab-card-front, .vocab-card-back { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 18px; padding: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 1px solid rgba(29, 42, 40, 0.08); transition: border-color 0.2s; }
    .vocab-card-front { background: rgba(255, 253, 249, 0.9); }
    .vocab-card-back { background: linear-gradient(180deg, rgba(238, 247, 242, 0.92), rgba(255, 255, 255, 0.92)); transform: rotateY(180deg); justify-content: flex-start; text-align: left; }
    .known-badge { position: absolute; top: 8px; right: 10px; width: 22px; height: 22px; border-radius: 50%; background: #2f855a; color: #fff; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .vocab-emoji { font-size: 2rem; margin-bottom: 8px; }
    .vocab-word { font-size: 1.05rem; font-weight: 800; color: var(--accent-strong); }
    .vocab-tap-hint { font-size: 0.72rem; color: #9aa39f; margin-top: 8px; }
    .vocab-def { font-size: 0.82rem; color: #333; line-height: 1.5; margin-bottom: 8px; flex: 1; }
    .vocab-example { font-size: 0.76rem; color: #666; font-style: italic; line-height: 1.4; margin-bottom: 10px; }
    .vocab-actions { display: flex; gap: 8px; width: 100%; margin-top: auto; }
    .vocab-actions button { flex: 1; padding: 6px 4px; border-radius: 999px; border: 1px solid rgba(29, 42, 40, 0.12); font-size: 0.75rem; cursor: pointer; background: #fff; font-weight: 600; transition: all 0.15s; color: #555; }
    .know-btn:hover, .know-btn.active { background: #e8f5e9; border-color: #a5d6a7; color: #2e7d32; }
    .review-btn:hover { background: #f5f5f5; }

    .grammar-card { background: rgba(255, 252, 247, 0.84); }
    .grammar-card h3 { font-size: 1.3rem; color: var(--accent-strong); margin: 0.6rem 0 12px; padding-bottom: 10px; border-bottom: 2px solid rgba(15, 118, 110, 0.12); }
    .grammar-explanation { color: var(--ink); margin-bottom: 20px; line-height: 1.65; font-size: 0.98rem; }
    .examples-label { font-weight: 800; font-size: 0.78rem; color: var(--muted); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
    .grammar-examples { display: flex; flex-direction: column; gap: 8px; }
    .grammar-example { background: rgba(255, 255, 255, 0.72); border-left: 3px solid var(--accent); padding: 10px 14px; border-radius: 0 12px 12px 0; transition: background 0.15s; }
    .grammar-example:hover { background: #fffdf9; }
    .grammar-ex-text { font-size: 0.9rem; line-height: 1.55; color: #333; }

    .reading-progress-bar { height: 4px; background: rgba(29, 42, 40, 0.08); border-radius: 999px; margin: 0 0 18px; overflow: hidden; }
    .reading-progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), #14532d); border-radius: 999px; transition: width 0.3s ease; }
    .story-focus { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(238, 247, 242, 0.84)); }
    .story-focus h3 { font-size: 1.25rem; margin: 0.5rem 0; }
    .story-focus p { color: var(--muted); max-width: 38rem; }
    .focus-metrics { display: grid; grid-template-columns: repeat(2, minmax(7rem, 1fr)); gap: 0.8rem; }
    .focus-metrics div { padding: 0.85rem; border-radius: 1rem; background: rgba(255, 255, 255, 0.78); border: 1px solid rgba(29, 42, 40, 0.08); }
    .focus-metrics strong { display: block; font-size: 1.1rem; }
    .focus-metrics span { font-size: 0.78rem; color: var(--muted); }
    .story-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .grammar-toggle { display: inline-flex; align-items: center; gap: 6px; padding: 0.7rem 1rem; border-radius: 999px; border: 1px solid rgba(29, 42, 40, 0.12); background: rgba(255, 255, 255, 0.8); font-size: 0.82rem; cursor: pointer; color: var(--ink); transition: all 0.15s; font-weight: 500; }
    .grammar-toggle.active { background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.3); color: #7c4a02; font-weight: 700; }
    .grammar-toggle:hover:not(.active) { background: #fffdf9; }
    .vocab-toggle-hint { font-size: 0.8rem; color: var(--muted); }
    .grammar-rule-label { font-size: 0.78rem; font-weight: 700; color: #7c4a02; background: rgba(245, 158, 11, 0.14); border: 1px solid rgba(245, 158, 11, 0.28); padding: 0.42rem 0.8rem; border-radius: 999px; }
    .story-content { display: flex; flex-direction: column; gap: 28px; }
    .paragraph-block { display: flex; gap: 16px; align-items: flex-start; padding: 1rem; border-radius: 1.4rem; background: rgba(255, 252, 247, 0.72); border: 1px solid rgba(29, 42, 40, 0.06); }
    .para-order { width: 2rem; height: 2rem; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; background: rgba(15, 118, 110, 0.12); color: var(--accent-strong); font-weight: 800; flex-shrink: 0; margin-top: 0.4rem; }
    .para-image { flex-shrink: 0; width: 72px; height: 72px; border-radius: 18px; background: linear-gradient(135deg, rgba(15, 118, 110, 0.16), rgba(245, 158, 11, 0.14)); display: flex; align-items: center; justify-content: center; }
    .para-image img { width: 100%; height: 100%; object-fit: cover; border-radius: 18px; }
    .para-emoji { font-size: 2rem; }
    .para-text { font-size: 1rem; line-height: 1.85; color: var(--ink); padding-top: 4px; }
    .story-nav { margin-top: 32px; text-align: center; }

    .quiz-progress-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px 14px; background: rgba(255, 252, 247, 0.8); border-radius: 14px; border: 1px solid rgba(29, 42, 40, 0.08); gap: 0.8rem; flex-wrap: wrap; }
    .quiz-progress-text { font-size: 0.82rem; color: var(--muted); font-weight: 700; }
    .quiz-progress-pct { font-size: 1rem; font-weight: 800; color: var(--accent-strong); }
    .quiz-progress-dots { display: flex; gap: 6px; }
    .q-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(29, 42, 40, 0.14); transition: background 0.2s; }
    .q-dot.answered { background: #ef9a9a; }
    .q-dot.correct { background: #a5d6a7; }
    .quiz-questions { display: flex; flex-direction: column; gap: 14px; }
    .question-block { transition: border-color 0.2s; background: rgba(255, 252, 247, 0.82); }
    .question-block.revealed { background: rgba(255, 255, 255, 0.74); }
    .question-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .q-number { font-size: 0.78rem; font-weight: 700; color: #fff; background: var(--accent); padding: 2px 8px; border-radius: 10px; }
    .q-verdict { font-size: 0.8rem; font-weight: 700; padding: 3px 10px; border-radius: 10px; }
    .q-verdict.q-correct { background: #e8f5e9; color: #2e7d32; }
    .q-verdict.q-wrong { background: #ffebee; color: #c62828; }
    .question-text { font-weight: 700; margin-bottom: 12px; line-height: 1.5; }
    .options { display: flex; flex-direction: column; gap: 8px; }
    .option { display: flex; align-items: center; gap: 10px; text-align: left; padding: 11px 14px; border: 1.5px solid rgba(29, 42, 40, 0.12); border-radius: 14px; background: #fff; cursor: pointer; font-size: 0.9rem; transition: all 0.15s; }
    .option:hover:not(:disabled):not(.opt-selected) { border-color: var(--accent); background: rgba(15, 118, 110, 0.06); }
    .option:disabled { cursor: default; }
    .option.opt-selected { background: rgba(15, 118, 110, 0.08); border-color: var(--accent); color: var(--accent-strong); font-weight: 700; }
    .option.opt-correct { background: #e8f5e9; border-color: #66bb6a; color: #2e7d32; font-weight: 600; }
    .option.opt-wrong { background: #ffebee; border-color: #ef5350; color: #c62828; font-weight: 600; }
    .option.opt-dim { opacity: 0.45; }
    .opt-letter { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; background: rgba(29, 42, 40, 0.08); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; color: #666; }
    .opt-correct .opt-letter { background: #66bb6a; color: #fff; }
    .opt-wrong .opt-letter { background: #ef5350; color: #fff; }
    .opt-selected .opt-letter { background: var(--accent); color: #fff; }
    .opt-text { flex: 1; line-height: 1.4; }
    .opt-icon { flex-shrink: 0; font-size: 0.9rem; }
    .inline-explanation { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.22); border-radius: 12px; padding: 10px 12px; font-size: 0.85rem; color: #5d4037; line-height: 1.5; }
    .expl-bulb { flex-shrink: 0; font-size: 1rem; }
    .see-results-btn { margin-top: 8px; }

    .quiz-result { text-align: center; position: relative; overflow: hidden; background: rgba(255, 252, 247, 0.86); }
    .result-stars { font-size: 2.2rem; margin-bottom: 4px; }
    .result-score { font-size: 3rem; font-weight: 700; color: var(--accent-strong); }
    .result-label { font-size: 1rem; color: var(--ink); margin: 8px 0 24px; }
    .result-answers { text-align: left; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
    .answer-review { display: flex; gap: 12px; padding: 12px 14px; border-radius: 10px; }
    .answer-review.correct { background: #e8f5e9; border: 1px solid #a5d6a7; }
    .answer-review.wrong { background: #ffebee; border: 1px solid #ef9a9a; }
    .review-status-icon { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; }
    .answer-review.correct .review-status-icon { background: #66bb6a; color: #fff; }
    .answer-review.wrong .review-status-icon { background: #ef5350; color: #fff; }
    .review-body { flex: 1; }
    .q-text { font-weight: 600; font-size: 0.88rem; margin-bottom: 4px; }
    .your-answer, .correct-answer { font-size: 0.83rem; margin-top: 3px; }
    .explanation { font-size: 0.8rem; color: #666; margin-top: 6px; font-style: italic; line-height: 1.4; }
    .result-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

    .confetti-container { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 9999; overflow: hidden; }
    .c-piece { position: absolute; top: -16px; border-radius: 2px; opacity: 0; animation: confetti-fall var(--dur, 1.6s) var(--delay, 0s) ease-in forwards; }
    @keyframes confetti-fall {
      0% { opacity: 1; transform: translateY(0) rotate(0deg); }
      80% { opacity: 1; }
      100% { opacity: 0; transform: translateY(105vh) rotate(720deg); }
    }

    .vocab-popup-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 500; display: flex; align-items: flex-end; animation: fade-in 0.15s ease; }
    .vocab-popup-sheet { width: 100%; max-width: 860px; margin: 0 auto; background: #fff; border-radius: 20px 20px 0 0; padding: 20px 24px 32px; box-shadow: 0 -4px 24px rgba(0,0,0,0.15); animation: slide-up 0.2s ease; }
    .popup-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .popup-emoji-word { display: flex; align-items: center; gap: 10px; }
    .popup-emoji { font-size: 1.8rem; }
    .popup-word { font-size: 1.2rem; font-weight: 700; color: var(--accent-strong); }
    .popup-close { background: #f0f0f0; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 0.8rem; color: #666; display: flex; align-items: center; justify-content: center; }
    .popup-close:hover { background: #e0e0e0; }
    .popup-def { font-size: 0.95rem; color: #333; line-height: 1.6; margin-bottom: 10px; }
    .popup-example { font-size: 0.88rem; color: #666; font-style: italic; line-height: 1.5; }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slide-up { from { transform: translateY(20px); } to { transform: translateY(0); } }
    .loading { padding: 48px; text-align: center; color: var(--muted); }

    @media (max-width: 860px) {
      .learning-loop { grid-template-columns: 1fr; }
      .story-focus { flex-direction: column; align-items: stretch; }
      .focus-metrics { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 700px) {
      .tab-bar { top: 124px; overflow-x: auto; }
      .tab { min-width: 9rem; }
      .paragraph-block { flex-wrap: wrap; }
      .focus-metrics { grid-template-columns: 1fr; }
    }
  `],
})
export class ReaderComponent implements OnInit {
  @Input() chapterId!: string;

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

  highlightParagraph(text: string): SafeHtml {
    const escaped = this.escapeHtml(text);

    if (this.grammarMode()) {
      const rule = this.chapter()?.grammarFocus?.rule ?? '';
      const regex = getGrammarRegex(rule);
      if (!regex) return this.sanitizer.bypassSecurityTrustHtml(escaped);
      regex.lastIndex = 0;
      return this.sanitizer.bypassSecurityTrustHtml(escaped.replace(regex, (match) => `<mark class="gh">${match}</mark>`));
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
    const rule = this.chapter()?.grammarFocus?.rule ?? '';
    const regex = getGrammarRegex(rule);
    const escaped = this.escapeHtml(text);
    if (!regex) return this.sanitizer.bypassSecurityTrustHtml(escaped);
    regex.lastIndex = 0;
    return this.sanitizer.bypassSecurityTrustHtml(escaped.replace(regex, (match) => `<mark class="gh">${match}</mark>`));
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
}
