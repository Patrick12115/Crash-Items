document.addEventListener('DOMContentLoaded', () => {
    const imageContainer = document.getElementById('image-container');
    const lockButton = document.getElementById('lock-button');
    const confirmButton = document.getElementById('confirm-button');
    const resetButton = document.getElementById('reset-button');
    const userStatusDiv = document.getElementById('user-status');
    
    const socket = io();

    let userName = prompt("Enter your name:");
    if (!userName) {
        alert("Name is required!");
        throw new Error("Name is required");
    }

    let isLockedIn = false;

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
                    if (!isLockedIn) {
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
        // Emit an event to the server to reset state if needed
        socket.emit('reset');
        // Clear selections and reset UI
        resetUI();
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

			// Remove any existing indicators
			img.classList.remove('common-selection', 'unique-selection');

			if (userSelectionsSet.has(imgSrc) && commonSelections.includes(imgSrc)) {
				img.classList.add('common-selection');
			} else if (userSelectionsSet.has(imgSrc)) {
				img.classList.add('unique-selection');
			}
		});
	});


    function getSelectedImages() {
        return Array.from(document.querySelectorAll('.selectable-image.selected'))
            .map(img => img.src.split('/').pop());
    }

    function resetUI() {
        // Reset image selection UI
        document.querySelectorAll('.selectable-image').forEach(img => {
            img.classList.remove('selected', 'common-selection', 'unique-selection');
        });
        // Reset buttons
        lockButton.disabled = false;
        confirmButton.disabled = true;
        resetButton.disabled = false;
        // Reset locked-in state
        isLockedIn = false;
		socket.emit('reset');
    }
});
