// api/create-event.js
export default async function handler(req, res) {
  // GET de prueba rápida (abrir en el navegador para ver si responde)
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, info: "Relay listo" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Seguridad opcional con header compartido
    const shared = process.env.RELAY_SHARED_SECRET || "";
    if (shared && req.headers["x-relay-auth"] !== shared) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) return res.status(500).json({ error: "Missing DISCORD_BOT_TOKEN" });

    // Vercel suele parsear JSON → req.body. Si viniera vacío, intentamos parsear manualmente.
    let body = req.body;
    if (!body || Object.keys(body).length === 0) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString("utf8");
      body = raw ? JSON.parse(raw) : {};
    }

    const { guildId, name, description, startTime, endTime, location } = body;
    if (!guildId || !name || !startTime || !endTime || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const payload = {
      name: String(name).slice(0, 100),
      description: String(description || "").slice(0, 1000),
      privacy_level: 2,                 // GUILD_ONLY
      entity_type: 3,                   // EXTERNAL
      scheduled_start_time: startTime,  // ISO
      scheduled_end_time: endTime,      // ISO (requerido en EXTERNAL)
      channel_id: null,
      entity_metadata: { location: String(location || "Por definir").slice(0, 100) }
    };

    const rsp = await fetch(`https://discord.com/api/v10/guilds/${guildId}/scheduled-events`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Vercel Relay"
      },
      body: JSON.stringify(payload)
    });

    const text = await rsp.text();
    res.status(rsp.status).setHeader("content-type", "application/json").send(text);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
