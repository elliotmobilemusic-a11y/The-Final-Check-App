import { useRef } from 'react';
import type { AuditPhoto } from '../../types';
import { prepareAuditPhotos } from '../../lib/photoEvidence';

type PhotoEvidenceFieldProps = {
  section: string;
  sectionLabel: string;
  photos: AuditPhoto[];
  onAddPhotos: (photos: AuditPhoto[]) => void;
  onCaptionChange: (photoId: string, caption: string) => void;
  onRemovePhoto: (photoId: string) => void;
  onMessage?: (message: string) => void;
};

export function PhotoEvidenceField({
  section,
  sectionLabel,
  photos,
  onAddPhotos,
  onCaptionChange,
  onRemovePhoto,
  onMessage
}: PhotoEvidenceFieldProps) {
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const sectionPhotos = photos.filter((photo) => photo.section === section);

  async function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;

    try {
      const nextPhotos = await prepareAuditPhotos(files, section, sectionLabel);
      if (nextPhotos.length) {
        onAddPhotos(nextPhotos);
        onMessage?.(`${nextPhotos.length} photo${nextPhotos.length === 1 ? '' : 's'} added to ${sectionLabel.toLowerCase()}.`);
      }
    } catch (error) {
      onMessage?.(error instanceof Error ? error.message : 'Could not add the selected photo.');
    }

    if (libraryInputRef.current) libraryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }

  return (
    <div className="photo-evidence-panel">
      <div className="photo-evidence-top">
        <div>
          <strong>Photo evidence</strong>
          <p>Add clean visual proof for this section so it can appear in the report and PDF.</p>
        </div>
        <div className="photo-evidence-actions">
          <button className="button button-secondary" onClick={() => libraryInputRef.current?.click()} type="button">
            Add photos
          </button>
          <button className="button button-secondary" onClick={() => cameraInputRef.current?.click()} type="button">
            Take photo
          </button>
        </div>
      </div>

      <input
        accept="image/*"
        hidden
        multiple
        onChange={(event) => handleFiles(event.target.files)}
        ref={libraryInputRef}
        type="file"
      />
      <input
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => handleFiles(event.target.files)}
        ref={cameraInputRef}
        type="file"
      />

      {sectionPhotos.length ? (
        <div className="photo-evidence-grid">
          {sectionPhotos.map((photo) => (
            <article className="photo-evidence-card" key={photo.id}>
              <div className="photo-evidence-frame">
                <img alt={photo.caption || `${sectionLabel} evidence`} src={photo.imageDataUrl} />
              </div>
              <label className="field">
                <span>Caption</span>
                <input
                  className="input"
                  placeholder="Add a short note for the report"
                  value={photo.caption}
                  onChange={(event) => onCaptionChange(photo.id, event.target.value)}
                />
              </label>
              <button className="button button-ghost" onClick={() => onRemovePhoto(photo.id)} type="button">
                Remove photo
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted-copy">No photos added for this section yet.</p>
      )}
    </div>
  );
}
