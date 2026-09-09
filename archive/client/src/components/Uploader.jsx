import { useState, useRef } from 'react';
import { ImagePreview, Toast } from 'react-vant';

const MAX_FILES = 9;
const MAX_SIZE = 5 * 1024 * 1024;

export default function Uploader({ files = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleSelect = () => inputRef.current?.click();

  const handleFiles = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;
    if (files.length + selectedFiles.length > MAX_FILES) {
      Toast.fail(`最多上传 ${MAX_FILES} 个文件`);
      return;
    }
    for (const f of selectedFiles) {
      if (f.size > MAX_SIZE) {
        Toast.fail(`${f.name} 超过5MB限制`);
        return;
      }
    }

    setUploading(true);
    try {
      const results = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('hof_token');
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const json = await res.json();
        if (json.code === 0) results.push(json.data);
        else Toast.fail(json.message);
      }
      if (results.length > 0) onChange([...files, ...results]);
    } catch (e) {
      Toast.fail('上传失败');
    } finally {
      setUploading(false);
      inputRef.current.value = '';
    }
  };

  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  const isImage = (name) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name);

  return (
    <div className="uploader">
      <div className="uploader-grid">
        {files.map((file, index) => (
          <div key={index} className="uploader-item" onClick={() => removeFile(index)}>
            {isImage(file.name || file.url) ? (
              <img src={file.url} alt={file.name} className="uploader-preview" />
            ) : (
              <div className="uploader-file">
                <span>{file.name}</span>
                <span className="uploader-file__size">{Math.round((file.size || 0) / 1024)}KB</span>
              </div>
            )}
            <span className="uploader-remove">x</span>
          </div>
        ))}
        {files.length < MAX_FILES && (
          <div className={`uploader-add ${uploading ? 'uploading' : ''}`} onClick={handleSelect}>
            <span>+</span>
            <span className="uploader-add__text">{uploading ? '上传中' : '上传'}</span>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" multiple className="uploader-input" onChange={handleFiles} />
    </div>
  );
}