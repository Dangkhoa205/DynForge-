package com.dynforge.be.service;

import com.dynforge.be.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Thin client for the Google Gemini REST API with <b>Auto Model Cascade</b>.
 * <p>
 * When a model returns HTTP 429 (quota exceeded), the client automatically
 * retries with the next model in the fallback chain. This ensures maximum
 * uptime on the free tier without any manual intervention.
 * <p>
 * Fallback priority (highest quota first):
 * <ol>
 *   <li>gemini-3.5-flash-lite — 500 RPD, 15 RPM</li>
 *   <li>gemini-3.1-flash-lite — 500 RPD, 15 RPM</li>
 *   <li>gemini-3.5-flash      — 20 RPD, 5 RPM</li>
 *   <li>gemini-3-flash         — 20 RPD, 5 RPM</li>
 *   <li>gemini-3.6-flash       — 20 RPD, 5 RPM</li>
 *   <li>gemini-2.5-flash-lite  — 20 RPD, 10 RPM</li>
 * </ol>
 * Docs: https://ai.google.dev/api/rest/v1beta/models/generateContent
 */
@Slf4j
@Component
public class GeminiClient {

    private final RestClient restClient;
    private final String apiKey;

    /**
     * Ordered fallback chain matching Google AI Studio Quota Dashboard.
     * Lite models first (500 RPD each = 1,000 RPD), then Flash models (20 RPD each).
     * Total pool: >1,100 requests/day completely free.
     */
    private static final List<String> MODEL_CASCADE = List.of(
            "gemini-3.5-flash-lite",   // 500 RPD, 15 RPM (Đang hoạt động tốt)
            "gemini-3.1-flash-lite",   // 500 RPD, 15 RPM (Dự phòng 500 RPD)
            "gemini-3.8-flash",        //  20 RPD,  5 RPM (Flash mạnh nhất)
            "gemini-3.7-flash",        //  20 RPD,  5 RPM
            "gemini-3.6-flash",        //  20 RPD,  5 RPM
            "gemini-3.5-flash",        //  20 RPD,  5 RPM
            "gemini-3-flash",          //  20 RPD,  5 RPM
            "gemini-2.5-flash-lite",   //  20 RPD, 10 RPM
            "gemini-2.5-flash"         //  20 RPD,  5 RPM
    );

    public GeminiClient(
            @Value("${gemini.base-url:https://generativelanguage.googleapis.com}") String baseUrl,
            @Value("${gemini.api-key:}") String apiKey
    ) {
        this.restClient = RestClient.create(baseUrl);
        this.apiKey = apiKey;
        log.info("GeminiClient initialized — Auto Model Cascade enabled with {} models: {}",
                MODEL_CASCADE.size(), MODEL_CASCADE);
    }

    /** Returns true if a valid Google Gemini API key is configured. */
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Sends a prompt to Google Gemini API with automatic model fallback.
     * Tries each model in {@link #MODEL_CASCADE} until one succeeds or all fail.
     *
     * @param systemPrompt system instruction persona / rule
     * @param userPrompt   user input / context
     * @param maxTokens    max output token count
     */
    public String complete(String systemPrompt, String userPrompt, int maxTokens) {
        if (!isConfigured()) {
            throw new BadRequestException(
                    "Tính năng DynForge AI chưa được cấu hình. Vui lòng đặt gemini.api-key trong application.properties.");
        }

        // Build request body (shared across all model attempts)
        Map<String, Object> body = new LinkedHashMap<>();

        if (systemPrompt != null && !systemPrompt.isBlank()) {
            body.put("systemInstruction", Map.of(
                    "parts", List.of(Map.of("text", systemPrompt))
            ));
        }

        body.put("contents", List.of(
                Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", userPrompt))
                )
        ));

        body.put("generationConfig", Map.of(
                "maxOutputTokens", maxTokens,
                "temperature", 0.5
        ));

        // Try each model in the cascade
        Exception lastException = null;

        for (String model : MODEL_CASCADE) {
            try {
                Map<?, ?> resp = callGemini(model, body);
                String text = extractText(resp);
                if (text != null) {
                    return text;
                }
                log.warn("Model {} returned empty response, trying next model...", model);
            } catch (Exception e) {
                lastException = e;
                String msg = e.getMessage() != null ? e.getMessage() : "";
                if (msg.contains("429") || msg.contains("RESOURCE_EXHAUSTED")
                        || msg.contains("503") || msg.contains("UNAVAILABLE")
                        || msg.contains("high demand") || msg.contains("500")
                        || msg.contains("502") || msg.contains("504")) {
                    log.warn("⚡ Model [{}] unavailable or quota exceeded ({}) → switching to next model in cascade...", model, msg);
                } else {
                    // Non-transient error (e.g. 400 Bad Request, 401 Unauthorized) — don't cascade, throw immediately
                    log.error("DynForge AI call failed on model [{}]: {}", model, msg);
                    throw new BadRequestException("Không thể kết nối với DynForge AI: " + msg);
                }
            }
        }

        // All models exhausted
        String msg = lastException != null ? lastException.getMessage() : "All models exhausted";
        log.error("All {} models in cascade exhausted. Last error: {}", MODEL_CASCADE.size(), msg);
        throw new BadRequestException("Không thể kết nối với DynForge AI: " + msg);
    }

    // ──────────────────────────── Private helpers ────────────────────────────

    /** Calls the Gemini generateContent endpoint for a specific model. */
    private Map<?, ?> callGemini(String model, Map<String, Object> body) {
        Map<?, ?> resp = restClient.post()
                .uri("/v1beta/models/{model}:generateContent", model)
                .header("X-goog-api-key", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class);

        if (resp == null) {
            throw new BadRequestException("DynForge AI không trả về dữ liệu.");
        }
        return resp;
    }

    /** Extracts text from Gemini response: candidates[0].content.parts[0].text */
    private String extractText(Map<?, ?> resp) {
        Object candidatesObj = resp.get("candidates");
        if (candidatesObj instanceof List<?> candidates && !candidates.isEmpty()) {
            Object firstCand = candidates.get(0);
            if (firstCand instanceof Map<?, ?> candMap) {
                Object contentMapObj = candMap.get("content");
                if (contentMapObj instanceof Map<?, ?> contentMap) {
                    Object partsObj = contentMap.get("parts");
                    if (partsObj instanceof List<?> parts) {
                        StringBuilder sb = new StringBuilder();
                        for (Object p : parts) {
                            if (p instanceof Map<?, ?> pMap && pMap.containsKey("text")) {
                                sb.append(String.valueOf(pMap.get("text")));
                            }
                        }
                        if (!sb.isEmpty()) {
                            return sb.toString();
                        }
                    }
                }
            }
        }
        return null;
    }
}
