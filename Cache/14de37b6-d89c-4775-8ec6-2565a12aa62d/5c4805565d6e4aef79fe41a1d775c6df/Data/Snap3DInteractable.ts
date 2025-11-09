import { SyncEntity } from "SpectaclesSyncKit.lspkg/Core/SyncEntity";
import { StorageProperty } from "SpectaclesSyncKit.lspkg/Core/StorageProperty";
import { StoragePropertySet } from "SpectaclesSyncKit.lspkg/Core/StoragePropertySet";
import { PropertyType } from "SpectaclesSyncKit.lspkg/Core/PropertyType";

import { setTimeout } from "SpectaclesInteractionKit.lspkg/Utils/FunctionTimingUtils";

@component
export class Snap3DInteractable extends BaseScriptComponent {
  @input
  private modelParent: SceneObject;
  @input
  private img: Image;
  @input
  private promptDisplay: Text;
  @input
  private spinner: SceneObject;
  @input
  private mat: Material;
  @input
  private displayPlate: SceneObject;
  @input
  private colliderObj: SceneObject;
  @input 
  private audio: AudioComponent; // Newly Added Audio Component For NPC Dialogue
  @input 
  private speechBubbleDisplay: Text;      // Newly Added Speech Bubble For NPC Dialogue

  private tempModel: SceneObject = null;
  private finalModel: SceneObject = null;
  private size: number = 20;
  private sizeVec: vec3 = null;
  private syncEntity: SyncEntity;

  onAwake() {
    // Clone the image material to avoid modifying the original
    let imgMaterial = this.img.mainMaterial;
    imgMaterial.mainPass.baseTex = this.img.mainPass.baseTex;
    this.img.enabled = false;

    let offsetBelow = 0;
    this.sizeVec = vec3.one().uniformScale(this.size);
    this.displayPlate
      .getTransform()
      .setLocalPosition(new vec3(0, -this.size * 0.5 - offsetBelow, 0));
    this.colliderObj.getTransform().setLocalScale(this.sizeVec);
    this.img.getTransform().setLocalScale(this.sizeVec);

    // ensure text fields are hidden initially
    this.speechBubbleDisplay.text = "Speech Bubble Placeholder Text";
    this.setupSyncEntity();
  }

  //----------------------------------------------------------------------
  // SYNC SETUP
  //----------------------------------------------------------------------
  private setupSyncEntity() {
    try {
      const transform = this.modelParent.getTransform();

      const transformProp = StorageProperty.forTransform(
        transform,
        PropertyType.Local,
        PropertyType.Local,
        PropertyType.Local
      );

      const meshVisual = this.modelParent.getComponent("Component.MaterialMeshVisual");
      const colorProp = meshVisual
        ? StorageProperty.forMeshVisualBaseColor(meshVisual, true)
        : null;

      const propSet = new StoragePropertySet(colorProp ? [transformProp, colorProp] : [transformProp]);

      this.syncEntity = new SyncEntity(this, propSet, true, "Session", null);
      this.syncEntity.notifyOnReady(() => {
        print("🪄 NPC SyncEntity ready — transform + mesh shared with all clients");
        print("🪄 SyncEntity ready (audience) — will receive updates");

        // 🧩 DEBUGGING — verify storage properties
        const store = this.syncEntity.currentStore;
        if (store) {
          print(`🔍 Owned by: ${this.syncEntity.doIOwnStore() ? "me" : "someone else"}`);
        } else {
          print("⚠️ No store attached yet!");
        }

        // 🧩 Subscribe to transform changes

        // 🧩 Ownership changes
        this.syncEntity.onOwnerUpdated.add(() => {
          print(`👑 Ownership updated — now owned by me? ${this.syncEntity.doIOwnStore()}`);
        });

        // 🧩 Network event listener
        this.syncEntity.onEventReceived.add("*", (msg) => {
          print(`💌 Network event '${msg.message}' from ${msg.senderUserId} with data: ${JSON.stringify(msg.data)}`);
        });
    });

    } catch (e) {
      print(`⚠️ Failed to set up SyncEntity: ${e}`);
    }
  }

  setPrompt(prompt: string) {
    // Simply displays prompt in promptDisplay
    this.promptDisplay.text = prompt;
    this.promptDisplay.getTransform().setLocalPosition(new vec3(0, this.size * 0.6 + 12.0, 0))
  }

  setSpeechBubble(text: string) {
    // Simply displays speech bubble
    this.speechBubbleDisplay.enabled = true;
    this.speechBubbleDisplay.text = text;
    this.speechBubbleDisplay.getTransform().setLocalPosition(new vec3(0, -4.0, -4.0))
  }

  playDialogue(text: string, audioTrack?: AudioTrackAsset) {
    // Immediately show the bubble
    this.speechBubbleDisplay.enabled = true;
    this.speechBubbleDisplay.text = text;

    // If audio provided, play it
    if (audioTrack && this.audio) {
        this.audio.audioTrack = audioTrack;
        this.audio.play(1);

        // When audio finishes, hide the bubble
        this.audio.setOnFinish(() => {
            this.speechBubbleDisplay.enabled = false;
        });
    } else {
        // No audio? just show text for a few seconds
        setTimeout(() => {
            this.speechBubbleDisplay.enabled = false;
        }, 8000);
    }
}

  setImage(image: Texture) {
    this.img.enabled = true;
    this.img.mainPass.baseTex = image;
  }

  setModel(model: GltfAsset, isFinal: boolean) {
    this.img.enabled = false;
    if (isFinal) {
      if (!isNull(this.finalModel)) {
        this.finalModel.destroy();
      }
      this.spinner.enabled = false;
      this.finalModel = model.tryInstantiate(this.modelParent, this.mat);
      this.finalModel.getTransform().setLocalScale(this.sizeVec);
    } else {
      this.tempModel = model.tryInstantiate(this.modelParent, this.mat);
      this.tempModel.getTransform().setLocalScale(this.sizeVec);
    }
  }

  onFailure(error: string) {
    this.img.enabled = false;
    this.spinner.enabled = false;
    if (this.tempModel) {
      this.tempModel.destroy();
    }
    if (this.finalModel) {
      this.finalModel.destroy();
    }
    this.promptDisplay.text = "Error: " + error;
    setTimeout(() => {
      this.destroy();
    }, 5000); // Hide error after 5 seconds
  }
}
