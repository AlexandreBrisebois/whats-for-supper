// State management
const state = {
    photos: [],
    selectedRating: 0,
    isUploading: false,
    apiBaseUrl: ''
};

// DOM elements
const elements = {
    photoInput: null,
    photoPlaceholder: null,
    photoGallery: null,
    photoItems: null,
    ratingButtons: null,
    btnSave: null,
    btnCancelFooter: null,
    statusMessage: null,
    uploadProgress: null
};

// Initialize app
async function init() {
    console.log('[WebJS] Initializing application...');
    
    // Get API configuration
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        state.apiBaseUrl = config.apiBaseUrl;
        console.log('[WebJS] API Base URL:', state.apiBaseUrl);
    } catch (error) {
        console.error('[WebJS] Failed to load config:', error);
        state.apiBaseUrl = 'http://localhost:5474';
    }

    // Cache DOM elements
    elements.photoInput = document.getElementById('photoInput');
    elements.photoPlaceholder = document.getElementById('photoPlaceholder');
    elements.photoGallery = document.getElementById('photoGallery');
    elements.photoItems = document.getElementById('photoItems');
    elements.ratingButtons = document.querySelectorAll('.rating-btn');
    elements.btnSave = document.getElementById('btnSave');
    elements.btnCancelFooter = document.getElementById('btnCancelFooter');
    elements.statusMessage = document.getElementById('statusMessage');
    elements.uploadProgress = document.getElementById('uploadProgress');

    console.log('[WebJS] Rating buttons found:', elements.ratingButtons.length);

    // Attach event listeners
    elements.photoInput.addEventListener('change', handlePhotoSelection);
    elements.ratingButtons.forEach(btn => {
        btn.addEventListener('click', () => selectRating(parseInt(btn.dataset.rating)));
    });
    elements.btnSave.addEventListener('click', handleSave);
    elements.btnCancelFooter.addEventListener('click', handleCancel);
    
    // Set initial rating to unknown (0) - ensure DOM is fully ready
    await new Promise(resolve => setTimeout(resolve, 50));
    selectRating(0);
    console.log('[WebJS] Initial rating set to:', state.selectedRating);
    console.log('[WebJS] Application initialized successfully');
}

// Handle photo selection
async function handlePhotoSelection(e) {
    const files = Array.from(e.target.files);
    const maxFileSize = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
        if (file.size === 0 || file.size > maxFileSize) continue;

        try {
            const dataUrl = await readFileAsDataURL(file);
            state.photos.push({
                dataUrl,
                file
            });
        } catch (error) {
            console.error('[WebJS] Error reading file:', error);
        }
    }

    updatePhotoDisplay();
    
    // Delay clearing to fix Android issue (same fix as Blazor version)
    setTimeout(() => {
        elements.photoInput.value = '';
    }, 100);
}

// Read file as data URL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Update photo display
function updatePhotoDisplay() {
    if (state.photos.length === 0) {
        elements.photoPlaceholder.style.display = 'block';
        elements.photoGallery.style.display = 'none';
    } else {
        elements.photoPlaceholder.style.display = 'none';
        elements.photoGallery.style.display = 'block';
        
        elements.photoItems.innerHTML = state.photos.map((photo, index) => `
            <div class="photo-item">
                <img src="${photo.dataUrl}" alt="Recipe photo" />
                <button class="photo-remove" data-index="${index}" aria-label="Remove photo"></button>
            </div>
        `).join('');

        // Attach remove handlers
        document.querySelectorAll('.photo-remove').forEach(btn => {
            btn.addEventListener('click', () => removePhoto(parseInt(btn.dataset.index)));
        });
    }
}

// Remove photo
function removePhoto(index) {
    state.photos.splice(index, 1);
    updatePhotoDisplay();
}

// Select rating
function selectRating(rating) {
    console.log('[WebJS] Selecting rating:', rating);
    state.selectedRating = rating;
    if (!elements.ratingButtons || elements.ratingButtons.length === 0) {
        console.warn('[WebJS] Rating buttons not initialized yet');
        return;
    }
    elements.ratingButtons.forEach(btn => {
        const btnRating = parseInt(btn.dataset.rating);
        if (btnRating === rating) {
            btn.classList.add('active');
            console.log('[WebJS] Set button', btnRating, 'to active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Show status message
function showStatus(message, isError = false) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `alert alert-${isError ? 'danger' : 'success'}`;
    elements.statusMessage.style.display = 'block';
}

// Hide status message
function hideStatus() {
    elements.statusMessage.style.display = 'none';
}

// Handle save
async function handleSave() {
    console.log('[WebJS] Save clicked. Photos:', state.photos.length, 'Rating:', state.selectedRating);
    hideStatus();

    if (state.photos.length === 0) {
        showStatus('Please add at least one photo.', true);
        return;
    }

    console.log('[WebJS] Validation passed, uploading recipe...');
    state.isUploading = true;
    elements.uploadProgress.style.display = 'flex';
    elements.btnSave.disabled = true;

    try {
        const formData = new FormData();
        formData.append('rating', state.selectedRating.toString());

        state.photos.forEach((photo, index) => {
            formData.append('images', photo.file);
            console.log(`[WebJS] Added photo ${index + 1} to form data`);
        });

        console.log('[WebJS] Posting to:', `${state.apiBaseUrl}/api/recipes`);
        const response = await fetch(`${state.apiBaseUrl}/api/recipes`, {
            method: 'POST',
            body: formData
        });

        console.log('[WebJS] Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('[WebJS] Recipe saved successfully:', result);
            showStatus('Recipe saved successfully!');
            
            // Reset form after delay
            setTimeout(() => {
                handleCancel();
            }, 1500);
        } else {
            const errorText = await response.text();
            console.error('[WebJS] Save failed:', errorText);
            showStatus(`Failed to save recipe: ${errorText}`, true);
        }
    } catch (error) {
        console.error('[WebJS] Error saving recipe:', error);
        showStatus(`Error: ${error.message}`, true);
    } finally {
        state.isUploading = false;
        elements.uploadProgress.style.display = 'none';
        elements.btnSave.disabled = false;
    }
}

// Handle cancel
function handleCancel() {
    console.log('[WebJS] Cancel clicked, resetting form');
    state.photos = [];
    state.selectedRating = 0;
    updatePhotoDisplay();
    selectRating(0);
    hideStatus();
    elements.photoInput.value = '';
}

// Initialize when DOM is ready
console.log('[WebJS] Loading app.js...');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
