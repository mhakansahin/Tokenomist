# Quickstart: Özel Claude Model Eşlemesi

Önkoşullar ve çalıştırma 001 ile aynıdır ([001 quickstart](../001-spec-model-routing/quickstart.md)).

| # | Adım | Beklenen | Kapsar |
|---|---|---|---|
| C1 | Mod Tasarruf/Dengeli/Kalite; 001 testlerini çalıştır | Hepsi değişmeden geçer | SC-002 |
| C2 | İlk ayar → Özel; karmaşık = `opus[1m]`, diğerleri boş | Tablo: Basit → Haiku · Orta → Sonnet · Karmaşık → Opus 1M | FR-001, FR-012, FR-013 |
| C3 | Karmaşık spec analiz et → onayla | Öneri "Opus 1M"; `settings.local.json` `model` = `"opus[1m]"`; status bar `… · Karmaşık · Opus 1M` | US1, FR-007, FR-008, SC-005 |
| C4 | Bir hücreye `gpt-5`, `opus[2m]`, `default` yaz | Üçü de reddedilir, mesaj gösterilir, önceki değer kalır | US2, FR-004, SC-001 |
| C5 | Hücreye ` Claude-Opus-5-5 ` yaz | `claude-opus-5-5` olarak kabul edilir | FR-005 |
| C6 | Kilit `opus[1m]` iken gerçek CLI'da `/model opus[1m]` ve `/model sonnet` | İlki sorulmadan geçer, ikincisinde "Kilidi güncelle / Geri al" | US3, FR-009, SC-004 |
| C7 | Öneri ekranında "Başka bir Claude modeli yaz…" → `claude-sonnet-5-5` | Kilitlenir, "elle değiştirildi" | FR-014 |
| C8 | Hücreye `fable` yaz | Kabul edilir ve tek seferlik kullanım kredisi uyarısı gösterilir; özet "tahmin yok" | R2, FR-010 |
| C9 | `opusplan` ile kilitle → bitir | Tasarruf %20 | FR-010 |
| C10 | Kilitliyken Özel tabloyu değiştir | Kilit değişmez | FR-011 |

C6, 001'deki gibi `claude -p` ve engelleyen hook ile **maliyet 0** olarak otomatik doğrulanabilir. C8'de Fable gerçekten **çağrılmaz**.
