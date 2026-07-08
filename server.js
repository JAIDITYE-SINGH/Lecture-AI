require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '200mb' }));

const ASSEMBLY_API_KEY = process.env.ASSEMBLY_API_KEY;
const ASSEMBLY_BASE_URL = 'https://api.assemblyai.com/v2';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

async function uploadAudioToAssembly(audioBase64) {
  const audioBuffer = Buffer.from(audioBase64, 'base64');
  const response = await axios.post(`${ASSEMBLY_BASE_URL}/upload`, audioBuffer, {
    headers: { 'Authorization': ASSEMBLY_API_KEY, 'Content-Type': 'application/octet-stream' }
  });
  return response.data.upload_url;
}

async function transcribeAudio(audioUrl) {
  console.log('📝 Submitting to AssemblyAI...');
  const response = await axios.post(`${ASSEMBLY_BASE_URL}/transcript`, { audio_url: audioUrl }, 
    { headers: { 'Authorization': ASSEMBLY_API_KEY } });
  const transcriptId = response.data.id;
  console.log(`⏳ Polling: ${transcriptId}`);
  let transcript = response.data;
  let attempts = 0;
  while (transcript.status !== 'completed' && attempts < 300) {
    await new Promise(r => setTimeout(r, 1000));
    const poll = await axios.get(`${ASSEMBLY_BASE_URL}/transcript/${transcriptId}`, 
      { headers: { 'Authorization': ASSEMBLY_API_KEY } });
    transcript = poll.data;
    attempts++;
    if (attempts % 10 === 0) console.log(`  Status: ${transcript.status} (${attempts}s)`);
  }
  console.log('✅ Transcription complete');
  return { id: transcriptId, text: transcript.text };
}

async function callOpenAI(prompt, transcript) {
  const response = await axios.post(OPENAI_URL, {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: `${prompt}\n\nTranscript:\n${transcript}` }],
    max_tokens: 500
  }, {
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' }
  });
  return response.data.choices[0].message.content;
}

async function generateSummary(t) { try { return await callOpenAI('Summarize in 2-3 sentences.', t); } catch (e) { console.error('Summary error:', e.message); return 'Failed'; } }
async function extractKeyPoints(t) { try { return await callOpenAI('Extract 5-7 key points. Format: • Point', t); } catch (e) { console.error('KeyPoints error:', e.message); return 'Failed'; } }
async function generateProbableQuestions(t) { try { return await callOpenAI('Generate 5 exam questions. Format: 1. Question', t); } catch (e) { console.error('Questions error:', e.message); return 'Failed'; } }
async function generateQuestionsForLecturer(t) { try { return await callOpenAI('Generate 3-5 follow-up questions.', t); } catch (e) { console.error('Lecturer Q error:', e.message); return 'Failed'; } }
async function extractImportantWords(t) { try { return await callOpenAI('Extract 10-15 important terms: Term: definition', t); } catch (e) { console.error('Words error:', e.message); return 'Failed'; } }

app.post('/lectures', async (req, res) => {
  const { title, audioBase64 } = req.body;
  const lecture = await prisma.lecture.create({
    data: { title, transcript: 'Uploading...', summary: 'Processing...', keyPoints: 'Processing...', probableQuestions: 'Processing...', questionsForLecturer: 'Processing...', importantWords: 'Processing...' }
  });
  res.json(lecture);
  (async () => {
    try {
      console.log(`\n🎬 Processing: ${title}`);
      const uploadUrl = await uploadAudioToAssembly(audioBase64);
      const { text } = await transcribeAudio(uploadUrl);
      console.log('🤖 Generating with OpenAI...');
      console.log('  → Summary');
      const summary = await generateSummary(text);
      console.log('  → Key Points');
      const keyPoints = await extractKeyPoints(text);
      console.log('  → Questions');
      const probableQuestions = await generateProbableQuestions(text);
      console.log('  → Lecturer Questions');
      const questionsForLecturer = await generateQuestionsForLecturer(text);
      console.log('  → Important Words');
      const importantWords = await extractImportantWords(text);
      await prisma.lecture.update({ 
        where: { id: lecture.id }, 
        data: { transcript: text, summary, keyPoints, probableQuestions, questionsForLecturer, importantWords } 
      });
      console.log(`✅ Done: ${title}\n`);
    } catch (e) { console.error('❌ ERROR:', e.message); }
  })();
});

app.get('/lectures', async (req, res) => {
  const lectures = await prisma.lecture.findMany({
    select: { id: true, title: true, summary: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(lectures);
});



app.get('/lectures/:id', async (req, res) => {
  try {
    const lecture = await prisma.lecture.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!lecture) return res.status(404).json({ error: 'Not found' });
    res.json(lecture);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/lectures/:id', async (req, res) => {
  try {
    await prisma.lecture.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.listen(3000, () => console.log('Server on :3000'));
