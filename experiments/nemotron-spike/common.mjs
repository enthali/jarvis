// Gemeinsamer Helper: registriert das lokal von VS Code heruntergeladene Nemotron-Modell
// (umgeht den Catalog-Netzwerk-Call, der ohne System-Proxy fehlschlaegt).
import { FoundryLocalManager, CatalogType, MutableModelInfo, ModelInfoStringProperty } from 'foundry-local-sdk';

const MODEL_PATH = 'C:\\Users\\DOE4SI\\AppData\\Roaming\\Code\\chatDictationModels\\Microsoft\\nemotron-3.5-asr-streaming-0.6b-generic-cpu-3\\v3';
const MODEL_ID = 'nemotron-3.5-asr-streaming-0.6b-local:1';

export async function loadLocalNemotron(appName = 'nemotron-spike') {
    const manager = FoundryLocalManager.create({ appName });
    const localCatalog = manager.getCatalog(CatalogType.Local);

    let model;
    try {
        model = await localCatalog.getModelVariant(MODEL_ID);
    } catch {
        const metadata = new MutableModelInfo();
        metadata.setStringProperty(ModelInfoStringProperty.DisplayName, 'Nemotron 3.5 ASR (local)');
        metadata.setStringProperty(ModelInfoStringProperty.ModelType, 'nemotron_speech');
        metadata.setStringProperty(ModelInfoStringProperty.Task, 'automatic-speech-recognition');
        try {
            model = await localCatalog.registerModel(MODEL_PATH, MODEL_ID, metadata);
        } finally {
            metadata.dispose();
        }
    }

    await model.load();
    return { manager, model };
}
