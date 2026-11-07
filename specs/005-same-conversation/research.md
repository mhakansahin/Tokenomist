# Research: Tek Konuşma Modu

## R1. Skill `model` alanı (doğrulandı)

- Resmi doküman (code.claude.com/docs/en/skills): "Model to use when this skill is active. The override applies for the rest of the current turn and isn't saved to settings." · "The session model resumes when you send your next prompt."
- `.claude/commands/*.md` aynı alanları kabul eder.
- **Gerçek deneme (2026-11-08):** Geçici bir klasörde başlığında `model: haiku` yazan bir skill oluşturuldu ve `claude -p "/probe-model" --model sonnet` ile çağrıldı. Kullanım kaydında yalnızca `claude-haiku-5-5` göründü.

## R2. Canlı yeniden okuma ve öncelik

- "Claude Code watches skill directories for file changes … picks up the change within the current session, without a restart."
- Aynı ad: "Enterprise over personal, and personal over project." Bu yüzden kişisel klasör yöntemi bütün projeleri etkiler; seçilmedi (spec Clarifications).

## R3. Yarış: komut anında yazmak

`UserPromptExpansion` hook'u genişlemeden hemen önce çalışır. Dosyayı o anda değiştirmek, Claude Code'un dosya izleyicisi yetişmeden okunmasına yol açabilir.

**Decision**: Model önceden yazılır:
- Yazım tanımlarına (specify, clarify) yazım modeli, Tokenomist etkin olduğu sürece yazılı kalır.
- Aşama tanımlarına (plan, tasks, implement, analyze, checklist, converge):
  - otomatik modda o anki öneri, spec kaydedildikçe güncellenerek yazılır;
  - kilitlenince kilitli model yazılır;
  - kilit ve öneri yoksa satır yazılmaz.
- Sorarak modda kilit kapıda yeni konduysa komut durdurulur ve tekrar yazılması istenir (spec FR-006).

## R4. Git'ten gizleme

`git update-index --skip-worktree <yol>` izlenen dosyadaki yerel değişikliği `git status`'tan gizler ve commit'e sokmaz; `--no-skip-worktree` geri alır. Bir dosya `git ls-files --error-unmatch <yol>` başarılıysa izleniyor sayılır. Git komutları `child_process.execFile("git", …)` ile çalıştırılır; ağ erişimi yoktur. Git bulunamazsa gizleme atlanır.

## R5. Tanım dosyalarının bulunması

- Skill biçimi (Spec Kit ≥ 1.x, bu projedeki): `.claude/skills/speckit-<ad>/SKILL.md`
- Komut biçimi (eski Spec Kit): `.claude/commands/speckit.<ad>.md`

İkisi de aranır. Bulunamayan komut için 004 davranışı uygulanır (FR-007).

## R6. Satır biçimi

YAML başlığına `model: <değer> # tokenomist` yazılır. Kullanıcının kendi `model:` satırı varsa olduğu gibi saklanır ve geri konur. Geri alma, Tokenomist'in sakladığı özgün dosya içeriğiyle bayt bayt yapılır (SC-003).
