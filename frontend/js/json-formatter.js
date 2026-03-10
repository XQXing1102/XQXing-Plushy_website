document.addEventListener('DOMContentLoaded', () => {
  const jsonInput = document.getElementById('json-input');
  const jsonOutput = document.getElementById('json-output');
  const formatBtn = document.getElementById('format-btn');
  const minifyBtn = document.getElementById('minify-btn');
  const clearBtn = document.getElementById('clear-btn');
  const copyBtn = document.getElementById('copy-btn');
  const statusIndicator = document.getElementById('status-indicator');

  // Load from local storage if exists
  const savedData = localStorage.getItem('jsonFormatterData');
  if (savedData) {
    jsonInput.value = savedData;
    formatJSON();
  }

  // --- Event Listeners ---
  formatBtn.addEventListener('click', formatJSON);
  minifyBtn.addEventListener('click', minifyJSON);
  clearBtn.addEventListener('click', clearAll);
  copyBtn.addEventListener('click', copyToClipboard);

  // Auto-format on paste or debounce typing
  let timeoutId;
  jsonInput.addEventListener('input', () => {
    localStorage.setItem('jsonFormatterData', jsonInput.value);
    
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (jsonInput.value.trim() !== '') {
        formatJSON();
      } else {
        clearOutput();
      }
    }, 500);
  });

  // --- Core Functions ---
  
  function formatJSON() {
    const rawValue = jsonInput.value.trim();
    if (!rawValue) {
      clearOutput();
      return;
    }

    try {
      const parsed = JSON.parse(rawValue);
      const formatted = JSON.stringify(parsed, null, 2);
      
      // Syntax Highlight
      jsonOutput.innerHTML = syntaxHighlight(formatted);
      
      setStatus('Valid JSON', 'success');
      
    } catch (e) {
      jsonOutput.textContent = e.message;
      setStatus('Invalid JSON', 'error');
    }
  }

  function minifyJSON() {
    const rawValue = jsonInput.value.trim();
    if (!rawValue) return;

    try {
      const parsed = JSON.parse(rawValue);
      const minified = JSON.stringify(parsed);
      
      jsonInput.value = minified;
      jsonOutput.innerHTML = syntaxHighlight(minified);
      
      localStorage.setItem('jsonFormatterData', minified);
      setStatus('Minified JSON', 'success');
      
    } catch (e) {
      jsonOutput.textContent = e.message;
      setStatus('Invalid JSON', 'error');
    }
  }

  function clearAll() {
    jsonInput.value = '';
    localStorage.removeItem('jsonFormatterData');
    clearOutput();
  }

  function clearOutput() {
    jsonOutput.innerHTML = '';
    setStatus('Ready');
  }

  function setStatus(text, type = '') {
    statusIndicator.textContent = text;
    statusIndicator.className = 'status-indicator';
    if (type) {
      statusIndicator.classList.add(type);
    }
  }

  async function copyToClipboard() {
    const contentToCopy = jsonOutput.textContent; // get pure text without span tags
    if (!contentToCopy) return;

    try {
      await navigator.clipboard.writeText(contentToCopy);
      
      // Visual feedback
      const originalHtml = copyBtn.innerHTML;
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="#4CDB6E" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span style="color: #4CDB6E;">Copied!</span>
      `;
      copyBtn.style.borderColor = "rgba(76, 219, 110, 0.4)";
      
      setTimeout(() => {
        copyBtn.innerHTML = originalHtml;
        copyBtn.style.borderColor = "";
      }, 2000);
      
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }

  // --- Syntax Highlighting Logic ---
  function syntaxHighlight(jsonStr) {
    // Escape HTML to prevent injection
    jsonStr = jsonStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Regex matching strings, numbers, booleans, and null
    return jsonStr.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
  }

});
