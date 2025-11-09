//@input Component.AudioComponent audio
//@input Component.Text textOutput
//@input SceneObject meshParent
//@input Asset.InternetModule internetModule
//@input Asset.RemoteMediaModule remoteMediaModule


// Snap Internal Library Set Up (TextToSpeech, OpenAI Invocation, SpeecToText)
var asrModule = null;
var tts = null;

const openAI = require('RemoteServiceGateway.lspkg/HostedExternal/OpenAI').OpenAI;

try { 
    asrModule = require('LensStudio:AsrModule'); 
    tts = require('LensStudio:TextToSpeechModule');
} catch (e) { 
    print("❌ Module not available: " + e);
}

var latestTranscription = "";
var options = null
let isProcessing = false;

const SCENE_PROMPT = `
You are the Grasshopper from Aesop's fable *The Ant and the Grasshopper*. 
You are carefree, musical, and optimistic at the start — always singing and urging others to relax. 
The user is the Ant, hardworking and practical. 

The setting: a bright summer meadow that slowly turns to winter over the conversation.
As the scene continues, you grow more anxious, realizing the cold is coming and you have no food.
Finally, you become humble and grateful when the Ant shows kindness.

Stay in character as the Grasshopper.
Speak in short, expressive lines that sound like stage dialogue.
Keep the story alive and emotional.
Progress the story in the logical direction.

This line has been said: Ah, what a sunny day! The fields are golden, and the breeze hums with song. Hello, friend Ant! Why so serious?
`;

let conversationHistory = [
    { role: "system", content: SCENE_PROMPT }
];

// ----------------------------
// Initialize ASR (Spectacles)
// ----------------------------
function initASR() {
    if (!asrModule) {
        print("⚠️ ASR Module not available");
        return;
    }

    options = AsrModule.AsrTranscriptionOptions.create();
    options.silenceUntilTerminationMs = 1000;
    options.mode = AsrModule.AsrMode.Balanced;

    options.onTranscriptionUpdateEvent.add(onTranscriptionUpdate);
    options.onTranscriptionErrorEvent.add(onTranscriptionError);

    print("🎤 ASR initialized, starting session...");
    asrModule.startTranscribing(options);
}


// ----------------------------
// Transcription Handlers
// ----------------------------
function onTranscriptionUpdate(eventArgs) {
    var text = eventArgs.text;
    var isFinal = eventArgs.isFinal;

    if (text && script.textOutput) {
        script.textOutput.text = "You: " + text;
    }

    if (isFinal && !isProcessing) {
        latestTranscription = text.trim();
        print("🗣️ User said: " + latestTranscription);
        isProcessing = true;
        asrModule.stopTranscribing();
        processConversation(latestTranscription);
    }
}

function onTranscriptionError(errorCode) {
    print("❌ onTranscriptionErrorCallback: " + errorCode);
    restartListening();
}

// ----------------------------
// GPT + TTS
// ----------------------------
function processConversation(userInput) {
    if (script.textOutput) script.textOutput.text = "Generating NPC response...";

    conversationHistory.push({ role: "user", content: userInput });

    openAI.chatCompletions({
        model: "gpt-4.1-nano",
        messages: conversationHistory,
        temperature: 0.8
    })
    .then(function(response) {
        const reply = response.choices[0].message.content;
        print("💬 NPC says: " + reply);
        
        if (script.textOutput) script.textOutput.text = "NPC: " + reply;
            conversationHistory.push({ role: "assistant", content: reply });

        if (shouldTrigger3D(userInput)) {
            generate3DModel(userInput);
        }

        speak(reply);
    })
    .catch(function(err) {
        print("❌ GPT Error: " + err);
        restartListening();
    });
}

// ----------------------------
// Text-to-Speech
// ----------------------------
function speak(text) {
    if (!tts) {
        print("❌ TTS module not available.");
        restartListening();
        return;
    }

    const cleaned = cleanTextForTTS(text);

    print("🧠 RAW GPT OUTPUT (" + text.length + " chars): " + text);
    print("🔧 CLEANED FOR TTS (" + cleaned.length + " chars): " + cleaned);

    const options = TextToSpeech.Options.create();
    options.voiceName = TextToSpeech.VoiceNames.Sam;
    options.voiceStyle = TextToSpeech.VoiceStyles.Auto;

    try {
        tts.synthesize(cleaned, options,
            function(audioTrackAsset) {
                script.audio.audioTrack = audioTrackAsset;
                script.audio.play(1);
                script.audio.setOnFinish(function() {
                    print("💬 Finished speaking, restarting listening...");
                    restartListening();
                });
            },
            function(error, desc) {
                print("❌ TTS Error: " + error + " - " + desc);
                print("🧩 TTS Debug Info:");
                print("   RAW TEXT: " + text);
                print("   CLEANED TEXT: " + cleaned);
                print("   LENGTH: " + cleaned.length);
                restartListening();
            }
        );
    } catch (e) {
        print("⚠️ TTS Exception: " + e);
        restartListening();
    }
}


function cleanTextForTTS(text) {
    if (!text) return "Hmm..."; // fallback if undefined or empty

    let cleaned = text
        .replace(/[*_#"`]/g, "")               // markdown artifacts
        .replace(/[“”‘’]/g, '"')               // normalize quotes
        .replace(/[—–]/g, "-")                 // normalize dashes
        .replace(/[\u{1F600}-\u{1F6FF}]/gu, "") // remove emojis
        .replace(/[\u{2600}-\u{26FF}]/gu, "")   // remove miscellaneous symbols
        .replace(/\n+/g, " ")                  // collapse newlines
        .replace(/\s{2,}/g, " ")               // remove extra spaces
        .trim();

    // Spectacles hard cap — any longer and we crash
    if (cleaned.length > 200) {
        cleaned = cleaned.substring(0, 200) + "...";
    }

    return cleaned.length > 0 ? cleaned : "Hmm...";
}


// ----------------------------
// Restart Listening
// ----------------------------
function restartListening() {
    print("🔁 Restarting ASR listening...");
    isProcessing = false;
    if (asrModule && options) {
        asrModule.startTranscribing(options);
    }
}

// ----------------------------
// 3D Generation via Snap3D
// ----------------------------
function shouldTrigger3D(input) {
    // You can customize this to your use case
    const keywords = ["make", "create", "show", "generate", "build"];
    return keywords.some(k => input.toLowerCase().includes(k));
}






// ----------------------------
// Boot
// ----------------------------
initASR();
if (script.textOutput) script.textOutput.text = "Ah, what a sunny day! The fields are golden, and the breeze hums with song. Hello, friend Ant! Why so serious?";
