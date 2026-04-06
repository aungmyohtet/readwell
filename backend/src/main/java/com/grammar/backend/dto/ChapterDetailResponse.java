package com.grammar.backend.dto;

import com.grammar.backend.model.Chapter;
import java.util.List;
import lombok.Data;

@Data
public class ChapterDetailResponse {
  private String id;
  private String storyId;
  private int chapterNumber;
  private String title;
  private List<Chapter.VocabularyItem> vocabulary;
  private Chapter.GrammarFocus grammarFocus;
  private List<Chapter.Paragraph> content;
  private List<Chapter.ComprehensionQuestion> comprehension;
  private boolean completed;
  private int score;
}
