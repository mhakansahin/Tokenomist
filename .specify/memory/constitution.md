<!--
Sync Impact Report
- Version change: 1.1.0 → 1.2.0 (MINOR: Technology Standards genişletildi)
- Modified principles: yok
- Added sections: Technology Standards altında "Geliştirme araçları" ve "Claude Code entegrasyonu"
- Removed sections: yok
- Templates: plan/spec/tasks şablonları anayasayı çalışma anında okur; değişiklik gerekmez
- Follow-up TODOs: yok
- Gerekçe: specs/001-spec-model-routing/plan.md Complexity Tracking; /speckit-analyze bulgusu C1
-->
# Tokenomist Constitution

Bu proje GitHub Spec Kit ile **Spec Driven Development** yürütür. Aşağıdaki ilkeler tüm katkılar için bağlayıcıdır.

## Core Principles

### I. Spec önce gelir
Her davranış değişikliği önce `/speckit-specify` ile bir özellik spec'ine yazılır, ardından `/speckit-plan` ve `/speckit-tasks` çalıştırılır, en son kod yazılır. Her commit/PR ilgili FR numarasını referans verir.

### II. Belirsizlik açıkça işaretlenir
Belirsizlik işareti taşıyan bir gereksinime bağlı görev, `/speckit-clarify` ile netleşmeden başlamaz. Varsayım yapmak yerine soru sorulur.

### III. Test önce
Kabul kriterleri önce teste dönüşür, sonra kod yazılır. Seçilen test katmanları: Birim testleri, Entegrasyon testleri.

### IV. Sadelik ve teknoloji disiplini
Teknoloji yığını aşağıdaki Technology Standards bölümünde tanımlıdır. Yeni bir bağımlılık veya altyapı bileşeni eklemek, önce bu anayasanın `/speckit-constitution` ile gerekçesiyle güncellenmesini gerektirir.

### V. Küçük ve geri alınabilir adımlar
Her görev tek bir küçük PR'dır ve ana dalı her zaman çalışır durumda bırakır.

## Technology Standards

Mülakatta seçilen teknoloji yığını. Planlar (`/speckit-plan`) bu tabloyla sınırlıdır.

| Alan | Seçim |
|---|---|
| Dil / Platform | TypeScript, VS Code Extension API |
| Backend | Yok (istemci tarafı) |
| Gözlemlenebilirlik | Şimdilik yok |
| CI/CD | GitHub Actions |
| Test | Birim testleri, Entegrasyon testleri |

### Geliştirme araçları

Yalnızca aşağıdaki geliştirme bağımlılıkları kullanılır; çalışma zamanı (runtime) bağımlılığı yoktur ve bundler kullanılmaz.

| Araç | Amaç |
|---|---|
| `typescript`, `@types/vscode`, `@types/node` | Derleme (`tsc`) ve tipler |
| Node yerleşik `node:test` | Birim testleri |
| `@vscode/test-electron` | Entegrasyon testleri (gerçek VS Code içinde) |
| `@vscode/vsce` | Marketplace paketleme |

### Claude Code entegrasyonu

Eklenti, Claude Code `http` hook'larını almak için Node yerleşik `http` modülüyle yazılmış bir dinleyici çalıştırabilir. Bu dinleyici YALNIZCA `127.0.0.1`'e bağlanır, her istekte çalışma alanına özgü bir token doğrular ve ayrı bir süreç veya servis değildir. Eklentinin dış ağa erişimi yoktur.

### Mimari

Sunucu tarafı yoktur. Uygulama (VS Code eklentisi) verisini yerelde tutar. Katmanlar: sunum → uygulama mantığı → yerel kalıcılık.

## Constraints

1) Hakem pahalı olmasın: karmaşıklık analizi limit yemesin; kural tabanlı/yerel skorlama, LLM gerekirse en fazla tek kısa Haiku çağrısı. 2) Spec içeriği Anthropic dışında hiçbir üçüncü tarafa gitmesin (spec zaten Claude tarafından yazıldığı için Haiku hakem çağrısı yeni bir gizlilik riski oluşturmaz; telemetri/analitik yok). 3) Şüphede güçlü model: skor sınırdaysa bir üst model seçilsin. 4) Claude Code'a dokunmama: Claude Code'un kendi ayarları kalıcı olarak bozulmasın; spec bitince önceki model geri yüklensin.

## Governance

Bu anayasa diğer tüm alışkanlıkların üstündedir. Değişiklikler `/speckit-constitution` ile yapılır; sürüm anlamsal sürümlemeye göre artırılır (ilke ekleme/kaldırma: MAJOR, ilke genişletme: MINOR, ifade düzeltme: PATCH). Her plan, Constitution Check bölümünde bu ilkelere uyumu gösterir.

**Version**: 1.2.0 | **Ratified**: 2026-11-03 | **Last Amended**: 2026-11-03
