import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();

// Configuración de CORS
app.use(cors({
  origin: ["http://localhost:5173", "http://poi-chat-f326c.web.app"], // Cambia esto al dominio del cliente en producción
  methods: ["GET", "POST"],
  credentials: true
}));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://poi-chat-f326c.web.app"], // Cambia esto al dominio del cliente en producción
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('offer', (offer) => {
    console.log('Received offer:', offer);
    socket.broadcast.emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    console.log('Received answer:', answer);
    socket.broadcast.emit('answer', answer);
  });

  socket.on('ice-candidate', (candidate) => {
    console.log('Received ice-candidate:', candidate);
    socket.broadcast.emit('ice-candidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;  

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
