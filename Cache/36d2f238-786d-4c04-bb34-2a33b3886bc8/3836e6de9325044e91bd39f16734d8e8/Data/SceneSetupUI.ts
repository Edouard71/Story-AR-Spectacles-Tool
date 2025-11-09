import { ASRQueryController } from "./ASRQueryController";

@component
export class SceneSetupUI extends BaseScriptComponent {
  @input("Component.ScriptComponent") conversationController: BaseScriptComponent;

  @input("Component.Text") physicalField: Text;
  @input("Component.Text") personalityField: Text;
  @input("Component.Text") sceneField: Text;

  @input("Component.ScriptComponent") physicalAsrBtn: ASRQueryController;
  @input("Component.ScriptComponent") personalityAsrBtn: ASRQueryController;
  @input("Component.ScriptComponent") sceneAsrBtn: ASRQueryController;

  @input("SceneObject") runSceneBtn: SceneObject;

  private physicalDescription = "";
  private personalityDescription = "";
  private sceneDescription = "";

  onStart() {
    // Hook up ASR button events (Lens Studio guarantees onStart after all Awake)
    this.physicalAsrBtn?.onQueryEvent.add((t) => this.updateField("physical", t));
    this.personalityAsrBtn?.onQueryEvent.add((t) => this.updateField("personality", t));
    this.sceneAsrBtn?.onQueryEvent.add((t) => this.updateField("scene", t));

    // Run Scene button
    this.runSceneBtn.createEvent("TapEvent").bind(() => this.runScene());
    print("✅ SceneSetupUI initialized");
  }

  private updateField(field: string, text: string) {
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
    print(`🎙️ ${field} captured: ${text}`);
  }

  private runScene() {
    if (!this.physicalDescription || !this.personalityDescription || !this.sceneDescription) {
      print("⚠️ Fill all fields before running the scene!");
      return;
    }

    print("🚀 Running scene setup!");
    this.conversationController?.api?.setupScene?.(
      this.sceneDescription,
      this.physicalDescription,
      this.personalityDescription
    );
  }
}
