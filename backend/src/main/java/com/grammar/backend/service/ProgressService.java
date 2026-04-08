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

    List<ProgressQuestionMistake> mistakes = buildMistakes(chapterOpt.orElse(null), req);
    progress.setMistakes(mistakes);

    int totalQuestions =
        chapterOpt.map(Chapter::getComprehension).map(List::size).filter(size -> size > 0).orElse(req.getTotalQuestions());
    int score = req.getScore();
    if (req.getQuestionAttempts() != null && !req.getQuestionAttempts().isEmpty() && totalQuestions > 0) {
      score = Math.max(0, totalQuestions - mistakes.size());
    }

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
    attempt.setCompletedAt(completedAt);
    attempt.setMistakes(mistakes);
    attemptRepository.save(attempt);

    progress.setScore(score);
    progress.setBestScore(Math.max(previousBestScore, score));
    progress.setPreviousScore(previousScore);
    progress.setAttemptCount(previousAttemptCount + 1);
    progress.setTotalQuestions(totalQuestions);
    progress.setCompletedAt(completedAt);
    progress.setReviewStage(determineReviewStage(score, totalQuestions));
    progress.setNextReviewAt(determineNextReviewAt(completedAt, score, totalQuestions));

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

  private List<ProgressQuestionMistake> buildMistakes(Chapter chapter, SubmitProgressRequest req) {
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
      mistake.setQuestion(question.getQuestion());
      mistake.setSelectedAnswer(attempt.getSelectedAnswer());
      mistake.setCorrectAnswer(question.getCorrectAnswer());
      mistake.setExplanation(question.getExplanation());
      mistakes.add(mistake);
    }
    return mistakes;
  }

  private int averageScorePct(List<UserProgress> history) {
    if (history.isEmpty()) {
      return 0;
    }
    int total = history.stream().mapToInt(this::scorePct).sum();
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
              ProgressInsightsResponse.GrammarWeakness weakness = new ProgressInsightsResponse.GrammarWeakness();
              weakness.setGrammarRule(entry.getKey());
              weakness.setMissCount(entry.getValue().stream().mapToInt(progress -> progress.getMistakes().size()).sum());
              weakness.setChapterCount((int) entry.getValue().stream().map(UserProgress::getChapterId).distinct().count());
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
          .thenComparingInt(this::scorePct))
        .limit(4)
        .map(
            progress -> {
              ProgressInsightsResponse.ReviewRecommendation recommendation = new ProgressInsightsResponse.ReviewRecommendation();
              recommendation.setStoryId(progress.getStoryId());
              recommendation.setChapterId(progress.getChapterId());
              recommendation.setGrammarRule(progress.getGrammarRule());
              recommendation.setLastScorePct(scorePct(progress));
              recommendation.setNextReviewAt(nextReviewAtOrFallback(progress));
          recommendation.setReviewStage(reviewStageOrFallback(progress, now, dueSoonCutoff));
          recommendation.setReason(reviewReason(progress, now, dueSoonCutoff));
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

  private String determineReviewStage(int score, int totalQuestions) {
    int pct = totalQuestions > 0 ? Math.round((score * 100f) / totalQuestions) : 0;
    if (pct < 60) {
      return "rescue";
    }
    if (pct < 80) {
      return "due-now";
    }
    return "due-soon";
  }

  private Instant determineNextReviewAt(Instant completedAt, int score, int totalQuestions) {
    int pct = totalQuestions > 0 ? Math.round((score * 100f) / totalQuestions) : 0;
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
    return progress.getTotalQuestions() > 0 && nextReviewAtOrFallback(progress) != null;
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

  private String reviewReason(UserProgress progress, Instant now, Instant dueSoonCutoff) {
    String stage = reviewStageOrFallback(progress, now, dueSoonCutoff);
    return switch (stage) {
      case "rescue" -> "Rescue this chapter now. Accuracy fell below 60%.";
      case "due-now" -> "This chapter is ready for review today before the pattern fades.";
      default -> "This chapter is due soon. A quick revisit will keep it stable.";
    };
  }

  private Instant nextReviewAtOrFallback(UserProgress progress) {
    if (progress.getNextReviewAt() != null) {
      return progress.getNextReviewAt();
    }
    if (progress.getCompletedAt() == null) {
      return null;
    }
    return determineNextReviewAt(progress.getCompletedAt(), progress.getScore(), progress.getTotalQuestions());
  }

  private String storedOrDerivedReviewStage(UserProgress progress) {
    if (progress.getReviewStage() != null && !progress.getReviewStage().isBlank()) {
      return progress.getReviewStage();
    }
    return determineReviewStage(progress.getScore(), progress.getTotalQuestions());
  }
}
