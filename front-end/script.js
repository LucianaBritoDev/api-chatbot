const historyKey = "chatbot.history.v1";
const maxImageSize = 5 * 1024 * 1024;
const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const elements = {
    attachButton: document.querySelector("#attach-image"),
    chatForm: document.querySelector("#chat-form"),
    clearButton: document.querySelector("#clear-chat"),
    conversation: document.querySelector("#conversation"),
    emptyState: document.querySelector("#empty-state"),
    errorStatus: document.querySelector("#error-status"),
    imageInput: document.querySelector("#image-input"),
    imageName: document.querySelector("#image-name"),
    imagePreview: document.querySelector("#image-preview"),
    loadingStatus: document.querySelector("#loading-status"),
    messageInput: document.querySelector("#message-input"),
    messageList: document.querySelector("#message-list"),
    previewImage: document.querySelector("#preview-image"),
    removeImageButton: document.querySelector("#remove-image"),
    sendButton: document.querySelector("#send-button")
};

let isSending = false;
let selectedImage = null;
let previewUrl = null;
let messages = loadHistory();

function isValidMessage(message) {
    return (
        message &&
        typeof message.id === "string" &&
        (message.sender === "user" || message.sender === "assistant") &&
        typeof message.text === "string" &&
        typeof message.timestamp === "string" &&
        (message.attachmentName === undefined || typeof message.attachmentName === "string")
    );
}

function loadHistory() {
    try {
        const savedHistory = localStorage.getItem(historyKey);
        if (!savedHistory) {
            return [];
        }

        const parsedHistory = JSON.parse(savedHistory);
        if (!Array.isArray(parsedHistory) || !parsedHistory.every(isValidMessage)) {
            throw new Error("Formato de histórico inválido.");
        }

        return parsedHistory;
    } catch {
        showError("Não foi possível carregar o histórico salvo nesta conversa.");
        return [];
    }
}

function saveHistory() {
    try {
        localStorage.setItem(historyKey, JSON.stringify(messages));
        return true;
    } catch {
        showError("Não foi possível salvar o histórico neste navegador.");
        return false;
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

function renderMessages() {
    const fragment = document.createDocumentFragment();

    for (const message of messages) {
        const messageElement = document.createElement("article");
        messageElement.className = `message message-${message.sender}`;

        const bubble = document.createElement("div");
        bubble.className = "message-bubble";
        bubble.textContent = message.text;

        if (message.attachmentName) {
            const attachment = document.createElement("span");
            attachment.className = "message-attachment";
            attachment.textContent = `Imagem anexada: ${message.attachmentName}`;
            bubble.append(attachment);
        }

        const time = document.createElement("time");
        time.className = "message-time";
        time.dateTime = message.timestamp;
        time.textContent = formatTime(message.timestamp);

        messageElement.append(bubble, time);
        fragment.append(messageElement);
    }

    elements.messageList.replaceChildren(fragment);
    elements.emptyState.hidden = messages.length > 0;
    elements.conversation.scrollTop = elements.conversation.scrollHeight;
}

function showError(message) {
    elements.errorStatus.textContent = message;
    elements.errorStatus.hidden = false;
}

function clearError() {
    elements.errorStatus.textContent = "";
    elements.errorStatus.hidden = true;
}

function updateComposer() {
    elements.sendButton.disabled =
        isSending || (!elements.messageInput.value.trim() && !selectedImage);
    elements.attachButton.disabled = isSending;
    elements.clearButton.disabled = isSending || messages.length === 0;
}

function createMessage(sender, text, attachmentName) {
    return {
        id: crypto.randomUUID(),
        sender,
        text,
        timestamp: new Date().toISOString(),
        ...(attachmentName ? { attachmentName } : {})
    };
}

function clearSelectedImage() {
    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
    }

    previewUrl = null;
    selectedImage = null;
    elements.imageInput.value = "";
    elements.previewImage.removeAttribute("src");
    elements.imageName.textContent = "";
    elements.imagePreview.hidden = true;
    updateComposer();
}

function readImageAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            const dataUrl = reader.result;
            if (typeof dataUrl !== "string" || !dataUrl.includes(",")) {
                reject(new Error("Não foi possível ler a imagem selecionada."));
                return;
            }

            resolve(dataUrl.slice(dataUrl.indexOf(",") + 1));
        });
        reader.addEventListener("error", () => {
            reject(new Error("Não foi possível ler a imagem selecionada."));
        });
        reader.readAsDataURL(file);
    });
}

async function sendMessage(event) {
    event.preventDefault();
    const text = elements.messageInput.value.trim();
    if (isSending || (!text && !selectedImage)) {
        return;
    }

    clearError();
    const imageToSend = selectedImage;
    const userMessage = createMessage(
        "user",
        text || "Descreva esta imagem.",
        imageToSend?.name
    );
    messages.push(userMessage);
    elements.messageInput.value = "";
    elements.messageInput.style.height = "auto";
    clearSelectedImage();
    renderMessages();
    saveHistory();

    isSending = true;
    elements.loadingStatus.hidden = false;
    updateComposer();
    elements.messageInput.focus();

    try {
        const requestBody = { message: userMessage.text };
        if (imageToSend) {
            requestBody.image = {
                mimeType: imageToSend.type,
                data: await readImageAsBase64(imageToSend)
            };
        }

        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        let payload;
        try {
            payload = await response.json();
        } catch {
            throw new Error("O servidor retornou uma resposta inválida.");
        }

        if (!response.ok) {
            throw new Error(payload?.error || "Não foi possível enviar sua mensagem.");
        }

        if (typeof payload?.reply !== "string" || !payload.reply.trim()) {
            throw new Error("O servidor não retornou uma resposta válida.");
        }

        messages.push(createMessage("assistant", payload.reply.trim()));
        renderMessages();
        saveHistory();
    } catch (error) {
        if (error instanceof TypeError) {
            showError("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
        } else {
            showError(error.message || "Ocorreu um erro ao enviar sua mensagem.");
        }
    } finally {
        isSending = false;
        elements.loadingStatus.hidden = true;
        updateComposer();
        elements.messageInput.focus();
    }
}

elements.chatForm.addEventListener("submit", sendMessage);

elements.messageInput.addEventListener("input", () => {
    elements.messageInput.style.height = "auto";
    elements.messageInput.style.height = `${Math.min(elements.messageInput.scrollHeight, 120)}px`;
    updateComposer();
});

elements.messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        elements.chatForm.requestSubmit();
    }
});

elements.attachButton.addEventListener("click", () => {
    elements.imageInput.click();
});

elements.imageInput.addEventListener("change", () => {
    const [file] = elements.imageInput.files;
    if (!file) {
        return;
    }

    clearError();
    if (!supportedImageTypes.has(file.type)) {
        showError("Escolha uma imagem JPEG, PNG ou WebP.");
        elements.imageInput.value = "";
        return;
    }

    if (file.size > maxImageSize) {
        showError("A imagem deve ter no máximo 5 MB.");
        elements.imageInput.value = "";
        return;
    }

    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
    }

    selectedImage = file;
    previewUrl = URL.createObjectURL(file);
    elements.previewImage.src = previewUrl;
    elements.imageName.textContent = file.name;
    elements.imagePreview.hidden = false;
    updateComposer();
});

elements.removeImageButton.addEventListener("click", clearSelectedImage);

elements.clearButton.addEventListener("click", () => {
    messages = [];
    clearError();
    saveHistory();
    renderMessages();
    updateComposer();
    elements.messageInput.focus();
});

renderMessages();
updateComposer();