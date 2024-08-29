const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Endpoint to fetch image filenames
app.get('/images', (req, res) => {
    fs.readdir(path.join(__dirname, '../public/images'), (err, files) => {
        if (err) {
            console.error('Error reading images directory:', err);
            return res.status(500).send('Server error');
        }
        res.json(files); // Send filenames as JSON
    });
});

let users = [];
let imageSelections = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Add the user with their socket ID
    users.push({ id: socket.id, lockedIn: false });
    io.emit('update-users', users);

    socket.on('lock-in', (data) => {
        console.log(`Received lock-in from socket ${socket.id}:`, data);
        const { selections } = data;
        const user = users.find(u => u.id === socket.id);
        if (user) {
            user.lockedIn = true;
            imageSelections[socket.id] = selections;
            io.emit('update-users', users);
        } else {
            console.error(`User with socket ID ${socket.id} not found`);
        }
    });

    socket.on('confirm', () => {
        console.log('Confirm event triggered');
        console.log('Current imageSelections:', imageSelections);

        const selections = {};
        Object.values(imageSelections).flat().forEach(img => {
            selections[img] = (selections[img] || 0) + 1;
        });

        console.log('Aggregated selections:', selections);
        io.emit('update-images', Object.keys(selections).filter(img => selections[img] > 1));
        imageSelections = {}; // Reset selections
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        users = users.filter(user => user.id !== socket.id);
        io.emit('update-users', users);
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
