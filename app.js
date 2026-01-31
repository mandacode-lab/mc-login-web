// API Configuration
const API_BASE = 'https://auth.mandacode.com/v1';

// i18n
let translations = {};

// Load translations and apply to DOM
async function initI18n(lang = null) {
  // Auto-detect language if not provided
  if (!lang) {
    const browserLang = navigator.language || navigator.userLanguage;
    const langCode = browserLang.split('-')[0];
    const supportedLangs = ['ko', 'en', 'ja'];
    lang = supportedLangs.includes(langCode) ? langCode : 'en';
  }

  const fallbackLang = 'en';

  console.log('Loading translations for language:', lang);

  try {
    const response = await fetch(`i18n/${lang}.json`);
    if (!response.ok) throw new Error('Translation file not found');
    translations = await response.json();
    console.log('Translations loaded:', translations);

    // Update language select
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
      languageSelect.value = lang;
    }
  } catch (error) {
    console.warn(`Failed to load translations for ${lang}, falling back to ${fallbackLang}`);
    try {
      const response = await fetch(`i18n/${fallbackLang}.json`);
      translations = await response.json();
    } catch (fallbackError) {
      console.error('Failed to load fallback translations');
      return;
    }
  }

  applyTranslations();
}

// Apply translations to all elements with data-i18n attribute
function applyTranslations() {
  const elements = document.querySelectorAll('[data-i18n]');
  console.log('Applying translations to', elements.length, 'elements');

  elements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[key]) {
      element.textContent = translations[key];
    }
  });

  // Update page title
  const titleEl = document.querySelector('title[data-i18n]');
  if (titleEl && translations['title']) {
    titleEl.textContent = translations['title'];
  }
}

// Get translated text
function t(key) {
  return translations[key] || key;
}

// State
let loginState = {
  id: '',
  password: '',
  requiresMFA: false,
  pendingToken: null
};

// DOM Elements
const form = document.getElementById('loginForm');
const idInput = document.getElementById('id');
const passwordInput = document.getElementById('password');
const totpInput = document.getElementById('totp');
const totpSection = document.getElementById('totpSection');
const togglePasswordBtn = document.getElementById('togglePassword');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const languageSelect = document.getElementById('languageSelect');

// Language change handler
languageSelect.addEventListener('change', async (e) => {
  const newLang = e.target.value;
  await initI18n(newLang);
});

// Toggle password visibility
togglePasswordBtn.addEventListener('click', () => {
  const type = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = type;

  // Toggle icon
  const eyeIcon = document.getElementById('eyeIcon');
  if (type === 'text') {
    eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
        `;
  } else {
    eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
        `;
  }
});

// Format TOTP input
totpInput.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, '').substring(0, 6);
  e.target.value = value;
});

// Show error message
function showError(message) {
  errorText.textContent = message;
  errorMessage.classList.remove('hidden');
  setTimeout(() => {
    errorMessage.classList.add('hidden');
  }, 5000);
}

// Set loading state
function setLoading(isLoading) {
  if (isLoading) {
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');
    submitBtn.disabled = true;
  } else {
    btnText.classList.remove('hidden');
    btnSpinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
}

// Initiate login
async function initLogin(id, password) {
  try {
    const response = await fetch(`${API_BASE}/login/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || t('errorLogin'));
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// Complete login without MFA
async function completeNoMFA() {
  try {
    const response = await fetch(`${API_BASE}/login/complete-no-mfa`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || t('errorLogin'));
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// Complete login with TOTP
async function completeTOTP(totpCode) {
  try {
    const response = await fetch(`${API_BASE}/login/complete-totp`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ totp_code: totpCode })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || t('errorAuth'));
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// Handle form submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = idInput.value;
  const password = passwordInput.value;
  const totp = totpInput.value;

  setLoading(true);
  errorMessage.classList.add('hidden');

  try {
    if (!loginState.requiresMFA) {
      // Step 1: Initiate login
      const result = await initLogin(id, password);

      loginState.id = id;
      loginState.password = password;

      if (result.mfa_methods && result.mfa_methods.length > 0) {
        // MFA required
        loginState.requiresMFA = true;
        loginState.pendingToken = result.pending_token;

        // Show TOTP section
        totpSection.classList.remove('hidden');
        idInput.disabled = true;
        passwordInput.disabled = true;
        totpInput.focus();
      } else {
        // No MFA, complete login
        await completeNoMFA();
        window.location.href = '/dashboard';
      }
    } else {
      // Step 2: Complete MFA
      if (!totp || totp.length !== 6) {
        showError(t('errorTotpRequired'));
        setLoading(false);
        return;
      }

      await completeTOTP(totp);
      window.location.href = '/dashboard';
    }
  } catch (error) {
    showError(error.message);

    // Reset state on error
    if (loginState.requiresMFA) {
      loginState.requiresMFA = false;
      totpSection.classList.add('hidden');
      idInput.disabled = false;
      passwordInput.disabled = false;
      totpInput.value = '';
    }
  } finally {
    setLoading(false);
  }
});

// Focus ID field on load
idInput.focus();

// Initialize i18n when DOM is ready
async function initializeApp() {
  console.log('Initializing app');
  await initI18n();
  console.log('App initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
