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
            this.physicalField = this.physicalField;
            this.personalityField = this.personalityField;
            this.sceneField = this.sceneField;
            this.physicalAsrBtn = this.physicalAsrBtn;
            this.personalityAsrBtn = this.personalityAsrBtn;
            this.sceneAsrBtn = this.sceneAsrBtn;
            this.runSceneBtn = this.runSceneBtn;
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
            this.physicalAsrBtn = this.physicalAsrBtn;
            this.personalityAsrBtn = this.personalityAsrBtn;
            this.sceneAsrBtn = this.sceneAsrBtn;
            this.runSceneBtn = this.runSceneBtn;
            this.physicalDescription = "";
            this.personalityDescription = "";
            this.sceneDescription = "";
        }
        onStart() {
            // Hook up ASR button events (Lens Studio guarantees onStart after all Awake)
            this.physicalAsrBtn?.onQueryEvent.add((t) => this.updateField("physical", t));
            this.personalityAsrBtn?.onQueryEvent.add((t) => this.updateField("personality", t));
            this.sceneAsrBtn?.onQueryEvent.add((t) => this.updateField("scene", t));
            // Run Scene button
            //this.runSceneBtn.createEvent("TapEvent").bind(() => this.runScene());
            print("✅ SceneSetupUI initialized");
        }
        updateField(field, text) {
            switch (field) {
                case "physical":
                    this.physicalDescription = text;
                    this.physicalField.text = text;
                    break;
                case "personality":
                    this.personalityDescription = text;
                    this.personalityField.text = text;
                    break;
                case "scene":
                    this.sceneDescription = text;
                    this.sceneField.text = text;
                    break;
            }
            print(`🎙️ ${field} captured: ${text}`);
        }
        runScene() {
            if (!this.physicalDescription || !this.personalityDescription || !this.sceneDescription) {
                print("⚠️ Fill all fields before running the scene!");
                return;
            }
            print("🚀 Running scene setup!");
            this.conversationController?.api?.setupScene?.(this.sceneDescription, this.physicalDescription, this.personalityDescription);
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