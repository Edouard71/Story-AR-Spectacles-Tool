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

  private physicalDescription: string = "";
  private personalityDescription: string = "";
  private sceneDescription: string = "";

  onAwake() {
    // subscribe to each ASR button’s output
    if (this.physicalAsrBtn)
      this.physicalAsrBtn.onQueryEvent.add((text: string) =>
      this.handleQuery("physical", text)
    );

    if (this.personalityAsrBtn)
        this.personalityAsrBtn.onQueryEvent.add((text: string) =>
        this.handleQuery("personality", text)
    );

    if (this.sceneAsrBtn)
        this.sceneAsrBtn.onQueryEvent.add((text: string) =>
        this.handleQuery("scene", text)
    );

    // hook up run-scene
    this.runSceneBtn
      .createComponent("Component.ScriptComponent")
      .createEvent("TapEvent")
      .bind(() => this.runScene());
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
    this.conversationController.api.setupScene(
      this.sceneDescription,
      this.physicalDescription,
      this.personalityDescription
    );
  }
}
