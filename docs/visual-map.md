# Visual validation map

Last reviewed: 2026-08-21

## Observed states

| Surface | State | Evidence |
| --- | --- | --- |
| `/` | Populated preview, reference desktop top | `topmysaas-reference-final.png` |
| `/` | Populated preview, desktop full page and true bottom | `desktop-reference-full.png`, `desktop-reference-bottom.png` |
| `/` | Populated preview, five phone sizes | `mobile-iphone-se-*`, `mobile-iphone-15-*`, `mobile-iphone-15-pro-max-*`, `mobile-pixel-7-*`, `mobile-large-android-*` |
| `/` | Firebase unavailable with all bid controls disabled | `desktop-firebase-unavailable.png` |
| `/` | Checkout canceled notice | `mobile-checkout-cancelled.png` |
| `/` | Mobile navigation open | `mobile-navigation-open.png` |
| `/` | Bid dialog at desktop height | `topmysaas-bid-dialog-desktop-final.png` |
| `/` | Bid dialog at smallest phone top and exact maximum scroll | `mobile-iphone-se-dialog-top.png`, `mobile-iphone-se-dialog-bottom.png` |
| `/bid/success` | Missing session recovery | `mobile-bid-status-missing.png` |
| `/admin/login` | Firebase configuration unavailable | `admin-login-desktop.png` |
| `/terms`, `/privacy` | Desktop and mobile route content | Covered by both Playwright projects |

All image names above are stored in:

`C:\Users\ND\.codex\visualizations\2026\08\22\01a027f5-d305-7d40-9ee3-ed2a37d489a8`

## Measured viewports

| Class | Viewport | Page result |
| --- | ---: | --- |
| Reference desktop | 1168 × 784 | 1168 px scroll width equals 1168 px client width |
| Wide desktop | 1440 × 1000 | Full-page capture reviewed with no horizontal overflow |
| Tablet | 768 × 1024 | 768 px scroll width equals 768 px client width |
| Small iPhone | 375 × 667 | 375 px scroll width equals 375 px client width; true bottom captured |
| Current iPhone | 393 × 852 | 393 px scroll width equals 393 px client width |
| Large iPhone | 430 × 932 | 430 px scroll width equals 430 px client width |
| Medium Android | 412 × 915 | 412 px scroll width equals 412 px client width |
| Large Android | 480 × 1040 | 480 px scroll width equals 480 px client width |

The 375 × 667 bid dialog measured 612 px client height, 837 px scroll height, and an exact 225 px maximum scroll. Both the top and maximum scroll positions were reviewed, and the submit button and payment disclosure are reachable.

## Automated accessibility observations

Axe WCAG A/AA checks reported zero violations for the populated homepage, unavailable homepage, smallest-phone homepage, desktop and phone bid dialogs, mobile menu, missing-session return page, and admin login. Composited alpha colors remain marked by Axe for manual contrast review; reviewed screenshots showed readable foreground and state separation.

## Credential-blocked states

These require a configured Firebase project and Stripe test-mode account and were not visually certified:

- Populated admin overview, listings editor, bid activity, settings, and destructive confirmations
- Successful and failed Firebase admin authentication
- Stripe confirming, fulfilled, failed, and expired return states backed by real sessions
- Real first bid, same-device rebid, reset cutoff, and deletion-tombstone outcomes

The implementation, route contracts, mocked browser conversion flow, typecheck, and production build cover these code paths, but they are not a substitute for credential-backed visual and integration evidence.
