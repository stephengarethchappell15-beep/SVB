/**
 * Image compression utility for uploading documents, receipts, and avatars
 * Ensures images fit well within the Firestore 1MB document size limit
 */
export function compressImage(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.6
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const dataUrl = readerEvent.target?.result as string;
      if (!dataUrl) {
        resolve('');
        return;
      }

      // If it's not an image (e.g. PDF)
      if (!file.type.startsWith('image/')) {
        if (dataUrl.length > 300000) {
          // If PDF is too large to fit safely in Firestore document with other fields
          console.warn('Non-image file exceeds safe Firestore document size limit');
        }
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl.length > 250000 ? dataUrl.slice(0, 250000) : dataUrl);
          return;
        }

        // Fill white background for transparent PNGs converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let compressed = canvas.toDataURL('image/jpeg', quality);

        // If still > 200,000 characters (~150KB), re-encode with lower quality/size
        if (compressed.length > 200000) {
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = Math.round(canvas.width * 0.7);
          smallCanvas.height = Math.round(canvas.height * 0.7);
          const smallCtx = smallCanvas.getContext('2d');
          if (smallCtx) {
            smallCtx.fillStyle = '#FFFFFF';
            smallCtx.fillRect(0, 0, smallCanvas.width, smallCanvas.height);
            smallCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
            compressed = smallCanvas.toDataURL('image/jpeg', 0.45);
          }
        }

        resolve(compressed);
      };

      img.onerror = () => {
        resolve(dataUrl.length > 200000 ? dataUrl.slice(0, 200000) : dataUrl);
      };

      img.src = dataUrl;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

