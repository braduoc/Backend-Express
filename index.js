const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const asistenciaRoutes = require('./routes/asistencia');
const authRoutes = require('./routes/auth'); // Assuming you have an auth middleware
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
app.use(cors());

app.use(express.json());
app.use('/api/auth', authRoutes.router); 
app.use('/api/asistencia', asistenciaRoutes.router);

io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');
    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});