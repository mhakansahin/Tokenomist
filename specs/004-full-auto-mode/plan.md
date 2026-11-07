# Implementation Plan: Tam Otomatik Mod

**Branch**: `004-full-auto-mode` | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)

## Summary

`tokenomist.automation` ayarı (`auto` varsayılan, `ask`) eklenir. Otomatik modda tracker kapı kararlarındaki `ask*` dallarını kullanıcıya sormadan uygular:
- `askUnlockedPlan` → en son öneriyle kilitle ve yeni konuşma aç.
- `askSessionMismatch` ve `askWriting` → yeni konuşma aç.
- Görevler bitince → sormadan bitir.

Yeni konuşma Claude Code'un belgelenmemiş `primaryEditor.open(undefined, prompt)` komutuyla açılır ve durdurulan komut giriş kutusuna hazır yazılır (research R1). Kilit plan başlarken yapılır (R2). `/model` geçişi yine sorulur (FR-011).

## Technical Context

001/002 ile aynı. Yeni bağımlılık yok.

## Constitution Check

| İlke / Kısıt | Durum | Not |
|---|---|---|
| I–V | ✅ | Spec + clarify hazır; testler önce; yeni bağımlılık yok |
| Kısıt 3 | ✅ | Öneri kuralı değişmez; yalnızca sorulup sorulmaması değişir |
| Kısıt 4 | ✅ | Bitişte orijinal model yine aynen geri yüklenir |

## Design

- `TrackerSettings.automation: "auto" | "ask"`; okuma `src/ui/settings.ts`.
- `TrackerDeps.newConversation(prompt?: string): Promise<boolean>` — `true` = hazır metinle açıldı.
- `tracker.handleExpansion`: `auto` iken `askWriting`/`askUnlockedPlan`/`askSessionMismatch` soru sormadan uygulanır; `askUnlockedPlan` öneri yoksa `ask` akışına düşer.
- `blockForNewConversation(signal, command, prompt, lockedModel)`: R3 debounce, hazır metin, mesaj (FR-007, FR-008).
- `tracker.onSpecSaved`: `auto` iken `recommendationReady` bildirimi gösterilmez (FR-002).
- `tracker.onPlanCreated`: `auto` ve kilit yoksa en son öneriyle kilitle (R2, hook'suz geri düşüş).
- `tracker.askAndFinish`: `auto` iken doğrudan `finish()` (FR-006).
- `tracker.changeLockedModel()` + `tokenomist.changeModel` komutu: kilitliyken model seçtirir, kilidi günceller (`manualOverride=true`). Otomatik kilit bildiriminin "Değiştir" düğmesi bu komutu çağırır (FR-002).
- Status bar: `auto` + `awaitingApproval` → `… · Basit → Haiku (auto)`.

## Project Structure

`src/app/tracker.ts`, `src/ui/settings.ts`, `src/ui/recommendation.ts`, `src/ui/statusBar.ts`, `src/extension.ts`, `package.json`, `l10n/`, `tests/integration/autoMode.test.ts` (yeni), `tests/integration/helpers.ts`.
