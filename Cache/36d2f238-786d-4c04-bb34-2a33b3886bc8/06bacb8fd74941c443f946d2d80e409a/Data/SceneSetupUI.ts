import { ASRQueryController } from "./ASRQueryController";

@component
export class SceneSetupUI extends BaseScriptComponent {
  @input("Component.ScriptComponent") conversationController: BaseScriptComponent;

  // UI text fields
  @input("Component.Text") physicalField: Text;
  @input("Component.Text") personalityField: Text;
  @input("Component.Text") sceneField: Text;

  // ASR buttons (each one has ASRQueryController)
  @input("Component.ScriptComponent") physicalAsrBtn: ASRQueryController;
  @input("Component.ScriptComponent") personalityAsrBtn: ASRQueryController;
  @input("Component.ScriptComponent") sceneAsrBtn: ASRQueryController;

  // Run Scene button
  @input("SceneObject") runSceneBtn: SceneObject;

  private physicalDescription = "";
  private personalityDescription = "";
  private sceneDescription = "";

  onAwake() {
    // Use OnStartEvent to ensure other scripts are awake
    this.createEvent("OnStartEvent").bind(() => this.initConnections());
  }

  private initConnections() {
    // Verify everything is assigned
    if (!this.physicalAsrBtn || !this.personalityAsrBtn || !this.sceneAsrBtn) {
      print("⚠️ Some ASR buttons not yet ready, retrying...");
      const retry = this.createEvent("DelayedCallbackEvent");
      retry.bind(() => this.initConnections());
      retry.reset(0.5);
      return;
    }

    // --- Subscribe to ASR button events ---
    this.physicalAsrBtn.onQueryEvent.add((t: string) =>
      this.handleQuery("physical", t)
    );
    this.personalityAsrBtn.onQueryEvent.add((t: string) =>
      this.handleQuery("personality", t)
    );
    this.sceneAsrBtn.onQueryEvent.add((t: string) =>
      this.handleQuery("scene", t)
    );

    // --- Hook up Run Scene button ---
    const btn = this.runSceneBtn.getComponent("Component.ScriptComponent");
    if (btn) {
      btn.createEvent("TapEvent").bind(() => this.runScene());
    } else {
      // If the button has no ScriptComponent, just attach a temporary TapEvent
      // this.runSceneBtn.createEvent("TapEvent").bind(() => this.runScene());
    }

    print("✅ SceneSetupUI fully connected");
  }

  private handleQuery(field: string, text: string) {
    print(`✅ ASR finished for ${field}: ${text}`);
    switch (field) {
      case "physical":
        this.physicalDescription = text;
        this.physicalField.text = text;
        break;
      case "personality":
        this.personalityDescription = text;
        this.personalityField.text = text;
        break;
      case "scene":
        this.sceneDescription = text;
        this.sceneField.text = text;
        break;
    }
  }

  private runScene() {
    if (
      !this.physicalDescription ||
      !this.personalityDescription ||
      !this.sceneDescription
    ) {
      print("⚠️ Fill all fields before running the scene!");
      return;
    }

    print("🚀 Running scene setup!");
    if (this.conversationController?.api?.setupScene) {
      this.conversationController.api.setupScene(
        this.sceneDescription,
        this.physicalDescription,
        this.personalityDescription
      );
    } else {
      print("⚠️ setupScene() not found on conversationController.api");
    }
  }
}
