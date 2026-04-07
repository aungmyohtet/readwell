package com.grammar.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FirebaseConfig {

  @Value("${firebase.credentials.json:}")
  private String credentialsJson;

  @Value("${firebase.credentials.path:}")
  private String credentialsPath;

  @jakarta.annotation.PostConstruct
  public void initialize() throws IOException {
    if (FirebaseApp.getApps().isEmpty()) {
      FirebaseOptions options =
          FirebaseOptions.builder().setCredentials(loadCredentials()).build();
      FirebaseApp.initializeApp(options);
    }
  }

  private GoogleCredentials loadCredentials() throws IOException {
    if (!credentialsJson.isBlank()) {
      InputStream stream =
          new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8));
      return GoogleCredentials.fromStream(stream);
    }
    if (!credentialsPath.isBlank()) {
      return GoogleCredentials.fromStream(new FileInputStream(credentialsPath));
    }
    throw new IllegalStateException(
        "Firebase credentials not configured. "
            + "Set firebase.credentials.json / firebase.credentials.path, "
            + "or override them with FIREBASE_CREDENTIALS_JSON / FIREBASE_CREDENTIALS_PATH.");
  }
}
