package com.grammar.backend.model;

import java.util.List;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "stories")
public class Story {

  @Id private String id;

  private String title;

  private String description;

  /** A2, B1, B2 */
  @Indexed private String level;

  /** Emoji used as cover placeholder when no image is available */
  private String coverEmoji;

  private String coverImageUrl;

  private String author;

  private List<String> tags;

  private int totalChapters;
}
