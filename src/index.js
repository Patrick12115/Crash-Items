const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const lockoutSelections = {};
let users = [];
let imageSelections = {};
let lockedOutImages = [];
let aggregatedSelections = {}; // Store aggregated picks here

app.use(express.static(path.join(__dirname, '../public')));

app.get('/images', (req, res) => {
    fs.readdir(path.join(__dirname, '../public/images'), (err, files) => {
        if (err) {
            console.error('Error reading images directory:', err);
            return res.status(500).send('Server error');
        }
        res.json(files);
    });
});

app.post('/lockout', (req, res) => {
    const { userName, lockoutSelections: newLockoutSelections } = req.body;

    // Store or update lockout selections for the current session or user
    lockoutSelections[userName] = newLockoutSelections;
    res.sendStatus(200);
});

// Serve the aggregated picks page
app.get('/aggregated-picks', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/aggregated.html'));
});

app.get('/aggregated-picks-data', (req, res) => {
    res.json({
        aggregatedSelections,
        lockedOutImages,
        images: fs.readdirSync(path.join(__dirname, '../public/images')),
        showHookshotTexB: aggregatedSelections['gItemIconHookshotTex.png'] > 0 // Add this line
    });
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('ping', () => {
        socket.emit('pong');
    });

    socket.on('set-name', (name) => {
        if (users.some(user => user.userName === name)) {
            socket.emit('name-taken', 'This name is already taken');
            return;
        }
        users.push({ id: socket.id, userName: name, lockedIn: false });
        io.emit('update-users', users);
        console.log(`${name} has connected`);
    });

    socket.on('lock-in', ({ userName, selections }) => {
        console.log(`Received lock-in from ${userName}:`, selections);
        const user = users.find(u => u.userName === userName && u.id === socket.id);
        if (user) {
            user.lockedIn = true;
            imageSelections[socket.id] = selections;
            io.emit('update-users', users);
        } else {
            console.error(`User ${userName} not found`);
        }
    });

    socket.on('confirm', () => {
        console.log('Confirm button clicked');
        console.log('Current imageSelections:', imageSelections);

        const selections = {};
        Object.values(imageSelections).flat().forEach(img => {
            selections[img] = (selections[img] || 0) + 1;
        });

        console.log('Aggregated selections:', selections);

        // Check and adjust the count for hookshot textures
        const hookshotTexCount = selections['gItemIconHookshotTex.png'] || 0;
        if (hookshotTexCount >= 2) {
            if (!selections['gItemIconHookshotTexB.png']) {
                selections['gItemIconHookshotTexB.png'] = 0;
            }
            selections['gItemIconHookshotTexB.png'] += hookshotTexCount;
        }

        // Check and adjust the count for strength textures
        const strengthTexACount = selections['gItemIconStrengthTexA.png'] || 0;
        if (strengthTexACount >= 2) {
            if (!selections['gItemIconStrengthTexB.png']) {
                selections['gItemIconStrengthTexB.png'] = 0;
            }
            selections['gItemIconStrengthTexB.png'] += strengthTexACount;

            if (!selections['gItemIconStrengthTexC.png']) {
                selections['gItemIconStrengthTexC.png'] = 0;
            }
            selections['gItemIconStrengthTexC.png'] += strengthTexACount;
        }

        // Check and adjust the count for scale textures
        const scaleTexACount = selections['gItemIconScaleATex.png'] || 0;
        if (scaleTexACount >= 2) {
            if (!selections['gItemIconScaleBTex.png']) {
                selections['gItemIconScaleBTex.png'] = 0;
            }
            selections['gItemIconScaleBTex.png'] += scaleTexACount;
        }
		
		// Check and adjust the count for wallet textures
		const walletTexACount = selections['gItemIconWalletATex.png'] || 0;
		if (walletTexACount >= 2) {
			if (!selections['gItemIconWalletBTex.png']) {
				selections['gItemIconWalletBTex.png'] = 0;
			}
			selections['gItemIconWalletBTex.png'] += walletTexACount;
		}

        aggregatedSelections = selections; // Update aggregated selections

        io.emit('update-images', {
            commonSelections: Object.keys(selections).filter(img => selections[img] > 1),
            userSelections: imageSelections
        });

        io.emit('confirm-pressed');
        imageSelections = {};
    });

    socket.on('lockout', (lockedImages) => {
        console.log('Locking out images:', lockedImages);
        lockedOutImages = lockedImages;
        io.emit('update-lockout', lockedOutImages);
    });

    socket.on('reset', () => {
        console.log('Reset event triggered by', socket.id);

        // Reset logic on the server side
        users.forEach(user => {
            user.lockedIn = false;
        });
        imageSelections = {};
        lockedOutImages = [];

        // Broadcast reset event to all clients
        io.emit('reset-all'); // Notify all clients to reset

        io.emit('update-users', users);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        users = users.filter(user => user.id !== socket.id);
        io.emit('update-users', users);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
