# iOS Live Photo setup

This repo now includes the web-side Capacitor configuration and a native iOS Live Photo plugin scaffold.

## Generate the iOS shell
1. `npm install`
2. `npm run cap:add:ios`
3. `npm run ios:build:web`
4. `npm run cap:open:ios`

## Add the native plugin file to the iOS target
Make sure `ios/App/App/LivePhotoPlugin.swift` is included in the `App` target inside Xcode.

## Add Photos permission
Add this key to the generated `ios/App/App/Info.plist`:

- `Privacy - Photo Library Additions Usage Description`
  - Value: `Save TikTok Live Photos to your photo library.`

## Important
This plugin imports a photo resource plus a paired video resource into Photos. It does not create per-slide motion clips for you. If the backend only returns one shared slideshow video for every image, the saved assets may still be rejected by Photos or behave like a mismatched pair.
