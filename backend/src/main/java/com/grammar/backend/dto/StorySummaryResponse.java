package com.grammar.backend.dto;

import java.util.List;
import lombok.Data;

@Data
public class StorySummaryResponse {
  private String id;
  private String title;
  private String description;
  private String level;
  private String coverEmoji;
  private String coverImageUrl;
  private String author;
  private List<String> tags;
  private List<String> grammarRules;
  private int totalChapters;
}
