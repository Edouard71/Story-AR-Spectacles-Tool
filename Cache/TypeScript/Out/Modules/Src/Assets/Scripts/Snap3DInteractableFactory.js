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
exports.Snap3DInteractableFactory = void 0;
var __selfType = requireType("./Snap3DInteractableFactory");
function component(target) {
    target.getTypeName = function () { return __selfType; };
    if (target.prototype.hasOwnProperty("getTypeName"))
        return;
    Object.defineProperty(target.prototype, "getTypeName", {
        value: function () { return __selfType; },
        configurable: true,
        writable: true
    });
}
const Snap3D_1 = require("RemoteServiceGateway.lspkg/HostedSnap/Snap3D");
const Snap3DInteractable_1 = require("./Snap3DInteractable");
const WorldCameraFinderProvider_1 = require("SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider");
const SessionController_1 = require("SpectaclesSyncKit.lspkg/Core/SessionController");
const SyncEntity_1 = require("SpectaclesSyncKit.lspkg/Core/SyncEntity");
const StorageProperty_1 = require("SpectaclesSyncKit.lspkg/Core/StorageProperty");
const StoragePropertySet_1 = require("SpectaclesSyncKit.lspkg/Core/StoragePropertySet");
const NetworkIdTools_1 = require("SpectaclesSyncKit.lspkg/Core/NetworkIdTools");
const NetworkIdType_1 = require("SpectaclesSyncKit.lspkg/Core/NetworkIdType");
let Snap3DInteractableFactory = (() => {
    let _classDecorators = [component];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseScriptComponent;
    var Snap3DInteractableFactory = _classThis = class extends _classSuper {
        constructor() {
            super();
            this.prompt = this.prompt;
            this.refineMesh = this.refineMesh;
            this.useVertexColor = this.useVertexColor;
            this.runOnTap = this.runOnTap;
            this.snap3DInteractablePrefab = this.snap3DInteractablePrefab;
            this.avaliableToRequest = true;
            this.wcfmp = WorldCameraFinderProvider_1.default.getInstance();
            this.propAssetURLProp = StorageProperty_1.StorageProperty.manualString("propAssetURL", "");
            this.propPromptProp = StorageProperty_1.StorageProperty.manualString("propPrompt", "");
            this.propPositionProp = StorageProperty_1.StorageProperty.manualVec3("propPosition", vec3.zero());
            this.isSyncReady = false;
            this.isHost = false;
            this.role = "";
        }
        __initialize() {
            super.__initialize();
            this.prompt = this.prompt;
            this.refineMesh = this.refineMesh;
            this.useVertexColor = this.useVertexColor;
            this.runOnTap = this.runOnTap;
            this.snap3DInteractablePrefab = this.snap3DInteractablePrefab;
            this.avaliableToRequest = true;
            this.wcfmp = WorldCameraFinderProvider_1.default.getInstance();
            this.propAssetURLProp = StorageProperty_1.StorageProperty.manualString("propAssetURL", "");
            this.propPromptProp = StorageProperty_1.StorageProperty.manualString("propPrompt", "");
            this.propPositionProp = StorageProperty_1.StorageProperty.manualVec3("propPosition", vec3.zero());
            this.isSyncReady = false;
            this.isHost = false;
            this.role = "";
        }
        onAwake() {
            this.createEvent("TapEvent").bind(() => {
                if (!this.runOnTap) {
                    return;
                }
                this.createInteractable3DObject(this.prompt);
            });
            // Wait for SyncKit to be ready before starting
            SessionController_1.SessionController.getInstance().notifyOnReady(() => {
                print("🛰️ SessionController ready — starting factory sync");
                this.setupFactorySync();
            });
        }
        setupFactorySync() {
            this.session = SessionController_1.SessionController.getInstance();
            const networkIdOptions = new NetworkIdTools_1.NetworkIdTools.NetworkIdOptions();
            networkIdOptions.networkIdType = NetworkIdType_1.NetworkIdType.Custom;
            networkIdOptions.customNetworkId = "Snap3DFactory";
            this.factorySyncEntity = new SyncEntity_1.SyncEntity(this, new StoragePropertySet_1.StoragePropertySet([
                this.propAssetURLProp,
                this.propPromptProp,
                this.propPositionProp,
            ]), true, "Session", networkIdOptions);
            this.factorySyncEntity.notifyOnReady(() => {
                print("🔗 Factory SyncEntity ready");
                this.isSyncReady = true;
                this.detectRole();
                this.setupSyncListeners();
            });
        }
        detectRole() {
            const isSingle = this.session.isSingleplayer();
            if (isSingle) {
                this.role = "Singleplayer";
                this.isHost = false;
            }
            else {
                const users = this.session.getUsers();
                if (users.length === 1) {
                    this.role = "Host";
                    this.isHost = true;
                }
                else {
                    this.role = "Audience";
                    this.isHost = false;
                }
            }
            print(`[Snap3DInteractableFactory] Joined as ${this.role}`);
        }
        setupSyncListeners() {
            // Only audience members need to react to host broadcasts
            if (this.isHost || this.role === "Singleplayer")
                return;
            // Immediate catch-up if the host spawned before this client joined
            const existingURL = this.propAssetURLProp.currentOrPendingValue;
            if (existingURL && existingURL.length > 0) {
                print("📡 Host prop already exists — loading immediately");
                const prompt = this.propPromptProp.currentOrPendingValue;
                const pos = this.propPositionProp.currentOrPendingValue;
                this.spawnRemoteProp(existingURL, prompt, pos);
                return;
            }
            // Otherwise, subscribe to updates
            this.propAssetURLProp.onAnyChange.add((newURL, oldURL) => {
                if (newURL && newURL.length > 0 && newURL !== oldURL) {
                    const prompt = this.propPromptProp.currentOrPendingValue;
                    const pos = this.propPositionProp.currentOrPendingValue;
                    print(`🌐 Received prop from host — loading model: ${newURL}`);
                    this.spawnRemoteProp(newURL, prompt, pos);
                }
            });
            print("👂 Audience is now listening for prop sync updates...");
        }
        spawnRemoteProp(assetURL, prompt, position) {
            if (!this.snap3DInteractablePrefab) {
                print("❌ Prefab missing, cannot spawn remote prop");
                return;
            }
            print(`🌍 Loading remote prop model from ${assetURL}`);
            const propObj = this.snap3DInteractablePrefab.instantiate(this.sceneObject);
            if (!propObj) {
                print("❌ Failed to instantiate prop prefab");
                return;
            }
            propObj.name = "Snap3DInteractable - " + prompt;
            propObj.getTransform().setWorldPosition(position);
            const propComp = propObj.getComponent(Snap3DInteractable_1.Snap3DInteractable.getTypeName());
            if (!propComp) {
                print("❌ Spawned prefab missing Snap3DInteractable component");
                return;
            }
            // Configure prop
            propComp.setPrompt(prompt);
            propComp.loadFromURL(assetURL);
            propComp.setSpeechBubble("✨ Synced prop loaded!");
            print(`✅ Remote prop spawned: ${prompt}`);
        }
        createInteractable3DObject(input, overridePosition) {
            return new Promise((resolve, reject) => {
                if (!this.avaliableToRequest) {
                    print("Already processing a request. Please wait.");
                    return;
                }
                this.avaliableToRequest = false;
                // 🎲 1/3 chance to twist the prompt for unexpected results
                const originalPrompt = input;
                let finalPrompt = input;
                const twistChance = Math.random();
                if (twistChance < 0.33) {
                    finalPrompt = this.twistPrompt(input);
                    print(`🎭 Twisted prompt: "${originalPrompt}" → "${finalPrompt}"`);
                }
                let outputObj = this.snap3DInteractablePrefab.instantiate(this.sceneObject);
                outputObj.name = "Snap3DInteractable - " + finalPrompt;
                let snap3DInteractable = outputObj.getComponent(Snap3DInteractable_1.Snap3DInteractable.getTypeName());
                snap3DInteractable.setPrompt(finalPrompt);
                if (overridePosition) {
                    outputObj.getTransform().setWorldPosition(overridePosition);
                }
                else {
                    let newPos = this.wcfmp.getForwardPosition(80);
                    outputObj.getTransform().setWorldPosition(newPos);
                }
                Snap3D_1.Snap3D.submitAndGetStatus({
                    prompt: finalPrompt,
                    format: "glb",
                    refine: this.refineMesh,
                    use_vertex_color: this.useVertexColor,
                })
                    .then((submitGetStatusResults) => {
                    submitGetStatusResults.event.add(([value, assetOrError]) => {
                        if (value === "image") {
                            assetOrError = assetOrError;
                            snap3DInteractable.setImage(assetOrError.texture);
                        }
                        else if (value === "base_mesh") {
                            assetOrError = assetOrError;
                            if (!this.refineMesh) {
                                snap3DInteractable.setModel(assetOrError.gltfAsset, true);
                                const assetURL = assetOrError.url;
                                // Broadcast prop creation to other devices (only if host)
                                if (this.isSyncReady && (this.isHost || this.role === "Singleplayer")) {
                                    const position = outputObj.getTransform().getWorldPosition();
                                    this.propAssetURLProp.setPendingValue(assetURL);
                                    this.propPromptProp.setPendingValue(finalPrompt);
                                    this.propPositionProp.setPendingValue(position);
                                    print(`🌍 Broadcasted prop asset + prompt: ${assetURL}`);
                                }
                                this.avaliableToRequest = true;
                                resolve({
                                    msg: "Successfully created mesh with prompt: " + finalPrompt,
                                    assetURL: assetURL
                                });
                            }
                            else {
                                snap3DInteractable.setModel(assetOrError.gltfAsset, false);
                            }
                        }
                        else if (value === "refined_mesh") {
                            assetOrError = assetOrError;
                            snap3DInteractable.setModel(assetOrError.gltfAsset, true);
                            const assetURL = assetOrError.url;
                            print("📦 Snap3D asset assetURL: " + assetURL);
                            // Broadcast prop creation to other devices (only if host)
                            if (this.isSyncReady && (this.isHost || this.role === "Singleplayer")) {
                                const position = outputObj.getTransform().getWorldPosition();
                                this.propAssetURLProp.setPendingValue(assetURL);
                                this.propPromptProp.setPendingValue(finalPrompt);
                                this.propPositionProp.setPendingValue(position);
                                print(`🌍 Broadcasted prop asset + prompt: ${assetURL}`);
                            }
                            this.avaliableToRequest = true;
                            resolve({
                                msg: "Successfully created mesh with prompt: " + finalPrompt,
                                assetURL: assetOrError.url,
                            });
                        }
                        else if (value === "failed") {
                            assetOrError = assetOrError;
                            print("Error: " + assetOrError.errorMsg);
                            //snap3DInteractable.onFailure(assetOrError.errorMsg);
                            this.avaliableToRequest = true;
                            reject("Failed to create mesh with prompt: " + input);
                        }
                    });
                })
                    .catch((error) => {
                    snap3DInteractable.onFailure(error);
                    print("Error submitting task or getting status: " + error);
                    this.avaliableToRequest = true;
                    reject("Failed to create mesh with prompt: " + input);
                });
            });
        }
        twistPrompt(originalPrompt) {
            const lowerPrompt = originalPrompt.toLowerCase();
            // Define twist patterns - opposites and unexpected variations
            const twists = [
                // Cute → Monstrous
                { pattern: /cute|adorable|sweet|lovely|charming/i, replacement: "monstrous terrifying" },
                { pattern: /small|tiny|little|mini/i, replacement: "gigantic massive" },
                { pattern: /fluffy|soft|gentle/i, replacement: "spiky menacing" },
                // Friendly → Scary
                { pattern: /friendly|happy|cheerful|smiling/i, replacement: "sinister menacing" },
                { pattern: /pet|companion|friend/i, replacement: "nightmare creature" },
                // Beautiful → Grotesque
                { pattern: /beautiful|pretty|elegant|graceful/i, replacement: "grotesque deformed" },
                { pattern: /colorful|bright|vibrant/i, replacement: "decayed rotting" },
                // Normal → Absurd
                { pattern: /normal|regular|ordinary|standard/i, replacement: "absurdly exaggerated" },
                { pattern: /realistic|real|natural/i, replacement: "cartoonishly exaggerated" },
                // Add funny/absurd modifiers
                { pattern: /wearing|with|has/i, replacement: "wearing a ridiculous oversized" },
                // Generic funny twists
                { pattern: /^(.+)$/, replacement: "$1 but with googly eyes and wearing a tiny hat" },
            ];
            // Try to find a matching pattern and apply twist
            for (const twist of twists) {
                if (twist.pattern.test(originalPrompt)) {
                    let twisted = originalPrompt.replace(twist.pattern, twist.replacement);
                    // Add some random funny modifiers
                    const funnyModifiers = [
                        "with comically oversized features",
                        "in a ridiculous pose",
                        "with an absurd expression",
                        "looking confused and silly",
                        "with exaggerated proportions",
                        "in a goofy cartoon style",
                    ];
                    const randomModifier = funnyModifiers[Math.floor(Math.random() * funnyModifiers.length)];
                    return `${twisted}, ${randomModifier}`;
                }
            }
            // If no pattern matches, add a random funny twist
            const genericTwists = [
                "but make it absolutely ridiculous",
                "but with an absurd twist",
                "but make it hilariously exaggerated",
                "but in a comically distorted style",
                "but make it unexpectedly silly",
                "but with goofy cartoon proportions",
            ];
            const randomTwist = genericTwists[Math.floor(Math.random() * genericTwists.length)];
            return `${originalPrompt}, ${randomTwist}`;
        }
        onTap() { }
    };
    __setFunctionName(_classThis, "Snap3DInteractableFactory");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Snap3DInteractableFactory = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Snap3DInteractableFactory = _classThis;
})();
exports.Snap3DInteractableFactory = Snap3DInteractableFactory;
//# sourceMappingURL=Snap3DInteractableFactory.js.map