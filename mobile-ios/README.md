# Flenzr iOS (Native Swift & SwiftUI)

Native iOS implementation supporting two distinct app targets built on shared Swift Package Manager (SPM) modules:

## Targets
1. **FlenzrCreator**: Designed specifically for creators (media kits, social stats, link manager, rate cards, earnings).
2. **FlenzrBrand**: Tailored for brands and marketing agencies (creator discovery, campaign creation, review, and milestone approvals).

## Architecture
- 100% Native Swift & SwiftUI (iOS 17+)
- Swift Concurrency (`async/await`, `@Observable`)
- MVVM presentation architecture
- Native Keychain security for Supabase session tokens
- Shared local Swift packages (`FlenzrCore`, `FlenzrUI`)
