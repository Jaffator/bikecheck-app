# Expo replacements for the 8 Capacitor plugins

Research for [#25](https://github.com/Jaffator/bikecheck-app/issues/25), child of map [#23](https://github.com/Jaffator/bikecheck-app/issues/23).
Date: 2026-08-28. Expo SDK reference read at `latest`, which resolves to **v57.0.0**
([Expo SDK reference](https://docs.expo.dev/versions/latest/)).

There is no existing convention for research notes in this repo (`docs/` holds `adr/`,
`conventions/`, `ui/`). This note is filed under `docs/research/`.

## Summary table

| Capacitor plugin | Expo / RN replacement | Config plugin | Dev build | iOS story |
|---|---|---|---|---|
| `@capacitor/app` | RN core `AppState` + `BackHandler`, plus `expo-linking` | no | no (all in Expo Go) | AppState + Linking are cross-platform; `BackHandler` is Android-only *by design* |
| `@capacitor/browser` | `expo-web-browser` | no | no | Full — `SFSafariViewController` / `ASWebAuthenticationSession` |
| `@capacitor/haptics` | `expo-haptics` | no | no | Full — iOS haptics engine (iOS is the better platform here) |
| `@capacitor/network` | `expo-network` | no | no | Full, with one documented weakness (see below) |
| `@capacitor/push-notifications` | `expo-notifications` | **yes** | **yes** | Full API, but delivery needs APNs key + paid Apple account |
| `@capawesome/capacitor-google-sign-in` | `react-native-nitro-google-signin` (preferred) or `@react-native-google-signin/google-signin` | **yes** | **yes** | Full — Google Sign-In SDK, needs `iosUrlScheme` / plist |
| `@capawesome/capacitor-navigation-bar` | `expo-navigation-bar` | yes (optional props) | no | Android-only concept; iOS analogue is safe-area insets — expected, not a gap |
| `@capawesome/capacitor-android-edge-to-edge-support` | nothing to install — edge-to-edge is Expo's default since SDK 54; `react-native-safe-area-context` handles insets | n/a | no | Android-only concept; on iOS the same `useSafeAreaInsets` covers notch/home indicator |

**The one real gap:** `App.minimizeApp()` (used in `layout/AppLayout.tsx:175`) has **no
first-party Expo or React Native equivalent**. Details in §1.

---

## 1. `@capacitor/app`

**Used for three things, all in three files:**

- `App.addListener("backButton", …)` — `hooks/useAndroidBackButton.ts`
- `App.addListener("appUrlOpen", …)` — `hooks/useStravaDeepLink.ts`
- `App.minimizeApp()` — `layout/AppLayout.tsx:175`, when `location.key === "default"`

There is no single Expo module for this; it splits three ways.

### backButton → `BackHandler` (React Native core)

`BackHandler` is a core RN API, "Android-only", with
`addEventListener('hardwareBackPress', handler)` returning a `NativeEventSubscription`
that you `.remove()`. Returning `true` from the handler stops the event bubbling;
returning `false`/`null`/`undefined` lets the default behaviour run.
Source: [React Native — BackHandler](https://reactnative.dev/docs/backhandler).

This is a shape-for-shape match with `useAndroidBackButton`, including the
`Capacitor.isNativePlatform()` guard becoming unnecessary (the module simply does nothing
on iOS). **iOS:** no hardware back button exists; the API is a no-op there. Expected.

### appUrlOpen → `expo-linking` (and mostly obsolete, see §2)

`expo-linking` supports Android, iOS, tvOS, web and Expo Go. Incoming links via
`Linking.addEventListener('url', handler)`, the `useLinkingURL()` hook,
`getInitialURL()` for cold starts, and `parse()`/`createURL()`. Schemes are declared in
app config under `expo.scheme` (or `expo.android.scheme` / `expo.ios.scheme`, which take
precedence). No config plugin, no dev build.
Source: [expo-linking](https://docs.expo.dev/versions/latest/sdk/linking/).

**iOS:** fully supported; `expo.ios.scheme` covers the custom-scheme case, and the same
URL scheme registration is what an eventual iOS Strava round trip needs.

Note: the Strava case specifically should *not* be ported as
`Linking.addEventListener` — see §2, `openAuthSessionAsync` collapses the whole
listener + `Browser.close()` dance into one awaited call.

### foreground/background → `AppState` (React Native core)

Not currently used by the app, but it is the `@capacitor/app` surface that would be
needed if any `appStateChange` behaviour is added during the port. Core RN, `active` /
`background` / `inactive`, `AppState.addEventListener('change', …)`.
Source: [React Native — AppState](https://reactnative.dev/docs/appstate).

### `minimizeApp()` → **no equivalent** ⚠️

`BackHandler` exposes only `exitApp()`, which *quits* the app. The RN docs are explicit
that there is no built-in API to move the app to the background — no `moveTaskToBack`
binding — and that native/third-party code is required for it
([React Native — BackHandler](https://reactnative.dev/docs/backhandler)).
Nothing in the Expo SDK v57 reference covers it either
([Expo SDK reference](https://docs.expo.dev/versions/latest/)).

Options, in the order I would rank them:

1. **Drop the call.** Let the root-level back press return `false` from the
   `BackHandler` handler and let Android's own default behaviour take over. This is the
   zero-dependency route and matches what most RN apps do. Behavioural difference from
   today: Android's default finishes the activity rather than backgrounding the task, so
   the next launch is a cold start. That is a *parity* question the map has to answer,
   not a technical blocker.
2. **A ~20-line local Expo Module.** `expo-modules-core` supports in-project native
   modules; an Android-only `moveTaskToBack(true)` wrapper is about as small as a native
   module gets, and it keeps the dependency surface at zero. It does force a dev build,
   which the app already needs for push and Google sign-in (§5, §6), so the marginal
   cost is nil.
3. **Community package** — e.g. `@kangfenmao/react-native-minimizer`, which advertises
   `Minimizer.minimize()` on Android and iOS. **I could not verify this one**: the npm
   page returned HTTP 403 to the fetch, so I have no confirmed version, publish date,
   maintenance status or New Architecture support. Do not adopt it without checking those
   first.

**iOS:** iOS has no supported way to background yourself programmatically (Apple rejects
apps that do), so option 1 is the only iOS-safe answer anyway. This reinforces choosing
option 1 or 2 with an Android-only guard.

---

## 2. `@capacitor/browser` → `expo-web-browser`

**Call sites:** `features/strava/strava.queries.ts:20`, `features/add_bike_page/useAddBikeWizard.ts:569`
(both `Browser.open({ url })` for the Strava OAuth authorize URL),
`features/service/ServiceDetailSheet.tsx:397` (`Browser.open` on a service attachment URL),
and `hooks/useStravaDeepLink.ts` (`Browser.close()`).

`expo-web-browser` supports Android, iOS, web and Expo Go. No config plugin, no dev
build. Android uses Chrome Custom Tabs; iOS uses `SFSafariViewController` for plain
browsing and `ASWebAuthenticationSession` for auth sessions.
Source: [expo-web-browser](https://docs.expo.dev/versions/latest/sdk/webbrowser/).

Mapping:

- `Browser.open({ url })` for the attachment link → `openBrowserAsync(url)`. Direct swap.
- `Browser.open({ url })` for **Strava OAuth** → `openAuthSessionAsync(url, redirectUrl)`.
  This is the better port. It returns a promise resolving with the redirect result, so
  the entire `App.addListener("appUrlOpen") → Browser.close() → invalidateQueries →
  navigate()` sequence in `useStravaDeepLink.ts` becomes the code after one `await`.
- `Browser.close()` → `dismissBrowser()`, **but the docs mark it iOS-only**. On Android
  the Custom Tab closes itself when the redirect fires. This is precisely why the Strava
  flow should move to `openAuthSessionAsync` rather than being ported literally — the
  literal port would rely on an API that is a no-op on the only platform this map ships.

**iOS:** fully supported, and `openAuthSessionAsync` is the *more* iOS-correct choice —
the docs note that since iOS 11 `SFSafariViewController` no longer shares cookies with
Safari, which is why the auth path uses `ASWebAuthenticationSession`.

---

## 3. `@capacitor/haptics` → `expo-haptics`

**Call site:** `utils/haptics.ts` — a single `Haptics.impact({ style: ImpactStyle.Light })`
behind an `isNativePlatform()` guard.

`expo-haptics` supports Android, iOS and web. No config plugin, no dev build.
`impactAsync(style)` with `ImpactFeedbackStyle.{Light,Medium,Heavy,Rigid,Soft}`; also
`notificationAsync()`, `selectionAsync()`, and an Android-specific
`performAndroidHapticsAsync()`. The docs describe it as "the system's vibration effects
on Android, the haptics engine on iOS, and the Web Vibration API on web".
Source: [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/).

`tapFeedback()` becomes `void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` and
the platform guard can go.

**iOS:** fully supported and materially better than Android — the Taptic Engine is the
platform this API was designed around.

---

## 4. `@capacitor/network` → `expo-network`

**Call sites:** `hooks/useNetworkStatus.ts` (`getStatus()` + `addListener("networkStatusChange")`)
and `features/offline_page/OfflinePage.tsx:10` (`getStatus()` for the retry button).

`expo-network` supports Android, iOS, tvOS, web and Expo Go. No config plugin needed —
the docs state Android permissions are added automatically. API:
`getNetworkStateAsync()`, the `useNetworkState()` hook, and `addNetworkStateListener()`.
State fields: `isConnected`, `isInternetReachable`, `type`.
Source: [expo-network](https://docs.expo.dev/versions/latest/sdk/network/).

- `Network.getStatus().then(s => s.connected)` → `getNetworkStateAsync()` → `isConnected`.
- `Network.addListener("networkStatusChange", …)` → `addNetworkStateListener(…)`, or
  collapse the whole hook into `useNetworkState()` — that hook does the subscribe/
  unsubscribe itself, which removes the `listener.then(h => h.remove())` cleanup.

**iOS caveat worth recording:** the docs state that on iOS `isInternetReachable` "will
always be the same as `isConnected`", i.e. iOS cannot independently confirm the internet
is actually reachable, whereas Android checks for a validated internet-capable network.
The current app only ever reads `connected`, so this changes nothing today — but if the
offline story (still listed as *not yet specified* in map #23) starts leaning on
`isInternetReachable`, it will behave differently on iOS. Flagging it now while it is
cheap.

---

## 5. `@capacitor/push-notifications` → `expo-notifications` ⚠️ config plugin + dev build

**Call sites:** `hooks/usePushNotifications.ts` (permissions, register, three listeners)
and `components/InAppNotification.tsx:3` (type-only import of `PushNotificationSchema`).

`expo-notifications` supports Android and iOS, **has a config plugin**, and needs
`npx expo run:[android|ios]` or an EAS build. Remote push is **unavailable in Expo Go on
Android from SDK 53 onwards** and requires a development build.
Source: [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/).
The push-notifications setup guide confirms FCM V1 credentials and the config plugin for
Android, and for iOS "a paid Apple Developer Account is required to generate credentials",
plus a registered physical device and an APNs key.
Source: [Push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/).

**This app does not use Expo's push service and must not start.** The backend
(`_backend/apps/monolith/src/notification/push.service.ts`) is `firebase-admin`:
`initializeApp({ credential: cert(serviceAccount) })` and
`getMessaging().sendEachForMulticast({ tokens, … })`, sending to raw FCM registration
tokens stored in `device_tokens`. So the RN side must register the **native** token:

- `PushNotifications.register()` + `addListener("registration", …)` →
  **`getDevicePushTokenAsync()`**, which the docs describe as returning "a native FCM,
  APNs token or a `PushSubscription`" for use with push services other than Expo's.
  ([expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/))
  Not `getExpoPushTokenAsync()` — that would hand the backend a token `firebase-admin`
  cannot send to.
- `requestPermissions()` → `requestPermissionsAsync()`.
- `pushNotificationReceived` (foreground banner) → `addNotificationReceivedListener()`,
  paired with `setNotificationHandler()` to decide whether the OS also shows it. Note the
  current code shows its own in-app banner for foreground pushes; `setNotificationHandler`
  is where that decision now lives, and it has no Capacitor counterpart.
- `pushNotificationActionPerformed` (tray tap → `data.route`) →
  `addNotificationResponseReceivedListener()`, and importantly
  **`useLastNotificationResponse()`** for the cold-start case — the docs describe it as
  returning the most recently received response and supporting opening a URL from the
  notification's `data`. The current Capacitor code has a latent cold-start gap here that
  the port can close for free.
- `PushNotificationSchema` (the type-only import in `InAppNotification.tsx`) →
  `Notifications.Notification` / `NotificationContent`.

`registerFcmToken(token.value, Capacitor.getPlatform())` becomes
`registerFcmToken(token.data, Platform.OS)` — the backend already takes a platform string,
so no backend change.

**Android setup is already half done:** `_frontend/bikecheck/android/app/google-services.json`
exists and can be reused via `expo.android.googleServicesFile`
([app config reference](https://docs.expo.dev/versions/latest/config/app/)).

**iOS:** the JS API is identical, and `getDevicePushTokenAsync()` returns an APNs token
that `firebase-admin` can send to once the Firebase project has an APNs key uploaded. But
iOS *delivery* needs the paid Apple Developer account and a real device — which map #23
already puts out of scope. So: **iOS story confirmed at the API level, blocked at the
credentials level, and that blocker is already an acknowledged out-of-scope item.**

---

## 6. `@capawesome/capacitor-google-sign-in` → third-party, config plugin + dev build ⚠️

This is the important one, so first what the backend actually consumes.

### What `/auth/google/token` requires

`_backend/apps/monolith/src/auth/auth.controller.ts:142` takes `GoogleTokenDto`, which is
exactly `{ idToken: string }` (`dto/auth.dtos.ts:19`). It hands the token to
`GoogleAuthService.verifyIdToken`, `_backend/apps/monolith/src/auth/googleAuth.service.ts:22`:

```ts
const ticket = await this.oauthClient.verifyIdToken({
  idToken,
  audience: process.env.GOOGLE_CLIENT_ID!,
});
```

Then it reads `payload.sub`, `email`, `email_verified`, `name`, `picture`.

Two constraints fall out of this:

1. **The token must be a Google ID token (JWT), not an access token or a server auth code.**
2. **Its `aud` must equal `GOOGLE_CLIENT_ID`** — a single value, and the same env var
   `strategy/google.strategy.ts:10` passes as `clientID` to the passport Google strategy.
   That is the **Web** OAuth client ID.

Google's own docs agree that this is the correct arrangement: the backend-auth guide says
the server must check "The value of `aud` in the ID token is equal to one of your app's
client IDs" and its example comment reads "Specify the WEB_CLIENT_ID of the app that
accesses the backend"
([Google — Authenticate with a backend server](https://developers.google.com/identity/sign-in/android/backend-auth)).
On the Android side, `GetGoogleIdOption.setServerClientId(WEB_CLIENT_ID)` is documented as
"the **Web Client ID** you set up for OAuth in your Google Cloud Project", explicitly not
the Android client ID
([Android — Sign in with Google implementation](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation)).

This is already what the app does today: `main.tsx:19` calls
`GoogleSignIn.initialize({ clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID })`, and
`features/login_page/Authentication.tsx` posts `result.idToken` to the endpoint.

**So the backend needs no change and the port is a like-for-like swap — provided the
chosen module is configured with the Web client ID.** This is the single most common way
to get this wrong; the failure mode is a 401 from `verifyIdToken`, not a compile error.

### There is no first-party Expo module

Expo's own [Google authentication guide](https://docs.expo.dev/guides/google-authentication/)
lists **two third-party libraries** and states: "Because they require custom native code,
you'll need to use a config plugin in the app config and build a development build" and
that they "can't be used in Expo Go". So: **config plugin yes, dev build yes**, whichever
is picked. (`expo-auth-session`'s Google provider is not what that guide points at any
more; I did not find it recommended for native sign-in on the current guide page.)

#### Option A — `react-native-nitro-google-signin` (my recommendation)

- Repo `react-native-nitro-google-sign-in/google-signin`, MIT, not archived, last pushed
  2026-08-27, 38 stars (verified via `gh api`). Small and young — that is the honest
  downside.
- Android via **Credential Manager**, iOS via the Google Sign-In SDK; requires RN 0.76+.
  ([project site](https://react-native-nitro-google-sign-in.github.io))
- Expo plugin entry is `"plugins": ["react-native-nitro-google-signin"]` with
  `android.googleServicesFile` / `ios.googleServicesFile`, or without Firebase the
  plugin takes `{ "iosUrlScheme": "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID" }`.
  Explicitly "does not run in Expo Go".
  ([Expo setup](https://react-native-nitro-google-sign-in.github.io/docs/setup/expo/))
- `GoogleOneTapSignIn.configure({ webClientId })`, and the sign-in response exposes
  `response.data.idToken`. `webClientId: 'autoDetect'` reads the ID from the config files;
  an explicit string is accepted when there is no `google-services.json` entry.
- The Google Cloud page states the Web client is "used for backend ID token verification"
  and that Web/Android/iOS clients must live in the same Google Cloud project.
  ([Google Cloud & config files](https://react-native-nitro-google-sign-in.github.io/docs/setup/google-cloud/))
  **Not verified:** that page does not literally spell out that `aud` equals the web
  client ID. The Google and Android docs cited above do, and Credential Manager is the
  same mechanism the current Capawesome plugin uses, so I am confident — but the claim
  comes from Google's docs, not from this library's.

**Why I lean here:** it is the option whose Android path is Credential Manager *for free*,
which is what the app runs today via Capawesome, and Google has been steering Android away
from the legacy Google Sign-In SDK.

⚠️ **Concrete gotcha found in this repo:** `_frontend/bikecheck/android/app/google-services.json`
contains **no `oauth_client` entries at all** (I parsed it — the single client for
`com.bikecheck.app` has an empty oauth client list). So `webClientId: 'autoDetect'` will
not find anything. The Web client ID must be passed explicitly, exactly as
`VITE_GOOGLE_CLIENT_ID` does today. Adding the release/debug SHA-1 to the Firebase project
would populate that file, which is worth doing anyway for the dev build.

#### Option B — `@react-native-google-signin/google-signin`

- Repo `react-native-google-signin/google-signin`, MIT, not archived, last pushed
  2026-07-27, 3551 stars (verified via `gh api`). The mature, widely used option.
- Expo plugin `"@react-native-google-signin/google-signin"`, with
  `{ "iosUrlScheme": "com.googleusercontent.apps._some_id_here_" }` when not using
  Firebase, or `android.googleServicesFile` / `ios.googleServicesFile` when using it.
  "Cannot be used in Expo Go because it uses native code."
  ([Expo setup](https://react-native-google-signin.github.io/docs/setting-up/expo))
- `configure({ webClientId })` — documented as "client ID of type WEB for your server",
  "needed to obtain the `idToken`". `signIn()` resolves to a `SignInResponse` union of
  `SignInSuccessResponse = { data: User; type: "success" }` and `CancelledResponse`; the
  token is at **`response.data.idToken`** (`string | null`).
  ([original sign-in](https://react-native-google-signin.github.io/docs/original),
  [API reference](https://react-native-google-signin.github.io/docs/api))
- ⚠️ **The licensing catch.** The free "original" API uses the *legacy, deprecated*
  Android Google Sign-In SDK; the Credential Manager / One-Tap API is behind a paid
  licence — the docs say plainly: "The functionality covered in this page is available in
  the licensed version."
  ([One-tap](https://react-native-google-signin.github.io/docs/one-tap))
  Both paths still yield an ID token, so the backend works either way. But it means the
  free path is a *step backwards* from where the app is today on Android.

**iOS story for both:** confirmed and equivalent — the Google Sign-In SDK on iOS,
`iosClientId` (or taken from `GoogleService-Info.plist`), plus the reversed-client-ID URL
scheme in the config plugin. The ID token is the same shape, so `/auth/google/token`
serves iOS unchanged. What iOS needs beyond Android is: an iOS OAuth client in the same
Google Cloud project, `ios.googleServicesFile` or the explicit `iosUrlScheme`, and (for
nitro) optionally `GIDSignIn.sharedInstance.handle(url)` in the AppDelegate after prebuild.
None of that is a blocker; all of it is config.

**One behaviour note for the port:** `handleGoogleSignIn()` currently branches on
`Capacitor.getPlatform()` and sends web users to `${VITE_API_BASE_URL}/auth/google`.
In RN there is no web branch — every path is native, so the branch collapses and the
`/auth/google` redirect flow is web-frontend-only from then on.

---

## 7. `@capawesome/capacitor-navigation-bar` → `expo-navigation-bar`

**Notable finding: this plugin has no JS call site in the app.** Grepping
`_frontend/bikecheck/src` for `NavigationBar` returns nothing; the only hits outside
`package.json`/`package-lock.json` are the generated Capacitor Gradle wiring
(`android/app/capacitor.build.gradle`, `android/capacitor.settings.gradle`) and unrelated
Android attributes (`MainActivity.java:19` `setNavigationBarContrastEnforced(false)`,
`styles.xml` `android:windowLightNavigationBar`). So there is no runtime behaviour to
port — only the *effect*: contrast enforcement off, light nav bar icons off.

Equivalent: `expo-navigation-bar`, **Android and Expo Go only**, with a config plugin
configurable in `app.json` via `enforceContrast`, `hidden` and `style`. API is
`setHidden()` and `setStyle('auto' | 'light' | 'dark' | 'inverted')`. The docs note that
`getVisibilityAsync()`, `setVisibilityAsync()`, `useVisibility()` and the event
subscriptions are **deprecated** and slated for removal, and that a nav bar style change
only takes effect when the device uses button navigation and the plugin's
`enforceContrast` is `false`. There is no `setBackgroundColorAsync()` in the current API.
Source: [expo-navigation-bar](https://docs.expo.dev/versions/latest/sdk/navigation-bar/).

That `enforceContrast: false` plugin option is the direct replacement for the
`setNavigationBarContrastEnforced(false)` line in `MainActivity.java` — which means the
custom `MainActivity` edit disappears and becomes app config. Good outcome for a
prebuild-based Expo project.

**iOS:** not supported and not needed — there is no Android-style navigation bar. The
iOS analogue is the home-indicator inset, handled by `useSafeAreaInsets().bottom` from
`react-native-safe-area-context` (§8). Per the ticket, this is expected, not a gap.

---

## 8. `@capawesome/capacitor-android-edge-to-edge-support` → nothing to install

**Call sites:** `main.tsx:6,27` (`void EdgeToEdge.disable()` when native) and
`capacitor.config.ts` (`EdgeToEdge.backgroundColor`, `android.adjustMarginsForEdgeToEdge: "force"`).

Note the app currently **disables** edge-to-edge at runtime while also configuring it —
the config comment says the background is transparent so the floating nav shows through
to the gesture bar. Whatever the intent, the RN answer is not to reproduce the toggle.

Expo's position, from the Expo blog: edge-to-edge is on by default for new projects from
**SDK 53** with `"edgeToEdgeEnabled": false` as an opt-out; it becomes the default for
**new and existing** projects in **SDK 54**; and Expo moved off the `react-native-edge-to-edge`
dependency in SDK 54 in favour of React Native's `enableEdgeToEdge` Gradle property. A new
`androidNavigationBar.enforceContrast` replaces the older `enforceNavigationBarContrast`.
Critically: "All apps targeting Android 16 and running on Android 16 no longer support the
opt-out of edge-to-edge property" — Google removed the escape hatch at API 36.
Source: [Edge-to-Edge display, now streamlined for Android](https://expo.dev/blog/edge-to-edge-display-now-streamlined-for-android).

Consistent with that, I searched the **v57.0.0** app config reference and found **no
`android.edgeToEdgeEnabled` property** ([app config](https://docs.expo.dev/versions/latest/config/app/)).
I could not find an explicit statement in the v57 docs that the key was removed rather
than merely undocumented — **treat "the opt-out no longer exists in SDK 57" as inferred,
not verified**. It does not change the recommendation: SDK 55 already targets Android 16
(compile/target SDK 36), where Android itself ignores the opt-out.

**Practical consequence for the port:** `EdgeToEdge.disable()` has no replacement and
should not get one. The app must instead be laid out under permanent edge-to-edge:

- `react-native-safe-area-context` — **part of the Expo SDK**, Android/iOS/tvOS/web,
  in Expo Go. `SafeAreaProvider` at the root, `useSafeAreaInsets()` for insets, and
  `SafeAreaView`. The docs describe it as positioning content around "notches, status
  bars, home indicators, and other such device and operating system interface elements".
  Source: [react-native-safe-area-context](https://docs.expo.dev/versions/latest/sdk/safe-area-context/).
- `expo-status-bar` and `expo-navigation-bar` for the bar appearance itself
  ([System bars](https://docs.expo.dev/develop/user-interface/system-bars/)).
- For keyboard behaviour under edge-to-edge — which the app cares about; see
  `useScrollIntoViewOnFocus` in `Authentication.tsx` and the Capacitor
  `Keyboard.resizeOnFullScreen: false` config — the Expo blog recommends
  `KeyboardAvoidingView` or preferably `react-native-keyboard-controller`.

**iOS:** this is where the story converges rather than diverges. The same
`useSafeAreaInsets()` hook that keeps content clear of the Android system bars keeps it
clear of the iOS notch/Dynamic Island and home indicator. Building the RN layout on
safe-area insets from day one is the single cheapest thing this map can do for the later
iOS port. All the existing `env(safe-area-inset-bottom)` CSS (e.g. `Authentication.tsx`)
translates directly into `useSafeAreaInsets().bottom`.

---

## What could not be verified

- `@kangfenmao/react-native-minimizer` — npm returned HTTP 403; version, publish date,
  maintenance and New Architecture support all unknown (§1).
- That `edgeToEdgeEnabled` is *removed* (rather than just undocumented) in SDK 57's app
  config reference (§8). Its absence from the v57 reference is confirmed; the removal is
  inferred from the Expo blog plus Android 16's behaviour.
- `react-native-nitro-google-signin`'s own docs do not literally state that the ID token's
  `aud` equals the web client ID; that claim rests on Google's and Android's docs (§6).
- Exact current version numbers for the two Google sign-in libraries — neither docs site
  states one inline; the GitHub metadata (licence, last push, stars) was verified via
  `gh api` on 2026-08-28.

## Sources

- [Expo SDK reference (v57.0.0)](https://docs.expo.dev/versions/latest/)
- [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)
- [expo-network](https://docs.expo.dev/versions/latest/sdk/network/)
- [expo-web-browser](https://docs.expo.dev/versions/latest/sdk/webbrowser/)
- [expo-navigation-bar](https://docs.expo.dev/versions/latest/sdk/navigation-bar/)
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [expo-linking](https://docs.expo.dev/versions/latest/sdk/linking/)
- [react-native-safe-area-context](https://docs.expo.dev/versions/latest/sdk/safe-area-context/)
- [Expo app config reference](https://docs.expo.dev/versions/latest/config/app/)
- [Expo — Google authentication guide](https://docs.expo.dev/guides/google-authentication/)
- [Expo — Push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [Expo — System bars](https://docs.expo.dev/develop/user-interface/system-bars/)
- [Expo blog — Edge-to-Edge display, now streamlined for Android](https://expo.dev/blog/edge-to-edge-display-now-streamlined-for-android)
- [React Native — BackHandler](https://reactnative.dev/docs/backhandler)
- [React Native — AppState](https://reactnative.dev/docs/appstate)
- [react-native-nitro-google-signin — home](https://react-native-nitro-google-sign-in.github.io)
- [react-native-nitro-google-signin — Expo setup](https://react-native-nitro-google-sign-in.github.io/docs/setup/expo/)
- [react-native-nitro-google-signin — Google Cloud & config files](https://react-native-nitro-google-sign-in.github.io/docs/setup/google-cloud/)
- [@react-native-google-signin/google-signin — Expo setup](https://react-native-google-signin.github.io/docs/setting-up/expo)
- [@react-native-google-signin/google-signin — original sign-in](https://react-native-google-signin.github.io/docs/original)
- [@react-native-google-signin/google-signin — API reference](https://react-native-google-signin.github.io/docs/api)
- [@react-native-google-signin/google-signin — one-tap (licensed)](https://react-native-google-signin.github.io/docs/one-tap)
- [Google — Authenticate with a backend server](https://developers.google.com/identity/sign-in/android/backend-auth)
- [Android — Sign in with Google implementation](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation)
