import { ASRQueryController } from "./ASRQueryController";
import { OpenAI } from "RemoteServiceGateway.lspkg/HostedExternal/OpenAI";
import { OpenAITypes } from "RemoteServiceGateway.lspkg/HostedExternal/OpenAITypes";

@component
export class SceneSetupUI extends BaseScriptComponent {
  @input("Component.ScriptComponent") conversationController;

  @input("Component.Text") physicalField: Text;
  @input("Component.Text") personalityField: Text;
  @input("Component.Text") sceneField: Text;

  // ✔ Only one ASR button
  @input("Component.ScriptComponent") unifiedAsrBtn: BaseScriptComponent;

  private physicalDescription = "";
  private personalityDescription = "";
  private sceneDescription = "";

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => this.init());
  }

  private init() {
    const ctl = this.resolveAsrController(this.unifiedAsrBtn, "unified");

    if (ctl) {
      ctl.onQueryEvent.add((text: string) => this.handleUnifiedSpeech(text));
    }

    print("[SceneSetupUI] ✅ One-button ASR Initialized");
  }

  //----------------------------------------------------------------------
  // Convert generic script → ASRQueryController interface
  //----------------------------------------------------------------------
  private resolveAsrController(comp: any, tag: string) {
    if (!comp) {
      print(`[SceneSetupUI] ⚠️ ${tag} ASR button not assigned`);
      return null;
    }

    if ((comp as ASRQueryController).onQueryEvent) return comp;

    if (comp.api && comp.api.onQueryEvent) return comp.api;

    print(`[SceneSetupUI] ❌ ${tag} ASR controller missing .onQueryEvent`);
    return null;
  }

  //----------------------------------------------------------------------
  // ASR result handler → send whole speech to LLM
  //----------------------------------------------------------------------
  private handleUnifiedSpeech(fullText: string) {
    print(`🎤 User said: ${fullText}`);
    this.callLLMToSplitInput(fullText);
  }

  //----------------------------------------------------------------------
  // ✔ CORRECT OpenAI CALL using your API wrapper
  //----------------------------------------------------------------------
  private callLLMToSplitInput(text: string) {
    const req: OpenAITypes.ChatCompletions.Request = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Split the user's input into three fields: physical, personality, and scene. Return ONLY valid JSON like: { \"physical\": \"..\", \"personality\": \"..\", \"scene\": \"..\" }"
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3,
    };

    // ✅ THIS IS THE CORRECT USAGE FOR YOUR WRAPPER
    OpenAI.chatCompletions(req)
      .then((res: OpenAITypes.ChatCompletions.Response) => {
        const raw = res.choices[0].message.content;
        print("🧩 LLM Response: " + raw);

        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          print("❌ JSON parse failed: " + e);
          return;
        }

        this.applyLLMResult(parsed);
      })
      .catch((err) => {
        print("❌ OpenAI chatCompletions error: " + err);
      });
  }

  //----------------------------------------------------------------------
  // Apply LLM output → update UI → build NPC
  //----------------------------------------------------------------------
  private applyLLMResult(split) {
    if (!split) return;

    this.physicalDescription = split.physical || "";
    this.personalityDescription = split.personality || "";
    this.sceneDescription = split.scene || "";

    this.physicalField.text = this.physicalDescription;
    this.personalityField.text = this.personalityDescription;
    this.sceneField.text = this.sceneDescription;

    print("✨ Fields auto-filled");
    this.checkReadyToRun();
  }

  //----------------------------------------------------------------------
  // Check if ready → build NPC
  //----------------------------------------------------------------------
  private checkReadyToRun() {
    if (
      this.physicalDescription.trim() ||
      this.personalityDescription.trim() ||
      this.sceneDescription.trim()
    ) {
      print("🚀 All fields ready — generating NPC!");
      this.runScene();
    }
  }

  private runScene() {
    this.conversationController.setupScene(
      this.sceneDescription,
      this.physicalDescription,
      this.personalityDescription
    );
  }
}
