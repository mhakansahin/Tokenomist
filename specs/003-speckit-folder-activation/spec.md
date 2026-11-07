# Feature Specification: Spec Kit Klasörüyle Etkinleşme

**Feature Branch**: `003-speckit-folder-activation`

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "Spec Kit kurulu olup henüz aktif özelliği (.specify/feature.json) olmayan çalışma alanlarında Tokenomist pasif kalmasın: .specify klasörü varsa etkinleşsin, hook'larını kursun, ilk /speckit-specify çağrısında spec yazımı modelini uygulasın ve feature.json oluşunca pencereyi yeniden yüklemeden izlemeye başlasın."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Yeni Spec Kit projesinde ilk spec (Priority: P1)

Geliştirici yeni bir klasörde Spec Kit'i kurar ve VS Code'da açar. Henüz hiç özellik yoktur. İlk `/speckit-specify` komutunu verdiğinde Tokenomist spec yazımı modelini uygular. Spec yazılıp aktif özellik oluşunca, pencereyi yeniden yüklemeye gerek kalmadan spec'i analiz eder ve model önerir.

**Why this priority**: Bugün her yeni kullanıcı ilk spec'inde Tokenomist'i pasif görür ve ancak pencereyi yeniden yükleyince devreye girer. İlk izlenim bu akışta oluşuyor.

**Independent Test**: Spec Kit kurulu, aktif özelliği olmayan bir çalışma alanı açılır ve `/speckit-specify` çalıştırılır. Yazım modeli ayara yazılmalı, spec oluşunca da yeniden yükleme yapılmadan öneri gelmeli.

**Acceptance Scenarios**:

1. **Given** çalışma alanında Spec Kit klasörü var ama aktif özellik yok, **When** VS Code açılır, **Then** Tokenomist etkinleşir, Claude Code hook'larını kurar ve status bar'da pasif değil, "henüz spec yok" durumu görünür.
2. **Given** aynı çalışma alanı, **When** kullanıcı ilk `/speckit-specify` komutunu verir, **Then** orijinal model kaydedilir ve spec yazımı modeli uygulanır (001 FR-003).
3. **Given** spec yazımı sürüyor, **When** aktif özellik bilgisi oluşur ve spec yazılır, **Then** Tokenomist pencere yeniden yüklenmeden bu özelliği izlemeye başlar, spec'i analiz eder ve öneriyi gösterir.

---

### User Story 2 - VS Code açıkken Spec Kit kurulması (Priority: P2)

Geliştirici VS Code açıkken çalışma alanında Spec Kit'i kurar. Tokenomist pencere yeniden yüklenmeden bunu fark eder ve etkinleşir.

**Why this priority**: Spec Kit genelde terminalden kurulur ve kurulumdan sonra pencereyi yeniden yüklemek akla gelmez.

**Independent Test**: Spec Kit'siz bir çalışma alanı açılır (Tokenomist pasif), ardından Spec Kit kurulur. Status bar pasiften çıkmalı ve hook'lar kurulmalı.

**Acceptance Scenarios**:

1. **Given** Tokenomist "Spec Kit yok" nedeniyle pasif, **When** çalışma alanında Spec Kit klasörü oluşur, **Then** Tokenomist pencere yeniden yüklenmeden etkinleşir ve hook'larını kurar.

### Edge Cases

- Spec Kit klasörü de yoksa Tokenomist pasif kalır ve hiçbir dosyaya yazmaz (001 davranışı korunur).
- Aktif özellik bilgisi silinirse ya da bozulursa Tokenomist aktif özelliği "yok" sayar. Hook'ları ve önceki kayıtları korur; model değişikliği yapmaz.
- Claude Code yoksa ya da model dışarıdan sabitlenmişse, Spec Kit klasörü olsa bile 001'deki pasif nedenler önceliklidir.
- Spec Kit klasörü varken kullanıcı hiç `/speckit-specify` çalıştırmazsa Tokenomist yalnızca hook'larını kurmuş olur; model ayarına dokunmaz.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem, çalışma alanında Spec Kit klasörü varsa aktif özellik bilgisi olmasa da etkinleşmeli ve Claude Code hook'larını kurmalıdır.
- **FR-002**: Aktif özellik yokken status bar pasif durumu değil, "henüz spec yok" durumunu göstermelidir. Tıklanınca kullanıcıya ilk spec'i `/speckit-specify` ile başlatabileceği söylenmelidir.
- **FR-003**: Aktif özellik yokken verilen ilk `/speckit-specify` komutunda sistem orijinal modeli kaydetmeli ve spec yazımı modelini uygulamalıdır (001 FR-003, data-model PendingWriting).
- **FR-004**: Aktif özellik bilgisi sonradan oluştuğunda sistem pencere yeniden yüklenmeden bu özelliği izlemeye başlamalı ve bekleyen spec yazımı kaydını ona bağlamalıdır. Spec o ana kadar yazılmışsa analiz edilip öneri gösterilmelidir.
- **FR-005**: Spec Kit klasörü VS Code açıkken oluşursa sistem pencere yeniden yüklenmeden etkinleşmelidir.
- **FR-006**: Spec Kit klasörü yoksa 001'deki pasif davranış aynen korunmalıdır; sistem hiçbir dosyaya yazmamalıdır.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Spec Kit kurulu, özelliği olmayan bir çalışma alanında ilk spec akışı (`/speckit-specify` → öneri) pencereyi yeniden yüklemeden %100 tamamlanır.
- **SC-002**: İlk `/speckit-specify` komutunda spec yazımı modeli her seferinde ayara yazılır.
- **SC-003**: Spec Kit klasörü oluştuktan sonra Tokenomist en geç 5 saniye içinde etkin duruma geçer.
- **SC-004**: Spec Kit'siz çalışma alanlarında Tokenomist'in yazdığı dosya sayısı 0'dır (001 davranışı).

## Assumptions

- "Spec Kit kurulu" demek, çalışma alanı kökünde `.specify` klasörünün bulunması demektir. Aktif özellik bilgisi ilk `/speckit-specify` ile oluşur.
- Çok köklü çalışma alanlarında 001'deki gibi yalnızca ilk klasör dikkate alınır.
- Bu düzeltme 001'in "Spec Kit yapısı yoksa pasif kalır" uç durumunu daraltır: pasif kalma koşulu artık aktif özelliğin değil, `.specify` klasörünün yokluğudur.
