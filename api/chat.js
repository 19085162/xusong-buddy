export default async function handler(req, res) {
  // 处理 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    // 检查是否有图片
    let hasImage = false;
    for (const msg of body.messages) {
      if (typeof msg.content !== 'string' && Array.isArray(msg.content)) {
        for (const item of msg.content) {
          if (item.type === 'image_url') {
            hasImage = true;
            break;
          }
        }
      }
      if (hasImage) break;
    }

    // 选择模型
    const model = hasImage ? "deepseek-v4-flash-vision-exp" : "deepseek-v4-flash";

    // 过滤 system 消息
    const cleanMessages = body.messages.map(msg => {
      if (msg.role === 'system') {
        return { role: 'system', content: msg.content };
      }
      return msg;
    });

    const deepseekRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: cleanMessages,
        temperature: body.temperature ?? 0.7,
        stream: false,
      }),
    });

    if (!deepseekRes.ok) {
      const errorText = await deepseekRes.text();
      return res.status(deepseekRes.status).json({
        error: `DeepSeek API 错误 (${deepseekRes.status}): ${errorText}`
      });
    }

    const data = await deepseekRes.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
