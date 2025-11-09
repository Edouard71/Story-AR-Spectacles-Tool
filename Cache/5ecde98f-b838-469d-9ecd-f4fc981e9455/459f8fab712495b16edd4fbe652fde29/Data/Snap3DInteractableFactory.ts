import { Snap3D } from "RemoteServiceGateway.lspkg/HostedSnap/Snap3D";
import { Snap3DInteractable } from "./Snap3DInteractable";
import { Snap3DTypes } from "RemoteServiceGateway.lspkg/HostedSnap/Snap3DTypes";

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

createInteractable3DObject(
  input: string,
  overridePosition?: vec3
): Promise<{ message: string; assetId?: string; asset?: GltfAsset }> {
  return new Promise((resolve, reject) => {
    if (!this.avaliableToRequest) {
      print("Already processing a request. Please wait.");
      return;
    }
    this.avaliableToRequest = false;

    let outputObj = this.snap3DInteractablePrefab.instantiate(this.sceneObject);
    outputObj.name = "Snap3DInteractable - " + input;

    let snap3DInteractable = outputObj.getComponent(
      Snap3DInteractable.getTypeName()
    );

    snap3DInteractable.setPrompt(input);
    snap3DInteractable.playDialogue("This is the speech bubble!");

    // Position
    const newPos = overridePosition
      ? overridePosition
      : this.wcfmp.getForwardPosition(80);
    outputObj.getTransform().setWorldPosition(newPos);

    // Begin Snap3D generation
    Snap3D.submitAndGetStatus({
      prompt: input,
      format: "glb",
      refine: this.refineMesh,
      use_vertex_color: this.useVertexColor,
    })
      .then((submitGetStatusResults) => {
        submitGetStatusResults.event.add(([value, assetOrError]) => {
          if (value === "image") {
            const imageData = assetOrError as Snap3DTypes.TextureAssetData;
            snap3DInteractable.setImage(imageData.texture);
          } 
          
          else if (value === "base_mesh") {
            const gltfData = assetOrError as Snap3DTypes.GltfAssetData;
            if (!this.refineMesh) {
              snap3DInteractable.setModel(gltfData.gltfAsset, true);
              this.avaliableToRequest = true;
              // ✅ Capture asset ID
              const assetId = gltfData.assetId || gltfData.assetUrl || "";
              resolve({
                message: "Successfully created base mesh with prompt: " + input,
                assetId: assetId,
                asset: gltfData.gltfAsset,
              });
            } else {
              snap3DInteractable.setModel(gltfData.gltfAsset, false);
            }
          } 
          
          else if (value === "refined_mesh") {
            const gltfData = assetOrError as Snap3DTypes.GltfAssetData;
            snap3DInteractable.setModel(gltfData.gltfAsset, true);
            this.avaliableToRequest = true;

            // ✅ Capture final asset ID (this is what you’ll share)
            const assetId = gltfData.assetId || gltfData.assetUrl || "";
            print("📦 Snap3D asset ID: " + assetId);

            resolve({
              message: "Successfully created refined mesh with prompt: " + input,
              assetId: assetId,
              asset: gltfData.gltfAsset,
            });
          } 
          
          else if (value === "failed") {
            const err = assetOrError as Snap3DTypes.ErrorData;
            print("Error: " + err.errorMsg);
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
