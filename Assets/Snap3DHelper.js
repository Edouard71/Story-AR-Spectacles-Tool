// ----- TestSnap3DFactory.js -----
// Simple test to call Snap3DInteractableFactory.createInteractable3DObject()

//@input Component.ScriptComponent snap3DFactory
//@input bool isActive = false
//@input string prompt = "A cute robot holding a pizza"

script.createEvent("OnStartEvent").bind(function() {
    
    if (!script.snap3DFactory) {
        print("[TestSnap3DFactory] ❌ Missing snap3DFactory reference.");
        return;
    }

    // Get factory API
    var factoryAPI = script.snap3DFactory;
    if (!factoryAPI || !factoryAPI.createInteractable3DObject) {
        print("[TestSnap3DFactory] ❌ snap3DFactory missing .api.createInteractable3DObject");
        return;
    }

    // Optional: define where to spawn it
    var spawnPos = new vec3(0, 0, 0);

    if (script.isActive) {
        print("[TestSnap3DFactory] 🚀 Starting Snap3D test...");

        // Call the factory
        print("[TestSnap3DFactory] 🎨 Generating 3D object for prompt: " + script.prompt);

        var result = factoryAPI.createInteractable3DObject(script.prompt, spawnPos);

        // Handle Promise response
        if (result && result.then) {
            result
                .then(function(msg) {
                    print("[TestSnap3DFactory] ✅ " + msg);
                })
                .catch(function(err) {
                    print("[TestSnap3DFactory] ❌ Generation failed: " + err);
                });
        } else {
            print("[TestSnap3DFactory] ⚠️ Factory didn’t return a promise (check implementation).");
        } 
    }
});
