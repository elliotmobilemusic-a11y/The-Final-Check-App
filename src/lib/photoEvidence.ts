import type { AuditPhoto } from '../types';
import { uid } from './utils';

const MAX_DIMENSION = 1440;
const OUTPUT_TYPE = 'image/jpeg';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function loadImage(dataUrl: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not process one of the selected images.'));
    image.src = dataUrl;
  });
}

async function compressImage(file: File) {
  const dataUrl = await fileToDataUrl(file);
  const image = await loadImage(dataUrl);
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    return dataUrl;
  }

  context.drawImage(image, 0, 0, width, height);

  let quality = 0.82;
  let output = canvas.toDataURL(OUTPUT_TYPE, quality);

  while (output.length > 1_400_000 && quality > 0.45) {
    quality -= 0.08;
    output = canvas.toDataURL(OUTPUT_TYPE, quality);
  }

  return output;
}

export async function prepareAuditPhotos(
  files: File[],
  section: string,
  sectionLabel: string
): Promise<AuditPhoto[]> {
  const prepared: AuditPhoto[] = [];

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const imageDataUrl = await compressImage(file);

    prepared.push({
      id: uid('photo'),
      section,
      sectionLabel,
      caption: '',
      imageDataUrl,
      createdAt: new Date().toISOString()
    });
  }

  return prepared;
}

export function renderAuditPhotoGallery(
  photos: AuditPhoto[],
  section: string,
  emptyCopy = 'No photo evidence recorded for this section.'
) {
  const sectionPhotos = photos.filter((photo) => photo.section === section && photo.imageDataUrl);

  if (!sectionPhotos.length) {
    return emptyCopy
      ? `<p class="report-empty-note muted-copy">${escapeHtml(emptyCopy)}</p>`
      : '';
  }

  return `
    <section class="report-photo-section">
      <div class="report-photo-section-heading">
        <span>Evidence photos</span>
        <strong>${escapeHtml(sectionPhotos[0]?.sectionLabel || 'Section evidence')}</strong>
      </div>
      <div class="report-photo-grid ${sectionPhotos.length > 2 ? 'report-photo-grid-featured' : ''}">
      ${sectionPhotos
        .map(
          (photo) => `
            <figure class="report-photo-card">
              <img src="${photo.imageDataUrl}" alt="${escapeHtml(photo.caption || `${photo.sectionLabel} evidence photo`)}" />
              <figcaption>
                <strong>${escapeHtml(photo.sectionLabel)}</strong>
                <span>${escapeHtml(photo.caption || 'Evidence photo')}</span>
              </figcaption>
            </figure>
          `
        )
        .join('')}
      </div>
    </section>
  `;
}
