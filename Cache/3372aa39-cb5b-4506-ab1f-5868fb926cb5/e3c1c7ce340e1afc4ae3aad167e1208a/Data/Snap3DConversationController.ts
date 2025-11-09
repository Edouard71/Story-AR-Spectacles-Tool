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
  
  // ChatGPT
  private conversationHistory: { role: string; content: string }[] = [];
 
  // ASR
  private isProcessing: boolean = false;
  private asrOptions: any;

  // Sync
  private session: any;
  private syncEntity: SyncEntity;
  private npcPromptProp = StorageProperty.manualString("npcPrompt", "");
  private lastLineProp = StorageProperty.manualString("lastLine", "");

  onStart() {
    // Get session + factory
    this.session = SessionController.getInstance();
    print(`Factory object: ${this.snap3DFactoryObj.name}`);
    print(`Factory component: ${this.factory ? "✅ Found" : "❌ Missing"}`);
    print(`Factory component type: ${this.factory?.constructor?.name}`);

    this.factory = this.snap3DFactoryObj.getComponent(Snap3DInteractableFactory.getTypeName());

    // Create SyncEntity (no StoragePropertySet)
    this.syncEntity = new SyncEntity(this, null, true, "Session", null);

    // Add storage properties individually
    this.syncEntity.addStorageProperty(this.npcPromptProp);
    this.syncEntity.addStorageProperty(this.lastLineProp);

    // When the SyncEntity is ready, wire listeners
    this.syncEntity.notifyOnReady(() => {
      print("🔗 SyncEntity ready");

      // Audience: spawn when host sets the prompt
      this.npcPromptProp.onAnyChange.add((newVal: string) => {
        if (!this.session.isHost() && newVal && !this.activeNPC) {
          print(`🎬 Audience spawning synced NPC: ${newVal}`);
          this.spawnNPC(newVal);
        }
      });

      // Everyone: display latest NPC line (audience gets host’s)
      this.lastLineProp.onAnyChange.add((line: string) => {
        if (line) this.speak(line);
      });
    });

    // Optional: log role
    this.session.onSessionJoined.add(() => {
      print(`[ConversationController] Joined as ${this.session.isHost() ? "🎭 Performer" : "👀 Audience"}`);
    });
  }

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

    // this.npcPromptProp.setPendingValue(physical);

    this.spawnNPC(`${physical}`);
  }

      
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
    print(`ASR Error: ${err}.`);
    this.restartListening();
  }

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
        this.lastLineProp.setPendingValue(reply);
      })
      .catch((err: any) => {
        print(`GPT Error: ${err}`);
        this.restartListening();
      });
  }

  private speak(text: string) {
    if (!this.activeNPC) { print("NPC not ready yet"); return; }
    this.activeNPC.playDialogue(text);
    if (this.session.isHost()) this.restartListening();
  }

  private restartListening() {
    this.isProcessing = false;
    this.asrModule.startTranscribing(this.asrOptions);
    print("Listening...");
  }

  private spawnNPC(prompt: string = "Friendly robot with headphones") {
  if (this.activeNPC) {
    print("⚠️ NPC already active, skipping spawn");
    return;
  }

  if (!this.factory) {
    print("❌ No factory found on snap3DFactoryObj");
    return;
  }

  print(`🧱 Spawning NPC with prompt: ${prompt}`);

  this.factory
    .createInteractable3DObject(prompt)
    .then((msg: string) => {
      print(`✅ NPC spawned: ${msg}`);
      const npcObj = this.snap3DFactoryObj.getChild(0);
      if (!npcObj) {
        print("❌ Factory returned but no child found under snap3DFactoryObj");
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


  private setSystemContext(systemPrompt: string) {
    this.conversationHistory = [{ role: "system", content: systemPrompt }];
    print("🧠 System context initialized:");
    print(systemPrompt);
  }


}
