# Quickstart: Doğrulama Senaryoları

Özelliğin uçtan uca çalıştığını gösteren elle ve otomatik senaryolar. Ayrıntılar: [contracts/](contracts/), [data-model.md](data-model.md).

## Önkoşullar

- VS Code ≥ 1.94, Claude Code eklentisi (`anthropic.claude-code`) kurulu ve oturum açılmış
- Node.js 22+ (yalnızca geliştirme için; `node --test` glob desteği)
- Spec Kit kurulu bir test çalışma alanı (örn. bu depo veya `tests/fixtures/workspace/`)

## Kurulum ve çalıştırma

```bash
npm ci
npm run compile
npm test                 # birim testleri (node:test)
npm run test:integration # @vscode/test-electron
```

Elle deneme: VS Code'da F5 ("Run Extension") → test çalışma alanını aç.

## Senaryolar

| # | Adım | Beklenen | Kapsar |
|---|---|---|---|
| S1 | Claude Code eklentisi devre dışıyken çalışma alanını aç | "Claude Code gerekli" bildirimi; status bar `passive`; `.claude/settings.local.json` değişmemiş | US4, FR-001 |
| S2 | İlk ayarı aç, Tasarruf modunu seç | Seviye→model tablosu: Haiku/Haiku/Sonnet | US3, FR-020 |
| S3 | Eşikleri `medium=70, complex=60` yap | Kayıt reddedilir, hata mesajı görünür | FR-021 |
| S4 | Claude Code'da `/speckit-specify <tarif>` çalıştır | Orijinal model anlık görüntüsü alınır; local `model` = `sonnet`; modal "Yeni konuşmada başla / devam" görünür; status bar `writing · Sonnet` | FR-003, R3 |
| S5 | `spec.md`'yi kaydet (plan yok) | 2 sn içinde bildirim + status bar `Level → Model?`; gerekçede ≤ 3 sinyal | FR-004, FR-009, FR-024, SC-002 |
| S6 | Kilit yokken `/speckit-plan` çalıştır | Modal açılır. "Onayla ve yeni konuşma aç" → prompt engellenir, local `model` = önerilen, yeni konuşma açılır, status bar `🔒` | FR-010–FR-013, FR-024 |
| S7 | Yeni konuşmada `/speckit-plan`, `/speckit-tasks`, `/speckit-implement` | Kapı sessiz; oturum kilitli modelde. `/model` ile kontrol edilir | FR-012, SC-004 |
| S8 | Kilitliyken `/model haiku` | VS Code modal'ı. "Geri al" → geçiş reddedilir + uyarı; "Kilidi güncelle" → kilit Haiku, özet `manualOverride` | FR-023 |
| S9 | VS Code'u kapatıp aç | Kilit sürer, status bar aynı | FR-014 |
| S10 | `tasks.md`'deki son görevi `[x]` yap | "Spec'i bitir?" isteği. Reddet → kilit sürer; onayla → local `model` S4 öncesi haline döner (yoksa silinir), özet görünür | FR-015–FR-017, SC-003 |
| S11 | Kullanım özetlerini aç | Spec satırı: seviye, model, tahmini tasarruf (Opus → %0, Sonnet → %40, Haiku → %80) | FR-018, FR-019 |
| S12 | VS Code dilini Türkçe ↔ İngilizce değiştir | Tüm metinler seçilen dilde | FR-025 |
| S13 | `ANTHROPIC_MODEL` tanımlıyken aç | Status bar `passive` + açıklama; dosyaya yazılmaz | R6 guard |
| S14 | `settings.local.json`'u bozuk JSON yap | Tokenomist yazmaz, pasif kalır, uyarır | R6 guard |
| S15 | "Claude Code Ayarlarını Temizle" komutu | Tokenomist hook ve `model` girdileri gider; kullanıcı girdileri korunur | Kısıt 4 |

## Otomatik doğrulama eşlemesi

- **Birim**: skor ve seviye (SC-005 fixture seti), eşik doğrulama, mod eşlemesi, tasarruf hesabı, settings.local.json birleştirme/geri yükleme, durum makinesi geçişleri, hook yanıt kararları (saf fonksiyon).
- **Entegrasyon**: S1, S4–S6, S8 (HTTP uç noktalarına sahte hook POST'ları ile), S9, S10, S14, S15.
- **Elle**: S7 (gerçek Claude Code oturumu), S12. Ayrıca Claude Code sürümünün `UserPromptExpansion` ve `PreModelSwitch` olaylarını gerçekten çağırdığı doğrulanır (research "Açık riskler").

## Doğrulama kaydı (2026-11-03)

Ortam: Windows 11, Claude Code CLI 2.1.316, VS Code test sürümü (`@vscode/test-electron`), Node 22.

| # | Nasıl doğrulandı | Sonuç |
|---|---|---|
| S1 | VS Code oturumu, `claudeMissing` senaryosu (`tests/integration/suite/activation.ts`) | ✅ pasif, dosya yazılmadı |
| S2 | Mod eşlemesi birim testi (`classification.test.ts`); QuickPick arayüzü elle denenmedi | ⏳ arayüz elle |
| S3 | `settingsValidation.test.ts`; hata mesajının gösterimi elle denenmedi | ⏳ mesaj elle |
| S4 | `tests/integration/writingPhase.test.ts` (gerçek dosyalar + hook sunucusu) | ✅ |
| S5 | **Gerçek Claude Code CLI** + Tracker (`claude -p`), karmaşık fixture: skor 85,8 → Opus | ✅ |
| S6 | **Gerçek CLI**: kilitsiz `/speckit-plan` → onay → prompt engellendi ("Tokenomist locked the model to Opus…"), local `model` = `opus`, maliyet 0 | ✅ |
| S7 | `lockFlow.test.ts` (yeni oturum sorulmadan geçer); gerçek panelde elle denenmedi | ⏳ elle |
| S8 | **Gerçek CLI**: kilitliyken `/model sonnet` → "Geri al" → geçiş engellendi ("Tokenomist kept the locked model Opus."), maliyet 0; "güncelle" yolu `lockFlow.test.ts` | ✅ |
| S9 | `lockFlow.test.ts` "state survives a restart" | ✅ |
| S10 | **Gerçek CLI** akışının sonunda `finish()` → `claude-opus-5-5[1m]` aynen geri geldi; onay sorusu `finishFlow.test.ts` | ✅ |
| S11 | `finishFlow.test.ts`, `savings.test.ts` | ✅ |
| S12 | `l10nCoverage.test.ts` (86 metnin hepsi TR); dil değişimi elle denenmedi | ⏳ elle |
| S13 | VS Code oturumu, `modelOverridden` senaryosu | ✅ |
| S14 | `lockFlow.test.ts` "a broken settings.local.json is never overwritten" | ✅ |
| S15 | `cleanup.test.ts`, `uninstall.test.ts` | ✅ |

Açık: S2, S3 (arayüz kısmı), S7 ve S12, eklentiyi F5 ile gerçek Claude Code paneliyle açıp elle denenmeli.
