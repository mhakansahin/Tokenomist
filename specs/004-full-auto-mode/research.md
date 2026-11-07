# Research: Tam Otomatik Mod

## R1. Yeni konuşmayı hazır metinle açma (belgelenmemiş)

Kaynak: kurulu Claude Code VS Code eklentisi 2.1.319, `extension.js` ve `webview/index.js` (2026-11-08).

- `claude-vscode.primaryEditor.open(sessionId?, prompt?)` → `createPanel(sessionId, prompt, …)`. Oturum verilmezse yeni bir sohbet sekmesi açılır.
- URI işleyicisi `vscode://anthropic.claude-code/open?prompt=…` aynı komutu çağırır.
- Webview `initialPrompt` değerini `setInputText(prompt)` ile **giriş kutusuna yazar, göndermez.**

**Decision**: Tokenomist önce `claude-vscode.primaryEditor.open` komutunu `(undefined, prompt)` ile çağırır. Komut yoksa ya da hata verirse `claude-vscode.newConversation` komutuna düşer ve kullanıcıya komutu tekrar yazmasını söyler (spec FR-007). Komut belgelenmemiş olduğu için README'de "Claude Code değişirse yalnızca yeni konuşma açılır" notu yer alır.

## R2. Otomatik kilidin zamanı

**Decision**: Kilit plan başlarken yapılır: `/speckit-plan` kapısında, ya da hook'lar çalışmıyorsa `plan.md` oluştuğunda. Spec yazımı sırasında öneri yalnızca status bar'da güncellenir.

**Rationale**: Spec specify ve clarify sırasında defalarca kaydediliyor. Erken kilit yarım spec'e göre konurdu ve clarify konuşmalarını yazım modeli yerine kilitli modelle başlatırdı.

## R3. Art arda komutlar (FR-010)

Aynı komut için son yeni konuşma açılışından sonraki 10 saniye içinde gelen çağrı yine durdurulur, ama ikinci bir konuşma açılmaz.

## R4. Sorarak moddaki küçük iyileştirme

Sorarak modda kullanıcı "Yeni konuşma aç"ı seçtiğinde de komut yeni konuşmaya hazır yazılır. Soru akışı ve kararlar değişmez (FR-009); yalnızca kullanıcının tekrar yazma zahmeti kalkar ve engelleme mesajı buna göre uyarlanır.
