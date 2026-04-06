package com.grammar.backend.config;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class FirebaseAuthFilter extends OncePerRequestFilter {

  private static final String AUTHORIZATION = "Authorization";
  private static final String BEARER = "Bearer ";

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {

    String token = extractToken(request);

    if (token != null) {
      try {
        FirebaseToken decoded = FirebaseAuth.getInstance().verifyIdToken(token);
        String uid = decoded.getUid();
        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(uid, null, null);
        SecurityContextHolder.getContext().setAuthentication(authentication);
      } catch (FirebaseAuthException e) {
        SecurityContextHolder.clearContext();
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired token");
        return;
      }
    }

    chain.doFilter(request, response);
  }

  private String extractToken(HttpServletRequest request) {
    String header = request.getHeader(AUTHORIZATION);
    if (StringUtils.hasText(header) && header.startsWith(BEARER)) {
      return header.substring(BEARER.length());
    }
    return null;
  }
}
