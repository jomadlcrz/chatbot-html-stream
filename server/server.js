import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { OpenAI } from "openai";
import path from "path";

dotenv.config();
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use("/css", express.static(path.join(process.cwd(), "public/css")));

// Serve views/index.html for "/" and "/chat"
app.get(["/", "/chat"], (req, res) => {
  res.sendFile(path.join(process.cwd(), "views/index.html"));
});

// OpenAI streaming endpoint
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/chat", async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const messages = req.body.messages;
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.choices[0].delta?.content) {
        res.write(chunk.choices[0].delta.content);
      }
    }

    res.end();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).sendFile(path.join(process.cwd(), "views/404.html"));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
