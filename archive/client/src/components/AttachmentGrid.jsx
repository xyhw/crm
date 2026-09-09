import { ImagePreview } from 'react-vant';

const IMAGE_RE = /\.(jpe?g|png|gif|webp|bmp)$/i;

export default function AttachmentGrid({ files = [], onPreview }) {
  if (!files || files.length === 0) return null;

  const images = files.map((url, idx) => ({ url, idx }));
  const imageUrls = files.filter((u) => IMAGE_RE.test(u));

  const openPreview = (idx) => {
    if (imageUrls.length === 0) return;
    const start = imageUrls.indexOf(files[idx]);
    ImagePreview.open({ images: imageUrls, startPosition: start < 0 ? 0 : start });
    if (onPreview) onPreview(idx);
  };

  return (
    <div className="attach-grid">
      {images.map(({ url, idx }) => {
        const isImg = IMAGE_RE.test(url);
        return (
          <div key={idx} className="attach-grid__item" onClick={() => isImg && openPreview(idx)}>
            {isImg ? (
              <img src={url} alt={`附件${idx + 1}`} loading="lazy" />
            ) : (
              <img src={url} alt={`附件${idx + 1}`} loading="lazy" />
            )}
            <div className="attach-grid__label">附件{idx + 1}</div>
          </div>
        );
      })}
    </div>
  );
}
