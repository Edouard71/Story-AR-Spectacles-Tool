import { Snap3DInteractableFactory } from "./Snap3DInteractableFactory";
import { Snap3DInteractable } from "./Snap3DInteractable";

import { SessionController } from "SpectaclesSyncKit.lspkg/Core/SessionController";
import { SyncEntity } from "SpectaclesSyncKit.lspkg/Core/SyncEntity";
import { StorageProperty } from "SpectaclesSyncKit.lspkg/Core/StorageProperty";
import { Instantiator, InstantiationOptions } from "SpectaclesSyncKit.lspkg/Components/Instantiator"
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
    
    
    // Set up sync entity
    this.syncEntity = new SyncEntity(this, null, true, "Session", null);
  
    this.syncEntity.notifyOnReady(() => {
      print("🔗 SyncEntity ready");
      this.isSyncReady = true;
      this.detectRole();
    });

    
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
        //if (this.session.isHost()) this.lastLineProp.setPendingValue(reply);
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
    if (this.activeNPC) {
      print("⚠️ NPC already active, skipping spawn");
      return;
    }
    if (!this.factory) {
      print("❌ Factory missing, cannot spawn NPC");
      return;
    }

    print(`🧱 Spawning NPC with prompt: ${prompt}`);
    // Step 1: Generate model locally
  this.factory.createInteractable3DObject(prompt).then((msg: string) => {
    print(`✅ NPC generated locally: ${msg}`);

    // Step 2: Grab the generated object from the factory
    const localNPC = this.snap3DFactoryObj.getChild(0);
    if (!localNPC) {
      print("❌ No generated NPC found!");
      return;
    }

    // Step 3: Spawn a synced prefab via Instantiator
    this.instantiator.notifyOnReady(() => {
      const options = new InstantiationOptions();
      options.claimOwnership = true;
      options.persistence = "Session";
      options.onSuccess = (networkRootInfo) => {
        print("🌍 Networked NPC spawned!");

        // Step 4: Copy generated assets onto the networked prefab
        const networkedNPC = networkRootInfo.instantiatedObject;
        const npcComp = networkedNPC.getComponent(Snap3DInteractable.getTypeName());
        const localComp = localNPC.getComponent(Snap3DInteractable.getTypeName());
        if (npcComp && localComp && localComp["finalAsset"]) {
          npcComp.setModel(localComp["finalAsset"], true);
        }

        this.activeNPC = npcComp;
      };

    this.instantiator.instantiate(this.npcPrefab, options);
  });
});

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
