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
        console.log('Confirm event triggered');
        console.log('Current imageSelections:', imageSelections);

        const selections = {};
        Object.values(imageSelections).flat().forEach(img => {
            selections[img] = (selections[img] || 0) + 1;
        });

        console.log('Aggregated selections:', selections);
        io.emit('update-images', Object.keys(selections).filter(img => selections[img] > 1));
        imageSelections = {};
    });
	socket.on('reset', () => {
		console.log('Reset event triggered');
		// Reset the users and imageSelections
		users.forEach(user => {
			user.lockedIn = false;
		});
		imageSelections = {};
		io.emit('update-users', users);
		io.emit('update-images', []); // Clear images on the client side
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
