import { Snap3DInteractableFactory } from "./Snap3DInteractableFactory";
import { Snap3DInteractable } from "./Snap3DInteractable";

const { OpenAI } = require("RemoteServiceGateway.lspkg/HostedExternal/OpenAI");
const AsrModule = require("LensStudio:AsrModule");
const TextToSpeech = require("LensStudio:TextToSpeechModule");

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
        this.initASR();
    }
}
