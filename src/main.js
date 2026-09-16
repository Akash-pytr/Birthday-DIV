/**
 * main.js — Application Entry Point
 * Initializes 3D scene, state, and all UI components.
 */
import { CakeScene } from './3d/CakeScene.js';
import { CakeModel } from './3d/CakeModel.js';
import { Candle, CANDLE_STYLES } from './3d/Candle.js';
import { Environment } from './3d/Environment.js';
import { CakeCutter } from './3d/CakeCutter.js';
import { Confetti } from './effects/Confetti.js';
import { sound } from './effects/SoundEffects.js';
import { appState } from './state/AppState.js';
import QRCode from 'qrcode';

// =============================================
// Global references
// =============================================
let cakeScene, cakeModel, environment, confetti, cakeCutter;
let candles = []; // Active 3D candle objects
let previewCandle = null; // Candle being placed

// =============================================
// DOM Element References
// =============================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Screens
const loadingScreen = $('#loading-screen');
const canvasContainer = $('#canvas-container');
const mainCanvas = $('#main-canvas');
const welcomeScreen = $('#welcome-screen');
const welcomeName = $('#welcome-name');

// Banner
const birthdayBanner = $('#birthday-banner');
const bannerText = $('.birthday-banner__text');

// Modals
const invitationModal = $('#invitation-modal');
const thankyouModal = $('#thankyou-modal');

// Wizard
const wizardSidebar = $('#wizard-sidebar');
const wizardStep1 = $('#wizard-step1');
const wizardStep2 = $('#wizard-step2');
const wizardStep3 = $('#wizard-step3');
const messageCard = $('#message-card');
const candleGrid = $('#candle-grid');

// Wish Feed
const wishFeed = $('#wish-feed');
const wishList = $('#wish-list');

// Header
const headerBar = $('#header-bar');

// Confetti
const confettiCanvas = $('#confetti-canvas');

// Cake Cutting
const cakeCutOverlay = $('#cake-cut-overlay');
const cakeCutBtn = $('#cake-cut-btn');
const cakeCutInstruction = $('#cake-cut-instruction');
const cutDot1 = $('#cut-dot-1');
const cutDot2 = $('#cut-dot-2');

// =============================================
// INITIALIZATION
// =============================================

function init() {
  // Setup 3D scene
  cakeScene = new CakeScene(mainCanvas);
  cakeModel = new CakeModel();
  cakeScene.addToCake(cakeModel);
  environment = new Environment(cakeScene.scene);
  confetti = new Confetti(confettiCanvas);

  // Setup cake cutter (3D knife + slice system)
  cakeCutter = new CakeCutter(cakeScene);
  window.cakeCutter = cakeCutter;
  window.cakeScene = cakeScene;

  // Animate environment
  cakeScene.onAnimate((delta, elapsed) => {
    environment.animate(elapsed);
    // Animate all candles
    candles.forEach(c => c.animate(elapsed));
  });

  // Start render loop
  cakeScene.start();

  // Populate candle grid
  populateCandleGrid();

  // Setup event listeners
  setupEventListeners();

  // Load existing candles from state
  loadExistingCandles();

  // Simulate loading
  simulateLoading();
}

// =============================================
// LOADING SCREEN
// =============================================

function simulateLoading() {
  // Wait for scene to render a few frames, then transition
  setTimeout(() => {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
      showWelcomeScreen();
    }, 800);
  }, 2500);
}

function showWelcomeScreen() {
  // Show the welcome/hero screen with "Happy Birthday Diva" centered
  const name = appState.get('birthdayName');
  welcomeName.textContent = name;
  welcomeScreen.classList.remove('hidden');
  
  // Keep canvas HIDDEN — only show when user clicks "Show Cake"
  
  appState.set('currentView', 'welcome');
}

function hideWelcomeScreen() {
  // Animate the welcome screen out
  welcomeScreen.classList.add('welcome-screen--exiting');
  
  // After exit animation, remove and show the main view
  setTimeout(() => {
    welcomeScreen.classList.add('hidden');
    showMainView();
  }, 800);
}

function showMainView() {
  canvasContainer.classList.remove('hidden');
  headerBar.classList.remove('hidden');

  // Update birthday name
  const name = appState.get('birthdayName');
  bannerText.textContent = `Happy Birthday ${name}`;
  birthdayBanner.classList.remove('hidden');

  // Show invitation modal
  setTimeout(() => {
    showInvitationModal();
  }, 600);
}

// =============================================
// INVITATION MODAL
// =============================================

function showInvitationModal() {
  document.body.classList.remove('has-sidebar');
  if (cakeScene) cakeScene.setSidebarOffset(false);
  invitationModal.classList.remove('hidden');
  appState.set('currentView', 'invitation');
}

function hideInvitationModal() {
  invitationModal.classList.add('hidden');
  // Go to dashboard
  showDashboard();
}

// =============================================
// CANDLE WIZARD
// =============================================

let selectedCandleIndex = 0;

function populateCandleGrid() {
  candleGrid.innerHTML = '';
  CANDLE_STYLES.forEach((style, i) => {
    const option = document.createElement('div');
    option.className = `wizard__candle-option ${i === 0 ? 'wizard__candle-option--selected' : ''}`;
    option.dataset.index = i;
    option.innerHTML = `<span>${style.emoji}</span>`;
    option.addEventListener('click', () => selectCandle(i));
    candleGrid.appendChild(option);
  });
}

function selectCandle(index) {
  selectedCandleIndex = index;
  appState.set('selectedCandle', index);
  sound.playPop();

  // Update UI
  $$('.wizard__candle-option').forEach((opt, i) => {
    opt.classList.toggle('wizard__candle-option--selected', i === index);
  });

  // Show preview candle on cake
  showPreviewCandle(index);
}

function showPreviewCandle(styleIndex) {
  // Remove existing preview
  if (previewCandle) {
    cakeScene.getCakeGroup().remove(previewCandle.getGroup());
  }

  // Create new preview candle
  previewCandle = new Candle(styleIndex);
  const group = previewCandle.getGroup();

  // Position on top of cake
  const angle = Math.random() * Math.PI * 2;
  const radius = 0.3 + Math.random() * 0.6;
  group.position.set(
    Math.cos(angle) * radius,
    2.82,
    Math.sin(angle) * radius
  );

  cakeScene.getCakeGroup().add(group);

  // Add to animation loop
  cakeScene.onAnimate((delta, elapsed) => {
    if (previewCandle) previewCandle.animate(elapsed);
  });
}

function showWizardStep(step) {
  // Hide all steps
  wizardStep1.classList.add('hidden');
  wizardStep2.classList.add('hidden');
  wizardStep3.classList.add('hidden');
  messageCard.classList.add('hidden');

  document.body.classList.add('has-sidebar');
  if (cakeScene) cakeScene.setSidebarOffset(true);

  if (step === 1) {
    wizardSidebar.classList.remove('hidden');
    wizardStep1.classList.remove('hidden');
    appState.set('currentView', 'step1');
    showPreviewCandle(selectedCandleIndex);
  } else if (step === 2) {
    wizardSidebar.classList.remove('hidden');
    wizardStep2.classList.remove('hidden');
    appState.set('currentView', 'step2');
  } else if (step === 3) {
    wizardSidebar.classList.remove('hidden');
    wizardStep3.classList.remove('hidden');
    messageCard.classList.remove('hidden');
    appState.set('currentView', 'step3');
  }
}

function hideWizard() {
  wizardSidebar.classList.add('hidden');
  messageCard.classList.add('hidden');
  if (appState.get('currentView') !== 'dashboard') {
    document.body.classList.remove('has-sidebar');
    if (cakeScene) cakeScene.setSidebarOffset(false);
  }
}

// =============================================
// MESSAGE CARD (Step 3)
// =============================================

let currentTab = 'write'; // 'write' or 'ai'
let aiChips = [];

function switchTab(tab) {
  currentTab = tab;
  const writePanel = $('#write-panel');
  const aiPanel = $('#ai-panel');
  const tabWrite = $('#tab-write');
  const tabAi = $('#tab-ai');
  const genBtn = $('#ai-generate-btn');

  if (tab === 'write') {
    writePanel.classList.remove('hidden');
    aiPanel.classList.add('hidden');
    tabWrite.classList.add('message-card__tab--active');
    tabAi.classList.remove('message-card__tab--active');
    genBtn.style.display = 'none';
  } else {
    writePanel.classList.add('hidden');
    aiPanel.classList.remove('hidden');
    tabWrite.classList.remove('message-card__tab--active');
    tabAi.classList.add('message-card__tab--active');
    genBtn.style.display = '';
  }
}

function addChip(text) {
  if (!text.trim() || aiChips.length >= 5) return;
  aiChips.push(text.trim());
  sound.playPop();
  renderChips();
  $('#chip-input').value = '';
}

function removeChip(index) {
  aiChips.splice(index, 1);
  sound.playPop();
  renderChips();
}

function renderChips() {
  const container = $('#chips-container');
  container.innerHTML = '';
  aiChips.forEach((chip, i) => {
    const el = document.createElement('span');
    el.className = 'message-card__chip';
    el.innerHTML = `${chip} <span class="message-card__chip-remove" data-index="${i}">✕</span>`;
    container.appendChild(el);
  });

  // Attach remove listeners
  container.querySelectorAll('.message-card__chip-remove').forEach(btn => {
    btn.addEventListener('click', () => removeChip(parseInt(btn.dataset.index)));
  });
}

function generateAIWish() {
  sound.playSparkle();
  const keywords = aiChips.length > 0 ? aiChips : ['love', 'happiness'];
  const wish = appState.generateWish(keywords);
  const textarea = $('#ai-textarea');
  textarea.value = '';
  textarea.readOnly = false;

  // Typewriter effect
  let i = 0;
  const typeInterval = setInterval(() => {
    if (i < wish.length) {
      textarea.value += wish[i];
      i++;
      updateAICharCount();
    } else {
      clearInterval(typeInterval);
    }
  }, 20);
}

function updateCharCount() {
  const textarea = $('#wish-textarea');
  const counter = $('#char-count');
  counter.textContent = textarea.value.length;
}

function updateAICharCount() {
  const textarea = $('#ai-textarea');
  const counter = $('#ai-char-count');
  counter.textContent = textarea.value.length;
}

function submitWish() {
  let message, name;

  if (currentTab === 'write') {
    message = $('#wish-textarea').value.trim();
    name = $('#wish-name').value.trim();
  } else {
    message = $('#ai-textarea').value.trim();
    name = $('#ai-wish-name').value.trim();
  }

  if (!message) {
    // Shake the textarea
    const textarea = currentTab === 'write' ? $('#wish-textarea') : $('#ai-textarea');
    textarea.style.animation = 'shake 0.5s';
    setTimeout(() => textarea.style.animation = '', 500);
    return false;
  }

  if (!name) name = 'Anonymous';

  // Finalize the preview candle as permanent
  if (previewCandle) {
    candles.push(previewCandle);
    previewCandle = null;
  }

  // Add wish to state
  appState.addWish({
    name,
    message,
    candle: selectedCandleIndex,
  });

  // Clear form
  $('#wish-textarea').value = '';
  $('#wish-name').value = '';
  $('#ai-textarea').value = '';
  $('#ai-wish-name').value = '';
  aiChips = [];
  renderChips();
  updateCharCount();
  updateAICharCount();

  return true;
}

// =============================================
// WISH FEED (Dashboard)
// =============================================

function showDashboard() {
  hideWizard();
  invitationModal.classList.add('hidden');
  wishFeed.classList.remove('hidden');
  document.body.classList.add('has-sidebar');
  if (cakeScene) cakeScene.setSidebarOffset(true);
  appState.set('currentView', 'dashboard');
  renderWishes();
}

function renderWishes() {
  const wishes = appState.get('wishes');
  wishList.innerHTML = '';

  if (wishes.length === 0) {
    wishList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">No wishes yet. Be the first to add a candle! 🕯️</p>';
    return;
  }

  wishes.forEach((wish, index) => {
    const card = document.createElement('div');
    card.className = 'wish-card';
    const candleEmoji = CANDLE_STYLES[wish.candle % CANDLE_STYLES.length]?.emoji || '🕯️';
    card.innerHTML = `
      <div class="wish-card__candle">${candleEmoji}</div>
      <div class="wish-card__content">
        <div class="wish-card__name">${escapeHtml(wish.name)}</div>
        <div class="wish-card__message">${escapeHtml(wish.message)}</div>
      </div>
      <div class="wish-card__heart" data-index="${index}">
        <span class="wish-card__heart-icon ${wish.liked ? 'wish-card__heart-icon--filled' : ''}">${wish.liked ? '❤️' : '🤍'}</span>
        <span class="wish-card__heart-count">${wish.likes}</span>
      </div>
    `;
    wishList.appendChild(card);
  });

  // Heart click listeners
  wishList.querySelectorAll('.wish-card__heart').forEach(heart => {
    heart.addEventListener('click', () => {
      const index = parseInt(heart.dataset.index);
      appState.toggleLike(index);
      sound.playPop();
      renderWishes();
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// =============================================
// LOAD EXISTING CANDLES (from state)
// =============================================

function loadExistingCandles() {
  const wishes = appState.get('wishes');
  wishes.forEach((wish, index) => {
    const candle = new Candle(wish.candle || 0);
    const group = candle.getGroup();

    // Distribute candles around the top of the cake
    const angle = (index / Math.max(wishes.length, 1)) * Math.PI * 2 + Math.random() * 0.5;
    const radius = 0.3 + Math.random() * 0.7;
    group.position.set(
      Math.cos(angle) * radius,
      2.82,
      Math.sin(angle) * radius
    );

    cakeScene.addToCake(group);
    candles.push(candle);
  });
}

// =============================================
// THANK YOU / SHARE MODAL
// =============================================

function showThankYouModal() {
  thankyouModal.classList.remove('hidden');

  // Generate QR code
  const qrContainer = $('#qr-container');
  qrContainer.innerHTML = '';
  const qrCanvas = document.createElement('canvas');
  QRCode.toCanvas(qrCanvas, window.location.href, {
    width: 180,
    margin: 2,
    color: {
      dark: '#1E1B4B',
      light: '#FFFFFF',
    },
  });
  qrContainer.appendChild(qrCanvas);
}

function hideThankYouModal() {
  thankyouModal.classList.add('hidden');
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const btn = $('#copy-link-btn .btn__text');
    const original = btn.textContent;
    btn.textContent = '✓ COPIED!';
    setTimeout(() => { btn.textContent = original; }, 2000);
  });
}

// =============================================
// SETTINGS & MUSIC
// =============================================

let musicPlaying = false;
let settingsOpen = false;

function toggleMusic() {
  musicPlaying = !musicPlaying;
  const btn = $('#music-toggle');
  btn.classList.toggle('header-bar__btn--active', musicPlaying);

  if (musicPlaying) {
    sound.playMusic();
  } else {
    sound.stopMusic();
  }

  appState.set('musicPlaying', musicPlaying);
}

function toggleSettings() {
  settingsOpen = !settingsOpen;
  const dropdown = $('#settings-dropdown');
  dropdown.classList.toggle('hidden', !settingsOpen);
}

function toggleUI() {
  const uiVisible = !appState.get('uiVisible');
  appState.set('uiVisible', uiVisible);

  const elements = [birthdayBanner, wizardSidebar, wishFeed, headerBar];
  elements.forEach(el => {
    if (el) el.style.opacity = uiVisible ? '1' : '0';
  });

  const toggleBtn = $('#toggle-ui');
  if (toggleBtn) toggleBtn.textContent = uiVisible ? '🖼️ Hide UI' : '🖼️ Show UI';
}

// =============================================
// BLOW CANDLES → TOP VIEW → CAKE CUTTING
// =============================================

function blowCandles() {
  appState.set('currentView', 'blowing');
  sound.playBlow();

  // Hide sidebar / wish feed during the experience
  wishFeed.classList.add('hidden');
  document.body.classList.remove('has-sidebar');
  if (cakeScene) cakeScene.setSidebarOffset(false);

  // Blow out all candles with staggered delay
  const allCandles = [...candles];
  if (previewCandle) allCandles.push(previewCandle);

  allCandles.forEach((candle, i) => {
    setTimeout(() => candle.blowOut(), i * 200);
  });

  // Confetti after all candles are blown
  const blowDoneTime = allCandles.length * 200 + 500;
  setTimeout(() => {
    sound.playSparkle();
    confetti.burst(200);
    setTimeout(() => confetti.shower(3000), 500);
  }, blowDoneTime);

  // Show celebration text
  bannerText.textContent = '🎉 Happy Birthday! 🎉';
  bannerText.style.animation = 'none';
  setTimeout(() => {
    bannerText.style.animation = 'pulse 1s ease infinite';
  }, 50);

  // After confetti → Camera transition to top view → Show cake cutting UI
  const cameraTransitionDelay = blowDoneTime + 2000;
  setTimeout(() => {
    // Transition camera to overhead top-down view
    cakeScene.setTopView().then(() => {
      // Camera is now top-down — show cake cutting UI
      startCakeCutting();
    });
  }, cameraTransitionDelay);
}

// =============================================
// CAKE CUTTING
// =============================================

function startCakeCutting() {
  appState.set('currentView', 'cutting');

  // Show the 3D cutter (knife appears)
  cakeCutter.show();

  // Show the overlay UI
  cakeCutOverlay.classList.remove('hidden');
  cakeCutInstruction.textContent = 'Tap to make the first cut!';
  cutDot1.classList.remove('cake-cut__dot--done');
  cutDot2.classList.remove('cake-cut__dot--done');

  // Update banner
  bannerText.textContent = '🔪 Cut the Cake!';
  bannerText.style.animation = 'float 3s ease-in-out infinite';
}

function onCakeCut() {
  if (!cakeCutter || cakeCutter.isCutting || cakeCutter.completed) return;

  const cutNum = cakeCutter.cuts + 1;

  // Update UI
  cakeCutBtn.classList.add('cake-cut__btn--cutting');

  if (cutNum === 1) {
    cakeCutInstruction.textContent = 'Making the first cut...';
    sound.playCut();
  } else if (cutNum === 2) {
    cakeCutInstruction.textContent = 'Making the second cut...';
    sound.playCut();
  }

  cakeCutter.performCut().then(() => {
    cakeCutBtn.classList.remove('cake-cut__btn--cutting');

    if (cutNum === 1) {
      // First cut done
      cutDot1.classList.add('cake-cut__dot--done');
      cakeCutInstruction.textContent = 'Great! Now tap for the second cut!';
    } else if (cutNum >= 2) {
      // Both cuts done, slice separating
      cutDot2.classList.add('cake-cut__dot--done');
      sound.playSlice();

      // Replace button with celebration
      cakeCutInstruction.textContent = '';
      cakeCutBtn.style.display = 'none';

      // Show celebration after slice animation
      setTimeout(() => {
        endCelebration();
      }, 1800);
    }
  });
}

function endCelebration() {
  // Hide cutting overlay controls
  cakeCutOverlay.classList.add('hidden');
  cakeCutBtn.style.display = 'none';

  // Trigger grand celebration takeover layer
  showGrandCelebration();
}

function showGrandCelebration() {
  const celebrationScreen = $('#cake-cut-celebration-screen');
  const celebrationName = $('#celebration-name');
  if (!celebrationScreen) return;

  const currentName = appState.get('birthdayName') || 'DIVAA';
  if (celebrationName) {
    celebrationName.textContent = currentName.toUpperCase();
  }

  // Audio and celebratory fireworks
  sound.playSparkle();
  confetti.burst(400);
  setTimeout(() => confetti.shower(6000), 300);

  // Update top banner
  bannerText.textContent = `🎉 Happy Birthday ${currentName}! 🎉`;
  bannerText.style.animation = 'pulse 0.8s ease infinite';

  // Reveal the 3D Blender Spider-Man celebration layer
  celebrationScreen.classList.remove('hidden');

  // Trigger friendly initial speech popup from Peeking Spider-Man
  const spideySpeech = $('#celebration-spidey-speech');
  if (spideySpeech) {
    spideySpeech.textContent = `Spider-Sense says ${currentName}'s cake is 10/10! 😋🍰`;
    spideySpeech.classList.add('active');
    setTimeout(() => {
      spideySpeech.classList.remove('active');
    }, 4500);
  }
}

function closeGrandCelebration(restartCutting = false) {
  const celebrationScreen = $('#cake-cut-celebration-screen');
  if (celebrationScreen) {
    celebrationScreen.classList.add('hidden');
  }

  cakeCutOverlay.classList.add('hidden');
  cakeCutBtn.style.display = '';

  if (restartCutting) {
    // Cut cake again flow
    sound.playSparkle();
    cakeCutter.hide();
    candles.forEach(candle => candle.relight());
    if (previewCandle) previewCandle.relight();
    cakeScene.setTopView().then(() => {
      startCakeCutting();
    });
  } else {
    // Back to cake dashboard flow
    sound.playSparkle();
    cakeCutter.hide();
    cakeScene.resetCamera().then(() => {
      candles.forEach(candle => candle.relight());
      if (previewCandle) previewCandle.relight();

      const name = appState.get('birthdayName') || 'Diva';
      bannerText.textContent = `Happy Birthday ${name}`;
      bannerText.style.animation = 'float 4s ease-in-out infinite';

      appState.set('currentView', 'dashboard');
      showDashboard();
    });
  }
}

// =============================================
// EVENT LISTENERS
// =============================================

function setupEventListeners() {
  // Welcome Screen — Show Cake button
  $('#show-cake-btn')?.addEventListener('click', () => {
    sound.playSparkle();
    hideWelcomeScreen();
  });

  // Invitation Modal
  $('#add-candle-btn')?.addEventListener('click', () => {
    hideInvitationModal();
    showWizardStep(1);
  });
  $('#invitation-close')?.addEventListener('click', hideInvitationModal);

  // Wizard Navigation
  $('#step1-back')?.addEventListener('click', () => {
    hideWizard();
    showDashboard();
  });
  $('#step1-next')?.addEventListener('click', () => showWizardStep(2));

  $('#step2-back')?.addEventListener('click', () => showWizardStep(1));
  $('#step2-next')?.addEventListener('click', () => showWizardStep(3));

  // Rotate cake buttons
  $('#rotate-left')?.addEventListener('click', () => cakeScene.rotateBy(-30));
  $('#rotate-right')?.addEventListener('click', () => cakeScene.rotateBy(30));

  // Step 3 / Message Card
  $('#step3-back')?.addEventListener('click', () => showWizardStep(2));
  $('#step3-next')?.addEventListener('click', () => {
    if (submitWish()) {
      hideWizard();
      showThankYouModal();
      // After closing thank you, show dashboard
    }
  });

  // Message tabs
  $('#tab-write')?.addEventListener('click', () => switchTab('write'));
  $('#tab-ai')?.addEventListener('click', () => switchTab('ai'));

  // Chip input
  $('#add-chip-btn')?.addEventListener('click', () => {
    addChip($('#chip-input').value);
  });
  $('#chip-input')?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') addChip($('#chip-input').value);
  });

  // AI Generate
  $('#ai-generate-btn')?.addEventListener('click', generateAIWish);

  // Character counters
  $('#wish-textarea')?.addEventListener('input', updateCharCount);
  $('#ai-textarea')?.addEventListener('input', updateAICharCount);

  // Thank You Modal
  $('#thankyou-close')?.addEventListener('click', () => {
    hideThankYouModal();
    showDashboard();
  });
  $('#copy-link-btn')?.addEventListener('click', copyLink);

  // Wish Feed
  $('#feed-add-candle')?.addEventListener('click', () => {
    wishFeed.classList.add('hidden');
    showWizardStep(1);
  });
  $('#share-btn')?.addEventListener('click', showThankYouModal);
  $('#blow-candles-btn')?.addEventListener('click', blowCandles);
  $('#cake-cut-btn')?.addEventListener('click', onCakeCut);

  // Create New Cake
  $('.wish-feed__create-new')?.addEventListener('click', (e) => {
    e.preventDefault();
    const current = appState.get('birthdayName');
    const newName = prompt('Enter the name of the birthday person:', current);
    if (newName && newName.trim()) {
      appState.set('birthdayName', newName.trim());
      bannerText.textContent = `Happy Birthday ${newName.trim()}`;
    }
  });

  // Header
  $('#music-toggle')?.addEventListener('click', toggleMusic);
  $('#settings-toggle')?.addEventListener('click', toggleSettings);
  $('#toggle-ui')?.addEventListener('click', toggleUI);

  // Close settings when clicking outside
  document.addEventListener('click', (e) => {
    if (settingsOpen && !e.target.closest('#settings-toggle') && !e.target.closest('#settings-dropdown')) {
      settingsOpen = false;
      $('#settings-dropdown').classList.add('hidden');
    }
  });

  // Spider-Man interaction (Click for friendly quips & sound)
  const spideyFigure = $('#spiderman-figure');
  const spideyBubble = $('#spidey-speech-bubble');
  const spideyQuotes = [
    'Happy Birthday Diva! 🕷️🎉',
    'With great birthdays comes great cake! 🎂✨',
    'Spider-Sense tingling... time to celebrate! 🕸️🥳',
    'Friendly neighborhood Spider-Man reporting for cake! 🍰',
    'Hope your day is web-tastic, Diva! 🌟🕸️'
  ];
  let quoteIndex = 0;
  let bubbleTimeout = null;

  if (spideyFigure && spideyBubble) {
    spideyFigure.addEventListener('click', () => {
      sound.playPop();
      quoteIndex = (quoteIndex + 1) % spideyQuotes.length;
      const currentName = appState.get('birthdayName') || 'Diva';
      spideyBubble.textContent = spideyQuotes[quoteIndex].replace('Diva', currentName);
      spideyBubble.classList.add('active');

      if (bubbleTimeout) clearTimeout(bubbleTimeout);
      bubbleTimeout = setTimeout(() => {
        spideyBubble.classList.remove('active');
      }, 3500);
    });
  }

  // Left Spider-Man interaction (Click for friendly quips & sound)
  const spideyFigureLeft = $('#spiderman-figure-left');
  const spideyBubbleLeft = $('#spidey-speech-bubble-left');
  const spideyQuotesLeft = [
    'Double the Spidey, double the fun! 🕸️🎉',
    'Hey Diva! We brought the Spider-Verse to your birthday! 🌟⚡',
    'Anyone said cake? Count me in! 🍰😋',
    'You are awesome, Diva! Have a super birthday! 🎂🎈',
    'Swinging by to wish you the greatest year ahead! 🕷️✨'
  ];
  let quoteIndexLeft = 0;
  let bubbleTimeoutLeft = null;

  if (spideyFigureLeft && spideyBubbleLeft) {
    spideyFigureLeft.addEventListener('click', () => {
      sound.playPop();
      quoteIndexLeft = (quoteIndexLeft + 1) % spideyQuotesLeft.length;
      const currentName = appState.get('birthdayName') || 'Diva';
      spideyBubbleLeft.textContent = spideyQuotesLeft[quoteIndexLeft].replace('Diva', currentName);
      spideyBubbleLeft.classList.add('active');

      if (bubbleTimeoutLeft) clearTimeout(bubbleTimeoutLeft);
      bubbleTimeoutLeft = setTimeout(() => {
        spideyBubbleLeft.classList.remove('active');
      }, 3500);
    });
  }

  // Grand Cake Cut Celebration Screen button handlers
  $('#btn-celebrate-confetti')?.addEventListener('click', () => {
    sound.playPop();
    sound.playSparkle();
    confetti.burst(300);
    confetti.shower(5000);
  });

  $('#btn-celebrate-cut-again')?.addEventListener('click', () => {
    closeGrandCelebration(true);
  });

  $('#btn-celebrate-back')?.addEventListener('click', () => {
    closeGrandCelebration(false);
  });

  // 3D Blender Peeking Spider-Man interaction (click for quotes & sound)
  const celebrationSpidey = $('#celebration-spidey');
  const celebrationSpeech = $('#celebration-spidey-speech');
  const peekingQuotes = [
    'Spider-Sense says this cake is 10/10! 😋🍰',
    'Wait, did someone save a slice for Spidey?! 🕷️🎂',
    'Woohoo! Best birthday celebration in the Multiverse! 🎈✨',
    'With great sweetness comes great happiness! 🎉❤️',
    'Happy Birthday Diva! Keep shining bright! 🕸️🌟'
  ];
  let peekingQuoteIndex = 0;
  let peekingTimeout = null;

  if (celebrationSpidey && celebrationSpeech) {
    celebrationSpidey.addEventListener('click', () => {
      sound.playPop();
      peekingQuoteIndex = (peekingQuoteIndex + 1) % peekingQuotes.length;
      const currentName = appState.get('birthdayName') || 'Diva';
      celebrationSpeech.textContent = peekingQuotes[peekingQuoteIndex].replace(/Diva/g, currentName);
      celebrationSpeech.classList.add('active');

      if (peekingTimeout) clearTimeout(peekingTimeout);
      peekingTimeout = setTimeout(() => {
        celebrationSpeech.classList.remove('active');
      }, 3500);
    });
  }

  // Cake click for candle placement (Step 2)
  mainCanvas.addEventListener('click', (e) => {
    if (appState.get('currentView') !== 'step2') return;

    // Place candle at random position on cake top
    if (previewCandle) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.2 + Math.random() * 0.8;
      const group = previewCandle.getGroup();
      group.position.set(
        Math.cos(angle) * radius,
        2.82,
        Math.sin(angle) * radius
      );

      appState.set('candlePlaced', true);
      appState.set('candlePosition', { x: group.position.x, y: group.position.y, z: group.position.z });
    }
  });

  // State change listeners
  appState.on('wishes', () => {
    if (appState.get('currentView') === 'dashboard') {
      renderWishes();
    }
  });
}

// =============================================
// START APP
// =============================================
document.addEventListener('DOMContentLoaded', init);
