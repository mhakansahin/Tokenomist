# Feature Specification: Tek Konuşma Modu

**Feature Branch**: `005-same-conversation`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Model geçişlerini tek konuşmada yönetelim; yeni sekme açılmasın. Proje dosyalarına yansımasın: git'ten gizleme yöntemi (B) ile devam."

## Clarifications

### Session 2026-11-08

- Q: Tek konuşma, Spec Kit komut tanımlarına model yazarak mı yapılsın; proje dosyalarına yansıması nasıl önlensin? → A: Tanımlara model yazılır; git ile izlenen dosyalarda değişiklik git'ten gizlenir (skip-worktree), iş bitince gizleme kaldırılır (seçenek B). Kişisel klasör yöntemi (A) bütün projelere sızdığı için seçilmedi.
- Q: Varsayılan yöntem ne olsun? → A: Tek konuşma; 004'teki "yeni konuşma" yöntemi ayardan seçilebilir.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bütün akış tek konuşmada (Priority: P1)

Geliştirici tek bir Claude Code konuşmasında `/speckit-specify`, `/speckit-plan`, `/speckit-tasks` ve `/speckit-implement` komutlarını sırayla yazar. Tokenomist hiçbir komutu durdurmaz ve yeni sekme açmaz. Spec yazımı komutları spec yazımı modeliyle, aşama komutları kilitli modelle çalışır.

**Why this priority**: Kullanıcının asıl isteği: her aşamada yeni sekmeye geçmek akışı bölüyor ve bağlamı kaybettiriyor.

**Independent Test**: Tek konuşmada dört komut sırayla verilir. Hiçbiri durdurulmamalı, yeni sekme açılmamalı. Konuşma kaydında yazım komutlarının yazım modeliyle, aşama komutlarının kilitli modelle çalıştığı görülmeli.

**Acceptance Scenarios**:

1. **Given** tek konuşma modu ve otomatik mod açık, **When** kullanıcı `/speckit-specify` yazar, **Then** komut durdurulmadan spec yazımı modeliyle çalışır.
2. **Given** spec yazıldı ve öneri Haiku, **When** kullanıcı aynı konuşmada `/speckit-plan` yazar, **Then** Haiku sorulmadan kilitlenir ve plan durdurulmadan Haiku ile yazılır.
3. **Given** model kilitli, **When** kullanıcı aynı konuşmada `/speckit-tasks` ve `/speckit-implement` yazar, **Then** ikisi de kilitli modelle çalışır.
4. **Given** konuşmanın kendi modeli Opus, **When** bir Spec Kit komutu bittikten sonra kullanıcı serbest bir mesaj yazar, **Then** o mesaj Opus ile işlenir. Claude Code'un konuşma modeli hiç değiştirilmez.

---

### User Story 2 - Proje dosyalarında iz kalmaması (Priority: P2)

Geliştirici git kullanıyor. Tokenomist Spec Kit komut tanımlarına model işlediği sürece `git status` temiz görünür ve commit'lere bu değişiklik girmez. Spec bitince tanımlar bayt bayt eski haline döner.

**Why this priority**: Kullanıcı proje dosyalarına yansıma istemiyor.

**Independent Test**: Git ile izlenen bir Spec Kit projesinde model kilitlenir. `git status` temiz olmalı. Spec bitince tanım dosyaları kilitten önceki içerikle aynı olmalı ve git gizlemesi kalkmış olmalı.

**Acceptance Scenarios**:

1. **Given** tanım dosyaları git ile izleniyor, **When** Tokenomist bir tanıma model işler, **Then** `git status` bu dosyayı değişmiş göstermez.
2. **Given** model işlenmiş tanımlar var, **When** spec biter, temizleme komutu çalışır ya da eklenti kaldırılır, **Then** tanımlar bayt bayt eski haline döner ve git gizlemesi kaldırılır.
3. **Given** bir tanımda kullanıcının kendi `model` satırı var, **When** Tokenomist o tanıma model işler ve sonra geri alır, **Then** kullanıcının satırı aynen geri gelir.

---

### User Story 3 - Sorarak modda tek konuşma (Priority: P3)

Sorarak modda `/speckit-plan` kilitsiz yazılırsa Tokenomist öneriyi sorar. Onaydan sonra yeni sekme açmaz; komutun aynı konuşmada bir kez daha yazılmasını ister.

**Why this priority**: Sorarak mod azınlık bir kullanım, ama yeni sekme açmamalı.

**Independent Test**: Sorarak modda kilitsiz `/speckit-plan` yazılır ve öneri onaylanır. Komut durdurulmalı, yeni konuşma açılmamalı, mesaj komutu aynı konuşmada tekrar yazmayı söylemeli. İkinci yazışta komut kilitli modelle çalışmalı.

**Acceptance Scenarios**:

1. **Given** sorarak mod ve kilit yok, **When** kullanıcı `/speckit-plan` yazıp öneriyi onaylar, **Then** komut durdurulur, yeni konuşma açılmaz ve mesaj komutu bu konuşmada tekrar yazmasını söyler.

### Edge Cases

- **Tanım dosyası yok:** Bir komutun tanımı projede bulunamazsa (örneğin özel bir kurulum), o komut için 004'teki yeni konuşma davranışı uygulanır.
- **Git yok ya da dosya izlenmiyor:** Gizleme gerekmez; tanım doğrudan değiştirilir ve sonunda geri alınır.
- **Kilit sırasında `git pull` tanımı değiştirmek isterse:** Git yerel değişiklik nedeniyle durabilir. Tokenomist status bar ipucunda ve README'de bunu anlatır; temizleme komutu tanımları geri alıp gizlemeyi kaldırır.
- **Kilit sırasında `/model` ile geçiş:** 001 FR-023 davranışı değişmez. Kilit güncellenirse tanımlar da yeni modele güncellenir.
- **Yöntem değiştirilirse:** Tek konuşmadan yeni konuşmaya geçilince tanımlar geri alınır ve 004 davranışı başlar. Tersine geçilince Claude Code ayarındaki model orijinaline döner ve tanımlara model işlenir.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem bir "konuşma yöntemi" ayarı sunmalıdır: "tek konuşma" (varsayılan) ve "yeni konuşma" (004 davranışı).
- **FR-002**: Tek konuşma yönteminde spec yazımı komutları (specify, clarify) spec yazımı modeliyle, aşama komutları (plan, tasks, implement, analyze, checklist, converge) kilitli modelle çalışmalıdır. Otomatik modda kilitten önce aşama komutları o anki öneriyle çalışmaya hazır tutulmalıdır.
- **FR-003**: Tek konuşma yönteminde model, Spec Kit komut tanımlarına geçici olarak işlenmelidir. Claude Code'un model ayarı ve açık konuşmanın modeli değiştirilmemelidir.
- **FR-004**: Git ile izlenen bir tanım dosyasına yapılan değişiklik git durumunda görünmemeli ve commit'e girmemelidir; değişiklik geri alındığında bu gizleme kaldırılmalıdır.
- **FR-005**: Spec bittiğinde, temizleme komutu çalıştığında ya da eklenti kaldırıldığında tanım dosyaları bayt bayt eski haline dönmelidir. Kullanıcının kendi `model` satırı varsa korunup geri konmalıdır.
- **FR-006**: Tek konuşma yönteminde sistem komutları yalnızca şu durumda durdurmalıdır: sorarak modda kilit az önce konduğunda, komutun aynı konuşmada tekrar yazılması gerektiğini söylemek için. Yeni konuşma açılmamalıdır.
- **FR-007**: Bir komutun tanım dosyası bulunamazsa o komut için 004'teki yeni konuşma davranışı uygulanmalıdır.
- **FR-008**: Kilit sırasında `/model` denetimi değişmemelidir; kilit güncellenirse tanımlar da güncellenmelidir.
- **FR-009**: Tokenomist'in tanımlara yazdığı satır, onu tanınabilir kılan bir işaret taşımalıdır.

### Key Entities

- **Komut Tanımı**: Bir Spec Kit komutunun proje içindeki tanım dosyası; Tokenomist'in yazdığı model satırı ve varsa kullanıcının özgün model satırı.
- **Konuşma Yöntemi Ayarı**: "tek konuşma" veya "yeni konuşma".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tek konuşma yönteminde bir spec'in yazımından uygulanmasına kadar açılan yeni konuşma sayısı 0'dır.
- **SC-002**: Otomatik modda aşama komutları için kullanıcının yaptığı ek iş 0'dır (komutu yazmak dışında).
- **SC-003**: Spec bitince tanım dosyalarının %100'ü kilitten önceki içerikle bayt bayt aynıdır ve git durumu temizdir.
- **SC-004**: Yeni konuşma yönteminde 004'ün tüm otomatik testleri değişmeden geçer.

## Assumptions

- Claude Code, bir skill ya da komut tanımındaki `model` alanını o turun geri kalanı için kullanır ve sonraki mesajda konuşma modeline döner. Bu, 2026-11-08'de resmi dokümanla ve gerçek CLI denemesiyle doğrulandı (plan research R1).
- Claude Code tanım dosyalarındaki değişiklikleri açık oturumda anında okur (resmi doküman).
- Git, çalışma alanında kullanılabilirse tanımları gizlemek için kullanılır; kullanılamıyorsa tanımlar doğrudan değiştirilip geri alınır.
