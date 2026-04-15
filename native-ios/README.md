# Native iOS app

This folder contains a separate SwiftUI iOS app that lives alongside the existing web app.

## Architecture
- Web app: existing Lovable/Vercel React app
- Native iOS app: `native-ios/`
- Shared backend: existing Supabase Edge Functions

## Goal
Keep all three experiences linked through the same branding and backend:
- Lovable/web
- Vercel deployment
- Native IPA build

## Build
This app is generated with XcodeGen from `project.yml`.
A GitHub Actions workflow can generate an unsigned IPA artifact for sideload testing.

## Current scope
- Native home screen
- Native video downloader screen
- Native slideshow downloader screen
- Native Photos save flow
- Native Live Photo save flow for slideshow items
