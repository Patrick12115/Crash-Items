const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

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

let users = [];
let imageSelections = {};
let lockedOutImages = [];

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

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

        io.emit('update-images', {
            commonSelections: Object.keys(selections).filter(img => selections[img] > 1),
            userSelections: imageSelections
        });

        imageSelections = {};
    });

    // Handle lockout functionality
    socket.on('lockout', (lockedImages) => {
        console.log('Locking out images:', lockedImages);
        lockedOutImages = lockedImages; // Store locked out images
        io.emit('update-lockout', lockedOutImages); // Broadcast to all users
    });


    socket.on('reset', () => {
        console.log('Reset event triggered');
        users.forEach(user => {
            user.lockedIn = false;
        });
        imageSelections = {};
        lockedOutImages = [];
        io.emit('update-users', users);
        io.emit('update-images', []); // Clear images on the client side
        io.emit('update-lockout', lockedOutImages); // Clear locked out images on client side
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        users = users.filter(user => user.id !== socket.id);
        io.emit('update-users', users);
    });
});

// Use the PORT provided by Heroku, or 3000 if running locally
const PORT = process.env.PORT || 3000;

// Bind the server using server.listen, not app.listen
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
