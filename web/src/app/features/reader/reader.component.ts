import { Component, OnInit, signal, Input, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StoryService } from '../../core/services/story.service';
import { ProgressService } from '../../core/services/progress.service';
import { ChapterDetail, ComprehensionQuestion } from '../../core/models/story.model';

type Tab = 'vocabulary' | 'grammar' | 'story' | 'quiz';

// ── Grammar highlight patterns ─────────────────────────────────────────────
const GRAMMAR_PATTERNS: Record<string, RegExp> = {
  'present perfect continuous': /(has|have)\s+been\s+\w+ing\b/gi,
  'present perfect simple': /\b(has|have)\s+(just|already|never|ever|always|recently|finally)?\s*\w+(ed|en|ne|wn|t|d)\b/gi,
  'present perfect vs simple past': /\b(has|have)\s+\w+\b|\b(went|saw|came|got|made|took|knew|felt|said|wrote|spoke|gave|found|left|told|thought)\b/gi,
  'past continuous': /\b(was|were)\s+\w+ing\b/gi,
  'present continuous': /\b(am|is|are)\s+\w+ing\b/gi,
  'simple past': /\b\w+(ed)\b|\b(went|saw|came|got|made|took|knew|felt|said|found|told|thought|left|gave|wrote|ran|heard)\b/gi,
  'simple past – irregular': /\b(went|saw|came|got|made|took|knew|felt|said|found|told|thought|left|gave|wrote|ran|heard|sat|stood|kept|let|set|put|cut|hit|read)\b/gi,
  'going to': /\b(going to|will|won\'t)\s+\w+/gi,
  'comparatives': /\b(\w+er\s+than|more\s+\w+\s+than|the\s+most\s+\w+|the\s+\w+est\b|as\s+\w+\s+as)\b/gi,
  'modal verbs': /\b(can|can\'t|cannot|could|couldn\'t|should|shouldn\'t|must|mustn\'t|might|may|need|needn\'t)\b/gi,
  'used to': /\bused\s+to\s+\w+|\bwould\s+\w+/gi,
  'first conditional': /\bif\s+\w[^,.]{3,40},\s*[^.]*\bwill\b/gi,
  'second conditional': /\bif\s+\w[^,.]{3,40},\s*[^.]*\bwould\b/gi,
  'third conditional': /\bif\s+[^,]{5,50}\bhad\s+\w+[^,]*,\s*[^.]*\bwould\s+have\b/gi,
  'mixed conditional': /\bif\s+[^,]{5,50}\bhad\s+\w+[^,]*,\s*[^.]*\bwould\b|\bif\s+[^,]{5,50}\bwere?\b[^,]*,\s*[^.]*\bwould\s+have\b/gi,
  'passive': /\b(is|are|was|were|been|being|has\s+been|have\s+been|had\s+been|will\s+be|being)\s+\w+(ed|en|t|wn)\b/gi,
  'there is': /\bthere\s+(is|are|was|were|isn\'t|aren\'t|wasn\'t|weren\'t)\b/gi,
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

// ── Confetti pieces (generated once) ──────────────────────────────────────
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

        <!-- ── Header ── -->
        <div class="reader-header">
          <a [routerLink]="['/stories', chapter()!.storyId]" class="back-link">← Back</a>
          <div class="chapter-meta">
            <span class="chapter-label">Chapter {{ chapter()!.chapterNumber }}</span>
            <h2>{{ chapter()!.title }}</h2>
          </div>
        </div>

        <!-- ── Tabs ── -->
        <div class="tab-bar">
          <button class="tab" [class.active]="activeTab() === 'vocabulary'" (click)="activeTab.set('vocabulary')">
            📚 Vocabulary
          </button>
          <button class="tab" [class.active]="activeTab() === 'grammar'" (click)="activeTab.set('grammar')">
            ✏️ Grammar
          </button>
          <button class="tab" [class.active]="activeTab() === 'story'" (click)="activeTab.set('story')">
            📖 Story
          </button>
          <button class="tab" [class.active]="activeTab() === 'quiz'" (click)="activeTab.set('quiz')">
            🎯 Quiz
          </button>
        </div>

        <div class="tab-content">

          <!-- ══════════════════════════════════════════ VOCABULARY ══════ -->
          @if (activeTab() === 'vocabulary') {
            <div class="vocab-header">
              <div class="vocab-hint">Tap a card to reveal its definition</div>
              @if (knownWords().size > 0) {
                <div class="vocab-progress">
                  <div class="vocab-progress-bar">
                    <div class="vocab-progress-fill"
                         [style.width.%]="(knownWords().size / chapter()!.vocabulary.length) * 100">
                    </div>
                  </div>
                  <span class="vocab-progress-label">
                    {{ knownWords().size }}/{{ chapter()!.vocabulary.length }} mastered
                  </span>
                </div>
              }
            </div>

            <div class="vocab-grid">
              @for (item of chapter()!.vocabulary; track item.word) {
                <div
                  class="vocab-card"
                  [class.flipped]="flippedCards().has(item.word)"
                  [class.known]="knownWords().has(item.word)"
                  (click)="toggleCard(item.word)"
                >
                  <div class="vocab-card-inner">

                    <!-- Front -->
                    <div class="vocab-card-front">
                      @if (knownWords().has(item.word)) {
                        <div class="known-badge">✓</div>
                      }
                      <div class="vocab-emoji">{{ item.emoji || '📝' }}</div>
                      <div class="vocab-word">{{ item.word }}</div>
                      <div class="vocab-tap-hint">tap to reveal</div>
                    </div>

                    <!-- Back -->
                    <div class="vocab-card-back">
                      <div class="vocab-def">{{ item.definition }}</div>
                      <div class="vocab-example">"{{ item.exampleSentence }}"</div>
                      <div class="vocab-actions" (click)="$event.stopPropagation()">
                        <button
                          class="know-btn"
                          [class.active]="knownWords().has(item.word)"
                          (click)="markKnown(item.word)"
                        >✅ Got it</button>
                        <button
                          class="review-btn"
                          (click)="markReview(item.word)"
                        >🔁 Review</button>
                      </div>
                    </div>

                  </div>
                </div>
              }
            </div>
          }

          <!-- ══════════════════════════════════════════ GRAMMAR ════════ -->
          @if (activeTab() === 'grammar') {
            @if (chapter()!.grammarFocus) {
              <div class="grammar-card card">
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

          <!-- ══════════════════════════════════════════ STORY ══════════ -->
          @if (activeTab() === 'story') {

            <!-- Reading progress bar -->
            <div class="reading-progress-bar">
              <div class="reading-progress-fill" [style.width.%]="readingProgress()"></div>
            </div>

            <div class="story-toolbar">
              <button
                class="grammar-toggle"
                [class.active]="grammarMode()"
                (click)="toggleGrammarMode()"
              >
                🔦 {{ grammarMode() ? 'Grammar On' : 'Highlight Grammar' }}
              </button>
              @if (!grammarMode()) {
                <span class="vocab-toggle-hint">💡 Tap underlined words for definitions</span>
              }
              @if (grammarMode()) {
                <span class="grammar-rule-label">{{ chapter()!.grammarFocus.rule }}</span>
              }
            </div>

            <div class="story-content" (click)="onStoryClick($event)">
              @for (para of chapter()!.content; track para.order) {
                <div class="paragraph-block">
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
              <button class="btn btn-primary" (click)="activeTab.set('quiz')">
                Take the Quiz →
              </button>
            </div>
          }

          <!-- ══════════════════════════════════════════ QUIZ ═══════════ -->
          @if (activeTab() === 'quiz') {

            @if (quizSubmitted()) {
              <!-- ── Result screen ── -->
              @if (getStars() === 3) {
                <div class="confetti-container">
                  @for (p of confettiPieces; track p.id) {
                    <div
                      class="c-piece"
                      [style.left]="p.left"
                      [style.width]="p.width"
                      [style.height]="p.height"
                      [style.background]="p.color"
                      [style.animation-delay]="p.delay"
                      [style.animation-duration]="p.duration"
                    ></div>
                  }
                </div>
              }

              <div class="quiz-result card">
                <div class="result-stars">{{ starsDisplay() }}</div>
                <div class="result-score">{{ score() }} / {{ chapter()!.comprehension.length }}</div>
                <p class="result-label">{{ resultMessage() }}</p>

                <div class="result-answers">
                  @for (q of chapter()!.comprehension; track q.order) {
                    <div class="answer-review"
                         [class.correct]="answers()[q.order] === q.correctAnswer"
                         [class.wrong]="answers()[q.order] !== q.correctAnswer">
                      <div class="review-status-icon">
                        {{ answers()[q.order] === q.correctAnswer ? '✓' : '✗' }}
                      </div>
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
                  <a [routerLink]="['/stories', chapter()!.storyId]" class="btn btn-primary">
                    Back to Story
                  </a>
                </div>
              </div>

            } @else {
              <!-- ── Questions ── -->
              <div class="quiz-progress-row">
                <span class="quiz-progress-text">
                  {{ revealedQuestions().size }} / {{ chapter()!.comprehension.length }} answered
                </span>
                <div class="quiz-progress-dots">
                  @for (q of chapter()!.comprehension; track q.order) {
                    <span
                      class="q-dot"
                      [class.answered]="revealedQuestions().has(q.order)"
                      [class.correct]="revealedQuestions().has(q.order) && answers()[q.order] === q.correctAnswer"
                    ></span>
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
                          (click)="selectAnswer(q.order, opt)"
                        >
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
                  <button class="btn btn-primary btn-full see-results-btn" (click)="submitQuiz()">
                    See Results →
                  </button>
                }
              </div>
            }
          }

        </div>
      </div>

      <!-- ── Vocab word popup (fixed bottom sheet) ── -->
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
    /* ── Layout ── */
    .reader { max-width: 760px; margin: 0 auto; padding: 0 0 60px; }
    .reader-header { padding: 16px 20px; border-bottom: 1px solid #e8e8e8; background: #fff; }
    .back-link { color: #2d6cdf; font-size: 0.85rem; display: block; margin-bottom: 6px; }
    .chapter-label { font-size: 0.8rem; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    h2 { font-size: 1.2rem; margin-top: 2px; }

    /* ── Tabs ── */
    .tab-bar {
      display: flex; background: #fff; border-bottom: 1px solid #e8e8e8;
      position: sticky; top: 56px; z-index: 10;
    }
    .tab {
      flex: 1; padding: 14px 8px; border: none; background: none;
      font-size: 0.85rem; cursor: pointer; color: #666; border-bottom: 2px solid transparent;
      transition: all 0.15s;
      &.active { color: #2d6cdf; border-bottom-color: #2d6cdf; font-weight: 600; }
      &:hover:not(.active) { background: #f5f5f5; }
    }
    .tab-content { padding: 20px; }

    /* ══════════════════════════════ VOCABULARY ══════════════════════════════ */
    .vocab-header { margin-bottom: 16px; }
    .vocab-hint { font-size: 0.82rem; color: #999; text-align: center; margin-bottom: 10px; }

    .vocab-progress {
      display: flex; align-items: center; gap: 10px; margin-top: 6px;
    }
    .vocab-progress-bar {
      flex: 1; height: 6px; background: #e8e8e8; border-radius: 3px; overflow: hidden;
    }
    .vocab-progress-fill {
      height: 100%; background: linear-gradient(90deg, #6bcb77, #2e7d32);
      border-radius: 3px; transition: width 0.4s ease;
    }
    .vocab-progress-label { font-size: 0.78rem; color: #666; white-space: nowrap; font-weight: 600; }

    .vocab-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;
    }

    .vocab-card {
      perspective: 1000px; height: 200px; cursor: pointer;
      &.known .vocab-card-front { border-color: #a5d6a7; background: #f1f8f1; }
      &.known .vocab-card-back { border-color: #a5d6a7; }
    }
    .vocab-card-inner {
      position: relative; width: 100%; height: 100%;
      transform-style: preserve-3d; transition: transform 0.45s ease;
    }
    .vocab-card.flipped .vocab-card-inner { transform: rotateY(180deg); }

    .vocab-card-front, .vocab-card-back {
      position: absolute; inset: 0; backface-visibility: hidden;
      border-radius: 12px; padding: 14px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; border: 1px solid #e8e8e8; transition: border-color 0.2s;
    }
    .vocab-card-front { background: #fff; }
    .vocab-card-back {
      background: #f0f5ff; transform: rotateY(180deg);
      justify-content: flex-start; text-align: left; padding: 14px;
    }

    .known-badge {
      position: absolute; top: 8px; right: 10px;
      width: 22px; height: 22px; border-radius: 50%;
      background: #2e7d32; color: #fff;
      font-size: 0.75rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .vocab-emoji { font-size: 2rem; margin-bottom: 8px; }
    .vocab-word { font-size: 1.05rem; font-weight: 700; color: #2d6cdf; }
    .vocab-tap-hint { font-size: 0.7rem; color: #bbb; margin-top: 8px; }
    .vocab-def { font-size: 0.82rem; color: #333; line-height: 1.5; margin-bottom: 8px; flex: 1; }
    .vocab-example { font-size: 0.76rem; color: #666; font-style: italic; line-height: 1.4; margin-bottom: 10px; }

    .vocab-actions {
      display: flex; gap: 8px; width: 100%; margin-top: auto;
      button {
        flex: 1; padding: 6px 4px; border-radius: 8px; border: 1px solid #ddd;
        font-size: 0.75rem; cursor: pointer; background: #fff; font-weight: 600;
        transition: all 0.15s; color: #555;
      }
    }
    .know-btn {
      &:hover, &.active { background: #e8f5e9; border-color: #a5d6a7; color: #2e7d32; }
    }
    .review-btn { &:hover { background: #f5f5f5; } }

    /* ══════════════════════════════ GRAMMAR ═══════════════════════════════ */
    .grammar-card h3 {
      font-size: 1.15rem; color: #2d6cdf; margin-bottom: 12px;
      padding-bottom: 10px; border-bottom: 2px solid #e8f0fe;
    }
    .grammar-explanation { color: #444; margin-bottom: 20px; line-height: 1.65; font-size: 0.95rem; }
    .examples-label { font-weight: 700; font-size: 0.82rem; color: #888; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
    .grammar-examples { display: flex; flex-direction: column; gap: 8px; }
    .grammar-example {
      background: #f8f9ff; border-left: 3px solid #2d6cdf;
      padding: 10px 14px; border-radius: 0 8px 8px 0;
      transition: background 0.15s;
      &:hover { background: #eef2ff; }
    }
    .grammar-ex-text { font-size: 0.9rem; line-height: 1.55; color: #333; }

    /* ══════════════════════════════ STORY ════════════════════════════════ */
    .reading-progress-bar {
      height: 3px; background: #e8e8e8; border-radius: 2px;
      margin: -20px -20px 20px; overflow: hidden;
    }
    .reading-progress-fill {
      height: 100%; background: linear-gradient(90deg, #2d6cdf, #7b2ff7);
      border-radius: 2px; transition: width 0.3s ease;
    }

    .story-toolbar {
      display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;
    }
    .grammar-toggle {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 20px; border: 1px solid #ddd;
      background: #fff; font-size: 0.82rem; cursor: pointer; color: #555;
      transition: all 0.15s; font-weight: 500;
      &.active { background: #fff8e1; border-color: #fbc02d; color: #795548; font-weight: 600; }
      &:hover:not(.active) { background: #f5f5f5; }
    }
    .vocab-toggle-hint { font-size: 0.78rem; color: #888; }
    .grammar-rule-label {
      font-size: 0.78rem; font-weight: 600; color: #795548;
      background: #fff8e1; border: 1px solid #fbc02d;
      padding: 3px 10px; border-radius: 20px;
    }
    .story-content { display: flex; flex-direction: column; gap: 28px; }
    .paragraph-block { display: flex; gap: 16px; align-items: flex-start; }
    .para-image {
      flex-shrink: 0; width: 72px; height: 72px; border-radius: 10px;
      background: linear-gradient(135deg, #e3f0ff 0%, #f3e5f5 100%);
      display: flex; align-items: center; justify-content: center;
      img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; }
    }
    .para-emoji { font-size: 2rem; }
    .para-text { font-size: 1rem; line-height: 1.8; color: #333; padding-top: 4px; }
    .story-nav { margin-top: 32px; text-align: center; }

    /* ══════════════════════════════ QUIZ ═════════════════════════════════ */
    .quiz-progress-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px; padding: 10px 14px;
      background: #f8f9fc; border-radius: 8px;
    }
    .quiz-progress-text { font-size: 0.82rem; color: #666; font-weight: 600; }
    .quiz-progress-dots { display: flex; gap: 6px; }
    .q-dot {
      width: 10px; height: 10px; border-radius: 50%; background: #ddd;
      transition: background 0.2s;
      &.answered { background: #ef9a9a; }
      &.correct { background: #a5d6a7; }
    }

    .quiz-questions { display: flex; flex-direction: column; gap: 14px; }

    .question-block {
      transition: border-color 0.2s;
      &.revealed { background: #fafafa; }
    }
    .question-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
    }
    .q-number {
      font-size: 0.78rem; font-weight: 700; color: #fff;
      background: #2d6cdf; padding: 2px 8px; border-radius: 10px;
    }
    .q-verdict {
      font-size: 0.8rem; font-weight: 700; padding: 3px 10px; border-radius: 10px;
      &.q-correct { background: #e8f5e9; color: #2e7d32; }
      &.q-wrong { background: #ffebee; color: #c62828; }
    }
    .question-text { font-weight: 600; margin-bottom: 12px; line-height: 1.5; }

    .options { display: flex; flex-direction: column; gap: 8px; }
    .option {
      display: flex; align-items: center; gap: 10px;
      text-align: left; padding: 11px 14px;
      border: 1.5px solid #e0e0e0; border-radius: 8px;
      background: #fff; cursor: pointer; font-size: 0.9rem; transition: all 0.15s;
      &:hover:not(:disabled):not(.opt-selected) { border-color: #2d6cdf; background: #f0f4ff; }
      &:disabled { cursor: default; }
      &.opt-selected { background: #e8f0fe; border-color: #2d6cdf; color: #2d6cdf; font-weight: 600; }
      &.opt-correct { background: #e8f5e9; border-color: #66bb6a; color: #2e7d32; font-weight: 600; }
      &.opt-wrong { background: #ffebee; border-color: #ef5350; color: #c62828; font-weight: 600; }
      &.opt-dim { opacity: 0.45; }
    }
    .opt-letter {
      flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%;
      background: #f0f0f0; display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 700; color: #666;
      .opt-correct & { background: #66bb6a; color: #fff; }
      .opt-wrong & { background: #ef5350; color: #fff; }
      .opt-selected & { background: #2d6cdf; color: #fff; }
    }
    .opt-text { flex: 1; line-height: 1.4; }
    .opt-icon { flex-shrink: 0; font-size: 0.9rem; }

    .inline-explanation {
      display: flex; align-items: flex-start; gap: 8px; margin-top: 12px;
      background: #fff8e1; border: 1px solid #ffe082; border-radius: 8px; padding: 10px 12px;
      font-size: 0.85rem; color: #5d4037; line-height: 1.5;
    }
    .expl-bulb { flex-shrink: 0; font-size: 1rem; }

    .see-results-btn { margin-top: 8px; }

    /* ══════════════════════════════ RESULT ═══════════════════════════════ */
    .quiz-result { text-align: center; position: relative; overflow: hidden; }
    .result-stars { font-size: 2.2rem; margin-bottom: 4px; }
    .result-score { font-size: 3rem; font-weight: 700; color: #2d6cdf; }
    .result-label { font-size: 1rem; color: #555; margin: 8px 0 24px; }

    .result-answers { text-align: left; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
    .answer-review {
      display: flex; gap: 12px; padding: 12px 14px; border-radius: 10px;
      &.correct { background: #e8f5e9; border: 1px solid #a5d6a7; }
      &.wrong { background: #ffebee; border: 1px solid #ef9a9a; }
    }
    .review-status-icon {
      flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.85rem;
      .correct & { background: #66bb6a; color: #fff; }
      .wrong & { background: #ef5350; color: #fff; }
    }
    .review-body { flex: 1; }
    .q-text { font-weight: 600; font-size: 0.88rem; margin-bottom: 4px; }
    .your-answer, .correct-answer { font-size: 0.83rem; margin-top: 3px; }
    .explanation { font-size: 0.8rem; color: #666; margin-top: 6px; font-style: italic; line-height: 1.4; }
    .result-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

    /* ══════════════════════════════ CONFETTI ═════════════════════════════ */
    .confetti-container {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none; z-index: 9999; overflow: hidden;
    }
    .c-piece {
      position: absolute; top: -16px; border-radius: 2px; opacity: 0;
      animation: confetti-fall var(--dur, 1.6s) var(--delay, 0s) ease-in forwards;
    }
    @keyframes confetti-fall {
      0%   { opacity: 1; transform: translateY(0)    rotate(0deg);   }
      80%  { opacity: 1;                                              }
      100% { opacity: 0; transform: translateY(105vh) rotate(720deg);}
    }

    /* ══════════════════════════════ VOCAB POPUP ══════════════════════════ */
    .vocab-popup-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.35);
      z-index: 500; display: flex; align-items: flex-end;
      animation: fade-in 0.15s ease;
    }
    .vocab-popup-sheet {
      width: 100%; max-width: 760px; margin: 0 auto;
      background: #fff; border-radius: 20px 20px 0 0;
      padding: 20px 24px 32px; box-shadow: 0 -4px 24px rgba(0,0,0,0.15);
      animation: slide-up 0.2s ease;
    }
    .popup-top {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
    }
    .popup-emoji-word { display: flex; align-items: center; gap: 10px; }
    .popup-emoji { font-size: 1.8rem; }
    .popup-word { font-size: 1.2rem; font-weight: 700; color: #2d6cdf; }
    .popup-close {
      background: #f0f0f0; border: none; border-radius: 50%;
      width: 30px; height: 30px; cursor: pointer; font-size: 0.8rem; color: #666;
      display: flex; align-items: center; justify-content: center;
      &:hover { background: #e0e0e0; }
    }
    .popup-def { font-size: 0.95rem; color: #333; line-height: 1.6; margin-bottom: 10px; }
    .popup-example { font-size: 0.88rem; color: #666; font-style: italic; line-height: 1.5; }

    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slide-up { from { transform: translateY(20px); } to { transform: translateY(0); } }

    .loading { padding: 48px; text-align: center; color: #888; }
  `],
})
export class ReaderComponent implements OnInit {
  @Input() chapterId!: string;

  chapter    = signal<ChapterDetail | null>(null);
  activeTab  = signal<Tab>('vocabulary');
  answers    = signal<Record<number, string>>({});
  revealedQuestions = signal<Set<number>>(new Set());
  quizSubmitted = signal(false);
  score      = signal(0);
  grammarMode  = signal(false);
  flippedCards = signal<Set<string>>(new Set());
  knownWords   = signal<Set<string>>(new Set());
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

  // ── Reading progress ──────────────────────────────────────────────────────

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

  // ── Vocabulary flashcards ─────────────────────────────────────────────────

  toggleCard(word: string) {
    this.flippedCards.update((set) => {
      const next = new Set(set);
      next.has(word) ? next.delete(word) : next.add(word);
      return next;
    });
  }

  markKnown(word: string) {
    this.knownWords.update((s) => new Set([...s, word]));
  }

  markReview(word: string) {
    this.knownWords.update((s) => { const n = new Set(s); n.delete(word); return n; });
    this.flippedCards.update((s) => { const n = new Set(s); n.delete(word); return n; });
  }

  // ── Story: vocab tap ──────────────────────────────────────────────────────

  onStoryClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('vw')) {
      const word = target.dataset['word'] ?? '';
      const item = this.chapter()?.vocabulary.find(
        (v) => v.word.toLowerCase() === word.toLowerCase()
      );
      if (item) { this.activeVocabPopup.set(item); return; }
    }
    this.activeVocabPopup.set(null);
  }

  // ── Grammar toggle ────────────────────────────────────────────────────────

  toggleGrammarMode() {
    this.grammarMode.update((v) => !v);
  }

  // ── Highlighting ──────────────────────────────────────────────────────────

  /** Story paragraphs: vocab-word underlines OR grammar highlights */
  highlightParagraph(text: string): SafeHtml {
    const escaped = this.escapeHtml(text);

    if (this.grammarMode()) {
      const rule  = this.chapter()?.grammarFocus?.rule ?? '';
      const regex = getGrammarRegex(rule);
      if (!regex) return this.sanitizer.bypassSecurityTrustHtml(escaped);
      regex.lastIndex = 0;
      return this.sanitizer.bypassSecurityTrustHtml(
        escaped.replace(regex, (m) => `<mark class="gh">${m}</mark>`)
      );
    }

    // Wrap vocab words with tappable spans
    const vocab = this.chapter()?.vocabulary ?? [];
    let result   = escaped;
    const sorted = [...vocab].sort((a, b) => b.word.length - a.word.length);
    for (const item of sorted) {
      const safe  = item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b(${safe})\\b`, 'gi');
      result = result.replace(
        regex,
        `<span class="vw" data-word="${item.word.toLowerCase()}">$1</span>`
      );
    }
    return this.sanitizer.bypassSecurityTrustHtml(result);
  }

  /** Grammar tab examples: always highlight grammar structure */
  highlightExample(text: string): SafeHtml {
    const rule  = this.chapter()?.grammarFocus?.rule ?? '';
    const regex = getGrammarRegex(rule);
    const escaped = this.escapeHtml(text);
    if (!regex) return this.sanitizer.bypassSecurityTrustHtml(escaped);
    regex.lastIndex = 0;
    return this.sanitizer.bypassSecurityTrustHtml(
      escaped.replace(regex, (m) => `<mark class="gh">${m}</mark>`)
    );
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────

  selectAnswer(questionOrder: number, opt: string) {
    if (this.revealedQuestions().has(questionOrder)) return;
    this.answers.update((a) => ({ ...a, [questionOrder]: opt }));
    this.revealedQuestions.update((s) => { const n = new Set(s); n.add(questionOrder); return n; });
  }

  isCorrect(q: ComprehensionQuestion): boolean {
    return this.answers()[q.order] === q.correctAnswer;
  }

  allAnswered(): boolean {
    const ch = this.chapter();
    if (!ch) return false;
    return ch.comprehension.every((q) => this.revealedQuestions().has(q.order));
  }

  submitQuiz() {
    const ch = this.chapter();
    if (!ch) return;
    let correct = 0;
    ch.comprehension.forEach((q) => {
      if (this.answers()[q.order] === q.correctAnswer) correct++;
    });
    this.score.set(correct);
    this.quizSubmitted.set(true);
    this.progressService
      .submit({ storyId: ch.storyId, chapterId: ch.id, score: correct, totalQuestions: ch.comprehension.length })
      .subscribe();
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
    const pct   = this.score() / total;
    if (pct === 1)    return 3;
    if (pct >= 0.8)   return 2;
    if (pct >= 0.6)   return 1;
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
}
