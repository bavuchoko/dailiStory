#!/bin/bash
# iOS 빌드 오류 시 DerivedData·캐시 정리 후 재빌드
set -e
cd "$(dirname "$0")/../ios"
echo "Cleaning iOS build..."
rm -rf build
rm -rf Pods/build
rm -rf ~/Library/Developer/Xcode/DerivedData/dailyStory-*
echo "Reinstalling pods..."
pod install
echo "Done. Run: npx react-native run-ios --no-packager"
