// URL Shortener JavaScript

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:9999'
  : 'https://xqpl-tool.pages.dev';

let currentShortUrl = null;
let allUrls = [];
let currentQRCode = null;

// Get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Show toast notification
function showToast(type, message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Generate random alias
function generateRandomAlias(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Validate URL
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Create short URL
async function createShortUrl() {
  const originalUrl = document.getElementById('original-url').value.trim();
  const customAlias = document.getElementById('custom-alias').value.trim();
  const title = document.getElementById('url-title').value.trim();
  
  // Validation
  if (!originalUrl) {
    showToast('error', 'Please enter a URL');
    return;
  }
  
  if (!isValidUrl(originalUrl)) {
    showToast('error', 'Please enter a valid URL (must start with http:// or https://)');
    return;
  }
  
  if (customAlias && !/^[a-zA-Z0-9-_]+$/.test(customAlias)) {
    showToast('error', 'Alias can only contain letters, numbers, hyphens, and underscores');
    return;
  }
  
  const alias = customAlias || generateRandomAlias();
  
  try {
    const response = await fetch(`${API_BASE}/short-urls`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        original_url: originalUrl,
        alias: alias,
        title: title || 'Untitled'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      currentShortUrl = data.short_url;
      displayResult(data.short_url);
      showToast('success', 'Short URL created successfully!');
      
      // Clear form
      document.getElementById('original-url').value = '';
      document.getElementById('custom-alias').value = '';
      document.getElementById('url-title').value = '';
      
      // Reload URLs list
      loadUrls();
    } else {
      showToast('error', data.message || 'Failed to create short URL');
    }
  } catch (error) {
    console.error('Error creating short URL:', error);
    showToast('error', 'Network error. Please try again.');
  }
}

// Display result
function displayResult(shortUrl) {
  const resultSection = document.getElementById('result-section');
  const shortUrlOutput = document.getElementById('short-url-output');
  
  shortUrlOutput.value = shortUrl;
  resultSection.classList.remove('hidden');
  
  // Scroll to result
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Copy to clipboard
async function copyToClipboard() {
  const shortUrlOutput = document.getElementById('short-url-output');
  const copyBtn = document.getElementById('copy-btn');
  
  try {
    await navigator.clipboard.writeText(shortUrlOutput.value);
    copyBtn.classList.add('copied');
    showToast('success', 'Copied to clipboard!');
    
    setTimeout(() => {
      copyBtn.classList.remove('copied');
    }, 2000);
  } catch (error) {
    // Fallback for older browsers
    shortUrlOutput.select();
    document.execCommand('copy');
    showToast('success', 'Copied to clipboard!');
  }
}

// Visit URL
function visitUrl() {
  const shortUrlOutput = document.getElementById('short-url-output');
  window.open(shortUrlOutput.value, '_blank');
}

// Show QR Code
function showQRCode(url = null) {
  const qrModal = document.getElementById('qr-modal');
  const qrContainer = document.getElementById('qr-code-container');
  const qrUrlText = document.getElementById('qr-url-text');
  
  const urlToEncode = url || document.getElementById('short-url-output').value;
  
  // Clear previous QR code
  qrContainer.innerHTML = '';
  
  // Generate new QR code
  currentQRCode = new QRCode(qrContainer, {
    text: urlToEncode,
    width: 256,
    height: 256,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
  
  qrUrlText.textContent = urlToEncode;
  qrModal.classList.remove('hidden');
}

// Close QR Modal
function closeQRModal() {
  const qrModal = document.getElementById('qr-modal');
  qrModal.classList.add('hidden');
}

// Download QR Code
function downloadQRCode() {
  const qrContainer = document.getElementById('qr-code-container');
  const canvas = qrContainer.querySelector('canvas');
  
  if (canvas) {
    const link = document.createElement('a');
    link.download = 'qr-code.png';
    link.href = canvas.toDataURL();
    link.click();
    showToast('success', 'QR Code downloaded!');
  }
}

// Load URLs
async function loadUrls() {
  const urlsList = document.getElementById('urls-list');
  
  try {
    const response = await fetch(`${API_BASE}/short-urls`, {
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      allUrls = await response.json();
      renderUrls(allUrls);
    } else {
      urlsList.innerHTML = '<div class="empty-message">Failed to load URLs</div>';
    }
  } catch (error) {
    console.error('Error loading URLs:', error);
    urlsList.innerHTML = '<div class="empty-message">Network error. Please refresh.</div>';
  }
}

// Render URLs
function renderUrls(urls) {
  const urlsList = document.getElementById('urls-list');
  
  if (urls.length === 0) {
    urlsList.innerHTML = '<div class="empty-message">No short URLs yet. Create your first one above! 🚀</div>';
    return;
  }
  
  urlsList.innerHTML = urls.map(url => `
    <div class="url-item" data-id="${url.id}">
      <div class="url-item-header">
        <div>
          <h4 class="url-title">${escapeHtml(url.title)}</h4>
          <div class="url-date">Created ${formatDate(url.created_at)}</div>
        </div>
        <div class="url-stats">
          <div class="stat-item">
            <span>👁️</span>
            <span>${url.clicks || 0} clicks</span>
          </div>
        </div>
      </div>
      
      <div class="url-links">
        <div class="url-link-row">
          <span class="url-link-label">Short:</span>
          <span class="url-link-value short">${escapeHtml(url.short_url)}</span>
        </div>
        <div class="url-link-row">
          <span class="url-link-label">Original:</span>
          <span class="url-link-value" title="${escapeHtml(url.original_url)}">${escapeHtml(url.original_url)}</span>
        </div>
      </div>
      
      <div class="url-actions">
        <button class="action-btn" onclick="copyUrlToClipboard('${escapeHtml(url.short_url)}')">
          📋 Copy
        </button>
        <button class="action-btn" onclick="window.open('${escapeHtml(url.short_url)}', '_blank')">
          🔗 Visit
        </button>
        <button class="action-btn" onclick="showQRCode('${escapeHtml(url.short_url)}')">
          📱 QR Code
        </button>
        <button class="action-btn delete" onclick="deleteUrl(${url.id})">
          🗑️ Delete
        </button>
      </div>
    </div>
  `).join('');
}

// Copy URL to clipboard
async function copyUrlToClipboard(url) {
  try {
    await navigator.clipboard.writeText(url);
    showToast('success', 'URL copied to clipboard!');
  } catch (error) {
    showToast('error', 'Failed to copy URL');
  }
}

// Delete URL
async function deleteUrl(id) {
  if (!confirm('Are you sure you want to delete this short URL?')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/short-urls/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      showToast('success', 'Short URL deleted');
      loadUrls();
    } else {
      showToast('error', 'Failed to delete URL');
    }
  } catch (error) {
    console.error('Error deleting URL:', error);
    showToast('error', 'Network error. Please try again.');
  }
}

// Search and filter URLs
function filterUrls() {
  const searchTerm = document.getElementById('search-urls').value.toLowerCase();
  const sortBy = document.getElementById('sort-select').value;
  
  let filtered = allUrls.filter(url => {
    return url.title.toLowerCase().includes(searchTerm) ||
           url.original_url.toLowerCase().includes(searchTerm) ||
           url.short_url.toLowerCase().includes(searchTerm);
  });
  
  // Sort
  if (sortBy === 'recent') {
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (sortBy === 'clicks') {
    filtered.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
  } else if (sortBy === 'title') {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  }
  
  renderUrls(filtered);
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Create button
  document.getElementById('create-btn').addEventListener('click', createShortUrl);
  
  // Copy button
  document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
  
  // Visit button
  document.getElementById('visit-btn').addEventListener('click', visitUrl);
  
  // QR button
  document.getElementById('qr-btn').addEventListener('click', () => showQRCode());
  
  // Download QR button
  document.getElementById('download-qr-btn').addEventListener('click', downloadQRCode);
  
  // Search and sort
  document.getElementById('search-urls').addEventListener('input', filterUrls);
  document.getElementById('sort-select').addEventListener('change', filterUrls);
  
  // Enter key to create
  document.getElementById('original-url').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createShortUrl();
  });
  
  // Close modal on overlay click
  document.getElementById('qr-modal').addEventListener('click', (e) => {
    if (e.target.id === 'qr-modal') closeQRModal();
  });
  
  // Load URLs
  loadUrls();
});
