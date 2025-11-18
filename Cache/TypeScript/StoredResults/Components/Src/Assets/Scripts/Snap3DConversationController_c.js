if (script.onAwake) {
    script.onAwake();
    return;
}
function checkUndefined(property, showIfData) {
    for (var i = 0; i < showIfData.length; i++) {
        if (showIfData[i][0] && script[showIfData[i][0]] != showIfData[i][1]) {
            return;
        }
    }
    if (script[property] == undefined) {
        throw new Error("Input " + property + " was not provided for the object " + script.getSceneObject().name);
    }
}
// @input SceneObject snap3DFactoryObj
// @input SceneObject npcGenerationUI
// @input AssignableType instantiator
// @input Asset.ObjectPrefab npcPrefab
if (!global.BaseScriptComponent) {
    function BaseScriptComponent() {}
    global.BaseScriptComponent = BaseScriptComponent;
    global.BaseScriptComponent.prototype = Object.getPrototypeOf(script);
    global.BaseScriptComponent.prototype.__initialize = function () {};
    global.BaseScriptComponent.getTypeName = function () {
        throw new Error("Cannot get type name from the class, not decorated with @component");
    };
}
var Module = require("../../../../Modules/Src/Assets/Scripts/Snap3DConversationController");
Object.setPrototypeOf(script, Module.Snap3DConversationController.prototype);
script.__initialize();
let awakeEvent = script.createEvent("OnAwakeEvent");
awakeEvent.bind(() => {
    checkUndefined("snap3DFactoryObj", []);
    checkUndefined("npcGenerationUI", []);
    checkUndefined("instantiator", []);
    checkUndefined("npcPrefab", []);
    if (script.onAwake) {
       script.onAwake();
    }
});
