"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneSetupUI = void 0;
var __selfType = requireType("./SceneSetupUI");
function component(target) { target.getTypeName = function () { return __selfType; }; }
const OpenAI_1 = require("RemoteServiceGateway.lspkg/HostedExternal/OpenAI");
let SceneSetupUI = (() => {
    let _classDecorators = [component];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseScriptComponent;
    var SceneSetupUI = _classThis = class extends _classSuper {
        constructor() {
            super();
            this.conversationController = this.conversationController;
            this.physicalField = this.physicalField;
            this.personalityField = this.personalityField;
            this.sceneField = this.sceneField;
            // ✔ Only one ASR button
            this.unifiedAsrBtn = this.unifiedAsrBtn;
            this.physicalDescription = "";
            this.personalityDescription = "";
            this.sceneDescription = "";
        }
        __initialize() {
            super.__initialize();
            this.conversationController = this.conversationController;
            this.physicalField = this.physicalField;
            this.personalityField = this.personalityField;
            this.sceneField = this.sceneField;
            // ✔ Only one ASR button
            this.unifiedAsrBtn = this.unifiedAsrBtn;
            this.physicalDescription = "";
            this.personalityDescription = "";
            this.sceneDescription = "";
        }
        onAwake() {
            this.createEvent("OnStartEvent").bind(() => this.init());
        }
        init() {
            const ctl = this.resolveAsrController(this.unifiedAsrBtn, "unified");
            if (ctl) {
                ctl.onQueryEvent.add((text) => this.handleUnifiedSpeech(text));
            }
            print("[SceneSetupUI] ✅ One-button ASR Initialized");
        }
        //----------------------------------------------------------------------
        // Convert generic script → ASRQueryController interface
        //----------------------------------------------------------------------
        resolveAsrController(comp, tag) {
            if (!comp) {
                print(`[SceneSetupUI] ⚠️ ${tag} ASR button not assigned`);
                return null;
            }
            if (comp.onQueryEvent)
                return comp;
            if (comp.api && comp.api.onQueryEvent)
                return comp.api;
            print(`[SceneSetupUI] ❌ ${tag} ASR controller missing .onQueryEvent`);
            return null;
        }
        //----------------------------------------------------------------------
        // ASR result handler → send whole speech to LLM
        //----------------------------------------------------------------------
        handleUnifiedSpeech(fullText) {
            print(`🎤 User said: ${fullText}`);
            this.callLLMToSplitInput(fullText);
        }
        //----------------------------------------------------------------------
        // ✔ CORRECT OpenAI CALL using your API wrapper
        //----------------------------------------------------------------------
        callLLMToSplitInput(text) {
            const req = {
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Split the user's input into three fields: physical, personality, and scene. Return ONLY valid JSON like: { \"physical\": \"..\", \"personality\": \"..\", \"scene\": \"..\" }"
                    },
                    {
                        role: "user",
                        content: text
                    }
                ],
                temperature: 0.3,
            };
            // ✅ THIS IS THE CORRECT USAGE FOR YOUR WRAPPER
            OpenAI_1.OpenAI.chatCompletions(req)
                .then((res) => {
                const raw = res.choices[0].message.content;
                print("🧩 LLM Response: " + raw);
                let parsed;
                try {
                    parsed = JSON.parse(raw);
                }
                catch (e) {
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
        applyLLMResult(split) {
            if (!split)
                return;
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
        checkReadyToRun() {
            if (this.physicalDescription.trim() ||
                this.personalityDescription.trim() ||
                this.sceneDescription.trim()) {
                print("🚀 All fields ready — generating NPC!");
                this.runScene();
            }
        }
        runScene() {
            this.conversationController.setupScene(this.sceneDescription, this.physicalDescription, this.personalityDescription);
        }
    };
    __setFunctionName(_classThis, "SceneSetupUI");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SceneSetupUI = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SceneSetupUI = _classThis;
})();
exports.SceneSetupUI = SceneSetupUI;
//# sourceMappingURL=SceneSetupUI.js.map