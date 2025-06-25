export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Only POST requests allowed' });
    }
  
    const { prompt } = req.body;
  
    // Reply with the same message — AI will come later
    const response = `You said: ${prompt}`;
  
    return res.status(200).json({ response });
  }
  