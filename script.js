const colorInput = document.getElementById('colorInput');
const colorPreview = document.getElementById('colorPreview');
const hexValue = document.getElementById('hexValue');
const hexBox = document.getElementById('hexBox');
const tooltip = document.getElementById('tooltip');
const fileButton = document.getElementById('fileButton');
const pickButton = document.getElementById('pickButton');
const imageBox = document.getElementById('imageBox');

let currentImage = null;

colorInput.addEventListener('input', (e) => {
  const color = e.target.value;
  colorPreview.style.background = color;
  hexValue.textContent = color;
});

hexBox.addEventListener('click', () => {
  const hex = hexValue.textContent;
  navigator.clipboard.writeText(hex).then(() => {
    tooltip.classList.add('show');
    setTimeout(() => tooltip.classList.remove('show'), 1500);
  });
});

fileButton.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = false;
  input.click();
  input.addEventListener('change', () => {
    if (input.files.length > 0) {
      imageBox.style.display = 'flex';
      pickButton.style.display = 'flex';
      imageBox.innerHTML = '';
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.cursor = 'crosshair';
        currentImage = img;
        imageBox.appendChild(img);
      };
      reader.readAsDataURL(input.files[0]);
    }
  });
});

pickButton.addEventListener('click', () => {
  if (currentImage) {
    tooltip.textContent = 'Click on the image to pick a color';
    tooltip.classList.add('show');
    setTimeout(() => tooltip.classList.remove('show'), 2000);
  }
});

imageBox.addEventListener('click', (e) => {
  if (e.target.tagName === 'IMG') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = e.target.naturalWidth;
    canvas.height = e.target.naturalHeight;
    ctx.drawImage(e.target, 0, 0);
    
    const rect = e.target.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / rect.width * canvas.width);
    const y = Math.floor((e.clientY - rect.top) / rect.height * canvas.height);
    
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(x => {
      const h = x.toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('');
    
    colorPreview.style.background = hex;
    hexValue.textContent = hex;
    colorInput.value = hex;
    
    tooltip.textContent = 'Color picked!';
    tooltip.classList.add('show');
    setTimeout(() => {
      tooltip.classList.remove('show');
      tooltip.textContent = 'Copied to clipboard';
    }, 1500);
  }
});