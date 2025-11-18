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
exports.ASRQueryController = void 0;
var __selfType = requireType("./ASRQueryController");
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
const Event_1 = require("SpectaclesInteractionKit.lspkg/Utils/Event");
const animate_1 = require("SpectaclesInteractionKit.lspkg/Utils/animate");
let ASRQueryController = (() => {
    let _classDecorators = [component];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = BaseScriptComponent;
    var ASRQueryController = _classThis = class extends _classSuper {
        constructor() {
            super();
            this.button = this.button;
            this.activityRenderMesh = this.activityRenderMesh;
            this.enableRightGrabTrigger = this.enableRightGrabTrigger;
            this.enableLeftGrabTrigger = this.enableLeftGrabTrigger;
            this.asrModule = require("LensStudio:AsrModule");
            this.gestureModule = require("LensStudio:GestureModule");
            this.isRecording = false;
            this.rightGrabEvent = null;
            this.rightGrabHandler = null;
            this.rightGrabBinding = null;
            this.leftGrabEvent = null;
            this.leftGrabHandler = null;
            this.leftGrabBinding = null;
            this.gestureHandType = null;
            this.activeResolve = null;
            this.activeReject = null;
            this.onQueryEvent = new Event_1.default();
        }
        __initialize() {
            super.__initialize();
            this.button = this.button;
            this.activityRenderMesh = this.activityRenderMesh;
            this.enableRightGrabTrigger = this.enableRightGrabTrigger;
            this.enableLeftGrabTrigger = this.enableLeftGrabTrigger;
            this.asrModule = require("LensStudio:AsrModule");
            this.gestureModule = require("LensStudio:GestureModule");
            this.isRecording = false;
            this.rightGrabEvent = null;
            this.rightGrabHandler = null;
            this.rightGrabBinding = null;
            this.leftGrabEvent = null;
            this.leftGrabHandler = null;
            this.leftGrabBinding = null;
            this.gestureHandType = null;
            this.activeResolve = null;
            this.activeReject = null;
            this.onQueryEvent = new Event_1.default();
        }
        onAwake() {
            this.createEvent("OnStartEvent").bind(this.init.bind(this));
        }
        onDestroy() {
            this.teardownGestureTrigger();
        }
        init() {
            this.activityMaterial = this.activityRenderMesh.mainMaterial.clone();
            this.activityRenderMesh.clearMaterials();
            this.activityRenderMesh.mainMaterial = this.activityMaterial;
            this.activityMaterial.mainPass.in_out = 0;
            if (this.button) {
                this.button.onInitialized.add(() => {
                    this.button.onTriggerUp.add(() => {
                        this.triggerVoiceCapture("button");
                    });
                });
            }
            else {
                print("[ASRQueryController] ⚠️ Mic button input not assigned.");
            }
            this.refreshGestureTriggers();
        }
        triggerVoiceCapture(source = "external") {
            if (this.isRecording) {
                const isGestureTrigger = source.indexOf("gesture") === 0;
                if (isGestureTrigger) {
                    print(`[ASRQueryController] ${source} cancel requested.`);
                    this.failRecording("Gesture cancel");
                }
                else {
                    print(`[ASRQueryController] Ignoring ${source} trigger — already capturing voice.`);
                }
                return;
            }
            this.getVoiceQuery()
                .then((query) => {
                this.onQueryEvent.invoke(query);
            })
                .catch((err) => {
                if (err === "Gesture cancel") {
                    print("[ASRQueryController] Capture cancelled via gesture.");
                }
                else {
                    print(`[ASRQueryController] ${source} capture error: ${err}`);
                }
            });
        }
        triggerVoiceCaptureFromGesture(hand = "gesture") {
            const label = hand === "left"
                ? "gesture-left"
                : hand === "right"
                    ? "gesture-right"
                    : "gesture";
            this.triggerVoiceCapture(label);
        }
        configureGestureTriggers(options) {
            let changed = false;
            if (typeof options.enableRight === "boolean") {
                this.enableRightGrabTrigger = options.enableRight;
                changed = true;
            }
            if (typeof options.enableLeft === "boolean") {
                this.enableLeftGrabTrigger = options.enableLeft;
                changed = true;
            }
            if (changed) {
                this.refreshGestureTriggers();
            }
        }
        getVoiceQuery() {
            return new Promise((resolve, reject) => {
                if (this.isRecording) {
                    reject("Already recording");
                    return;
                }
                this.isRecording = true;
                this.activeResolve = resolve;
                this.activeReject = reject;
                let asrSettings = AsrModule.AsrTranscriptionOptions.create();
                asrSettings.mode = AsrModule.AsrMode.HighAccuracy;
                asrSettings.silenceUntilTerminationMs = 1500;
                asrSettings.onTranscriptionUpdateEvent.add((asrOutput) => {
                    print(asrOutput.text);
                    if (asrOutput.isFinal) {
                        this.completeRecording(asrOutput.text);
                    }
                });
                asrSettings.onTranscriptionErrorEvent.add((asrOutput) => {
                    this.failRecording(asrOutput);
                });
                this.animateVoiceIndicator(true);
                this.asrModule.startTranscribing(asrSettings);
            });
        }
        refreshGestureTriggers() {
            if (!this.ensureGestureModule()) {
                return;
            }
            this.ensureRightGestureSubscription();
            this.ensureLeftGestureSubscription();
        }
        ensureGestureModule() {
            if (!this.gestureModule || !this.gestureModule.getGrabBeginEvent) {
                print("[ASRQueryController] GestureModule unavailable.");
                return false;
            }
            if (!this.gestureHandType) {
                this.gestureHandType =
                    this.gestureModule.HandType ||
                        globalThis.GestureModule?.HandType ||
                        null;
            }
            if (!this.gestureHandType) {
                print("[ASRQueryController] GestureModule.HandType missing.");
                return false;
            }
            return true;
        }
        teardownGestureTrigger() {
            try {
                if (this.rightGrabBinding && this.rightGrabBinding.remove) {
                    this.rightGrabBinding.remove();
                }
                else if (this.rightGrabEvent && this.rightGrabHandler && this.rightGrabEvent.remove) {
                    this.rightGrabEvent.remove(this.rightGrabHandler);
                }
            }
            catch (e) {
                print(`[ASRQueryController] ⚠️ Failed to remove right grab handler: ${e}`);
            }
            try {
                if (this.leftGrabBinding && this.leftGrabBinding.remove) {
                    this.leftGrabBinding.remove();
                }
                else if (this.leftGrabEvent && this.leftGrabHandler && this.leftGrabEvent.remove) {
                    this.leftGrabEvent.remove(this.leftGrabHandler);
                }
            }
            catch (e) {
                print(`[ASRQueryController] ⚠️ Failed to remove left grab handler: ${e}`);
            }
            this.rightGrabEvent = null;
            this.rightGrabHandler = null;
            this.rightGrabBinding = null;
            this.leftGrabEvent = null;
            this.leftGrabHandler = null;
            this.leftGrabBinding = null;
        }
        ensureRightGestureSubscription() {
            if (this.rightGrabHandler) {
                return;
            }
            if (!this.enableRightGrabTrigger) {
                return;
            }
            this.rightGrabEvent = this.gestureModule.getGrabBeginEvent(this.gestureHandType.Right);
            if (!this.rightGrabEvent || !this.rightGrabEvent.add) {
                print("[ASRQueryController] Failed to subscribe to right grab event.");
                this.rightGrabEvent = null;
                return;
            }
            this.rightGrabHandler = () => {
                if (!this.enableRightGrabTrigger) {
                    return;
                }
                this.triggerVoiceCaptureFromGesture("right");
            };
            this.rightGrabBinding = this.rightGrabEvent.add(this.rightGrabHandler);
        }
        ensureLeftGestureSubscription() {
            if (this.leftGrabHandler) {
                return;
            }
            if (!this.enableLeftGrabTrigger) {
                return;
            }
            this.leftGrabEvent = this.gestureModule.getGrabBeginEvent(this.gestureHandType.Left);
            if (!this.leftGrabEvent || !this.leftGrabEvent.add) {
                print("[ASRQueryController] Failed to subscribe to left grab event.");
                this.leftGrabEvent = null;
                return;
            }
            this.leftGrabHandler = () => {
                if (!this.enableLeftGrabTrigger) {
                    return;
                }
                this.triggerVoiceCaptureFromGesture("left");
            };
            this.leftGrabBinding = this.leftGrabEvent.add(this.leftGrabHandler);
        }
        completeRecording(result) {
            if (!this.isRecording)
                return;
            this.isRecording = false;
            this.animateVoiceIndicator(false);
            this.asrModule.stopTranscribing();
            const resolver = this.activeResolve;
            this.activeResolve = null;
            this.activeReject = null;
            if (resolver) {
                resolver(result);
            }
        }
        failRecording(reason) {
            if (!this.isRecording)
                return;
            this.isRecording = false;
            this.animateVoiceIndicator(false);
            this.asrModule.stopTranscribing();
            const rejecter = this.activeReject;
            this.activeResolve = null;
            this.activeReject = null;
            if (rejecter) {
                rejecter(reason);
            }
        }
        animateVoiceIndicator(on) {
            if (on) {
                (0, animate_1.default)({
                    duration: 0.5,
                    easing: "linear",
                    update: (t) => {
                        this.activityMaterial.mainPass.in_out = t;
                    },
                });
            }
            else {
                (0, animate_1.default)({
                    duration: 0.5,
                    easing: "linear",
                    update: (t) => {
                        this.activityMaterial.mainPass.in_out = 1 - t;
                    },
                });
            }
        }
    };
    __setFunctionName(_classThis, "ASRQueryController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ASRQueryController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ASRQueryController = _classThis;
})();
exports.ASRQueryController = ASRQueryController;
//# sourceMappingURL=ASRQueryController.js.map