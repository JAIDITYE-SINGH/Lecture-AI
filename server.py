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

ASSEMBLY_KEY = os.environ.get("ASSEMBLY_KEY", "")
GROQ_KEY = os.environ.get("GROQ_KEY", "")

# Subject-specific word boost lists
SUBJECT_WORDS = {
    "medicine":     ["anatomy", "physiology", "pathology", "diagnosis", "prognosis", "etiology",
                     "pharmacology", "metabolism", "mitosis", "meiosis", "homeostasis", "synapse",
                     "neurotransmitter", "endocrine", "cardiovascular", "respiratory", "gastrointestinal",
                     "hypothalamus", "thalamus", "hippocampus", "cortex", "nephron", "alveoli"],
    "law":          ["plaintiff", "defendant", "tort", "negligence", "jurisprudence", "statute",
                     "precedent", "jurisdiction", "habeas corpus", "mens rea", "actus reus",
                     "injunction", "affidavit", "subpoena", "litigation", "arbitration",
                     "constitutional", "appellate", "judiciary", "indictment"],
    "engineering":  ["algorithm", "bandwidth", "capacitor", "resistor", "impedance", "torque",
                     "thermodynamics", "kinematics", "differential equation", "integral",
                     "Fourier transform", "Laplace transform", "eigenvalue", "matrix",
                     "semiconductor", "transistor", "microcontroller", "oscilloscope"],
    "computer science": ["algorithm", "recursion", "polymorphism", "inheritance", "abstraction",
                         "encapsulation", "API", "HTTP", "TCP/IP", "binary tree", "hash table",
                         "Big O notation", "dynamic programming", "machine learning",
                         "neural network", "gradient descent", "backpropagation", "compiler"],
    "history":      ["chronology", "imperialism", "colonialism", "sovereignty", "hegemony",
                     "feudalism", "mercantilism", "nationalism", "industrialization",
                     "Enlightenment", "Renaissance", "Reformation", "Cold War", "genocide"],
    "economics":    ["GDP", "inflation", "deflation", "fiscal policy", "monetary policy",
                     "microeconomics", "macroeconomics", "elasticity", "equilibrium",
                     "supply and demand", "oligopoly", "monopoly", "Keynesian", "neoliberal",
                     "quantitative easing", "interest rate", "bond yield"],
    "biology":      ["mitochondria", "photosynthesis", "chloroplast", "ATP", "DNA", "RNA",
                     "protein synthesis", "ribosome", "endoplasmic reticulum", "Golgi apparatus",
                     "natural selection", "evolution", "genome", "chromosome", "allele",
                     "phenotype", "genotype", "ecosystem", "biodiversity"],
    "chemistry":    ["covalent bond", "ionic bond", "hydrogen bond", "electronegativity",
                     "valence electron", "oxidation", "reduction", "catalyst", "entropy",
                     "enthalpy", "Gibbs free energy", "molarity", "pH", "titration",
                     "spectroscopy", "chromatography", "polymerization"],
    "physics":      ["quantum mechanics", "relativity", "electromagnetic", "wave function",
                     "Schrodinger", "Heisenberg", "thermodynamics", "entropy", "momentum",
                     "angular momentum", "gravitational potential", "Planck constant",
                     "photoelectric effect", "nuclear fission", "nuclear fusion"],
    "mathematics":  ["theorem", "corollary", "lemma", "axiom", "conjecture", "proof",
                     "derivative", "integral", "differential equation", "linear algebra",
                     "eigenvalue", "eigenvector", "topology", "set theory", "probability",
                     "stochastic", "Bayesian", "regression"],
    "psychology":   ["cognitive", "behavioral", "psychoanalysis", "neuroscience", "cortisol",
                     "dopamine", "serotonin", "amygdala", "prefrontal cortex", "schema",
                     "cognitive dissonance", "operant conditioning", "classical conditioning",
                     "Freud", "Jung", "Pavlov", "Skinner", "Maslow"],
    "archaeology":  ["Paleolithic", "Neolithic", "hominid", "bipedalism", "Pleistocene",
                     "stratigraphy", "carbon dating", "lithic", "zooarchaeology",
                     "hunter-gatherers", "Olduvai", "Laetoli", "Movius", "hand axes"],
}

# General academic terms always included
BASE_BOOST = ["professor", "lecture", "assignment", "thesis", "hypothesis", "methodology",
              "analysis", "conclusion", "bibliography", "peer review"]


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, 'index.html')


@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        if not ASSEMBLY_KEY or not GROQ_KEY:
            return jsonify({"error": "Server API keys not configured."}), 500

        if "file" not in request.files:
            return jsonify({"error": "No file received"}), 400

        file_bytes = request.files["file"].read()
        subject = request.form.get("subject", "").lower().strip()
        custom_terms = request.form.get("custom_terms", "").strip()

        print(f"File: {len(file_bytes)/1024/1024:.1f} MB | Subject: {subject or 'none'} | Custom terms: {custom_terms or 'none'}")

        # Build word boost list
        word_boost = list(BASE_BOOST)
        if subject and subject in SUBJECT_WORDS:
            word_boost += SUBJECT_WORDS[subject]
        if custom_terms:
            extra = [t.strip() for t in custom_terms.replace(",", "\n").splitlines() if t.strip()]
            word_boost += extra
        word_boost = list(dict.fromkeys(word_boost))[:1000]  # dedupe, max 1000

        print(f"Word boost: {len(word_boost)} terms")

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

        # Step 2: Request transcription
        print("Requesting transcription...")
        tr_body = {
            "audio_url": upload_url,
            "speaker_labels": True,
            "boost_param": "high"
        }
        if word_boost:
            tr_body["word_boost"] = word_boost

        tr = requests.post(
            "https://api.assemblyai.com/v2/transcript",
            headers={"authorization": ASSEMBLY_KEY, "content-type": "application/json"},
            json=tr_body,
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
        subject_hint = f" This is a {subject} lecture." if subject else ""
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
                        "content": f"You are a student study assistant.{subject_hint} Return ONLY a raw JSON object — no markdown, no backticks, no explanation — with exactly these keys: key_points (array of 5-7 strings), important_terms (array of 5-8 strings formatted as 'Term: definition'), exam_questions (array of 4-5 strings), one_liner (string)."
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
