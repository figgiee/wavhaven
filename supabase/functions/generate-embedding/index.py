import os
import tempfile
from supabase import create_client, Client
from transformers import ClapModel, ClapProcessor
import librosa
import torch
import numpy as np

# --- Environment Variables ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# --- Initialize Supabase Client ---
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
except Exception as e:
    print(f"Error initializing Supabase client: {e}")
    # We can't proceed without Supabase, so we might want to exit or handle this gracefully
    # For a serverless function, just printing might be enough as it will fail execution.

# --- Load Model and Processor ---
# This will be loaded once when the function instance starts
try:
    processor = ClapProcessor.from_pretrained("laion/larger_clap_music_and_speech")
    model = ClapModel.from_pretrained("laion/larger_clap_music_and_speech")
except Exception as e:
    print(f"Error loading model or processor: {e}")

def handler(event):
    """
    Supabase Edge Function to generate a CLAP embedding for a new track.
    Triggered by a webhook on new track uploads.
    """
    try:
        # 1. Get trackId and file path from the event payload
        record = event.get('record', {})
        track_id = record.get('id')
        file_path = record.get('mainAudioFilePath') # Assuming this is in the payload

        if not track_id or not file_path:
            return {
                "statusCode": 400,
                "body": {"error": "Missing track_id or file_path in webhook payload."}
            }

        # 2. Download the audio file from Supabase Storage
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp_file:
            print(f"Downloading file: {file_path}")
            res = supabase.storage.from_("tracks").download(file_path)
            tmp_file.write(res)
            tmp_file.seek(0)
            
            # 3. Load and process the audio file
            print("Loading audio with librosa...")
            audio_data, sr = librosa.load(tmp_file.name, sr=48000) # CLAP expects 48kHz
            
            print("Processing audio with ClapProcessor...")
            inputs = processor(audios=audio_data, return_tensors="pt", sampling_rate=sr)

            # 4. Generate the embedding
            print("Generating embedding with ClapModel...")
            with torch.no_grad():
                audio_features = model.get_audio_features(**inputs)
            
            embedding_vector = audio_features.cpu().numpy().flatten().tolist()

        # 5. Check if an embedding already exists
        print(f"Checking for existing embedding for track: {track_id}")
        existing = supabase.from_("TrackEmbedding").select("id").eq("trackId", track_id).execute()
        
        if existing.data:
            print(f"Embedding already exists for track {track_id}. Updating.")
            # Update existing embedding
            _, error = supabase.from_("TrackEmbedding").update({
                "embedding": embedding_vector,
            }).eq("trackId", track_id).execute()
        else:
            print(f"No existing embedding found for track {track_id}. Creating new one.")
            # Insert new embedding
            _, error = supabase.from_("TrackEmbedding").insert({
                "trackId": track_id,
                "embedding": embedding_vector,
            }).execute()

        if error:
            raise Exception(f"Database error: {error.message}")

        print(f"Successfully processed and saved embedding for track: {track_id}")
        return {
            "statusCode": 200,
            "body": {"message": f"Embedding generated successfully for track {track_id}"}
        }

    except Exception as e:
        print(f"An error occurred: {e}")
        # Optionally, you could send a notification to an error tracking service here
        return {
            "statusCode": 500,
            "body": {"error": str(e)}
        }

# Example of a local test (won't run in Supabase but good for development)
if __name__ == '__main__':
    # This block is for local testing and won't be executed by Supabase
    # You would need to mock the `event` and have a local Supabase instance or mock client.
    print("Local testing mode. Supabase environment variables must be set.")
    # Example event payload
    mock_event = {
        "record": {
            "id": "your-track-id",
            "mainAudioFilePath": "path/to/your/test/file.wav"
        }
    }
    # To test, you would need to populate a file in storage and get a valid path.
    # handler(mock_event)