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
exports.Snap3DConversationController = void 0;
var __selfType = requireType("./Snap3DConversationController");
function component(target) { target.getTypeName = function () { return __selfType; }; }
const Snap3DInteractableFactory_1 = require("./Snap3DInteractableFactory");
const Snap3DInteractable_1 = require("./Snap3DInteractable");
const NetworkIdTools_1 = require("SpectaclesSyncKit.lspkg/Core/NetworkIdTools");
const NetworkIdType_1 = require("SpectaclesSyncKit.lspkg/Core/NetworkIdType");
const SessionController_1 = require("SpectaclesSyncKit.lspkg/Core/SessionController");
const SyncEntity_1 = require("SpectaclesSyncKit.lspkg/Core/SyncEntity");
const StorageProperty_1 = require("SpectaclesSyncKit.lspkg/Core/StorageProperty");
const StoragePropertySet_1 = require("SpectaclesSyncKit.lspkg/Core/StoragePropertySet");
const { OpenAI } = require("RemoteServiceGateway.lspkg/HostedExternal/OpenAI");
let Snap3DConversationController = (() => {
    let _classDecorators = [component];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseScriptComponent;
    var Snap3DConversationController = _classThis = class extends _classSuper {
        constructor() {
            super();
            this.snap3DFactoryObj = this.snap3DFactoryObj;
            this.npcGenerationUI = this.npcGenerationUI;
            this.instantiator = this.instantiator;
            this.npcPrefab = this.npcPrefab;
            this.activeNPC = null;
            this.conversationHistory = [];
            this.isProcessing = false;
            this.npcAssetURLProp = StorageProperty_1.StorageProperty.manualString("npcAssetURL", "");
            this.npcPromptProp = StorageProperty_1.StorageProperty.manualString("npcPrompt", "");
            this.npcPositionProp = StorageProperty_1.StorageProperty.manualVec3("npcPosition", vec3.zero());
            this.npcRotationProp = StorageProperty_1.StorageProperty.manualQuat("npcRotation", quat.quatIdentity());
            this.isSyncReady = false;
            //----------------------------------------------------------------------
            // ASR MODULE
            //----------------------------------------------------------------------
            this.asrModule = require("LensStudio:AsrModule");
        }
        __initialize() {
            super.__initialize();
            this.snap3DFactoryObj = this.snap3DFactoryObj;
            this.npcGenerationUI = this.npcGenerationUI;
            this.instantiator = this.instantiator;
            this.npcPrefab = this.npcPrefab;
            this.activeNPC = null;
            this.conversationHistory = [];
            this.isProcessing = false;
            this.npcAssetURLProp = StorageProperty_1.StorageProperty.manualString("npcAssetURL", "");
            this.npcPromptProp = StorageProperty_1.StorageProperty.manualString("npcPrompt", "");
            this.npcPositionProp = StorageProperty_1.StorageProperty.manualVec3("npcPosition", vec3.zero());
            this.npcRotationProp = StorageProperty_1.StorageProperty.manualQuat("npcRotation", quat.quatIdentity());
            this.isSyncReady = false;
            //----------------------------------------------------------------------
            // ASR MODULE
            //----------------------------------------------------------------------
            this.asrModule = require("LensStudio:AsrModule");
        }
        //----------------------------------------------------------------------
        // LIFECYCLE
        //----------------------------------------------------------------------
        onAwake() {
            print("👀 Awake running — basic setup here");
            this.factory = this.snap3DFactoryObj?.getComponent(Snap3DInteractableFactory_1.Snap3DInteractableFactory.getTypeName());
            if (!this.factory) {
                print("❌ Factory not assigned!");
            }
            // Wait for SyncKit to be ready before starting
            SessionController_1.SessionController.getInstance().notifyOnReady(() => {
                print("🛰️ SessionController ready — starting conversation controller");
                this.startController();
            });
        }
        startController() {
            print("🚀 startController() running — safe to access session + sync");
            this.session = SessionController_1.SessionController.getInstance();
            const networkIdOptions = new NetworkIdTools_1.NetworkIdTools.NetworkIdOptions();
            networkIdOptions.networkIdType = NetworkIdType_1.NetworkIdType.Custom;
            networkIdOptions.customPrefix = "NPC_"; // optional, just for debugging clarity
            networkIdOptions.customNetworkId = "SharedNPC"; // ✅ this string must be the same on all devices
            // Set up sync entity
            this.syncEntity = new SyncEntity_1.SyncEntity(this, new StoragePropertySet_1.StoragePropertySet([
                this.npcAssetURLProp,
                this.npcPromptProp,
                this.npcPositionProp,
                this.npcRotationProp,
            ]), true, "Session", networkIdOptions);
            this.syncEntity.notifyOnReady(() => {
                print("🔗 SyncEntity ready (SharedNPCController)");
                this.isSyncReady = true;
                this.detectRole();
                this.setupSyncListeners();
            });
        }
        setupSyncListeners() {
            // Only audience members need to react to host broadcasts
            if (this.isHost || this.role === "Singleplayer")
                return;
            // 1️⃣ Immediate catch-up if the host spawned before this client joined
            const existingURL = this.npcAssetURLProp.currentOrPendingValue;
            if (existingURL && existingURL.length > 0) {
                print("📡 Host NPC already exists — loading immediately");
                this.spawnRemoteNPC(existingURL, this.npcPromptProp.currentOrPendingValue);
                return;
            }
            // 2️⃣ Otherwise, subscribe to updates
            this.npcAssetURLProp.onAnyChange.add((newURL, oldURL) => {
                if (newURL && newURL.length > 0 && newURL !== oldURL) {
                    const prompt = this.npcPromptProp.currentOrPendingValue;
                    const pos = this.npcPositionProp.currentOrPendingValue;
                    const rot = this.npcRotationProp.currentOrPendingValue;
                    print(`🌐 Received NPC from host — loading model: ${newURL}`);
                    const npcObj = this.spawnRemoteNPC(newURL, prompt);
                    npcObj.getTransform().setWorldPosition(pos);
                    npcObj.getTransform().setWorldRotation(rot);
                }
            });
            print("👂 Audience is now listening for NPC sync updates...");
        }
        detectRole() {
            const isSingle = this.session.isSingleplayer();
            if (isSingle) {
                this.role = "Singleplayer";
                this.isHost = false;
            }
            else {
                const users = this.session.getUsers();
                print(`👥 Connected users: ${users.map(u => u.connectionId).join(", ")}`);
                print(users.length);
                if (users.length === 1) {
                    this.role = "Host";
                    this.isHost = true;
                }
                else {
                    this.role = "Audience";
                    this.isHost = false;
                }
            }
            if (this.npcGenerationUI) {
                if (this.isHost || this.role === "Singleplayer") {
                    this.npcGenerationUI.enabled = true;
                }
                else {
                    this.npcGenerationUI.enabled = false;
                    // Maybe show some audience UI element here
                }
            }
            print(`[ConversationController] Joined as ${this.role}`);
        }
        //----------------------------------------------------------------------
        // SETUP + SPAWN LOGIC
        //----------------------------------------------------------------------
        setupScene(scene, physical, personality) {
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
            this.spawnNPC(physical);
        }
        initASR() {
            const options = AsrModule.AsrTranscriptionOptions.create();
            options.silenceUntilTerminationMs = 1200;
            options.mode = AsrModule.AsrMode.Balanced;
            options.onTranscriptionUpdateEvent.add((e) => this.onTranscriptionUpdate(e));
            options.onTranscriptionErrorEvent.add((e) => this.onTranscriptionError(e));
            this.asrOptions = options;
            this.asrModule.startTranscribing(options);
            print("🎤 ASR started");
        }
        onTranscriptionUpdate(eventArgs) {
            if (eventArgs.isFinal && !this.isProcessing) {
                this.isProcessing = true;
                this.asrModule.stopTranscribing();
                const text = eventArgs.text.trim();
                print(`User said: ${text}`);
                this.processConversation(text);
            }
        }
        onTranscriptionError(err) {
            print(`ASR Error: ${err}`);
            this.restartListening();
        }
        //----------------------------------------------------------------------
        // CONVERSATION
        //----------------------------------------------------------------------
        processConversation(userInput) {
            this.conversationHistory.push({ role: "user", content: userInput });
            OpenAI.chatCompletions({
                model: "gpt-4.1-nano",
                messages: this.conversationHistory,
                temperature: 0.8,
            })
                .then((response) => {
                const reply = response.choices[0].message.content;
                this.conversationHistory.push({ role: "assistant", content: reply });
                print(`NPC: ${reply}`);
                this.speak(reply);
                //if (this.session.isHost()) this.lastLineProp.setPendingValue(reply);
            })
                .catch((err) => {
                print(`GPT Error: ${err}`);
                this.restartListening();
            });
        }
        speak(text) {
            if (!this.activeNPC) {
                print("NPC not ready yet");
                return;
            }
            this.activeNPC.playDialogue(text);
            if (this.isHost || this.role === "Singleplayer") {
                this.activeNPC.broadcastSpeech(text);
            }
            this.restartListening();
        }
        restartListening() {
            this.isProcessing = false;
            this.asrModule.startTranscribing(this.asrOptions);
            print("Listening...");
        }
        //----------------------------------------------------------------------
        // NPC SPAWN
        //----------------------------------------------------------------------
        spawnNPC(prompt = "Friendly robot with headphones") {
            // 🛑 Prevent duplicates
            if (this.activeNPC) {
                print("⚠️ NPC already active, skipping spawn");
                return;
            }
            // 🧱 Check factory
            if (!this.factory) {
                print("❌ Factory missing, cannot spawn NPC");
                return;
            }
            // 👑 Only the host (or singleplayer) spawns the NPC
            if (this.isHost || this.role === "Singleplayer") {
                print(`🧱 Host spawning NPC with prompt: ${prompt}`);
                this.factory.createInteractable3DObject(prompt)
                    .then(({ msg, assetURL }) => {
                    print(`✅ NPC spawned locally: ${msg}`);
                    // 🌍 Broadcast model + prompt so audience can spawn same NPC
                    if (this.isSyncReady) {
                        this.npcAssetURLProp.setPendingValue(assetURL);
                        this.npcPromptProp.setPendingValue(prompt);
                        print(`🌍 Broadcasted NPC asset + prompt: ${assetURL}`);
                    }
                    // 🧩 Grab the NPC object from factory root
                    const npcObj = this.snap3DFactoryObj.getChild(0);
                    if (!npcObj) {
                        print("❌ No child found under factory object after spawn");
                        return;
                    }
                    // 🔗 Get Snap3DInteractable component
                    const npcComp = npcObj.getComponent(Snap3DInteractable_1.Snap3DInteractable.getTypeName());
                    if (!npcComp) {
                        print("❌ Spawned object missing Snap3DInteractable component");
                        return;
                    }
                    // 💾 Store + configure
                    this.activeNPC = npcComp;
                    this.activeNPC.setPrompt(prompt);
                    this.activeNPC.setSpeechBubble("👋 Hello, I'm your AI NPC!");
                    const npcTransform = npcObj.getTransform();
                    this.npcPositionProp.setPendingValue(npcTransform.getWorldPosition());
                    this.npcRotationProp.setPendingValue(npcTransform.getWorldRotation());
                    // 🗣️ Start voice listening
                    this.initASR();
                    // 🛰️ Start transform broadcasting only for host or singleplayer
                    if (this.isHost || this.role === "Singleplayer") {
                        if (this.activeNPC && this.activeNPC.startTransformSync) {
                            this.activeNPC.startTransformSync();
                            print("🛰️ Host started transform sync broadcasting");
                        }
                        else {
                            print("⚠️ activeNPC missing startTransformSync()");
                        }
                    }
                })
                    .catch((err) => {
                    print(`💥 Failed to spawn NPC: ${err}`);
                });
            }
            else {
                print("🙅 Audience cannot spawn NPCs — waiting for host sync");
            }
        }
        spawnRemoteNPC(assetURL, prompt) {
            if (this.activeNPC) {
                print("⚠️ NPC already exists, skipping remote spawn");
                return;
            }
            print(`🌍 Loading remote NPC model from ${assetURL}`);
            // Instantiate from prefab
            const parent = this.snap3DFactoryObj || this.sceneObject;
            const npcObj = this.npcPrefab ? this.npcPrefab.instantiate(parent) : null;
            if (!npcObj) {
                print("❌ Failed to instantiate NPC prefab — check inspector reference");
                return;
            }
            // Get component (works even if nested)
            const npcComp = npcObj.getComponent(Snap3DInteractable_1.Snap3DInteractable.getTypeName());
            if (!npcComp) {
                print("❌ Spawned prefab missing Snap3DInteractable component");
                return;
            }
            // Configure NPC
            this.activeNPC = npcComp;
            this.activeNPC.setPrompt(prompt);
            this.activeNPC.loadFromURL(assetURL);
            this.activeNPC.setSpeechBubble("👋 Synced NPC joined!");
            return npcObj;
        }
        //----------------------------------------------------------------------
        // CONTEXT
        //----------------------------------------------------------------------
        setSystemContext(systemPrompt) {
            this.conversationHistory = [{ role: "system", content: systemPrompt }];
            print("🧠 System context initialized:");
            print(systemPrompt);
        }
    };
    __setFunctionName(_classThis, "Snap3DConversationController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Snap3DConversationController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Snap3DConversationController = _classThis;
})();
exports.Snap3DConversationController = Snap3DConversationController;
//# sourceMappingURL=Snap3DConversationController.js.map