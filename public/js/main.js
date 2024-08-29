document.addEventListener('DOMContentLoaded', () => {
    const imageContainer = document.getElementById('image-container');
    const lockButton = document.getElementById('lock-button');
    const confirmButton = document.getElementById('confirm-button');
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

    lockButton.addEventListener('click', () => {
        if (isLockedIn) return;

        isLockedIn = true;
        lockButton.disabled = true;
        confirmButton.disabled = false;

        const selections = getSelectedImages();
        console.log('User selections before locking in:', selections);
        socket.emit('lock-in', { userName, selections });
    });

    confirmButton.addEventListener('click', () => {
        if (!isLockedIn) return;

        console.log('Confirm button clicked');
        socket.emit('confirm');
    });

    socket.on('update-users', (users) => {
        console.log('Updated users:', users);
        userStatusDiv.innerHTML = users.map(user => {
            return `<p>${user.name}: <span class="${user.lockedIn ? 'locked-in' : 'not-locked-in'}">
                ${user.lockedIn ? 'Locked In' : 'Not Locked In'}</span></p>`;
        }).join('');
        confirmButton.disabled = !users.every(user => user.lockedIn);
    });

    socket.on('update-images', (commonSelections) => {
        console.log('Common selections:', commonSelections);
        document.querySelectorAll('.selectable-image').forEach(img => {
            const imgSrc = img.src.split('/').pop();
            if (commonSelections.includes(imgSrc)) {
                img.classList.add('common-selection');
            } else if (img.classList.contains('selected')) {
                img.classList.add('unique-selection');
            }
        });
    });

    function getSelectedImages() {
        return Array.from(document.querySelectorAll('.selectable-image.selected'))
            .map(img => img.src.split('/').pop());
    }
});
