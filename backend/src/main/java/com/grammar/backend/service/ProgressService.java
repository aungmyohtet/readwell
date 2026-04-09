package com.grammar.backend.service;

import com.grammar.backend.dto.ProgressResponse;
import com.grammar.backend.dto.ProgressInsightsResponse;
import com.grammar.backend.dto.SubmitProgressRequest;
import com.grammar.backend.model.Chapter;
import com.grammar.backend.model.ProgressQuestionMistake;
import com.grammar.backend.model.Story;
import com.grammar.backend.model.UserProgress;
import com.grammar.backend.model.UserProgressAttempt;
import com.grammar.backend.repository.ChapterRepository;
import com.grammar.backend.repository.StoryRepository;
import com.grammar.backend.repository.UserProgressAttemptRepository;
import com.grammar.backend.repository.UserProgressRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class ProgressService {

  private final UserProgressRepository progressRepository;
  private final UserProgressAttemptRepository attemptRepository;
  private final StoryRepository storyRepository;
  private final ChapterRepository chapterRepository;

  public ProgressService(
      UserProgressRepository progressRepository,
      UserProgressAttemptRepository attemptRepository,
      StoryRepository storyRepository,
      ChapterRepository chapterRepository) {
    this.progressRepository = progressRepository;
    this.attemptRepository = attemptRepository;
    this.storyRepository = storyRepository;
    this.chapterRepository = chapterRepository;
  }

  public ProgressResponse submit(String userId, SubmitProgressRequest req) {
    Optional<Chapter> chapterOpt = chapterRepository.findById(req.getChapterId());
    Optional<UserProgress> existing =
        progressRepository.findByUserIdAndChapterId(userId, req.getChapterId());

    UserProgress progress = existing.orElse(new UserProgress());
    progress.setUserId(userId);
    progress.setStoryId(req.getStoryId());
    progress.setChapterId(req.getChapterId());
    chapterOpt.map(Chapter::getGrammarFocus).map(Chapter.GrammarFocus::getRule).ifPresent(progress::setGrammarRule);

    List<ProgressQuestionMistake> quizMistakes = buildQuizMistakes(chapterOpt.orElse(null), req);

    int totalQuestions =
        chapterOpt.map(Chapter::getComprehension).map(List::size).filter(size -> size > 0).orElse(req.getTotalQuestions());
    int score = req.getScore();
    if (req.getQuestionAttempts() != null && !req.getQuestionAttempts().isEmpty() && totalQuestions > 0) {
      score = Math.max(0, totalQuestions - quizMistakes.size());
    }

    int practiceTotal = chapterOpt.map(Chapter::getGrammarPractice).map(List::size).orElse(0);
    List<ProgressQuestionMistake> practiceMistakes = buildPracticeMistakes(chapterOpt.orElse(null), req);
    int practiceScore = Math.max(0, practiceTotal - practiceMistakes.size());

    List<ProgressQuestionMistake> mistakes = new ArrayList<>(quizMistakes);
    mistakes.addAll(practiceMistakes);
    progress.setMistakes(mistakes);

    Instant completedAt = Instant.now();
    int previousAttemptCount = existing.map(this::attemptCountOrLegacy).orElse(0);
    Integer previousScore = existing.filter(this::hasLegacyOrTrackedProgress).map(UserProgress::getScore).orElse(null);
    int previousBestScore = existing.map(this::bestScoreOrLegacy).orElse(score);

    UserProgressAttempt attempt = new UserProgressAttempt();
    attempt.setUserId(userId);
    attempt.setStoryId(req.getStoryId());
    attempt.setChapterId(req.getChapterId());
    attempt.setGrammarRule(progress.getGrammarRule());
    attempt.setScore(score);
    attempt.setTotalQuestions(totalQuestions);
    attempt.setPracticeScore(practiceScore);
    attempt.setPracticeTotal(practiceTotal);
    attempt.setCompletedAt(completedAt);
    attempt.setMistakes(mistakes);
    attemptRepository.save(attempt);

    progress.setScore(score);
    progress.setBestScore(Math.max(previousBestScore, score));
    progress.setPreviousScore(previousScore);
    progress.setAttemptCount(previousAttemptCount + 1);
    progress.setTotalQuestions(totalQuestions);
    progress.setPracticeScore(practiceScore);
    progress.setPracticeTotal(practiceTotal);
    progress.setCompletedAt(completedAt);
    progress.setReviewStage(determineReviewStage(score, totalQuestions, practiceScore, practiceTotal));
    progress.setNextReviewAt(determineNextReviewAt(completedAt, score, totalQuestions, practiceScore, practiceTotal));

    UserProgress saved = progressRepository.save(progress);
    return toResponse(saved);
  }

  public List<ProgressResponse> getHistory(String userId) {
    return progressRepository.findByUserIdOrderByCompletedAtDesc(userId).stream()
        .map(this::toResponse)
        .toList();
  }

  public ProgressInsightsResponse getInsights(String userId) {
    List<UserProgress> history = progressRepository.findByUserIdOrderByCompletedAtDesc(userId);

    ProgressInsightsResponse response = new ProgressInsightsResponse();
    response.setAverageScorePct(averageScorePct(history));
    response.setWeakAreas(buildWeakAreas(history));
    response.setReviewQueue(buildReviewQueue(history));
    response.setMistakeBank(buildMistakeBank(history));
    return response;
  }

  private List<ProgressQuestionMistake> buildQuizMistakes(Chapter chapter, SubmitProgressRequest req) {
    if (chapter == null || chapter.getComprehension() == null || req.getQuestionAttempts() == null) {
      return List.of();
    }

    Map<Integer, Chapter.ComprehensionQuestion> questionMap =
        chapter.getComprehension().stream()
            .collect(
                Collectors.toMap(
                    Chapter.ComprehensionQuestion::getOrder,
                    question -> question,
                    (left, _right) -> left,
                    HashMap::new));

    List<ProgressQuestionMistake> mistakes = new ArrayList<>();
    for (SubmitProgressRequest.QuestionAttemptRequest attempt : req.getQuestionAttempts()) {
      Chapter.ComprehensionQuestion question = questionMap.get(attempt.getQuestionOrder());
      if (question == null || Objects.equals(question.getCorrectAnswer(), attempt.getSelectedAnswer())) {
        continue;
      }

      ProgressQuestionMistake mistake = new ProgressQuestionMistake();
      mistake.setQuestionOrder(question.getOrder());
      mistake.setSource("quiz");
      mistake.setQuestion(question.getQuestion());
      mistake.setSelectedAnswer(attempt.getSelectedAnswer());
      mistake.setCorrectAnswer(question.getCorrectAnswer());
      mistake.setExplanation(question.getExplanation());
      mistakes.add(mistake);
    }
    return mistakes;
  }

  private List<ProgressQuestionMistake> buildPracticeMistakes(Chapter chapter, SubmitProgressRequest req) {
    if (chapter == null || chapter.getGrammarPractice() == null || req.getGrammarPracticeAttempts() == null) {
      return List.of();
    }

    Map<Integer, Chapter.GrammarPracticeItem> practiceMap =
        chapter.getGrammarPractice().stream()
            .collect(
                Collectors.toMap(
                    Chapter.GrammarPracticeItem::getOrder,
                    item -> item,
                    (left, _right) -> left,
                    HashMap::new));

    List<ProgressQuestionMistake> mistakes = new ArrayList<>();
    for (SubmitProgressRequest.GrammarPracticeAttemptRequest attempt : req.getGrammarPracticeAttempts()) {
      Chapter.GrammarPracticeItem item = practiceMap.get(attempt.getPracticeOrder());
      if (item == null || sameAnswer(item.getCorrectAnswer(), attempt.getSelectedAnswer())) {
        continue;
      }

      ProgressQuestionMistake mistake = new ProgressQuestionMistake();
      mistake.setQuestionOrder(item.getOrder());
      mistake.setSource("practice");
      mistake.setSkillTag(item.getSkillTag());
      mistake.setQuestion(item.getPrompt());
      mistake.setSelectedAnswer(attempt.getSelectedAnswer());
      mistake.setCorrectAnswer(item.getCorrectAnswer());
      mistake.setExplanation(item.getExplanation());
      mistakes.add(mistake);
    }
    return mistakes;
  }

  private int averageScorePct(List<UserProgress> history) {
    if (history.isEmpty()) {
      return 0;
    }
    int total = history.stream().mapToInt(this::effectiveScorePct).sum();
    return Math.round((float) total / history.size());
  }

  private int scorePct(UserProgress progress) {
    if (progress.getTotalQuestions() <= 0) {
      return 0;
    }
    return Math.round((progress.getScore() * 100f) / progress.getTotalQuestions());
  }

  private List<ProgressInsightsResponse.GrammarWeakness> buildWeakAreas(List<UserProgress> history) {
    return history.stream()
        .filter(progress -> progress.getMistakes() != null && !progress.getMistakes().isEmpty())
        .filter(progress -> progress.getGrammarRule() != null && !progress.getGrammarRule().isBlank())
        .collect(Collectors.groupingBy(UserProgress::getGrammarRule))
        .entrySet()
        .stream()
        .map(
            entry -> {
            List<ProgressQuestionMistake> mistakes =
              entry.getValue().stream()
                .flatMap(progress -> progress.getMistakes().stream())
                .toList();
            SkillFocus focus = dominantSkillFocus(mistakes);
              ProgressInsightsResponse.GrammarWeakness weakness = new ProgressInsightsResponse.GrammarWeakness();
              weakness.setGrammarRule(entry.getKey());
            weakness.setMissCount(mistakes.size());
              weakness.setQuizMissCount(
              mistakes.stream()
                      .mapToInt(mistake -> "practice".equals(mistake.getSource()) ? 0 : 1)
                      .sum());
              weakness.setPracticeMissCount(
              mistakes.stream()
                      .mapToInt(mistake -> "practice".equals(mistake.getSource()) ? 1 : 0)
                      .sum());
              weakness.setChapterCount((int) entry.getValue().stream().map(UserProgress::getChapterId).distinct().count());
            if (focus != null) {
            weakness.setFocusSkillTag(focus.tag());
            weakness.setFocusSkillLabel(focus.label());
            weakness.setFocusSkillMissCount(focus.missCount());
            }
              return weakness;
            })
        .sorted(Comparator.comparingInt(ProgressInsightsResponse.GrammarWeakness::getMissCount).reversed())
        .limit(5)
        .toList();
  }

  private List<ProgressInsightsResponse.ReviewRecommendation> buildReviewQueue(List<UserProgress> history) {
    Instant now = Instant.now();
    Instant dueSoonCutoff = now.plus(Duration.ofDays(2));

    return history.stream()
      .filter(this::hasReviewSignal)
      .filter(progress -> isDueNow(progress, now) || isDueSoon(progress, now, dueSoonCutoff) || isRescue(progress))
      .sorted(
        Comparator.comparingInt((UserProgress progress) -> reviewPriority(progress, now, dueSoonCutoff))
          .thenComparing(this::nextReviewAtOrFallback, Comparator.nullsLast(Comparator.naturalOrder()))
          .thenComparingInt(this::effectiveScorePct))
        .limit(4)
        .map(
            progress -> {
              SkillFocus focus = dominantSkillFocus(progress.getMistakes());
              ProgressInsightsResponse.ReviewRecommendation recommendation = new ProgressInsightsResponse.ReviewRecommendation();
              recommendation.setStoryId(progress.getStoryId());
              recommendation.setChapterId(progress.getChapterId());
              recommendation.setGrammarRule(progress.getGrammarRule());
              recommendation.setLastScorePct(effectiveScorePct(progress));
              recommendation.setNextReviewAt(nextReviewAtOrFallback(progress));
              recommendation.setReviewStage(reviewStageOrFallback(progress, now, dueSoonCutoff));
              recommendation.setReason(reviewReason(progress, now, dueSoonCutoff, focus));
              if (focus != null) {
                recommendation.setFocusSkillTag(focus.tag());
                recommendation.setFocusSkillLabel(focus.label());
              }
              storyRepository.findById(progress.getStoryId()).map(Story::getTitle).ifPresent(recommendation::setStoryTitle);
              chapterRepository
                  .findById(progress.getChapterId())
                  .ifPresent(
                      chapter -> {
                        recommendation.setChapterTitle(chapter.getTitle());
                        recommendation.setChapterNumber(chapter.getChapterNumber());
                      });
              return recommendation;
            })
        .toList();
  }

  private List<ProgressInsightsResponse.MistakeBankItem> buildMistakeBank(List<UserProgress> history) {
    return history.stream()
        .filter(progress -> progress.getMistakes() != null && !progress.getMistakes().isEmpty())
        .flatMap(progress -> progress.getMistakes().stream().map(mistake -> toMistakeBankItem(progress, mistake)))
        .limit(12)
        .toList();
  }

  private ProgressInsightsResponse.MistakeBankItem toMistakeBankItem(
      UserProgress progress, ProgressQuestionMistake mistake) {
    ProgressInsightsResponse.MistakeBankItem item = new ProgressInsightsResponse.MistakeBankItem();
    item.setStoryId(progress.getStoryId());
    item.setChapterId(progress.getChapterId());
    item.setGrammarRule(progress.getGrammarRule());
    item.setQuestionOrder(mistake.getQuestionOrder());
    item.setSource(mistake.getSource());
    item.setSkillTag(mistake.getSkillTag());
    item.setSkillLabel(skillLabel(mistake.getSkillTag()));
    item.setQuestion(mistake.getQuestion());
    item.setSelectedAnswer(mistake.getSelectedAnswer());
    item.setCorrectAnswer(mistake.getCorrectAnswer());
    item.setExplanation(mistake.getExplanation());
    item.setCompletedAt(progress.getCompletedAt() != null ? progress.getCompletedAt().toString() : null);
    storyRepository.findById(progress.getStoryId()).map(Story::getTitle).ifPresent(item::setStoryTitle);
    chapterRepository
        .findById(progress.getChapterId())
        .ifPresent(
            chapter -> {
              item.setChapterTitle(chapter.getTitle());
              item.setChapterNumber(chapter.getChapterNumber());
            });
    return item;
  }

  private ProgressResponse toResponse(UserProgress p) {
    ProgressResponse r = new ProgressResponse();
    r.setId(p.getId());
    r.setUserId(p.getUserId());
    r.setStoryId(p.getStoryId());
    r.setChapterId(p.getChapterId());
    r.setScore(p.getScore());
    r.setBestScore(bestScoreOrLegacy(p));
    r.setPreviousScore(p.getPreviousScore());
    r.setAttemptCount(attemptCountOrLegacy(p));
    r.setTotalQuestions(p.getTotalQuestions());
    r.setPracticeScore(p.getPracticeScore());
    r.setPracticeTotal(p.getPracticeTotal());
    r.setEffectiveScorePct(effectiveScorePct(p));
    r.setCompletedAt(p.getCompletedAt());
    r.setNextReviewAt(nextReviewAtOrFallback(p));
    r.setReviewStage(reviewStageOrFallback(p, Instant.now(), Instant.now().plus(Duration.ofDays(2))));

    storyRepository.findById(p.getStoryId()).map(Story::getTitle).ifPresent(r::setStoryTitle);
    chapterRepository
        .findById(p.getChapterId())
        .ifPresent(
            c -> {
              r.setChapterTitle(c.getTitle());
              r.setChapterNumber(c.getChapterNumber());
            });

    return r;
  }

  private boolean hasLegacyOrTrackedProgress(UserProgress progress) {
    return progress.getCompletedAt() != null || progress.getAttemptCount() > 0;
  }

  private int attemptCountOrLegacy(UserProgress progress) {
    if (progress.getAttemptCount() > 0) {
      return progress.getAttemptCount();
    }
    return progress.getCompletedAt() != null ? 1 : 0;
  }

  private int bestScoreOrLegacy(UserProgress progress) {
    if (progress.getBestScore() > 0 || attemptCountOrLegacy(progress) > 1) {
      return progress.getBestScore();
    }
    return hasLegacyOrTrackedProgress(progress) ? progress.getScore() : 0;
  }

  private String determineReviewStage(int score, int totalQuestions, int practiceScore, int practiceTotal) {
    int pct = effectiveScorePct(score, totalQuestions, practiceScore, practiceTotal);
    if (pct < 60) {
      return "rescue";
    }
    if (pct < 80) {
      return "due-now";
    }
    return "due-soon";
  }

  private Instant determineNextReviewAt(Instant completedAt, int score, int totalQuestions, int practiceScore, int practiceTotal) {
    int pct = effectiveScorePct(score, totalQuestions, practiceScore, practiceTotal);
    if (pct < 60) {
      return completedAt;
    }
    if (pct < 80) {
      return completedAt.plus(Duration.ofDays(1));
    }
    if (pct < 90) {
      return completedAt.plus(Duration.ofDays(3));
    }
    return completedAt.plus(Duration.ofDays(5));
  }

  private boolean hasReviewSignal(UserProgress progress) {
    return (progress.getTotalQuestions() > 0 || progress.getPracticeTotal() > 0)
        && nextReviewAtOrFallback(progress) != null;
  }

  private boolean isRescue(UserProgress progress) {
    return "rescue".equals(storedOrDerivedReviewStage(progress));
  }

  private boolean isDueNow(UserProgress progress, Instant now) {
    Instant nextReviewAt = nextReviewAtOrFallback(progress);
    return "due-now".equals(storedOrDerivedReviewStage(progress))
        && nextReviewAt != null
        && !nextReviewAt.isAfter(now);
  }

  private boolean isDueSoon(UserProgress progress, Instant now, Instant dueSoonCutoff) {
    Instant nextReviewAt = nextReviewAtOrFallback(progress);
    return !isRescue(progress)
        && nextReviewAt != null
        && nextReviewAt.isAfter(now)
        && !nextReviewAt.isAfter(dueSoonCutoff);
  }

  private int reviewPriority(UserProgress progress, Instant now, Instant dueSoonCutoff) {
    String stage = reviewStageOrFallback(progress, now, dueSoonCutoff);
    return switch (stage) {
      case "rescue" -> 0;
      case "due-now" -> 1;
      default -> 2;
    };
  }

  private String reviewStageOrFallback(UserProgress progress, Instant now, Instant dueSoonCutoff) {
    if (isRescue(progress)) {
      return "rescue";
    }
    if (isDueNow(progress, now)) {
      return "due-now";
    }
    if (isDueSoon(progress, now, dueSoonCutoff)) {
      return "due-soon";
    }
    return storedOrDerivedReviewStage(progress);
  }

  private String reviewReason(UserProgress progress, Instant now, Instant dueSoonCutoff, SkillFocus focus) {
    String stage = reviewStageOrFallback(progress, now, dueSoonCutoff);
    boolean practiceDraggedDown = progress.getPracticeTotal() > 0 && practicePct(progress) < scorePct(progress);
    String focusSuffix = focus == null ? "" : " Focus on " + focus.label() + ".";
    return switch (stage) {
      case "rescue" -> practiceDraggedDown
          ? "Rescue this chapter now. Grammar practice accuracy fell below a stable level." + focusSuffix
          : "Rescue this chapter now. Accuracy fell below 60%." + focusSuffix;
      case "due-now" -> practiceDraggedDown
          ? "This chapter is ready for review today because the grammar practice was less secure than the quiz result."
              + focusSuffix
          : "This chapter is ready for review today before the pattern fades." + focusSuffix;
      default -> practiceDraggedDown
          ? "This chapter is due soon. A quick grammar revisit will keep the form stable." + focusSuffix
          : "This chapter is due soon. A quick revisit will keep it stable." + focusSuffix;
    };
  }

  private SkillFocus dominantSkillFocus(List<ProgressQuestionMistake> mistakes) {
    if (mistakes == null || mistakes.isEmpty()) {
      return null;
    }

    return mistakes.stream()
        .map(ProgressQuestionMistake::getSkillTag)
        .filter(Objects::nonNull)
        .map(String::trim)
        .filter(skillTag -> !skillTag.isBlank())
        .collect(Collectors.groupingBy(skillTag -> skillTag, Collectors.counting()))
        .entrySet()
        .stream()
        .sorted(
            Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder())
                .thenComparing(Map.Entry::getKey))
        .findFirst()
        .map(entry -> new SkillFocus(entry.getKey(), skillLabel(entry.getKey()), entry.getValue().intValue()))
        .orElse(null);
  }

  private String skillLabel(String skillTag) {
    if (skillTag == null || skillTag.isBlank()) {
      return null;
    }

    String label =
        Arrays.stream(skillTag.trim().split("[_\\-]+"))
            .filter(token -> !token.isBlank())
            .map(token -> Character.toUpperCase(token.charAt(0)) + token.substring(1))
            .collect(Collectors.joining(" "));
    return label.isBlank() ? null : label;
  }

  private Instant nextReviewAtOrFallback(UserProgress progress) {
    if (progress.getNextReviewAt() != null) {
      return progress.getNextReviewAt();
    }
    if (progress.getCompletedAt() == null) {
      return null;
    }
    return determineNextReviewAt(
      progress.getCompletedAt(),
      progress.getScore(),
      progress.getTotalQuestions(),
      progress.getPracticeScore(),
      progress.getPracticeTotal());
  }

  private String storedOrDerivedReviewStage(UserProgress progress) {
    if (progress.getReviewStage() != null && !progress.getReviewStage().isBlank()) {
      return progress.getReviewStage();
    }
    return determineReviewStage(
        progress.getScore(), progress.getTotalQuestions(), progress.getPracticeScore(), progress.getPracticeTotal());
  }

  private int practicePct(UserProgress progress) {
    if (progress.getPracticeTotal() <= 0) {
      return 100;
    }
    return Math.round((progress.getPracticeScore() * 100f) / progress.getPracticeTotal());
  }

  private int effectiveScorePct(UserProgress progress) {
    return effectiveScorePct(
        progress.getScore(), progress.getTotalQuestions(), progress.getPracticeScore(), progress.getPracticeTotal());
  }

  private int effectiveScorePct(int score, int totalQuestions, int practiceScore, int practiceTotal) {
    int combinedTotal = Math.max(0, totalQuestions) + Math.max(0, practiceTotal);
    if (combinedTotal <= 0) {
      return 0;
    }
    int combinedCorrect = Math.max(0, score) + Math.max(0, practiceScore);
    return Math.round((combinedCorrect * 100f) / combinedTotal);
  }

  private boolean sameAnswer(String correctAnswer, String selectedAnswer) {
    return normalizeAnswer(correctAnswer).equals(normalizeAnswer(selectedAnswer));
  }

  private String normalizeAnswer(String answer) {
    if (answer == null) {
      return "";
    }
    return answer
        .replace('\u2019', '\'')
        .toLowerCase()
        .replaceAll("\\bwon't\\b", "will not")
        .replaceAll("\\bcan't\\b", "can not")
        .replaceAll("\\bshan't\\b", "shall not")
        .replaceAll("\\bain't\\b", "is not")
        .replaceAll("\\bdoesn't\\b", "does not")
        .replaceAll("\\bdon't\\b", "do not")
        .replaceAll("\\bdidn't\\b", "did not")
        .replaceAll("\\bisn't\\b", "is not")
        .replaceAll("\\baren't\\b", "are not")
        .replaceAll("\\bwasn't\\b", "was not")
        .replaceAll("\\bweren't\\b", "were not")
        .replaceAll("\\bhaven't\\b", "have not")
        .replaceAll("\\bhasn't\\b", "has not")
        .replaceAll("\\bhadn't\\b", "had not")
        .replaceAll("\\bwouldn't\\b", "would not")
        .replaceAll("\\bshouldn't\\b", "should not")
        .replaceAll("\\bcouldn't\\b", "could not")
        .replaceAll("\\bmustn't\\b", "must not")
        .replaceAll("\\bneedn't\\b", "need not")
        .replaceAll("\\bi'm\\b", "i am")
        .replaceAll("\\b([a-z]+)'re\\b", "$1 are")
        .replaceAll("\\b([a-z]+)'ve\\b", "$1 have")
        .replaceAll("\\b([a-z]+)'ll\\b", "$1 will")
        .replaceAll("\\b([a-z]+)'d\\b", "$1 would")
        .replaceAll("[\"“”.,;:()\\[\\]{}]", " ")
        .replaceAll("[!?]+$", "")
        .replaceAll("\\s+", " ")
        .trim();
  }

  private record SkillFocus(String tag, String label, int missCount) {}
}
