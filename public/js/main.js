document.addEventListener('DOMContentLoaded', () => {
    const imageContainer = document.getElementById('image-container'); // Define imageContainer here
    const lockButton = document.getElementById('lock-button');
    const confirmButton = document.getElementById('confirm-button');
    const resetButton = document.getElementById('reset-button');
    const lockoutButton = document.getElementById('lockout-button');
    const userStatusDiv = document.getElementById('user-status');
    const viewAggregatedPicksButton = document.getElementById('view-aggregated-picks-button'); // Ensure this ID matches

    const socket = io();

    let userName = prompt("Enter your name:");
    if (!userName) {
        alert("Name is required!");
        throw new Error("Name is required");
    }

    let isLockedIn = false;

    const pingInterval = 20000; // 20 seconds
    setInterval(() => {
        socket.emit('ping');
    }, pingInterval);

    fetch('/images')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(images => {
            images.forEach(imageName => {
                const img = document.createElement('img');
                img.src = `images/${imageName}`;
                img.classList.add('selectable-image');
                img.addEventListener('click', () => {
                    if (!isLockedIn && !img.classList.contains('locked-out')) {
                        img.classList.toggle('selected');
                    }
                });
                imageContainer.appendChild(img);
            });
        })
        .catch(error => console.error('Error loading images:', error));

    socket.emit('set-name', userName);

    lockButton.addEventListener('click', () => {
        if (isLockedIn) return;

        isLockedIn = true;
        lockButton.disabled = true;
        confirmButton.disabled = false;
        resetButton.disabled = false;

        const selections = getSelectedImages();
        console.log('User selections before locking in:', selections);
        socket.emit('lock-in', { userName, selections });
    });

    confirmButton.addEventListener('click', () => {
        if (!isLockedIn) return;

        console.log('Confirm button clicked');
        socket.emit('confirm');
    });

    resetButton.addEventListener('click', () => {
        console.log('Reset button clicked');
        socket.emit('reset'); // Trigger reset on the server
    });

    lockoutButton.addEventListener('click', () => {
        const selectedImages = getSelectedImages();
        console.log('Locking out selected images:', selectedImages);

        document.querySelectorAll('.selectable-image.selected').forEach(img => {
            img.classList.add('locked-out');
            img.classList.remove('selected');
        });

        socket.emit('lockout', selectedImages);
        lockoutButton.disabled = false; 
    });

    viewAggregatedPicksButton.addEventListener('click', () => {
        // Prompt user for password
        const password = prompt('Enter the password to view All Picks and Crashes:');

        // Check if the entered password matches the expected password
        if (password === 'CheatingStinky') { // Replace 'yourPasswordHere' with your actual password
            // Open the aggregated picks page in a new tab
            window.open('/aggregated.html', '_blank');
        } else {
            // Alert user if the password is incorrect
            alert('Incorrect password. Access denied.');
        }
    });

    socket.on('update-users', (users) => {
        console.log('Updated users:', users);
        userStatusDiv.innerHTML = users.map(user => {
            return `<p>${user.userName || 'Unknown'}: <span class="${user.lockedIn ? 'locked-in' : 'not-locked-in'}">
                ${user.lockedIn ? 'Locked In' : 'Not Locked In'}</span></p>`;
        }).join('');
        confirmButton.disabled = !users.every(user => user.lockedIn);
        resetButton.disabled = false; // Enable reset if any user is locked in
    });

    socket.on('update-images', ({ commonSelections, userSelections }) => {
        console.log('Common selections:', commonSelections);
        const userSelectionsSet = new Set(getSelectedImages());

        document.querySelectorAll('.selectable-image').forEach(img => {
            const imgSrc = img.src.split('/').pop();

            img.classList.remove('common-selection', 'unique-selection');

            if (userSelectionsSet.has(imgSrc) && commonSelections.includes(imgSrc)) {
                img.classList.add('common-selection');
            } else if (userSelectionsSet.has(imgSrc)) {
                img.classList.add('unique-selection');
            }
        });
    });

    socket.on('update-lockout', (lockedOutImages) => {
        console.log('Received locked-out images:', lockedOutImages);
        document.querySelectorAll('.selectable-image').forEach(img => {
            const imgSrc = img.src.split('/').pop();
            if (lockedOutImages.includes(imgSrc)) {
                img.classList.add('locked-out');
                img.classList.remove('selected'); // Ensure it's deselected as well
            }
        });
    });

    socket.on('confirm-pressed', () => {
        confirmButton.disabled = true;
    });

    socket.on('reset-all', () => {
        console.log('Reset all clients');
        resetUI(); // Call the reset function to reset UI
        // Optionally, re-enable the lock-in button if needed
        lockButton.disabled = false;
        confirmButton.disabled = true;
        resetButton.disabled = true; // Ensure the reset button is also disabled until lock-in
    });

    function getSelectedImages() {
        return Array.from(document.querySelectorAll('.selectable-image.selected'))
            .map(img => img.src.split('/').pop());
    }

    function resetUI() {
        document.querySelectorAll('.selectable-image').forEach(img => {
            img.classList.remove('selected', 'common-selection', 'unique-selection', 'locked-out');
        });
        lockButton.disabled = false;
        confirmButton.disabled = true;
        resetButton.disabled = true; // Disable reset until user is locked in
        isLockedIn = false;

        // Clear and reset user status
        socket.emit('update-users'); // Request the current user statuses from the server
    }
});
