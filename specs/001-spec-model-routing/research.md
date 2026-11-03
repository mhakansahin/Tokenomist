# Research: Spec Bazlı Model Yönlendirme

**Feature**: [spec.md](spec.md) · **Date**: 2026-11-03

Kaynaklar: Claude Code resmi dokümanları (code.claude.com/docs/en/settings, /model-config, /hooks; 2026-11-03'te okundu) ve yerel kurulum incelemesi (`anthropic.claude-code-2.1.314`).

## R1. Claude Code'un modeli nasıl değiştirilir?

**Decision**: Tokenomist modeli, çalışma alanının `.claude/settings.local.json` dosyasındaki `model` anahtarına alias (`haiku` / `sonnet` / `opus`) yazarak ayarlar. Değişiklik **yeni açılan Claude Code oturumlarında** geçerli olur; Tokenomist bu yüzden kilitten sonra "Yeni konuşma başlat" eylemi sunar (Claude Code eklentisinin `claude-vscode.newConversation` komutu).

**Rationale**:
- Öncelik sırası: managed > komut satırı > **project local** > shared project > user. Local dosya kullanıcının genel ayarından (`~/.claude/settings.json`) önce gelir; yalnızca bu çalışma alanını etkiler ve git dışında tutulur. Kullanıcının genel ayarına dokunmadan model değiştirilebilir (Kısıt 4).
- Doküman: "Claude Code reads some keys only once, at session start … `model`: use `/model` to switch mid-session." Ayar dosyası değişikliği açık oturumu etkilemez.
- Claude Code VS Code eklentisinin model için kendi VS Code ayarı yoktur (package.json incelendi). Eklentiden açık oturumun modelini değiştiren belgelenmiş bir yol yoktur (yalnızca Agent SDK `setModel`, Desktop, Remote Control).
- SDD akışında her aşama (plan, tasks, implement) diske yazılan dosyalarla ilerler; aşama başında yeni konuşma açmak bağlam kaybı yaratmaz.

**Alternatives considered**:
- `~/.claude/settings.json` (user) dosyasına yazmak: tüm projeleri etkiler, Kısıt 4'e aykırı.
- `ANTHROPIC_MODEL` ortam değişkeni: yalnızca açılışta okunur ve Claude Code'u yeniden başlatmayı gerektirir.
- Kullanıcıya `/model` yazdırmak: `/model <ad>` seçimi user settings'e **kalıcı olarak** yazar; Kısıt 4'ü bozar. Yalnızca ipucu olarak (picker'da `s` = sadece bu oturum) gösterilir.

## R2. SDD aşamaları ve komutlar nasıl algılanır? (FR-002, FR-024)

**Decision**: İki kaynak birlikte kullanılır:
1. **Dosya izleme (birincil durum kaynağı)**: `.specify/feature.json` → aktif özellik dizini; `spec.md` / `plan.md` / `tasks.md` varlığı ve `tasks.md` içindeki `- [ ]` / `- [x]` satırları aşamayı belirler.
2. **Claude Code HTTP hook'ları (komut kapısı)**: `UserPromptExpansion` olayı, matcher `speckit-specify|speckit-plan|speckit-tasks|speckit-implement`, Tokenomist'in eklenti içinde çalıştırdığı `127.0.0.1` HTTP sunucusuna POST eder. Tokenomist gerekiyorsa yanıtı bekletip VS Code'da modal gösterir ve `decision: "block"` + `reason` ya da boş 2xx (izin) döner.

**Rationale**:
- `UserPromptExpansion` girdisi `command_name`, `command_args`, `prompt` içerir; komut genişlemeden **önce** çalışır ve engelleyebilir. Elle yazılan `/speckit-plan` `PreToolUse` olayına uğramaz; bu olay o yolu kapsar.
- `http` hook tipi kabuk gerektirmez. Windows'ta Git Bash/PowerShell farkı ve Node kurulu olup olmadığı sorun olmaz.
- Bağlantı hatası "non-blocking error" sayılır (`onFailure` varsayılanı `continue`). VS Code kapalıyken veya Tokenomist devre dışıyken Claude Code normal çalışır.
- Dosya izleme, hook'lar olmadan da (örn. Claude Code terminal dışında kullanıldığında) aşamaların doğru görünmesini sağlar.

**Alternatives considered**:
- `command` hook + script: Windows'ta kabuk ve Node bağımlılığı var, daha kırılgan.
- `UserPromptSubmit`: ham metni ayrıştırmak gerekir; `UserPromptExpansion` komut adını yapısal olarak verir.
- Yalnızca dosya izleme: plan komutu modeli onaylanmadan başlarsa bunu yakalayamaz (FR-024'teki ek uyarı imkânsız olur).

## R3. "Kapı" (gate) davranışı

**Decision**: Kapı yalnızca o anki oturumun modeli hedef modelden farklı olabilecekse açılır:
- `/speckit-specify`: Tokenomist bu özelliği henüz izlemiyorsa orijinal model kaydedilir ve spec yazımı modeli local ayara yazılır. Modal: "Spec yazımı modeli: Sonnet. [Yeni konuşmada başla] [Bu oturumda devam et]".
- `/speckit-plan`: kilit yoksa modal: "Bu spec için model onaylanmadı (öneri: Karmaşık → Opus). [Onayla ve yeni konuşma aç] [Modeli değiştir] [Kilitsiz devam et]". Kilit varsa ve oturum yeni açılmışsa sessizce izin verilir.
- "Yeni konuşma" seçilirse hook `block` + reason döner ("Tokenomist: model Opus olarak kilitlendi. Yeni konuşmada /speckit-plan komutunu tekrar çalıştır."), ardından `claude-vscode.newConversation` çalıştırılır.
- Yanıt süresi sınırı 25 sn'dir (hook timeout 30 sn). Süre dolarsa izin verilir, karar VS Code bildiriminde bekler.

**Rationale**: Komutların tamamen engellenmesi kullanıcıyı kilitler; tamamen serbest bırakılması planın yanlış modelle çalışmasına yol açar. Seçim her zaman kullanıcıdadır (spec: kullanıcı adına karar yok).

## R4. Oturumun gerçek modelini bilmek

**Decision**: Tokenomist oturum modelini tahmin eder, kesin bilgi olarak kullanmaz: `PreModelSwitch` (`from_model`) ve `PostModelSwitch` (`to_model`) hook'ları oturum kimliğine göre son bilinen modeli kaydeder. Bilinmiyorsa kapı her zaman sorar. (`SessionStart` HTTP hook'u desteklenmiyor; bkz. Spike sonucu.)

**Rationale**: Doküman `SessionStart`'ın `model` alanını "her zaman göndermediğini" söylüyor; açık bir `$CLAUDE_MODEL` değişkeni de yok.

## R5. Kilit sırasında elle model değişikliği (FR-023)

**Decision**: `PreModelSwitch` HTTP hook'u. Kilit varken gelen istekte Tokenomist yanıtı bekletir ve VS Code modal'ı gösterir: "Kilitli model Opus. `/model` ile Sonnet seçildi. [Kilidi bu modelle güncelle] [Geri al]".
- Güncelle → `permissionDecision: "allow"`, kilit `to_model` ile güncellenir, `manualOverride=true`.
- Geri al → `permissionDecision: "deny"` + `systemMessage` ("Tokenomist: kilitli model korunuyor").
- Hook timeout'u (30 sn) dolarsa geçiş engellenir (doküman: "A timeout blocks the switch"). Model kullanıcı seçmeden değişmez.

`/model <ad>` (`source: "command"`) user settings'e de yazar. Bu durumda Tokenomist değişiklik öncesi `~/.claude/settings.json` içindeki `model` değerini kilit kaydına `userModelSnapshot` olarak alır ve spec bitince yalnızca bu anahtarı geri koyar. Kullanıcının genel ayar dosyasına dokunulan **tek** durum budur.

**Alternatives considered**: Ayar dosyasını izleyip sonradan geri almak. Açık oturumda geçiş zaten olmuş olur ve kullanıcıya sorulmadan geri alınmış olur; FR-023'e aykırı.

## R6. Orijinal modelin kaydı ve geri yükleme (FR-003, FR-011, FR-016)

**Decision**: "Orijinal model" bir **ayar anlık görüntüsüdür**: `.claude/settings.local.json` içindeki `model` anahtarının varlığı ve değeri (yoksa `absent`). Gerekirse buna `userModelSnapshot` eklenir (R5). Geri yükleme bu anahtarı aynen eski haline getirir (yoksa siler). Diğer anahtarlara dokunulmaz.

**Rationale**: Etkin modeli (alias çözümlemesi, managed, env) taklit etmek yerine yalnızca Tokenomist'in değiştirdiği anahtarı geri koymak Kısıt 4'ü kesin olarak karşılar.

**Guard'lar**:
- `ANTHROPIC_MODEL`, managed `model`/`availableModels` veya `claudeCode.environmentVariables` içinde model geçersiz kılma algılanırsa Tokenomist pasif kalır ve status bar'da bunu söyler.
- `settings.local.json` geçerli JSON değilse (yorum, bozuk dosya) Tokenomist dosyaya yazmaz ve pasif kalır.
- Yazma atomiktir (geçici dosya + rename). Dosya Tokenomist tarafından oluşturulduysa `.git/info/exclude` dosyasına `.claude/settings.local.json` eklenir.

## R7. Hook kayıtlarının yaşam döngüsü

**Decision**: Hook girdileri `settings.local.json` içine, URL'sinde `/tokenomist/` yolu olacak şekilde eklenir (tanınabilirlik). Sunucu her etkinleşmede rastgele boş bir porta bağlanır ve URL güncellenir. `X-Tokenomist-Token` başlığı (çalışma alanı başına rastgele değer, `workspaceState`'te) doğrulanır. Temizlik: "Tokenomist: Claude Code ayarlarını temizle" komutu ve eklenti kaldırılınca çalışan `vscode:uninstall` betiği. Bu betik VS Code'un bildiği çalışma alanlarında Tokenomist'in kendi hook ve `model` girdilerini kaldırır.

**Rationale**: Hook erişilemezse non-blocking olduğu için kalıntı zarar vermez; yine de Kısıt 4 gereği temizlik yapılır. Token, yerel başka bir sürecin sahte kapı yanıtı vermesini engeller.

## R8. Karmaşıklık skorlaması (FR-004–FR-009)

**Decision**: Spec Markdown'ından yerel olarak çıkarılan sinyallerin ağırlıklı toplamı, 0–100 aralığına sıkıştırılır:

| Sinyal | Çıkarım | Ağırlık (varsayılan) | Doyma |
|---|---|---|---|
| Fonksiyonel gereksinim | `**FR-\d+**` | 2.0 | 25 |
| Kullanıcı hikâyesi | `### User Story` | 4.0 | 6 |
| Varlık/bileşen | Key Entities madde sayısı | 3.0 | 8 |
| Harici entegrasyon | anahtar sözcük listesi (API, entegrasyon, servis, webhook, OAuth, ödeme, veritabanı, kuyruk, üçüncü taraf, …) | 5.0 | 6 |
| Belirsizlik | `[NEEDS CLARIFICATION` + "belirsiz/TBD" | 4.0 | 5 |
| Uç durum | Edge Cases madde sayısı | 1.5 | 12 |

Varsayılan eşikler: basit < 35 ≤ orta < 65 ≤ karmaşık; sınır payı 5 puan (FR-008: eşiğin 5 puan altındaki skor bir üst seviyeye çıkar). Ağırlıklar kod sabiti; eşikler ve sınır payı kullanıcı ayarı (FR-021). Gerekçe: en yüksek katkılı 3 sinyal.

**Rationale**: Deterministik, < 50 ms, model çağrısı yok (FR-006, FR-007). Kalibrasyon SC-005 test setiyle yapılır (`tests/fixtures/specs/` içinde elle etiketlenmiş basit/orta/karmaşık spec'ler; bu deponun kendi spec'i dahil).

## R9. Tasarruf tahmini (FR-018, SC-006)

**Decision**: Opus'a göre göreli ağırlık: Haiku 0.2, Sonnet 0.6, Opus 1.0 (güncel liste fiyat oranları: $1/$3/$5 giriş). Tasarruf = `1 − ağırlık(kullanılan model)`. Kilit sırasında model değiştiyse süreyle ağırlıklı ortalama alınır. Ağırlıklar tek bir sabit tabloda tutulur.

**Rationale**: Gerçek token kullanımı ölçülmüyor (clarify kararı A). Dengeli modda eşit dağılımlı sette beklenen ortalama (%80 + %40 + %0) / 3 = %40, SC-006 hedefiyle uyumlu.

## R10. Kalıcılık ve yerelleştirme

**Decision**:
- Kilit ve izleme durumu: `ExtensionContext.workspaceState` (çalışma alanı başına). Spec özetleri: `globalState` (tüm projelerde liste, FR-019). Ayarlar: VS Code `contributes.configuration` (`tokenomist.*`).
- Dil: `vscode.l10n` + `l10n/bundle.l10n.tr.json` ve `package.nls.json` / `package.nls.tr.json` (FR-025). Ek kütüphane gerekmez.

## R11. Araçlar ve test

**Decision**: TypeScript (strict), `tsc` ile derleme (bundler yok). Birim testleri `node:test` ile `vscode` bağımlılığı olmayan saf modüller üzerinde. Entegrasyon testleri `@vscode/test-electron` ile gerçek VS Code içinde. Paketleme `@vscode/vsce`. CI GitHub Actions. Çalışma zamanı bağımlılığı: **yok** (HTTP sunucusu Node `http` modülü).

**Rationale**: Anayasa IV (sadelik): yalnızca anayasanın seçtiği yığının zorunlu geliştirme araçları.

## Açık riskler

- `UserPromptExpansion` ve `PreModelSwitch` görece yeni olaylar. Kurulu Claude Code sürümü bunları desteklemiyorsa (hook hiç çağrılmıyorsa) kapı devre dışı kalır, yalnızca dosya izleme + bildirim akışı çalışır. Entegrasyon testi ve quickstart S6 bunu doğrular.
- `http` hook'larında `onFailure` alanı v2.1.295+ gerektirir. Tokenomist bu alanı yazmaz (varsayılan `continue`).
- `allowedHttpHookUrls` managed ayarı tanımlıysa hook'lar çalışmaz. Durum status bar'da "kapı pasif" olarak gösterilir.

## Spike sonucu (T006, 2026-11-03)

Ortam: Claude Code CLI 2.1.316 (`claude -p`), Windows 11, geçici çalışma alanında `.claude/settings.local.json` + `tests/manual/hook-probe/probe.js`.

| Olay (http hook) | Sonuç | Gözlem |
|---|---|---|
| `UserPromptExpansion` (`/speckit-plan`) | ✅ çağrıldı | Gövde: `command_name: "speckit-plan"`, `command_args`, `command_source: "projectSettings"`, `expansion_type: "slash_command"`, `prompt`, `session_id`, `cwd`. `{"decision":"block","reason":…}` prompt'u engelledi; kullanıcıya "UserPromptExpansion operation blocked by hook: <reason>" gösterildi; **model çağrısı yapılmadı (maliyet 0)** |
| `PreModelSwitch` (`/model sonnet`) | ✅ çağrıldı | Gövde: `from_model: "claude-haiku-5-5"`, `to_model: "claude-sonnet-5-5"`, `requested_model: "sonnet"`, `source: "command"`. `permissionDecision: "deny"` geçişi engelledi, `systemMessage` kullanıcıya gösterildi |
| `PostModelSwitch` | ⏸ doğrulanmadı | Geçiş engellendiği için tetiklenmedi; doküman tanımına güveniliyor |
| `SessionStart` | ❌ desteklenmiyor | Debug: "HTTP hooks are not supported for SessionStart" |

Tasarıma etkisi:
- R4 güncellendi: oturum modeli yalnızca `PreModelSwitch.from_model` / `to_model` ve `PostModelSwitch.to_model` ile öğrenilir; `SessionStart` kaydı **kaldırıldı**. Bilinmeyen oturum modelinde kapı her zaman sorar.
- Hook girdilerindeki model değerleri tam kimliktir (`claude-<aile>-<sürüm>`); Tokenomist aileyi (`haiku|sonnet|opus`) alt dizgiyle çıkarır, tanınmayan değerleri "bilinmiyor" sayar.
- Not (test ortamı): Git Bash `"/speckit-plan"` argümanını yol olarak dönüştürür; elle denemelerde `MSYS_NO_PATHCONV=1` kullanılmalı.
- T055 geri düşüşü gerekmiyor (kapılar çalışıyor); yalnızca hook'lar hiç çağrılmazsa devreye giren "kapı pasif" durumu korunur.
