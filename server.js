const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'votes.json');
const ADMIN_PASSWORD = 'admin12345'; // Не забудь сменить на свой!

// Инициализация файла данных
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ 
        status: 'open', 
        votedIPs: [], 
        totalScores: {},
        cards: [],
        countdownDate: ""
    }, null, 2));
}

// --- API Роуты ---

app.get('/api/voting-status', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    res.json({
        status: data.status,
        cards: data.cards || [],
        countdownDate: data.countdownDate || "",
        totalScores: data.status === 'closed' ? data.totalScores : {}
    });
});

app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) res.json({ success: true });
    else res.status(401).json({ success: false, message: 'Неверный пароль!' });
});

app.post('/api/admin-results', (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ success: false, message: 'Доступ запрещен.' });
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    res.json({ success: true, ...data });
});

app.post('/api/admin-change-status', (req, res) => {
    const { password, newStatus } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ success: false, message: 'Доступ запрещен.' });
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    data.status = newStatus;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

app.post('/api/admin-set-countdown', (req, res) => {
    const { password, countdownDate } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ success: false, message: 'Доступ запрещен.' });
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    data.countdownDate = countdownDate;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, message: 'Таймер обновлен' });
});

app.post('/api/admin-reset-scores', (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ success: false, message: 'Доступ запрещен.' });
    const data = JSON.parse(fs.readFileSync(DATA_FILE));
    data.totalScores = {}; 
    data.votedIPs = []; 
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, message: 'Сброшено' });
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


if (data.votedIPs.includes(userIP)) return res.status(403).json({ success: false, message: 'Вы уже голосовали!' });

    const userVotes = req.body.votes;
    if (!userVotes || userVotes.length === 0) return res.status(400).json({ success: false, message: 'Корзина пуста.' });

    userVotes.forEach(item => {
        if (!data.totalScores[item.artistId]) data.totalScores[item.artistId] = 0;
        data.totalScores[item.artistId] += item.count;
    });

    data.votedIPs.push(userIP);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
```javascript
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

```