const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Variabel untuk menyimpan status slide terakhir
let currentSlideData = { isWelcome: true };

io.on('connection', (socket) => {
    console.log('A user connected');

    // Kirim data slide terakhir ke user yang baru join (HP)
    socket.emit('slide_changed', currentSlideData);

    socket.on('slide_changed', (data) => {
        currentSlideData = data; // Simpan data terbaru
        socket.broadcast.emit('slide_changed', data);
    });

    socket.on('reaction', (emoji) => {
        io.emit('show_reaction', emoji);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});