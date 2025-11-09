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
            // UI text fields
            this.physicalField = this.physicalField;
            this.personalityField = this.personalityField;
            this.sceneField = this.sceneField;
            // ASR buttons (each one has ASRQueryController)
            this.physicalAsrBtn = this.physicalAsrBtn;
            this.personalityAsrBtn = this.personalityAsrBtn;
            this.sceneAsrBtn = this.sceneAsrBtn;
            // Run Scene button
            this.runScenePinchBtn = this.runScenePinchBtn;
            this.physicalDescription = "";
            this.personalityDescription = "";
            this.sceneDescription = "";
        }
        __initialize() {
            super.__initialize();
            this.conversationController = this.conversationController;
            // UI text fields
            this.physicalField = this.physicalField;
            this.personalityField = this.personalityField;
            this.sceneField = this.sceneField;
            // ASR buttons (each one has ASRQueryController)
            this.physicalAsrBtn = this.physicalAsrBtn;
            this.personalityAsrBtn = this.personalityAsrBtn;
            this.sceneAsrBtn = this.sceneAsrBtn;
            // Run Scene button
            this.runScenePinchBtn = this.runScenePinchBtn;
            this.physicalDescription = "";
            this.personalityDescription = "";
            this.sceneDescription = "";
        }
        // ✔ initialize reliably after all components are awake
        onAwake() {
            this.createEvent("OnStartEvent").bind(() => this.init());
        }
        init() {
            // Resolve each controller to an object that has `onQueryEvent.add(...)`
            const physicalCtl = this.resolveAsrController(this.physicalAsrBtn, "physical");
            const personalityCtl = this.resolveAsrController(this.personalityAsrBtn, "personality");
            const sceneCtl = this.resolveAsrController(this.sceneAsrBtn, "scene");
            if (physicalCtl)
                physicalCtl.onQueryEvent.add((t) => this.updateField("physical", t));
            if (personalityCtl)
                personalityCtl.onQueryEvent.add((t) => this.updateField("personality", t));
            if (sceneCtl)
                sceneCtl.onQueryEvent.add((t) => this.updateField("scene", t));
            // Hook up the pinch button for running the scene
            if (this.runScenePinchBtn && this.runScenePinchBtn.api?.onButtonPinched) {
                this.runScenePinchBtn.api.onButtonPinched.add(() => this.runScene());
                print("🎬 Run Scene pinch button bound!");
            }
            else {
                print("⚠️ Run Scene pinch button not configured or missing API.");
            }
            print("[SceneSetupUI] ✅ Initialized");
        }
        /**
         * Tries to get an ASRQueryController instance from a ScriptComponent input.
         * Works if the input is:
         *  - already typed as ASRQueryController, or
         *  - a generic ScriptComponent that exposes .api.onQueryEvent
         */
        resolveAsrController(comp, tag) {
            if (!comp) {
                print(`[SceneSetupUI] ⚠️ ${tag} ASR button not assigned`);
                return null;
            }
            // Case A: it’s already our script class (best case)
            if (comp.onQueryEvent) {
                print(`[SceneSetupUI] 🔗 ${tag} controller: typed ASRQueryController`);
                return comp;
            }
            // Case B: it’s a generic ScriptComponent but the script exposed an API
            if (comp.api && comp.api.onQueryEvent && comp.api.onQueryEvent.add) {
                print(`[SceneSetupUI] 🔗 ${tag} controller: using .api bridge`);
                return comp.api;
            }
            print(`[SceneSetupUI] ❌ ${tag} controller does not expose onQueryEvent`);
            return null;
        }
        updateField(field, text) {
            switch (field) {
                case "physical":
                    this.physicalDescription = text;
                    if (this.physicalField)
                        this.physicalField.text = text;
                    break;
                case "personality":
                    this.personalityDescription = text;
                    if (this.personalityField)
                        this.personalityField.text = text;
                    break;
                case "scene":
                    this.sceneDescription = text;
                    if (this.sceneField)
                        this.sceneField.text = text;
                    break;
            }
            print(`[SceneSetupUI] 🎙️ ${field} captured: ${text}`);
        }
        runScene() {
            if (!this.physicalDescription || !this.personalityDescription || !this.sceneDescription) {
                print("[SceneSetupUI] ⚠️ Fill all fields before running the scene!");
                return;
            }
            print("[SceneSetupUI] 🚀 Running scene setup!");
            // If your conversationController exposes an API:
            // this.conversationController?.api?.setupScene?.(
            //   this.sceneDescription,
            //   this.physicalDescription,
            //   this.personalityDescription
            // );
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