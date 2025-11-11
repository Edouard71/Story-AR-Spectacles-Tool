import { ASRQueryController } from "./ASRQueryController";

@component
export class SceneSetupUI extends BaseScriptComponent {
  @input("Component.ScriptComponent") propController; // your PropController
  @input("Component.Text") propField: Text;
  @input("Component.ScriptComponent") propRecordBtn: BaseScriptComponent;

  private propDescription = "";

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.init());
  }

  private init() {
    const propCtl = this.resolveAsrController(this.propRecordBtn, "prop");
    if (propCtl) propCtl.onQueryEvent.add((t: string) => this.updateField("prop", t));

    print("[SceneSetupUI] ✅ Initialized (Prop Builder)");
  }

  private resolveAsrController(
    comp: any,
    tag: string
  ): { onQueryEvent: { add: (fn: (t: string) => void) => void } } | null {
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
      return comp.api;
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

    this.propController.spawnProp(this.propDescription);
  }
}
