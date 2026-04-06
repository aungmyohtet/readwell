package com.grammar.backend.model;

import java.util.List;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "chapters")
public class Chapter {

  @Id private String id;

  @Indexed private String storyId;

  private int chapterNumber;

  private String title;

  private List<VocabularyItem> vocabulary;

  private GrammarFocus grammarFocus;

  private List<Paragraph> content;

  private List<ComprehensionQuestion> comprehension;

  @Data
  public static class VocabularyItem {
    private String word;
    private String definition;
    private String exampleSentence;
    private String emoji;
  }

  @Data
  public static class GrammarFocus {
    private String rule;
    private String explanation;
    private List<String> examples;
  }

  @Data
  public static class Paragraph {
    private int order;
    private String text;
    /** Emoji placeholder shown when no image is available */
    private String imagePlaceholder;

    private String imageUrl;
  }

  @Data
  public static class ComprehensionQuestion {
    private int order;
    private String question;
    private List<String> options;
    private String correctAnswer;
    private String explanation;
  }
}
