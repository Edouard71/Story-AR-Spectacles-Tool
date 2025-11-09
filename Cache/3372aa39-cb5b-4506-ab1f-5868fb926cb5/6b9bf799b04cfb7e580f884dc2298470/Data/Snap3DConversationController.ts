import { Snap3DInteractableFactory } from "./Snap3DInteractableFactory";
import { Snap3DInteractable } from "./Snap3DInteractable";
import { SessionController } from "SpectaclesSyncKit.lspkg/Core/SessionController";
import { SyncEntity } from "SpectaclesSyncKit.lspkg/Core/SyncEntity";
import { StorageProperty } from "SpectaclesSyncKit.lspkg/Core/StorageProperty";
const { OpenAI } = require("RemoteServiceGateway.lspkg/HostedExternal/OpenAI");

@component
export class Snap3DConversationController extends BaseScriptComponent {
  @input snap3DFactoryObj: SceneObject;

  private factory: Snap3DInteractableFactory;
  private activeNPC: Snap3DInteractable | null = null;
  private conversationHistory: { role: string; content: string }[] = [];
  private isProcessing = false;
  private asrOptions: any;

  private session: any;
  private syncEntity: SyncEntity;
  private npcPromptProp = StorageProperty.manualString("npcPrompt", "");
  private lastLineProp = StorageProperty.manualString("lastLine", "");

  private isSyncReady: boolean = false;
  //----------------------------------------------------------------------
  // LIFECYCLE
  //----------------------------------------------------------------------
  onAwake() {
    // Only reference local components here
    if (!this.snap3DFactoryObj) {
      print("❌ snap3DFactoryObj not assigned in Inspector");
      return;
    }
    this.factory = this.snap3DFactoryObj.getComponent(Snap3DInteractableFactory.getTypeName());
    if (!this.factory) {
      print("❌ Missing Snap3DInteractableFactory on snap3DFactoryObj");
      return;
    }
    print("✅ Factory reference established in onAwake()");
  }

  onStart() {
    this.session = SessionController.getInstance();

    // Initialize SyncEntity
    this.syncEntity = new SyncEntity(this, null, true, "Session", null);
    this.syncEntity.addStorageProperty(this.npcPromptProp);
    this.syncEntity.addStorageProperty(this.lastLineProp);

    this.syncEntity.notifyOnReady(() => this.onSyncReady());

    // Print once session join completes
    this.session.onSessionJoined.add(() => {
      print(`[ConversationController] Joined as ${this.session.isHost() ? "🎭 Performer" : "👀 Audience"}`);
    });
  }

  //----------------------------------------------------------------------
  // SYNC HANDLING
  //----------------------------------------------------------------------
  private onSyncReady() {
    this.isSyncReady = true;
    print("🔗 SyncEntity ready");

    // Audience spawns NPC when host sets prompt
    this.npcPromptProp.onAnyChange.add((newVal: string) => {
      if (!this.session.isHost() && newVal && !this.activeNPC) {
        print(`🎬 Audience spawning synced NPC: ${newVal}`);
        this.spawnNPC(newVal);
      }
    });

    // Both roles react to dialogue
    this.lastLineProp.onAnyChange.add((line: string) => {
      if (line) this.speak(line);
    });
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

    // Wait until both session + sync are ready
    const waitAndSpawn = () => {
      if (!this.session || !this.session.isConnected || !this.isSyncReady) { {
        print("⏳ Waiting for session and sync before spawning NPC...");
        return;
      }

      print(`🚀 Ready to spawn NPC for ${this.session.isHost() ? "host" : "audience"}`);
      if (this.session.isHost()) this.npcPromptProp.setPendingValue(physical);
      this.spawnNPC(physical);
    };

    waitAndSpawn();
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
        if (this.session.isHost()) this.lastLineProp.setPendingValue(reply);
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
    if (this.session.isHost()) this.restartListening();
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
    this.factory
      .createInteractable3DObject(prompt)
      .then((msg: string) => {
        print(`✅ NPC spawned: ${msg}`);
        const npcObj = this.snap3DFactoryObj.getChild(0);
        if (!npcObj) {
          print("❌ No child found under factory object after spawn");
          return;
        }
        this.activeNPC = npcObj.getComponent(Snap3DInteractable.getTypeName());
        if (!this.activeNPC) {
          print("❌ Spawned object missing Snap3DInteractable component");
          return;
        }
        this.activeNPC.setSpeechBubble("👋 Hello, I'm your AI NPC!");
        if (this.session.isHost()) this.initASR();
      })
      .catch((err: string) => {
        print(`💥 Failed to spawn NPC: ${err}`);
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
