const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const DATA_FILE = './votes.json';
const ADMIN_PASSWORD = 'admin12345'; // Твой пароль администратора

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ 
        status: 'open', 
        votedIPs: [], 
        totalScores: {},
        cards: [],
        countdownDate: "" // Сюда сохраняем дату таймера
    }, null, 2));
}

app.get('/api/voting-status', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    res.json({
        status: data.status,
        cards: data.cards || [], 
        countdownDate: data.countdownDate || "", // Отдаем дату пользователям
        totalScores: data.status === 'closed' ? data.totalScores : {}
    });
});

app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) res.json({ success: true });
    else res.status(401).json({ success: false, message: 'Неверный пароль администратора!' });
});

app.post('/api/admin-results', (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ success: false, message: 'Доступ запрещен.' });

    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    res.json({
        success: true,
        status: data.status,
        totalScores: data.totalScores,
        totalVoters: data.votedIPs.length,
        cards: data.cards || [],
        countdownDate: data.countdownDate || ""
    });
});

app.post('/api/admin-change-status', (req, res) => {
    const { password, newStatus } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ success: false, message: 'Доступ запрещен.' });

    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    data.status = newStatus;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

// --- НОВЫЙ РОУТ ДЛЯ УСТАНОВКИ ТАЙМЕРА ОБРАТНОГО ОТСЧЕТА ---
app.post('/api/admin-set-countdown', (req, res) => {
    const { password, countdownDate } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ success: false, message: 'Доступ запрещен.' });

    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    data.countdownDate = countdownDate; // "2026-05-16T22:00" или пустая строка для удаления
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, message: 'Таймер успешно обновлен!' });
});

app.post('/api/admin-reset-scores', (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ success: false, message: 'Доступ запрещен.' });

    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    data.totalScores = {}; 
    data.votedIPs = [];    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, message: 'Все голоса и IP успешно сброшены!' });
});

app.post('/api/admin-cards', (req, res) => {
    const { password, action, cardData, cardId } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ success: false, message: 'Доступ запрещен.' });

    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    if (!data.cards) data.cards = [];

    if (action === 'add') {
        const newCard = {
            id: String(Date.now()), 
            artist: cardData.artist,
            music: cardData.music,
            country: cardData.country,
            image: cardData.image || 'images/default.png'
        };
        data.cards.push(newCard);
    } else if (action === 'delete') {
        data.cards = data.cards.filter(c => c.id !== String(cardId));
        if (data.totalScores[cardId]) delete data.totalScores[cardId];
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

app.post('/api/submit-votes', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    if (data.status !== 'open') return res.status(400).json({ success: false, message: 'Голосование закрыто.' });

    const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (data.votedIPs.includes(userIP)) return res.status(403).json({ success: false, message: 'You have already voted!' });

    const userVotes = req.body.votes;
    if (!userVotes || userVotes.length === 0) return res.status(400).json({ success: false, message: 'Cart is empty.' });

    userVotes.forEach(item => {
        if (!data.totalScores[item.artistId]) data.totalScores[item.artistId] = 0;
        data.totalScores[item.artistId] += item.count;
    });

    data.votedIPs.push(userIP);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

app.listen(3000, '0.0.0.0', () => console.log('Secure Server running on port 3000'));
