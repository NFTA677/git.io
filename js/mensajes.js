class MessageManager {
    constructor() {
        this.messages = this.loadMessages();
        // Assuming 'users' is globally available or passed in constructor
        // For this example, we'll assume it's loaded from localStorage as in auth.js
        this.users = JSON.parse(localStorage.getItem('users')) || {};
    }

    // Cargar mensajes desde localStorage
    loadMessages() {
        try {
            const messages = JSON.parse(localStorage.getItem('messages'));
            return Array.isArray(messages) ? messages : [];
        } catch (e) {
            console.error("Error loading messages from localStorage:", e);
            return [];
        }
    }

    // Enviar un nuevo mensaje
    sendMessage(sender, receiver, subject, body) {
        const newMessage = {
            id: Date.now().toString(), // Simple unique ID
            sender,
            receiver,
            subject,
            body,
            timestamp: new Date().toISOString(),
            read: false
        };
        this.messages.push(newMessage);
        localStorage.setItem('messages', JSON.stringify(this.messages));
        return newMessage;
    }

    // Marcar un mensaje como leído
    markAsRead(messageId) {
        const message = this.messages.find(msg => msg.id === messageId);
        if (message) {
            message.read = true;
            localStorage.setItem('messages', JSON.stringify(this.messages));
        }
    }

    // Eliminar un mensaje
    deleteMessage(messageId) {
        const initialLength = this.messages.length;
        this.messages = this.messages.filter(msg => msg.id !== messageId);
        if (this.messages.length < initialLength) {
            localStorage.setItem('messages', JSON.stringify(this.messages));
            return true;
        }
        return false;
    }

    // Obtener un mensaje por ID
    getMessageById(messageId) {
        return this.messages.find(msg => msg.id === messageId);
    }

    // Obtener el número de mensajes no leídos para un usuario
    getUnreadMessageCount(username) {
        return this.messages.filter(msg => msg.receiver === username && !msg.read).length;
    }

    // Obtener todos los usuarios (para el selector de destinatarios)
    getAllUsernames() {
        return Object.keys(this.users);
    }

    // Obtener mensajes enviados por un usuario
    getSentMessages(username) {
        return this.messages.filter(msg => msg.sender === username);
    }

    // Obtener mensajes recibidos por un usuario
    getReceivedMessages(username) {
        return this.messages.filter(msg => msg.receiver === username);
    }
    // Obtener mensajes compartidos (si aplica, por ejemplo, mensajes a un grupo o a todos)
    getSharedMessages(username) {
        // Esto es un ejemplo. Podrías tener un campo 'sharedWith' en el mensaje
        // o un tipo de mensaje 'broadcast'.
        // Por ahora, asumimos que no hay mensajes "compartidos" explícitamente
        // en el sentido de un hilo de conversación grupal, sino más bien
        // mensajes directos entre usuarios.
        return []; 
    }
}
