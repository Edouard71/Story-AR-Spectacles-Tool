# Story-AR Spectacles Context

## Project Layout
- `Assets/Scripts`: Feature logic (prop generation, NPCs, ASR, assistants, UI helpers).
- `Assets/Prefabs`: Authorable objects wired in Lens Studio (`VoiceInput`, `Snap3DInteractable`, etc.).
- `Packages`: Spectacles / RemoteService shared packages (InteractionKit, SyncKit, GestureModule, etc.).
- `Instructions/Context`: Living notes for AI agents and collaborators (this file).

## Mic → Prop Flow (Host Path)
1. `ASRQueryController` owns the microphone lifecycle. It flashes the mesh indicator, calls `AsrModule`, and emits recognized text via `onQueryEvent`.
2. `PropSetupUI` receives `onQueryEvent`, updates the prop description text, and calls `Snap3DPropController.spawnProp(description)` as soon as the field is non-empty.
3. `Snap3DPropController` (host only) asks `Snap3DInteractableFactory` for a new prop, syncs its metadata, and broadcasts the prompt/asset IDs so audience devices can mirror it.

Key assumptions:
- Only one voice capture runs at a time (`ASRQueryController` rejects concurrent triggers).
- Buttons or external triggers call the same `triggerVoiceCapture()` helper, so the UI and gestures stay in sync.
- Audience clients never call `spawnProp` directly; they rely on sync events.
- After each spawn, `PropSetupUI` clears the field and cached text so the user can immediately record another prompt without stale values.

## Right-Fist Gesture Trigger
- `ASRQueryController` now exposes:
  - `@input enableRightGrabTrigger` (default `false` → opt-in per instance).
  - `@input enableLeftGrabTrigger` (default `false`).
  - `public triggerVoiceCapture(source)` for programmatic control.
  - `public configureGestureTriggers({ enableRight, enableLeft })` to flip subscriptions at runtime.
  - Automatic subscription to `GestureModule.getGrabBeginEvent(HandType.Right)` when enabled.
- Only turn the flag on for the mic you want gestures to drive (e.g., the prop builder). Leave it off for other ASR buttons to avoid multiple controllers fighting for the same gesture.
- `SceneSetupUI` now has inputs (`useLeftHandGesture`, `useRightHandGesture`) and automatically calls `configureGestureTriggers` so the character-creation mic uses a **left** fist while props can stay on the right fist.
- When a right-hand grab (fist) begins, the controller calls `triggerVoiceCapture("gesture-right")`. A left-fist uses `"gesture-left"`. Both route through the same mic logic as pressing the UI button.
- Safeguards:
  - A second fist gesture while that controller is recording cancels the capture (ASR stops, promise rejects, indicator fades).
  - Non-gesture triggers (buttons, scripts) are still ignored while a recording is active to avoid overlapping ASR sessions.
  - Gesture subscriptions are removed in `onDestroy` to avoid leaks.

### Inspector Checklist
1. Ensure the `VoiceInput` prefab (or equivalent SceneObject) hosts `ASRQueryController`, a `BaseButton`, and the activity mesh reference.
2. In any UI that needs ASR (e.g., `PropSetupUI`), set `propRecordBtn` to that `ASRQueryController` component so the script can hook `onQueryEvent`.
3. Turn on `enableRightGrabTrigger` **only** on the prop ASR component if you prefer configuring via inspector. For the character generator, either enable `useLeftHandGesture` on `SceneSetupUI` (default `true`) or set `enableLeftGrabTrigger` directly on that ASR component.
4. Deploy to a device/Spectacles build with hand tracking enabled; the editor preview does not simulate grab gestures.

### Extending Gesture Triggers
- Other scripts can start capture without a physical button by calling `triggerVoiceCapture()` (e.g., after another gesture or UI state machine).
- Use `configureGestureTriggers({ enableLeft, enableRight })` if you need to dynamically reassign gestures (e.g., swap hands when roles change).
- You can also call `triggerVoiceCapture()` with `"gesture-left"`/`"gesture-right"` yourself to emulate the double-fist cancel behavior from other scripts.
- To support left-hand gestures, duplicate the `GestureModule.getGrabBeginEvent(HandType.Left)` logic inside `ASRQueryController` or expose another helper method.

## Naming & Conventions
- Keep new scripts under `Assets/Scripts` and use PascalCase for class names + file names.
- Prefer `@input` references instead of `find` calls to avoid runtime nulls.
- Use `print` statements with emojis/prefixes for quick filtering in Lens Studio logs (existing pattern: `[SceneSetupUI]`, `🎨`, etc.).
- When adding shared state, go through `SpectaclesSyncKit` storage properties so host/audience roles remain deterministic.

## AI Agent Notes
- Before editing, scan related scripts under `Assets/Scripts` to understand network + ASR expectations.
- Prefer TypeScript features supported by Lens Studio (ES6 classes, no modern decorators beyond `@component`/`@input` macros).
- When introducing new gestures or modules, gate them behind inspectable `@input` flags so creators can toggle features without code changes.
- Update this document with any non-obvious wiring (component graphs, prefab dependencies, platform caveats) to keep future automation grounded.

