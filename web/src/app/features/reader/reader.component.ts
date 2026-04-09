import { Component, OnInit, signal, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StoryService } from '../../core/services/story.service';
import { ProgressService } from '../../core/services/progress.service';
import { ChapterDetail, ComprehensionQuestion, GrammarAnnotation, GrammarPracticeItem, Paragraph } from '../../core/models/story.model';
import { ProgressRecord } from '../../core/models/progress.model';

type Tab = 'vocabulary' | 'grammar' | 'story' | 'practice' | 'quiz';

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

interface StageMetric {
  label: string;
  value: string;
}

const TEXT_SEGMENT_SPLIT = /(<[^>]+>)/g;
const THIRD_PERSON_SUBJECT = String.raw`(?:He|She|It|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|[A-Z][a-z]+'s\s+[A-Za-z]+|His\s+[A-Za-z]+|Her\s+[A-Za-z]+|Their\s+[A-Za-z]+)`;
const FREQUENCY_ADVERB = String.raw`(?:always|usually|often|sometimes|never|already|still|just|really)`;
const DETERMINER_SUBJECT = String.raw`(?:(?:[Tt]he|[Aa]|[Aa]n|[Tt]his|[Tt]hat|[Tt]hese|[Tt]hose|[Mm]y|[Yy]our|[Hh]is|[Hh]er|[Oo]ur|[Tt]heir)\s+(?:[A-Za-z]+'s\s+)?(?:[A-Za-z]+\s+){0,2}[A-Za-z]+)`;
const POSSESSIVE_NAME_SUBJECT = String.raw`(?:[A-Z][a-z]+'s\s+(?:[A-Za-z]+\s+){0,2}[A-Za-z]+)`;
const SIMPLE_PRESENT_SUBJECT = String.raw`(?:He|She|It|${DETERMINER_SUBJECT}|${POSSESSIVE_NAME_SUBJECT}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)`;
const SIMPLE_PAST_SUBJECT = String.raw`(?:I|You|He|She|It|We|They|${DETERMINER_SUBJECT}|${POSSESSIVE_NAME_SUBJECT}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)`;
const SIMPLE_PAST_LINKER = String.raw`(?:and|then|but|so|after|before|when)`;
const SIMPLE_PAST_ADVERB = String.raw`(?:quickly|slowly|carefully|quietly|suddenly|immediately|finally|later|early|gently|happily|nervously|calmly|eagerly|silently)`;
const PERFECT_ADVERB = String.raw`(?:already|just|never|ever|yet|only|still|really|recently|lately)`;
const SIMPLE_PAST_EXCLUDED_ED_WORDS = new Set([
  'bed',
  'bled',
  'bred',
  'red',
  'shed',
  'thread',
]);
const SIMPLE_PRESENT_EXCLUDED_S_WORDS = new Set([
  'always',
  'glass',
  'glasses',
  'news',
  'series',
  'species',
  'stairs',
  'towards',
]);
const PASSIVE_IRREGULAR_PARTICIPLES = new Set([
  'been',
  'born',
  'bought',
  'bound',
  'brought',
  'built',
  'caught',
  'chosen',
  'cut',
  'done',
  'driven',
  'fed',
  'felt',
  'found',
  'given',
  'grown',
  'heard',
  'held',
  'hit',
  'kept',
  'known',
  'led',
  'left',
  'lost',
  'made',
  'meant',
  'met',
  'paid',
  'put',
  'read',
  'released',
  'reported',
  'run',
  'said',
  'seen',
  'sent',
  'set',
  'shown',
  'sold',
  'spent',
  'stood',
  'taught',
  'thought',
  'told',
  'taken',
  'understood',
  'won',
  'written',
]);
const PASSIVE_PARTICIPLE_EXCLUSIONS = new Set([
  'bed',
  'crooked',
  'crowded',
  'excited',
  'finished',
  'frightened',
  'interested',
  'married',
  'naked',
  'pleased',
  'ragged',
  'red',
  'scared',
  'shed',
  'supposed',
  'surprised',
  'thread',
  'tired',
  'wicked',
  'worried',
]);
const PERFECT_IRREGULAR_PARTICIPLES = new Set([
  ...PASSIVE_IRREGULAR_PARTICIPLES,
  'become',
  'begun',
  'broken',
  'eaten',
  'gone',
  'run',
  'spoken',
  'sung',
  'swum',
  'won',
]);

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
  let next = transformTextSegments(html, (segment) => {
    let updated = segment.replace(/\b(do|does|don't|doesn't|do not|does not)\b/gi, (match) => `<mark class="gh gh-aux">${match}</mark>`);

    const thirdPersonRegex = new RegExp(
      String.raw`\b(${SIMPLE_PRESENT_SUBJECT})(\s+(?:${FREQUENCY_ADVERB})\s+)?([A-Za-z]+?)(es|s)\b`,
      'g',
    );

    updated = updated.replace(thirdPersonRegex, (_match, subject: string, adverb = '', stem: string, ending: string) => {
      const verb = `${stem}${ending}`;
      if (!isLikelySimplePresentVerb(verb)) {
        return `${subject}${adverb ?? ''}${verb}`;
      }
      return `${subject}${adverb ?? ''}<mark class="gh gh-ending">${verb}</mark>`;
    });

    return updated;
  });
  return next;
}

function isLikelySimplePresentVerb(word: string): boolean {
  const normalized = word.toLowerCase();
  if (SIMPLE_PRESENT_EXCLUDED_S_WORDS.has(normalized)) return false;
  return normalized.length >= 3 && (normalized.endsWith('s') || normalized.endsWith('es'));
}

function annotateContinuous(html: string, helperRegex: RegExp): string {
  return transformTextSegments(html, (segment) =>
    segment.replace(helperRegex, (_match, helper: string, stem: string, ending: string) =>
      `<mark class="gh gh-aux">${helper}</mark> <mark class="gh gh-ending">${stem}${ending}</mark>`,
    ),
  );
}

function annotateQuestionForms(html: string): string {
  const whQuestionRegex = /\b(what|when|where|why|who|how)\b\s+(do|does|did|is|are|was|were|can|could|will|would|has|have)\b(?=[^?]*\?)/gi;
  const yesNoQuestionRegex = /(^|[.!]\s+|["“]\s*)(do|does|did|is|are|was|were|can|could|will|would|has|have)\b(?=[^?]*\?)/gi;
  const subjectQuestionRegex = /\b(who|what)\b\s+([A-Za-z]+)\b(?=[^?]*\?)/gi;

  return transformTextSegments(html, (segment) => {
    let next = segment.replace(whQuestionRegex, (_match, questionWord: string, auxiliary: string) =>
      `<mark class="gh gh-question">${questionWord}</mark> <mark class="gh gh-aux">${auxiliary}</mark>`,
    );

    next = next.replace(yesNoQuestionRegex, (_match, prefix: string, auxiliary: string) =>
      `${prefix}<mark class="gh gh-aux">${auxiliary}</mark>`,
    );

    next = next.replace(subjectQuestionRegex, (_match, questionWord: string, verb: string) =>
      `<mark class="gh gh-question">${questionWord}</mark> ${verb}`,
    );

    return next;
  });
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
  next = transformTextSegments(next, (segment) => segment.replace(/\b([A-Za-z]+?er)(\s+than)\b/gi, (_m, word: string, tail: string) => `<mark class="gh gh-ending">${word}</mark><mark class="gh gh-structure">${tail}</mark>`));
  return next;
}

function annotateSimplePast(html: string): string {
  const subjectPastRegex = new RegExp(
    String.raw`\b(${SIMPLE_PAST_SUBJECT})(\s+(?:${SIMPLE_PAST_ADVERB})\s+)?([A-Za-z]{4,}ed)\b`,
    'g',
  );
  const linkedPastRegex = new RegExp(
    String.raw`\b(${SIMPLE_PAST_LINKER})(\s+(?:${SIMPLE_PAST_ADVERB})\s+)?([A-Za-z]{4,}ed)\b`,
    'g',
  );

  let next = transformTextSegments(html, (segment) => {
    const markIfPast = (verb: string) =>
      SIMPLE_PAST_EXCLUDED_ED_WORDS.has(verb.toLowerCase()) ? verb : `<mark class="gh gh-ending">${verb}</mark>`;

    let updated = segment.replace(subjectPastRegex, (_match, subject: string, adverb = '', verb: string) =>
      `${subject}${adverb ?? ''}${markIfPast(verb)}`,
    );

    updated = updated.replace(linkedPastRegex, (_match, linker: string, adverb = '', verb: string) =>
      `${linker}${adverb ?? ''}${markIfPast(verb)}`,
    );

    return updated;
  });

  next = wrapMatches(next, /\b(went|saw|came|got|made|took|knew|felt|said|found|told|thought|left|gave|wrote|ran|heard|sat|stood|kept|let|set|put|cut|hit|read)\b/gi, 'gh-structure');
  return next;
}

function annotatePresentPerfect(html: string): string {
  const perfectPairRegex = new RegExp(
    String.raw`\b(has|have)(\s+(?:${PERFECT_ADVERB})\s+)?([A-Za-z]+)\b`,
    'gi',
  );

  return transformTextSegments(html, (segment) =>
    segment.replace(perfectPairRegex, (match, auxiliary: string, adverb = '', participle: string) => {
      if (!isLikelyPerfectParticiple(participle) || participle.toLowerCase() === 'been') {
        return match;
      }
      return `<mark class="gh gh-aux">${auxiliary}</mark>${adverb ?? ''}<mark class="gh gh-structure">${participle}</mark>`;
    }),
  );
}

function annotatePresentPerfectContinuous(html: string): string {
  const perfectContinuousRegex = new RegExp(
    String.raw`\b(has|have)(\s+(?:${PERFECT_ADVERB})\s+)?been\s+([A-Za-z]+?)(ing)\b`,
    'gi',
  );

  return transformTextSegments(html, (segment) =>
    segment.replace(perfectContinuousRegex, (_match, auxiliary: string, adverb = '', stem: string, ending: string) =>
      `<mark class="gh gh-aux">${auxiliary}</mark>${adverb ?? ''}<mark class="gh gh-structure">been</mark> <mark class="gh gh-ending">${stem}${ending}</mark>`,
    ),
  );
}

function annotatePassive(html: string): string {
  const passivePairRegex = /\b(has been|have been|had been|is being|are being|was being|were being|will be|can be|cannot be|can't be|could be|must be|should be|may be|might be|is|are|was|were|be|been|being)\s+([A-Za-z]+)\b/gi;

  return transformTextSegments(html, (segment) =>
    segment.replace(passivePairRegex, (match, auxiliary: string, participle: string) => {
      if (!isLikelyPassiveParticiple(participle)) {
        return match;
      }
      return `<mark class="gh gh-aux">${auxiliary}</mark> <mark class="gh gh-ending">${participle}</mark>`;
    }),
  );
}

function isLikelyPassiveParticiple(word: string): boolean {
  const normalized = word.toLowerCase();
  if (PASSIVE_PARTICIPLE_EXCLUSIONS.has(normalized)) return false;
  if (PASSIVE_IRREGULAR_PARTICIPLES.has(normalized)) return true;
  return normalized.length >= 4 && (normalized.endsWith('ed') || normalized.endsWith('en'));
}

function isLikelyPerfectParticiple(word: string): boolean {
  const normalized = word.toLowerCase();
  if (PASSIVE_PARTICIPLE_EXCLUSIONS.has(normalized)) return false;
  if (PERFECT_IRREGULAR_PARTICIPLES.has(normalized)) return true;
  return normalized.length >= 4 && (normalized.endsWith('ed') || normalized.endsWith('en'));
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
    matches: ['present perfect continuous'],
    legend: [
      { tone: 'aux', label: 'Has or have' },
      { tone: 'structure', label: 'Been' },
      { tone: 'ending', label: 'Verb + -ing' },
    ],
    coachTip: 'Present perfect continuous works as a three-part signal: has or have, then been, then the -ing verb. Notice the full chain, not just one word inside it.',
    annotate: annotatePresentPerfectContinuous,
  },
  {
    matches: ['present perfect'],
    legend: [
      { tone: 'aux', label: 'Has or have' },
      { tone: 'structure', label: 'Past participle frame' },
    ],
    coachTip: 'Present perfect links past and present. Focus first on has or have, then on the participle frame that shows how the earlier action still matters now.',
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
  { id: 'practice', label: 'Practice', shortLabel: 'Practice', icon: '🧩' },
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
              <p class="chapter-subtitle">{{ chapter()!.grammarFocus.rule }} taught through reading, guided practice, and retrieval.</p>
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
                <strong>{{ chapter()!.grammarPractice?.length || 0 }}</strong>
                <span>Practice</span>
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
          <div class="loop-step" [class.active]="activeTab() === 'grammar'">
            <span>2</span>
            <div>
              <strong>Notice grammar</strong>
              <small>Spot the pattern inside real sentences.</small>
            </div>
          </div>
          <div class="loop-step" [class.active]="activeTab() === 'practice'">
            <span>3</span>
            <div>
              <strong>Control the form</strong>
              <small>Try short grammar exercises before reading.</small>
            </div>
          </div>
          <div class="loop-step" [class.active]="activeTab() === 'story'">
            <span>4</span>
            <div>
              <strong>Read in context</strong>
              <small>Watch the target structure inside the story.</small>
            </div>
          </div>
          <div class="loop-step" [class.active]="activeTab() === 'quiz'">
            <span>5</span>
            <div>
              <strong>Retrieve meaning</strong>
              <small>Check understanding with immediate feedback.</small>
            </div>
          </div>
        </div>

        <div class="session-compass card">
          <div class="session-compass-copy">
            <span class="eyebrow">Next best move</span>
            <h3>{{ activeStageTitle() }}</h3>
            <p>{{ activeStageGuidance() }}</p>
          </div>

          <div class="session-metrics">
            @for (metric of activeStageMetrics(); track metric.label) {
              <div class="session-metric">
                <strong>{{ metric.value }}</strong>
                <span>{{ metric.label }}</span>
              </div>
            }
          </div>

          <div class="session-actions">
            @if (activeTab() === 'quiz' && quizSubmitted()) {
              <button class="btn btn-secondary" (click)="retryQuiz()">Retry quiz</button>
            }
            <button class="btn btn-primary" [disabled]="primaryActionDisabled()" (click)="runPrimaryAction()">{{ primaryActionLabel() }}</button>
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
          <button class="tab" [class.active]="activeTab() === 'practice'" (click)="goToTab('practice')">
            <span>🧩</span> Practice
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
                @if (chapter()!.grammarFocus.formGuide?.length || chapter()!.grammarFocus.usageNotes?.length || chapter()!.grammarFocus.contrastWith || chapter()!.grammarFocus.commonMistakes?.length) {
                  <div class="grammar-teaching-grid">
                    @if (chapter()!.grammarFocus.formGuide?.length) {
                      <div class="grammar-teaching-block">
                        <strong>How to build it</strong>
                        <ul class="grammar-teaching-list">
                          @for (item of chapter()!.grammarFocus.formGuide!; track item) {
                            <li>{{ item }}</li>
                          }
                        </ul>
                      </div>
                    }

                    @if (chapter()!.grammarFocus.usageNotes?.length) {
                      <div class="grammar-teaching-block">
                        <strong>When to use it</strong>
                        <ul class="grammar-teaching-list">
                          @for (item of chapter()!.grammarFocus.usageNotes!; track item) {
                            <li>{{ item }}</li>
                          }
                        </ul>
                      </div>
                    }

                    @if (chapter()!.grammarFocus.contrastWith) {
                      <div class="grammar-teaching-block grammar-teaching-block-wide">
                        <strong>Do not mix it with</strong>
                        <p>{{ chapter()!.grammarFocus.contrastWith }}</p>
                      </div>
                    }

                    @if (chapter()!.grammarFocus.commonMistakes?.length) {
                      <div class="grammar-teaching-block grammar-teaching-block-warning">
                        <strong>Watch out for</strong>
                        <ul class="grammar-teaching-list">
                          @for (item of chapter()!.grammarFocus.commonMistakes!; track item) {
                            <li>{{ item }}</li>
                          }
                        </ul>
                      </div>
                    }
                  </div>
                }
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
            <div class="story-focus card">
              <div>
                <span class="eyebrow">Story Lens</span>
                <h3>Read after the form is already fresh.</h3>
                <p>You have already studied the rule and practised the form. Now watch how {{ chapter()!.grammarFocus.rule.toLowerCase() }} works inside the full story.</p>
              </div>
              <div class="focus-metrics">
                <div>
                  <strong>{{ chapter()!.comprehension.length }}</strong>
                  <span>Questions next</span>
                </div>
                <div>
                  <strong>{{ storyQuizChecksLabel() }}</strong>
                  <span>Quiz checks</span>
                </div>
                <div>
                  <strong>{{ storyNextMoveLabel() }}</strong>
                  <span>Next move</span>
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

          @if (activeTab() === 'practice') {
            <div class="practice-overview card">
              <div>
                <span class="eyebrow">Practice Stage</span>
                <h3>Use short tasks to control the grammar before the story and quiz.</h3>
                <p>{{ hasGrammarPractice() ? 'These exercises check form, choice, and correction. Treat them as the step that belongs directly after grammar study and before reading the story more fully.' : 'This chapter does not have dedicated grammar practice yet. Use the grammar examples first, then continue into the story.' }}</p>
              </div>
              <div class="practice-summary">
                <div>
                  <strong>{{ practiceCheckedCount() }}/{{ practiceItemCount() }}</strong>
                  <span>Checked</span>
                </div>
                <div>
                  <strong>{{ practiceCorrectCount() }}</strong>
                  <span>Correct</span>
                </div>
                <div>
                  <strong>{{ practiceStatusLabel() }}</strong>
                  <span>Current state</span>
                </div>
              </div>
            </div>

            @if (hasGrammarPractice()) {
              <div class="practice-list">
                @for (item of practiceItems(); track item.order) {
                  <div class="practice-card card" [class.checked]="isPracticeChecked(item.order)" [class.correct]="isPracticeChecked(item.order) && isPracticeCorrect(item)" [class.wrong]="isPracticeChecked(item.order) && !isPracticeCorrect(item)">
                    <div class="practice-card-top">
                      <span class="practice-order">Task {{ item.order }}</span>
                      <span class="practice-type-badge">{{ practiceTypeLabel(item) }}</span>
                    </div>
                    <p class="practice-prompt">{{ item.prompt }}</p>

                    @if (item.type === 'multiple_choice') {
                      <div class="practice-options">
                        @for (opt of item.options || []; track opt) {
                          <button
                            class="practice-option"
                            [class.selected]="practiceAnswers()[item.order] === opt"
                            [class.correct]="isPracticeChecked(item.order) && opt === item.correctAnswer"
                            [class.wrong]="isPracticeChecked(item.order) && practiceAnswers()[item.order] === opt && opt !== item.correctAnswer"
                            [disabled]="isPracticeChecked(item.order)"
                            (click)="selectPracticeOption(item, opt)">
                            <span>{{ opt }}</span>
                          </button>
                        }
                      </div>
                    } @else {
                      <div class="practice-text-entry">
                        @if (usesPracticeTextarea(item)) {
                          <textarea
                            class="practice-input practice-textarea"
                            rows="3"
                            [value]="practiceAnswers()[item.order] || ''"
                            [disabled]="isPracticeChecked(item.order)"
                            (input)="updatePracticeAnswer(item.order, $any($event.target).value)"></textarea>
                        } @else {
                          <input
                            class="practice-input"
                            type="text"
                            [value]="practiceAnswers()[item.order] || ''"
                            [disabled]="isPracticeChecked(item.order)"
                            (input)="updatePracticeAnswer(item.order, $any($event.target).value)" />
                        }

                        @if (!isPracticeChecked(item.order)) {
                          <div class="practice-check-row">
                            <button class="btn btn-secondary" [disabled]="!canCheckPractice(item.order)" (click)="checkPracticeItem(item.order)">Check answer</button>
                          </div>
                        }
                      </div>
                    }

                    @if (isPracticeChecked(item.order)) {
                      <div class="practice-feedback" [class.feedback-correct]="isPracticeCorrect(item)" [class.feedback-wrong]="!isPracticeCorrect(item)">
                        <strong>{{ isPracticeCorrect(item) ? 'Correct' : 'Not quite' }}</strong>
                        @if (!isPracticeCorrect(item)) {
                          <p>Correct answer: {{ item.correctAnswer }}</p>
                        }
                        <p>{{ item.explanation }}</p>
                      </div>
                    }
                  </div>
                }
              </div>

              <div class="practice-bridge card">
                <div>
                  <span class="eyebrow">Next in the story</span>
                  <h3>Carry this pattern into the chapter.</h3>
                  <p>{{ practiceBridgeCopy() }}</p>
                  @if (grammarLegend().length) {
                    <div class="practice-bridge-chips">
                      @for (item of grammarLegend(); track item.label) {
                        <span class="story-legend-chip" [class.aux]="item.tone === 'aux'" [class.ending]="item.tone === 'ending'" [class.question]="item.tone === 'question'" [class.structure]="item.tone === 'structure'" [class.modal]="item.tone === 'modal'">{{ item.label }}</span>
                      }
                    </div>
                  }
                </div>
                <button class="btn btn-primary" (click)="goToTab('story')">Read the Story →</button>
              </div>
            } @else {
              <div class="practice-empty card">
                <strong>Practice is not added for this chapter yet.</strong>
                <p>For now, review the grammar examples first, then move into the story and use the quiz to check how secure the pattern feels.</p>
                <button class="btn btn-primary" (click)="goToTab('story')">Continue to Story</button>
              </div>
            }
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
                <div class="result-hero" [class.mastery]="isMasteryScore()" [class.improved]="improvedSinceLastAttempt()" [class.needs-review]="needsReviewScore()">
                  <div class="result-badge-row">
                    <span class="result-badge">{{ resultBadgeLabel() }}</span>
                    @if (improvementLabel()) {
                      <span class="result-badge badge-soft">{{ improvementLabel() }}</span>
                    }
                    <span class="result-badge badge-neutral">{{ attemptSummaryLabel() }}</span>
                  </div>
                  <div class="result-stars">{{ starsDisplay() }}</div>
                  <div class="result-score">{{ score() }} / {{ chapter()!.comprehension.length }}</div>
                  <p class="result-label">{{ resultMessage() }}</p>
                  <p class="result-support">{{ resultSupportMessage() }}</p>
                  <div class="result-highlights">
                    <div class="result-highlight-card">
                      <strong>{{ scorePct() }}%</strong>
                      <span>Current accuracy</span>
                    </div>
                    @if (hasGrammarPractice()) {
                      <div class="result-highlight-card">
                        <strong>{{ practiceResultSummary() }}</strong>
                        <span>Practice result</span>
                      </div>
                    }
                    <div class="result-highlight-card">
                      <strong>{{ bestSavedScorePct() }}%</strong>
                      <span>{{ bestResultLabel() }}</span>
                    </div>
                    <div class="result-highlight-card">
                      <strong>{{ attemptCountForResult() }}</strong>
                      <span>Attempts so far</span>
                    </div>
                    <div class="result-highlight-card">
                      <strong>{{ nextResultMoveLabel() }}</strong>
                      <span>Best next move</span>
                    </div>
                  </div>
                </div>

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
                  <button class="btn btn-secondary" (click)="reviewStoryWithHighlights()">Review story with highlights</button>
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

                    @if (revealedQuestions().has(q.order) && isCorrect(q)) {
                      <div class="inline-celebration">
                        <span class="celebration-icon">✓</span>
                        <div>
                          <strong>{{ correctAnswerHeadline() }}</strong>
                          <span>{{ correctAnswerSupport() }}</span>
                        </div>
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
})
export class ReaderComponent implements OnInit {
  @Input() chapterId!: string;

  readonly lessonTabs = LESSON_TABS;

  chapter = signal<ChapterDetail | null>(null);
  activeTab = signal<Tab>('vocabulary');
  answers = signal<Record<number, string>>({});
  practiceAnswers = signal<Record<number, string>>({});
  checkedPractice = signal<Set<number>>(new Set());
  revealedQuestions = signal<Set<number>>(new Set());
  quizSubmitted = signal(false);
  score = signal(0);
  grammarMode = signal(false);
  flippedCards = signal<Set<string>>(new Set());
  knownWords = signal<Set<string>>(new Set());
  activeVocabPopup = signal<{ word: string; definition: string; exampleSentence: string; emoji: string } | null>(null);
  lastSavedScoreBeforeSubmit = signal<number | null>(null);
  savedProgress = signal<ProgressRecord | null>(null);

  readonly confettiPieces = CONFETTI_PIECES;

  constructor(
    private storyService: StoryService,
    private progressService: ProgressService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.storyService.getChapter(this.chapterId).subscribe((c) => {
      this.chapter.set(c);
      this.practiceAnswers.set({});
      this.checkedPractice.set(new Set());
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

  practiceItems(): GrammarPracticeItem[] {
    return this.chapter()?.grammarPractice ?? [];
  }

  hasGrammarPractice(): boolean {
    return this.practiceItems().length > 0;
  }

  practiceItemCount(): number {
    return this.practiceItems().length;
  }

  updatePracticeAnswer(order: number, value: string) {
    this.practiceAnswers.update((answers) => ({ ...answers, [order]: value }));
  }

  selectPracticeOption(item: GrammarPracticeItem, option: string) {
    if (this.isPracticeChecked(item.order)) return;
    this.updatePracticeAnswer(item.order, option);
    this.checkPracticeItem(item.order);
  }

  checkPracticeItem(order: number) {
    if (!this.canCheckPractice(order)) return;
    this.checkedPractice.update((set) => {
      const next = new Set(set);
      next.add(order);
      return next;
    });
  }

  canCheckPractice(order: number): boolean {
    return !!this.practiceAnswers()[order]?.trim() && !this.isPracticeChecked(order);
  }

  isPracticeChecked(order: number): boolean {
    return this.checkedPractice().has(order);
  }

  isPracticeCorrect(item: GrammarPracticeItem): boolean {
    return this.normalizePracticeAnswer(this.practiceAnswers()[item.order] ?? '') === this.normalizePracticeAnswer(item.correctAnswer);
  }

  practiceCheckedCount(): number {
    return this.checkedPractice().size;
  }

  practiceCorrectCount(): number {
    return this.practiceItems().filter((item) => this.isPracticeChecked(item.order) && this.isPracticeCorrect(item)).length;
  }

  practiceAllChecked(): boolean {
    return !this.hasGrammarPractice() || this.practiceItems().every((item) => this.isPracticeChecked(item.order));
  }

  practiceStatusLabel(): string {
    if (!this.hasGrammarPractice()) return 'Optional';
    if (!this.practiceCheckedCount()) return 'Not started';
    if (!this.practiceAllChecked()) return 'In progress';
    if (this.practiceCorrectCount() === this.practiceItemCount()) return 'Secure';
    if (this.practiceCorrectCount() >= Math.ceil(this.practiceItemCount() / 2)) return 'Mostly secure';
    return 'Needs review';
  }

  practiceResultSummary(): string {
    const saved = this.savedProgress();
    if (saved && saved.practiceTotal > 0) {
      return `${saved.practiceScore}/${saved.practiceTotal}`;
    }
    return `${this.practiceCorrectCount()}/${this.practiceItemCount()}`;
  }

  practiceBridgeCopy(): string {
    if (this.practiceCorrectCount() === this.practiceItemCount() && this.practiceItemCount() > 0) {
      return `You have checked the form. Now look for ${this.chapter()!.grammarFocus.rule.toLowerCase()} doing real work inside the story paragraphs.`;
    }
    return `As you read, look for the same grammar signals you just practised and notice how they support the story meaning, not just the form.`;
  }

  practiceTypeLabel(item: GrammarPracticeItem): string {
    switch (item.type) {
      case 'multiple_choice':
        return 'Choose';
      case 'fill_blank':
        return 'Complete';
      case 'error_correction':
        return 'Correct';
      case 'sentence_transformation':
        return 'Rewrite';
    }
  }

  usesPracticeTextarea(item: GrammarPracticeItem): boolean {
    return item.type === 'error_correction' || item.type === 'sentence_transformation';
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
    this.lastSavedScoreBeforeSubmit.set(chapter.completed ? chapter.score : null);
    this.savedProgress.set(null);
    let correct = 0;
    chapter.comprehension.forEach((q) => {
      if (this.answers()[q.order] === q.correctAnswer) correct++;
    });
    this.score.set(correct);
    this.quizSubmitted.set(true);
    this.progressService.submit({
      storyId: chapter.storyId,
      chapterId: chapter.id,
      score: correct,
      totalQuestions: chapter.comprehension.length,
      questionAttempts: chapter.comprehension.map((question) => ({
        questionOrder: question.order,
        selectedAnswer: this.answers()[question.order] ?? '',
      })),
      grammarPracticeAttempts: this.practiceItems().map((item) => ({
        practiceOrder: item.order,
        selectedAnswer: this.practiceAnswers()[item.order] ?? '',
      })),
    }).subscribe({
      next: (saved) => {
        this.savedProgress.set(saved);
        this.chapter.update((current) => current
          ? {
              ...current,
              completed: true,
              score: saved.score,
              bestScore: saved.bestScore,
              previousScore: saved.previousScore,
              attemptCount: saved.attemptCount,
            }
          : current);
      },
    });
  }

  retryQuiz() {
    this.answers.set({});
    this.revealedQuestions.set(new Set());
    this.quizSubmitted.set(false);
    this.score.set(0);
    this.lastSavedScoreBeforeSubmit.set(null);
    this.savedProgress.set(null);
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

  scorePct(): number {
    const chapter = this.chapter();
    if (!chapter || chapter.comprehension.length === 0) return 0;
    return Math.round((this.score() / chapter.comprehension.length) * 100);
  }

  previousScorePct(): number | null {
    const chapter = this.chapter();
    const previousScore = this.lastSavedScoreBeforeSubmit();
    if (!chapter || previousScore === null || chapter.comprehension.length === 0) return null;
    return Math.round((previousScore / chapter.comprehension.length) * 100);
  }

  improvedSinceLastAttempt(): boolean {
    const previous = this.previousScorePct();
    return previous !== null && this.scorePct() > previous;
  }

  needsReviewScore(): boolean {
    return this.scorePct() < 80;
  }

  isMasteryScore(): boolean {
    return this.scorePct() >= 80;
  }

  improvementLabel(): string | null {
    const previous = this.previousScorePct();
    if (previous === null) return null;
    const delta = this.scorePct() - previous;
    if (delta > 0) return `+${delta}% from last time`;
    if (delta < 0) return `${delta}% from last time`;
    return 'Same as last time';
  }

  resultBadgeLabel(): string {
    if (this.scorePct() === 100) return 'Perfect finish';
    if (this.isMasteryScore()) return 'Chapter mastered';
    if (this.scorePct() >= 60) return 'Almost there';
    return 'Keep building';
  }

  masteryStatusLabel(): string {
    if (this.scorePct() === 100) return 'Perfect';
    if (this.isMasteryScore()) return 'Mastered';
    if (this.scorePct() >= 60) return 'Close';
    return 'Review needed';
  }

  nextResultMoveLabel(): string {
    if (this.scorePct() === 100) return 'Move ahead';
    if (this.isMasteryScore()) return 'Keep momentum';
    return 'Review chapter';
  }

  resultSupportMessage(): string {
    if (this.isNewBestScore()) {
      return 'This is your strongest saved result on this chapter so far. Build on it before the pattern fades.';
    }
    if (this.scorePct() === 100) {
      return 'You answered everything correctly. This chapter is ready to count as secure.';
    }
    if (this.improvedSinceLastAttempt()) {
      return 'Your score improved from the last saved attempt. That kind of progress is what review is for.';
    }
    if (this.isMasteryScore()) {
      return 'You are above the review threshold. Keep the pattern fresh and move on with confidence.';
    }
    if (this.scorePct() >= 60) {
      return 'You are close. One focused review of the story and grammar cues should lift this chapter.';
    }
    return 'Use the review feedback below, then revisit the chapter with grammar highlights before trying again.';
  }

  correctAnswerHeadline(): string {
    if (this.scorePct() >= 80) return 'Correct. You are locking the pattern in.';
    return 'Correct. Keep stacking accurate answers.';
  }

  correctAnswerSupport(): string {
    return 'That answer fits both the story meaning and the grammar target.';
  }

  attemptCountForResult(): number {
    const saved = this.savedProgress();
    if (saved) return saved.attemptCount;

    const chapter = this.chapter();
    if (!chapter) return 1;
    const priorAttempts = chapter.attemptCount || (chapter.completed ? 1 : 0);
    return priorAttempts + 1;
  }

  attemptSummaryLabel(): string {
    return `Attempt ${this.attemptCountForResult()}`;
  }

  bestSavedScoreRaw(): number {
    const saved = this.savedProgress();
    if (saved) return saved.bestScore;

    const chapter = this.chapter();
    if (!chapter) return this.score();
    const priorBest = chapter.bestScore || (chapter.completed ? chapter.score : 0);
    return Math.max(priorBest, this.score());
  }

  bestSavedScorePct(): number {
    const chapter = this.chapter();
    if (!chapter || chapter.comprehension.length === 0) return 0;
    return Math.round((this.bestSavedScoreRaw() / chapter.comprehension.length) * 100);
  }

  bestResultLabel(): string {
    return this.isNewBestScore() ? 'New best result' : 'Best saved result';
  }

  isNewBestScore(): boolean {
    const chapter = this.chapter();
    if (!chapter) return false;
    const priorBest = chapter.bestScore || (chapter.completed ? chapter.score : 0);
    return this.score() > priorBest;
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

  storyQuizChecksLabel(): string {
    return 'Meaning + grammar';
  }

  storyNextMoveLabel(): string {
    return 'Read, then quiz';
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
      case 'practice':
        return this.hasGrammarPractice()
          ? 'Use the short tasks here to make the grammar feel deliberate before moving into the full story.'
          : 'This chapter has no dedicated practice yet, so move from grammar into the story.';
      case 'story':
        return 'Read for meaning now that the form is fresh, then use the quiz to check understanding and grammar accuracy.';
      case 'quiz':
        return 'Finish the questions, then review the feedback before moving on.';
    }
  }

  activeStageTitle(): string {
    switch (this.activeTab()) {
      case 'vocabulary':
        return 'Preview meaning before you read';
      case 'grammar':
        return 'Notice the grammar signal before the story starts';
      case 'practice':
        return this.hasGrammarPractice() ? 'Tighten the form before reading the full story' : 'No dedicated practice in this chapter';
      case 'story':
        return 'Read in context after the grammar is already familiar';
      case 'quiz':
        return this.quizSubmitted() ? 'Use the feedback to close the loop' : 'Retrieve what the chapter taught you';
    }
  }

  activeStageGuidance(): string {
    switch (this.activeTab()) {
      case 'vocabulary':
        return 'Flip the key words, mark the ones you know, and reduce the reading load before the story begins.';
      case 'grammar':
        return 'Study the examples first so the target form feels familiar when it appears inside the story.';
      case 'practice':
        return this.hasGrammarPractice()
          ? 'Use the short exercises to confirm the form, fix small errors, and make the grammar feel more deliberate before reading the chapter more fully.'
          : 'There is no dedicated practice for this chapter yet, so move into the story after the grammar explanation.';
      case 'story':
        return 'Read for meaning now that the pattern is fresher. The quiz next will test both story understanding and the target grammar.';
      case 'quiz':
        return this.quizSubmitted()
          ? 'Review any missed questions, then return to the story with highlights if you want to reinforce the pattern.'
          : 'Answer each question once, then use the results to decide whether to review or move on.';
    }
  }

  activeStageMetrics(): StageMetric[] {
    const chapter = this.chapter();
    if (!chapter) return [];

    switch (this.activeTab()) {
      case 'vocabulary':
        return [
          { label: 'Words mastered', value: `${this.knownWords().size}/${chapter.vocabulary.length}` },
          { label: 'Cards flipped', value: `${this.flippedCards().size}` },
        ];
      case 'grammar':
        return [
          { label: 'Worked examples', value: `${chapter.grammarFocus.examples.length}` },
          { label: 'Highlight cues', value: `${this.grammarLegend().length || 1}` },
        ];
      case 'practice':
        return [
          { label: 'Tasks checked', value: `${this.practiceCheckedCount()}/${this.practiceItemCount()}` },
          { label: 'Correct', value: `${this.practiceCorrectCount()}` },
        ];
      case 'story':
        return [
          { label: 'Questions next', value: `${chapter.comprehension.length}` },
          { label: 'Quiz checks', value: this.storyQuizChecksLabel() },
        ];
      case 'quiz':
        return this.quizSubmitted()
          ? [
              { label: 'Score', value: `${this.score()}/${chapter.comprehension.length}` },
              { label: 'Wrong answers', value: `${chapter.comprehension.length - this.score()}` },
            ]
          : [
              { label: 'Answered', value: `${this.revealedQuestions().size}/${chapter.comprehension.length}` },
              { label: 'Correct so far', value: `${this.currentCorrectAnswers()}` },
            ];
    }
  }

  primaryActionLabel(): string {
    switch (this.activeTab()) {
      case 'vocabulary':
        return 'Continue to grammar focus';
      case 'grammar':
        return this.hasGrammarPractice() ? 'Start grammar practice' : 'Start reading the chapter';
      case 'practice':
        return this.hasGrammarPractice() ? (this.practiceAllChecked() ? 'Continue to story' : 'Finish practice first') : 'Continue to story';
      case 'story':
        return 'Move to the quiz';
      case 'quiz':
        return this.quizSubmitted() ? 'Review the story again' : this.allAnswered() ? 'See quiz results' : 'Answer all questions first';
    }
  }

  primaryActionDisabled(): boolean {
    if (this.activeTab() === 'practice') {
      return this.hasGrammarPractice() && !this.practiceAllChecked();
    }
    return this.activeTab() === 'quiz' && !this.quizSubmitted() && !this.allAnswered();
  }

  runPrimaryAction() {
    switch (this.activeTab()) {
      case 'vocabulary':
        this.goToTab('grammar');
        break;
      case 'grammar':
        this.goToTab(this.hasGrammarPractice() ? 'practice' : 'story');
        break;
      case 'practice':
        this.goToTab('story');
        break;
      case 'story':
        this.goToTab('quiz');
        break;
      case 'quiz':
        if (this.quizSubmitted()) {
          this.reviewStoryWithHighlights();
        } else if (this.allAnswered()) {
          this.submitQuiz();
        }
        break;
    }
  }

  reviewStoryWithHighlights() {
    this.grammarMode.set(true);
    this.goToTab('story');
  }

  currentCorrectAnswers(): number {
    const chapter = this.chapter();
    if (!chapter) return 0;
    return chapter.comprehension.filter((question) => this.answers()[question.order] === question.correctAnswer).length;
  }

  private normalizePracticeAnswer(value: string): string {
    return value
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/\bwon't\b/g, 'will not')
      .replace(/\bcan't\b/g, 'can not')
      .replace(/\b(shan't|ain't)\b/g, (_match, contraction: string) => contraction === "shan't" ? 'shall not' : 'is not')
      .replace(/\b(doesn't|don't|didn't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|wouldn't|shouldn't|couldn't|mustn't|needn't)\b/g, (match) => `${match.slice(0, -3)} not`)
      .replace(/\bi'm\b/g, 'i am')
      .replace(/\b([a-z]+)'re\b/g, '$1 are')
      .replace(/\b([a-z]+)'ve\b/g, '$1 have')
      .replace(/\b([a-z]+)'ll\b/g, '$1 will')
      .replace(/\b([a-z]+)'d\b/g, '$1 would')
      .replace(/["“”.,;:()[\]{}]/g, ' ')
      .replace(/[!?]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
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
