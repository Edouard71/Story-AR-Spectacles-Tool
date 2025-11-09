import { Snap3DInteractableFactory } from "./Snap3DInteractableFactory";
import { Snap3DInteractable } from "./Snap3DInteractable";
import { NetworkIdTools } from "SpectaclesSyncKit.lspkg/Core/NetworkIdTools";
import { NetworkIdType } from "SpectaclesSyncKit.lspkg/Core/NetworkIdType";

import { SessionController } from "SpectaclesSyncKit.lspkg/Core/SessionController";
import { SyncEntity } from "SpectaclesSyncKit.lspkg/Core/SyncEntity";
import { StorageProperty } from "SpectaclesSyncKit.lspkg/Core/StorageProperty";
import { StoragePropertySet } from "SpectaclesSyncKit.lspkg/Core/StoragePropertySet";
import { Instantiator , InstantiationOptions} from "SpectaclesSyncKit.lspkg/Components/Instantiator"
const { OpenAI } = require("RemoteServiceGateway.lspkg/HostedExternal/OpenAI");

@component
export class Snap3DConversationController extends BaseScriptComponent {
  @input snap3DFactoryObj: SceneObject;
  @input npcGenerationUI: SceneObject;
  @input instantiator: Instantiator;
  @input npcPrefab: ObjectPrefab;

  private factory: Snap3DInteractableFactory;
  private activeNPC: Snap3DInteractable | null = null;
  private conversationHistory: { role: string; content: string }[] = [];
  private isProcessing = false;
  private asrOptions: any;

  private session: any;
  private syncEntity: SyncEntity;
  private npcAssetURLProp = StorageProperty.manualString("npcAssetURL", "");
  private npcPromptProp = StorageProperty.manualString("npcPrompt", "");
  private npcPositionProp = StorageProperty.manualVec3("npcPosition", vec3.zero());
  private npcRotationProp = StorageProperty.manualQuat("npcRotation", quat.quatIdentity());


  private isSyncReady: boolean = false;
  private isHost: boolean; 
  private role: string;
  //----------------------------------------------------------------------
  // LIFECYCLE
  //----------------------------------------------------------------------
  onAwake() {
    print("👀 Awake running — basic setup here");

    this.factory = this.snap3DFactoryObj?.getComponent(Snap3DInteractableFactory.getTypeName());
    if (!this.factory) {
      print("❌ Factory not assigned!");
    }

    // Wait for SyncKit to be ready before starting
    SessionController.getInstance().notifyOnReady(() => {
      print("🛰️ SessionController ready — starting conversation controller");
      this.startController();
    });
  }

  private startController() {
    print("🚀 startController() running — safe to access session + sync");

    this.session = SessionController.getInstance();

    const networkIdOptions = new NetworkIdTools.NetworkIdOptions();
    networkIdOptions.networkIdType = NetworkIdType.Custom;
    networkIdOptions.customPrefix = "NPC_"; // optional, just for debugging clarity
    networkIdOptions.customNetworkId = "SharedNPC"; // ✅ this string must be the same on all devices

    
    // Set up sync entity
      this.syncEntity = new SyncEntity(
    this,
    new StoragePropertySet([
      this.npcAssetURLProp,
      this.npcPromptProp,
      this.npcPositionProp,
      this.npcRotationProp,
    ]),
    true,
    "Session",
    networkIdOptions
  );

    this.syncEntity.notifyOnReady(() => {
      print("🔗 SyncEntity ready (SharedNPCController)");
      this.isSyncReady = true;
      this.detectRole();
      this.setupSyncListeners();
    });

    
  }

  private setupSyncListeners() {
  // Only audience members need to react to host broadcasts
  if (this.isHost || this.role === "Singleplayer") return;

  // 1️⃣ Immediate catch-up if the host spawned before this client joined
  const existingURL = this.npcAssetURLProp.currentOrPendingValue;
  if (existingURL && existingURL.length > 0) {
    print("📡 Host NPC already exists — loading immediately");
    this.spawnRemoteNPC(existingURL, this.npcPromptProp.currentOrPendingValue);
    return;
  }

  // 2️⃣ Otherwise, subscribe to updates
  this.npcAssetURLProp.onAnyChange.add((newURL: string, oldURL: string) => {
    if (newURL && newURL.length > 0 && newURL !== oldURL) {
      const prompt = this.npcPromptProp.currentOrPendingValue;
      const pos = this.npcPositionProp.currentOrPendingValue;
      const rot = this.npcRotationProp.currentOrPendingValue;

      print(`🌐 Received NPC from host — loading model: ${newURL}`);
      const npcObj = this.spawnRemoteNPC(newURL, prompt);
      npcObj.getTransform().setWorldPosition(pos);
      npcObj.getTransform().setWorldRotation(rot);
    }
  });


  print("👂 Audience is now listening for NPC sync updates...");
}

  private detectRole() {
    const isSingle = this.session.isSingleplayer();

    if (isSingle) {
      this.role = "Singleplayer";
      this.isHost = false;
    } else {
      const users = this.session.getUsers();
      print(`👥 Connected users: ${users.map(u => u.connectionId).join(", ")}`);
      print(users.length);
      if (users.length === 1) {
        this.role = "Host";
        this.isHost = true;
      } else {
        this.role = "Audience";
        this.isHost = false;
      }
    }

    if (this.npcGenerationUI) {
      if (this.isHost || this.role === "Singleplayer") {
        this.npcGenerationUI.enabled = true;

      } else {
        this.npcGenerationUI.enabled = false;
        // Maybe show some audience UI element here
      }
    }

   print(`[ConversationController] Joined as ${this.role}`);
  }

  //----------------------------------------------------------------------
  // SETUP + SPAWN LOGIC
  //----------------------------------------------------------------------
  public setupScene(scene: string, physical: string, personality: string) {
    const systemPrompt = `
      You are an NPC inside an AR experience.
      Scene context: ${scene}.
      Character description: ${physical}.
      Personality: ${personality}.
      Stay in character at all times.
      Respond naturally and conversationally in 1–3 short sentences.
      Do not mention AI or that you're generated.
      Always progress the plot of the scene forward.
    `;

    this.setSystemContext(systemPrompt);
    this.spawnNPC(physical);
  }

  //----------------------------------------------------------------------
  // ASR MODULE
  //----------------------------------------------------------------------
  private asrModule = require("LensStudio:AsrModule");

  private initASR() {
    const options = AsrModule.AsrTranscriptionOptions.create();
    options.silenceUntilTerminationMs = 1200;
    options.mode = AsrModule.AsrMode.Balanced;
    options.onTranscriptionUpdateEvent.add((e: any) => this.onTranscriptionUpdate(e));
    options.onTranscriptionErrorEvent.add((e: any) => this.onTranscriptionError(e));
    this.asrOptions = options;
    this.asrModule.startTranscribing(options);
    print("🎤 ASR started");
  }

  private onTranscriptionUpdate(eventArgs: any) {
    if (eventArgs.isFinal && !this.isProcessing) {
      this.isProcessing = true;
      this.asrModule.stopTranscribing();
      const text = eventArgs.text.trim();
      print(`User said: ${text}`);
      this.processConversation(text);
    }
  }

  private onTranscriptionError(err: any) {
    print(`ASR Error: ${err}`);
    this.restartListening();
  }

  //----------------------------------------------------------------------
  // CONVERSATION
  //----------------------------------------------------------------------
  private processConversation(userInput: string) {
    this.conversationHistory.push({ role: "user", content: userInput });
    OpenAI.chatCompletions({
      model: "gpt-4.1-nano",
      messages: this.conversationHistory,
      temperature: 0.8,
    })
      .then((response: any) => {
        const reply = response.choices[0].message.content;
        this.conversationHistory.push({ role: "assistant", content: reply });
        print(`NPC: ${reply}`);
        this.speak(reply);
      })
      .catch((err: any) => {
        print(`GPT Error: ${err}`);
        this.restartListening();
      });
  }

  private speak(text: string) {
    if (!this.activeNPC) {
      print("NPC not ready yet");
      return;
    }


    this.activeNPC.playDialogue(text);

    if (this.isHost || this.role === "Singleplayer") {
      this.activeNPC.broadcastSpeech(text);
    }

    this.restartListening();
  }

  private restartListening() {
    this.isProcessing = false;
    this.asrModule.startTranscribing(this.asrOptions);
    print("Listening...");
  }


 //----------------------------------------------------------------------
 // NPC SPAWN
//----------------------------------------------------------------------
private spawnNPC(prompt: string = "Friendly robot with headphones") { 
  // 🛑 Prevent duplicates
  if (this.activeNPC) {
    print("⚠️ NPC already active, skipping spawn");
    return;
  }

  // 🧱 Check factory
  if (!this.factory) {
    print("❌ Factory missing, cannot spawn NPC");
    return;
  }

  // 👑 Only the host (or singleplayer) spawns the NPC
  if (this.isHost || this.role === "Singleplayer") {
    print(`🧱 Host spawning NPC with prompt: ${prompt}`);

    this.factory.createInteractable3DObject(prompt)
      .then(({ msg, assetURL }) => {
        print(`✅ NPC spawned locally: ${msg}`);

        // 🌍 Broadcast model + prompt so audience can spawn same NPC
        if (this.isSyncReady) {
          this.npcAssetURLProp.setPendingValue(assetURL);
          this.npcPromptProp.setPendingValue(prompt);
          print(`🌍 Broadcasted NPC asset + prompt: ${assetURL}`);
        }

        // 🧩 Grab the NPC object from factory root
        const npcObj = this.snap3DFactoryObj.getChild(0);
        if (!npcObj) {
          print("❌ No child found under factory object after spawn");
          return;
        }

        // 🔗 Get Snap3DInteractable component
        const npcComp = npcObj.getComponent(Snap3DInteractable.getTypeName());
        if (!npcComp) {
          print("❌ Spawned object missing Snap3DInteractable component");
          return;
        }

        // 💾 Store + configure
        this.activeNPC = npcComp;
        this.activeNPC.setPrompt(prompt);
        this.activeNPC.setSpeechBubble("👋 Hello, I'm your AI NPC!");
        
        const npcTransform = npcObj.getTransform();
        this.npcPositionProp.setPendingValue(npcTransform.getWorldPosition());
        this.npcRotationProp.setPendingValue(npcTransform.getWorldRotation());

        // 🗣️ Start voice listening
        this.initASR();

        // 🛰️ Start transform broadcasting only for host or singleplayer
        if (this.isHost || this.role === "Singleplayer") {
          if (this.activeNPC && this.activeNPC.startTransformSync) {
            this.activeNPC.startTransformSync();
            print("🛰️ Host started transform sync broadcasting");
          } else {
            print("⚠️ activeNPC missing startTransformSync()");
          }
        }

      })
      .catch((err: string) => {
        print(`💥 Failed to spawn NPC: ${err}`);
      });
  } else {
    print("🙅 Audience cannot spawn NPCs — waiting for host sync");
  }
}


  private spawnRemoteNPC(assetURL: string, prompt: string) {
    if (this.activeNPC) {
      print("⚠️ NPC already exists, skipping remote spawn");
      return;
    }

    print(`🌍 Loading remote NPC model from ${assetURL}`);

    // Instantiate from prefab
    const parent = this.snap3DFactoryObj || this.sceneObject;
    const npcObj = this.npcPrefab ? this.npcPrefab.instantiate(parent) : null;

    if (!npcObj) {
      print("❌ Failed to instantiate NPC prefab — check inspector reference");
      return;
    }

    // Get component (works even if nested)
    const npcComp = npcObj.getComponent(Snap3DInteractable.getTypeName());
    if (!npcComp) {
      print("❌ Spawned prefab missing Snap3DInteractable component");
      return;
    }

    // Configure NPC
    this.activeNPC = npcComp;
    this.activeNPC.setPrompt(prompt);
    this.activeNPC.loadFromURL(assetURL);
    this.activeNPC.setSpeechBubble("👋 Synced NPC joined!");
    //this.activeNPC.setInteractionEnabled(false);

    return npcObj;
  }




  //----------------------------------------------------------------------
  // CONTEXT
  //----------------------------------------------------------------------
  private setSystemContext(systemPrompt: string) {
    this.conversationHistory = [{ role: "system", content: systemPrompt }];
    print("🧠 System context initialized:");
    print(systemPrompt);
  }
}
