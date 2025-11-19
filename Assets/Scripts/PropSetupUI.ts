import { ASRQueryController } from "./ASRQueryController";
import { Snap3DConversationController } from "./Snap3DConversationController";

type AsrBridge = {
  onQueryEvent: { add: (fn: (t: string) => void) => void };
  triggerVoiceCapture?: (source?: string) => void;
  configureGestureTriggers?: (options: {
    enableRight?: boolean;
    enableLeft?: boolean;
  }) => void;
};

@component
export class SceneSetupUI extends BaseScriptComponent {
  @input("Component.ScriptComponent") propController; // your PropController
  @input("Component.Text") propField: Text;
  @input("Component.ScriptComponent") propRecordBtn: BaseScriptComponent;
  @input conversationControllerObj: SceneObject;

  private propDescription = "";
  private propAsrBridge: AsrBridge | null = null;
  private conversationCtrl: Snap3DConversationController;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.init());
     this.conversationCtrl = this.conversationControllerObj.getComponent(Snap3DConversationController.getTypeName()) as Snap3DConversationController;
  }

private notifyConversationToListen() {
  if (this.conversationCtrl && this.conversationCtrl.restartListening) {
    print("🔄 PropController: Restarting NPC Listening");
    this.conversationCtrl.restartListening();
  } else {
    print("⚠️ No ConversationController found, skipping restart.");
  }
}

  private init() {
    const propCtl = this.resolveAsrController(this.propRecordBtn, "prop");
    if (propCtl) {
      this.propAsrBridge = propCtl;
      propCtl.onQueryEvent.add((t: string) => this.updateField("prop", t));
      if (!propCtl.triggerVoiceCapture) {
        print(
          "[SceneSetupUI] ℹ️ triggerVoiceCapture() not exposed; gestures still fire via ASR component."
        );
      }
    }

    print("[SceneSetupUI] ✅ Initialized (Prop Builder)");
  }

  public startPropVoiceCapture() {
    if (this.propAsrBridge && this.propAsrBridge.triggerVoiceCapture) {
      this.propAsrBridge.triggerVoiceCapture("external");
    } else {
      print(
        "[SceneSetupUI] ⚠️ Cannot trigger prop voice capture — bridge missing triggerVoiceCapture()."
      );
    }
  }

  private resolveAsrController(comp: any, tag: string): AsrBridge | null {
    if (!comp) {
      print(`[SceneSetupUI] ⚠️ ${tag} ASR button not assigned`);
      return null;
    }

    if ((comp as ASRQueryController).onQueryEvent) {
      print(`[SceneSetupUI] 🔗 ${tag} controller: typed ASRQueryController`);
      return comp as ASRQueryController;
    }

    if (comp.api && comp.api.onQueryEvent && comp.api.onQueryEvent.add) {
      print(`[SceneSetupUI] 🔗 ${tag} controller: using .api bridge`);
      return comp.api as AsrBridge;
    }

    print(`[SceneSetupUI] ❌ ${tag} controller does not expose onQueryEvent`);
    return null;
  }

  private updateField(field: string, text: string) {
    this.propDescription = text;
    this.propField.text = text;
    print(`🎙️ Prop description captured: ${text}`);
    this.checkReadyToRun();
  }

  private checkReadyToRun() {
    if (this.propDescription.trim()) {
      print("🚀 Description ready — generating prop!");
      this.runPropGeneration();
    }
  }

  private runPropGeneration() {
    print("🤖 Sending description to PropController...");

    if (!this.propController || !this.propController.spawnProp) {
      print("⚠️ PropController missing or invalid");
      return;
    }

    print("Restarting NPC Listening!");
    this.notifyConversationToListen(); 

    this.propController.spawnProp(this.propDescription);
    this.propDescription = "";
    this.propField.text = "";
  }
}
