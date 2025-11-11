import { Snap3DInteractableFactory } from "./Snap3DInteractableFactory";
import { Snap3DInteractable } from "./Snap3DInteractable";

@component
export class PropController extends BaseScriptComponent {
  @input snap3DFactoryObj: SceneObject;
  @input("Asset.ObjectPrefab") propPrefab: ObjectPrefab;

  private factory: Snap3DInteractableFactory;
  private activeProps: Snap3DInteractable[] = []; // track multiple props
  private maxProps = 10; // optional soft limit to avoid overloading the scene

  //----------------------------------------------------------------------
  // LIFECYCLE
  //----------------------------------------------------------------------
  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.init());
  }

  private init() {
    this.factory = this.snap3DFactoryObj?.getComponent(Snap3DInteractableFactory.getTypeName());
    if (!this.factory) {
      print("❌ PropController: Snap3DInteractableFactory missing!");
    } else {
      print("🧱 PropController ready — multiple prop generation enabled");
    }
  }

  //----------------------------------------------------------------------
  // MULTI-PROP SPAWNING
  //----------------------------------------------------------------------
  public spawnProp(propDescription: string) {
    if (!propDescription || !propDescription.trim()) {
      print("⚠️ Empty prop description — skipping");
      return;
    }

    if (!this.factory) {
      print("❌ Factory missing, cannot spawn prop");
      return;
    }

    // Soft cleanup if too many props exist
    if (this.activeProps.length >= this.maxProps) {
      const oldest = this.activeProps.shift();
      if (oldest && oldest.sceneObject) {
        print("🧹 Removing oldest prop to make room for new one");
        oldest.sceneObject.destroy();
      }
    }

    print(`🎨 Generating new prop: "${propDescription}"`);

    // Create a unique parent to organize props in the scene
    const propParent = global.scene.createSceneObject(`Prop_${Date.now()}`);
    propParent.setParent(this.snap3DFactoryObj);

    // Ask factory to generate the mesh
    this.factory
      .createInteractable3DObject(propDescription)
      .then(({ msg, assetURL }) => {
        print(`✅ Prop generated successfully: ${msg}`);

        // Retrieve created prop object under the factory parent
        const propObj = this.snap3DFactoryObj.getChild(0);
        if (!propObj) {
          print("❌ No prop object found under factory parent");
          return;
        }

        // Move the generated prop into its own parent node
        propObj.setParent(propParent);

        // Get Snap3DInteractable
        const propComp = propObj.getComponent(Snap3DInteractable.getTypeName());

        // Configure prop
        propComp.setPrompt(propDescription);
        propComp.setSpeechBubble("✨ Created!");
        this.activeProps.push(propComp);

        // Optional: random offset so props don’t overlap
        const offset = new vec3(Math.random() * 20 - 10, 0, Math.random() * 20 - 10);
        propObj.getTransform().setLocalPosition(offset);

        print(`🌍 Prop asset loaded from ${assetURL}`);
        print(`📦 Active props in scene: ${this.activeProps.length}`);
      })
      .catch((err: string) => {
        print(`💥 Prop generation failed: ${err}`);
      });
  }

  //----------------------------------------------------------------------
  // UTILITY FUNCTIONS
  //----------------------------------------------------------------------
  public clearAllProps() {
    print("🧹 Clearing all generated props...");
    for (let prop of this.activeProps) {
      if (prop && prop.sceneObject) {
        prop.sceneObject.destroy();
      }
    }
    this.activeProps = [];
  }

  public listProps() {
    print(`📋 Current props (${this.activeProps.length}):`);
    this.activeProps.forEach((p, i) => {
      print(`  ${i + 1}. ${p.sceneObject.name}`);
    });
  }
}
