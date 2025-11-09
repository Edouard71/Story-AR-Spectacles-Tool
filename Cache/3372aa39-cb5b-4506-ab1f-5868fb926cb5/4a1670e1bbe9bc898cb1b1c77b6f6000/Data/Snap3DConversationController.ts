import { Snap3DInteractableFactory } from "./Snap3DInteractableFactory";
import { Snap3DInteractable } from "./Snap3DInteractable";

const { OpenAI } = require("RemoteServiceGateway.lspkg/HostedExternal/OpenAI");
const AsrModule = require("LensStudio:AsrModule");
const TextToSpeech = require("LensStudio:TextToSpeechModule");

@component
export class Snap3DConversationController extends BaseScriptComponent {
    private asrModule = require('LensStudio:AsrModule');
    @input snap3DFactoryObj: SceneObject;

    private factory: Snap3DInteractableFactory;
    private activeNPC: Snap3DInteractable | null = null;
    private conversationHistory: { role: string; content: string }[] = [];
    private isProcessing: boolean = false;
    private asrOptions: any;

    onAwake() {
        this.factory = this.snap3DFactoryObj.getComponent(Snap3DInteractableFactory.getTypeName());
        this.initASR();
    }
      
    private initASR() {
    this.asrOptions = AsrModule.AsrTranscriptionOptions.create();
    this.asrOptions.mode = AsrModule.AsrMode.Balanced;
    this.asrOptions.silenceUntilTerminationMs = 1200;
    this.asrOptions.onTranscriptionUpdateEvent.add(this.onTranscriptionUpdate.bind(this));
    this.asrOptions.onTranscriptionErrorEvent.add(this.onTranscriptionError.bind(this));

    AsrModule.startTranscribing(this.asrOptions);
    print("🎤 ASR started");

    // 👤 spawn NPC early
    this.factory.createInteractable3DObject("Friendly NPC").then(() => {
      let obj = this.factory.sceneObject.getChild(0);
      if (obj) {
        this.activeNPC = obj.getComponent(Snap3DInteractable.getTypeName());
        print("NPC ready!");
      }
    });
  }

  private onTranscriptionUpdate(eventArgs: any) {
    if (eventArgs.isFinal && !this.isProcessing) {
      this.isProcessing = true;
      AsrModule.stopTranscribing();
      const text = eventArgs.text.trim();
      print("User said: ${text}");
      this.processConversation(text);
    }
  }

  private onTranscriptionError(err: any) {
    print("ASR Error: ${err}.");
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
       print("NPC: ${reply}");
        this.speak(reply);
      })
      .catch((err: any) => {
        print("GPT Error: ${err}");
        this.restartListening();
      });
  }

   private speak(text: string) {
    if (!this.activeNPC) {
      print("NPC not ready yet");
      this.restartListening();
      return;
    }

    const opts = TextToSpeech.Options.create();
    opts.voiceName = TextToSpeech.VoiceNames.Sam;

    TextToSpeech.synthesize(
      text,
      opts,
      (audioTrack: AudioTrackAsset) => {
        this.activeNPC.playDialogue(text, audioTrack);
        this.restartListening();
      },
      (err: string) => {
        print("TTS Error: f{err}");
        this.activeNPC.playDialogue(text);
        this.restartListening();
      }
    );
  }

    private restartListening() {
        this.isProcessing = false;
        AsrModule.startTranscribing(this.asrOptions);
        print("Listening...");
  }

}
