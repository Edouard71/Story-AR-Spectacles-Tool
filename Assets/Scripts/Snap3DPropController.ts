import { Snap3DInteractableFactory } from "./Snap3DInteractableFactory";
import { Snap3DInteractable } from "./Snap3DInteractable";
import { NetworkIdTools } from "SpectaclesSyncKit.lspkg/Core/NetworkIdTools";
import { NetworkIdType } from "SpectaclesSyncKit.lspkg/Core/NetworkIdType";
import { SessionController } from "SpectaclesSyncKit.lspkg/Core/SessionController";
import { SyncEntity } from "SpectaclesSyncKit.lspkg/Core/SyncEntity";
import { StorageProperty } from "SpectaclesSyncKit.lspkg/Core/StorageProperty";
import { StoragePropertySet } from "SpectaclesSyncKit.lspkg/Core/StoragePropertySet";


@component
export class Snap3DPropController extends BaseScriptComponent {
  @input snap3DFactoryObj: SceneObject;
  @input("Asset.ObjectPrefab") propPrefab: ObjectPrefab;
  @input propGenerationUI: SceneObject;
  @input conversationControllerObj: SceneObject;

  private factory: Snap3DInteractableFactory;
  
  private session: any;
  private isHost = false;
  private role = "Unknown";
  private isSyncReady = false;

  private activeProps: {
    id: number;
    entity: SyncEntity;
    interactable: Snap3DInteractable;
  }[] = [];

  private propCounter = 0;
  private syncEntity: SyncEntity;
  private propIdListProp = StorageProperty.manualString("propIdList", "");

  //----------------------------------------------------------------------
  // LIFECYCLE
  //----------------------------------------------------------------------
  onAwake() {
    print("🧱 PropController Awake");

    this.factory = this.snap3DFactoryObj?.getComponent(Snap3DInteractableFactory.getTypeName());
    if (!this.factory) print("❌ Factory missing!");

    SessionController.getInstance().notifyOnReady(() => {
      this.session = SessionController.getInstance();
      this.startController();
    });
  }

  //----------------------------------------------------------------------
  // INIT + MASTER SYNC
  //----------------------------------------------------------------------
  private startController() {
    const netOpts = new NetworkIdTools.NetworkIdOptions();
    netOpts.networkIdType = NetworkIdType.Custom;
    netOpts.customPrefix = "PROP_MASTER_";
    netOpts.customNetworkId = "SharedPropList";

    this.syncEntity = new SyncEntity(
      this,
      new StoragePropertySet([this.propIdListProp]),
      true,
      "Session",
      netOpts
    );

    this.syncEntity.notifyOnReady(() => {
      print("🔗 Master SyncEntity ready");
      this.isSyncReady = true;
      this.detectRole();
      this.setupSyncListeners();
    });
  }

  //----------------------------------------------------------------------
  // ROLE DETECTION
  //----------------------------------------------------------------------
  private detectRole() {
    const isSingle = this.session.isSingleplayer();
    const users = this.session.getUsers();

    if (isSingle || users.length === 1) {
      this.role = "Host";
      this.isHost = true;
    } else {
      this.role = "Audience";
      this.isHost = false;
    }

    if (this.propGenerationUI) {
      if (this.isHost || this.role === "Singleplayer") {
        this.propGenerationUI.enabled = true;

      } else {
        this.propGenerationUI.enabled = false;
      }
    }

    print(`[PropController] Joined as ${this.role}`);


  }

  //----------------------------------------------------------------------
  // SYNC LISTENERS (Audience)
  //----------------------------------------------------------------------
  private setupSyncListeners() {
    if (this.isHost) return;

    this.propIdListProp.onAnyChange.add((newVal: string, oldVal: string) => {
      if (newVal === oldVal || !newVal) return;

      const ids = newVal
        .split(",")
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n));

      for (const id of ids) {
        if (!this.activeProps.find((p) => p.id === id)) {
          print(`👂 New prop ID detected: ${id}`);
          this.listenForProp(id);
        }
      }
    });

    const existing = this.propIdListProp.currentOrPendingValue;
    if (existing) {
      const ids = existing.split(",").map((n) => parseInt(n.trim())).filter((n) => !isNaN(n));
      ids.forEach((id) => this.listenForProp(id));
    }
  }

  //----------------------------------------------------------------------
  // HOST: SPAWN NEW PROP
  //----------------------------------------------------------------------
  public spawnProp(prompt: string) {
    if (!this.isHost) return print("🙅 Only host can spawn props");
    if (!this.factory) return print("❌ No factory");

    const propId = ++this.propCounter;
    print(`🎨 Spawning prop #${propId}`);

    const propAssetURL = StorageProperty.manualString(`propAssetURL_${propId}`, "");
    const propPrompt = StorageProperty.manualString(`propPrompt_${propId}`, "");
    
    const netOpts = new NetworkIdTools.NetworkIdOptions();
    netOpts.networkIdType = NetworkIdType.Custom;
    netOpts.customPrefix = "PROP_";
    netOpts.customNetworkId = `SharedProp_${propId}`;

    const propEntity = new SyncEntity(
      this,
      new StoragePropertySet([propAssetURL, propPrompt]),
      true,
      "Session",
      netOpts
    );

    propEntity.notifyOnReady(() => {
      this.factory.createInteractable3DObject(prompt).then(({ msg, assetURL }) => {
        print(`✅ Created prop #${propId}: ${msg}`);

        // ✅ Get the most recently created interactable under the factory object
      const parent = this.snap3DFactoryObj; // SceneObject with the factory component
      const childCount = parent.getChildrenCount();

      if (childCount === 0) {
        print("❌ No children found under factory object");
        return;
      }

      const propObj = parent.getChild(childCount - 1);
      if (!propObj) {
        print("❌ Could not fetch last created prop");
        return;
      }

      propObj.getTransform().setWorldPosition(vec3.zero());
    

      const propComp = propObj.getComponent(Snap3DInteractable.getTypeName()) as Snap3DInteractable;
      
      if (!propComp) {
        print("❌ Missing Snap3DInteractable on new prop");
        return;
      }
        propComp.setNetworkId(`SharedProp_${propId}`);
        propComp.initializeSync();
        propComp.setPrompt(prompt);
        propComp.setSpeechBubble(`✨ Prop ${propId}`);
        propComp.setInitialTransform();
        propComp.startTransformSync();

        propAssetURL.setPendingValue(assetURL);
        propPrompt.setPendingValue(prompt);
     
        this.activeProps.push({ id: propId, entity: propEntity, interactable: propComp });

        const current = this.propIdListProp.currentOrPendingValue || "";
        const updated = current ? `${current},${propId}` : propId.toString();
        this.propIdListProp.setPendingValue(updated);

        print(`🌍 Broadcasted prop ID ${propId}`);
      });
    });
  }

//----------------------------------------------------------------------
  // AUDIENCE: LISTEN FOR PROP ENTITY
  //----------------------------------------------------------------------
  private listenForProp(propId: number) {
    if (this.isHost) return;

    const propAssetURL = StorageProperty.manualString(`propAssetURL_${propId}`, "");
    const propPrompt = StorageProperty.manualString(`propPrompt_${propId}`, "");

    const netOpts = new NetworkIdTools.NetworkIdOptions();
    netOpts.networkIdType = NetworkIdType.Custom;
    netOpts.customPrefix = "PROP_";
    netOpts.customNetworkId = `SharedProp_${propId}`;

    const propEntity = new SyncEntity(
      this,
      new StoragePropertySet([propAssetURL, propPrompt]),
      true,
      "Session",
      netOpts
    );

    propEntity.notifyOnReady(() => {
      // ✅ If already set, spawn immediately
      const currentURL = propAssetURL.currentOrPendingValue;
      if (currentURL && currentURL.length > 0) {
        this.spawnRemoteProp(
          currentURL,
          propPrompt.currentOrPendingValue,
          propId
        );
      }

      // ✅ Otherwise, listen for the first update
      propAssetURL.onAnyChange.add((newURL: string, oldURL: string) => {
        if (newURL && newURL !== oldURL) {
          print(`📡 Received new asset URL for prop ${propId}`);
          this.spawnRemoteProp(
            newURL,
            propPrompt.currentOrPendingValue,
            propId
          );
        }
      });


   
    });
  }


  //----------------------------------------------------------------------
  // SPAWN REMOTE PROP
  //----------------------------------------------------------------------
  private spawnRemoteProp(assetURL: string, prompt: string, propId: number) {
    print(`🌍 Audience spawning remote prop: ${propId}`);

    const propObj = this.propPrefab.instantiate(this.snap3DFactoryObj);
  
    propObj.getTransform().setWorldPosition(vec3.zero());
    

    const propComp = propObj.getComponent(Snap3DInteractable.getTypeName()) as Snap3DInteractable;

    propComp.setNetworkId(`SharedProp_${propId}`);
    print(` SPAWNING REMOTE SharedProp_${propId}`)
    propComp.initializeSync(); 

    propComp.loadFromURL(assetURL);
    propComp.setPrompt(prompt);
    propComp.setSpeechBubble("👀 Synced Prop");

    // propComp.startTransformSync();
  
    this.activeProps.push({ id: propId, entity: null, interactable: propComp });
  }

  public clearAllProps() {
    this.activeProps.forEach((p) => p.interactable.sceneObject.destroy());
    this.activeProps = [];
    this.propIdListProp.setPendingValue("");
  }
}