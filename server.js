const WebSocket = require('ws');

// Get the port from environment variables or fallback to a default value (for local development)
const port = process.env.PORT || 8080;

// Create a WebSocket server
const server = new WebSocket.Server({ port });

console.log(`WebSocket server is running on ws://localhost:${port}`);

// Array to keep track of all connected clients
let clients = [];

// Handle new client connections
server.on('connection', (socket) => {
    console.log("A new client connected.");
    clients.push(socket);

    // Handle incoming messages
    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`Received: ${JSON.stringify(data)}`);

            // Broadcast to all other clients (exclude the sender)
            clients.forEach((client) => {
                if (client !== socket && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        } catch (err) {
            console.error("Error parsing message:", err);
        }
    });

    // Handle client disconnection
    socket.on('close', () => {
        console.log("A client disconnected.");
        clients = clients.filter((client) => client !== socket);
    });

    // Handle errors
    socket.on('error', (error) => {
        console.error("WebSocket error:", error);
    });
});
