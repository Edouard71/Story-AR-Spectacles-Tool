import { Snap3DInteractableFactory } from "./Snap3DInteractableFactory";
import { Snap3DInteractable } from "./Snap3DInteractable";

const { OpenAI } = require("RemoteServiceGateway.lspkg/HostedExternal/OpenAI");

@component
export class Snap3DConversationController extends BaseScriptComponent {
    
    @input snap3DFactoryObj: SceneObject;

    private factory: Snap3DInteractableFactory;
    private activeNPC: Snap3DInteractable | null = null;
    private conversationHistory: { role: string; content: string }[] = [];
    private isProcessing: boolean = false;
    private asrOptions: any;

    onAwake() {
        this.factory = this.snap3DFactoryObj.getComponent(Snap3DInteractableFactory.getTypeName());
        
        this.createEvent("OnStartEvent").bind(() => {
          this.spawnNPC();
        });
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
      })
      .catch((err: any) => {
        print(`GPT Error: ${err}`);
        this.restartListening();
      });
  }

  private speak(text: string) {
    if (!this.activeNPC) {
      print("NPC not ready yet");
      this.restartListening();
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

  private spawnNPC(prompt: string = "Friendly robot with headphones") {
  // only spawn once
  if (this.activeNPC) return;

  this.factory
    .createInteractable3DObject(prompt)
    .then((msg: string) => {
      print(`NPC spawned: ${msg}`);
      // find the component we just created
      const npcObj = this.snap3DFactoryObj.getChild(0); // adjust if prefab spawns deeper
      this.activeNPC = npcObj.getComponent(Snap3DInteractable.getTypeName());
      this.activeNPC.setSpeechBubble("👋 Hello, I'm your AI NPC!");
      this.initASR();
    })
    .catch((err: string) => {
      print(`Failed to spawn NPC: ${err}`);
    });
}


}


import { OpenAIRealtimeWebsocket } from "RemoteServiceGateway.lspkg/HostedExternal/OpenAI";
import { AudioProcessor } from "RemoteServiceGateway.lspkg/Helpers/AudioProcessor";
import { DynamicAudioOutput } from "RemoteServiceGateway.lspkg/Helpers/DynamicAudioOutput";
import { OpenAITypes } from "RemoteServiceGateway.lspkg/HostedExternal/OpenAITypes";

export class OpenAITTSHelper {
  private dynamicAudioOutput: DynamicAudioOutput;

  constructor() {
    this.dynamicAudioOutput = new DynamicAudioOutput();
    this.dynamicAudioOutput.initialize(24000); // standard 24kHz
  }

  public async generateSpeech(
    text: string,
    voice: string = "alloy",
    model: string = "gpt-4o-mini-tts"
  ): Promise<AudioTrackAsset | null> {
    try {
      print(`🎤 Generating TTS: ${text}`);

      const response = await OpenAI.audio.speech.create({
        model: model,
        voice: voice,
        input: text,
        response_format: "mp3",
      });

      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Create playable AudioTrackAsset
      const audioTrack = Audio.createAudioTrackAssetFromBuffer(bytes);
      print("✅ TTS audio created successfully");
      return audioTrack;
    } catch (err) {
      print(`❌ TTS generation failed: ${err}`);
      return null;
    }
  }
}

