import { ASRQueryController } from "./ASRQueryController";

@component
export class SceneSetupUI extends BaseScriptComponent {
  @input("Component.ScriptComponent") conversationController: BaseScriptComponent;

  // UI text fields
  @input("Component.Text") physicalField: Text;
  @input("Component.Text") personalityField: Text;
  @input("Component.Text") sceneField: Text;

  // ASR buttons (each one has ASRQueryController)
  @input("Component.ScriptComponent") physicalAsrBtn: BaseScriptComponent;
  @input("Component.ScriptComponent") personalityAsrBtn: BaseScriptComponent;
  @input("Component.ScriptComponent") sceneAsrBtn: BaseScriptComponent;

  // Run Scene button
  @input("Component.ScriptComponent") runScenePinchBtn: BaseScriptComponent;


  private physicalDescription = "";
  private personalityDescription = "";
  private sceneDescription = "";

  // ✔ initialize reliably after all components are awake
  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.init());
  }

  private init() {
    // Resolve each controller to an object that has `onQueryEvent.add(...)`
    const physicalCtl = this.resolveAsrController(this.physicalAsrBtn, "physical");
    const personalityCtl = this.resolveAsrController(this.personalityAsrBtn, "personality");
    const sceneCtl = this.resolveAsrController(this.sceneAsrBtn, "scene");

    if (physicalCtl) physicalCtl.onQueryEvent.add((t: string) => this.updateField("physical", t));
    if (personalityCtl) personalityCtl.onQueryEvent.add((t: string) => this.updateField("personality", t));
    if (sceneCtl) sceneCtl.onQueryEvent.add((t: string) => this.updateField("scene", t));

    // If using a button SceneObject for “Run Scene”:
    // if (this.runSceneBtn) {
    //   this.runSceneBtn.createEvent("TapEvent").bind(() => this.runScene());
    // }

    print("[SceneSetupUI] ✅ Initialized");
  }

  /**
   * Tries to get an ASRQueryController instance from a ScriptComponent input.
   * Works if the input is:
   *  - already typed as ASRQueryController, or
   *  - a generic ScriptComponent that exposes .api.onQueryEvent
   */
  private resolveAsrController(
    comp: any,
    tag: string
  ): { onQueryEvent: { add: (fn: (t: string) => void) => void } } | null {
    if (!comp) {
      print(`[SceneSetupUI] ⚠️ ${tag} ASR button not assigned`);
      return null;
    }

    // Case A: it’s already our script class (best case)
    if ((comp as ASRQueryController).onQueryEvent) {
      print(`[SceneSetupUI] 🔗 ${tag} controller: typed ASRQueryController`);
      return comp as ASRQueryController;
    }

    // Case B: it’s a generic ScriptComponent but the script exposed an API
    if (comp.api && comp.api.onQueryEvent && comp.api.onQueryEvent.add) {
      print(`[SceneSetupUI] 🔗 ${tag} controller: using .api bridge`);
      return comp.api;
    }

    print(`[SceneSetupUI] ❌ ${tag} controller does not expose onQueryEvent`);
    return null;
  }

  private updateField(field: string, text: string) {
    switch (field) {
      case "physical":
        this.physicalDescription = text;
        if (this.physicalField) this.physicalField.text = text;
        break;
      case "personality":
        this.personalityDescription = text;
        if (this.personalityField) this.personalityField.text = text;
        break;
      case "scene":
        this.sceneDescription = text;
        if (this.sceneField) this.sceneField.text = text;
        break;
    }
    print(`[SceneSetupUI] 🎙️ ${field} captured: ${text}`);
  }

  private runScene() {
    if (!this.physicalDescription || !this.personalityDescription || !this.sceneDescription) {
      print("[SceneSetupUI] ⚠️ Fill all fields before running the scene!");
      return;
    }

    print("[SceneSetupUI] 🚀 Running scene setup!");
    // If your conversationController exposes an API:
    // this.conversationController?.api?.setupScene?.(
    //   this.sceneDescription,
    //   this.physicalDescription,
    //   this.personalityDescription
    // );
  }
}
