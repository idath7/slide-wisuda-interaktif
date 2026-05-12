const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const session = require('express-session');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Konfigurasi Session untuk Login
app.use(session({
    secret: 'wahassecret2026',
    resave: false,
    saveUninitialized: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Konfigurasi Multer untuk Upload Foto
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, 'img-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Database JSON Sederhana
const DATA_FILE = './data-siswa.json';
const SETTINGS_FILE = './settings.json';

const readData = () => fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : [];
const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

const readSettings = () => fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE)) : { namaSekolah: "MAS WAHAS JEMBER", countdown: "Jun 20, 2026 08:00:00", warnaUtama: "#ffd700", logoUtama: "logo.png" };
const writeSettings = (data) => fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));

// ================= API ENDPOINTS =================

// 1. Sistem Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') { // Ganti password sesuai selera
        req.session.loggedIn = true;
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Username atau Password salah!' });
    }
});

app.get('/api/check-auth', (req, res) => {
    res.json({ loggedIn: req.session.loggedIn === true });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Middleware Cek Login
const checkAuth = (req, res, next) => {
    if (req.session.loggedIn) next();
    else res.status(401).json({ error: 'Unauthorized' });
};

// 2. API Data Siswa
app.get('/api/siswa', (req, res) => res.json(readData()));

app.post('/api/siswa', checkAuth, upload.single('foto'), (req, res) => {
    const data = readData();
    const newSiswa = {
        id: Date.now().toString(),
        nama: req.body.nama,
        kelas: req.body.kelas,
        ortu: req.body.ortu,
        pesan: req.body.pesan,
        foto: req.file ? `/uploads/${req.file.filename}` : ''
    };
    data.push(newSiswa);
    writeData(data);
    io.emit('data_updated'); // Beri sinyal ke front-end
    res.json({ success: true });
});

app.post('/api/siswa/edit', checkAuth, upload.single('foto'), (req, res) => {
    let data = readData();
    const index = data.findIndex(s => s.id === req.body.id);
    if (index !== -1) {
        data[index].nama = req.body.nama;
        data[index].kelas = req.body.kelas;
        data[index].ortu = req.body.ortu;
        data[index].pesan = req.body.pesan;
        if (req.file) data[index].foto = `/uploads/${req.file.filename}`;
        writeData(data);
        io.emit('data_updated');
        res.json({ success: true });
    }
});

app.post('/api/siswa/delete', checkAuth, (req, res) => {
    let data = readData();
    data = data.filter(s => s.id !== req.body.id);
    writeData(data);
    io.emit('data_updated');
    res.json({ success: true });
});

// 3. API Pengaturan
app.get('/api/settings', (req, res) => res.json(readSettings()));

app.post('/api/settings', checkAuth, upload.single('logoUtama'), (req, res) => {
    let settings = readSettings();
    settings.namaSekolah = req.body.namaSekolah;
    settings.countdown = req.body.countdown;
    settings.warnaUtama = req.body.warnaUtama;
    if (req.file) settings.logoUtama = `/uploads/${req.file.filename}`;
    
    writeSettings(settings);
    io.emit('settings_updated', settings);
    res.json({ success: true });
});

// ================= SOCKET.IO =================
let currentSlideData = { isWelcome: true };

io.on('connection', (socket) => {
    socket.emit('slide_changed', currentSlideData);
    socket.emit('settings_updated', readSettings());

    socket.on('slide_changed', (data) => {
        currentSlideData = data;
        socket.broadcast.emit('slide_changed', data);
    });

    socket.on('reaction', (emoji) => io.emit('show_reaction', emoji));
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});