import { Snap3D } from "RemoteServiceGateway.lspkg/HostedSnap/Snap3D";
import { Snap3DInteractable } from "./Snap3DInteractable";
import { Snap3DTypes } from "RemoteServiceGateway.lspkg/HostedSnap/Snap3DTypes";

import { StorageProperty } from "SpectaclesSyncKit.lspkg/Core/StorageProperty";
import { StoragePropertySet } from "SpectaclesSyncKit.lspkg/Core/StoragePropertySet";
import { PropertyType } from "SpectaclesSyncKit.lspkg/Core/PropertyType";
import { SyncEntity } from "SpectaclesSyncKit.lspkg/Core/SyncEntity";

import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider";

@component
export class Snap3DInteractableFactory extends BaseScriptComponent {
  @ui.separator
  @ui.group_start("Submit and Get Status Example")
  @input
  @widget(new TextAreaWidget())
  private prompt: string = "A cute dog wearing a hat";
  @input
  private refineMesh: boolean = true;
  @input
  private useVertexColor: boolean = false;
  @ui.group_end
  @input
  runOnTap: boolean = false;

  @input
  snap3DInteractablePrefab: ObjectPrefab;

  private avaliableToRequest: boolean = true;
  private wcfmp = WorldCameraFinderProvider.getInstance();

  onAwake() {
    this.createEvent("TapEvent").bind(() => {
      if (!this.runOnTap) {
        return;
      }
      this.createInteractable3DObject(this.prompt);
    });
  }

  attachSyncToNPC(npcObj: SceneObject): void {
    const transform = npcObj.getTransform();

    // Sync position, rotation, and scale
    const transformProp = StorageProperty.forTransform(
      transform,
      PropertyType.Location,
      PropertyType.Location,
      PropertyType.Local
    );

    // Optionally sync color/material
    const meshVisual = npcObj.getFirstComponent("Component.MaterialMeshVisual");
    const colorProp = meshVisual
      ? StorageProperty.forMeshVisualBaseColor(meshVisual, true)
      : null;

    const propSet = new StoragePropertySet(
      colorProp ? [transformProp, colorProp] : [transformProp]
    );

    const npcScript = npcObj.getComponent(Snap3DInteractable.getTypeName());
    const syncEntity = new SyncEntity(npcScript, propSet, true, "NPCSync", null);
    syncEntity.notifyOnReady(() => {
      print("🪄 NPC SyncEntity ready — mesh shared with all clients");
    });
  }

  createInteractable3DObject(
    input: string,
    overridePosition?: vec3
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.avaliableToRequest) {
        print("Already processing a request. Please wait.");
        return;
      }
      this.avaliableToRequest = false;
      let outputObj = this.snap3DInteractablePrefab.instantiate(
        this.sceneObject
      );
      outputObj.name = "Snap3DInteractable - " + input;
      let snap3DInteractable = outputObj.getComponent(
        Snap3DInteractable.getTypeName()
      );
      
      snap3DInteractable.setPrompt(input);
      snap3DInteractable.playDialogue("This is the speech bubble!");

      if (overridePosition) {
        outputObj.getTransform().setWorldPosition(overridePosition);
      } else {
        let newPos = this.wcfmp.getForwardPosition(80);
        outputObj.getTransform().setWorldPosition(newPos);
      }

      Snap3D.submitAndGetStatus({
        prompt: input,
        format: "glb",
        refine: this.refineMesh,
        use_vertex_color: this.useVertexColor,
      })
        .then((submitGetStatusResults) => {
          submitGetStatusResults.event.add(([value, assetOrError]) => {
            if (value === "image") {
              assetOrError = assetOrError as Snap3DTypes.TextureAssetData;
              snap3DInteractable.setImage(assetOrError.texture);
            } else if (value === "base_mesh") {
              assetOrError = assetOrError as Snap3DTypes.GltfAssetData;
              if (!this.refineMesh) {
                snap3DInteractable.setModel(assetOrError.gltfAsset, true);
                this.avaliableToRequest = true;
                resolve("Successfully created mesh with prompt: " + input);
              } else {
                snap3DInteractable.setModel(assetOrError.gltfAsset, false);
              }
            } else if (value === "refined_mesh") {
              assetOrError = assetOrError as Snap3DTypes.GltfAssetData;
              snap3DInteractable.setModel(assetOrError.gltfAsset, true);
              this.avaliableToRequest = true;
              resolve("Successfully created mesh with prompt: " + input);
            } else if (value === "failed") {
              assetOrError = assetOrError as Snap3DTypes.ErrorData;
              print("Error: " + assetOrError.errorMsg);
              //snap3DInteractable.onFailure(assetOrError.errorMsg);
              this.avaliableToRequest = true;
              reject("Failed to create mesh with prompt: " + input);
            }
          });
        })
        .catch((error) => {
          snap3DInteractable.onFailure(error);
          print("Error submitting task or getting status: " + error);
          this.avaliableToRequest = true;
          reject("Failed to create mesh with prompt: " + input);
        });
    });
  }

  private onTap() {}
}
