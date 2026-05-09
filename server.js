const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let slideSaatIni = null;

io.on('connection', (socket) => {
    // Log ini akan muncul di Terminal VS Code setiap ada yang buka web
    console.log('--- Ada Perangkat Terhubung ---');

    // Kirim data terakhir jika sudah ada
    if (slideSaatIni) {
        console.log('Mengirim data awal ke HP:', slideSaatIni.nama);
        socket.emit('update_mobile_slide', slideSaatIni);
    }

    socket.on('slide_changed', (dataSiswa) => {
        slideSaatIni = dataSiswa;
        console.log('Slide ganti ke:', dataSiswa.nama);
        io.emit('update_mobile_slide', dataSiswa);
    });

    socket.on('send_reaction', (emoji) => {
        io.emit('show_reaction', emoji); 
    });
});

http.listen(3000, '0.0.0.0', () => {
    console.log('Server AKTIF di port 3000');
});