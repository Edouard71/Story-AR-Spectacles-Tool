import { Snap3D } from "RemoteServiceGateway.lspkg/HostedSnap/Snap3D";
import { Snap3DInteractable } from "./Snap3DInteractable";
import { Snap3DTypes } from "RemoteServiceGateway.lspkg/HostedSnap/Snap3DTypes";

import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider";
import { SessionController } from "SpectaclesSyncKit.lspkg/Core/SessionController";
import { SyncEntity } from "SpectaclesSyncKit.lspkg/Core/SyncEntity";
import { StorageProperty } from "SpectaclesSyncKit.lspkg/Core/StorageProperty";
import { StoragePropertySet } from "SpectaclesSyncKit.lspkg/Core/StoragePropertySet";
import { NetworkIdTools } from "SpectaclesSyncKit.lspkg/Core/NetworkIdTools";
import { NetworkIdType } from "SpectaclesSyncKit.lspkg/Core/NetworkIdType";

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
  private session: any;
  private factorySyncEntity: SyncEntity;
  private propAssetURLProp = StorageProperty.manualString("propAssetURL", "");
  private propPromptProp = StorageProperty.manualString("propPrompt", "");
  private propPositionProp = StorageProperty.manualVec3("propPosition", vec3.zero());
  private isSyncReady: boolean = false;
  private isHost: boolean = false;
  private role: string = "";

  onAwake() {
    this.createEvent("TapEvent").bind(() => {
      if (!this.runOnTap) {
        return;
      }
      this.createInteractable3DObject(this.prompt);
    });

    // Wait for SyncKit to be ready before starting
    SessionController.getInstance().notifyOnReady(() => {
      print("🛰️ SessionController ready — starting factory sync");
      this.setupFactorySync();
    });
  }

  private setupFactorySync() {
    this.session = SessionController.getInstance();

    const networkIdOptions = new NetworkIdTools.NetworkIdOptions();
    networkIdOptions.networkIdType = NetworkIdType.Custom;
    networkIdOptions.customNetworkId = "Snap3DFactory";

    this.factorySyncEntity = new SyncEntity(
      this,
      new StoragePropertySet([
        this.propAssetURLProp,
        this.propPromptProp,
        this.propPositionProp,
      ]),
      true,
      "Session",
      networkIdOptions
    );

    this.factorySyncEntity.notifyOnReady(() => {
      print("🔗 Factory SyncEntity ready");
      this.isSyncReady = true;
      this.detectRole();
      this.setupSyncListeners();
    });
  }

  private detectRole() {
    const isSingle = this.session.isSingleplayer();

    if (isSingle) {
      this.role = "Singleplayer";
      this.isHost = false;
    } else {
      const users = this.session.getUsers();
      if (users.length === 1) {
        this.role = "Host";
        this.isHost = true;
      } else {
        this.role = "Audience";
        this.isHost = false;
      }
    }

    print(`[Snap3DInteractableFactory] Joined as ${this.role}`);
  }

  private setupSyncListeners() {
    // Only audience members need to react to host broadcasts
    if (this.isHost || this.role === "Singleplayer") return;

    // Immediate catch-up if the host spawned before this client joined
    const existingURL = this.propAssetURLProp.currentOrPendingValue;
    if (existingURL && existingURL.length > 0) {
      print("📡 Host prop already exists — loading immediately");
      const prompt = this.propPromptProp.currentOrPendingValue;
      const pos = this.propPositionProp.currentOrPendingValue;
      this.spawnRemoteProp(existingURL, prompt, pos);
      return;
    }

    // Otherwise, subscribe to updates
    this.propAssetURLProp.onAnyChange.add((newURL: string, oldURL: string) => {
      if (newURL && newURL.length > 0 && newURL !== oldURL) {
        const prompt = this.propPromptProp.currentOrPendingValue;
        const pos = this.propPositionProp.currentOrPendingValue;
        print(`🌐 Received prop from host — loading model: ${newURL}`);
        this.spawnRemoteProp(newURL, prompt, pos);
      }
    });

    print("👂 Audience is now listening for prop sync updates...");
  }

  private spawnRemoteProp(assetURL: string, prompt: string, position: vec3) {
    if (!this.snap3DInteractablePrefab) {
      print("❌ Prefab missing, cannot spawn remote prop");
      return;
    }

    print(`🌍 Loading remote prop model from ${assetURL}`);

    const propObj = this.snap3DInteractablePrefab.instantiate(this.sceneObject);
    if (!propObj) {
      print("❌ Failed to instantiate prop prefab");
      return;
    }

    propObj.name = "Snap3DInteractable - " + prompt;
    propObj.getTransform().setWorldPosition(position);

    const propComp = propObj.getComponent(Snap3DInteractable.getTypeName());
    if (!propComp) {
      print("❌ Spawned prefab missing Snap3DInteractable component");
      return;
    }

    // Configure prop
    propComp.setPrompt(prompt);
    propComp.loadFromURL(assetURL);
    propComp.setSpeechBubble("✨ Synced prop loaded!");

    print(`✅ Remote prop spawned: ${prompt}`);
  }

  createInteractable3DObject(
    input: string,
    overridePosition?: vec3
  ): Promise<{ msg: string; assetURL: string }> {
    return new Promise((resolve, reject) => {
      if (!this.avaliableToRequest) {
        print("Already processing a request. Please wait.");
        return;
      }
      this.avaliableToRequest = false;

      // 🎲 1/3 chance to twist the prompt for unexpected results
      const originalPrompt = input;
      let finalPrompt = input;
      const twistChance = Math.random();
      
      if (twistChance < 0.33) {
        finalPrompt = this.twistPrompt(input);
        print(`🎭 Twisted prompt: "${originalPrompt}" → "${finalPrompt}"`);
      }

      let outputObj = this.snap3DInteractablePrefab.instantiate(
        this.sceneObject
      );
      outputObj.name = "Snap3DInteractable - " + finalPrompt;
      let snap3DInteractable = outputObj.getComponent(
        Snap3DInteractable.getTypeName()
      );
      
      snap3DInteractable.setPrompt(finalPrompt);

      if (overridePosition) {
        outputObj.getTransform().setWorldPosition(overridePosition);
      } else {
        let newPos = this.wcfmp.getForwardPosition(80);
        outputObj.getTransform().setWorldPosition(newPos);
      }

      Snap3D.submitAndGetStatus({
        prompt: finalPrompt,
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
                const assetURL = assetOrError.url;
                
                // Broadcast prop creation to other devices (only if host)
                if (this.isSyncReady && (this.isHost || this.role === "Singleplayer")) {
                  const position = outputObj.getTransform().getWorldPosition();
                  this.propAssetURLProp.setPendingValue(assetURL);
                  this.propPromptProp.setPendingValue(finalPrompt);
                  this.propPositionProp.setPendingValue(position);
                  print(`🌍 Broadcasted prop asset + prompt: ${assetURL}`);
                }
                
                this.avaliableToRequest = true;
                resolve({
                  msg: "Successfully created mesh with prompt: " + finalPrompt,
                  assetURL: assetURL
                });
              } else {
                snap3DInteractable.setModel(assetOrError.gltfAsset, false);
              }
            } else if (value === "refined_mesh") {
              assetOrError = assetOrError as Snap3DTypes.GltfAssetData;
              snap3DInteractable.setModel(assetOrError.gltfAsset, true);
              const assetURL = assetOrError.url;
              print("📦 Snap3D asset assetURL: " + assetURL);

              // Broadcast prop creation to other devices (only if host)
              if (this.isSyncReady && (this.isHost || this.role === "Singleplayer")) {
                const position = outputObj.getTransform().getWorldPosition();
                this.propAssetURLProp.setPendingValue(assetURL);
                this.propPromptProp.setPendingValue(finalPrompt);
                this.propPositionProp.setPendingValue(position);
                print(`🌍 Broadcasted prop asset + prompt: ${assetURL}`);
              }

              this.avaliableToRequest = true;
              resolve({
                  msg: "Successfully created mesh with prompt: " + finalPrompt,
                  assetURL: assetOrError.url,
              });
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

  private twistPrompt(originalPrompt: string): string {
    const lowerPrompt = originalPrompt.toLowerCase();
    
    // Define twist patterns - opposites and unexpected variations
    const twists = [
      // Cute → Monstrous
      { pattern: /cute|adorable|sweet|lovely|charming/i, replacement: "monstrous terrifying" },
      { pattern: /small|tiny|little|mini/i, replacement: "gigantic massive" },
      { pattern: /fluffy|soft|gentle/i, replacement: "spiky menacing" },
      
      // Friendly → Scary
      { pattern: /friendly|happy|cheerful|smiling/i, replacement: "sinister menacing" },
      { pattern: /pet|companion|friend/i, replacement: "nightmare creature" },
      
      // Beautiful → Grotesque
      { pattern: /beautiful|pretty|elegant|graceful/i, replacement: "grotesque deformed" },
      { pattern: /colorful|bright|vibrant/i, replacement: "decayed rotting" },
      
      // Normal → Absurd
      { pattern: /normal|regular|ordinary|standard/i, replacement: "absurdly exaggerated" },
      { pattern: /realistic|real|natural/i, replacement: "cartoonishly exaggerated" },
      
      // Add funny/absurd modifiers
      { pattern: /wearing|with|has/i, replacement: "wearing a ridiculous oversized" },
      
      // Generic funny twists
      { pattern: /^(.+)$/, replacement: "$1 but with googly eyes and wearing a tiny hat" },
    ];

    // Try to find a matching pattern and apply twist
    for (const twist of twists) {
      if (twist.pattern.test(originalPrompt)) {
        let twisted = originalPrompt.replace(twist.pattern, twist.replacement);
        
        // Add some random funny modifiers
        const funnyModifiers = [
          "with comically oversized features",
          "in a ridiculous pose",
          "with an absurd expression",
          "looking confused and silly",
          "with exaggerated proportions",
          "in a goofy cartoon style",
        ];
        
        const randomModifier = funnyModifiers[Math.floor(Math.random() * funnyModifiers.length)];
        return `${twisted}, ${randomModifier}`;
      }
    }

    // If no pattern matches, add a random funny twist
    const genericTwists = [
      "but make it absolutely ridiculous",
      "but with an absurd twist",
      "but make it hilariously exaggerated",
      "but in a comically distorted style",
      "but make it unexpectedly silly",
      "but with goofy cartoon proportions",
    ];
    
    const randomTwist = genericTwists[Math.floor(Math.random() * genericTwists.length)];
    return `${originalPrompt}, ${randomTwist}`;
  }

  private onTap() {}
}
