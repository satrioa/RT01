-- =============================================================================
-- 009 — Add Gemini Google provider
-- =============================================================================

-- Widen check to allow gemini
alter table public.rt_ai_settings
  drop constraint if exists rt_ai_settings_provider_check;

alter table public.rt_ai_settings
  add constraint rt_ai_settings_provider_check
  check (provider in ('openrouter','openai','anthropic','gemini','mock'));
