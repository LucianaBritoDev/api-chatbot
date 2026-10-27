import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});
const app = express();
const port = process.env.PORT || 3000;
const maxImageBytes = 5 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const frontEndPath = join(dirname(fileURLToPath(import.meta.url)), "front-end");

app.use(express.json({ limit: "8mb" }));
app.use(express.static(frontEndPath));

async function responderMensagem(mensagem, imagem) {
    const contents = [{ text: mensagem }];

    if (imagem) {
        contents.unshift({
            inlineData: {
                mimeType: imagem.mimeType,
                data: imagem.data
            }
        });
    }

    const result = await client.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents
    });
    const resposta = result.text?.trim();

    if (!resposta) {
        throw new Error("O modelo retornou uma resposta vazia.");
    }

    return resposta;
}

app.post("/api/chat", async (request, response) => {
    const { message, image } = request.body ?? {};

    if (typeof message !== "string" || !message.trim()) {
        return response.status(400).json({ error: "Digite uma mensagem antes de enviar." });
    }

    let imagemValidada;

    if (image !== undefined) {
        if (
            !image ||
            typeof image !== "object" ||
            !allowedImageTypes.has(image.mimeType) ||
            typeof image.data !== "string" ||
            !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(image.data)
        ) {
            return response.status(400).json({ error: "A imagem enviada é inválida." });
        }

        const imageBuffer = Buffer.from(image.data, "base64");

        if (imageBuffer.length === 0 || imageBuffer.length > maxImageBytes) {
            return response.status(400).json({ error: "A imagem deve ter até 5 MB." });
        }

        imagemValidada = image;
    }

    try {
        const reply = await responderMensagem(message.trim(), imagemValidada);
        return response.json({ reply });
    } catch (error) {
        console.error("Erro ao gerar resposta do modelo:", error);
        return response.status(502).json({
            error: "Não foi possível gerar uma resposta agora. Tente novamente."
        });
    }
});

app.use((error, request, response, next) => {
    if (error.type === "entity.too.large") {
        return response.status(413).json({ error: "A solicitação excede o tamanho permitido." });
    }

    if (error instanceof SyntaxError && "body" in error) {
        return response.status(400).json({ error: "O corpo da solicitação não contém JSON válido." });
    }

    console.error("Erro ao processar solicitação HTTP:", error);
    return response.status(500).json({ error: "Ocorreu um erro interno. Tente novamente." });
});

app.listen(port, () => {
    console.log(`Chatbot disponível em http://localhost:${port}`);
});
