// =========================================================
// QAMBI FILIMS - MAIN APPLICATION LOGIC
// =========================================================

class QambiFilimsApp {
  constructor() {
    this.storageKey = 'qambi_filims_v1_db';
    this.movies = [];
    this.searchQuery = '';
    this.selectedYear = 'all';
    this.selectedGenre = 'all';
    this.sortBy = 'newest';

    // Owner & Admin Security State
    this.ownerEmail = 'qambimustafe@gmail.com';
    this.isAdminLoggedIn = false;
    this.adminSearchQuery = '';
    this.adminSomaliFilter = 'all';
    this.adminGenreFilter = 'all';

    // Firebase Auth State
    this.currentUser = null;
    this.authMode = 'login';

    this.init();
  }

  isOwner() {
    return !!(this.currentUser && this.currentUser.email && this.currentUser.email.trim().toLowerCase() === this.ownerEmail.toLowerCase());
  }

  init() {
    this.loadMovies();
    this.updateAuthNav();
    this.initEventListeners();
    this.renderMovies();
    this.updateYearCounts();
    this.updateAdminStats();
    this.init3DHero();
    this.setupFirebase();
  }

  // 1. Data Management
  loadMovies() {
    // Purge old mock storage key if present
    localStorage.removeItem('qambi_filims_v1_db');
    
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If it contains the old mock movies with qf-1 to qf-12, clear them out
        if (Array.isArray(parsed) && parsed.some(m => m.id && typeof m.id === 'string' && (m.id.startsWith('qf-') && parseInt(m.id.replace('qf-', '')) <= 12))) {
          this.movies = [];
          this.saveMovies();
        } else {
          this.movies = Array.isArray(parsed) ? parsed : [];
        }
      } catch (e) {
        this.movies = [];
        this.saveMovies();
      }
    } else {
      this.movies = [];
      this.saveMovies();
    }
  }

  saveMovies() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.movies));
  }

  init3DHero() {
    if (typeof window.initCinema3DHero === 'function') {
      window.cinema3D = window.initCinema3DHero('hero-canvas-container');
    }
  }

  // Firebase Cloud Integration
  setupFirebase() {
    if (window.QAMBI_FIREBASE && window.QAMBI_FIREBASE.isReady) {
      this.initFirebase();
      this.initFirebaseAuth();
    } else {
      window.addEventListener('firebase-ready', () => {
        this.initFirebase();
        this.initFirebaseAuth();
      });
    }
  }

  initFirebaseAuth() {
    if (!window.QAMBI_FIREBASE || !window.QAMBI_FIREBASE.auth) return;
    const { auth, onAuthStateChanged } = window.QAMBI_FIREBASE;

    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.updateAuthNav();
    });
  }

  updateAuthNav() {
    const container = document.getElementById('auth-nav-container');
    if (!container) return;

    if (this.currentUser) {
      const isOwner = this.isOwner();
      const rawName = this.currentUser.displayName || this.currentUser.email.split('@')[0];
      const displayName = isOwner ? `${rawName} (Owner)` : rawName;

      container.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold ${isOwner ? 'text-amber-300 bg-amber-950/80 border-amber-500/60 shadow-lg shadow-amber-500/15' : 'text-cyan-300 bg-blue-950/70 border-blue-500/40'} flex items-center gap-1.5 border px-3 py-1.5 rounded-full shadow-sm">
            <i class="fa-solid ${isOwner ? 'fa-crown text-amber-400' : 'fa-circle-user text-cyan-400'} text-xs"></i>
            <span class="max-w-[130px] truncate">${displayName}</span>
          </span>
          <button 
            id="auth-logout-btn" 
            class="text-xs text-red-400 hover:text-white bg-red-950/50 hover:bg-red-700/80 border border-red-500/40 px-2.5 py-1.5 rounded-full transition-all shadow-sm active:scale-95" 
            title="Ka Bax Koontada (Logout)"
          >
            <i class="fa-solid fa-power-off text-xs"></i>
          </button>
        </div>
      `;
      const logoutBtn = document.getElementById('auth-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => this.handleAuthLogout());
      }
    } else {
      container.innerHTML = `
        <button 
          id="open-login-btn"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-cyan-300 hover:text-white transition-all shadow-md active:scale-95"
          title="Gal ama Sameyso Koonto"
        >
          <i class="fa-solid fa-user text-xs"></i>
          <span>Gal / Login</span>
        </button>
      `;
      const loginBtn = document.getElementById('open-login-btn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => this.openAuthModal());
      }
    }

    this.updateOwnerVisibility();
  }

  updateOwnerVisibility() {
    const ownerControls = document.getElementById('owner-controls');
    const heroOwnerControls = document.getElementById('hero-owner-controls');
    const isOwner = this.isOwner();

    if (ownerControls) {
      if (isOwner) {
        ownerControls.classList.remove('hidden');
        ownerControls.classList.add('flex');
      } else {
        ownerControls.classList.add('hidden');
        ownerControls.classList.remove('flex');
      }
    }

    if (heroOwnerControls) {
      if (isOwner) {
        heroOwnerControls.classList.remove('hidden');
        heroOwnerControls.classList.add('flex');
      } else {
        heroOwnerControls.classList.add('hidden');
        heroOwnerControls.classList.remove('flex');
      }
    }

    if (isOwner) {
      this.isAdminLoggedIn = true;
    } else {
      this.isAdminLoggedIn = false;
      this.closeAdminPanelModal();
      this.closeAddMovieModal();
    }

    // If movies list is empty, refresh empty-state UI to hide/show owner action
    if (this.movies && this.movies.length === 0) {
      this.renderMovies();
    }
  }

  openAuthModal(mode = 'login') {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    this.setAuthMode(mode);
    this.clearAuthError();
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  setAuthMode(mode) {
    this.authMode = mode;
    const tabLogin = document.getElementById('auth-tab-login');
    const tabSignup = document.getElementById('auth-tab-signup');
    const nameGroup = document.getElementById('auth-name-group');
    const nameInput = document.getElementById('auth-name-input');
    const submitText = document.getElementById('auth-submit-text');
    const modalTitle = document.getElementById('auth-modal-title');
    const modalSubtitle = document.getElementById('auth-modal-subtitle');

    this.clearAuthError();

    if (mode === 'signup') {
      if (tabSignup) {
        tabSignup.className = "flex-1 py-2 text-xs font-bold rounded-lg text-white bg-blue-600 transition-all shadow-md";
      }
      if (tabLogin) {
        tabLogin.className = "flex-1 py-2 text-xs font-bold rounded-lg text-gray-400 hover:text-white transition-all";
      }
      if (nameGroup) nameGroup.classList.remove('hidden');
      if (nameInput) nameInput.required = true;
      if (submitText) submitText.textContent = "Sameyso Koonto Cusub";
      if (modalTitle) modalTitle.textContent = "Is-Diiwaangeli";
      if (modalSubtitle) modalSubtitle.textContent = "Kusoo biir Qambi Filims si aad filimo u daawato";
    } else {
      if (tabLogin) {
        tabLogin.className = "flex-1 py-2 text-xs font-bold rounded-lg text-white bg-blue-600 transition-all shadow-md";
      }
      if (tabSignup) {
        tabSignup.className = "flex-1 py-2 text-xs font-bold rounded-lg text-gray-400 hover:text-white transition-all";
      }
      if (nameGroup) nameGroup.classList.add('hidden');
      if (nameInput) nameInput.required = false;
      if (submitText) submitText.textContent = "Gal Hadda";
      if (modalTitle) modalTitle.textContent = "Ku Soo Dhawoow";
      if (modalSubtitle) modalSubtitle.textContent = "Gal koontadaada Qambi Filims";
    }
  }

  clearAuthError() {
    const errorBox = document.getElementById('auth-error-box');
    if (errorBox) errorBox.classList.add('hidden');
  }

  showAuthError(message) {
    const errorBox = document.getElementById('auth-error-box');
    const errorText = document.getElementById('auth-error-text');
    if (errorBox && errorText) {
      errorText.textContent = message;
      errorBox.classList.remove('hidden');
    }
  }

  handleAuthSubmit(e) {
    e.preventDefault();
    if (!window.QAMBI_FIREBASE || !window.QAMBI_FIREBASE.auth) {
      this.showToast("Firebase Auth wali diyaar ma aha", "error");
      return;
    }

    const { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } = window.QAMBI_FIREBASE;
    const email = document.getElementById('auth-email-input').value.trim();
    const password = document.getElementById('auth-password-input').value;
    const nameInput = document.getElementById('auth-name-input');
    const name = nameInput ? nameInput.value.trim() : '';

    this.clearAuthError();

    if (this.authMode === 'signup') {
      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          if (name && userCredential.user) {
            updateProfile(userCredential.user, { displayName: name }).catch(() => {});
          }
          this.closeAuthModal();
          const isOwner = email.toLowerCase() === this.ownerEmail.toLowerCase();
          const welcomeMsg = isOwner 
            ? `Ku soo dhawaaw Qambi Filims, Mudane Milkiile (Owner)! Awoodaha Admin-ka waa kuu diyaar.`
            : `Ku soo dhawaaw Qambi Filims, ${name || email}!`;
          this.showToast(welcomeMsg, 'success');
        })
        .catch((err) => {
          console.error("Auth sign up error:", err);
          let msg = "Khalad ayaa dhacay xilliga is-diiwaangelinta.";
          if (err.code === 'auth/email-already-in-use') {
            msg = "Email-kan hore ayaa loo isticmaalay. Fadlan gal (Sign In).";
          } else if (err.code === 'auth/weak-password') {
            msg = "Password-ku waa inuu ka koobnaadaa ugu yaraan 6 xaraf.";
          } else if (err.code === 'auth/invalid-email') {
            msg = "Email-ku ma saxna. Fadlan hubi.";
          }
          this.showAuthError(msg);
        });
    } else {
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          this.closeAuthModal();
          const user = userCredential.user;
          const displayName = user.displayName || user.email.split('@')[0];
          const isOwner = user.email && user.email.toLowerCase() === this.ownerEmail.toLowerCase();
          const welcomeMsg = isOwner
            ? `Ku soo dhawaaw Mudane Milkiile (Owner: ${displayName})! Dashboard-ka waa kuu furan yahay.`
            : `Ku soo dhawaaw, ${displayName}!`;
          this.showToast(welcomeMsg, 'success');
        })
        .catch((err) => {
          console.error("Auth sign in error:", err);
          let msg = "Email-ka ama password-ka ayaa khaldan.";
          if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            msg = "Email-ka ama password-ka ayaa khaldan. Fadlan dib u hubi.";
          }
          this.showAuthError(msg);
        });
    }
  }

  handleAuthLogout() {
    if (window.QAMBI_FIREBASE && window.QAMBI_FIREBASE.auth) {
      const { auth, signOut } = window.QAMBI_FIREBASE;
      signOut(auth).then(() => {
        this.showToast("Waad ka baxday koontadaadii.", "info");
      }).catch(err => {
        console.error("Logout error:", err);
      });
    }
  }

  initFirebase() {
    if (!window.QAMBI_FIREBASE || !window.QAMBI_FIREBASE.db) return;
    const { db, collection, onSnapshot } = window.QAMBI_FIREBASE;

    try {
      const moviesCol = collection(db, 'movies');
      onSnapshot(moviesCol, (snapshot) => {
        const cloudMovies = [];
        snapshot.forEach((docSnap) => {
          cloudMovies.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (cloudMovies.length > 0 || this.movies.length === 0) {
          this.movies = cloudMovies;
          this.saveMovies();
          this.renderMovies();
          this.updateYearCounts();
          this.updateAdminStats();
          this.renderAdminTable();
        }
        this.setFirebaseStatus(true);
      }, (err) => {
        console.warn("Firestore snapshot notice:", err.message);
        this.setFirebaseStatus(false);
      });
    } catch (e) {
      console.warn("Firebase listener error:", e);
      this.setFirebaseStatus(false);
    }
  }

  setFirebaseStatus(online) {
    this.isFirebaseConnected = online;
    const badge = document.getElementById('firebase-status-badge');
    if (badge) {
      if (online) {
        badge.className = "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400";
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>Firebase Cloud</span>`;
      } else {
        badge.className = "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-blue-950/60 border border-blue-500/40 text-blue-300";
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-blue-400"></span><span>Local Ready</span>`;
      }
    }
  }

  saveMovieToCloud(movie) {
    if (window.QAMBI_FIREBASE && window.QAMBI_FIREBASE.db) {
      const { db, doc, setDoc } = window.QAMBI_FIREBASE;
      setDoc(doc(db, 'movies', movie.id), movie).then(() => {
        console.log("Movie saved to Firebase Cloud:", movie.title);
      }).catch(err => {
        console.warn("Firebase save error (saved locally):", err.message);
      });
    }
  }

  updateMovieInCloud(movie) {
    if (window.QAMBI_FIREBASE && window.QAMBI_FIREBASE.db) {
      const { db, doc, setDoc } = window.QAMBI_FIREBASE;
      setDoc(doc(db, 'movies', movie.id), movie, { merge: true }).then(() => {
        console.log("Movie updated in Firebase Cloud:", movie.title);
      }).catch(err => {
        console.warn("Firebase update error (saved locally):", err.message);
      });
    }
  }

  deleteMovieFromCloud(movieId) {
    if (window.QAMBI_FIREBASE && window.QAMBI_FIREBASE.db) {
      const { db, doc, deleteDoc } = window.QAMBI_FIREBASE;
      deleteDoc(doc(db, 'movies', movieId)).then(() => {
        console.log("Movie deleted from Firebase Cloud:", movieId);
      }).catch(err => {
        console.warn("Firebase delete error (deleted locally):", err.message);
      });
    }
  }

  // 2. Event Listeners
  initEventListeners() {
    // Search inputs (both navbar & filter bar)
    const navSearch = document.getElementById('nav-search');
    const filterSearch = document.getElementById('filter-search');

    const handleSearch = (val) => {
      this.searchQuery = val.trim().toLowerCase();
      if (navSearch && navSearch.value !== val) navSearch.value = val;
      if (filterSearch && filterSearch.value !== val) filterSearch.value = val;
      this.renderMovies();
    };

    if (navSearch) {
      navSearch.addEventListener('input', (e) => handleSearch(e.target.value));
    }
    if (filterSearch) {
      filterSearch.addEventListener('input', (e) => handleSearch(e.target.value));
    }

    // Clear search
    const clearSearchBtn = document.getElementById('clear-search-btn');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (navSearch) navSearch.value = '';
        if (filterSearch) filterSearch.value = '';
        handleSearch('');
      });
    }

    // Year Dropdown Filter
    const yearSelect = document.getElementById('year-filter-select');
    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        this.setYearFilter(e.target.value);
      });
    }

    // Year Quick Badges / Chips
    document.querySelectorAll('[data-year-filter]').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const year = chip.getAttribute('data-year-filter');
        this.setYearFilter(year);
      });
    });

    // Genre Filter Chips
    document.querySelectorAll('[data-genre-filter]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const genre = chip.getAttribute('data-genre-filter');
        this.setGenreFilter(genre);
      });
    });

    // Sort By Dropdown
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.renderMovies();
      });
    }

    // 3D Carousel Next/Prev controls
    const heroNextBtn = document.getElementById('hero-next-btn');
    const heroPrevBtn = document.getElementById('hero-prev-btn');
    if (heroNextBtn) {
      heroNextBtn.addEventListener('click', () => {
        if (window.cinema3D) window.cinema3D.next();
      });
    }
    if (heroPrevBtn) {
      heroPrevBtn.addEventListener('click', () => {
        if (window.cinema3D) window.cinema3D.prev();
      });
    }

    // Add Movie Modal triggers
    const openAddMovieBtns = document.querySelectorAll('.open-add-movie-btn');
    openAddMovieBtns.forEach((btn) => {
      btn.addEventListener('click', () => this.openAddMovieModal());
    });

    const closeAddMovieBtn = document.getElementById('close-add-modal-btn');
    if (closeAddMovieBtn) {
      closeAddMovieBtn.addEventListener('click', () => this.closeAddMovieModal());
    }

    // Add Movie Form Submit
    const addMovieForm = document.getElementById('add-movie-form');
    if (addMovieForm) {
      addMovieForm.addEventListener('submit', (e) => this.handleAddMovieSubmit(e));
    }

    // Form Image Preview Handler (File Upload or URL)
    const posterUrlInput = document.getElementById('movie-poster-url');
    const posterFileInput = document.getElementById('movie-poster-file');
    const livePreviewImg = document.getElementById('modal-preview-poster');
    const livePreviewTitle = document.getElementById('modal-preview-title');
    const livePreviewYear = document.getElementById('modal-preview-year');
    const livePreviewGenre = document.getElementById('modal-preview-genre');

    const dropzone = document.getElementById('movie-poster-dropzone');
    const dropzoneContent = document.getElementById('poster-dropzone-content');
    const dropzonePreview = document.getElementById('poster-dropzone-preview');
    const dropzoneImg = document.getElementById('poster-dropzone-img');
    const fileStatus = document.getElementById('poster-file-status');

    const updatePosterDisplay = (src, label = null) => {
      if (livePreviewImg) livePreviewImg.src = src;
      if (dropzoneImg) dropzoneImg.src = src;
      if (dropzoneContent) dropzoneContent.classList.add('hidden');
      if (dropzonePreview) dropzonePreview.classList.remove('hidden');
      if (fileStatus && label) fileStatus.textContent = label;
    };

    if (posterUrlInput) {
      posterUrlInput.addEventListener('input', (e) => {
        if (e.target.value) {
          updatePosterDisplay(e.target.value, 'Link URL');
        }
      });
    }

    if (posterFileInput) {
      posterFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target.result;
            if (posterUrlInput) posterUrlInput.value = dataUrl;
            updatePosterDisplay(dataUrl, file.name);
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (dropzone) {
      ['dragenter', 'dragover'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          dropzone.classList.add('border-cyan-400', 'bg-gray-800');
        });
      });
      ['dragleave', 'drop'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          dropzone.classList.remove('border-cyan-400', 'bg-gray-800');
        });
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files && files.length > 0 && posterFileInput) {
          posterFileInput.files = files;
          posterFileInput.dispatchEvent(new Event('change'));
        }
      });
    }

    const titleInput = document.getElementById('movie-title-input');
    if (titleInput && livePreviewTitle) {
      titleInput.addEventListener('input', (e) => {
        livePreviewTitle.textContent = e.target.value || 'Cinwaanka Filimka';
      });
    }

    const yearInput = document.getElementById('movie-year-input');
    if (yearInput && livePreviewYear) {
      yearInput.addEventListener('input', (e) => {
        livePreviewYear.textContent = e.target.value || '2026';
      });
    }

    const genreInput = document.getElementById('movie-genre-input');
    if (genreInput && livePreviewGenre) {
      genreInput.addEventListener('change', (e) => {
        livePreviewGenre.textContent = e.target.value || 'Action';
      });
    }

    // Video Player Modal Close
    const closeVideoModalBtn = document.getElementById('close-video-modal-btn');
    if (closeVideoModalBtn) {
      closeVideoModalBtn.addEventListener('click', () => this.closeVideoModal());
    }

    // Details Modal Close
    const closeDetailsModalBtn = document.getElementById('close-details-modal-btn');
    if (closeDetailsModalBtn) {
      closeDetailsModalBtn.addEventListener('click', () => this.closeDetailsModal());
    }

    // Admin Panel Events (Directly opened by Owner)
    const openAdminBtn = document.getElementById('open-admin-btn');
    if (openAdminBtn) {
      openAdminBtn.addEventListener('click', () => this.openAdminModal());
    }

    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    if (adminLogoutBtn) {
      adminLogoutBtn.addEventListener('click', () => this.handleAdminLogout());
    }

    const closeAdminPanelBtn = document.getElementById('close-admin-panel-btn');
    if (closeAdminPanelBtn) {
      closeAdminPanelBtn.addEventListener('click', () => this.closeAdminPanelModal());
    }

    // Admin Table Search & Filter inputs
    const adminSearchInput = document.getElementById('admin-search-input');
    if (adminSearchInput) {
      adminSearchInput.addEventListener('input', (e) => {
        this.adminSearchQuery = e.target.value.trim().toLowerCase();
        this.renderAdminTable();
      });
    }

    const adminSomaliFilter = document.getElementById('admin-somali-filter');
    if (adminSomaliFilter) {
      adminSomaliFilter.addEventListener('change', (e) => {
        this.adminSomaliFilter = e.target.value;
        this.renderAdminTable();
      });
    }

    const adminGenreFilter = document.getElementById('admin-genre-filter');
    if (adminGenreFilter) {
      adminGenreFilter.addEventListener('change', (e) => {
        this.adminGenreFilter = e.target.value;
        this.renderAdminTable();
      });
    }

    // Edit Movie Modal Events
    const editMovieForm = document.getElementById('edit-movie-form');
    if (editMovieForm) {
      editMovieForm.addEventListener('submit', (e) => this.handleEditMovieSubmit(e));
    }

    const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
    if (closeEditModalBtn) {
      closeEditModalBtn.addEventListener('click', () => this.closeEditMovieModal());
    }

    const editPosterFileInput = document.getElementById('edit-movie-poster-file');
    if (editPosterFileInput) {
      editPosterFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const posterInput = document.getElementById('edit-movie-poster');
            if (posterInput) posterInput.value = event.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // User Auth Modal Events
    const openLoginBtn = document.getElementById('open-login-btn');
    if (openLoginBtn) {
      openLoginBtn.addEventListener('click', () => this.openAuthModal());
    }

    const closeAuthModalBtn = document.getElementById('close-auth-modal-btn');
    if (closeAuthModalBtn) {
      closeAuthModalBtn.addEventListener('click', () => this.closeAuthModal());
    }

    const authTabLogin = document.getElementById('auth-tab-login');
    if (authTabLogin) {
      authTabLogin.addEventListener('click', () => this.setAuthMode('login'));
    }

    const authTabSignup = document.getElementById('auth-tab-signup');
    if (authTabSignup) {
      authTabSignup.addEventListener('click', () => this.setAuthMode('signup'));
    }

    const authForm = document.getElementById('auth-form');
    if (authForm) {
      authForm.addEventListener('submit', (e) => this.handleAuthSubmit(e));
    }

    // Click outside modal backdrops
    window.addEventListener('click', (e) => {
      const addModal = document.getElementById('add-movie-modal');
      const videoModal = document.getElementById('video-modal');
      const detailsModal = document.getElementById('details-modal');
      const adminPanelModal = document.getElementById('admin-panel-modal');
      const editModal = document.getElementById('edit-movie-modal');
      const authModal = document.getElementById('auth-modal');

      if (e.target === addModal) this.closeAddMovieModal();
      if (e.target === videoModal) this.closeVideoModal();
      if (e.target === detailsModal) this.closeDetailsModal();
      if (e.target === adminPanelModal) this.closeAdminPanelModal();
      if (e.target === editModal) this.closeEditMovieModal();
      if (e.target === authModal) this.closeAuthModal();
    });

    // Escape key to close modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAddMovieModal();
        this.closeVideoModal();
        this.closeDetailsModal();
        this.closeAdminPanelModal();
        this.closeEditMovieModal();
        this.closeAuthModal();
      }
    });

    // Reset Data / Seed Default
    const resetDataBtn = document.getElementById('reset-data-btn');
    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => {
        if (confirm('Ma hubtaa inaad dib ugu celiso xogta asalka ah? Filimada aad ku dartay way tirtirmi doonaan.')) {
          this.movies = [...DEFAULT_MOVIES];
          this.saveMovies();
          this.renderMovies();
          this.showToast('Xogtii asalka ahayd dib ayaa loo soo celiyay!', 'success');
          if (window.cinema3D) window.cinema3D.loadFeaturedMovies();
        }
      });
    }

    // Export Data JSON
    const exportDataBtn = document.getElementById('export-data-btn');
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.movies, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `qambi_filims_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        this.showToast('Xogta filimada waa la dhoofiyay!', 'success');
      });
    }
  }

  // 3. Filter Setters
  setYearFilter(year) {
    this.selectedYear = year;
    // Update select
    const select = document.getElementById('year-filter-select');
    if (select && select.value !== year) select.value = year;

    // Update chip styling
    document.querySelectorAll('[data-year-filter]').forEach((chip) => {
      if (chip.getAttribute('data-year-filter') === year) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    this.renderMovies();
  }

  setGenreFilter(genre) {
    this.selectedGenre = genre;
    document.querySelectorAll('[data-genre-filter]').forEach((chip) => {
      if (chip.getAttribute('data-genre-filter') === genre) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
    this.renderMovies();
  }

  updateYearCounts() {
    const yearCounts = {};
    this.movies.forEach((m) => {
      yearCounts[m.year] = (yearCounts[m.year] || 0) + 1;
    });

    // Populate or update year badge counts if needed
    document.querySelectorAll('[data-year-filter]').forEach((chip) => {
      const yr = chip.getAttribute('data-year-filter');
      const badge = chip.querySelector('.year-count');
      if (badge) {
        if (yr === 'all') {
          badge.textContent = `(${this.movies.length})`;
        } else if (yr === 'older') {
          const olderCount = this.movies.filter(m => m.year <= 2020).length;
          badge.textContent = `(${olderCount})`;
        } else {
          badge.textContent = `(${yearCounts[yr] || 0})`;
        }
      }
    });
  }

  // 4. Filtering and Sorting Logic
  getFilteredMovies() {
    return this.movies.filter((movie) => {
      // 1. Search filter
      if (this.searchQuery) {
        const query = this.searchQuery;
        const matchTitle = movie.title && movie.title.toLowerCase().includes(query);
        const matchDesc = movie.description && movie.description.toLowerCase().includes(query);
        const matchGenre = movie.genre && movie.genre.toLowerCase().includes(query);
        const matchDirector = movie.director && movie.director.toLowerCase().includes(query);
        const matchCast = Array.isArray(movie.cast) && movie.cast.some(actor => actor.toLowerCase().includes(query));
        const matchYear = movie.year && movie.year.toString().includes(query);

        if (!matchTitle && !matchDesc && !matchGenre && !matchDirector && !matchCast && !matchYear) {
          return false;
        }
      }

      // 2. Year filter
      if (this.selectedYear !== 'all') {
        if (this.selectedYear === 'older') {
          if (movie.year > 2020) return false;
        } else {
          if (movie.year.toString() !== this.selectedYear.toString()) return false;
        }
      }

      // 3. Genre filter
      if (this.selectedGenre !== 'all') {
        if (this.selectedGenre === 'Af-Soomaali') {
          if (!movie.isSomali) return false;
        } else {
          if (movie.genre.toLowerCase() !== this.selectedGenre.toLowerCase()) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sorting
      if (this.sortBy === 'newest') {
        return (b.year || 0) - (a.year || 0);
      } else if (this.sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      } else if (this.sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }

  // 5. Render Movies Grid
  renderMovies() {
    const grid = document.getElementById('movies-grid');
    const emptyState = document.getElementById('empty-state');
    const countBadge = document.getElementById('movies-count-badge');
    if (!grid) return;

    const filtered = this.getFilteredMovies();

    if (countBadge) {
      countBadge.textContent = `Waxaa la helay: ${filtered.length} filim`;
    }

    if (this.movies.length === 0) {
      grid.innerHTML = '';
      if (emptyState) {
        if (this.isOwner()) {
          emptyState.innerHTML = `
            <div class="w-20 h-20 mx-auto rounded-2xl bg-blue-600/10 border border-cyan-500/30 flex items-center justify-center text-3xl text-cyan-400 mb-4 shadow-xl shadow-cyan-500/10">
              <i class="fa-solid fa-clapperboard"></i>
            </div>
            <h3 class="text-2xl font-black text-white mb-2">Wali Wax Filim Ah Kuma Jiraan</h3>
            <p class="text-gray-400 text-sm max-w-md mx-auto mb-6 leading-relaxed">
              Dhammaan filimadii hore waa la wada saaray. Mudane Milkiile, guji badhanka hoose ama Admin Panel si aad filim ugu soo darto!
            </p>
            <button class="open-add-movie-btn bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold px-8 py-3.5 rounded-full text-sm shadow-xl shadow-cyan-500/30 transition-transform active:scale-95 flex items-center gap-2 mx-auto">
              <i class="fa-solid fa-plus"></i> Ku Dar Filim Cusub (Owner)
            </button>
          `;
          const addBtn = emptyState.querySelector('.open-add-movie-btn');
          if (addBtn) addBtn.onclick = () => this.openAddMovieModal();
        } else {
          emptyState.innerHTML = `
            <div class="w-20 h-20 mx-auto rounded-2xl bg-blue-600/10 border border-cyan-500/30 flex items-center justify-center text-3xl text-cyan-400 mb-4 shadow-xl shadow-cyan-500/10">
              <i class="fa-solid fa-film"></i>
            </div>
            <h3 class="text-2xl font-black text-white mb-2">Filimo Cusub Ayaa Soo Socda</h3>
            <p class="text-gray-400 text-sm max-w-md mx-auto mb-6 leading-relaxed">
              Dhammaan filimada waxaa si toos ah u soo gelin doona maamulka Qambi Filims. Fadlan dib ugu soo laabo goor dhow!
            </p>
          `;
        }
        emptyState.classList.remove('hidden');
      }
      return;
    }

    if (filtered.length === 0) {
      grid.innerHTML = '';
      if (emptyState) {
        emptyState.innerHTML = `
          <div class="w-16 h-16 mx-auto rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl text-gray-500 mb-4">
            <i class="fa-solid fa-magnifying-glass"></i>
          </div>
          <h3 class="text-xl font-bold text-white mb-2">Lama helin filim ku habboon</h3>
          <p class="text-gray-400 text-sm max-w-md mx-auto mb-6">
            Wax natiijo ah lagama helin raadintaada ama sanadka aad dooratay.
          </p>
          <button onclick="window.QAMBI_APP.setYearFilter('all'); window.QAMBI_APP.setGenreFilter('all'); document.getElementById('filter-search').value=''; window.QAMBI_APP.searchQuery='';" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-full text-xs shadow-lg transition-transform active:scale-95">
            Dib u deji shaandheynta (Reset)
          </button>
        `;
        emptyState.classList.remove('hidden');
      }
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    grid.innerHTML = filtered.map((movie) => {
      const somaliBadge = movie.isSomali 
        ? `<span class="badge-somali px-2.5 py-0.5 text-xs font-semibold rounded-full text-white tracking-wide shadow-sm flex items-center gap-1">
             <i class="fa-solid fa-language"></i> Af-Soomaali
           </span>`
        : '';

      const qualityBadge = movie.quality 
        ? `<span class="badge-4k px-2 py-0.5 text-[10px] font-black rounded text-white tracking-wider">
             ${movie.quality}
           </span>`
        : `<span class="bg-gray-800 text-gray-300 px-2 py-0.5 text-[10px] font-bold rounded">HD</span>`;

      return `
        <div class="movie-card group cursor-pointer" data-movie-id="${movie.id}">
          <div class="movie-card-inner relative flex flex-col h-full">
            
            <!-- Poster Container -->
            <div class="movie-card-poster relative">
              <img 
                src="${movie.poster}" 
                alt="${movie.title}" 
                loading="lazy"
                onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80'"
              />
              <div class="movie-card-sheen"></div>

              <!-- Top Badges -->
              <div class="absolute top-3 left-3 right-3 flex justify-between items-start z-10 gap-2 pointer-events-none">
                <span class="badge-year px-2.5 py-1 text-xs font-bold text-white rounded-md flex items-center gap-1">
                  <i class="fa-regular fa-calendar text-red-500"></i> ${movie.year}
                </span>
                <div class="flex flex-col items-end gap-1">
                  ${qualityBadge}
                  ${somaliBadge}
                </div>
              </div>

              <!-- Floating Quick Play Overlay on Hover -->
              <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10">
                <div class="flex items-center gap-2 mb-2">
                  <button class="quick-play-btn flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 text-sm" data-id="${movie.id}">
                    <i class="fa-solid fa-play text-xs"></i> Daawo Hadda
                  </button>
                  <button class="quick-info-btn bg-white/20 hover:bg-white/30 backdrop-blur-md text-white p-2 rounded-lg transition-colors text-sm" data-id="${movie.id}" title="Faahfaahin">
                    <i class="fa-solid fa-info-circle"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Card Bottom Meta -->
            <div class="p-4 flex flex-col flex-grow justify-between bg-gradient-to-b from-[#111827] to-[#0a0e1a]">
              <div>
                <div class="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                  <span class="font-medium text-cyan-400">${movie.genre}</span>
                  <span class="flex items-center gap-1 text-amber-400 font-bold">
                    <i class="fa-solid fa-star text-[11px]"></i> ${movie.rating}
                  </span>
                </div>
                <h3 class="text-base font-bold text-white group-hover:text-red-500 transition-colors line-clamp-1 title-text" title="${movie.title}">
                  ${movie.title}
                </h3>
                <p class="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                  ${movie.description}
                </p>
              </div>

              <!-- Date & Duration footer -->
              <div class="pt-3 mt-3 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-500">
                <span><i class="fa-regular fa-clock mr-1 text-gray-400"></i>${movie.duration || '2h 10m'}</span>
                <span><i class="fa-regular fa-calendar-check mr-1 text-gray-400"></i>${movie.releaseDate || movie.year}</span>
              </div>
            </div>

          </div>
        </div>
      `;
    }).join('');

    this.attachCardEventListeners();
    this.attach3DTiltEffect();
  }

  // 6. Card Interactions & 3D Tilt
  attachCardEventListeners() {
    // Quick Play buttons
    document.querySelectorAll('.quick-play-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const movie = this.movies.find(m => m.id === id);
        if (movie) this.openVideoModal(movie);
      });
    });

    // Quick Info buttons
    document.querySelectorAll('.quick-info-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const movie = this.movies.find(m => m.id === id);
        if (movie) this.openDetailsModal(movie);
      });
    });

    // Whole card click opens Details Modal
    document.querySelectorAll('.movie-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-movie-id');
        const movie = this.movies.find(m => m.id === id);
        if (movie) this.openDetailsModal(movie);
      });
    });
  }

  attach3DTiltEffect() {
    const cards = document.querySelectorAll('.movie-card');
    cards.forEach((card) => {
      const inner = card.querySelector('.movie-card-inner');
      if (!inner) return;

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        inner.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
      });

      card.addEventListener('mouseleave', () => {
        inner.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      });
    });
  }

  // 7. Modals: Video Player
  openVideoModal(movie) {
    const modal = document.getElementById('video-modal');
    const container = document.getElementById('video-player-container');
    const title = document.getElementById('video-modal-title');
    const desc = document.getElementById('video-modal-desc');
    const date = document.getElementById('video-modal-date');
    const rating = document.getElementById('video-modal-rating');
    const genre = document.getElementById('video-modal-genre');

    if (!modal) return;

    if (title) title.textContent = movie.title;
    if (desc) desc.textContent = movie.description;
    if (date) date.textContent = movie.releaseDate || `Sanadka: ${movie.year}`;
    if (rating) rating.innerHTML = `<i class="fa-solid fa-star text-amber-400 mr-1"></i>${movie.rating} / 10`;
    if (genre) genre.textContent = movie.genre;

    // Check trailer source
    if (container) {
      if (movie.trailerUrl && (movie.trailerUrl.includes('youtube.com') || movie.trailerUrl.includes('youtu.be'))) {
        let embedUrl = movie.trailerUrl;
        if (!embedUrl.includes('embed')) {
          const videoId = embedUrl.split('v=')[1]?.split('&')[0] || embedUrl.split('/').pop();
          embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        } else if (!embedUrl.includes('autoplay=1')) {
          embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'autoplay=1';
        }
        container.innerHTML = `
          <iframe 
            src="${embedUrl}" 
            title="${movie.title} Trailer" 
            class="w-full h-full rounded-xl"
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
        `;
      } else if (movie.trailerUrl && movie.trailerUrl.endsWith('.mp4')) {
        container.innerHTML = `
          <video controls autoplay class="w-full h-full rounded-xl object-contain bg-black">
            <source src="${movie.trailerUrl}" type="video/mp4">
            Birawsarkaagu ma taageerayo muuqaalkan.
          </video>
        `;
      } else {
        // Fallback: cinematic trailer preview placeholder
        container.innerHTML = `
          <div class="w-full h-full relative rounded-xl overflow-hidden flex flex-col items-center justify-center text-center p-6 bg-cover bg-center" style="background-image: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.9)), url('${movie.poster}')">
            <div class="w-20 h-20 rounded-full bg-red-600/90 text-white flex items-center justify-center text-3xl mb-4 shadow-xl pulse-glow">
              <i class="fa-solid fa-film"></i>
            </div>
            <h4 class="text-2xl font-bold text-white mb-2">${movie.title}</h4>
            <p class="text-sm text-gray-300 max-w-lg mb-4">Muuqaalka tooska ah ee filimkan waxaa la daawan karaa shineemada Qambi Filims. Qoraalka iyo macluumaadka hoos ka akhriso.</p>
            <span class="badge-4k px-3 py-1 rounded-full text-xs font-bold text-white">${movie.quality || '4K ULTRA HD'}</span>
          </div>
        `;
      }
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  closeVideoModal() {
    const modal = document.getElementById('video-modal');
    const container = document.getElementById('video-player-container');
    if (modal) modal.classList.add('hidden');
    if (container) container.innerHTML = ''; // Stop video audio
    document.body.style.overflow = 'auto';
  }

  // 8. Modals: Movie Details
  openDetailsModal(movie) {
    const modal = document.getElementById('details-modal');
    if (!modal) return;

    document.getElementById('details-modal-poster').src = movie.poster;
    document.getElementById('details-modal-title').textContent = movie.title;
    document.getElementById('details-modal-desc').textContent = movie.description;
    document.getElementById('details-modal-year').textContent = movie.year;
    document.getElementById('details-modal-date').textContent = movie.releaseDate || movie.year;
    document.getElementById('details-modal-rating').innerHTML = `<i class="fa-solid fa-star text-amber-400 mr-1"></i>${movie.rating}`;
    document.getElementById('details-modal-genre').textContent = movie.genre;
    document.getElementById('details-modal-director').textContent = movie.director || 'Lama cayimin';
    document.getElementById('details-modal-duration').textContent = movie.duration || '2h 10m';

    const castContainer = document.getElementById('details-modal-cast');
    if (castContainer) {
      if (Array.isArray(movie.cast) && movie.cast.length > 0) {
        castContainer.innerHTML = movie.cast.map(c => `
          <span class="bg-gray-800 text-gray-200 text-xs px-2.5 py-1 rounded-md border border-gray-700">
            ${c}
          </span>
        `).join('');
      } else {
        castContainer.innerHTML = `<span class="text-gray-400 text-xs">Jilayaal laguma darin</span>`;
      }
    }

    const playBtn = document.getElementById('details-play-now-btn');
    if (playBtn) {
      playBtn.onclick = () => {
        this.closeDetailsModal();
        this.openVideoModal(movie);
      };
    }

    // Delete button for this movie
    const deleteBtn = document.getElementById('details-delete-movie-btn');
    if (deleteBtn) {
      deleteBtn.onclick = () => {
        if (confirm(`Ma hubtaa inaad tirtirto filimka "${movie.title}"?`)) {
          this.movies = this.movies.filter(m => m.id !== movie.id);
          this.saveMovies();
          this.renderMovies();
          this.updateYearCounts();
          this.closeDetailsModal();
          this.showToast(`Filimka "${movie.title}" waa la tirtiray!`, 'info');
          if (window.cinema3D) window.cinema3D.loadFeaturedMovies();
        }
      };
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  closeDetailsModal() {
    const modal = document.getElementById('details-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  // 9. Modals: Add Movie
  openAddMovieModal() {
    if (!this.isOwner()) {
      this.showToast('Keliya milkiilaha (Owner: Qambimustafe@gmail.com) ayaa filim ku dari kara!', 'error');
      return;
    }
    const modal = document.getElementById('add-movie-modal');
    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  closeAddMovieModal() {
    const modal = document.getElementById('add-movie-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  handleAddMovieSubmit(e) {
    e.preventDefault();

    if (!this.isOwner()) {
      this.showToast('Keliya milkiilaha (Owner) ayaa awood u leh inuu filim ku daro!', 'error');
      return;
    }

    const title = document.getElementById('movie-title-input').value.trim();
    const genre = document.getElementById('movie-genre-input').value;
    const year = parseInt(document.getElementById('movie-year-input').value) || new Date().getFullYear();
    const releaseDate = document.getElementById('movie-date-input').value || `${year}-01-01`;
    const rating = parseFloat(document.getElementById('movie-rating-input').value) || 8.5;
    const poster = document.getElementById('movie-poster-url').value.trim() || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80';
    const trailerUrl = document.getElementById('movie-trailer-input').value.trim();
    const duration = document.getElementById('movie-duration-input').value.trim() || '2h 00m';
    const director = document.getElementById('movie-director-input').value.trim() || 'Agaasime Qambi';
    const description = document.getElementById('movie-desc-input').value.trim();
    const isSomali = document.getElementById('movie-somali-checkbox').checked;
    const castInput = document.getElementById('movie-cast-input').value.trim();
    const cast = castInput ? castInput.split(',').map(s => s.trim()) : ['Jilayaal Qambi'];

    if (!title || !description) {
      this.showToast('Fadlan buuxi magaca filimka iyo faahfaahinta!', 'error');
      return;
    }

    const newMovie = {
      id: 'qf-' + Date.now(),
      title,
      year,
      releaseDate,
      genre,
      isSomali,
      rating,
      duration,
      director,
      quality: '4K ULTRA HD',
      poster,
      trailerUrl: trailerUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      featured: false,
      description,
      cast
    };

    // Add to beginning of array so it appears first!
    this.movies.unshift(newMovie);
    this.saveMovies();
    this.saveMovieToCloud(newMovie); // Save to Firebase Cloud
    this.updateYearCounts();
    this.renderMovies();

    // Update Admin Stats & Table if open
    this.updateAdminStats();
    this.renderAdminTable();

    // Reset form & dropzone
    document.getElementById('add-movie-form').reset();
    const dropzoneContent = document.getElementById('poster-dropzone-content');
    const dropzonePreview = document.getElementById('poster-dropzone-preview');
    const fileStatus = document.getElementById('poster-file-status');
    if (dropzoneContent) dropzoneContent.classList.remove('hidden');
    if (dropzonePreview) dropzonePreview.classList.add('hidden');
    if (fileStatus) fileStatus.textContent = 'Wali sawir lama dooran';

    this.closeAddMovieModal();
    this.showToast(`Filimka "${title}" si guul leh ayaa loo keydiyay!`, 'success');

    // Update 3D Hero if needed
    if (window.cinema3D) {
      window.cinema3D.loadFeaturedMovies();
    }
  }

  // ==========================================
  // 10. ADMIN PANEL & MANAGEMENT LOGIC
  // ==========================================

  openAdminModal() {
    if (!this.isOwner()) {
      this.showToast('Keliya milkiilaha (Owner: Qambimustafe@gmail.com) ayaa geli kara Admin Panel-ka!', 'error');
      return;
    }
    this.openAdminPanel();
  }

  handleAdminLogout() {
    this.closeAdminPanelModal();
    this.showToast('Waad ka xirtay Admin Dashboard-ka.', 'info');
  }

  openAdminPanel() {
    const modal = document.getElementById('admin-panel-modal');
    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      this.updateAdminStats();
      this.renderAdminTable();
    }
  }

  closeAdminPanelModal() {
    const modal = document.getElementById('admin-panel-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  updateAdminStats() {
    const totalEl = document.getElementById('admin-stat-total');
    const somaliEl = document.getElementById('admin-stat-somali');
    const newEl = document.getElementById('admin-stat-new');
    const topEl = document.getElementById('admin-stat-top');

    if (!totalEl) return;

    const total = this.movies.length;
    const somali = this.movies.filter(m => m.isSomali).length;
    const newReleases = this.movies.filter(m => m.year >= 2025).length;
    const topRated = this.movies.reduce((max, m) => (m.rating > max ? m.rating : max), 0);

    totalEl.textContent = total;
    if (somaliEl) somaliEl.textContent = somali;
    if (newEl) newEl.textContent = newReleases;
    if (topEl) topEl.textContent = `${topRated} ⭐`;
  }

  renderAdminTable() {
    const tbody = document.getElementById('admin-movies-tbody');
    if (!tbody) return;

    let list = this.movies;

    // Filter by admin search
    if (this.adminSearchQuery) {
      const q = this.adminSearchQuery;
      list = list.filter(m => 
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.genre && m.genre.toLowerCase().includes(q)) ||
        (m.year && m.year.toString().includes(q)) ||
        (m.director && m.director.toLowerCase().includes(q))
      );
    }

    // Filter by Somali status
    if (this.adminSomaliFilter === 'somali') {
      list = list.filter(m => m.isSomali);
    } else if (this.adminSomaliFilter === 'other') {
      list = list.filter(m => !m.isSomali);
    }

    // Filter by Genre
    if (this.adminGenreFilter !== 'all') {
      list = list.filter(m => m.genre && m.genre.toLowerCase() === this.adminGenreFilter.toLowerCase());
    }

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-8 text-gray-500">
            <i class="fa-solid fa-film text-2xl mb-2 block"></i>
            Filim lagama helin shuruudahan.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((movie) => {
      const somaliBtn = movie.isSomali
        ? `<button class="admin-toggle-somali-btn px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-600/30 text-blue-300 border border-blue-500/50 hover:bg-blue-600 hover:text-white transition-colors" data-id="${movie.id}" title="Guji si aad u bedesho">
             <i class="fa-solid fa-check mr-1"></i> Haa (Soomaali)
           </button>`
        : `<button class="admin-toggle-somali-btn px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 hover:text-gray-200 transition-colors" data-id="${movie.id}" title="Guji si aad u bedesho">
             <i class="fa-solid fa-xmark mr-1"></i> Maya (Caalami)
           </button>`;

      return `
        <tr class="hover:bg-gray-900/60 transition-colors">
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              <img 
                src="${movie.poster}" 
                alt="${movie.title}" 
                class="w-10 h-14 object-cover rounded-lg border border-gray-700 shrink-0 bg-gray-900"
                onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80'"
              />
              <div class="min-w-0">
                <span class="font-bold text-white block truncate max-w-xs" title="${movie.title}">${movie.title}</span>
                <span class="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                  <span><i class="fa-regular fa-clock mr-1"></i>${movie.duration || '2h'}</span>
                  <span><i class="fa-solid fa-user-tie mr-1"></i>${movie.director || 'Qambi'}</span>
                </span>
              </div>
            </div>
          </td>
          <td class="py-3 px-3">
            <span class="badge-year px-2.5 py-1 rounded text-white font-bold text-xs">${movie.year}</span>
          </td>
          <td class="py-3 px-3">
            <span class="text-cyan-400 font-semibold">${movie.genre}</span>
          </td>
          <td class="py-3 px-3">
            ${somaliBtn}
          </td>
          <td class="py-3 px-3">
            <span class="text-amber-400 font-bold flex items-center gap-1">
              <i class="fa-solid fa-star text-[10px]"></i> ${movie.rating}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button class="admin-play-btn w-8 h-8 rounded-lg bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors" data-id="${movie.id}" title="Daawo Trailer">
                <i class="fa-solid fa-play text-xs"></i>
              </button>
              <button class="admin-edit-btn w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/40 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors" data-id="${movie.id}" title="Wax Ka Beddel (Edit)">
                <i class="fa-solid fa-pen text-xs"></i>
              </button>
              <button class="admin-delete-btn w-8 h-8 rounded-lg bg-rose-950/40 text-rose-400 border border-rose-900/50 hover:bg-rose-700 hover:text-white flex items-center justify-center transition-colors" data-id="${movie.id}" title="Tirtir (Delete)">
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.attachAdminTableEvents();
  }

  attachAdminTableEvents() {
    // Somali status toggler
    document.querySelectorAll('.admin-toggle-somali-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.toggleSomaliStatus(id);
      });
    });

    // Edit button
    document.querySelectorAll('.admin-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.openEditMovieModal(id);
      });
    });

    // Delete button
    document.querySelectorAll('.admin-delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.deleteMovie(id);
      });
    });

    // Play button
    document.querySelectorAll('.admin-play-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const movie = this.movies.find(m => m.id === id);
        if (movie) this.openVideoModal(movie);
      });
    });
  }

  toggleSomaliStatus(movieId) {
    if (!this.isOwner()) {
      this.showToast('Keliya milkiilaha (Owner) ayaa awood u leh!', 'error');
      return;
    }
    const movie = this.movies.find(m => m.id === movieId);
    if (!movie) return;

    movie.isSomali = !movie.isSomali;
    this.saveMovies();
    this.updateMovieInCloud(movie); // Sync with Firebase Cloud
    this.renderMovies();
    this.renderAdminTable();
    this.updateAdminStats();
    this.showToast(`Filimka "${movie.title}" waxaa loo beddelay: ${movie.isSomali ? 'Af-Soomaali' : 'Caalami'}!`, 'info');
  }

  deleteMovie(movieId) {
    if (!this.isOwner()) {
      this.showToast('Keliya milkiilaha (Owner) ayaa tirtiri kara filim!', 'error');
      return;
    }
    const movie = this.movies.find(m => m.id === movieId);
    if (!movie) return;

    if (confirm(`Ma hubtaa inaad tirtirto filimka "${movie.title}"?`)) {
      this.movies = this.movies.filter(m => m.id !== movieId);
      this.saveMovies();
      this.deleteMovieFromCloud(movieId); // Sync delete with Firebase Cloud
      this.renderMovies();
      this.renderAdminTable();
      this.updateAdminStats();
      this.updateYearCounts();
      this.showToast(`Filimka "${movie.title}" waa la tirtiray!`, 'info');

      if (window.cinema3D) window.cinema3D.loadFeaturedMovies();
    }
  }

  // ==========================================
  // 11. EDIT MOVIE MODAL
  // ==========================================

  openEditMovieModal(movieId) {
    if (!this.isOwner()) {
      this.showToast('Keliya milkiilaha (Owner) ayaa wax ka beddeli kara filim!', 'error');
      return;
    }
    const movie = this.movies.find(m => m.id === movieId);
    if (!movie) return;

    const modal = document.getElementById('edit-movie-modal');
    if (!modal) return;

    document.getElementById('edit-movie-id').value = movie.id;
    document.getElementById('edit-movie-title').value = movie.title || '';
    document.getElementById('edit-movie-genre').value = movie.genre || 'Action';
    document.getElementById('edit-movie-year').value = movie.year || 2026;
    document.getElementById('edit-movie-date').value = movie.releaseDate || '';
    document.getElementById('edit-movie-rating').value = movie.rating || 8.5;
    document.getElementById('edit-movie-duration').value = movie.duration || '2h 00m';
    document.getElementById('edit-movie-director').value = movie.director || '';
    document.getElementById('edit-movie-poster').value = movie.poster || '';
    document.getElementById('edit-movie-trailer').value = movie.trailerUrl || '';
    document.getElementById('edit-movie-desc').value = movie.description || '';
    document.getElementById('edit-movie-somali').checked = !!movie.isSomali;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  closeEditMovieModal() {
    const modal = document.getElementById('edit-movie-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }

  handleEditMovieSubmit(e) {
    e.preventDefault();

    if (!this.isOwner()) {
      this.showToast('Keliya milkiilaha (Owner) ayaa wax ka beddeli kara filim!', 'error');
      return;
    }

    const id = document.getElementById('edit-movie-id').value;
    const movie = this.movies.find(m => m.id === id);
    if (!movie) return;

    movie.title = document.getElementById('edit-movie-title').value.trim();
    movie.genre = document.getElementById('edit-movie-genre').value;
    movie.year = parseInt(document.getElementById('edit-movie-year').value) || movie.year;
    movie.releaseDate = document.getElementById('edit-movie-date').value || movie.releaseDate;
    movie.rating = parseFloat(document.getElementById('edit-movie-rating').value) || movie.rating;
    movie.duration = document.getElementById('edit-movie-duration').value.trim() || movie.duration;
    movie.director = document.getElementById('edit-movie-director').value.trim() || movie.director;
    movie.poster = document.getElementById('edit-movie-poster').value.trim() || movie.poster;
    movie.trailerUrl = document.getElementById('edit-movie-trailer').value.trim() || movie.trailerUrl;
    movie.description = document.getElementById('edit-movie-desc').value.trim();
    movie.isSomali = document.getElementById('edit-movie-somali').checked;

    this.saveMovies();
    this.updateMovieInCloud(movie); // Sync edit with Firebase Cloud
    this.renderMovies();
    this.renderAdminTable();
    this.updateAdminStats();
    this.updateYearCounts();

    this.closeEditMovieModal();
    this.showToast(`Filimka "${movie.title}" si guul leh ayaa loo cusboonaysiiyay!`, 'success');

    if (window.cinema3D) window.cinema3D.loadFeaturedMovies();
  }

  // 12. Toast Notification
  showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600 border-emerald-400',
      error: 'bg-red-600 border-red-400',
      info: 'bg-cyan-600 border-cyan-400'
    };
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      info: 'fa-info-circle'
    };

    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border text-white shadow-2xl transition-all duration-300 transform translate-y-5 opacity-0 ${bgColors[type] || bgColors.success}`;
    toast.innerHTML = `
      <i class="fa-solid ${icons[type] || icons.success} text-lg"></i>
      <span class="text-sm font-medium">${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-5', 'opacity-0');
    });

    // Animate out
    setTimeout(() => {
      toast.classList.add('opacity-0', '-translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Instantiate on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.QAMBI_APP = new QambiFilimsApp();
});
