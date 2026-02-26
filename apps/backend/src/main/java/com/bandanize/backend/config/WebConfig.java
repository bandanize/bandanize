package com.bandanize.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WebConfig implements org.springframework.web.servlet.config.annotation.WebMvcConfigurer {

    @org.springframework.beans.factory.annotation.Value("${storage.location}")
    private String storageLocation;

    @Override
    public void addResourceHandlers(
            org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry registry) {
        String location = storageLocation;
        if (location == null || location.trim().isEmpty()) {
            location = "uploads";
        }

        // Ensure trailing slash
        if (!location.endsWith("/")) {
            location += "/";
        }

        // Map /uploads/** (legacy) and /api/uploads/** (new) to the file system
        // directory
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(java.nio.file.Paths.get(location).toUri().toString())
                .setCacheControl(org.springframework.http.CacheControl.maxAge(365, java.util.concurrent.TimeUnit.DAYS)
                        .cachePublic());
        registry.addResourceHandler("/api/uploads/**")
                .addResourceLocations(java.nio.file.Paths.get(location).toUri().toString())
                .setCacheControl(org.springframework.http.CacheControl.maxAge(365, java.util.concurrent.TimeUnit.DAYS)
                        .cachePublic());
    }
}