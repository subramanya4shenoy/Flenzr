# Flenzr API Contracts & Code Generation

This directory contains the central OpenAPI specification generated from the FastAPI backend, along with client generation pipelines for all three client platforms.

## Files
- `openapi.json`: OpenAPI 3.1.0 specification generated from FastAPI backend.
- Codegen targets:
  - **TypeScript**: `openapi-typescript` for Next.js web application.
  - **Swift**: `swift-openapi-generator` for iOS native modules.
  - **Kotlin**: OpenAPI Generator CLI for Android Retrofit client.
