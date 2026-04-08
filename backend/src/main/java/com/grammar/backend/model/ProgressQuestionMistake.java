package com.grammar.backend.model;

import lombok.Data;

@Data
public class ProgressQuestionMistake {
  private int questionOrder;
  private String question;
  private String selectedAnswer;
  private String correctAnswer;
  private String explanation;
}