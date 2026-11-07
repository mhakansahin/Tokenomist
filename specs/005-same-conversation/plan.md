# Implementation Plan: Tek Konuşma Modu

**Branch**: `005-same-conversation` | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)

## Summary

Yeni ayar `tokenomist.conversation`: `same` (varsayılan) ya da `new` (004).

`same` yönteminde Tokenomist modeli Claude Code ayarına değil, Spec Kit komut tanımlarının YAML başlığına yazar: `model: <değer> # tokenomist`. Claude Code bu alanı o komutun turu için kullanır (research R1, doğrulandı). Yazım ve aşama tanımları önceden güncel tutulur; böylece komut anında bir yarış oluşmaz (R3). Git ile izlenen tanımlar skip-worktree ile gizlenir (R4). Her değişikliğin özgün içeriği saklanır ve bitişte, temizlemede ve kaldırmada bayt bayt geri yazılır (SC-003).

## Technical Context

001–004 ile aynı. Yeni npm bağımlılığı yok. Git, sistemde varsa `execFile` ile çağrılan bir komut olarak kullanılıyor; yoksa gizleme atlanıyor.

## Constitution Check

| İlke / Kısıt | Durum | Not |
|---|---|---|
| I–III, V | ✅ | Spec + kararlar hazır; testler önce |
| IV. Teknoloji | ✅ | Yeni paket yok. Git, kullanıcının zaten kullandığı bir sistem aracı; çalışma zamanında yoksa özellik gizlemesiz çalışır (Complexity Tracking) |
| Kısıt 2 | ✅ | Ağ yok |
| Kısıt 4 | ✅ | Bu yöntemde Claude Code ayarına hiç yazılmıyor; tanımlar bayt bayt geri yükleniyor |

## Design

- `src/domain/skillFrontmatter.ts` (saf): `withModel(text, value)` başlıktaki `model:` satırını Tokenomist satırıyla değiştirir ya da ekler; başlık yoksa başlık oluşturur. `hasTokenomistModel(text)` ise satırın Tokenomist'e ait olup olmadığını söyler.
- `src/app/skillModelStore.ts`:
  - `locate(commandName)` → R5 yolları.
  - `apply(path, value)` → özgün içerik ilk yazımda saklanır; izleniyorsa skip-worktree uygulanır.
  - `restore(path)` → özgün içerik bayt bayt geri yazılır ve `--no-skip-worktree` uygulanır.
  - `restoreAll()`.
  - Özgün içerikler ve gizlenen yollar `RestoreLedger` girdisine (`skills`) kaydedilir; `src/uninstall.ts` de onları geri alır.
- `src/app/tracker.ts` (`conversation === "same"`):
  - `syncModelKey` yerel `model` anahtarını sahiplenmez; sahipliği varsa orijinale döndürür.
  - `syncSkills()` istenen durumu hesaplar: yazım tanımları ← yazım modeli; aşama tanımları ← kilit ?? (otomatik ise öneri). Ardından `apply`/`restore` çağırır. Analizden, kilitten, bitişten, yöntem değişikliğinden ve ayar değişikliğinden sonra çalışır.
  - `handleExpansion`: tanımı bulunan komutlar için `askWriting` ve `askSessionMismatch` → izin. `askUnlockedPlan` için otomatik modda kilitle ve izin ver; sorarak modda sor, onayda kilitle ve "bu konuşmada tekrar yaz" diye durdur (FR-006). Tanımı bulunmayan komut 004 akışına düşer (FR-007).
  - `cleanClaudeSettings` → `restoreAll`.
- Ayar `tokenomist.conversation` + ilk ayar ekranında seçim; status bar ipucunda yöntem.

## Project Structure

`src/domain/skillFrontmatter.ts` (yeni), `src/app/skillModelStore.ts` (yeni), `src/app/restoreLedger.ts`, `src/app/tracker.ts`, `src/uninstall.ts`, `src/ui/settings.ts`, `src/ui/setup.ts`, `src/ui/statusBar.ts`, `src/extension.ts`, `package.json`, `l10n/`, testler.

## Complexity Tracking

| Karar | Neden gerekli | Daha basit alternatif neden reddedildi |
|---|---|---|
| Sistemdeki `git` aracını çağırmak | FR-004: izlenen dosyadaki değişikliği git'ten gizlemenin tek yolu | Kişisel skill klasörü bütün projelere sızar (research R2); dosyayı gizlemeden değiştirmek kullanıcının istemediği git kirliliği yaratır |
