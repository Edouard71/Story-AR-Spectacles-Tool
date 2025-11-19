import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";
import { BaseButton } from "SpectaclesUIKit.lspkg/Scripts/Components/Button/BaseButton";
import animate from "SpectaclesInteractionKit.lspkg/Utils/animate";

type VoiceTriggerSource =
  | "button"
  | "gesture"
  | "gesture-left"
  | "gesture-right"
  | "external";

@component
export class ASRQueryController extends BaseScriptComponent {
  @input
  private button: BaseButton;
  @input
  private activityRenderMesh: RenderMeshVisual;
  @input
  private enableRightPalmTapTrigger: boolean = false;
  @input
  private enableLeftPalmTapTrigger: boolean = false;
  private activityMaterial: Material;

  private asrModule: AsrModule = require("LensStudio:AsrModule");
  private gestureModule: any = require("LensStudio:GestureModule");
  private isRecording: boolean = false;
  private rightGrabEvent: any = null;
  private rightGrabHandler: (() => void) | null = null;
  private rightGrabBinding: any = null;
  private leftGrabEvent: any = null;
  private leftGrabHandler: (() => void) | null = null;
  private leftGrabBinding: any = null;
  private gestureHandType: any = null;
  private activeResolve: ((text: string) => void) | null = null;
  private activeReject: ((reason: any) => void) | null = null;

  public onQueryEvent: Event<string> = new Event<string>();

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.init.bind(this));
  }

  onDestroy() {
    this.teardownGestureTrigger();
  }

  private init() {
    this.activityMaterial = this.activityRenderMesh.mainMaterial.clone();
    this.activityRenderMesh.clearMaterials();
    this.activityRenderMesh.mainMaterial = this.activityMaterial;
    this.activityMaterial.mainPass.in_out = 0;

    if (this.button) {
      this.button.onInitialized.add(() => {
        this.button.onTriggerUp.add(() => {
          this.triggerVoiceCapture("button");
        });
      });
    } else {
      print("[ASRQueryController] ⚠️ Mic button input not assigned.");
    }

    this.refreshGestureTriggers();
  }

  public triggerVoiceCapture(source: VoiceTriggerSource = "external") {
    if (this.isRecording) {
      const isGestureTrigger = source.indexOf("gesture") === 0;
      if (isGestureTrigger) {
        print(`[ASRQueryController] ${source} cancel requested.`);
        this.failRecording("Gesture cancel");
      } else {
        print(
          `[ASRQueryController] Ignoring ${source} trigger — already capturing voice.`
        );
      }
      return;
    }

    this.getVoiceQuery()
      .then((query) => {
        this.onQueryEvent.invoke(query);
      })
      .catch((err) => {
        if (err === "Gesture cancel") {
          print("[ASRQueryController] Capture cancelled via gesture.");
        } else {
          print(`[ASRQueryController] ${source} capture error: ${err}`);
        }
      });
  }

  public triggerVoiceCaptureFromGesture(hand: "left" | "right" | "gesture" = "gesture") {
    print(`[ASRQueryController] Gesture detected from: ${hand}`);
    const label =
      hand === "left"
        ? "gesture-left"
        : hand === "right"
        ? "gesture-right"
        : "gesture";
    this.triggerVoiceCapture(label as VoiceTriggerSource);
  }

  public configureGestureTriggers(options: {
    enableRight?: boolean;
    enableLeft?: boolean;
  }) {
    let changed = false;
    if (typeof options.enableRight === "boolean") {
      this.enableRightPalmTapTrigger = options.enableRight;
      changed = true;
    }
    if (typeof options.enableLeft === "boolean") {
      this.enableLeftPalmTapTrigger = options.enableLeft;
      changed = true;
    }
    if (changed) {
      this.refreshGestureTriggers();
    }
  }

  private getVoiceQuery(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.isRecording) {
        reject("Already recording");
        return;
      }
      this.isRecording = true;
      this.activeResolve = resolve;
      this.activeReject = reject;
      let asrSettings = AsrModule.AsrTranscriptionOptions.create();
      asrSettings.mode = AsrModule.AsrMode.HighAccuracy;
      asrSettings.silenceUntilTerminationMs = 1500;
      asrSettings.onTranscriptionUpdateEvent.add((asrOutput) => {
        print(asrOutput.text);
        if (asrOutput.isFinal) {
          this.completeRecording(asrOutput.text);
        }
      });
      asrSettings.onTranscriptionErrorEvent.add((asrOutput) => {
        this.failRecording(asrOutput);
      });
      this.animateVoiceIndicator(true);
      this.asrModule.startTranscribing(asrSettings);
    });
  }

  private refreshGestureTriggers() {
    if (!this.ensureGestureModule()) {
      return;
    }

    this.ensureRightGestureSubscription();
    this.ensureLeftGestureSubscription();
  }

  private ensureGestureModule(): boolean {
    if (!this.gestureModule || !this.gestureModule.getPalmTapDownEvent) {
      print("[ASRQueryController] GestureModule unavailable or missing getPalmTapDownEvent.");
      return false;
    }

    if (!this.gestureHandType) {
      this.gestureHandType =
        this.gestureModule.HandType ||
        (globalThis as any).GestureModule?.HandType ||
        null;
    }

    if (!this.gestureHandType) {
      print("[ASRQueryController] GestureModule.HandType missing.");
      return false;
    }

    return true;
  }

  private teardownGestureTrigger() {
    try {
      if (this.rightGrabBinding && this.rightGrabBinding.remove) {
        this.rightGrabBinding.remove();
      } else if (this.rightGrabEvent && this.rightGrabHandler && this.rightGrabEvent.remove) {
        this.rightGrabEvent.remove(this.rightGrabHandler);
      }
    } catch (e) {
      print(`[ASRQueryController] ⚠️ Failed to remove right palm tap handler: ${e}`);
    }
    try {
      if (this.leftGrabBinding && this.leftGrabBinding.remove) {
        this.leftGrabBinding.remove();
      } else if (this.leftGrabEvent && this.leftGrabHandler && this.leftGrabEvent.remove) {
        this.leftGrabEvent.remove(this.leftGrabHandler);
      }
    } catch (e) {
      print(`[ASRQueryController] ⚠️ Failed to remove left palm tap handler: ${e}`);
    }
    this.rightGrabEvent = null;
    this.rightGrabHandler = null;
    this.rightGrabBinding = null;
    this.leftGrabEvent = null;
    this.leftGrabHandler = null;
    this.leftGrabBinding = null;
  }

  private ensureRightGestureSubscription() {
    if (this.rightGrabHandler) {
      return;
    }
    if (!this.enableRightPalmTapTrigger) {
      return;
    }
    this.rightGrabEvent = this.gestureModule.getPalmTapDownEvent(this.gestureHandType.Right);
    if (!this.rightGrabEvent || !this.rightGrabEvent.add) {
      print("[ASRQueryController] Failed to subscribe to right palm tap event.");
      this.rightGrabEvent = null;
      return;
    }
    this.rightGrabHandler = () => {
      if (!this.enableRightPalmTapTrigger) {
        return;
      }
      print("[ASRQueryController] Right Palm Tap (Right Index -> Left Palm) detected.");
      this.triggerVoiceCaptureFromGesture("right");
    };
    this.rightGrabBinding = this.rightGrabEvent.add(this.rightGrabHandler);
  }

  private ensureLeftGestureSubscription() {
    if (this.leftGrabHandler) {
      return;
    }
    if (!this.enableLeftPalmTapTrigger) {
      return;
    }
    this.leftGrabEvent = this.gestureModule.getPalmTapDownEvent(this.gestureHandType.Left);
    if (!this.leftGrabEvent || !this.leftGrabEvent.add) {
      print("[ASRQueryController] Failed to subscribe to left palm tap event.");
      this.leftGrabEvent = null;
      return;
    }
    this.leftGrabHandler = () => {
      if (!this.enableLeftPalmTapTrigger) {
        return;
      }
      print("[ASRQueryController] Left Palm Tap (Left Index -> Right Palm) detected.");
      this.triggerVoiceCaptureFromGesture("left");
    };
    this.leftGrabBinding = this.leftGrabEvent.add(this.leftGrabHandler);
  }

  private completeRecording(result: string) {
    if (!this.isRecording) return;
    this.isRecording = false;
    this.animateVoiceIndicator(false);
    this.asrModule.stopTranscribing();
    const resolver = this.activeResolve;
    this.activeResolve = null;
    this.activeReject = null;
    if (resolver) {
      resolver(result);
    }
  }

  private failRecording(reason: any) {
    if (!this.isRecording) return;
    this.isRecording = false;
    this.animateVoiceIndicator(false);
    this.asrModule.stopTranscribing();
    const rejecter = this.activeReject;
    this.activeResolve = null;
    this.activeReject = null;
    if (rejecter) {
      rejecter(reason);
    }
  }

  private animateVoiceIndicator(on: boolean) {
    if (on) {
      animate({
        duration: 0.5,
        easing: "linear",
        update: (t) => {
          this.activityMaterial.mainPass.in_out = t;
        },
      });
    } else {
      animate({
        duration: 0.5,
        easing: "linear",
        update: (t) => {
          this.activityMaterial.mainPass.in_out = 1 - t;
        },
      });
    }
  }
}
