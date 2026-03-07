const colorInput = document.getElementById('colorInput');
const colorPreview = document.getElementById('colorPreview');
const hexValue = document.getElementById('hexValue');
const hexBox = document.getElementById('hexBox');
const tooltip = document.getElementById('tooltip');
const fileButton = document.getElementById('fileButton');
const pickButton = document.getElementById('pickButton');
const imageBox = document.getElementById('imageBox');
const zoomLens = document.getElementById('zoomLens');
const zoomCanvas = document.getElementById('zoomCanvas');
const zoomCtx = zoomCanvas.getContext('2d');

let offscreenCanvas = null;
let offscreenCtx = null;
let displayCanvas = null;
let isPicking = false;
let tooltipTimeout = null;

function showTooltip(msg, duration = 1500) {
    tooltip.textContent = msg;
    tooltip.classList.add('show');
    clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(() => {
        tooltip.classList.remove('show');
        tooltip.textContent = 'Copied to clipboard';
    }, duration);
}

colorInput.addEventListener('input', (e) => {
    const color = e.target.value;
    colorPreview.style.background = color;
    hexValue.textContent = color;
});

hexBox.addEventListener('click', () => {
    const text = hexValue.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showTooltip('Copied to clipboard')).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
});

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showTooltip('Copied to clipboard');
}

function loadImage(src) {
    imageBox.innerHTML = '';
    imageBox.style.display = 'flex';
    pickButton.style.display = 'flex';

    offscreenCanvas = document.createElement('canvas');
    offscreenCtx = offscreenCanvas.getContext('2d');

    displayCanvas = document.createElement('canvas');
    displayCanvas.style.cursor = isPicking ? 'crosshair' : 'default';
    imageBox.appendChild(displayCanvas);

    const img = new Image();
    img.onload = () => {
        offscreenCanvas.width = img.naturalWidth;
        offscreenCanvas.height = img.naturalHeight;
        offscreenCtx.drawImage(img, 0, 0);

        const aspect = img.naturalWidth / img.naturalHeight;
        let drawW = 280, drawH = 280;
        if (aspect > 1) { drawH = Math.round(280 / aspect); }
        else if (aspect < 1) { drawW = Math.round(280 * aspect); }

        displayCanvas.width = drawW;
        displayCanvas.height = drawH;
        displayCanvas.style.width = drawW + 'px';
        displayCanvas.style.height = drawH + 'px';

        const ctx = displayCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, drawW, drawH);
    };
    img.src = src;
}

fileButton.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.click();
    input.addEventListener('change', () => {
        if (input.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (e) => loadImage(e.target.result);
            reader.readAsDataURL(input.files[0]);
        }
    });
});

document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (ev) => loadImage(ev.target.result);
            reader.readAsDataURL(file);
            break;
        }
    }
});

pickButton.addEventListener('click', () => {
    if (!displayCanvas) return;
    isPicking = !isPicking;
    pickButton.classList.toggle('active', isPicking);
    displayCanvas.style.cursor = isPicking ? 'crosshair' : 'default';
    if (isPicking) {
        showTooltip('Click on image to pick color', 2000);
    } else {
        zoomLens.style.display = 'none';
    }
});

function getPixelColor(clientX, clientY) {
    if (!displayCanvas || !offscreenCanvas) return null;
    const rect = displayCanvas.getBoundingClientRect();
    const scaleX = offscreenCanvas.width / rect.width;
    const scaleY = offscreenCanvas.height / rect.height;
    const x = Math.floor((clientX - rect.left) * scaleX);
    const y = Math.floor((clientY - rect.top) * scaleY);
    if (x < 0 || y < 0 || x >= offscreenCanvas.width || y >= offscreenCanvas.height) return null;
    const pixel = offscreenCtx.getImageData(x, y, 1, 1).data;
    return {
        hex: '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join(''),
        x, y
    };
}

function updateZoomLens(clientX, clientY) {
    if (!displayCanvas || !offscreenCanvas) return;

    const rect = displayCanvas.getBoundingClientRect();
    const scaleX = offscreenCanvas.width / rect.width;
    const scaleY = offscreenCanvas.height / rect.height;
    const srcX = Math.floor((clientX - rect.left) * scaleX);
    const srcY = Math.floor((clientY - rect.top) * scaleY);

    const zoom = 8;
    const radius = 7;
    const size = radius * 2 + 1;

    zoomCtx.clearRect(0, 0, 120, 120);
    zoomCtx.imageSmoothingEnabled = false;

    zoomCtx.save();
    zoomCtx.beginPath();
    zoomCtx.arc(60, 60, 60, 0, Math.PI * 2);
    zoomCtx.clip();

    zoomCtx.drawImage(
        offscreenCanvas,
        srcX - radius, srcY - radius, size, size,
        0, 0, 120, 120
    );
    zoomCtx.restore();

    const lensSize = 120;
    const offset = 2;
    let lx = clientX + offset;
    let ly = clientY - lensSize - offset;
    if (lx + lensSize > window.innerWidth) lx = clientX - lensSize - offset;
    if (ly < 0) ly = clientY + offset;

    zoomLens.style.left = lx + 'px';
    zoomLens.style.top = ly + 'px';
    zoomLens.style.display = 'block';
}

document.addEventListener('mousemove', (e) => {
    if (!isPicking || !displayCanvas) return;
    const rect = displayCanvas.getBoundingClientRect();
    const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                   e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (inside) {
        updateZoomLens(e.clientX, e.clientY);
        const result = getPixelColor(e.clientX, e.clientY);
        if (result) {
            colorPreview.style.background = result.hex;
            hexValue.textContent = result.hex;
            colorInput.value = result.hex;
        }
    } else {
        zoomLens.style.display = 'none';
    }
});

document.addEventListener('click', (e) => {
    if (!isPicking || !displayCanvas) return;
    const rect = displayCanvas.getBoundingClientRect();
    const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                   e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inside) return;

    const result = getPixelColor(e.clientX, e.clientY);
    if (result) {
        colorPreview.style.background = result.hex;
        hexValue.textContent = result.hex;
        colorInput.value = result.hex;
        isPicking = false;
        pickButton.classList.remove('active');
        displayCanvas.style.cursor = 'default';
        zoomLens.style.display = 'none';
        showTooltip('Color picked!');
    }
});