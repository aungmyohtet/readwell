package com.grammar.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.grammar.backend.dto.ProgressResponse;
import com.grammar.backend.dto.SubmitProgressRequest;
import com.grammar.backend.model.Chapter;
import com.grammar.backend.model.Story;
import com.grammar.backend.model.UserProgress;
import com.grammar.backend.model.UserProgressAttempt;
import com.grammar.backend.repository.ChapterRepository;
import com.grammar.backend.repository.StoryRepository;
import com.grammar.backend.repository.UserProgressAttemptRepository;
import com.grammar.backend.repository.UserProgressRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProgressServiceTest {

  @Mock private UserProgressRepository progressRepository;
  @Mock private UserProgressAttemptRepository attemptRepository;
  @Mock private StoryRepository storyRepository;
  @Mock private ChapterRepository chapterRepository;

  private ProgressService progressService;

  @BeforeEach
  void setUp() {
    progressService = new ProgressService(progressRepository, attemptRepository, storyRepository, chapterRepository);
    when(progressRepository.save(any(UserProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(attemptRepository.save(any(UserProgressAttempt.class))).thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void submitFirstAttemptTracksSummaryAndAttemptHistory() {
    Chapter chapter = chapterWithQuestions();
    when(chapterRepository.findById("chapter-1")).thenReturn(Optional.of(chapter));
    when(progressRepository.findByUserIdAndChapterId("user-1", "chapter-1")).thenReturn(Optional.empty());
    when(storyRepository.findById("story-1")).thenReturn(Optional.of(story()));

    ProgressResponse response = progressService.submit("user-1", request("story-1", "chapter-1", List.of("A", "D")));

    assertThat(response.getScore()).isEqualTo(1);
    assertThat(response.getAttemptCount()).isEqualTo(1);
    assertThat(response.getBestScore()).isEqualTo(1);
    assertThat(response.getPreviousScore()).isNull();

    ArgumentCaptor<UserProgressAttempt> attemptCaptor = ArgumentCaptor.forClass(UserProgressAttempt.class);
    verify(attemptRepository).save(attemptCaptor.capture());
    assertThat(attemptCaptor.getValue().getMistakes()).hasSize(1);
  }

  @Test
  void submitRepeatAttemptPreservesHistoryAndUpdatesTrendFields() {
    Chapter chapter = chapterWithQuestions();
    UserProgress existing = new UserProgress();
    existing.setUserId("user-1");
    existing.setStoryId("story-1");
    existing.setChapterId("chapter-1");
    existing.setScore(1);
    existing.setBestScore(1);
    existing.setAttemptCount(1);
    existing.setCompletedAt(Instant.parse("2026-04-01T12:00:00Z"));

    when(chapterRepository.findById("chapter-1")).thenReturn(Optional.of(chapter));
    when(progressRepository.findByUserIdAndChapterId("user-1", "chapter-1")).thenReturn(Optional.of(existing));
    when(storyRepository.findById("story-1")).thenReturn(Optional.of(story()));

    ProgressResponse response = progressService.submit("user-1", request("story-1", "chapter-1", List.of("A", "B")));

    assertThat(response.getScore()).isEqualTo(2);
    assertThat(response.getAttemptCount()).isEqualTo(2);
    assertThat(response.getBestScore()).isEqualTo(2);
    assertThat(response.getPreviousScore()).isEqualTo(1);
  }

  private SubmitProgressRequest request(String storyId, String chapterId, List<String> answers) {
    SubmitProgressRequest request = new SubmitProgressRequest();
    request.setStoryId(storyId);
    request.setChapterId(chapterId);
    request.setScore(0);
    request.setTotalQuestions(answers.size());
    request.setQuestionAttempts(
        answers.stream()
            .map(
                answer -> {
                  SubmitProgressRequest.QuestionAttemptRequest attempt = new SubmitProgressRequest.QuestionAttemptRequest();
                  attempt.setQuestionOrder(request.getQuestionAttempts() == null ? 1 : request.getQuestionAttempts().size() + 1);
                  attempt.setSelectedAnswer(answer);
                  return attempt;
                })
            .toList());
    for (int i = 0; i < request.getQuestionAttempts().size(); i++) {
      request.getQuestionAttempts().get(i).setQuestionOrder(i + 1);
    }
    return request;
  }

  private Chapter chapterWithQuestions() {
    Chapter chapter = new Chapter();
    chapter.setId("chapter-1");
    chapter.setStoryId("story-1");
    chapter.setTitle("Chapter 1");
    chapter.setChapterNumber(1);

    Chapter.GrammarFocus grammarFocus = new Chapter.GrammarFocus();
    grammarFocus.setRule("First Conditional");
    chapter.setGrammarFocus(grammarFocus);

    Chapter.ComprehensionQuestion q1 = new Chapter.ComprehensionQuestion();
    q1.setOrder(1);
    q1.setQuestion("Question 1");
    q1.setCorrectAnswer("A");
    q1.setExplanation("Explanation 1");

    Chapter.ComprehensionQuestion q2 = new Chapter.ComprehensionQuestion();
    q2.setOrder(2);
    q2.setQuestion("Question 2");
    q2.setCorrectAnswer("B");
    q2.setExplanation("Explanation 2");

    chapter.setComprehension(List.of(q1, q2));
    return chapter;
  }

  private Story story() {
    Story story = new Story();
    story.setId("story-1");
    story.setTitle("Story 1");
    return story;
  }
}