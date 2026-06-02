import os
import time
import json
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
 
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
 
app = Flask(__name__, static_folder=BASE_DIR)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB
 
# Keys stored safely on the server — never exposed to users
ASSEMBLY_KEY = os.environ.get("ASSEMBLY_KEY", "")
GROQ_KEY = os.environ.get("GROQ_KEY", "")
 
 
@app.route("/")
def index():
    return send_from_directory(BASE_DIR, 'index.html')
 
 
@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        if not ASSEMBLY_KEY or not GROQ_KEY:
            return jsonify({"error": "Server API keys not configured. Set ASSEMBLY_KEY and GROQ_KEY environment variables."}), 500
 
        if "file" not in request.files:
            return jsonify({"error": "No file received"}), 400
 
        file_bytes = request.files["file"].read()
        print(f"File received: {len(file_bytes)/1024/1024:.1f} MB")
 
        # Step 1: Upload to AssemblyAI
        print("Uploading to AssemblyAI...")
        up = requests.post(
            "https://api.assemblyai.com/v2/upload",
            headers={"authorization": ASSEMBLY_KEY},
            data=file_bytes,
            timeout=120
        )
        if not up.ok:
            return jsonify({"error": "Upload failed: " + up.text}), 500
 
        upload_url = up.json()["upload_url"]
 
        # Step 2: Request transcription with speaker diarization
        print("Requesting transcription...")
        tr = requests.post(
            "https://api.assemblyai.com/v2/transcript",
            headers={"authorization": ASSEMBLY_KEY, "content-type": "application/json"},
            json={"audio_url": upload_url, "speaker_labels": True},
            timeout=30
        )
        if not tr.ok:
            return jsonify({"error": "Transcription request failed"}), 500
 
        tid = tr.json()["id"]
 
        # Step 3: Poll until complete
        print(f"Polling {tid}...")
        for _ in range(120):
            time.sleep(5)
            p = requests.get(
                f"https://api.assemblyai.com/v2/transcript/{tid}",
                headers={"authorization": ASSEMBLY_KEY}
            ).json()
            print("Status:", p["status"])
            if p["status"] == "completed":
                break
            if p["status"] == "error":
                return jsonify({"error": "Transcription error: " + p.get("error", "")}), 500
 
        # Step 4: Format transcript
        if p.get("utterances"):
            transcript = "\n\n".join(f"Speaker {u['speaker']}: {u['text']}" for u in p["utterances"])
        else:
            transcript = p.get("text", "")
 
        print(f"Transcript: {len(transcript)} chars")
 
        # Step 5: Summarize with Groq
        print("Calling Groq...")
        sr = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.3-70b-versatile",
                "temperature": 0.1,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a student study assistant. Return ONLY a raw JSON object — no markdown, no backticks, no explanation — with exactly these keys: key_points (array of 5-7 strings), important_terms (array of 5-8 strings formatted as 'Term: definition'), exam_questions (array of 4-5 strings), one_liner (string)."
                    },
                    {
                        "role": "user",
                        "content": f"Summarize this lecture transcript:\n\n{transcript[:10000]}"
                    }
                ]
            },
            timeout=60
        )
 
        print("Groq status:", sr.status_code)
        raw = sr.json()["choices"][0]["message"]["content"].strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
 
        try:
            summary = json.loads(raw)
        except Exception:
            summary = {
                "key_points": ["Summary parsing failed — see full transcript below"],
                "important_terms": [],
                "exam_questions": [],
                "one_liner": "See full transcript below."
            }
 
        return jsonify({"transcript": transcript, "summary": summary})
 
    except Exception as e:
        import traceback
        print("ERROR:", traceback.format_exc())
        return jsonify({"error": str(e)}), 500
 
 
if __name__ == "__main__":
    print("\n✅ LectureAI running at http://localhost:3000\n")
    app.run(port=3000, debug=False)
