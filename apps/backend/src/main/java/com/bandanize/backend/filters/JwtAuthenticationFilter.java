package com.bandanize.backend.filters;

import com.bandanize.backend.services.JwtService;
import com.bandanize.backend.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                chain.doFilter(request, response);
                return;
            }

            jwt = authHeader.substring(7);
            try {
                username = jwtService.extractUsername(jwt);
            } catch (Exception e) {
                logger.debug("JWT extraction failed: {}", e.getMessage());
                chain.doFilter(request, response);
                return;
            }

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                logger.debug("Processing JWT for user: {}", username);

                UserDetails userDetails = userRepository.findByUsername(username)
                        .orElse(null);

                if (userDetails == null) {
                    logger.warn("User not found in DB: {}", username);
                } else if (!userDetails.isEnabled()) {
                    logger.debug("User is disabled, rejecting authentication: {}", username);
                } else {
                    try {
                        if (jwtService.validateToken(jwt, userDetails)) {
                            logger.debug("Token valid. Setting auth for: {}", username);
                            var authToken = new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                            SecurityContextHolder.getContext().setAuthentication(authToken);
                        } else {
                            logger.debug("Token validation failed for: {}", username);
                        }
                    } catch (Exception e) {
                        logger.warn("Token validation exception for {}: {}", username, e.getMessage());
                    }
                }
            }
            chain.doFilter(request, response);
        } catch (Exception e) {
            logger.error("Filter chain exception: {}", e.getMessage(), e);
            chain.doFilter(request, response);
        }
    }
}