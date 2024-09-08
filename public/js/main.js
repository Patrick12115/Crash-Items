document.addEventListener('DOMContentLoaded', () => {
    const imageContainer = document.getElementById('image-container');
    const lockButton = document.getElementById('lock-button');
    const confirmButton = document.getElementById('confirm-button');
    const resetButton = document.getElementById('reset-button');
    const lockoutButton = document.getElementById('lockout-button');
    const userStatusDiv = document.getElementById('user-status');
    const viewAggregatedPicksButton = document.getElementById('view-aggregated-picks-button');
    const warningMessage = document.getElementById('warning-message');

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
                        handleVisibility(); // Check visibility after selection
                    }
                });
                imageContainer.appendChild(img);
            });

            // Call handleVisibility() after all images have been added
            handleVisibility();
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
        handleVisibility(); // Check visibility on lock-in
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
        const password = prompt('Enter the password to view All Picks and Crashes:');
        if (password === 'CheatingStinky') {
            window.open('/aggregated.html', '_blank');
        } else {
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
        resetButton.disabled = false; 
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

            handleVisibility(); // Ensure visibility is handled on update
        });
    });

    socket.on('update-lockout', (lockedOutImages) => {
        console.log('Received locked-out images:', lockedOutImages);
        document.querySelectorAll('.selectable-image').forEach(img => {
            const imgSrc = img.src.split('/').pop();
            if (lockedOutImages.includes(imgSrc)) {
                img.classList.add('locked-out');
                img.classList.remove('selected');
            }
        });
    });

    socket.on('confirm-pressed', () => {
        confirmButton.disabled = true;
    });

    socket.on('reset-all', () => {
        console.log('Reset all clients');
        resetUI(); 
        lockButton.disabled = false;
        confirmButton.disabled = true;
        resetButton.disabled = true; 
    });

    function getSelectedImages() {
        return Array.from(document.querySelectorAll('.selectable-image.selected'))
            .map(img => img.src.split('/').pop());
    }

	function handleVisibility() {
		const hookshotTexSelected = document.querySelector('.selectable-image.selected[src$="gItemIconHookshotTex.png"]');
		const scaleATexSelected = document.querySelector('.selectable-image.selected[src$="gItemIconScaleATex.png"]');
		const strengthTexASelected = document.querySelector('.selectable-image.selected[src$="gItemIconStrengthTexA.png"]');
		const strengthTexBSelected = document.querySelector('.selectable-image.selected[src$="gItemIconStrengthTexB.png"]');
		const strengthTexCSelected = document.querySelector('.selectable-image.selected[src$="gItemIconStrengthTexC.png"]');
		const walletATexSelected = document.querySelector('.selectable-image.selected[src$="gItemIconWalletATex.png"]');

		let showWarning = false;

		document.querySelectorAll('.selectable-image').forEach(img => {
			const imgSrc = img.src.split('/').pop();

			// Handle visibility for Hookshot
			if (imgSrc === 'gItemIconHookshotTexB.png') {
				if (hookshotTexSelected) {
					img.style.display = 'block';
				} else {
					img.style.display = 'none';
					img.classList.remove('selected');
				}
			}

			// Handle visibility for Scale
			if (imgSrc === 'gItemIconScaleBTex.png') {
				if (scaleATexSelected) {
					img.style.display = 'block';
				} else {
					img.style.display = 'none';
					img.classList.remove('selected');
				}
			}

			// Handle visibility for Strength B
			if (imgSrc === 'gItemIconStrengthTexB.png') {
				if (strengthTexASelected) {
					img.style.display = 'block';
				} else {
					img.style.display = 'none';
					img.classList.remove('selected');
				}
			}

			// Handle visibility for Strength C
			if (imgSrc === 'gItemIconStrengthTexC.png') {
				if (strengthTexASelected && strengthTexBSelected) {
					img.style.display = 'block';
				} else {
					img.style.display = 'none';
					img.classList.remove('selected');
				}
			}

			// Handle visibility for Wallet B (new logic)
			if (imgSrc === 'gItemIconWalletBTex.png') {
				if (walletATexSelected) {
					img.style.display = 'block';
				} else {
					img.style.display = 'none';
					img.classList.remove('selected');
				}
			}

			// Check for specific items to show warning
			if (['gItemIconHookshotTex.png', 'gItemIconScaleATex.png', 'gItemIconStrengthTexA.png', 'gItemIconWalletATex.png'].includes(imgSrc) && img.classList.contains('selected')) { 
				showWarning = true;
			}
		});

		// Show or hide the warning message based on selection
		warningMessage.style.display = showWarning ? 'block' : 'none';
	}


    function resetUI() {
        document.querySelectorAll('.selectable-image').forEach(img => {
            img.classList.remove('selected', 'common-selection', 'unique-selection', 'locked-out');
            img.style.display = 'block'; // Reset display to default
        });
        lockButton.disabled = false;
        confirmButton.disabled = true;
        resetButton.disabled = true;
        isLockedIn = false;
        socket.emit('update-users');
        handleVisibility(); // Reapply visibility rules
    }
});
