# Contract: Claude Code Ayarları ve HTTP Hook Uç Noktaları

Tokenomist'in Claude Code ile tek temas yüzeyi. Gerekçe: [research.md](../research.md) R1–R7.

## 1. `.claude/settings.local.json` üzerinde sahip olunan girdiler

Tokenomist yalnızca aşağıdaki girdileri ekler, değiştirir ve siler. Diğer tüm anahtarlar bayt düzeyinde korunur (dosya yeniden serileştirilir, 2 boşluk girinti).

```jsonc
{
  "model": "opus",                       // yalnızca writing/locked durumunda; geri yüklemede ModelSnapshot.localModel'e döner
  "hooks": {
    "UserPromptExpansion": [
      { "matcher": "speckit-specify|speckit-plan|speckit-tasks|speckit-implement",
        "hooks": [{ "type": "http", "url": "http://127.0.0.1:<port>/tokenomist/expansion",
                    "headers": { "X-Tokenomist-Token": "<token>" }, "timeout": 30 }] }
    ],
    "PreModelSwitch":  [ { "hooks": [{ "type": "http", "url": "http://127.0.0.1:<port>/tokenomist/pre-model-switch",  "headers": { "X-Tokenomist-Token": "<token>" }, "timeout": 30 }] } ],
    "PostModelSwitch": [ { "hooks": [{ "type": "http", "url": "http://127.0.0.1:<port>/tokenomist/post-model-switch", "headers": { "X-Tokenomist-Token": "<token>" }, "timeout": 30 }] } ]
  }
}
```

Kurallar:
- Sahiplik tanıma: hook `url` yolu `/tokenomist/` içerir. Kullanıcının kendi hook girdileri aynı olay dizisinde korunur.
- Dosya geçerli JSON değilse hiçbir şey yazılmaz → pasif durum.
- Yazma atomiktir. Dosyayı Tokenomist oluşturduysa `.git/info/exclude` dosyasına eklenir.
- `model` değerleri yalnızca `haiku`, `sonnet`, `opus` alias'larıdır.

## 2. HTTP sunucusu

- Yalnızca `127.0.0.1`'e bağlanır; port etkinleşmede rastgele seçilir ve hook URL'leri güncellenir.
- `X-Tokenomist-Token` uyuşmazsa `401` döner (Claude Code bunu non-blocking hata sayar → işlem devam eder).
- Gövde: Claude Code hook girdisi (JSON). Yanıt her zaman `200` + JSON (boş `{}` = karışma).
- Tokenomist kullanıcı kararını en fazla 25 sn bekler. Süre dolarsa aşağıdaki "süre dolumu" satırı uygulanır.

### POST `/tokenomist/expansion` (UserPromptExpansion)

Girdi: `command_name`, `command_args`, `prompt`, `session_id`, `cwd`.

| Koşul | Kullanıcıya | Yanıt |
|---|---|---|
| `cwd` izlenen çalışma alanı değil | — | `{}` |
| `speckit-specify`, aktif özellik izlenmiyor | `PendingWriting` oluşturulur (orijinal model anlık görüntüsü + yazım modeli yazılır; yeni `featureDir` oluşunca bağlanır, bkz. data-model.md); oturum modeli farklı/bilinmiyorsa modal: [Yeni konuşmada başla] [Bu oturumda devam et] | Yeni konuşma → `{"decision":"block","reason":"<yerelleştirilmiş: model ayarlandı, yeni konuşmada komutu tekrar çalıştır>"}`, devam → `{}` |
| `speckit-plan`, kilit yok | Modal: [Onayla ve yeni konuşma aç] [Modeli değiştir] [Kilitsiz devam et] | Onay/değiştir → kilit + `block` + reason; kilitsiz → `{}` |
| `speckit-plan/tasks/implement`, kilit var, oturum modeli ≠ kilitli model veya bilinmiyor | Modal: [Yeni konuşma aç] [Bu oturumda devam et] | yeni → `block`, devam → `{}` |
| Diğer | — | `{}` |
| Süre dolumu | Karar bildirimde bekler | `{}` |

### POST `/tokenomist/pre-model-switch` (PreModelSwitch, FR-023)

Girdi: `from_model`, `to_model`, `requested_model`, `source`, `session_id`.

| Koşul | Yanıt |
|---|---|
| Kilit yok | `{}` |
| Kilit var, `to_model` = kilitli model | `{}` |
| Kilit var, farklı model, kullanıcı "Kilidi güncelle" | `{"hookSpecificOutput":{"hookEventName":"PreModelSwitch","permissionDecision":"allow"}}`. Kilit güncellenir. `source=="command"` ise önce user `model` anlık görüntüsü alınır |
| Kullanıcı "Geri al" | `{"hookSpecificOutput":{"hookEventName":"PreModelSwitch","permissionDecision":"deny"},"systemMessage":"<yerelleştirilmiş: kilitli model korunuyor>"}` |
| Süre dolumu (25 sn) | "Geri al" yanıtı (`deny` + systemMessage). Kullanıcı seçmeden model değişmez (FR-023). Tokenomist yanıt veremezse Claude Code'un 30 sn hook timeout'u da geçişi engeller |

### POST `/tokenomist/post-model-switch`

Yalnızca `session_id → son bilinen model` eşlemesini günceller (R4). Yanıt her zaman `{}`. `PreModelSwitch.from_model` de aynı eşlemeyi günceller.

Model değerleri tam kimliktir (örn. `claude-sonnet-5-5`); aile alt dizgiyle çıkarılır, tanınmayan değer = bilinmiyor. `SessionStart` için HTTP hook desteklenmediğinden kayıt yapılmaz (research.md Spike sonucu).
