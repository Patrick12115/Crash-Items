document.addEventListener('DOMContentLoaded', () => {
    const imageContainer = document.getElementById('image-container');

    // Fetch aggregated picks
    fetch('/aggregated-picks-data')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Aggregated picks data:', data);

            const { aggregatedSelections, images } = data;

            images.forEach(imageName => {
                const img = document.createElement('img');
                img.src = `images/${imageName}`;
                img.classList.add('selectable-image');

                // Determine the selection color
                const imgSrc = imageName;
                if (aggregatedSelections[imgSrc] > 1) {
                    img.classList.add('common-selection');
                } else if (aggregatedSelections[imgSrc] === 1) {
                    img.classList.add('unique-selection');
                }

                imageContainer.appendChild(img);
            });
        })
        .catch(error => console.error('Error loading aggregated picks data:', error));
});
