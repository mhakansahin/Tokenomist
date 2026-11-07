# Implementation Plan: Spec Kit Klasörüyle Etkinleşme

**Branch**: `003-speckit-folder-activation` | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)

## Summary

`src/extension.ts` bugün `.specify/feature.json` yoksa pasif kalıyor. Bu yüzden yeni bir Spec Kit projesinde hook'lar kurulmuyor ve ilk `/speckit-specify` yakalanmıyor. Pasif kalma koşulu `.specify` klasörünün yokluğuna çevrilir. Aktif özellik olmadan da izleyici ve tracker başlar; `feature.json` sonradan oluşunca izleyicinin mevcut `featureChanged` olayı bekleyen yazım kaydını bağlar (001 data-model PendingWriting). `.specify` VS Code açıkken oluşursa bir dosya izleyicisi tracker'ı yeniden yükleme gerektirmeden başlatır.

## Technical Context

001 ile aynı (TypeScript, VS Code Extension API, `node:test`, `@vscode/test-electron`). Yeni bağımlılık yok.

## Constitution Check

| İlke / Kısıt | Durum | Not |
|---|---|---|
| I–V | ✅ | Spec 003 hazır; testler önce; yeni bağımlılık yok; küçük değişiklik |
| Kısıt 4 | ✅ | `.specify` yoksa hiçbir dosyaya yazılmaz (FR-006, SC-004) |

## Design

- `SpecKitWatcher.isSpecKitWorkspace()` → `.specify` klasörü var mı (eskiden `feature.json`).
- `activationEvents` += `workspaceContains:.specify/**` (`onStartupFinished` zaten var; bu, VS Code'un erken etkinleştirmesi için).
- `extension.ts`: tracker kurulumunu `startTracking(folder)` fonksiyonuna taşı. `.specify` yoksa pasif ol ve `RelativePattern(folder, ".specify/**")` için `onDidCreate` dinleyicisi kur; ilk olayda dinleyiciyi kapat ve `startTracking`'i çağır (FR-005).
- Status bar: aktif özellik yokken `noFeature` görünümü, metin `$(sparkle) Tokenomist · ${t("no spec yet")}`, tıklanınca "İlk spec'i `/speckit-specify` ile başlatın" bilgisi (FR-002).
- `tokenomist.analyzeSpec` aktif özellik yokken aynı bilgiyi gösterir.

## Project Structure

`src/extension.ts`, `src/app/specKitWatcher.ts`, `src/ui/statusBar.ts`, `package.json`, `l10n/`, `tests/integration/runTests.ts`, `tests/integration/suite/activation.ts`.
