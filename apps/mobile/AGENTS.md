# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

Pinned to SDK 54 (downgraded from 57 on 2026-07-28) so real-device iOS testing
works via the standard Expo Go app on the App Store. Apple's App Store review
has been stalling Expo Go updates for SDK 55+ (Expo's own changelog confirms
no reliable timeline) — SDK 54 is the last version with normal Expo Go
support; anything newer requires `eas go` via TestFlight, which needs a paid
Apple Developer Program membership. Do not bump past SDK 54 without checking
whether that's changed.
