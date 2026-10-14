require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 🔌 MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://rushikeshsatpute300_db_user:Hrushi12356@ac-u114edz-shard-00-00.9utnd68.mongodb.net:27017,ac-u114edz-shard-00-01.9utnd68.mongodb.net:27017,ac-u114edz-shard-00-02.9utnd68.mongodb.net:27017/who_among_us?ssl=true&replicaSet=atlas-yx0vum-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000
})
    .then(() => console.log('✅ MongoDB Atlas successfully connected!'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// 📦 Room Schema & Model
const roomSchema = new mongoose.Schema({
    roomCode: { type: String, required: true, unique: true, uppercase: true },
    roomName: { type: String, default: 'Friend Squad' },
    adminName: { type: String, default: 'Admin' },
    friends: [String],
    questions: [String],
    playerAvatars: { type: Object, default: {} },
    votes: { type: Object, default: {} },
    detailedVotes: { type: Object, default: {} },
    votersList: [String],
    colorCounter: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 48 }
}, { minimize: false });

const Room = mongoose.model('Room', roomSchema);

// 🎨 9 Characters
const CHARACTER_COLORS = [
    'red', 'pink', 'green', 'yellow', 'black',
    'purple', 'orange', 'blue', 'lite_blue'
];

// 🔥 Default Questions
const DEFAULT_QUESTIONS = [
    "Who is the best liar in the squad?",
    "Who cannot keep a secret for more than 5 minutes?",
    "Who acts the most innocent in front of parents but is the wildest?",
    "Who is the funniest person who makes everyone laugh?",

];

// 🏠 1. Home Page
app.get('/', (req, res) => {
    const error = req.query.error || null;
    res.render('index', { error });
});

// 🔑 1B. Join Room by Code
app.post('/join-room', async (req, res) => {
    try {
        const roomCode = (req.body.roomCode || '').trim().toUpperCase();
        const room = await Room.findOne({ roomCode });

        if (!room) {
            return res.redirect(`/?error=${encodeURIComponent("Room Code '" + roomCode + "' Not found Enter valid code.")}`);
        }

        res.redirect(`/play/${roomCode}`);
    } catch (err) {
        console.error(err);
        res.redirect('/?error=Kuch error aayi, dubara koshish kar!');
    }
});

// ➕ 2. Step 1: Create Room
app.get('/create', (req, res) => {
    res.render('create');
});

app.post('/create-room', async (req, res) => {
    try {
        const { roomName, adminName } = req.body;
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        await Room.create({
            roomCode,
            roomName: roomName || 'Friend Squad',
            adminName: adminName || 'Admin',
            friends: [],
            questions: [],
            playerAvatars: {},
            votes: {},
            detailedVotes: {}
        });

        res.redirect(`/add-friends/${roomCode}?admin=${encodeURIComponent(adminName)}`);
    } catch (err) {
        console.error(err);
        res.redirect('/create');
    }
});

// 👥 3. Step 2: Add Friends
app.get('/add-friends/:roomCode', async (req, res) => {
    const roomCode = req.params.roomCode.toUpperCase();
    const room = await Room.findOne({ roomCode });
    const adminName = room ? room.adminName : (req.query.admin || '');
    res.render('add-friends', { roomCode, adminName });
});

app.post('/add-friends', async (req, res) => {
    try {
        const { roomCode, friends } = req.body;
        const friendList = Array.isArray(friends) ? friends : [friends];
        const cleanFriends = friendList.filter(n => n && n.trim() !== '').map(n => n.trim());

        await Room.findOneAndUpdate(
            { roomCode: roomCode.toUpperCase() },
            { $set: { friends: cleanFriends } }
        );

        res.redirect(`/add-questions/${roomCode.toUpperCase()}`);
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// ❓ 4. Step 3: Add Questions
app.get('/add-questions/:roomCode', async (req, res) => {
    const roomCode = req.params.roomCode.toUpperCase();
    const room = await Room.findOne({ roomCode });
    const questionsToShow = (room && room.questions && room.questions.length > 0)
        ? room.questions
        : DEFAULT_QUESTIONS;

    res.render('add-questions', { roomCode, defaultQuestions: questionsToShow });
});

app.post('/add-questions', async (req, res) => {
    try {
        const { roomCode, questions } = req.body;
        const qList = Array.isArray(questions) ? questions : [questions];
        const cleanQuestions = qList.filter(q => q && q.trim() !== '').map(q => q.trim());

        await Room.findOneAndUpdate(
            { roomCode: roomCode.toUpperCase() },
            { $set: { questions: cleanQuestions } }
        );

        res.redirect(`/share/${roomCode.toUpperCase()}`);
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// 🔗 5. Step 4: Share Link
app.get('/share/:roomCode', async (req, res) => {
    const roomCode = req.params.roomCode.toUpperCase();
    const room = await Room.findOne({ roomCode });

    res.render('share', {
        roomCode,
        roomName: room ? room.roomName : 'Friend Squad',
        friendsCount: room && room.friends ? room.friends.length : 0
    });
});

// 🎮 6. Join Screen / Enter Name Page
app.get('/play/:roomCode', async (req, res) => {
    try {
        const roomCode = req.params.roomCode.toUpperCase();
        const room = await Room.findOne({ roomCode });

        if (!room) {
            return res.redirect(`/?error=${encodeURIComponent("Room Code nahi mila!")}`);
        }

        const colorIndex = room.colorCounter || 0;
        const assignedColor = CHARACTER_COLORS[colorIndex % CHARACTER_COLORS.length];

        room.colorCounter = colorIndex + 1;
        await room.save();

        res.render('join-name', {
            roomCode,
            assignedColor
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// 👤 7. Save Chosen Avatar & Link to Name
app.post('/start-playing', async (req, res) => {
    try {
        const { roomCode, playerName, avatar } = req.body;
        const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });

        if (!room) return res.redirect('/');

        const cleanName = playerName.trim();
        const matchedFriend = room.friends.find(f => f.toLowerCase() === cleanName.toLowerCase());
        const finalName = matchedFriend || cleanName;

        const avatarsObj = { ...(room.playerAvatars || {}) };
        avatarsObj[finalName] = avatar;

        room.playerAvatars = avatarsObj;
        room.markModified('playerAvatars');
        await room.save();

        res.redirect(`/vote/${room.roomCode}?player=${encodeURIComponent(finalName)}`);
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// 🗳️ 8. Voting Screen
app.get('/vote/:roomCode', async (req, res) => {
    try {
        const roomCode = req.params.roomCode.toUpperCase();
        const player = req.query.player || 'Player';
        const room = await Room.findOne({ roomCode });

        if (!room) return res.redirect('/');

        const questions = (room.questions && room.questions.length > 0) ? room.questions : DEFAULT_QUESTIONS;
        const friends = (room.friends && room.friends.length > 0) ? room.friends : [player];
        const savedAvatars = room.playerAvatars || {};

        const usedColors = Object.values(savedAvatars);
        const availableColors = CHARACTER_COLORS.filter(c => !usedColors.includes(c));
        let fallbackIdx = 0;

        const friendsWithAvatars = friends.map((friendName) => {
            let chosenColor = savedAvatars[friendName];
            if (!chosenColor) {
                chosenColor = availableColors.length > 0
                    ? availableColors[fallbackIdx % availableColors.length]
                    : CHARACTER_COLORS[fallbackIdx % CHARACTER_COLORS.length];
                fallbackIdx++;
            }
            return { name: friendName, avatar: chosenColor };
        });

        res.render('vote', {
            roomCode,
            player,
            questions,
            friendsWithAvatars
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// 📥 9. Submit Votes to MongoDB
app.post('/submit-votes', async (req, res) => {
    try {
        const { roomCode, voterName, answersJson } = req.body;
        const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });

        if (!room) return res.redirect('/');

        const parsedAnswers = JSON.parse(answersJson || '{}');

        const votesObj = { ...(room.votes || {}) };
        const detailedObj = { ...(room.detailedVotes || {}) };

        if (!room.votersList.includes(voterName)) {
            room.votersList.push(voterName);
        }

        Object.keys(parsedAnswers).forEach((qIdx) => {
            const key = String(qIdx);
            const targetFriend = parsedAnswers[qIdx];

            if (!votesObj[key]) votesObj[key] = {};
            votesObj[key][targetFriend] = (votesObj[key][targetFriend] || 0) + 1;

            if (!detailedObj[key]) detailedObj[key] = {};
            if (!detailedObj[key][targetFriend]) detailedObj[key][targetFriend] = [];
            if (!detailedObj[key][targetFriend].includes(voterName)) {
                detailedObj[key][targetFriend].push(voterName);
            }
        });

        room.votes = votesObj;
        room.detailedVotes = detailedObj;
        room.markModified('votes');
        room.markModified('detailedVotes');

        await room.save();
        res.redirect(`/results/${room.roomCode}`);
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// 🏆 10. Expose Results Page
app.get('/results/:roomCode', async (req, res) => {
    try {
        const roomCode = req.params.roomCode.toUpperCase();
        const room = await Room.findOne({ roomCode }).lean();

        if (!room) return res.redirect('/');

        const questions = (room.questions && room.questions.length > 0) ? room.questions : DEFAULT_QUESTIONS;

        res.render('results', {
            roomCode,
            room,
            questions
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});