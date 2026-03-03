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
    let isDemoMode = false;

    // IMPORTANT: Replace with your actual remove.bg API key
    // Get a free API key from: https://www.remove.bg/api
    const REMOVE_BG_API_KEY = 'JPKGHDNFb4qqxzSSEjidzJfk'; // Replace with your actual key
    
    // Check if API key is set
    if (!REMOVE_BG_API_KEY || REMOVE_BG_API_KEY === 'YOUR_API_KEY_HERE') {
        console.warn('No valid API key found. Running in demo mode.');
        isDemoMode = true;
    }

    // Supported image formats
    const SUPPORTED_FORMATS = {
        'image/jpeg': 'JPG',
        'image/jpg': 'JPG',
        'image/png': 'PNG',
        'image/webp': 'WEBP',
        'image/gif': 'GIF',
        'image/bmp': 'BMP',
        'image/tiff': 'TIFF',
        'image/heic': 'HEIC',
        'image/heif': 'HEIF',
        'image/avif': 'AVIF',
        'image/svg+xml': 'SVG'
    };

    // Utility Functions
    function showLoading(isVisible, message = 'Processing image...') {
        loadingText.textContent = message;
        loadingOverlay.classList.toggle('hidden', !isVisible);
        removeBackgroundBtn.disabled = isVisible;
        downloadBtn.disabled = isVisible;
        resetBtn.disabled = isVisible;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 MB';
        const mb = bytes / (1024 * 1024);
        return mb.toFixed(2) + ' MB';
    }

    function getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    function isImageFile(file) {
        // Check by MIME type
        if (file.type.startsWith('image/')) {
            return true;
        }
        
        // Check by file extension for formats that might not have proper MIME type
        const extension = getFileExtension(file.name);
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif', 'heic', 'heif', 'avif', 'svg'];
        return imageExtensions.includes(extension);
    }

    function getFormatName(file) {
        if (SUPPORTED_FORMATS[file.type]) {
            return SUPPORTED_FORMATS[file.type];
        }
        
        // Try to get from extension
        const extension = getFileExtension(file.name).toUpperCase();
        return extension || 'Unknown';
    }

    function updateStats(file, width = 0, height = 0) {
        if (file) {
            fileSizeElement.textContent = formatFileSize(file.size);
            formatElement.textContent = getFormatName(file);
        }
        
        if (width && height) {
            dimensionsElement.textContent = `${width}×${height}`;
        } else {
            dimensionsElement.textContent = '0x0';
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
        
        if (processedImageUrl) {
            URL.revokeObjectURL(processedImageUrl);
            processedImageUrl = null;
        }
        
        // Reset stats
        fileSizeElement.textContent = '0 MB';
        dimensionsElement.textContent = '0x0';
        formatElement.textContent = '-';
        
        // Clear file input
        imageUpload.value = '';
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
                fileError.textContent = 'Could not load image preview. The format might not be supported.';
                resetUI();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // DEMO MODE: Simulate background removal (for testing without API key)
    async function simulateBackgroundRemoval(file) {
        return new Promise((resolve, reject) => {
            showLoading(true, 'Demo mode: Simulating background removal...');
            
            setTimeout(() => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        // Create a canvas to simulate background removal
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        
                        // Draw the original image
                        ctx.drawImage(img, 0, 0);
                        
                        // Get image data to create a simple "background removal" effect
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const data = imageData.data;
                        
                        // Simple edge detection to simulate background removal
                        // This creates a sketch-like effect for demo purposes
                        for (let i = 0; i < data.length; i += 4) {
                            // Make edges darker and background semi-transparent
                            if (Math.random() > 0.7) {
                                data[i + 3] = 255; // Keep opaque
                            } else {
                                data[i + 3] = 200; // Slightly transparent
                            }
                        }
                        
                        ctx.putImageData(imageData, 0, 0);
                        
                        // Convert to blob
                        canvas.toBlob((blob) => {
                            resolve(blob);
                        }, 'image/png');
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }, 2000); // Simulate processing time
        });
    }

    // Convert image to supported format if needed
    async function convertToSupportedFormat(file) {
        // If it's already a supported format for the API, return as is
        const supportedApiFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (supportedApiFormats.includes(file.type)) {
            return file;
        }

        // Convert to PNG for unsupported formats
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const convertedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.png', {
                                type: 'image/png'
                            });
                            resolve(convertedFile);
                        } else {
                            reject(new Error('Failed to convert image format'));
                        }
                    }, 'image/png');
                };
                img.onerror = () => reject(new Error('Failed to load image for conversion'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    // Event Handlers
    imageUpload.addEventListener('change', async (event) => {
        fileError.textContent = '';
        const file = event.target.files[0];
        
        if (file) {
            if (!isImageFile(file)) {
                fileError.textContent = 'Please upload a valid image file (JPG, PNG, WEBP, GIF, BMP, TIFF, HEIC, AVIF, SVG).';
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
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            imageUpload.files = files;
            imageUpload.dispatchEvent(new Event('change'));
        }
    });

    // Remove Background Button
    removeBackgroundBtn.addEventListener('click', async () => {
        if (!currentFile) {
            fileError.textContent = 'Please upload an image first.';
            return;
        }

        // Check if in demo mode
        if (isDemoMode) {
            fileError.textContent = '⚠️ Demo Mode: Using simulation. Add a valid API key for real background removal.';
            
            try {
                showLoading(true, 'Demo mode: Processing...');
                
                // Simulate background removal
                const blob = await simulateBackgroundRemoval(currentFile);
                
                // Clean up previous URL if exists
                if (processedImageUrl) {
                    URL.revokeObjectURL(processedImageUrl);
                }
                
                processedImageUrl = URL.createObjectURL(blob);

                originalCanvas.classList.add('hidden');
                processedImageDisplay.src = processedImageUrl;
                processedImageDisplay.classList.remove('hidden');
                previewPlaceholder.classList.add('hidden');

                removeBackgroundBtn.disabled = true;
                downloadBtn.classList.remove('hidden');
                
                // Update format for downloaded file
                formatElement.textContent = 'PNG (Demo)';
                
            } catch (error) {
                console.error('Demo processing failed:', error);
                fileError.textContent = `Demo processing failed: ${error.message}`;
            } finally {
                showLoading(false);
            }
            
            return;
        }

        // Real API mode
        showLoading(true, 'Preparing image...');

        try {
            // Convert image to supported format if needed
            let fileToProcess = currentFile;
            const formatName = getFormatName(currentFile);
            
            if (!['JPG', 'PNG', 'WEBP'].includes(formatName)) {
                showLoading(true, `Converting ${formatName} to PNG format...`);
                fileToProcess = await convertToSupportedFormat(currentFile);
            }

            showLoading(true, 'Removing background with AI...');

            const formData = new FormData();
            formData.append('image_file', fileToProcess);
            formData.append('size', 'auto');

            const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                method: 'POST',
                headers: {
                    'X-Api-Key': REMOVE_BG_API_KEY,
                },
                body: formData,
            });

            if (!response.ok) {
                let errorMessage = `API Error: ${response.status}`;
                
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.errors && errorData.errors.length > 0) {
                        errorMessage += ` - ${errorData.errors[0].title}`;
                    }
                } catch (e) {
                    errorMessage += ` - ${response.statusText}`;
                }
                
                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            
            // Clean up previous URL if exists
            if (processedImageUrl) {
                URL.revokeObjectURL(processedImageUrl);
            }
            
            processedImageUrl = URL.createObjectURL(blob);

            originalCanvas.classList.add('hidden');
            processedImageDisplay.src = processedImageUrl;
            processedImageDisplay.classList.remove('hidden');
            previewPlaceholder.classList.add('hidden');

            removeBackgroundBtn.disabled = true;
            downloadBtn.classList.remove('hidden');
            
            // Update format for downloaded file
            formatElement.textContent = 'PNG';

        } catch (error) {
            console.error('Background removal failed:', error);
            fileError.textContent = `Background removal failed: ${error.message}`;
            
            // Offer demo mode as fallback
            if (!isDemoMode) {
                fileError.textContent += ' Click Remove Background again to try demo mode.';
                isDemoMode = true;
            }
        } finally {
            showLoading(false);
        }
    });

    // Download Button
    downloadBtn.addEventListener('click', () => {
        if (processedImageUrl) {
            const link = document.createElement('a');
            const originalName = currentFile ? currentFile.name.replace(/\.[^/.]+$/, '') : 'image';
            link.download = `${originalName}_nobg.png`;
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
    
    // Show API key status
    if (isDemoMode) {
        const apiInfo = document.querySelector('.api-info p');
        if (apiInfo) {
            apiInfo.innerHTML = '<i class="fas fa-info-circle"></i> ⚠️ Demo Mode Active - Add your remove.bg API key for real background removal';
        }
    }
});
