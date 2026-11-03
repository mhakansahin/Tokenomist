# Contract: VS Code Katkıları (komutlar, ayarlar, status bar)

Kullanıcının gördüğü arayüz. Tüm başlık ve metinler `en` + `tr` yerelleştirilir (FR-025).

## Commands

| Komut ID | Başlık (en / tr) | Davranış | FR |
|---|---|---|---|
| `tokenomist.analyzeSpec` | Analyze Active Spec / Aktif Spec'i Analiz Et | Analizi çalıştırır, öneri penceresini açar | FR-004, FR-024 |
| `tokenomist.showRecommendation` | Review Model Recommendation / Model Önerisini Gör | Onay penceresini (seviye, skor, gerekçe, model seçimi) açar | FR-009, FR-010 |
| `tokenomist.finishSpec` | Finish Spec / Spec'i Bitir | Onay ister, orijinal modeli geri yükler, özeti gösterir | FR-015–FR-017 |
| `tokenomist.showSummaries` | Show Usage Summaries / Kullanım Özetlerini Göster | Tamamlanan spec'ler listesi | FR-019 |
| `tokenomist.openSetup` | Open Setup / İlk Ayarı Aç | Mod seçimi + seviye→model tablosu | FR-020 |
| `tokenomist.cleanClaudeSettings` | Remove Tokenomist from Claude Code Settings / Claude Code Ayarlarını Temizle | Tokenomist'in `model` ve hook girdilerini kaldırır, orijinal modeli geri yükler | Kısıt 4 |

## Onay penceresi (öneri)

Modal olmayan QuickPick: başlıkta `"<spec adı> · <Seviye> (skor N)"`, öğeler:
1. `✓ <Önerilen model> (önerilen)`: onay
2. Diğer iki model: elle seçim (`manualOverride=true`)

Açıklama satırında en fazla 3 gerekçe. Seçimden sonra bildirim: "Model <X> olarak kilitlendi. [Yeni konuşma başlat]". Kapatılırsa durum `awaitingApproval` kalır.

## Status bar (FR-013)

Tek öğe, sol hizalı. Tıklanınca bağlama göre komut çalışır.

| Durum | Metin | Tıklama |
|---|---|---|
| Claude Code yok / Spec Kit yok / model dışarıdan sabitlenmiş | `$(circle-slash) Tokenomist: passive` | Neden açıklaması |
| writing | `$(edit) <spec> · writing · Sonnet` | — |
| awaitingApproval | `$(warning) <spec> · Medium → Sonnet?` | `showRecommendation` |
| locked | `$(lock) <spec> · Complex · Opus` | `showRecommendation` (salt okunur ayrıntı) |
| completionPending | `$(check) <spec> · finish?` | `finishSpec` |
| Hook kapısı çalışmıyor | Önceki metne `$(debug-disconnect)` eklenir | Açıklama |

## Settings

[data-model.md › ModeSettings](../data-model.md#modesettings-vs-code-ayarları-fr-020-fr-021-fr-003) bölümündeki `tokenomist.*` anahtarları, `contributes.configuration` ile, `scope: "window"`.

## Activation

`onStartupFinished` + `workspaceContains:.specify/feature.json`. Etkinleşmede Claude Code eklentisi (`anthropic.claude-code`) aranır. Yoksa pasif bildirim gösterilir, hiçbir dosyaya yazılmaz (FR-001).
