 document.addEventListener('DOMContentLoaded', () => {
            const imageUpload = document.getElementById('imageUpload');
            const uploadArea = document.getElementById('uploadArea');
            const fileError = document.getElementById('fileError');
            const originalCanvas = document.getElementById('originalCanvas');
            const ctx = originalCanvas.getContext('2d');
            const processedImageDisplay = document.getElementById('processedImageDisplay');
            const previewPlaceholder = document.getElementById('previewPlaceholder');
            const removeBackgroundBtn = document.getElementById('removeBackgroundBtn');
            const downloadBtn = document.getElementById('downloadBtn');
            const resetBtn = document.getElementById('resetBtn');
            const loadingOverlay = document.getElementById('loadingOverlay');
            const loadingText = document.getElementById('loadingText');
            const fileSizeElement = document.getElementById('fileSize');
            const dimensionsElement = document.getElementById('dimensions');
            const formatElement = document.getElementById('format');

            let currentFile = null;
            let processedImageUrl = null;

            // IMPORTANT: Replace with your actual remove.bg API key
            const REMOVE_BG_API_KEY = 'JPKGHDNFb4qqxzSSEjidzJfk'; // Replace with your actual key

            // Utility Functions
            function showLoading(isVisible, message = 'Processing image...') {
                loadingText.textContent = message;
                loadingOverlay.classList.toggle('hidden', !isVisible);
                removeBackgroundBtn.disabled = isVisible;
                downloadBtn.disabled = isVisible;
                resetBtn.disabled = isVisible;
            }

            function updateStats(file, width = 0, height = 0) {
                if (file) {
                    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
                    fileSizeElement.textContent = `${sizeInMB} MB`;
                    formatElement.textContent = file.type.split('/')[1].toUpperCase();
                }
                
                if (width && height) {
                    dimensionsElement.textContent = `${width}×${height}`;
                }
            }

            function resetUI() {
                ctx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
                originalCanvas.width = 0;
                originalCanvas.height = 0;
                originalCanvas.classList.add('hidden');
                processedImageDisplay.classList.add('hidden');
                processedImageDisplay.src = '';

                previewPlaceholder.classList.remove('hidden');
                removeBackgroundBtn.disabled = true;
                downloadBtn.classList.add('hidden');
                fileError.textContent = '';
                currentFile = null;
                processedImageUrl = null;
                
                // Reset stats
                fileSizeElement.textContent = '0 MB';
                dimensionsElement.textContent = '0x0';
                formatElement.textContent = '-';
            }

            function displayOriginalImage(file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const maxWidth = originalCanvas.parentElement.clientWidth;
                        const maxHeight = 400;

                        let width = img.width;
                        let height = img.height;

                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }

                        originalCanvas.width = width;
                        originalCanvas.height = height;
                        ctx.clearRect(0, 0, width, height);
                        ctx.drawImage(img, 0, 0, width, height);
                        originalCanvas.classList.remove('hidden');
                        previewPlaceholder.classList.add('hidden');
                        processedImageDisplay.classList.add('hidden');
                        
                        // Update stats with dimensions
                        updateStats(file, img.width, img.height);
                    };
                    img.onerror = () => {
                        fileError.textContent = 'Could not load image preview. Please try another file.';
                        resetUI();
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }

            // Event Handlers
            imageUpload.addEventListener('change', (event) => {
                fileError.textContent = '';
                const file = event.target.files[0];
                if (file) {
                    if (!file.type.startsWith('image/')) {
                        fileError.textContent = 'Please upload a valid image file (JPG, PNG, WEBP).';
                        resetUI();
                        return;
                    }
                    if (file.size > 12 * 1024 * 1024) {
                        fileError.textContent = 'Image size exceeds 12MB. Please upload a smaller image.';
                        resetUI();
                        return;
                    }
                    currentFile = file;
                    displayOriginalImage(file);
                    removeBackgroundBtn.disabled = false;
                    downloadBtn.classList.add('hidden');
                } else {
                    resetUI();
                }
            });

            // Drag and Drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                imageUpload.files = e.dataTransfer.files;
                imageUpload.dispatchEvent(new Event('change'));
            });

            // Remove Background Button
            removeBackgroundBtn.addEventListener('click', async () => {
                if (!currentFile) {
                    fileError.textContent = 'Please upload an image first.';
                    return;
                }

                if (REMOVE_BG_API_KEY === 'YOUR_REMOVE_BG_API_KEY' || !REMOVE_BG_API_KEY) {
                    fileError.textContent = 'Please set your remove.bg API key in script.js to enable removal.';
                    return;
                }

                showLoading(true, 'Removing background...');

                try {
                    const formData = new FormData();
                    formData.append('image_file', currentFile);
                    formData.append('size', 'auto');

                    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                        method: 'POST',
                        headers: {
                            'X-Api-Key': REMOVE_BG_API_KEY,
                        },
                        body: formData,
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
                        if (errorData && errorData.errors && errorData.errors.length > 0) {
                            errorMessage += ` - ${errorData.errors[0].title}`;
                            if (errorData.errors[0].code === 'credits_exceeded') {
                                errorMessage += ' (You may have run out of free credits or hit the rate limit.)';
                            }
                        }
                        throw new Error(errorMessage);
                    }

                    const blob = await response.blob();
                    processedImageUrl = URL.createObjectURL(blob);

                    originalCanvas.classList.add('hidden');
                    processedImageDisplay.src = processedImageUrl;
                    processedImageDisplay.classList.remove('hidden');
                    previewPlaceholder.classList.add('hidden');

                    removeBackgroundBtn.disabled = true;
                    downloadBtn.classList.remove('hidden');

                } catch (error) {
                    console.error('Background removal failed:', error);
                    fileError.textContent = `Background removal failed: ${error.message || 'Check console for details.'}`;
                    originalCanvas.classList.remove('hidden');
                    processedImageDisplay.classList.add('hidden');
                } finally {
                    showLoading(false);
                }
            });

            // Download Button
            downloadBtn.addEventListener('click', () => {
                if (processedImageUrl) {
                    const link = document.createElement('a');
                    link.download = `bg_removed_${Date.now()}.png`;
                    link.href = processedImageUrl;
                    link.click();
                } else {
                    fileError.textContent = 'No processed image to download.';
                }
            });

            // Reset Button
            resetBtn.addEventListener('click', () => {
                resetUI();
            });

            // Initial state setup
            resetUI();
        });