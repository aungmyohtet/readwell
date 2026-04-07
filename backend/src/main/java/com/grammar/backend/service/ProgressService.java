package com.grammar.backend.service;

import com.grammar.backend.dto.ProgressResponse;
import com.grammar.backend.dto.ProgressInsightsResponse;
import com.grammar.backend.dto.SubmitProgressRequest;
import com.grammar.backend.model.Chapter;
import com.grammar.backend.model.Story;
import com.grammar.backend.model.UserProgress;
import com.grammar.backend.repository.ChapterRepository;
import com.grammar.backend.repository.StoryRepository;
import com.grammar.backend.repository.UserProgressRepository;
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
  private final StoryRepository storyRepository;
  private final ChapterRepository chapterRepository;

  public ProgressService(
      UserProgressRepository progressRepository,
      StoryRepository storyRepository,
      ChapterRepository chapterRepository) {
    this.progressRepository = progressRepository;
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

    List<UserProgress.QuestionMistake> mistakes = buildMistakes(chapterOpt.orElse(null), req);
    progress.setMistakes(mistakes);

    int totalQuestions =
        chapterOpt.map(Chapter::getComprehension).map(List::size).filter(size -> size > 0).orElse(req.getTotalQuestions());
    int score = req.getScore();
    if (!mistakes.isEmpty() && totalQuestions > 0) {
      score = Math.max(0, totalQuestions - mistakes.size());
    }

    progress.setScore(score);
    progress.setTotalQuestions(totalQuestions);
    progress.setCompletedAt(Instant.now());

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

  private List<UserProgress.QuestionMistake> buildMistakes(Chapter chapter, SubmitProgressRequest req) {
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

    List<UserProgress.QuestionMistake> mistakes = new ArrayList<>();
    for (SubmitProgressRequest.QuestionAttemptRequest attempt : req.getQuestionAttempts()) {
      Chapter.ComprehensionQuestion question = questionMap.get(attempt.getQuestionOrder());
      if (question == null || Objects.equals(question.getCorrectAnswer(), attempt.getSelectedAnswer())) {
        continue;
      }

      UserProgress.QuestionMistake mistake = new UserProgress.QuestionMistake();
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
    return history.stream()
        .filter(progress -> progress.getTotalQuestions() > 0)
        .filter(progress -> scorePct(progress) < 80)
        .sorted(Comparator.comparingInt(this::scorePct).thenComparing(UserProgress::getCompletedAt, Comparator.reverseOrder()))
        .limit(4)
        .map(
            progress -> {
              ProgressInsightsResponse.ReviewRecommendation recommendation = new ProgressInsightsResponse.ReviewRecommendation();
              recommendation.setStoryId(progress.getStoryId());
              recommendation.setChapterId(progress.getChapterId());
              recommendation.setGrammarRule(progress.getGrammarRule());
              recommendation.setLastScorePct(scorePct(progress));
              recommendation.setReason(
                  scorePct(progress) < 60
                      ? "Priority review: accuracy is below 60%."
                      : "Review this chapter before moving too far ahead.");
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
      UserProgress progress, UserProgress.QuestionMistake mistake) {
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
    r.setTotalQuestions(p.getTotalQuestions());
    r.setCompletedAt(p.getCompletedAt());

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
}
