import { SyncEntity } from "SpectaclesSyncKit.lspkg/Core/SyncEntity";
import { NetworkIdTools } from "SpectaclesSyncKit.lspkg/Core/NetworkIdTools";
import { NetworkIdType } from "SpectaclesSyncKit.lspkg/Core/NetworkIdType";

import { setTimeout } from "SpectaclesInteractionKit.lspkg/Utils/FunctionTimingUtils";

import { OpenAI } from "RemoteServiceGateway.lspkg/HostedExternal/OpenAI";
import { OpenAITypes } from "RemoteServiceGateway.lspkg/HostedExternal/OpenAITypes";


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
  @input 
  private remoteMediaModule: RemoteMediaModule;
  @input
  private internet : InternetModule;

  private tempModel: SceneObject = null;
  private finalModel: SceneObject = null;
  private size: number = 20;
  private sizeVec: vec3 = null;
  private syncEntity: SyncEntity;

  private lastPos: vec3;
  private lastRot: quat;
  private lastScale: vec3;

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
    // const transform = this.modelParent.getTransform();
    // const transformProp = StorageProperty.forTransform(
    //   transform,
    //   PropertyType.Local,
    //   PropertyType.Local,
    //   PropertyType.Local
    // );
    // const propSet = new StoragePropertySet([transformProp]);

    const networkIdOptions = new NetworkIdTools.NetworkIdOptions();
    networkIdOptions.networkIdType = NetworkIdType.Custom;
    networkIdOptions.customNetworkId = "interactablesync"; // ✅ this string must be the same on all devices

    this.syncEntity = new SyncEntity(this, null, true, "Session", networkIdOptions);

    this.syncEntity.notifyOnReady(() => {
      print("🪄 SyncEntity ready for transform network events");

      // 🎧 Always listen for transform updates
      this.syncEntity.onEventReceived.add("npcTransformUpdate", (msgInfo) => {
        const data = msgInfo.data as { pos: vec3; rot: quat, scale?: vec3};
        if (!data) return;

        const t = this.modelParent.getTransform();
        const currentPos = t.getWorldPosition();
        const currentRot = t.getWorldRotation();
        const currentScale = t.getWorldScale();
        

        // Smooth interpolation
        const newPos = vec3.lerp(currentPos, data.pos, 0.25);
        const newRot = quat.slerp(currentRot, data.rot, 0.25);
        const newScale = data.scale
    ? vec3.lerp(currentScale, data.scale, 0.25)
    : currentScale;

        t.setWorldPosition(newPos);
        t.setWorldRotation(newRot);
        t.setWorldScale(newScale);
      });

      // 🎧 Listen for speech updates from host
      this.syncEntity.onEventReceived.add("npcSpeak", (msgInfo) => {
        const line = msgInfo.data as string;
        if (!line) return;

        print(`🗣️ Received npcSpeak: ${line}`);
        this.playDialogue(line);
      });

    });
  }

  public startTransformSync() {
    const t = this.modelParent.getTransform();
    this.lastPos = t.getWorldPosition();
    this.lastRot = t.getWorldRotation();

    const updateInterval = 0.1; // seconds (~10Hz)
    let elapsed = 0;

    print("🛰️ Starting continuous transform sync broadcast...");

    // Use Lens Studio's UpdateEvent for smooth timing
    const updateEvent = this.createEvent("UpdateEvent");
    updateEvent.bind((eventData) => {
      elapsed += eventData.getDeltaTime();
      if (elapsed < updateInterval) return;
      elapsed = 0;

      const pos = t.getWorldPosition();
      const rot = t.getWorldRotation();
      const scale = t.getWorldScale();
      
      // Only send when transform changes
      if (!pos.equal(this.lastPos) || !rot.equal(this.lastRot)) {
        this.lastPos = pos;
        this.lastRot = rot;
        this.lastScale = scale;

        this.syncEntity.sendEvent("npcTransformUpdate", { pos, rot, scale }, true);
      }
    });
  }

  public broadcastSpeech(line: string) {
    if (!this.syncEntity || !this.syncEntity.isSetupFinished) {
      print("⚠️ SyncEntity not ready to broadcast speech");
      return;
    }

    print(`📡 Broadcasting npcSpeak event: ${line}`);
    this.syncEntity.sendEvent("npcSpeak", line, true);
  }

  loadFromURL(url: string) {
    this.remoteMediaModule.loadResourceAsGltfAsset(
      this.internet.makeResourceFromUrl(url),
      (gltfAsset) => {
        const settings = GltfSettings.create();
        settings.convertMetersToCentimeters = true;
        this.finalModel = gltfAsset.tryInstantiateWithSetting(this.modelParent, this.mat, settings);
        this.finalModel.getTransform().setLocalScale(this.sizeVec);
        this.spinner.enabled = false;
        print("✅ Loaded shared model from URL");
      },
      (err) => print("❌ Failed to load mesh: " + err)
    );
  }

  setPrompt(prompt: string) {
    // Simply displays prompt in promptDisplay
    this.promptDisplay.text = prompt;
    this.promptDisplay.getTransform().setLocalPosition(new vec3(0, this.size * 0.6 + 36.0, 0))
  }

  setSpeechBubble(text: string) {
    // Simply displays speech bubble
    this.speechBubbleDisplay.enabled = true;
    this.speechBubbleDisplay.text = text;
    this.speechBubbleDisplay.getTransform().setLocalPosition(new vec3(0, -4.0, -4.0))
  }

  playDialogue(text: string) {
    // Immediately show the bubble
    this.speechBubbleDisplay.enabled = true;
    this.speechBubbleDisplay.text = text;

    const speechRequest: OpenAITypes.Speech.Request = {
    model: "gpt-4o-mini-tts", // lightweight, responsive
    input: text,
    voice: "alloy",           // other valid voices: echo, fable, nova, shimmer, etc.
    response_format: "wav",   // Lens Studio audio pipeline friendly
    speed: 1.0,               // optional, 1.0 = normal speed
    };

    OpenAI.speech(speechRequest)
    .then((audioTrack: AudioTrackAsset) => {
      print("🔊 OpenAI Speech: Audio track ready");

      if (this.audio) {
        this.audio.audioTrack = audioTrack;
        this.audio.play(1);

        this.audio.setOnFinish(() => {
          print("💬 Dialogue playback finished");
          this.speechBubbleDisplay.enabled = false;
        });
      } else {
        print("⚠️ No AudioComponent found — cannot play sound");
        this.speechBubbleDisplay.enabled = false;
      }
    })
    .catch((err) => {
      print(`❌ OpenAI Speech failed: ${err}`);

      // fallback — just show the bubble for 8s
      setTimeout(() => {
        this.speechBubbleDisplay.enabled = false;
      }, 8000);
    });

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
