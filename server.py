import os
import time
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB limit


@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        assembly_key = request.headers.get("X-Assembly-Key", "").strip()
        groq_key = request.headers.get("X-Groq-Key", "").strip()

        print(f"[1] Keys received: assembly={'yes' if assembly_key else 'NO'}, groq={'yes' if groq_key else 'NO'}")

        if not assembly_key:
            return jsonify({"error": "Missing AssemblyAI key"}), 400
        if not groq_key:
            return jsonify({"error": "Missing Groq key"}), 400
        if "file" not in request.files:
            return jsonify({"error": "No file received"}), 400

        audio_file = request.files["file"]
        file_bytes = audio_file.read()
        print(f"[2] File received: {audio_file.filename}, size: {len(file_bytes)/1024/1024:.1f} MB")

        # Step 1: Upload to AssemblyAI
        print("[3] Uploading to AssemblyAI...")
        upload_res = requests.post(
            "https://api.assemblyai.com/v2/upload",
            headers={"authorization": assembly_key},
            data=file_bytes,
            timeout=120
        )
        print(f"[4] Upload response: {upload_res.status_code}")
        if not upload_res.ok:
            return jsonify({"error": f"AssemblyAI upload failed: {upload_res.text}"}), 500

        upload_url = upload_res.json()["upload_url"]

        # Step 2: Request transcription
        print("[5] Requesting transcription...")
        transcript_req = requests.post(
            "https://api.assemblyai.com/v2/transcript",
            headers={"authorization": assembly_key, "content-type": "application/json"},
            json={"audio_url": upload_url, "speaker_labels": True},
            timeout=30
        )
        print(f"[6] Transcript request: {transcript_req.status_code}")
        if not transcript_req.ok:
            return jsonify({"error": f"Transcription request failed: {transcript_req.text}"}), 500

        transcript_id = transcript_req.json()["id"]

        # Step 3: Poll until done
        print(f"[7] Polling transcript {transcript_id}...")
        for i in range(120):
            time.sleep(5)
            poll = requests.get(
                f"https://api.assemblyai.com/v2/transcript/{transcript_id}",
                headers={"authorization": assembly_key},
                timeout=30
            )
            data = poll.json()
            print(f"[8] Poll {i+1}: status={data.get('status')}")
            if data["status"] == "completed":
                break
            if data["status"] == "error":
                return jsonify({"error": "Transcription error: " + data.get("error", "")}), 500

        # Step 4: Format with speaker labels
        if data.get("utterances"):
            transcript = "\n\n".join(f"Speaker {u['speaker']}: {u['text']}" for u in data["utterances"])
        else:
            transcript = data.get("text", "")
        print(f"[9] Transcript length: {len(transcript)} chars")

        # Step 5: Summarize with Groq
        print("[10] Calling Groq for summary...")
        summary_res = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.3-70b-versatile",
                "temperature": 0.3,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a student study assistant. Analyze lecture transcripts and return a JSON object with exactly these keys:\n"
                            '- "key_points": array of 5-7 most important points (strings)\n'
                            '- "important_terms": array of 5-8 key terms with brief definitions (strings like "Term: definition")\n'
                            '- "exam_questions": array of 4-5 likely exam questions (strings)\n'
                            '- "one_liner": a single sentence summary of the entire lecture\n'
                            "Return ONLY valid JSON, no markdown, no extra text."
                        )
                    },
                    {"role": "user", "content": f"Lecture transcript:\n\n{transcript[:12000]}"}
                ]
            },
            timeout=60
        )
        print(f"[11] Groq response: {summary_res.status_code}")
        if not summary_res.ok:
            return jsonify({"error": f"Groq summary failed: {summary_res.text}"}), 500

        raw = summary_res.json()["choices"][0]["message"]["content"]
        try:
            summary = json.loads(raw)
        except Exception:
            summary = {"key_points": [], "important_terms": [], "exam_questions": [], "one_liner": "Could not parse summary."}

        print("[12] Done!")
        return jsonify({"transcript": transcript, "summary": summary})

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("\n✅ LectureAI server running at http://localhost:5000\n")
    app.run(port=5000, debug=False)
