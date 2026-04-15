#!/bin/bash
set -euo pipefail
base64 -D -i ios-build/app-icon-1024.b64 -o ios-build/app-icon-1024.png
ICON_SOURCE="ios-build/app-icon-1024.png"
ICON_SET="ios/App/App/Assets.xcassets/AppIcon.appiconset"
mkdir -p "$ICON_SET"
find "$ICON_SET" -name '*.png' -delete || true
sips -z 40 40 "$ICON_SOURCE" --out "$ICON_SET/iphone-notification-20@2x.png" >/dev/null
sips -z 60 60 "$ICON_SOURCE" --out "$ICON_SET/iphone-notification-20@3x.png" >/dev/null
sips -z 58 58 "$ICON_SOURCE" --out "$ICON_SET/iphone-settings-29@2x.png" >/dev/null
sips -z 87 87 "$ICON_SOURCE" --out "$ICON_SET/iphone-settings-29@3x.png" >/dev/null
sips -z 80 80 "$ICON_SOURCE" --out "$ICON_SET/iphone-spotlight-40@2x.png" >/dev/null
sips -z 120 120 "$ICON_SOURCE" --out "$ICON_SET/iphone-spotlight-40@3x.png" >/dev/null
sips -z 120 120 "$ICON_SOURCE" --out "$ICON_SET/iphone-app-60@2x.png" >/dev/null
sips -z 180 180 "$ICON_SOURCE" --out "$ICON_SET/iphone-app-60@3x.png" >/dev/null
sips -z 20 20 "$ICON_SOURCE" --out "$ICON_SET/ipad-notification-20.png" >/dev/null
sips -z 40 40 "$ICON_SOURCE" --out "$ICON_SET/ipad-notification-20@2x.png" >/dev/null
sips -z 29 29 "$ICON_SOURCE" --out "$ICON_SET/ipad-settings-29.png" >/dev/null
sips -z 58 58 "$ICON_SOURCE" --out "$ICON_SET/ipad-settings-29@2x.png" >/dev/null
sips -z 40 40 "$ICON_SOURCE" --out "$ICON_SET/ipad-spotlight-40.png" >/dev/null
sips -z 80 80 "$ICON_SOURCE" --out "$ICON_SET/ipad-spotlight-40@2x.png" >/dev/null
sips -z 76 76 "$ICON_SOURCE" --out "$ICON_SET/ipad-app-76.png" >/dev/null
sips -z 152 152 "$ICON_SOURCE" --out "$ICON_SET/ipad-app-76@2x.png" >/dev/null
sips -z 167 167 "$ICON_SOURCE" --out "$ICON_SET/ipad-pro-83.5@2x.png" >/dev/null
cp "$ICON_SOURCE" "$ICON_SET/marketing-1024.png"
printf '%s\n' '{' '  "images": [' '    { "idiom": "iphone", "size": "20x20", "scale": "2x", "filename": "iphone-notification-20@2x.png" },' '    { "idiom": "iphone", "size": "20x20", "scale": "3x", "filename": "iphone-notification-20@3x.png" },' '    { "idiom": "iphone", "size": "29x29", "scale": "2x", "filename": "iphone-settings-29@2x.png" },' '    { "idiom": "iphone", "size": "29x29", "scale": "3x", "filename": "iphone-settings-29@3x.png" },' '    { "idiom": "iphone", "size": "40x40", "scale": "2x", "filename": "iphone-spotlight-40@2x.png" },' '    { "idiom": "iphone", "size": "40x40", "scale": "3x", "filename": "iphone-spotlight-40@3x.png" },' '    { "idiom": "iphone", "size": "60x60", "scale": "2x", "filename": "iphone-app-60@2x.png" },' '    { "idiom": "iphone", "size": "60x60", "scale": "3x", "filename": "iphone-app-60@3x.png" },' '    { "idiom": "ipad", "size": "20x20", "scale": "1x", "filename": "ipad-notification-20.png" },' '    { "idiom": "ipad", "size": "20x20", "scale": "2x", "filename": "ipad-notification-20@2x.png" },' '    { "idiom": "ipad", "size": "29x29", "scale": "1x", "filename": "ipad-settings-29.png" },' '    { "idiom": "ipad", "size": "29x29", "scale": "2x", "filename": "ipad-settings-29@2x.png" },' '    { "idiom": "ipad", "size": "40x40", "scale": "1x", "filename": "ipad-spotlight-40.png" },' '    { "idiom": "ipad", "size": "40x40", "scale": "2x", "filename": "ipad-spotlight-40@2x.png" },' '    { "idiom": "ipad", "size": "76x76", "scale": "1x", "filename": "ipad-app-76.png" },' '    { "idiom": "ipad", "size": "76x76", "scale": "2x", "filename": "ipad-app-76@2x.png" },' '    { "idiom": "ipad", "size": "83.5x83.5", "scale": "2x", "filename": "ipad-pro-83.5@2x.png" },' '    { "idiom": "ios-marketing", "size": "1024x1024", "scale": "1x", "filename": "marketing-1024.png" }' '  ],' '  "info": { "author": "xcode", "version": 1 }' '}' > "$ICON_SET/Contents.json"
