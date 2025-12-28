// Frontend JavaScript - Safe to put on GitHub Pages
// No API keys, no encryption logic exposed

const text = document.getElementById('text');
const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');

// Your backend API URL (change this after deployment)
const API_URL = 'https://your-backend-url.com'; // e.g., https://your-app.railway.app

const pixelSize = 2;
let pixels = [];

function initCanvas() {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    const fontSize = parseInt(window.getComputedStyle(text).fontSize);
    tempCanvas.width = text.offsetWidth;
    tempCanvas.height = text.offsetHeight;
    
    tempCtx.font = `${fontSize}px calibri, sans-serif`;
    tempCtx.fillStyle = 'white';
    tempCtx.textBaseline = 'top';
    tempCtx.fillText(text.textContent, 0, 0);
    
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    
    canvas.width = tempCanvas.width;
    canvas.height = tempCanvas.height;
    
    pixels = [];
    for (let y = 0; y < canvas.height; y += pixelSize) {
        for (let x = 0; x < canvas.width; x += pixelSize) {
            let hasPixel = false;
            for (let py = 0; py < pixelSize && y + py < canvas.height; py++) {
                for (let px = 0; px < pixelSize && x + px < canvas.width; px++) {
                    const index = ((y + py) * canvas.width + (x + px)) * 4;
                    if (imageData.data[index + 3] > 128) {
                        hasPixel = true;
                        break;
                    }
                }
                if (hasPixel) break;
            }
            
            if (hasPixel) {
                pixels.push({ x, y });
            }
        }
    }
}

function getRandomColor() {
    return `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;
}

function drawPixels() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    pixels.forEach(pixel => {
        ctx.fillStyle = getRandomColor();
        ctx.fillRect(pixel.x, pixel.y, pixelSize, pixelSize);
    });
}

initCanvas();
drawPixels();
setInterval(drawPixels, 3000);

window.addEventListener('resize', () => {
    initCanvas();
    drawPixels();
});

// Global variables
let currentMode = 'encrypt';
let currentSession = null;
let encryptedImageData = null;
let fileName = '';

window.addEventListener('DOMContentLoaded', () => {
    enableDragAndDrop(
        document.querySelector('.upload-area'),
        document.getElementById('file-input'),
        encryptFile
    );

    enableDragAndDrop(
        document.querySelector('.decrypt-area.decrypt-main'),
        document.getElementById('main-input'),
        loadMainImage
    );

    enableDragAndDrop(
        document.querySelector('.decrypt-area.decrypt-token'),
        document.getElementById('token-input'),
        loadTokenImage
    );
});

function setMode(mode) {
    currentMode = mode;
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    if (mode === 'encrypt') {
        document.getElementById('encrypt-panel').classList.remove('hidden');
        document.getElementById('decrypt-panel').classList.add('hidden');
    } else {
        document.getElementById('encrypt-panel').classList.add('hidden');
        document.getElementById('decrypt-panel').classList.remove('hidden');
    }
}

async function encryptFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const originalFileName = file.name.replace(/\.txt$/, '');
    const text = await file.text();
    
    processEncryption(text, originalFileName);
}

function encryptText() {
    const textInput = document.getElementById('text-input');
    const text = textInput.value.trim();
    
    if (!text) {
        alert('Please enter some text to encrypt!');
        return;
    }
    
    processEncryption(text, null);
    textInput.value = '';
}

async function processEncryption(text, originalFileName) {
    try {
        // Show loading state
        document.getElementById('encrypt-result').innerHTML = '<p>Encrypting...</p>';
        document.getElementById('encrypt-result').classList.remove('hidden');

        // Send to backend for encryption
        const response = await fetch(`${API_URL}/api/encrypt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                text: text,
                originalFileName: originalFileName
            })
        });

        if (!response.ok) {
            throw new Error('Encryption failed');
        }

        const data = await response.json();
        
        // Store session data
        currentSession = {
            sessionId: data.sessionId,
            fileName: originalFileName || data.fileName
        };
        
        fileName = currentSession.fileName;

        // Convert encrypted data to image
        encryptedImageData = pixelsToImage(data.encryptedImage);

        // Show result buttons
        document.getElementById('encrypt-result').innerHTML = `
            <div class="result-box">
                <h3>Encryption Complete!</h3>
                <div class="button-group">
                    <button class="btn btn-primary" onclick="downloadImage('encrypted')">
                        ⬇️ Download Encrypted Image
                    </button>
                    <button class="btn btn-payment" onclick="downloadImage('token')">
                        <svg class="coinbase-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z" fill="#0052FF"/>
                            <path d="M20 28C24.4183 28 28 24.4183 28 20C28 15.5817 24.4183 12 20 12C15.5817 12 12 15.5817 12 20C12 24.4183 15.5817 28 20 28Z" fill="white"/>
                            <path d="M17 20H23" stroke="#0052FF" stroke-width="2" stroke-linecap="round"/>
                            <path d="M20 17V23" stroke="#0052FF" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <span class="btn-content">
                            <span class="btn-text">Download Auth Token</span>
                            <span class="btn-price">$0.60</span>
                        </span>
                    </button>
                </div>
                <p class="warning">⚠️ Keep both images safe! You need both to decrypt your document.</p>
            </div>
        `;

    } catch (error) {
        console.error('Encryption error:', error);
        alert('Failed to encrypt. Please try again.');
        document.getElementById('encrypt-result').classList.add('hidden');
    }
}

function pixelsToImage(imageData) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');

    imageData.pixels.forEach((row, y) => {
        row.forEach((color, x) => {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
        });
    });

    return canvas.toDataURL('image/png');
}

function downloadImage(type) {
    if (type === 'encrypted') {
        const link = document.createElement('a');
        link.download = `${fileName}_encrypted.png`;
        link.href = encryptedImageData;
        link.click();
    } else {
        initiatePayment();
    }
}

async function initiatePayment() {
    if (!currentSession) {
        alert('Session expired. Please encrypt again.');
        return;
    }

    const modal = document.getElementById('payment-modal');
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
    
    document.getElementById('payment-status').innerHTML = '<p>Preparing your payment...</p>';
    
    try {
        const response = await fetch(`${API_URL}/api/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: currentSession.sessionId,
                fileName: currentSession.fileName
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create payment');
        }

        const data = await response.json();
        
        currentSession.chargeId = data.chargeId;
        
        document.getElementById('payment-status').innerHTML = `
            <p>Please complete your payment to download the auth token.</p>
            <p class="payment-amount">$0.60 USD</p>
            <a href="${data.hostedUrl}" target="_blank" class="btn btn-primary" style="display: inline-block; text-decoration: none; margin: 1rem 0;">
                Pay with Crypto
            </a>
            <p class="payment-info">After payment, the token will download automatically.</p>
            <p class="payment-info" style="margin-top: 0.5rem;">Checking payment status...</p>
        `;
        
        pollPaymentStatus(data.chargeId);

    } catch (error) {
        console.error('Payment error:', error);
        document.getElementById('payment-status').innerHTML = `
            <p style="color: #ef4444;">Error initiating payment. Please try again.</p>
            <button class="btn btn-secondary" onclick="closePaymentModal()">Close</button>
        `;
    }
}

async function pollPaymentStatus(chargeId) {
    const maxAttempts = 60;
    let attempts = 0;
    
    const checkStatus = setInterval(async () => {
        attempts++;
        
        try {
            const response = await fetch(`${API_URL}/api/check-payment/${chargeId}`);
            
            if (!response.ok) {
                throw new Error('Failed to check payment');
            }

            const data = await response.json();
            
            console.log('Payment status:', data.status);
            
            if (data.status === 'COMPLETED' || data.status === 'CONFIRMED' || data.payments.length > 0) {
                clearInterval(checkStatus);
                await downloadToken();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkStatus);
                document.getElementById('payment-status').innerHTML += `
                    <p style="color: #f59e0b;">Payment is taking longer than expected.</p>
                    <button class="btn btn-secondary" onclick="closePaymentModal()" style="margin-top: 0.5rem;">Close</button>
                `;
            }
        } catch (error) {
            console.error('Error checking payment:', error);
            clearInterval(checkStatus);
            document.getElementById('payment-status').innerHTML = `
                <p style="color: #ef4444;">Error checking payment status.</p>
                <button class="btn btn-secondary" onclick="closePaymentModal()" style="margin-top: 0.5rem;">Close</button>
            `;
        }
    }, 5000);
}

async function downloadToken() {
    try {
        const response = await fetch(`${API_URL}/api/download-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: currentSession.sessionId,
                chargeId: currentSession.chargeId
            })
        });

        if (!response.ok) {
            throw new Error('Payment not confirmed');
        }

        const data = await response.json();
        
        // Convert token data to image
        const tokenCanvas = document.createElement('canvas');
        tokenCanvas.width = data.tokenData.length;
        tokenCanvas.height = 1;
        const tokenCtx = tokenCanvas.getContext('2d');

        data.tokenData.forEach((color, x) => {
            tokenCtx.fillStyle = color;
            tokenCtx.fillRect(x, 0, 1, 1);
        });

        const tokenImageData = tokenCanvas.toDataURL('image/png');
        
        // Download
        const link = document.createElement('a');
        link.download = `Auth_token_for_${data.fileName}.png`;
        link.href = tokenImageData;
        link.click();
        
        document.getElementById('payment-status').innerHTML = `
            <p style="color: #22c55e;">✓ Payment confirmed!</p>
            <p>Your auth token has been downloaded.</p>
            <button class="btn btn-success" onclick="closePaymentModal()">Close</button>
        `;

    } catch (error) {
        console.error('Token download error:', error);
        document.getElementById('payment-status').innerHTML = `
            <p style="color: #ef4444;">Failed to download token. Please contact support.</p>
            <button class="btn btn-secondary" onclick="closePaymentModal()">Close</button>
        `;
    }
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.style.display = 'none';
    modal.classList.add('hidden');
    document.getElementById('payment-status').innerHTML = '<p>Preparing your payment...</p>';
}

// Decrypt functionality (client-side only, no server needed)
let mainImageData = null;
let tokenImageData = null;

function loadMainImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        mainImageData = e.target.result;
        document.getElementById('main-status').classList.remove('hidden');
        checkDecryptReady();
    };
    reader.readAsDataURL(file);
}

function loadTokenImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        tokenImageData = e.target.result;
        document.getElementById('token-status').classList.remove('hidden');
        checkDecryptReady();
    };
    reader.readAsDataURL(file);
}

function checkDecryptReady() {
    if (mainImageData && tokenImageData) {
        document.getElementById('decrypt-btn').classList.remove('hidden');
    }
}

// Decryption stays client-side (safe after purchase)
async function decryptImages() {
    try {
        const tokenImage = new Image();
        await new Promise((resolve, reject) => {
            tokenImage.onload = resolve;
            tokenImage.onerror = reject;
            tokenImage.src = tokenImageData;
        });

        const tokenCanvas = document.createElement('canvas');
        tokenCanvas.width = tokenImage.width;
        tokenCanvas.height = tokenImage.height;
        const tokenCtx = tokenCanvas.getContext('2d');
        tokenCtx.drawImage(tokenImage, 0, 0);

        const colorToChar = {};
        const tokenData = tokenCtx.getImageData(0, 0, tokenImage.width, 1).data;

        const CHARACTER_ORDER = [
            '.', ',', ';', ':', '!', '?', "'", '"', '+', '-', '*', '/', '=', '<', '>', 
            '(', ')', '[', ']', '{', '}', '@', '#', '$', '%', '^', '&', '_', '~', '`', '|', '\\',
            '9', '8', '7', '6', '5', '4', '3', '2', '1', '0',
            'z', 'y', 'x', 'w', 'v', 'u', 't', 's', 'r', 'q', 'p', 'o', 'n', 'm', 'l', 'k', 'j', 'i', 'h', 'g', 'f', 'e', 'd', 'c', 'b', 'a',
            'ö', 'ä', 'å'
        ];

        CHARACTER_ORDER.forEach((char, i) => {
            const offset = i * 4;
            const color = '#' + ((tokenData[offset] << 16) | (tokenData[offset + 1] << 8) | tokenData[offset + 2]).toString(16).padStart(6, '0');
            colorToChar[color] = char;
        });

        const lastOffset = (tokenImage.width - 1) * 4;
        const spaceColor = '#' + ((tokenData[lastOffset] << 16) | (tokenData[lastOffset + 1] << 8) | tokenData[lastOffset + 2]).toString(16).padStart(6, '0');
        colorToChar[spaceColor] = ' ';

        const mainImage = new Image();
        await new Promise((resolve, reject) => {
            mainImage.onload = resolve;
            mainImage.onerror = reject;
            mainImage.src = mainImageData;
        });

        const mainCanvas = document.createElement('canvas');
        mainCanvas.width = mainImage.width;
        mainCanvas.height = mainImage.height;
        const mainCtx = mainCanvas.getContext('2d');
        mainCtx.drawImage(mainImage, 0, 0);

        const imageData = mainCtx.getImageData(0, 0, mainImage.width, mainImage.height).data;

        let decodedText = '';
        for (let y = 0; y < mainImage.height; y++) {
            for (let x = 0; x < mainImage.width; x++) {
                const offset = (y * mainImage.width + x) * 4;
                const color = '#' + ((imageData[offset] << 16) | (imageData[offset + 1] << 8) | imageData[offset + 2]).toString(16).padStart(6, '0');

                if (color === '#000000') {
                    decodedText += '\n';
                    break;
                }

                const char = colorToChar[color];
                if (char) {
                    decodedText += char;
                }
            }
        }

        document.getElementById('decrypted-text').value = decodedText;
        document.getElementById('decrypt-result').classList.remove('hidden');

    } catch (error) {
        alert('Error decrypting images: ' + error.message);
    }
}

function downloadText() {
    const text = document.getElementById('decrypted-text').value;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `decoded_${new Date().getTime()}.txt`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}

function enableDragAndDrop(zone, input, onFile) {
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.style.borderColor = '#38bdf8';
    });

    zone.addEventListener('dragleave', () => {
        zone.style.borderColor = '';
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.style.borderColor = '';

        const file = e.dataTransfer.files[0];
        if (!file) return;

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;

        onFile({ target: input });
    });
}