# PKDCompassNative (SwiftUI Rebuild Scaffold)

This folder is the native iOS rebuild foundation for PKD Compass.

## What is included

- MVVM structure
- SwiftData persistence container
- Keychain token service
- Local notification service
- Auth flow views (login/signup/profile setup)
- 8-tab native shell:
  - Dashboard
  - Labs
  - Food Tracker
  - Medications
  - Symptoms
  - Organizer
  - Resources
  - Profile
- Clinical rules starter (`ClinicalRules.swift`)
- Deep source audit from the web app (`docs/WEB_APP_DEEP_ANALYSIS.md`)

## Generate Xcode project

This scaffold uses `XcodeGen` config.

1. Install XcodeGen (if not installed):
   - `brew install xcodegen`
2. From this directory:
   - `xcodegen generate`
3. Open generated project in Xcode and run on iPhone simulator.

## Next implementation milestones

1. Port all API flows to native repository/services layer.
2. Replace mock data with real persistence + sync strategy.
3. Build full charting and trend views using Swift Charts.
4. Complete organizer/document upload workflows.
5. Add forgot-password backend integration (or secure simulation flow).
6. Perform App Store hardening: privacy strings, data handling, legal copy, and QA.
