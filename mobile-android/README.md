# Flenzr Android (Native Kotlin & Jetpack Compose)

Native Android multi-module project supporting two distinct app modules:

## Modules
1. **`:app-creator`**: Native application for creators.
2. **`:app-brand`**: Native application for brands.
3. **`:core:network`**: OkHttp, Retrofit, Auth token interceptor.
4. **`:core:security`**: Android Keystore / EncryptedSharedPreferences token storage.
5. **`:core:model`**: Shared domain data classes.
6. **`:core:ui`**: Jetpack Compose Material 3 design system and components.

## Architecture
- 100% Native Kotlin & Jetpack Compose
- Coroutines and StateFlow
- Android ViewModel & Clean Architecture
- Hilt Dependency Injection
- Room database for offline cache
