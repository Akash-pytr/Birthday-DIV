/**
 * AppState — Central State Manager
 * Observable pattern for managing app state and UI transitions.
 */

const STORAGE_KEY = 'bdaycake_data';

// Parse URL params for custom recipient name if provided
const urlParams = new URLSearchParams(window.location.search);
const recipientFromUrl = urlParams.get('name') || urlParams.get('to') || 'divaa';

const DEFAULT_STATE = {
  currentView: 'loading', // loading, invitation, step1, step2, step3, dashboard, blowing
  birthdayName: recipientFromUrl,
  wishes: [],
  selectedCandle: 0,
  candlePlaced: false,
  candlePosition: { x: 0, y: 0, z: 0 },
  musicPlaying: false,
  uiVisible: true,
};

// Pre-built wishes for demo
const DEMO_WISHES = [
  { name: 'stvrlightt', message: 'happpyyyyyyyy birthdayyyyyyyyy divaaaaaaaaaaaaaaaa', candle: 0, likes: 1, liked: false },
  { name: 'stvr', message: 'haveeee a greatttt dayyyy', candle: 1, likes: 1, liked: false },
  { name: 'Alex', message: 'Happy 80th Birthday Mom! Wishing you endless joy and health!', candle: 2, likes: 0, liked: false },
  { name: 'Lia', message: "HAPPY BIRTHDAY DIVA!!!! YOU'RE FINALLY AN ADULTTTT. AHHHH. Have the best wishes with u, ur one of the best friends i've made, and i'm so glad i agreed to that vc.", candle: 3, likes: 0, liked: false },
];

// AI writer wish templates
const AI_TEMPLATES = [
  "Wishing you a birthday filled with {keyword1} and {keyword2}. May this year bring you nothing but happiness!",
  "Happy Birthday! May your day be as {keyword1} as you are. Sending you all my {keyword2} and warm wishes!",
  "On this special day, I wish you {keyword1}, {keyword2}, and all the beautiful things life has to offer. Happy Birthday!",
  "May your birthday be filled with {keyword1}. You deserve all the {keyword2} in the world. Cheers to another amazing year!",
  "Happy Birthday! Here's to a year of {keyword1}, {keyword2}, and unforgettable memories. You're truly special!",
  "Wishing the happiest of birthdays to someone who brings so much {keyword1} to everyone around them. May you always have {keyword2}!",
  "Another year of being wonderful! May this birthday bring you overflowing {keyword1} and endless {keyword2}. Love you!",
  "To someone who makes the world brighter — Happy Birthday! May your life be filled with {keyword1} and {keyword2}.",
];

class AppState {
  constructor() {
    this._state = { ...DEFAULT_STATE };
    this._listeners = {};
    this._load();
  }

  /** Get current state */
  get(key) {
    return this._state[key];
  }

  /** Set state value and notify listeners */
  set(key, value) {
    const oldValue = this._state[key];
    this._state[key] = value;
    this._save();
    this._notify(key, value, oldValue);
  }

  /** Subscribe to state changes */
  on(key, callback) {
    if (!this._listeners[key]) this._listeners[key] = [];
    this._listeners[key].push(callback);
    return () => {
      this._listeners[key] = this._listeners[key].filter(cb => cb !== callback);
    };
  }

  /** Notify listeners */
  _notify(key, newValue, oldValue) {
    if (this._listeners[key]) {
      this._listeners[key].forEach(cb => cb(newValue, oldValue));
    }
    // Always notify '*' listeners
    if (this._listeners['*']) {
      this._listeners['*'].forEach(cb => cb(key, newValue, oldValue));
    }
  }

  /** Add a wish */
  addWish(wish) {
    const wishes = [...this._state.wishes, {
      ...wish,
      likes: 0,
      liked: false,
      id: Date.now()
    }];
    this.set('wishes', wishes);
  }

  /** Toggle like on a wish */
  toggleLike(wishIndex) {
    const wishes = [...this._state.wishes];
    if (wishes[wishIndex]) {
      const wish = { ...wishes[wishIndex] };
      wish.liked = !wish.liked;
      wish.likes = wish.liked ? wish.likes + 1 : Math.max(0, wish.likes - 1);
      wishes[wishIndex] = wish;
      this.set('wishes', wishes);
    }
  }

  /** Generate AI wish from keywords */
  generateWish(keywords) {
    const template = AI_TEMPLATES[Math.floor(Math.random() * AI_TEMPLATES.length)];
    const kw1 = keywords[0] || 'love';
    const kw2 = keywords[1] || keywords[0] || 'joy';
    return template
      .replace('{keyword1}', kw1.toLowerCase())
      .replace('{keyword2}', kw2.toLowerCase());
  }

  /** Load from localStorage */
  _load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.birthdayName === 'Birthday Star') {
          parsed.birthdayName = recipientFromUrl;
        }
        this._state = { ...DEFAULT_STATE, ...parsed, currentView: 'loading' };
      } else {
        // First time - load demo wishes
        this._state.wishes = [...DEMO_WISHES];
      }
    } catch (e) {
      console.warn('Failed to load state:', e);
    }
  }

  /** Save to localStorage */
  _save() {
    try {
      const toSave = { ...this._state };
      delete toSave.currentView; // Don't persist view state
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }

  /** Reset state */
  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this._state = { ...DEFAULT_STATE, wishes: [...DEMO_WISHES] };
    this._notify('*', null, null);
  }
}

// Singleton
export const appState = new AppState();
export { DEMO_WISHES, AI_TEMPLATES };
