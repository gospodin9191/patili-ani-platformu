import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ caption: '', pet_name: '', memory_date: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Sadece resim dosyası yükleyebilirsin.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  };

  const onFileChange = (e) => handleFile(e.target.files[0]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Lütfen bir fotoğraf seç.'); return; }
    if (!form.caption.trim()) { setError('Açıklama boş olamaz.'); return; }

    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('caption', form.caption);
      fd.append('pet_name', form.pet_name);
      fd.append('memory_date', form.memory_date);

      await api.post('/posts', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Paylaşım yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-container">
      <div className="upload-page">
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: 24, color: 'var(--text-primary)' }}>
          🕯️ Yeni Anı Paylaş
        </h1>

        <form onSubmit={submit} id="upload-form">
          {/* Fotoğraf alanı */}
          {!preview ? (
            <div
              className={`upload-drop-area ${dragOver ? 'drag-over' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              id="upload-drop-area"
              role="button"
              aria-label="Fotoğraf seç"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                id="file-input"
              />
              <div className="upload-icon">📷</div>
              <div className="upload-text">
                <strong>Tıkla</strong> veya fotoğrafı buraya sürükle
                <br />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  JPG, PNG, WEBP · Maks 10 MB
                </span>
              </div>
            </div>
          ) : (
            <div className="upload-preview">
              <img src={preview} alt="Önizleme" />
              <button
                type="button"
                className="upload-preview-remove"
                onClick={clearFile}
                id="remove-preview-btn"
                aria-label="Fotoğrafı kaldır"
              >
                ✕
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="pet-name">Dostun Adı (opsiyonel)</label>
              <input
                id="pet-name"
                className="form-input"
                type="text"
                placeholder="örn: Pamuk, Karabaş..."
                value={form.pet_name}
                onChange={update('pet_name')}
                maxLength={60}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="memory-date">Anı Tarihi (opsiyonel)</label>
              <input
                id="memory-date"
                className="form-input"
                type="date"
                value={form.memory_date}
                onChange={update('memory_date')}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="caption">Anı / Açıklama *</label>
              <textarea
                id="caption"
                className="form-textarea"
                placeholder="Bu fotoğrafın arkasındaki hikayeyi anlat... Onun ne kadar özel olduğunu dünyaya göster."
                value={form.caption}
                onChange={update('caption')}
                required
                maxLength={1000}
                rows={4}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                {form.caption.length}/1000
              </span>
            </div>

            {error && <p className="form-error">⚠️ {error}</p>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => navigate('/')}
                style={{ flex: 1 }}
                id="upload-cancel-btn"
              >
                İptal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !file}
                style={{ flex: 2 }}
                id="upload-submit-btn"
              >
                {loading ? 'Paylaşılıyor...' : '🕯️ Anıyı Paylaş'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
