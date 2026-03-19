import React, { useEffect, useRef, useState } from 'react';
import Player from '../Player';
import Terrain from '../Terrain';
import Enemy from '../Enemy';
import UFO from '../UFO';
import SpaceJellyfish from '../SpaceJellyfish';
import PlasmaOrb from '../PlasmaOrb';
import CosmicSerpent from '../CosmicSerpent';
import BlackHole from '../BlackHole';
import Coin from '../Coin';
import Spike from '../Spike';
import WallTrap from '../WallTrap';
import PowerUp from '../PowerUp';
import BirdSkins from '../BirdSkins';
import AudioManager from '../AudioManager';
import { App } from '@capacitor/app';
import VoidStorm from '../VoidStorm';
import Guardian from '../Guardian';
import ProgressionManager from '../ProgressionManager';
import Trails from '../Trails';
import { getItem, setItem, getJSON, setJSON } from '../storage';
import { lightTap, mediumTap, heavyTap, notifyTap, selectionTap } from '../haptics';
import { authenticateGameCenter, submitScore as submitGCScore, showLeaderboard, isAuthenticated as isGCAuthenticated } from '../GameCenter';

// Detect iPad for performance tuning
const isIPad = /iPad/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Detect mobile device once at module level
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
  ('ontouchstart' in window && window.innerWidth < 768);

// Graphics quality presets
const GFX = {
  low: {
    dprCap: isIPad ? 1 : 1.5, stars: 30, dust: 10, wallParticles: 4, coinSparkles: 2,
    shadowBlurSmall: 0, shadowBlurMed: 0, shadowBlurLarge: 0,
    enableParticleShadows: false,
  },
  medium: {
    dprCap: 3, stars: 50, dust: 20, wallParticles: 6, coinSparkles: 3,
    shadowBlurSmall: 2, shadowBlurMed: 4, shadowBlurLarge: 10,
    enableParticleShadows: false,
  },
  high: {
    dprCap: Infinity, stars: 100, dust: 40, wallParticles: 12, coinSparkles: 6,
    shadowBlurSmall: 5, shadowBlurMed: 12, shadowBlurLarge: 30,
    enableParticleShadows: true,
  },
};

const Game = () => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [coinScore, setCoinScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [highScores, setHighScores] = useState(() => {
    try {
      const saved = getItem('voidHopper_highScores');
      return saved ? JSON.parse(saved) : { easy: 0, medium: 0, hard: 0 };
    } catch { return { easy: 0, medium: 0, hard: 0 }; }
  });
  const [highCoinScores, setHighCoinScores] = useState(() => {
    try {
      const saved = getItem('voidHopper_highCoinScores');
      return saved ? JSON.parse(saved) : { easy: 0, medium: 0, hard: 0 };
    } catch { return { easy: 0, medium: 0, hard: 0 }; }
  });
  const [isMuted, setIsMuted] = useState(() => getItem('voidHopper_muted') === 'true');
  const isMutedRef = useRef(getItem('voidHopper_muted') === 'true');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [showShop, setShowShop] = useState(false);
  const showShopRef = useRef(false);
  const shopScrollRef = useRef(0);
  const shopDragRef = useRef({ active: false, startY: 0, startScroll: 0 });
  const menuScrollRef = useRef(0);
  const menuDragRef = useRef({ active: false, startY: 0, startScroll: 0, moved: false });
  const difficultyRef = useRef('medium'); // 'easy', 'medium', 'hard'
  const lastDiffClickRef = useRef({ key: null, time: 0 }); // For double-tap detection
  const audioManagerRef = useRef(null);
  const gameOverTimeRef = useRef(null);
  const progressionRef = useRef(null);

  // Persistent data from localStorage
  const [totalCoins, setTotalCoins] = useState(() => {
    return parseInt(getItem('voidHopper_totalCoins') || '0', 10);
  });
  const [unlockedSkins, setUnlockedSkins] = useState(() => {
    try {
      const saved = getItem('voidHopper_unlockedSkins');
      return saved ? JSON.parse(saved) : ['default'];
    } catch { return ['default']; }
  });
  const [selectedSkin, setSelectedSkin] = useState(() => {
    return getItem('voidHopper_selectedSkin') || 'default';
  });
  const totalCoinsRef = useRef(parseInt(getItem('voidHopper_totalCoins') || '0', 10));
  const selectedSkinRef = useRef(getItem('voidHopper_selectedSkin') || 'default');
  const [unlockedTrails, setUnlockedTrails] = useState(() => {
    try {
      const saved = getItem('voidHopper_unlockedTrails');
      return saved ? JSON.parse(saved) : ['none'];
    } catch { return ['none']; }
  });
  const [selectedTrail, setSelectedTrail] = useState(() => {
    return getItem('voidHopper_selectedTrail') || 'none';
  });
  const selectedTrailRef = useRef(getItem('voidHopper_selectedTrail') || 'none');
  const unlockedSkinsRef = useRef(unlockedSkins);
  const unlockedTrailsRef = useRef(unlockedTrails);
  const [shopTab, setShopTab] = useState('skins');
  const shopTabRef = useRef('skins');
  const graphicsRef = useRef(
    getItem('voidHopper_graphics') || (isIPad ? 'low' : isMobile ? 'medium' : 'high')
  );
  const getGfx = () => GFX[graphicsRef.current] || GFX.medium;

  const gameStateRef = useRef({
    player: null,
    leftTerrain: null,
    rightTerrain: null,
    enemies: [],
    coins: [],
    spikes: [],
    explosionParticles: [],
    cameraY: 0,
    gravity: -0.3, // Upward gravity - bird always rises
    lastTime: 0,
    isRunning: true,
    lastEnemySpawnY: 0,
    lastCoinSpawnY: 0,
    lastSpikeSpawnY: 0,
    enemySpawnInterval: 300,
    backgroundStars: [],
    lastScoreMilestone: 0,
    wasAccelerating: false,
    startingY: 0,
    lowestY: 999999,
    currentScore: 0,
    currentCoinScore: 0,
    // Screen shake
    shakeIntensity: 0,
    shakeX: 0,
    shakeY: 0,
    // Combo system — built by skillful actions, not basic bouncing
    combo: 0,
    comboTimer: 0,
    comboTimerMax: 3.0,
    maxCombo: 0,
    lastComboAction: '',   // label for the last action that built combo
    comboScoreAccum: 0,    // bonus distance score accumulated from high combos
    _nearMissedEnemies: new Set(),
    // Power-ups
    powerUps: [],
    lastPowerUpSpawnY: 0,
    activePowerUpDisplay: [], // For HUD display of active power-ups
    voidStorm: null,
    floatingTexts: [],
    wallTraps: [],
    lastWallTrapSpawnY: 0,
    // Guardian system
    guardian: null,
    guardianIndex: 0,
    nextGuardianMilestone: 5000,
    guardianActive: false,
    guardianClearedHeight: 0,
    // Menu scene
    menuStars: [],
    menuPlanets: [],
    menuNebulae: [],
    menuShootingStars: [],
    menuTime: 0,
    // Wall-stick particles
    wallParticles: [],
    // Coin collect animations (sparkles flying to HUD)
    coinCollectAnims: [],
    // Foreground dust motes
    dustParticles: [],
    // Height milestone system
    lastMilestone: 0,
    milestoneFlash: 0,
    milestoneText: '',
    milestoneTextTimer: 0,
    // Run stats for missions
    runStats: { distance: 0, coins: 0, wallBounces: 0, nearMisses: 0, guardiansDefeated: 0, purpleCoins: 0, maxCombo: 0, reachedOnFire: false },
    // Revive system
    canRevive: true,
    pendingRevive: false,
    reviveTimer: 0,
    reviveCost: 0,
    newBestScore: false,
    missionRewardsThisRun: 0,
    streakBonusThisRun: 0,
  });

  // Keep refs in sync with state for use inside closures
  unlockedSkinsRef.current = unlockedSkins;
  unlockedTrailsRef.current = unlockedTrails;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });

    // Initialize audio
    if (!audioManagerRef.current) {
      // Create AudioManager instance
      audioManagerRef.current = new AudioManager();
    }
    if (!progressionRef.current) {
      progressionRef.current = new ProgressionManager();
    }

    // Authenticate Game Center
    authenticateGameCenter();

    // Try to lock orientation to portrait on mobile
    if (isMobile && window.screen && window.screen.orientation && window.screen.orientation.lock) {
      window.screen.orientation.lock('portrait').catch(() => {});
    }

    // Expose graphics quality globally so entities can skip expensive effects
    window._voidHopperGfx = graphicsRef.current;

    // Set canvas size (account for devicePixelRatio for sharp text)
    const resizeCanvas = () => {
      // Cap DPR based on graphics quality to save GPU memory
      const rawDpr = window.devicePixelRatio || 1;
      const dpr = Math.min(rawDpr, getGfx().dprCap);
      const logicalW = window.innerWidth;
      // Use visualViewport for accurate height on mobile (handles URL bar)
      // On native (Capacitor), use innerHeight for full screen coverage including home indicator area
      // On mobile browsers, use visualViewport to handle URL bar
      const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
      const logicalH = (!isNative && window.visualViewport) ? window.visualViewport.height : window.innerHeight;
      const oldWidth = canvas.logicalWidth || 0;
      const oldHeight = canvas.logicalHeight || 0;
      canvas.width = logicalW * dpr;
      canvas.height = logicalH * dpr;
      canvas.style.width = logicalW + 'px';
      canvas.style.height = logicalH + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Store logical dimensions on the canvas element for use everywhere
      canvas.logicalWidth = logicalW;
      canvas.logicalHeight = logicalH;

      // If size changed significantly, regenerate terrain
      if (Math.abs(oldWidth - logicalW) > 50 || Math.abs(oldHeight - logicalH) > 50) {
        const state = gameStateRef.current;
        if (state.player && state.leftTerrain && state.rightTerrain) {
          // Regenerate terrain with new dimensions, starting from current terrain position
          // Use the terrain's startY to maintain continuity
          const currentTerrainStartY = state.leftTerrain.startY;

          state.leftTerrain = new Terrain('left', logicalW, logicalH * 10, currentTerrainStartY, false, state.difficulty || 'medium');
          state.rightTerrain = new Terrain('right', logicalW, logicalH * 10, currentTerrainStartY, false, state.difficulty || 'medium');

          // Reposition player to stay within bounds
          const leftBoundary = state.leftTerrain.getMaxXAtY(state.player.y);
          const rightBoundary = state.rightTerrain.getMinXAtY(state.player.y);

          if (state.player.x < leftBoundary + state.player.radius) {
            state.player.x = leftBoundary + state.player.radius + 5;
          }
          if (state.player.x > rightBoundary - state.player.radius) {
            state.player.x = rightBoundary - state.player.radius - 5;
          }
        }
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    // Mobile browsers fire visualViewport resize when URL bar hides/shows
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', resizeCanvas);
    }

    // Initialize game (only on first load, not on game over)
    if (!isGameOver) {
      generateBackgroundStars(canvas.logicalWidth);
      generateMenuScene(canvas.logicalWidth, canvas.logicalHeight);
    }

    // Dismiss loading screen — show "tap to start" after minimum display, then wait for tap
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      const tip = loadingScreen.querySelector('.loading-tip');
      const bar = loadingScreen.querySelector('.loading-bar-container');
      const dismissLoading = async () => {
        loadingScreen.removeEventListener('touchstart', dismissLoading);
        loadingScreen.removeEventListener('click', dismissLoading);
        // Use the tap gesture to unlock audio
        if (audioManagerRef.current) {
          try {
            if (!audioManagerRef.current.isInitialized) {
              await audioManagerRef.current.initialize();
            }
            if (!audioManagerRef.current.isMenuMusicPlaying && !audioManagerRef.current.isMusicPlaying) {
              audioManagerRef.current.startMenuMusic();
              setIsMusicPlaying(true);
            }
          } catch {}
        }
        loadingScreen.classList.add('fade-out');
        setTimeout(() => loadingScreen.remove(), 600);
      };
      setTimeout(() => {
        if (bar) bar.style.display = 'none';
        if (tip) {
          tip.textContent = 'Tap to start';
          tip.style.color = 'rgba(255, 255, 255, 0.7)';
          tip.style.animation = 'twinkle 1.5s ease-in-out infinite alternate';
        }
        loadingScreen.addEventListener('touchstart', dismissLoading, { once: true });
        loadingScreen.addEventListener('click', dismissLoading, { once: true });
      }, 1200);
    }

    // Compute safe area insets for notched phones and gesture bars
    const getSafeInsets = () => {
      // Create a temporary element to measure env() safe area values
      const el = document.createElement('div');
      el.style.position = 'fixed';
      el.style.top = 'env(safe-area-inset-top, 0px)';
      el.style.bottom = 'env(safe-area-inset-bottom, 0px)';
      el.style.left = '0';
      el.style.right = '0';
      el.style.pointerEvents = 'none';
      el.style.visibility = 'hidden';
      document.body.appendChild(el);
      const top = el.offsetTop || 0;
      const totalH = window.innerHeight;
      const bottom = totalH - el.offsetTop - el.offsetHeight;
      document.body.removeChild(el);
      return { top: Math.max(0, top), bottom: Math.max(0, bottom) };
    };
    const insets = getSafeInsets();
    gameStateRef.current.safeTop = insets.top;
    gameStateRef.current.safeBottom = insets.bottom;

    // Game loop
    let animationFrameId;
    const getW = () => canvas.logicalWidth || window.innerWidth;
    const getH = () => canvas.logicalHeight || window.innerHeight;

    let lastAudioCheckTime = 0;
    const gameLoop = (timestamp) => {
      const deltaTime = Math.min((timestamp - gameStateRef.current.lastTime) / 1000, 0.1);
      gameStateRef.current.lastTime = timestamp;

      // Periodic audio context health check — iOS can suspend AudioContext during heavy rendering
      if (timestamp - lastAudioCheckTime > 500) {
        lastAudioCheckTime = timestamp;
        if (audioManagerRef.current) audioManagerRef.current.ensureContextRunning();
      }

      if (gameStateRef.current.isRunning && !isGameOver && gameStarted && !isPausedRef.current) {
        update(deltaTime, getW(), getH());
      } else if (isGameOver || gameStateRef.current.pendingRevive) {
        // Update particles even when game is over or revive pending
        const state = gameStateRef.current;
        state.explosionParticles = state.explosionParticles.filter(particle => {
          if (particle.isFeather) {
            // Feathers flutter and wobble as they fall
            particle.wobblePhase += particle.wobbleSpeed * deltaTime;
            particle.featherRotation += particle.featherRotationSpeed * deltaTime;
            const wobble = Math.sin(particle.wobblePhase) * 15;
            particle.x += (particle.vx + wobble) * deltaTime * 0.12;
            particle.y += particle.vy * deltaTime * 0.12;
            particle.vy += 5 * deltaTime; // Gentle downward drift
          } else {
            particle.x += particle.vx * deltaTime * 0.15;
            particle.y += particle.vy * deltaTime * 0.15;
            particle.vy += 3 * deltaTime;
          }
          particle.life -= deltaTime * 0.03;
          return particle.life > 0;
        });

        // Update bird death dance
        if (state.player && state.player.isDying) {
          state.player.deathTime += deltaTime;
        }
        // Update revive timer
        if (state.pendingRevive) {
          state.reviveTimer -= deltaTime;
          if (state.reviveTimer <= 0) {
            state.pendingRevive = false;
            finalizeGameOver();
          }
        }
      }
      render(ctx, getW(), getH(), deltaTime);

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    // Input handlers
    let touchStartTime = 0;
    let touchStartPos = { x: 0, y: 0 };
    let isTouchAiming = false;

    const handleTouchStart = (e) => {
      e.preventDefault();
      // iOS requires user gesture to resume AudioContext after background/phone sleep.
      // We fully reinitialize the audio context inside this gesture so iOS allows playback.
      const am = audioManagerRef.current;
      if (am && am._needsResume) {
        const wasGame = am._wasGameMusicPlaying;
        const wasMenu = am._wasMenuMusicPlaying;
        const diff = am._savedDifficulty || difficultyRef.current;
        am._needsResume = false;
        am._wasGameMusicPlaying = false;
        am._wasMenuMusicPlaying = false;
        (async () => {
          await am.forceReinitialize();
          if (wasGame) {
            am.startMusic(diff);
          } else if (wasMenu) {
            am.startMenuMusic();
          }
        })();
        // Consume this tap — don't let it hit menu buttons behind the overlay
        return;
      }
      const touch = e.touches[0];
      if (!touch) return;

      if (!gameStarted || isGameOver || gameOverTimeRef.current) {
        const rect = canvas.getBoundingClientRect();
        const ty = touch.clientY - rect.top;
        // Shop scrolling
        if (showShopRef.current) {
          shopDragRef.current = { active: true, startY: ty, startScroll: shopScrollRef.current, moved: false };
        } else if (!gameStarted && !isGameOver && !gameOverTimeRef.current) {
          // Menu scrolling
          menuDragRef.current = { active: true, startY: ty, startScroll: menuScrollRef.current, moved: false };
        }
        // Route through mouse handler for menu interaction (difficulty double-tap, etc.)
        handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
        return;
      }

      // In-game: check if tapping UI buttons first
      const rect = canvas.getBoundingClientRect();
      const tx = touch.clientX - rect.left;
      const ty = touch.clientY - rect.top;

      // Revive prompt — route through mouse handler
      if (gameStateRef.current.pendingRevive) {
        handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
        return;
      }

      // Pause button hit area (larger for touch — accounts for safe area)
      const st = gameStateRef.current.safeTop || 0;
      if (tx >= getW() - 140 && tx <= getW() - 70 &&
          ty >= 10 + st && ty <= 80 + st && gameStarted && !isGameOver) {
        isPausedRef.current = !isPausedRef.current;
        setIsPaused(isPausedRef.current);
        selectionTap();
        return;
      }

      // Mute button hit area (larger for touch — accounts for safe area)
      if (tx >= getW() - 80 && tx <= getW() - 10 &&
          ty >= 10 + st && ty <= 80 + st) {
        selectionTap();
        if (audioManagerRef.current) {
          if (!audioManagerRef.current.isInitialized) {
            audioManagerRef.current.initialize().then(() => {
              const muted = audioManagerRef.current.toggleMute();
              isMutedRef.current = muted; setIsMuted(muted);
            });
          } else {
            const muted = audioManagerRef.current.toggleMute();
            isMutedRef.current = muted; setIsMuted(muted);
          }
        }
        return;
      }

      // If paused, route to mouse handler for Resume/Main Menu buttons
      if (isPausedRef.current) {
        touchStartTime = 0; // prevent touchEnd from launching bird after resume
        handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
        return;
      }

      touchStartTime = Date.now();
      touchStartPos = { x: touch.clientX, y: touch.clientY };

      const player = gameStateRef.current.player;
      if (player && player.isStuck) {
        // Start aiming on touch
        const worldY = ty + gameStateRef.current.cameraY;
        player.startAiming(tx, worldY);
        isTouchAiming = true;
      } else if (player && !player.isStuck) {
        // Tap while flying — no action (bird is already launched)
      }
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;

      // Shop scroll drag
      if (showShopRef.current && shopDragRef.current.active) {
        const rect = canvas.getBoundingClientRect();
        const ty = touch.clientY - rect.top;
        const dy = shopDragRef.current.startY - ty;
        if (Math.abs(dy) > 5) shopDragRef.current.moved = true;
        shopScrollRef.current = Math.max(0, shopDragRef.current.startScroll + dy);
        return;
      }

      // Menu scroll drag
      if (menuDragRef.current.active) {
        const rect = canvas.getBoundingClientRect();
        const ty = touch.clientY - rect.top;
        const dy = menuDragRef.current.startY - ty;
        if (Math.abs(dy) > 5) menuDragRef.current.moved = true;
        menuScrollRef.current = Math.max(0, menuDragRef.current.startScroll + dy);
        return;
      }

      if (isPausedRef.current) return;

      if (isTouchAiming && gameStateRef.current.player && gameStateRef.current.player.isAiming) {
        const rect = canvas.getBoundingClientRect();
        const tx = touch.clientX - rect.left;
        const ty = touch.clientY - rect.top;
        const worldY = ty + gameStateRef.current.cameraY;
        gameStateRef.current.player.updateAim(tx, worldY);
      }
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();

      // End shop drag
      if (shopDragRef.current.active) {
        shopDragRef.current.active = false;
      }
      // End menu drag
      if (menuDragRef.current.active) {
        menuDragRef.current.active = false;
      }

      if (!gameStarted || isGameOver || gameOverTimeRef.current || isPausedRef.current) return;

      const player = gameStateRef.current.player;

      // Ignore touch end if it started during a pause (resume tap shouldn't launch bird)
      if (touchStartTime === 0) return;

      if (isTouchAiming && player && player.isAiming) {
        // Release aim — launch bird
        player.launch();
        lightTap();
        if (audioManagerRef.current) {
          audioManagerRef.current.playBoostSound();
        }
        isTouchAiming = false;
      } else if (player && player.isStuck && !isTouchAiming) {
        // Quick tap without drag — still launch (auto-aim)
        const elapsed = Date.now() - touchStartTime;
        if (elapsed < 200) {
          player.launch();
          lightTap();
          if (audioManagerRef.current) {
            audioManagerRef.current.playBoostSound();
          }
        }
      }
      isTouchAiming = false;
    };

    const handleMouseDown = async (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Check if pause button was clicked (top right, left of music button)
      const st = gameStateRef.current.safeTop || 0;
      if (clickX >= getW() - 130 && clickX <= getW() - 80 &&
          clickY >= 20 + st && clickY <= 70 + st && gameStarted && !isGameOver) {
        isPausedRef.current = !isPausedRef.current;
        setIsPaused(isPausedRef.current);
        selectionTap();
        return;
      }

      // If paused, check for Resume and Main Menu button clicks
      if (isPausedRef.current) {
        // Resume button
        const rBounds = gameStateRef.current._resumeBtnBounds;
        if (rBounds && clickX >= rBounds.x && clickX <= rBounds.x + rBounds.w &&
            clickY >= rBounds.y && clickY <= rBounds.y + rBounds.h) {
          isPausedRef.current = false;
          setIsPaused(false);
          selectionTap();
          return;
        }
        // Main Menu button
        const menuBtnX = getW() / 2 - 100;
        const menuBtnY = (rBounds ? rBounds.y + rBounds.h + 12 : getH() / 2 + 102);
        if (clickX >= menuBtnX && clickX <= menuBtnX + 200 &&
            clickY >= menuBtnY && clickY <= menuBtnY + 50) {
          mediumTap();
          isPausedRef.current = false;
          setIsPaused(false);
          setGameStarted(false);
          setIsGameOver(false);
          menuScrollRef.current = 0;
          // Switch to menu music
          if (audioManagerRef.current) {
            audioManagerRef.current.stopMusic();
            audioManagerRef.current.startMenuMusic();
          }
          return;
        }
        return;
      }

      // Check if mute button was clicked (top right corner, safe area aware)
      const muteSafeTop = gameStateRef.current.safeTop || 0;
      if (clickX >= getW() - 70 && clickX <= getW() - 20 &&
          clickY >= 20 + muteSafeTop && clickY <= 70 + muteSafeTop) {
        selectionTap();
        if (audioManagerRef.current) {
          if (!audioManagerRef.current.isInitialized) {
            await audioManagerRef.current.initialize();
          }
          const muted = audioManagerRef.current.toggleMute();
          isMutedRef.current = muted; setIsMuted(muted);
        }
        return;
      }

      // Start game if not started
      if (!gameStarted) {
        // Capture drag state before any async work (touch moves during await can set moved=true)
        const wasShopDragging = shopDragRef.current.moved;
        const wasMenuDragging = menuDragRef.current.moved;
        if (wasShopDragging) shopDragRef.current.moved = false;
        if (wasMenuDragging) menuDragRef.current.moved = false;

        // Start menu music on first interaction (requires user gesture for AudioContext)
        if (audioManagerRef.current) {
          if (!audioManagerRef.current.isInitialized) {
            await audioManagerRef.current.initialize();
          }
          if (!audioManagerRef.current.isMenuMusicPlaying && !audioManagerRef.current.isMusicPlaying) {
            audioManagerRef.current.startMenuMusic();
            setIsMusicPlaying(true);
          }
        }
        // Ignore clicks when user was scrolling the menu
        if (wasMenuDragging) {
          return;
        }
        if (showShopRef.current) {
          // Ignore clicks when user was scrolling
          if (wasShopDragging) {
            return;
          }
          // Shop tab click detection
          const tabBounds = gameStateRef.current._shopTabBounds;
          if (tabBounds) {
            for (const tb of tabBounds) {
              if (clickX >= tb.x && clickX <= tb.x + tb.w && clickY >= tb.y && clickY <= tb.y + tb.h) {
                selectionTap();
                shopTabRef.current = tb.tab;
                setShopTab(tb.tab);
                shopScrollRef.current = 0;
                return;
              }
            }
          }

          // Back button (safe area aware) — check BEFORE shop items so overlapping cards don't block it
          const shopSafeBotClick = gameStateRef.current.safeBottom || 0;
          const backBtnClickY = getH() - shopSafeBotClick - 68;
          if (clickX >= getW() / 2 - 80 && clickX <= getW() / 2 + 80 &&
              clickY >= backBtnClickY && clickY <= backBtnClickY + 50) {
            selectionTap();
            showShopRef.current = false;
            setShowShop(false);
            return;
          }

          // Shop click handling — skins or trails depending on active tab
          if (shopTabRef.current === 'skins') {
            const skinKeys = Object.keys(BirdSkins);
            let clickedSkin = null;
            skinKeys.forEach(key => {
              const skin = BirdSkins[key];
              if (skin._shopBounds) {
                const b = skin._shopBounds;
                if (clickX >= b.x && clickX <= b.x + b.w && clickY >= b.y && clickY <= b.y + b.h) {
                  clickedSkin = key;
                }
              }
            });

            if (clickedSkin) {
              selectionTap();
              const skin = BirdSkins[clickedSkin];
              const currentUnlockedSkins = unlockedSkinsRef.current;
              if (currentUnlockedSkins.includes(clickedSkin)) {
                selectedSkinRef.current = clickedSkin;
                setSelectedSkin(clickedSkin);
                setItem('voidHopper_selectedSkin', clickedSkin);
              } else if (totalCoinsRef.current >= skin.cost) {
                const newTotal = totalCoinsRef.current - skin.cost;
                totalCoinsRef.current = newTotal;
                setTotalCoins(newTotal);
                setItem('voidHopper_totalCoins', String(newTotal));
                const newUnlocked = [...currentUnlockedSkins, clickedSkin];
                setUnlockedSkins(newUnlocked);
                setJSON('voidHopper_unlockedSkins', newUnlocked);
                selectedSkinRef.current = clickedSkin;
                setSelectedSkin(clickedSkin);
                setItem('voidHopper_selectedSkin', clickedSkin);
              }
              return;
            }
          } else if (shopTabRef.current === 'trails') {
            const trailKeys = Object.keys(Trails);
            let clickedTrail = null;
            trailKeys.forEach(key => {
              const trail = Trails[key];
              if (trail._shopBounds) {
                const b = trail._shopBounds;
                if (clickX >= b.x && clickX <= b.x + b.w && clickY >= b.y && clickY <= b.y + b.h) {
                  clickedTrail = key;
                }
              }
            });

            if (clickedTrail) {
              selectionTap();
              const trail = Trails[clickedTrail];
              const currentUnlockedTrails = unlockedTrailsRef.current;
              if (currentUnlockedTrails.includes(clickedTrail)) {
                selectedTrailRef.current = clickedTrail;
                setSelectedTrail(clickedTrail);
                setItem('voidHopper_selectedTrail', clickedTrail);
              } else if (totalCoinsRef.current >= trail.cost) {
                const newTotal = totalCoinsRef.current - trail.cost;
                totalCoinsRef.current = newTotal;
                setTotalCoins(newTotal);
                setItem('voidHopper_totalCoins', String(newTotal));
                const newUnlocked = [...currentUnlockedTrails, clickedTrail];
                setUnlockedTrails(newUnlocked);
                setJSON('voidHopper_unlockedTrails', newUnlocked);
                selectedTrailRef.current = clickedTrail;
                setSelectedTrail(clickedTrail);
                setItem('voidHopper_selectedTrail', clickedTrail);
              }
              return;
            }
          }

          return;
        }

        // No scroll offset — menu fits on one screen
        const menuClickY = clickY;

        // Check if daily reward was clicked
        const drBounds = gameStateRef.current._dailyRewardBounds;
        if (drBounds && progressionRef.current && progressionRef.current.pendingDailyReward > 0 &&
            clickX >= drBounds.x && clickX <= drBounds.x + drBounds.w &&
            menuClickY >= drBounds.y && menuClickY <= drBounds.y + drBounds.h) {
          const reward = progressionRef.current.claimDailyReward();
          if (reward > 0) {
            const newTotal = totalCoinsRef.current + reward;
            totalCoinsRef.current = newTotal;
            setTotalCoins(newTotal);
            setItem('voidHopper_totalCoins', String(newTotal));
            gameStateRef.current._dailyRewardClaimed = true;
            gameStateRef.current._dailyRewardBounds = null;
            notifyTap('SUCCESS');
            if (audioManagerRef.current) audioManagerRef.current.playScoreMilestoneSound();
          }
          return;
        }

        // Check if a difficulty button was clicked
        const diffBtns = gameStateRef.current._difficultyButtons;
        if (diffBtns) {
          for (const d of diffBtns) {
            if (d._bounds &&
                clickX >= d._bounds.x && clickX <= d._bounds.x + d._bounds.w &&
                menuClickY >= d._bounds.y && menuClickY <= d._bounds.y + d._bounds.h) {
              const now = Date.now();
              const last = lastDiffClickRef.current;
              if (last.key === d.key && now - last.time < 500) {
                // Double-tap — start the game with this difficulty
                difficultyRef.current = d.key;
                initGame(getW(), getH());
                setGameStarted(true);
                if (audioManagerRef.current) {
                  if (!audioManagerRef.current.isInitialized) {
                    audioManagerRef.current.initialize().then(() => {
                      audioManagerRef.current.stopMenuMusic();
                      audioManagerRef.current.startMusic(difficultyRef.current);
                      setIsMusicPlaying(true);
                    });
                  } else {
                    audioManagerRef.current.stopMenuMusic();
                    audioManagerRef.current.startMusic(difficultyRef.current);
                    setIsMusicPlaying(true);
                  }
                }
                lastDiffClickRef.current = { key: null, time: 0 };
                mediumTap();
              } else {
                // Single tap — select difficulty and init menu music
                difficultyRef.current = d.key;
                lastDiffClickRef.current = { key: d.key, time: now };
                selectionTap();
                if (audioManagerRef.current) {
                  if (!audioManagerRef.current.isInitialized) {
                    await audioManagerRef.current.initialize();
                  }
                  if (!audioManagerRef.current.isMenuMusicPlaying && !audioManagerRef.current.isMusicPlaying) {
                    audioManagerRef.current.startMenuMusic();
                    setIsMusicPlaying(true);
                  }
                }
              }
              return;
            }
          }
        }

        // Check if PLAY button was clicked
        const playBounds = gameStateRef.current._playBtnBounds;
        if (playBounds &&
            clickX >= playBounds.x && clickX <= playBounds.x + playBounds.w &&
            menuClickY >= playBounds.y && menuClickY <= playBounds.y + playBounds.h) {
          // Start game immediately — don't await audio to avoid first-frame lag
          mediumTap();
          initGame(getW(), getH());
          setGameStarted(true);
          if (audioManagerRef.current) {
            if (!audioManagerRef.current.isInitialized) {
              audioManagerRef.current.initialize().then(() => {
                audioManagerRef.current.stopMenuMusic();
                audioManagerRef.current.startMusic(difficultyRef.current);
                setIsMusicPlaying(true);
              });
            } else {
              audioManagerRef.current.stopMenuMusic();
              audioManagerRef.current.startMusic(difficultyRef.current);
              setIsMusicPlaying(true);
            }
          }
          return;
        }

        // Check if shop button was clicked
        const shopBounds = gameStateRef.current._shopBtnBounds;
        if (shopBounds &&
            clickX >= shopBounds.x && clickX <= shopBounds.x + shopBounds.w &&
            menuClickY >= shopBounds.y && menuClickY <= shopBounds.y + shopBounds.h) {
          selectionTap();
          showShopRef.current = true;
          shopScrollRef.current = 0;
          shopTabRef.current = 'skins';
          setShopTab('skins');
          setShowShop(true);
          return;
        }

        // Check if graphics button was clicked
        const gfxBounds = gameStateRef.current._gfxBtnBounds;
        if (gfxBounds &&
            clickX >= gfxBounds.x && clickX <= gfxBounds.x + gfxBounds.w &&
            menuClickY >= gfxBounds.y && menuClickY <= gfxBounds.y + gfxBounds.h) {
          selectionTap();
          const cycle = { low: 'medium', medium: 'high', high: 'low' };
          graphicsRef.current = cycle[graphicsRef.current] || 'medium';
          window._voidHopperGfx = graphicsRef.current;
          setItem('voidHopper_graphics', graphicsRef.current);
          // Regenerate stars/dust with new particle count and update canvas DPR
          generateBackgroundStars(getW());
          resizeCanvas();
          return;
        }

        // Check if leaderboard button was clicked
        const menuLbBounds = gameStateRef.current._menuLeaderboardBtnBounds;
        if (menuLbBounds &&
            clickX >= menuLbBounds.x && clickX <= menuLbBounds.x + menuLbBounds.w &&
            menuClickY >= menuLbBounds.y && menuClickY <= menuLbBounds.y + menuLbBounds.h) {
          selectionTap();
          showLeaderboard(difficultyRef.current || 'medium');
          return;
        }

        // Backup/restore only on web (not iOS native)
        if (!window.Capacitor || !window.Capacitor.isNativePlatform || !window.Capacitor.isNativePlatform()) {
          const saveBounds = gameStateRef.current._saveBtnBounds;
          if (saveBounds &&
              clickX >= saveBounds.x && clickX <= saveBounds.x + saveBounds.w &&
              menuClickY >= saveBounds.y && menuClickY <= saveBounds.y + saveBounds.h) {
            exportSaveData();
            return;
          }
          const loadBounds = gameStateRef.current._loadBtnBounds;
          if (loadBounds &&
              clickX >= loadBounds.x && clickX <= loadBounds.x + loadBounds.w &&
              menuClickY >= loadBounds.y && menuClickY <= loadBounds.y + loadBounds.h) {
            importSaveData();
            return;
          }
        }
        return;
      }

      // Initialize audio on first user interaction after game started (if not already done)
      if (audioManagerRef.current && !audioManagerRef.current.isInitialized) {
        await audioManagerRef.current.initialize();
        await audioManagerRef.current.startMusic(difficultyRef.current);
        setIsMusicPlaying(true);
      }

      // Handle revive prompt clicks
      if (gameStateRef.current.pendingRevive) {
        const rBounds = gameStateRef.current._reviveBtnBounds;
        if (rBounds && clickX >= rBounds.x && clickX <= rBounds.x + rBounds.w &&
            clickY >= rBounds.y && clickY <= rBounds.y + rBounds.h) {
          mediumTap();
          handleRevive();
        } else {
          selectionTap();
          declineRevive();
        }
        return;
      }

      // Use ref to detect game over immediately (closure `isGameOver` can be stale)
      if (isGameOver || gameOverTimeRef.current) {
        const timeSinceGameOver = Date.now() - gameOverTimeRef.current;
        // Check Share button on game over screen
        const shareBounds = gameStateRef.current._shareBtnBounds;
        if (shareBounds && clickX >= shareBounds.x && clickX <= shareBounds.x + shareBounds.w &&
            clickY >= shareBounds.y && clickY <= shareBounds.y + shareBounds.h) {
          selectionTap();
          shareScore();
          return;
        }
        // Check Leaderboard button on game over screen
        const lbBounds = gameStateRef.current._leaderboardBtnBounds;
        if (lbBounds && clickX >= lbBounds.x && clickX <= lbBounds.x + lbBounds.w &&
            clickY >= lbBounds.y && clickY <= lbBounds.y + lbBounds.h) {
          selectionTap();
          showLeaderboard(gameStateRef.current.difficulty || 'medium');
          return;
        }
        // Check Main Menu button on game over screen
        const goMenuBounds = gameStateRef.current._goMenuBtnBounds;
        if (goMenuBounds && clickX >= goMenuBounds.x && clickX <= goMenuBounds.x + goMenuBounds.w &&
            clickY >= goMenuBounds.y && clickY <= goMenuBounds.y + goMenuBounds.h) {
          mediumTap();
          setGameStarted(false);
          setIsGameOver(false);
          gameOverTimeRef.current = null;
          menuScrollRef.current = 0;
          // Switch to menu music
          if (audioManagerRef.current) {
            audioManagerRef.current.stopMusic();
            audioManagerRef.current.startMenuMusic();
          }
          return;
        }
        // Check Restart button
        const restartBounds = gameStateRef.current._restartBtnBounds;
        if (restartBounds && timeSinceGameOver >= 1500 &&
            clickX >= restartBounds.x && clickX <= restartBounds.x + restartBounds.w &&
            clickY >= restartBounds.y && clickY <= restartBounds.y + restartBounds.h) {
          mediumTap();
          restartGame(getW(), getH());
          setGameStarted(true);
          gameOverTimeRef.current = null;
        }
        return;
      } else {
        if (gameStateRef.current.player) {
          // Start aiming - convert to world coordinates
          const worldY = clickY + gameStateRef.current.cameraY;
          gameStateRef.current.player.startAiming(clickX, worldY);
        }
      }
    };

    const handleMouseMove = (e) => {
      if (isPausedRef.current) return;
      if (gameStateRef.current.player && gameStateRef.current.player.isAiming) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        // Convert to world coordinates
        const worldY = mouseY + gameStateRef.current.cameraY;
        gameStateRef.current.player.updateAim(mouseX, worldY);
      }
    };

    const handleMouseUp = () => {
      if (isPausedRef.current) return;
      if (gameStateRef.current.player && gameStateRef.current.player.isAiming) {
        // Launch bird in aimed direction
        gameStateRef.current.player.launch();

        // Play boost sound
        if (audioManagerRef.current) {
          audioManagerRef.current.playBoostSound();
        }
      }
    };

    const handleKeyDown = async (e) => {
      // Initialize audio on first keyboard interaction
      if (audioManagerRef.current && !audioManagerRef.current.isInitialized) {
        await audioManagerRef.current.initialize();
        await audioManagerRef.current.startMusic(difficultyRef.current);
        setIsMusicPlaying(true);
      }

      // P key toggles pause
      if ((e.key === 'p' || e.key === 'P') && gameStarted && !isGameOver) {
        isPausedRef.current = !isPausedRef.current;
        setIsPaused(isPausedRef.current);
        return;
      }

      // Block all other input while paused
      if (isPausedRef.current) return;

      if (isGameOver || gameOverTimeRef.current) {
        if (e.key === 'r' || e.key === 'R' || e.key === ' ') {
          // Require 1.5 second delay before allowing restart
          const timeSinceGameOver = Date.now() - gameOverTimeRef.current;
          if (timeSinceGameOver >= 1500) {
            restartGame(getW(), getH());
            gameOverTimeRef.current = null; // Reset
          }
        }
        return;
      }

      if (gameStateRef.current.player) {
        const player = gameStateRef.current.player;

        // Space or any key - launch bird (only during gameplay)
        if (e.key === ' ' || e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D') {
          if (gameStarted) {
            player.launch();
          }
        }

        // M key - toggle mute
        if (e.key === 'm' || e.key === 'M') {
          if (audioManagerRef.current) {
            const muted = audioManagerRef.current.toggleMute();
            isMutedRef.current = muted; setIsMuted(muted);
          }
        }
      }
    };

    const handleKeyUp = (e) => {
      // No longer need keyup for A/D since they apply instant forces
    };

    const handleWheel = (e) => {
      if (showShopRef.current) {
        e.preventDefault();
        shopScrollRef.current = Math.max(0, shopScrollRef.current + e.deltaY);
      } else if (!gameStarted && !isGameOver) {
        e.preventDefault();
        menuScrollRef.current = Math.max(0, menuScrollRef.current + e.deltaY);
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Pause game and audio when app goes to background, restart on return
    let _audioSuspended = false; // guard against double suspend/resume from both listeners
    const suspendAudio = () => {
      if (_audioSuspended) return;
      _audioSuspended = true;
      // Auto-pause the game if in an active level
      if (gameStarted && !isGameOver) {
        isPausedRef.current = true;
        setIsPaused(true);
      }
      const am = audioManagerRef.current;
      if (!am) return;
      // Remember what was playing so we can restart after reinit
      am._wasGameMusicPlaying = am.isMusicPlaying;
      am._wasMenuMusicPlaying = am.isMenuMusicPlaying;
      am._savedDifficulty = am.currentDifficulty;
      // Mark that the next touch needs to reinitialize audio from scratch
      am._needsResume = true;
    };
    const resumeAudio = async () => {
      if (!_audioSuspended) return;
      _audioSuspended = false;
      const am = audioManagerRef.current;
      if (!am) return;
      // Try immediate reinit — works for short backgrounds on some iOS versions.
      // If iOS blocks it (no user gesture), _needsResume stays true for touch handler.
      try {
        await am.forceReinitialize();
        if (am.audioContext && am.audioContext.state === 'running') {
          am._needsResume = false;
          if (am._wasGameMusicPlaying) {
            am.startMusic(am._savedDifficulty || difficultyRef.current);
            am._wasGameMusicPlaying = false;
          } else if (am._wasMenuMusicPlaying) {
            am.startMenuMusic();
            am._wasMenuMusicPlaying = false;
          }
        }
      } catch (e) { /* touch handler will recover */ }
    };
    const handleVisibility = () => {
      if (document.hidden) suspendAudio(); else resumeAudio();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    // Capacitor App plugin fires appStateChange reliably on iOS native
    let appStateListener = null;
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) resumeAudio(); else suspendAudio();
    }).then(handle => { appStateListener = handle; }).catch(() => {});

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', resizeCanvas);
      }
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (appStateListener) appStateListener.remove();
      cancelAnimationFrame(animationFrameId);
    };
  }, [isGameOver, gameStarted]);

  // Dispose audio only on true component unmount
  useEffect(() => {
    return () => {
      if (audioManagerRef.current) {
        audioManagerRef.current.dispose();
        audioManagerRef.current = null;
      }
    };
  }, []);

  const generateMenuScene = (width, height) => {
    const state = gameStateRef.current;

    // 7 daily themes — one per day of the week
    const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ...6=Sat
    const themes = [
      { // Sunday — Violet Nebula
        bgStops: ['#0a0518', '#150a2e', '#1a0835', '#0d0520'],
        starTints: ['#ccaaff', '#ffccee', '#aabbff', '#eeddff'],
        nebulaColors: ['rgba(130, 50, 200, 0.07)', 'rgba(180, 80, 160, 0.06)', 'rgba(80, 40, 180, 0.05)', 'rgba(200, 100, 200, 0.04)'],
        planets: [
          { x: 0.2, y: 0.25, r: 50, c1: '#4422aa', c2: '#7744dd', ring: '#9966ee', hasRing: true },
          { x: 0.75, y: 0.6, r: 25, c1: '#663388', c2: '#9955cc', ring: null, hasRing: false },
          { x: 0.5, y: 0.12, r: 15, c1: '#552277', c2: '#8844aa', ring: null, hasRing: false },
        ],
      },
      { // Monday — Deep Ocean
        bgStops: ['#020a18', '#051525', '#082030', '#03101a'],
        starTints: ['#88ccff', '#aaddff', '#66bbee', '#ccddff'],
        nebulaColors: ['rgba(30, 80, 180, 0.07)', 'rgba(40, 120, 200, 0.06)', 'rgba(20, 60, 140, 0.05)', 'rgba(60, 100, 180, 0.04)'],
        planets: [
          { x: 0.15, y: 0.35, r: 40, c1: '#1144aa', c2: '#3388dd', ring: '#4499ee', hasRing: true },
          { x: 0.82, y: 0.5, r: 35, c1: '#0a3366', c2: '#2266aa', ring: null, hasRing: false },
          { x: 0.45, y: 0.1, r: 20, c1: '#224488', c2: '#4477bb', ring: '#5588cc', hasRing: true },
        ],
      },
      { // Tuesday — Crimson Cosmos
        bgStops: ['#180505', '#2e0a0a', '#350810', '#200508'],
        starTints: ['#ffaaaa', '#ffccbb', '#ffddcc', '#ff9988'],
        nebulaColors: ['rgba(200, 40, 40, 0.07)', 'rgba(180, 60, 30, 0.06)', 'rgba(160, 30, 60, 0.05)', 'rgba(220, 80, 40, 0.04)'],
        planets: [
          { x: 0.8, y: 0.3, r: 45, c1: '#882222', c2: '#cc4444', ring: '#dd6644', hasRing: true },
          { x: 0.2, y: 0.55, r: 28, c1: '#993311', c2: '#cc5522', ring: null, hasRing: false },
          { x: 0.6, y: 0.15, r: 16, c1: '#aa3344', c2: '#dd5566', ring: null, hasRing: false },
        ],
      },
      { // Wednesday — Emerald Expanse
        bgStops: ['#030f08', '#061a10', '#082518', '#04120a'],
        starTints: ['#aaffcc', '#ccffdd', '#88eebb', '#ddffee'],
        nebulaColors: ['rgba(30, 160, 80, 0.06)', 'rgba(40, 180, 100, 0.05)', 'rgba(20, 120, 60, 0.05)', 'rgba(60, 200, 120, 0.04)'],
        planets: [
          { x: 0.25, y: 0.4, r: 38, c1: '#115533', c2: '#228855', ring: null, hasRing: false },
          { x: 0.7, y: 0.2, r: 48, c1: '#226644', c2: '#44aa77', ring: '#55bb88', hasRing: true },
          { x: 0.5, y: 0.7, r: 22, c1: '#337744', c2: '#55aa66', ring: null, hasRing: false },
        ],
      },
      { // Thursday — Golden Drift
        bgStops: ['#0f0a02', '#1a1205', '#251a08', '#181004'],
        starTints: ['#ffddaa', '#ffeecc', '#ffcc88', '#ffeedd'],
        nebulaColors: ['rgba(180, 140, 40, 0.06)', 'rgba(200, 160, 60, 0.05)', 'rgba(160, 120, 30, 0.05)', 'rgba(220, 180, 80, 0.04)'],
        planets: [
          { x: 0.18, y: 0.3, r: 52, c1: '#886622', c2: '#ccaa44', ring: '#ddbb55', hasRing: true },
          { x: 0.78, y: 0.45, r: 26, c1: '#aa8833', c2: '#ddbb55', ring: null, hasRing: false },
          { x: 0.45, y: 0.08, r: 18, c1: '#997722', c2: '#ccaa44', ring: null, hasRing: false },
        ],
      },
      { // Friday — Cyan Storm
        bgStops: ['#020f15', '#051a25', '#082535', '#031520'],
        starTints: ['#aaffff', '#ccffff', '#88eeff', '#ddeeff'],
        nebulaColors: ['rgba(40, 180, 200, 0.07)', 'rgba(60, 200, 220, 0.06)', 'rgba(30, 140, 180, 0.05)', 'rgba(80, 220, 240, 0.04)'],
        planets: [
          { x: 0.75, y: 0.35, r: 42, c1: '#116677', c2: '#33aacc', ring: '#44bbdd', hasRing: true },
          { x: 0.15, y: 0.5, r: 32, c1: '#227788', c2: '#44aabb', ring: null, hasRing: false },
          { x: 0.55, y: 0.18, r: 20, c1: '#118899', c2: '#33bbcc', ring: '#44ccdd', hasRing: true },
        ],
      },
      { // Saturday — Rose Galaxy
        bgStops: ['#120510', '#200a1a', '#2a0820', '#180515'],
        starTints: ['#ffbbdd', '#ffccee', '#ffaacc', '#eeddff'],
        nebulaColors: ['rgba(200, 60, 140, 0.07)', 'rgba(180, 80, 160, 0.06)', 'rgba(220, 40, 120, 0.05)', 'rgba(160, 100, 180, 0.04)'],
        planets: [
          { x: 0.22, y: 0.28, r: 44, c1: '#882255', c2: '#cc4488', ring: '#dd66aa', hasRing: true },
          { x: 0.8, y: 0.55, r: 30, c1: '#aa3377', c2: '#dd55aa', ring: null, hasRing: false },
          { x: 0.5, y: 0.12, r: 16, c1: '#993366', c2: '#cc5599', ring: null, hasRing: false },
        ],
      },
    ];

    const theme = themes[dayOfWeek];
    state.menuTheme = theme;

    // Seeded random for consistent daily look
    const daySeed = dayOfWeek * 1337 + 42;
    const seededRand = (i) => {
      let x = Math.sin(daySeed + i * 127.1) * 43758.5453;
      return x - Math.floor(x);
    };

    // Dense starfield with theme tints
    state.menuStars = [];
    for (let i = 0; i < 220; i++) {
      const isTinted = seededRand(i * 3) < 0.18;
      state.menuStars.push({
        x: seededRand(i * 7 + 1) * width,
        y: seededRand(i * 7 + 2) * height,
        radius: seededRand(i * 7 + 3) * 1.8 + 0.3,
        alpha: seededRand(i * 7 + 4) * 0.6 + 0.2,
        twinkleSpeed: seededRand(i * 7 + 5) * 0.03 + 0.005,
        twinklePhase: seededRand(i * 7 + 6) * Math.PI * 2,
        color: isTinted
          ? theme.starTints[Math.floor(seededRand(i * 7 + 7) * theme.starTints.length)]
          : '#ffffff',
        driftX: (seededRand(i * 11) - 0.5) * 0.15,
        driftY: seededRand(i * 11 + 1) * -0.1 - 0.02,
      });
    }

    // Planets from theme
    state.menuPlanets = [];
    theme.planets.forEach((p, i) => {
      state.menuPlanets.push({
        x: p.x * width, y: p.y * height, r: p.r,
        color1: p.c1, color2: p.c2, ringColor: p.ring, hasRing: p.hasRing,
        phase: seededRand(i * 100) * Math.PI * 2,
        orbitSpeed: 0.0003 + seededRand(i * 100 + 1) * 0.0002,
        baseX: p.x * width,
        baseY: p.y * height,
      });
    });

    // Nebula clouds from theme
    state.menuNebulae = [];
    for (let i = 0; i < 4; i++) {
      state.menuNebulae.push({
        x: seededRand(i * 50 + 200) * width,
        y: seededRand(i * 50 + 201) * height,
        rx: 80 + seededRand(i * 50 + 202) * 120,
        ry: 60 + seededRand(i * 50 + 203) * 80,
        color: theme.nebulaColors[i],
        phase: seededRand(i * 50 + 204) * Math.PI * 2,
        pulseSpeed: 0.005 + seededRand(i * 50 + 205) * 0.005,
      });
    }

    // Shooting stars (spawn occasionally at runtime)
    state.menuShootingStars = [];
  };

  const generateBackgroundStars = (width) => {
    const stars = [];
    const starCount = getGfx().stars;
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * 2000,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
    gameStateRef.current.backgroundStars = stars;
  };

  const initGame = (width, height) => {
    const state = gameStateRef.current;

    // Start player at bottom of screen on left wall
    const startY = height - 100;
    // Create terrain first to get wall positions
    // Use a higher startY for terrain so the starting area is stable/flat
    state.leftTerrain = new Terrain('left', width, height * 10, startY + 1000, true, difficultyRef.current);
    state.rightTerrain = new Terrain('right', width, height * 10, startY + 1000, true, difficultyRef.current);

    // Randomly start on left or right wall, flush against it
    const startSide = Math.random() < 0.5 ? 'left' : 'right';
    const playerRadius = 12; // matches Player constructor
    let startX;
    if (startSide === 'left') {
      const leftWallX = state.leftTerrain.getMaxXAtY(startY);
      startX = leftWallX + playerRadius;
    } else {
      const rightWallX = state.rightTerrain.getMinXAtY(startY);
      startX = rightWallX - playerRadius;
    }
    state.player = new Player(startX, startY);
    // Scale bird speed for wider screens (iPad) so flight feels equally fast
    const iPhoneBaseWidth = 390;
    const speedScale = Math.max(1, width / iPhoneBaseWidth);
    state.player.aimPower = 900 * speedScale;
    state.speedScale = speedScale;
    state.player.currentSide = startSide;
    state.player.isStuck = true;
    state.player.skin = BirdSkins[selectedSkinRef.current] || BirdSkins.default;
    state.player.skinKey = selectedSkinRef.current || 'default';
    const trailKey = selectedTrailRef.current || 'none';
    state.player.activeTrail = trailKey !== 'none' ? Trails[trailKey] : null;
    state.enemies = [];
    state.coins = [];
    state.spikes = [];
    state.powerUps = [];
    state.explosionParticles = [];
    state.cameraY = startY - height * 0.75;
    state.lastEnemySpawnY = 0;
    state.lastCoinSpawnY = 0;
    state.lastSpikeSpawnY = 0;
    state.lastPowerUpSpawnY = 0;
    state.isRunning = true;
    state.startingY = startY;
    state.lowestY = startY;
    state.currentScore = 0;
    state.currentCoinScore = 0;
    state.shakeIntensity = 0;
    state.shakeX = 0;
    state.shakeY = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.comboTimerMax = 3.0;
    state.maxCombo = 0;
    state.lastComboAction = '';
    state.comboScoreAccum = 0;
    state._nearMissedEnemies = new Set();
    state.activePowerUpDisplay = [];
    state.difficulty = difficultyRef.current;
    const voidStorm = new VoidStorm(startY);
    // Adjust void storm speed by difficulty
    if (state.difficulty === 'easy') {
      voidStorm.baseSpeed = 20;
      voidStorm.y = startY + 900; // Starts further away
    } else if (state.difficulty === 'hard') {
      voidStorm.baseSpeed = 40;
      voidStorm.y = startY + 500; // Starts closer
    }
    voidStorm.currentSpeed = voidStorm.baseSpeed;
    state.voidStorm = voidStorm;
    state.floatingTexts = [];
    state.wallTraps = [];
    state.lastWallTrapSpawnY = 0;
    state.guardian = null;
    state.guardianIndex = 0;
    state.guardianActive = false;
    state.guardianClearedHeight = 0;
    // Build guardian schedule: milestone bosses + difficulty-spaced encounters between them
    // Heights are in raw pixels (displayed score = pixels / 10)
    // Milestones: 1000m, 2500m, 5000m, 10000m, 15000m, 20000m (x10 for pixels)
    const milestones = Guardian.MILESTONES.map(m => m * 10);
    // Spacing between non-milestone guardians (in pixels)
    // Easy: every ~1500m, Medium: every ~1000m, Hard: every ~750m
    const spacing = state.difficulty === 'easy' ? 15000 : state.difficulty === 'hard' ? 7500 : 10000;
    const guardianSchedule = [];
    let prev = 0;
    for (const m of milestones) {
      // Add filler guardians between previous milestone and this one
      let h = prev + spacing;
      while (h < m - spacing * 0.4) {
        guardianSchedule.push({ height: h, isMilestone: false });
        h += spacing;
      }
      guardianSchedule.push({ height: m, isMilestone: true });
      prev = m;
    }
    // Continue with filler guardians past the last milestone
    for (let i = 1; i <= 20; i++) {
      guardianSchedule.push({ height: prev + spacing * i, isMilestone: false });
    }
    state.guardianSchedule = guardianSchedule;
    state.guardianScheduleIdx = 0;
    state.nextGuardianMilestone = guardianSchedule.length > 0 ? guardianSchedule[0].height : 99999;
    state.wallParticles = [];
    state.coinCollectAnims = [];
    state.lastMilestone = 0;
    state.milestoneFlash = 0;
    state.milestoneText = '';
    state.milestoneTextTimer = 0;
    // Reset run stats and revive
    state.runStats = { distance: 0, coins: 0, wallBounces: 0, nearMisses: 0, guardiansDefeated: 0, purpleCoins: 0, maxCombo: 0, reachedOnFire: false };
    state.canRevive = true;
    state.pendingRevive = false;
    // First-run hints (only show once ever)
    const seenHints = getJSON('voidHopper_seenHints', {});
    state.hints = {
      seen: seenHints,
      active: null,       // { key, text, subtext, timer, maxTimer }
      queue: [],
    };
    state.newBestScore = false;
    state.missionRewardsThisRun = 0;
    state.streakBonusThisRun = 0;
    // Generate foreground dust motes
    state.dustParticles = [];
    const dustCount = getGfx().dust;
    for (let i = 0; i < dustCount; i++) {
      state.dustParticles.push({
        x: Math.random() * width,
        y: Math.random() * height * 3,
        radius: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.25 + 0.05,
        driftX: (Math.random() - 0.5) * 8,
        driftY: (Math.random() - 0.5) * 3,
        parallax: 0.2 + Math.random() * 0.3,
      });
    }

    // Pre-warm bird offscreen canvas to avoid GPU texture upload stall on first frame
    if (state.player) {
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 1;
      dummyCanvas.height = 1;
      const dummyCtx = dummyCanvas.getContext('2d');
      state.player.draw(dummyCtx, state.cameraY, graphicsRef.current);
    }

    setScore(0);
    setCoinScore(0);
    setIsGameOver(false);
  };

  const restartGame = (width, height) => {
    initGame(width, height);
  };

  // Show a first-run hint (only once ever per key)
  const showHint = (state, key, text, subtext, duration) => {
    if (!state.hints || state.hints.seen[key]) return;
    // Don't interrupt an active hint — queue it
    if (state.hints.active) {
      if (state.hints.queue.length < 5 && !state.hints.queue.find(h => h.key === key)) {
        state.hints.queue.push({ key, text, subtext, duration: duration || 3.5 });
      }
      return;
    }
    state.hints.seen[key] = true;
    setJSON('voidHopper_seenHints', state.hints.seen);
    state.hints.active = { key, text, subtext: subtext || '', timer: duration || 3.5, maxTimer: duration || 3.5 };
  };

  // Add combo points for a skillful action
  const addCombo = (state, points, actionLabel) => {
    const oldTier = getComboLabel(state.combo);
    state.combo += points;
    state.comboTimer = state.comboTimerMax;
    state.lastComboAction = actionLabel;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    // Play combo tier-up sound when crossing a tier threshold
    const newTier = getComboLabel(state.combo);
    if (newTier && newTier !== oldTier && audioManagerRef.current && audioManagerRef.current.playComboTierUpSound) {
      const tierLevel = state.combo >= 15 ? 4 : state.combo >= 10 ? 3 : state.combo >= 5 ? 2 : 1;
      audioManagerRef.current.playComboTierUpSound(tierLevel);
    }
  };

  // Get combo coin multiplier based on tier
  const getComboMultiplier = (combo) => {
    if (combo >= 15) return 8;
    if (combo >= 10) return 5;
    if (combo >= 5) return 3;
    if (combo >= 2) return 2;
    return 1;
  };

  // Get combo tier label
  const getComboLabel = (combo) => {
    if (combo >= 15) return 'UNSTOPPABLE';
    if (combo >= 10) return 'AMAZING';
    if (combo >= 5) return 'GREAT';
    if (combo >= 2) return 'NICE';
    return '';
  };

  // Spawn dust particles when bird sticks to a wall
  const spawnWallParticles = (state, x, y, dirX) => {
    const count = getGfx().wallParticles;
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.6 + (dirX > 0 ? 0 : Math.PI);
      const speed = 40 + Math.random() * 80;
      state.wallParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        radius: Math.random() * 3 + 1,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 0.6 + Math.random() * 0.4,
        color: ['#4488cc', '#66aadd', '#88ccff', '#ffffff', '#aaddff'][Math.floor(Math.random() * 5)],
      });
    }
  };

  // Spawn coin collect sparkle animation
  const spawnCoinCollectAnim = (state, coinX, coinY, cameraY, width) => {
    const screenX = coinX;
    const screenY = coinY - cameraY;
    // Target: coin counter in HUD (center top)
    const targetX = width / 2;
    const targetY = 80;
    const coinSparkleCount = getGfx().coinSparkles;
    for (let i = 0; i < coinSparkleCount; i++) {
      state.coinCollectAnims.push({
        x: screenX + (Math.random() - 0.5) * 20,
        y: screenY + (Math.random() - 0.5) * 20,
        targetX, targetY,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.6 + Math.random() * 0.3,
        delay: i * 0.04,
        color: ['#ffd700', '#ffee55', '#ffcc00'][Math.floor(Math.random() * 3)],
        radius: 2 + Math.random() * 2,
      });
    }
  };

  const update = (rawDeltaTime, width, height) => {
    const state = gameStateRef.current;
    const { player, enemies } = state;

    if (!player) return;

    // Ensure arrays exist (hot reload safety)
    if (!state.wallTraps) state.wallTraps = [];
    if (!state.floatingTexts) state.floatingTexts = [];
    if (!state.spikes) state.spikes = [];
    if (!state.coins) state.coins = [];
    if (!state.powerUps) state.powerUps = [];
    if (!state.backgroundStars) state.backgroundStars = [];


    // First-run hint: launch tutorial
    if (player.isStuck && state.runStats.wallBounces === 0 && state.runStats.distance === 0) {
      showHint(state, 'launch', 'DRAG TO AIM, RELEASE TO LAUNCH', 'Hop between walls to climb higher');
    }

    // Update active hint timer (pause while milestone text is showing)
    if (state.hints && state.hints.active && !(state.milestoneTextTimer > 0)) {
      state.hints.active.timer -= rawDeltaTime;
      if (state.hints.active.timer <= 0) {
        state.hints.active = null;
        // Show next queued hint
        if (state.hints.queue.length > 0) {
          const next = state.hints.queue.shift();
          showHint(state, next.key, next.text, next.subtext, next.duration);
        }
      }
    }

    // Slow-mo: enemies/items slow down, player stays normal speed
    const playerDeltaTime = rawDeltaTime;
    const deltaTime = player.hasSlowmo ? rawDeltaTime * 0.4 : rawDeltaTime;
    // Speed boost + mood speed modifier
    const moodSpeed = player.getSpeedMultiplier();
    const boostMult = player.hasSpeedBoost ? 1.5 : 1.0;

    // Apply gravity (scaled by deltaTime for frame-rate independence)
    // Scale gravity for wider screens so bird rises proportionally faster
    player.applyGravity(state.gravity * moodSpeed * 60 * (state.speedScale || 1), playerDeltaTime);

    // Speed boost: amplify player's upward velocity
    if (player.hasSpeedBoost && player.vy < 0) {
      player.vy *= (1 + (boostMult - 1) * playerDeltaTime * 3);
    }

    // Update player at normal speed regardless of slow-mo
    player.update(playerDeltaTime);

    // Clamp bird to visible screen — can't fly above the top of the visible area
    const screenTop = state.cameraY;
    if (player.y < screenTop + player.radius) {
      player.y = screenTop + player.radius;
      if (player.vy < 0) player.vy = 0; // Kill upward velocity
    }

    // Check if bird hits terrain walls - stick to wall
    // Always use state.leftTerrain and state.rightTerrain to get current terrain
    const leftBoundary = state.leftTerrain.getMaxXAtY(player.y);
    const rightBoundary = state.rightTerrain.getMinXAtY(player.y);

    // Check if bird is crushed between walls (corridor too narrow)
    const corridorWidth = rightBoundary - leftBoundary;
    const minSafeWidth = player.radius * 3; // Need at least 3x bird radius of space

    // Check if corridor is too narrow - applies to both flying and stuck birds
    if (corridorWidth < minSafeWidth) {
      // Bird is trapped/crushed - game over
      heavyTap();
      if (audioManagerRef.current) {
        audioManagerRef.current.playCollisionSound();
      }
      handleGameOver();
      return;
    }

    // Also check if stuck bird's position is actually inside the opposite wall
    if (player.isStuck) {
      if (player.currentSide === 'left' && player.x >= rightBoundary - player.radius) {
        // Stuck on left but pushed into right wall
        if (audioManagerRef.current) {
          audioManagerRef.current.playCollisionSound();
        }
        handleGameOver();
        return;
      } else if (player.currentSide === 'right' && player.x <= leftBoundary + player.radius) {
        // Stuck on right but pushed into left wall
        if (audioManagerRef.current) {
          audioManagerRef.current.playCollisionSound();
        }
        handleGameOver();
        return;
      }
    }

    if (!player.isStuck) {
      // Hard clamp — prevent player from ever going outside the corridor
      // (black holes or other forces could push player beyond walls)
      if (player.x < leftBoundary + player.radius) {
        player.x = leftBoundary + player.radius;
      }
      if (player.x > rightBoundary - player.radius) {
        player.x = rightBoundary - player.radius;
      }

      // Wall stick checks — skip the wall the bird just launched from to prevent
      // getting stuck under hills. Only stick to the opposite wall.
      if (player.x <= leftBoundary + player.radius + 1 && player.launchSide !== 'left') {
        player.stickToWall('left', leftBoundary + player.radius, player.y);
        state.shakeIntensity = Math.min(2 + state.combo * 0.15, 5);
        spawnWallParticles(state, player.x, player.y, 1);
        if (state.leftTerrain) state.leftTerrain.addBounceImpact(player.y);
        player.addMood(3);
        state.runStats.wallBounces++;
        if (state.runStats.wallBounces === 1) {
          showHint(state, 'wallBounce', 'WALL BOUNCES BUILD COMBOS', 'Chain bounces for coin multipliers');
        }
        mediumTap();
        if (audioManagerRef.current) {
          audioManagerRef.current.playBounceSound();
        }
      } else if (player.x >= rightBoundary - player.radius - 1 && player.launchSide !== 'right') {
        player.stickToWall('right', rightBoundary - player.radius, player.y);
        state.shakeIntensity = Math.min(2 + state.combo * 0.15, 5);
        spawnWallParticles(state, player.x, player.y, -1);
        if (state.rightTerrain) state.rightTerrain.addBounceImpact(player.y);
        player.addMood(3);
        state.runStats.wallBounces++;
        if (state.runStats.wallBounces === 1) {
          showHint(state, 'wallBounce', 'WALL BOUNCES BUILD COMBOS', 'Chain bounces for coin multipliers');
        }
        mediumTap();
        if (audioManagerRef.current) {
          audioManagerRef.current.playBounceSound();
        }
      }
    }

    // Track maximum height reached and update score
    if (player.y < state.lowestY) {
      state.lowestY = player.y;
      const heightClimbed = state.startingY - state.lowestY;
      const newScore = Math.floor(heightClimbed / 10);
      if (newScore !== state.currentScore) {
        state.currentScore = newScore;
        setScore(newScore);
      }
    }


    // === Height Milestone Celebrations ===
    const milestones = [100, 250, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 15000, 20000];
    const currentHeightForMilestone = state.currentScore;
    for (const m of milestones) {
      if (currentHeightForMilestone >= m && state.lastMilestone < m) {
        state.lastMilestone = m;
        state.milestoneFlash = 1.0;
        const titles = {
          100: 'LIFTOFF!',
          250: 'STRATOSPHERE',
          500: 'ORBIT REACHED',
          750: 'DEEP SPACE',
          1000: 'COSMIC VOYAGER',
          1500: 'STAR TRAVELER',
          2000: 'GALAXY WANDERER',
          3000: 'VOID WALKER',
          5000: 'LEGEND',
          7500: 'MYTHIC',
          10000: 'TRANSCENDENT',
          15000: 'ETERNAL',
          20000: 'VOID GOD',
        };
        state.milestoneText = titles[m] || `${m}m!`;
        state.milestoneTextTimer = 3.0;
        state.shakeIntensity = 4;
        player.addMood(15);
        notifyTap('SUCCESS');
        if (audioManagerRef.current) {
          audioManagerRef.current.playScoreMilestoneSound();
        }
        break;
      }
    }
    // Decay milestone flash and text
    if (state.milestoneFlash > 0) {
      state.milestoneFlash -= deltaTime * 1.5;
    }
    if (state.milestoneTextTimer > 0) {
      state.milestoneTextTimer -= deltaTime;
    }

    // Update camera (follow bird going UP, keep bird at bottom of screen)
    // screenY = player.y - cameraY, we want screenY = height * 0.75 (bottom 25%)
    // So: cameraY = player.y - height * 0.75
    const targetY = player.y - height * 0.75;
    state.cameraY = state.cameraY * 0.9 + targetY * 0.1;

    // Generate new terrain (above as bird climbs - Y decreases)
    // Terrain generates from startY going UPWARD (decreasing Y)
    // Terrain with startY=0 and height=1000 covers Y from 0 to -1000
    const terrainTopY = state.leftTerrain.startY - state.leftTerrain.height;

    // When player gets near the top, generate new terrain that starts where old ends
    // This creates seamless continuous terrain
    if (player.y < terrainTopY + height * 5) {
      // Regenerate terrain — uses absolute-Y-based generation so walls are consistent
      const newY = player.y + height * 3;
      state.leftTerrain = new Terrain('left', width, height * 10, newY, false, state.difficulty || 'medium');
      state.rightTerrain = new Terrain('right', width, height * 10, newY, false, state.difficulty || 'medium');

      // Reposition stuck bird to match new terrain wall position
      if (player.isStuck) {
        if (player.currentSide === 'left') {
          const newWallX = state.leftTerrain.getMaxXAtY(player.y);
          player.x = newWallX + player.radius;
        } else {
          const newWallX = state.rightTerrain.getMinXAtY(player.y);
          player.x = newWallX - player.radius;
        }
      }
    }

    // Update terrain wall animations
    state.leftTerrain.update();
    state.rightTerrain.update();

    // Spawn enemies — type depends on height climbed (progressive introduction)
    state.lastEnemySpawnY += deltaTime;
    const heightClimbed = state.startingY - player.y;
    const diff = state.difficulty || 'medium';
    let spawnInterval = diff === 'easy' ? 3.5 : diff === 'hard' ? 1.8 : 2.5;

    // First-run softening: no enemies for first 200m on very first game ever
    const isFirstRun = !getItem('voidHopper_hasPlayed');
    if (isFirstRun && heightClimbed < 2000) {
      spawnInterval *= 3.0; // Much fewer enemies in first 200m of first game
    }

    // Context-aware spawning: check terrain zone at spawn position
    // Tight zones (pinch, teeth, funnel) = fewer enemies; open zones (cavern, wide) = more enemies
    const spawnCheckY = state.cameraY - 150;
    const segHeight = 80;
    const absSegIdx = Math.round(-spawnCheckY / segHeight);
    const zoneSegLen = 15;
    const zoneIdx = Math.floor(absSegIdx / zoneSegLen);
    const zoneTypes = ['wide', 'rolling', 'zigzag', 'funnel', 'cavern', 'pinch', 'drift', 'teeth'];
    const currentZone = zoneTypes[Math.floor(Terrain.hash(zoneIdx * 53.1) * zoneTypes.length)];

    if (currentZone === 'pinch' || currentZone === 'teeth' || currentZone === 'funnel') {
      spawnInterval *= 1.6; // Fewer enemies in tight zones
    } else if (currentZone === 'cavern' || currentZone === 'wide') {
      spawnInterval *= 0.75; // More enemies in open zones
    }

    // Breathing room after guardian zones (8 seconds)
    const heightSinceGuardian = heightClimbed - (state.guardianClearedHeight || 0);
    if (state.guardianClearedHeight > 0 && heightSinceGuardian < 800) {
      spawnInterval *= 2.0;
    }

    const maxEnemies = diff === 'easy' ? 3 : diff === 'hard' ? 6 : 5;
    if (state.lastEnemySpawnY > spawnInterval && !state.guardianActive && state.enemies.length < maxEnemies) {
      const enemyY = state.cameraY - 150;

      const spawnLeftBound = state.leftTerrain.getMaxXAtY(enemyY);
      const spawnRightBound = state.rightTerrain.getMinXAtY(enemyY);

      const padding = 60;
      const safeMinX = spawnLeftBound + padding;
      const safeMaxX = spawnRightBound - padding;

      if (safeMaxX - safeMinX > 100) {
        const enemyX = safeMinX + Math.random() * (safeMaxX - safeMinX);

        // Progressive enemy introduction — thresholds shift by difficulty
        // Easy: enemies unlock 50% later, Hard: enemies unlock 40% sooner
        const diffScale = diff === 'easy' ? 1.5 : diff === 'hard' ? 0.7 : 1.0;
        const t1 = 500 * diffScale;   // Jellyfish unlock
        const t2 = 1500 * diffScale;  // Plasma Orbs unlock
        const t3 = 3000 * diffScale;  // UFOs unlock
        const t4 = 5000 * diffScale;  // Cosmic Serpents unlock
        const t5 = diff === 'hard' ? 6000 : 8000 * diffScale;  // Black Holes — hard: 6000m (separated from guardian at 4000m)

        let enemy;
        const roll = Math.random();

        if (heightClimbed < t1) {
          // Early game: asteroids only
          enemy = new Enemy(enemyX, enemyY);
        } else if (heightClimbed < t2) {
          // Introduce jellyfish
          if (roll < 0.5) {
            enemy = new Enemy(enemyX, enemyY);
          } else {
            enemy = new SpaceJellyfish(enemyX, enemyY);
          }
        } else if (heightClimbed < t3) {
          // Introduce plasma orbs
          if (roll < 0.3) {
            enemy = new Enemy(enemyX, enemyY);
          } else if (roll < 0.6) {
            enemy = new SpaceJellyfish(enemyX, enemyY);
          } else {
            enemy = new PlasmaOrb(enemyX, enemyY, spawnLeftBound, spawnRightBound);
          }
        } else if (heightClimbed < t4) {
          // Introduce UFOs
          if (roll < 0.2) {
            enemy = new Enemy(enemyX, enemyY);
          } else if (roll < 0.4) {
            enemy = new SpaceJellyfish(enemyX, enemyY);
          } else if (roll < 0.65) {
            enemy = new PlasmaOrb(enemyX, enemyY, spawnLeftBound, spawnRightBound);
          } else {
            enemy = new UFO(enemyX, enemyY);
          }
        } else if (heightClimbed < t5) {
          // Introduce cosmic serpents
          if (roll < 0.15) {
            enemy = new Enemy(enemyX, enemyY);
          } else if (roll < 0.3) {
            enemy = new SpaceJellyfish(enemyX, enemyY);
          } else if (roll < 0.5) {
            enemy = new PlasmaOrb(enemyX, enemyY, spawnLeftBound, spawnRightBound);
          } else if (roll < 0.7) {
            enemy = new UFO(enemyX, enemyY);
          } else {
            enemy = new CosmicSerpent(enemyX, enemyY, spawnLeftBound, spawnRightBound);
          }
        } else {
          // Endgame: everything including black holes
          if (roll < 0.1) {
            enemy = new Enemy(enemyX, enemyY);
          } else if (roll < 0.2) {
            enemy = new SpaceJellyfish(enemyX, enemyY);
          } else if (roll < 0.35) {
            enemy = new PlasmaOrb(enemyX, enemyY, spawnLeftBound, spawnRightBound);
          } else if (roll < 0.5) {
            enemy = new UFO(enemyX, enemyY);
          } else if (roll < 0.7) {
            enemy = new CosmicSerpent(enemyX, enemyY, spawnLeftBound, spawnRightBound);
          } else {
            enemy = new BlackHole(enemyX, enemyY);
          }
        }

        // Gradually increase enemy fall speed with height (caps at 1.5x at 20000m)
        if (enemy && enemy.vy) {
          const speedMultiplier = 1.0 + Math.min(heightClimbed / 20000, 0.5);
          enemy.vy *= speedMultiplier;
        }

        enemies.push(enemy);
      }

      state.lastEnemySpawnY = 0; // Reset timer
    }

    // Spawn coins at intervals
    state.lastCoinSpawnY += deltaTime;
    const coinSpawnInterval = diff === 'easy' ? 4.0 : diff === 'hard' ? 5.0 : 6.0;

    if (state.lastCoinSpawnY > coinSpawnInterval) {
      const coinY = state.cameraY - 150;
      const leftBoundary = state.leftTerrain.getMaxXAtY(coinY);
      const rightBoundary = state.rightTerrain.getMinXAtY(coinY);
      const padding = 40;
      const safeMinX = leftBoundary + padding;
      const safeMaxX = rightBoundary - padding;

      if (safeMaxX - safeMinX > 80) {
        const coinX = safeMinX + Math.random() * (safeMaxX - safeMinX);

        // Gold: 80%, Silver: 15%, Purple: 5%
        let coinType = 'gold';
        const rand = Math.random();
        if (rand > 0.95) {
          coinType = 'purple'; // 5% chance - rarest
        } else if (rand > 0.80) {
          coinType = 'silver'; // 15% chance - rare
        }

        const coin = new Coin(coinX, coinY, coinType);
        state.coins.push(coin);
      }

      state.lastCoinSpawnY = 0;
    }

    // Update coins
    state.coins.forEach(coin => {
      coin.update(deltaTime);

      // Check collision with player
      if (!coin.collected && coin.checkCollision(player)) {
        coin.collected = true;
        // Coin pickup builds combo and mood
        addCombo(state, 1, 'COIN');
        state.runStats.coins++;
        if (state.runStats.coins === 1) {
          showHint(state, 'coin', 'COINS COLLECTED!', 'Spend them in the shop for skins & trails');
        }
        if (coin.type === 'purple') state.runStats.purpleCoins++;
        player.addMood(4);
        const comboMult = getComboMultiplier(state.combo);
        const moodMult = player.getCoinMultiplier();
        const totalMult = comboMult * moodMult;
        const totalValue = Math.round(coin.value * totalMult);
        state.currentCoinScore += totalValue;
        setCoinScore(state.currentCoinScore);

        // Sparkle animation flying to HUD
        spawnCoinCollectAnim(state, coin.x, coin.y, state.cameraY, width);

        // Show multiplier text when bonuses active
        if (totalMult > 1) {
          const moodTier = player.getMoodTier();
          let label = '';
          if (comboMult > 1 && moodMult > 1) {
            label = `x${totalMult} COMBO+MOOD`;
          } else if (comboMult > 1) {
            label = `x${comboMult} COMBO`;
          } else {
            const tierName = moodTier === 'onfire' ? 'ON FIRE' : 'FIRED UP';
            label = `x${moodMult} ${tierName}`;
          }
          state.floatingTexts.push({
            x: coin.x, y: coin.y,
            label: label,
            desc: `+${totalValue}`,
            color: totalMult >= 5 ? '#ff6600' : totalMult >= 3 ? '#ffaa00' : '#ffd700',
            life: 1.5, maxLife: 1.5, vy: -50,
          });
        }

        // Play coin collect sound
        if (audioManagerRef.current) {
          if (audioManagerRef.current.playCoinPickupSound) {
            audioManagerRef.current.playCoinPickupSound();
          } else {
            audioManagerRef.current.playScoreMilestoneSound();
          }
        }
      }
    });

    // Remove collected or off-screen coins — in-place
    let coinWrite = 0;
    for (let i = 0; i < state.coins.length; i++) {
      const coin = state.coins[i];
      if (!coin.collected && coin.y <= state.cameraY + height + 100) {
        state.coins[coinWrite++] = coin;
      }
    }
    state.coins.length = coinWrite;

    // Spawn spikes on walls (never at starting position)
    state.lastSpikeSpawnY += deltaTime;
    const spikeSpawnInterval = diff === 'easy' ? 8.0 : diff === 'hard' ? 3.5 : 5.0;

    if (state.lastSpikeSpawnY > spikeSpawnInterval && player.y < state.startingY - 200) {
      // Only spawn when player is well above starting position
      const spikeY = state.cameraY - 100;

      // Randomly choose left or right wall
      const side = Math.random() < 0.5 ? 'left' : 'right';

      // Get wall position at spike Y
      let spikeX;
      if (side === 'left') {
        spikeX = state.leftTerrain.getMaxXAtY(spikeY);
      } else {
        spikeX = state.rightTerrain.getMinXAtY(spikeY);
      }

      // Check if there's already a spike or wall trap too close
      const minSepSameWall = 150;
      const minSepOppWall = 150; // Prevent tight dual-wall hazard windows
      const minSepTrap = 200; // Extra room from wall traps (they're bigger)
      const tooClose = state.spikes.some(existingSpike => {
        const distance = Math.abs(existingSpike.y - spikeY);
        return distance < (existingSpike.side === side ? minSepSameWall : minSepOppWall);
      }) || state.wallTraps.some(trap => {
        const distance = Math.abs(trap.y - spikeY);
        return distance < (trap.side === side ? minSepTrap : minSepOppWall);
      });

      if (!tooClose) {
        // Random size
        const sizes = ['small', 'medium', 'large'];
        const size = sizes[Math.floor(Math.random() * sizes.length)];

        const spike = new Spike(spikeX, spikeY, side, size);
        state.spikes.push(spike);
      }

      state.lastSpikeSpawnY = 0;
    }

    // Update spikes
    let shieldAbsorbedThisFrame = false;
    const playerInvincible = player.invincibleTimer > 0;
    state.spikes.forEach(spike => {
      spike.update(deltaTime);

      // Check collision with player when stuck to wall
      if (!shieldAbsorbedThisFrame && !playerInvincible && spike.checkCollision(player)) {
        if (player.hasShield) {
          player.hasShield = false;
          player.shieldTimer = 0;
          player.invincibleTimer = 0.3;
          state.shakeIntensity = 6;
          // Shield absorbing a hit breaks combo
          state.combo = 0;
          state.comboTimer = 0;
          shieldAbsorbedThisFrame = true;
          if (audioManagerRef.current) audioManagerRef.current.playBounceSound();
        } else {
          if (audioManagerRef.current) audioManagerRef.current.playCollisionSound();
          state.shakeIntensity = 9;
          handleGameOver();
        }
      } else if (player.isStuck && spike.side === player.currentSide && !spike._nearMissed) {
        // Near-miss spike: stuck to same wall, close but didn't die (once per spike)
        const dy = Math.abs(spike.y - player.y);
        if (dy < 60 && dy > 10) {
          spike._nearMissed = true;
          addCombo(state, 2, 'RISKY LAND');
          state.floatingTexts.push({
            x: player.x, y: player.y,
            label: 'RISKY!',
            desc: '+2 combo',
            color: '#ff4444',
            life: 1.2, maxLife: 1.2, vy: -60,
          });
        }
      }
    });

    // Remove off-screen spikes — in-place
    let spikeWrite = 0;
    for (let i = 0; i < state.spikes.length; i++) {
      const spike = state.spikes[i];
      if (spike.y <= state.cameraY + height + 100 && spike.y >= state.cameraY - 200) {
        state.spikes[spikeWrite++] = spike;
      }
    }
    state.spikes.length = spikeWrite;

    // Spawn wall traps (animated traps replace some spikes at higher climbs)
    state.lastWallTrapSpawnY += deltaTime;
    const wallTrapInterval = diff === 'easy' ? 10.0 : diff === 'hard' ? 5.0 : 7.0;

    if (state.lastWallTrapSpawnY > wallTrapInterval && player.y < state.startingY - 1500) {
      const trapY = state.cameraY - 120;
      const trapSide = Math.random() < 0.5 ? 'left' : 'right';

      let trapX;
      if (trapSide === 'left') {
        trapX = state.leftTerrain.getMaxXAtY(trapY);
      } else {
        trapX = state.rightTerrain.getMinXAtY(trapY);
      }

      // Check minimum separation from ALL wall hazards (both walls)
      const tooClose = state.wallTraps.some(t => {
        const dist = Math.abs(t.y - trapY);
        return dist < (t.side === trapSide ? 250 : 150);
      }) || state.spikes.some(s => {
        const dist = Math.abs(s.y - trapY);
        return dist < (s.side === trapSide ? 200 : 150);
      });

      if (!tooClose) {
        state.wallTraps.push(new WallTrap(trapX, trapY, trapSide));
      }

      state.lastWallTrapSpawnY = 0;
    }

    // Update wall traps
    state.wallTraps.forEach(trap => {
      trap.update(deltaTime);

      if (!shieldAbsorbedThisFrame && !playerInvincible && trap.checkCollision(player)) {
        if (player.hasShield) {
          player.hasShield = false;
          player.shieldTimer = 0;
          player.invincibleTimer = 0.3;
          state.shakeIntensity = 6;
          state.combo = 0; state.comboTimer = 0; player.drainMood(25);
          shieldAbsorbedThisFrame = true;
          if (audioManagerRef.current) audioManagerRef.current.playBounceSound();
        } else {
          if (audioManagerRef.current) audioManagerRef.current.playCollisionSound();
          state.shakeIntensity = 9;
          handleGameOver();
        }
      }
    });

    // Remove off-screen wall traps — in-place
    let trapWrite = 0;
    for (let i = 0; i < state.wallTraps.length; i++) {
      const trap = state.wallTraps[i];
      if (!(state.voidStorm && trap.y > state.voidStorm.y) &&
          trap.y <= state.cameraY + height + 100 && trap.y >= state.cameraY - 200) {
        state.wallTraps[trapWrite++] = trap;
      }
    }
    state.wallTraps.length = trapWrite;

    // Spawn power-ups (rare)
    state.lastPowerUpSpawnY += deltaTime;
    const puInterval = diff === 'easy' ? 10 : diff === 'hard' ? 12 : 15;
    if (state.lastPowerUpSpawnY > puInterval && player.y < state.startingY - 500) {
      const puY = state.cameraY - 150;
      const puLeft = state.leftTerrain.getMaxXAtY(puY);
      const puRight = state.rightTerrain.getMinXAtY(puY);
      const puMinX = puLeft + 40;
      const puMaxX = puRight - 40;

      if (puMaxX - puMinX > 60) {
        const puX = puMinX + Math.random() * (puMaxX - puMinX);
        const types = ['shield', 'magnet', 'slowmo', 'speedboost'];
        const puType = types[Math.floor(Math.random() * types.length)];
        state.powerUps.push(new PowerUp(puX, puY, puType));
      }
      state.lastPowerUpSpawnY = 0;
    }

    // Update power-ups
    state.powerUps.forEach(pu => {
      pu.update(deltaTime);

      if (pu.checkCollision(player)) {
        pu.collected = true;
        showHint(state, 'powerup', 'POWER-UP!', 'Grab glowing orbs for special abilities');
        const duration = pu.durations[pu.type];
        const cfg = pu.config[pu.type];

        if (pu.type === 'shield') {
          player.hasShield = true;
          player.shieldTimer = duration;
        } else if (pu.type === 'magnet') {
          player.hasMagnet = true;
          player.magnetTimer = duration;
        } else if (pu.type === 'slowmo') {
          player.hasSlowmo = true;
          player.slowmoTimer = duration;
        } else if (pu.type === 'speedboost') {
          player.hasSpeedBoost = true;
          player.speedBoostTimer = duration;
        }

        // Floating text descriptions
        const descriptions = {
          shield: 'Absorbs one hit!',
          magnet: 'Attracts nearby coins!',
          slowmo: 'Slows everything down!',
          speedboost: 'Faster climbing speed!',
        };

        // Add floating text popup
        state.floatingTexts.push({
          x: pu.x,
          y: pu.y,
          label: cfg.label,
          desc: descriptions[pu.type],
          color: cfg.color,
          life: 2.5,
          maxLife: 2.5,
          vy: -60,
        });

        player.addMood(6);

        if (audioManagerRef.current) {
          audioManagerRef.current.playScoreMilestoneSound();
        }
      }
    });

    // Remove collected or off-screen powerups — in-place
    let puWrite = 0;
    for (let i = 0; i < state.powerUps.length; i++) {
      const pu = state.powerUps[i];
      if (!pu.collected && pu.y <= state.cameraY + height + 100) {
        state.powerUps[puWrite++] = pu;
      }
    }
    state.powerUps.length = puWrite;

    // Update power-up timers (use real time, not slow-mo time)
    if (player.hasShield) {
      player.shieldTimer -= playerDeltaTime;
      if (player.shieldTimer <= 0) player.hasShield = false;
    }
    if (player.hasMagnet) {
      player.magnetTimer -= playerDeltaTime;
      if (player.magnetTimer <= 0) player.hasMagnet = false;
    }
    if (player.hasSlowmo) {
      player.slowmoTimer -= playerDeltaTime;
      if (player.slowmoTimer <= 0) player.hasSlowmo = false;
    }
    if (player.hasSpeedBoost) {
      player.speedBoostTimer -= playerDeltaTime;
      if (player.speedBoostTimer <= 0) player.hasSpeedBoost = false;
    }

    // Update floating texts — in-place removal
    let ftWrite = 0;
    for (let i = 0; i < state.floatingTexts.length; i++) {
      const ft = state.floatingTexts[i];
      ft.y += ft.vy * deltaTime;
      ft.vy *= 0.97;
      ft.life -= deltaTime;
      if (ft.life > 0) state.floatingTexts[ftWrite++] = ft;
    }
    state.floatingTexts.length = ftWrite;

    // Magnet effect — pull nearby coins
    if (player.hasMagnet) {
      state.coins.forEach(coin => {
        if (coin.collected) return;
        const dx = player.x - coin.x;
        const dy = player.y - coin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 350 && dist > 0) {
          // Speed increases as coins get closer for a satisfying snap
          const pullSpeed = 600 + (1 - dist / 350) * 400;
          coin.x += (dx / dist) * pullSpeed * deltaTime;
          coin.y += (dy / dist) * pullSpeed * deltaTime;
        }
      });
    }

    // Update screen shake
    if (state.shakeIntensity > 0) {
      state.shakeX = (Math.random() - 0.5) * state.shakeIntensity * 2;
      state.shakeY = (Math.random() - 0.5) * state.shakeIntensity * 2;
      state.shakeIntensity *= Math.pow(0.9, deltaTime * 60);
      if (state.shakeIntensity < 0.3) {
        state.shakeIntensity = 0;
        state.shakeX = 0;
        state.shakeY = 0;
      }
    }

    // Update combo timer
    if (state.comboTimer > 0) {
      state.comboTimer -= deltaTime;
      // High combo (15+) gives bonus distance score over time
      if (state.combo >= 15) {
        state.comboScoreAccum += deltaTime * 5; // +5 distance per second
        if (state.comboScoreAccum >= 1) {
          const bonus = Math.floor(state.comboScoreAccum);
          state.comboScoreAccum -= bonus;
          state.currentScore += bonus;
          setScore(state.currentScore);
        }
      }
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.comboScoreAccum = 0;
      }
    }

    // Apply mood-based hitbox scaling for collision checks
    // Use try/finally to guarantee radius restoration even on early return (handleGameOver)
    const originalRadius = player.radius;
    player.radius = originalRadius * player.getHitboxScale();
    try {

    // Update enemies
    enemies.forEach(enemy => {
      enemy.update(deltaTime);

      // Black holes apply gravitational pull to the player (even when bird is flying)
      if (enemy.isBlackHole && !player.isStuck) {
        enemy.applyGravity(player, deltaTime);
      }

      // Keep enemies within corridor boundaries - bounce off walls
      const enemyLeftBoundary = state.leftTerrain.getMaxXAtY(enemy.y);
      const enemyRightBoundary = state.rightTerrain.getMinXAtY(enemy.y);

      // Check if enemy hit left wall
      if (enemy.x - enemy.radius < enemyLeftBoundary) {
        enemy.x = enemyLeftBoundary + enemy.radius;
        if (enemy.isPlasmaOrb) {
          enemy.bounceOffWall(enemyLeftBoundary + enemy.radius, 1);
        } else if (enemy.vx) {
          enemy.vx = Math.abs(enemy.vx);
        }
      }

      // Check if enemy hit right wall
      if (enemy.x + enemy.radius > enemyRightBoundary) {
        enemy.x = enemyRightBoundary - enemy.radius;
        if (enemy.isPlasmaOrb) {
          enemy.bounceOffWall(enemyRightBoundary - enemy.radius, -1);
        } else if (enemy.vx) {
          enemy.vx = -Math.abs(enemy.vx);
        }
      }

      // Check collision with player
      if (!shieldAbsorbedThisFrame && !playerInvincible && enemy.active && enemy.checkCollision(player)) {
        if (player.hasShield) {
          // Shield absorbs the hit — breaks combo
          player.hasShield = false;
          player.shieldTimer = 0;
          player.invincibleTimer = 0.3;
          enemy.active = false;
          state.shakeIntensity = 6;
          state.combo = 0; state.comboTimer = 0; player.drainMood(25);
          shieldAbsorbedThisFrame = true;
          if (audioManagerRef.current) {
            audioManagerRef.current.playBounceSound();
          }
        } else {
          if (audioManagerRef.current) {
            audioManagerRef.current.playCollisionSound();
          }
          state.shakeIntensity = 9;
          handleGameOver();
        }
      }
    });

    // Proximity-based danger — use squared distance to avoid sqrt per enemy
    // Only compute exact distance if we find something within 80px (squared = 6400)
    const dangerThresholdSq = 80 * 80;
    let closestEnemyDistSq = Infinity;
    let closestEnemyRadiusSum = 0;
    const px = player.x, py = player.y, pr = player.radius;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.active) continue;
      const dx = px - enemy.x;
      const dy = py - enemy.y;
      const distSq = dx * dx + dy * dy;
      // Quick reject: if center-to-center > 80 + max_radius, skip
      if (distSq < closestEnemyDistSq) {
        closestEnemyDistSq = distSq;
        closestEnemyRadiusSum = enemy.radius + pr;
      }
    }

    // Wall traps
    for (let i = 0; i < state.wallTraps.length; i++) {
      const trap = state.wallTraps[i];
      const dx = px - trap.x;
      const dy = py - trap.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < closestEnemyDistSq) {
        closestEnemyDistSq = distSq;
        closestEnemyRadiusSum = trap.width;
      }
    }

    // Guardian
    if (state.guardian && state.guardian.active && !state.guardian.exiting) {
      const dx = px - state.guardian.x;
      const dy = py - state.guardian.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < closestEnemyDistSq) {
        closestEnemyDistSq = distSq;
        closestEnemyRadiusSum = state.guardian.radius + pr;
      }
    }

    // Only compute sqrt if something is potentially close
    let closestEnemyDist = Infinity;
    if (closestEnemyDistSq < dangerThresholdSq * 4) {
      closestEnemyDist = Math.sqrt(closestEnemyDistSq) - closestEnemyRadiusSum;
    }

    // Void storm proximity (already linear)
    if (state.voidStorm) {
      const voidDist = py - state.voidStorm.y;
      if (voidDist < closestEnemyDist) closestEnemyDist = voidDist;
    }

    // Danger proximity — sets visual danger pulse and drains mood
    if (closestEnemyDist < 30) {
      player.setDanger(Math.min(1, 1 - closestEnemyDist / 30));
      player.drainMood(deltaTime * 4);
    } else if (closestEnemyDist < 80) {
      player.setDanger(Math.min(0.5, (1 - closestEnemyDist / 80) * 0.5));
      player.drainMood(deltaTime * 1.5);
    }

    // Near-miss detection — enemy passed close but didn't hit (once per enemy)
    if (!player.isStuck) {
      if (!state._nearMissedEnemies) state._nearMissedEnemies = new Set();
      // Use squared distance for quick rejection (35+maxRadius)^2 ~ 2500
      const nearMissMaxSq = 60 * 60;
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (!enemy.active || state._nearMissedEnemies.has(enemy)) continue;
        const dx = px - enemy.x;
        const dy = py - enemy.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > nearMissMaxSq) continue;
        const dist = Math.sqrt(distSq) - enemy.radius - pr;
        if (dist > 5 && dist < 35) {
          state._nearMissedEnemies.add(enemy);
          player.registerNearMiss(); // adds +8 mood internally
          addCombo(state, 2, 'CLOSE CALL');
          state.runStats.nearMisses++;
          state.floatingTexts.push({
            x: px, y: py,
            label: 'CLOSE CALL!',
            desc: '+2 combo',
            color: '#ff66aa',
            life: 1.2, maxLife: 1.2, vy: -60,
          });
          if (audioManagerRef.current && audioManagerRef.current.playNearMissSound) {
            audioManagerRef.current.playNearMissSound();
          }
        }
      }
      // Clean up references to removed enemies periodically
      if (state._nearMissedEnemies.size > 20) {
        const activeSet = new Set(enemies);
        for (const e of state._nearMissedEnemies) {
          if (!activeSet.has(e)) state._nearMissedEnemies.delete(e);
        }
      }
    }

    } finally {
    // Restore original radius after collision checks
    player.radius = originalRadius;
    }

    // Remove off-screen enemies — in-place swap-and-pop to avoid array allocation
    const voidY = state.voidStorm ? state.voidStorm.y : Infinity;
    const screenBottom = state.cameraY + height + 100;
    let writeIdx = 0;
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      // Quick cheap checks first before expensive terrain lookup
      if (enemy.y > voidY || enemy.y > screenBottom) continue;
      // Only check terrain boundaries for enemies that passed cheap checks
      const leftBoundary = state.leftTerrain.getMaxXAtY(enemy.y);
      const rightBoundary = state.rightTerrain.getMinXAtY(enemy.y);
      if (enemy.x < leftBoundary - enemy.radius || enemy.x > rightBoundary + enemy.radius) continue;
      enemies[writeIdx++] = enemy;
    }
    enemies.length = writeIdx;
    state.enemies = enemies;

    // Update explosion particles — in-place
    let epWrite = 0;
    for (let i = 0; i < state.explosionParticles.length; i++) {
      const p = state.explosionParticles[i];
      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;
      p.life -= deltaTime * 2;
      if (p.life > 0) state.explosionParticles[epWrite++] = p;
    }
    state.explosionParticles.length = epWrite;

    // Update wall-stick particles — in-place
    if (state.wallParticles) {
      let wpWrite = 0;
      for (let i = 0; i < state.wallParticles.length; i++) {
        const p = state.wallParticles[i];
        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;
        p.vy += 80 * deltaTime;
        p.life -= deltaTime;
        if (p.life > 0) state.wallParticles[wpWrite++] = p;
      }
      state.wallParticles.length = wpWrite;
    }

    // Update coin collect animations — in-place
    if (state.coinCollectAnims) {
      let caWrite = 0;
      for (let i = 0; i < state.coinCollectAnims.length; i++) {
        const a = state.coinCollectAnims[i];
        a.delay -= deltaTime;
        if (a.delay <= 0) {
          const t = 1 - (a.life / a.maxLife);
          const ease = t * t;
          a.x += (a.targetX - a.x) * ease * 0.15;
          a.y += (a.targetY - a.y) * ease * 0.15;
          a.life -= deltaTime;
        }
        if (a.life > 0) state.coinCollectAnims[caWrite++] = a;
      }
      state.coinCollectAnims.length = caWrite;
    }


    // === Guardian System (gauntlet zones) ===
    const currentHeight = state.startingY - player.y;

    // Spawn guardian from schedule
    if (!state.guardianActive && !state.guardian && currentHeight >= state.nextGuardianMilestone) {
      const leftB = state.leftTerrain.getMaxXAtY(player.y);
      const rightB = state.rightTerrain.getMinXAtY(player.y);
      state.guardian = new Guardian(leftB + 30, rightB - 30, state.guardianIndex, currentHeight, state.difficulty);
      state.guardianActive = true;

      // Show guardian announcement
      const isMilestone = state.guardian.isMilestone;
      state.floatingTexts.push({
        x: (leftB + rightB) / 2,
        y: player.y - height * 0.3,
        label: (isMilestone ? '★ ' : '') + state.guardian.name,
        desc: state.guardian.config.desc,
        color: isMilestone ? '#ffd700' : state.guardian.color.glow,
        life: isMilestone ? 4.0 : 3.0,
        maxLife: isMilestone ? 4.0 : 3.0,
        vy: -30,
      });
      state.shakeIntensity = isMilestone ? 8 : 4;
    }

    // Update active guardian
    if (state.guardian && state.guardian.active) {
      // Update corridor bounds as player climbs
      const gLeftB = state.leftTerrain.getMaxXAtY(state.guardian.y);
      const gRightB = state.rightTerrain.getMinXAtY(state.guardian.y);
      state.guardian.corridorLeft = gLeftB + 30;
      state.guardian.corridorRight = gRightB - 30;
      state.guardian.corridorCenter = (state.guardian.corridorLeft + state.guardian.corridorRight) / 2;

      state.guardian.update(deltaTime, player.x, player.y, state.cameraY, height, currentHeight);

      // Collision check (any hit = damage, like regular enemies)
      if (!shieldAbsorbedThisFrame && !playerInvincible && !state.guardian.exiting && state.guardian.entered) {
        const guardianHit = state.guardian.checkCollision(player);
        if (guardianHit) {
          if (player.hasShield) {
            player.hasShield = false;
            player.shieldTimer = 0;
            player.invincibleTimer = 0.3;
            state.shakeIntensity = 6;
            state.combo = 0; state.comboTimer = 0; player.drainMood(25);
            shieldAbsorbedThisFrame = true;
            if (audioManagerRef.current) audioManagerRef.current.playBounceSound();
          } else {
            state.shakeIntensity = 9;
            if (audioManagerRef.current) audioManagerRef.current.playCollisionSound();
            handleGameOver();
            return;
          }
        }
      }

      // Vortex pull effect
      if (state.guardian.vortexActive && !player.isStuck) {
        state.guardian.applyVortex(player, deltaTime);
      }

      // Guardian zone completed — reward the player
      if (!state.guardian.active) {
        const reward = state.guardian.reward || (5 + state.guardianIndex * 3);
        const wasMilestone = state.guardian.isMilestone;
        state.currentCoinScore += reward;
        setCoinScore(state.currentCoinScore);
        player.addMood(wasMilestone ? 40 : 25);
        addCombo(state, wasMilestone ? 8 : 5, wasMilestone ? 'BOSS DEFEATED!' : 'GUARDIAN SURVIVED');
        state.runStats.guardiansDefeated++;
        state.shakeIntensity = wasMilestone ? 10 : 5;
        if (wasMilestone) notifyTap('SUCCESS'); else heavyTap();

        state.floatingTexts.push({
          x: player.x, y: player.y,
          label: wasMilestone ? '★ BOSS DEFEATED! ★' : 'GUARDIAN SURVIVED!',
          desc: `+${reward} coins`,
          color: '#ffd700',
          life: wasMilestone ? 4.0 : 3.0,
          maxLife: wasMilestone ? 4.0 : 3.0,
          vy: -50,
        });

        if (audioManagerRef.current) audioManagerRef.current.playScoreMilestoneSound();

        state.guardian = null;
        state.guardianActive = false;
        state.guardianIndex++;
        state.guardianScheduleIdx++;
        // Advance to next scheduled guardian
        if (state.guardianScheduleIdx < state.guardianSchedule.length) {
          state.nextGuardianMilestone = state.guardianSchedule[state.guardianScheduleIdx].height;
        } else {
          state.nextGuardianMilestone = 999999;
        }
        state.guardianClearedHeight = currentHeight;
      }
    }

    // Update void storm — the rising threat (slowed during guardian zones)
    if (state.voidStorm) {
      // Slow the void during guardian encounters so the player isn't double-pressured
      const voidMult = state.guardianActive ? 0.4 : 1.0;
      const heightClimbed = state.startingY - state.lowestY;
      state.voidStorm.update(deltaTime * voidMult, player.y, heightClimbed);

      // Check if void consumed the player
      if (!playerInvincible && state.voidStorm.checkCollision(player.y)) {
        if (player.hasShield) {
          player.hasShield = false;
          player.shieldTimer = 0;
          player.invincibleTimer = 0.3;
          state.shakeIntensity = 9;
          // Push void back slightly when shield absorbs
          state.voidStorm.y += 100;
          if (audioManagerRef.current) audioManagerRef.current.playBounceSound();
        } else {
          state.shakeIntensity = 12;
          if (audioManagerRef.current) audioManagerRef.current.playCollisionSound();
          handleGameOver();
          return;
        }
      }
    }

    // Check if player fell off bottom
    if (player.y > state.cameraY + height + 200) {
      handleGameOver();
    }

    // Update run stats for missions
    state.runStats.distance = state.currentScore;
    state.runStats.maxCombo = Math.max(state.runStats.maxCombo, state.combo);
    if (player.getMoodTier() === 'onfire') state.runStats.reachedOnFire = true;
    // Mood hint on first tier-up + mood tier change sounds
    if (player.moodFlashDir > 0 && player.getMoodTier() === 'firedup') {
      showHint(state, 'mood', 'MOOD RISING!', 'High mood = faster speed & more coins');
    }
    if (player.moodFlashDir > 0 && player.getMoodTier() === 'onfire' && audioManagerRef.current && audioManagerRef.current.playMoodIgnitionSound) {
      audioManagerRef.current.playMoodIgnitionSound();
    }
    if (player.moodFlashDir < 0 && player.getMoodTier() === 'chill' && audioManagerRef.current && audioManagerRef.current.playMoodChillSound) {
      audioManagerRef.current.playMoodChillSound();
    }

    // Update background stars twinkle
    state.backgroundStars.forEach(star => {
      star.twinklePhase += star.twinkleSpeed;
    });
  };

  const handleGameOver = () => {
    const state = gameStateRef.current;
    if (!state.isRunning) return; // Prevent double-call in same frame
    notifyTap('ERROR');

    // Drop mood on death
    if (state.player) {
      state.player.mood = 0; // Drop to minimum on death
    }

    // Create feather particles floating away from bird, matching the current skin
    if (state.player) {
      const skin = state.player.skin || BirdSkins.default;
      const featherColors = [
        skin.body, skin.head, skin.wing, skin.tail,
        skin.bodyStroke, skin.wingStroke,
        skin.breast, skin.crest, skin.earTufts,
      ].filter(c => c && typeof c === 'string' && c !== 'null');
      if (featherColors.length === 0) featherColors.push('#ffffff', '#cccccc');

      for (let i = 0; i < 25; i++) {
        const angle = (Math.PI * 2 * i) / 25 + (Math.random() - 0.5) * 0.3;
        const speed = Math.random() * 12 + 5;

        state.explosionParticles.push({
          x: state.player.x + (Math.random() - 0.5) * 20,
          y: state.player.y + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          radius: 4,
          life: 20.0,
          isFeather: true,
          featherColor: featherColors[Math.floor(Math.random() * featherColors.length)],
          featherSize: Math.random() * 8 + 6,
          featherRotation: Math.random() * Math.PI * 2,
          featherRotationSpeed: (Math.random() - 0.5) * 2,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: Math.random() * 2 + 1,
        });
      }

      // Start death dance animation on the bird
      state.player.isDying = true;
      state.player.deathTime = 0;
    }

    state.isRunning = false;
    state.combo = 0;

    // Clear in-game overlays immediately on death
    state.milestoneFlash = 0;
    state.milestoneTextTimer = 0;
    if (state.hints) state.hints.active = null;

    // Check if revive is available
    const reviveCost = Math.floor(10 + state.currentScore / 200);
    if (state.canRevive && totalCoinsRef.current >= reviveCost) {
      state.pendingRevive = true;
      state.reviveTimer = 5.0;
      state.reviveCost = reviveCost;
      return;
    }
    finalizeGameOver();
  };

  const finalizeGameOver = () => {
    const state = gameStateRef.current;
    state.pendingRevive = false;
    // Mark that the player has played at least once (for first-run softening)
    if (!getItem('voidHopper_hasPlayed')) {
      setItem('voidHopper_hasPlayed', 'true');
    }
    // Clear in-game overlays so they don't overlap with game over screen
    state.milestoneFlash = 0;
    state.milestoneTextTimer = 0;
    if (state.hints) state.hints.active = null;
    setIsGameOver(true);
    gameOverTimeRef.current = Date.now();
    const diff = state.difficulty || 'medium';
    const finalScore = state.currentScore;
    const finalCoinScore = state.currentCoinScore;
    setScore(finalScore);
    setCoinScore(finalCoinScore);

    // Submit score to Game Center
    submitGCScore(diff, finalScore);

    const savedHighScores = getJSON('voidHopper_highScores', {});
    const savedHighCoinScores = getJSON('voidHopper_highCoinScores', {});
    state.newBestScore = finalScore > (savedHighScores[diff] || 0);

    if (finalScore > (savedHighScores[diff] || 0)) {
      const updated = { ...savedHighScores, [diff]: finalScore };
      setHighScores(updated);
      setJSON('voidHopper_highScores', updated);
    }
    if (finalCoinScore > (savedHighCoinScores[diff] || 0)) {
      const updated = { ...savedHighCoinScores, [diff]: finalCoinScore };
      setHighCoinScores(updated);
      setJSON('voidHopper_highCoinScores', updated);
    }

    // Update mission progress and collect rewards
    let missionReward = 0;
    if (progressionRef.current) {
      progressionRef.current.updateProgress(state.runStats);
      missionReward = progressionRef.current.collectRewards();
      state.missionRewardsThisRun = missionReward;
      // Update lifetime stats and cumulative missions
      progressionRef.current.updateLifetimeStats(state.runStats);
      const cumulativeReward = progressionRef.current.collectCumulativeRewards();
      missionReward += cumulativeReward;
      state.missionRewardsThisRun += cumulativeReward;
      // Update daily challenge
      progressionRef.current.updateDailyChallenge(state.runStats);
      const dailyChallengeReward = progressionRef.current.claimDailyChallengeReward();
      missionReward += dailyChallengeReward;
      state.missionRewardsThisRun += dailyChallengeReward;
      // Add XP for the run
      progressionRef.current.addXP(Math.floor(finalScore / 10) + finalCoinScore);
    }

    // Calculate streak bonus
    let streakBonus = 0;
    if (progressionRef.current && finalCoinScore > 0) {
      const bonusPct = progressionRef.current.getStreakBonus();
      streakBonus = Math.floor(finalCoinScore * bonusPct);
      state.streakBonusThisRun = streakBonus;
    }

    // Persist total coins (base + mission rewards + streak bonus)
    const earned = finalCoinScore + missionReward + streakBonus;
    if (earned > 0) {
      const newTotal = totalCoinsRef.current + earned;
      totalCoinsRef.current = newTotal;
      setTotalCoins(newTotal);
      setItem('voidHopper_totalCoins', String(newTotal));
    }
  };

  const handleRevive = () => {
    const state = gameStateRef.current;
    if (!state.pendingRevive) return;
    // Safety guard — don't allow negative balance
    if (totalCoinsRef.current < state.reviveCost) {
      declineRevive();
      return;
    }

    const newTotal = totalCoinsRef.current - state.reviveCost;
    totalCoinsRef.current = newTotal;
    setTotalCoins(newTotal);
    setItem('voidHopper_totalCoins', String(newTotal));

    state.pendingRevive = false;
    state.canRevive = false;
    state.isRunning = true;
    state.player.isDying = false;
    state.player.mood = 30;
    state.explosionParticles = [];
    state._nearMissedEnemies = new Set();

    // Clear all power-ups before giving revive shield
    state.player.hasMagnet = false;
    state.player.magnetTimer = 0;
    state.player.hasSlowmo = false;
    state.player.slowmoTimer = 0;
    state.player.hasSpeedBoost = false;
    state.player.speedBoostTimer = 0;
    state.player.deathTime = 0;
    state.player.hasShield = true;
    state.player.shieldTimer = 5;

    if (state.voidStorm) state.voidStorm.y += 300;

    const leftB = state.leftTerrain.getMaxXAtY(state.player.y);
    const rightB = state.rightTerrain.getMinXAtY(state.player.y);
    if (state.player.x - leftB < rightB - state.player.x) {
      state.player.stickToWall('left', leftB + state.player.radius, state.player.y);
    } else {
      state.player.stickToWall('right', rightB - state.player.radius, state.player.y);
    }

    state.shakeIntensity = 8;
    state.floatingTexts.push({
      x: state.player.x, y: state.player.y,
      label: 'REVIVED!', desc: 'Shield active!',
      color: '#44ff88', life: 2.5, maxLife: 2.5, vy: -60,
    });
    if (audioManagerRef.current) audioManagerRef.current.playScoreMilestoneSound();
  };

  const declineRevive = () => {
    gameStateRef.current.pendingRevive = false;
    finalizeGameOver();
  };

  // === Save/Load System for progress persistence across reinstalls ===
  const exportSaveData = () => {
    const saveData = {
      version: 1,
      timestamp: Date.now(),
      totalCoins: totalCoinsRef.current,
      highScores: getJSON('voidHopper_highScores', {}),
      highCoinScores: getJSON('voidHopper_highCoinScores', {}),
      unlockedSkins: getJSON('voidHopper_unlockedSkins', ['default']),
      selectedSkin: getItem('voidHopper_selectedSkin') || 'default',
      unlockedTrails: getJSON('voidHopper_unlockedTrails', ['none']),
      selectedTrail: getItem('voidHopper_selectedTrail') || 'none',
      graphics: getItem('voidHopper_graphics') || 'medium',
      progression: getJSON('voidHopper_progression', {}),
    };
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voidhopper-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSaveData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!data.version || data.totalCoins === undefined) {
            return; // Invalid save file — silently ignore
          }
          // Restore all data
          totalCoinsRef.current = data.totalCoins || 0;
          setTotalCoins(data.totalCoins || 0);
          setItem('voidHopper_totalCoins', String(data.totalCoins || 0));

          if (data.highScores) {
            setHighScores(data.highScores);
            setJSON('voidHopper_highScores', data.highScores);
          }
          if (data.highCoinScores) {
            setHighCoinScores(data.highCoinScores);
            setJSON('voidHopper_highCoinScores', data.highCoinScores);
          }
          if (data.unlockedSkins) {
            setUnlockedSkins(data.unlockedSkins);
            setJSON('voidHopper_unlockedSkins', data.unlockedSkins);
          }
          if (data.selectedSkin) {
            selectedSkinRef.current = data.selectedSkin;
            setSelectedSkin(data.selectedSkin);
            setItem('voidHopper_selectedSkin', data.selectedSkin);
          }
          if (data.unlockedTrails) {
            setUnlockedTrails(data.unlockedTrails);
            setJSON('voidHopper_unlockedTrails', data.unlockedTrails);
          }
          if (data.selectedTrail) {
            selectedTrailRef.current = data.selectedTrail;
            setSelectedTrail(data.selectedTrail);
            setItem('voidHopper_selectedTrail', data.selectedTrail);
          }
          if (data.graphics) {
            graphicsRef.current = data.graphics;
            setItem('voidHopper_graphics', data.graphics);
          }
          if (data.progression) {
            setJSON('voidHopper_progression', data.progression);
          }
        } catch (err) {
          // Could not read save file — silently ignore
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const shareScore = () => {
    const state = gameStateRef.current;
    const diff = (state.difficulty || 'medium').toUpperCase();
    const dist = state.currentScore;
    const coins = state.currentCoinScore;
    const combo = state.maxCombo;
    const skinName = (state.player && state.player.skin) ? state.player.skin.name : 'Default';
    const lvl = progressionRef.current ? progressionRef.current.getLevel() : 1;
    const text = `Void Hopper | ${diff} | ${dist}m | ${coins} coins | ${combo}x combo | Lvl ${lvl} | ${skinName}\nCan you beat my score?`;

    // Use Web Share API if available (mobile), otherwise copy to clipboard
    if (navigator.share) {
      navigator.share({ title: 'Void Hopper Score', text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        state.floatingTexts.push({
          x: canvasRef.current ? canvasRef.current.logicalWidth / 2 : 200,
          y: canvasRef.current ? canvasRef.current.logicalHeight / 2 : 300,
          label: 'COPIED TO CLIPBOARD!', desc: '',
          color: '#44ff88', life: 2.0, maxLife: 2.0, vy: -40,
        });
      }).catch(() => {});
    }
  };

  const toggleMusic = async () => {
    if (audioManagerRef.current) {
      const isPlaying = await audioManagerRef.current.toggleMusic();
      setIsMusicPlaying(isPlaying);
    }
  };

  const renderMenuBackground = (ctx, width, height, dt) => {
    const state = gameStateRef.current;
    if (!state.menuStars) state.menuStars = [];
    if (!state.menuPlanets) state.menuPlanets = [];
    if (!state.menuNebulae) state.menuNebulae = [];
    if (!state.menuShootingStars) state.menuShootingStars = [];

    const menuDt = dt || 0.016;
    state.menuTime = (state.menuTime || 0) + menuDt;
    const t = state.menuTime;

    // Deep space gradient background — uses daily theme colors
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    const stops = (state.menuTheme && state.menuTheme.bgStops) || ['#050510', '#0a0a20', '#0f0825', '#08061a'];
    bgGrad.addColorStop(0, stops[0]);
    bgGrad.addColorStop(0.4, stops[1]);
    bgGrad.addColorStop(0.7, stops[2]);
    bgGrad.addColorStop(1, stops[3]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Nebula clouds (drawn first, very faint)
    state.menuNebulae.forEach(n => {
      n.phase += n.pulseSpeed;
      const pulse = 1 + Math.sin(n.phase) * 0.15;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(n.x, n.y, n.rx * pulse, n.ry * pulse, 0, 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.fill();
      ctx.restore();
    });

    // Stars — batch white stars into single path, draw tinted separately
    const whiteStars = [];
    const tintedStars = [];
    state.menuStars.forEach(star => {
      star.twinklePhase += star.twinkleSpeed;
      star.x += star.driftX;
      star.y += star.driftY;
      if (star.x < 0) star.x = width;
      if (star.x > width) star.x = 0;
      if (star.y < 0) star.y = height;
      if (star.color === '#ffffff') {
        whiteStars.push(star);
      } else {
        tintedStars.push(star);
      }
    });
    // Batch white stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    for (let i = 0; i < whiteStars.length; i++) {
      const s = whiteStars[i];
      ctx.moveTo(s.x + s.radius, s.y);
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    }
    ctx.fill();
    // Tinted stars (fewer, drawn individually)
    tintedStars.forEach(star => {
      const twinkle = star.alpha + Math.sin(star.twinklePhase) * 0.25;
      ctx.globalAlpha = Math.max(0, twinkle);
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Planets
    state.menuPlanets.forEach(p => {
      p.phase += p.orbitSpeed;
      const px = p.baseX + Math.sin(p.phase) * 8;
      const py = p.baseY + Math.cos(p.phase * 0.7) * 5;

      // Planet body
      const grad = ctx.createRadialGradient(px - p.r * 0.3, py - p.r * 0.3, p.r * 0.1, px, py, p.r);
      grad.addColorStop(0, p.color2);
      grad.addColorStop(0.7, p.color1);
      grad.addColorStop(1, '#000000');

      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Atmosphere glow
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, p.r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = p.color2;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.15 + Math.sin(t * 0.5) * 0.05;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();

      // Ring
      if (p.hasRing) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(px, py, p.r * 1.8, p.r * 0.3, -0.2, 0, Math.PI * 2);
        ctx.strokeStyle = p.ringColor;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.35;
        ctx.stroke();
        // Inner ring
        ctx.beginPath();
        ctx.ellipse(px, py, p.r * 1.5, p.r * 0.25, -0.2, 0, Math.PI * 2);
        ctx.strokeStyle = p.ringColor;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    });

    // Shooting stars (spawn randomly)
    if (Math.random() < 0.005) {
      state.menuShootingStars.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.5,
        vx: 300 + Math.random() * 200,
        vy: 150 + Math.random() * 100,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 0.8 + Math.random() * 0.5,
        length: 40 + Math.random() * 30,
      });
    }

    let ssWrite = 0;
    for (let si = 0; si < state.menuShootingStars.length; si++) {
      const s = state.menuShootingStars[si];
      s.x += s.vx * menuDt;
      s.y += s.vy * menuDt;
      s.life -= menuDt;
      if (s.life <= 0) continue;

      const alpha = s.life / s.maxLife;
      const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      const tailX = s.x - (s.vx / speed) * s.length;
      const tailY = s.y - (s.vy / speed) * s.length;

      const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
      grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
      grad.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.8})`);

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(s.x, s.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Bright head
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();

      state.menuShootingStars[ssWrite++] = s;
    }
    state.menuShootingStars.length = ssWrite;
  };

  const render = (ctx, width, height, dt) => {
    const state = gameStateRef.current;

    // Ensure arrays exist (hot reload safety)
    if (!state.backgroundStars) state.backgroundStars = [];
    if (!state.spikes) state.spikes = [];
    if (!state.wallTraps) state.wallTraps = [];
    if (!state.coins) state.coins = [];
    if (!state.powerUps) state.powerUps = [];
    if (!state.enemies) state.enemies = [];
    if (!state.floatingTexts) state.floatingTexts = [];
    if (!state.explosionParticles) state.explosionParticles = [];
    if (!state.wallParticles) state.wallParticles = [];
    if (!state.coinCollectAnims) state.coinCollectAnims = [];
    if (!state.dustParticles) state.dustParticles = [];

    // When paused, skip expensive game world rendering — just draw static bg + overlay
    if (isPausedRef.current && gameStarted && !isGameOver) {
      const bgBiome = state.leftTerrain ? state.leftTerrain.getBiomeAt(state.cameraY + height * 0.5) : null;
      ctx.fillStyle = bgBiome ? bgBiome.bg : '#120e29';
      ctx.fillRect(0, 0, width, height);

      // Draw dimmed overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, width, height);

      // Pause text
      const pauseTs = Math.max(1, width / 390);
      const pauseSmall = width < 420;
      const pauseFontSize = pauseSmall ? Math.max(36, Math.floor(width * 0.1)) : Math.round(52 * pauseTs);
      ctx.font = `900 ${pauseFontSize}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#1a3366';
      ctx.lineWidth = 5;
      ctx.strokeText('PAUSED', width / 2, height / 2);
      const pauseGrad = ctx.createLinearGradient(width / 2 - 100, height / 2 - 25, width / 2 + 100, height / 2 + 10);
      pauseGrad.addColorStop(0, '#44ccff');
      pauseGrad.addColorStop(0.5, '#ffffff');
      pauseGrad.addColorStop(1, '#44ccff');
      ctx.fillStyle = pauseGrad;
      ctx.fillText('PAUSED', width / 2, height / 2);

      // Resume button
      const pBtnW = Math.min(Math.round(200 * pauseTs), width - 40);
      const pBtnH = Math.max(44, Math.round(50 * pauseTs * (height < 600 ? height / 700 : 1)));
      const resumeBtnX = width / 2 - pBtnW / 2;
      const resumeBtnY = height / 2 + Math.round(40 * pauseTs);
      ctx.fillStyle = 'rgba(30, 100, 160, 0.9)';
      ctx.fillRect(resumeBtnX, resumeBtnY, pBtnW, pBtnH);
      ctx.strokeStyle = '#4dccff';
      ctx.lineWidth = 2;
      ctx.strokeRect(resumeBtnX, resumeBtnY, pBtnW, pBtnH);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(20 * pauseTs)}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('RESUME', width / 2, resumeBtnY + pBtnH / 2 + 7);
      state._resumeBtnBounds = { x: resumeBtnX, y: resumeBtnY, w: pBtnW, h: pBtnH };

      // Main Menu button
      const menuBtnX = width / 2 - pBtnW / 2;
      const menuBtnY = resumeBtnY + pBtnH + Math.round(12 * pauseTs);
      ctx.fillStyle = 'rgba(60, 40, 100, 0.9)';
      ctx.fillRect(menuBtnX, menuBtnY, pBtnW, pBtnH);
      ctx.strokeStyle = '#9966cc';
      ctx.lineWidth = 2;
      ctx.strokeRect(menuBtnX, menuBtnY, pBtnW, pBtnH);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(18 * pauseTs)}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('MAIN MENU', width / 2, menuBtnY + pBtnH / 2 + 6);

      return;
    }

    // Menu background — draw animated space scene instead of game world
    if (!gameStarted && !isGameOver) {
      if (!state.menuStars || state.menuStars.length === 0) {
        generateMenuScene(width, height);
      }
      renderMenuBackground(ctx, width, height, dt);
      drawUI(ctx, width, height);

      // Blurred overlay + "tap to resume" when audio needs recovery (iOS background return)
      const am = audioManagerRef.current;
      if (am && am._needsResume && !isMutedRef.current) {
        // Dim overlay to simulate blur
        ctx.fillStyle = 'rgba(18, 14, 41, 0.7)';
        ctx.fillRect(0, 0, width, height);
        // Pulsing message
        const pulse = 0.5 + Math.sin(Date.now() / 400) * 0.5;
        const safeTop = state.safeTop || 0;
        ctx.save();
        ctx.textAlign = 'center';
        // Icon
        const arTs = Math.max(1, width / 390);
        ctx.font = `${Math.round(48 * arTs)}px Arial`;
        ctx.fillStyle = `rgba(170, 136, 255, ${0.6 + pulse * 0.4})`;
        ctx.fillText('\u266B', width / 2, height / 2 - 20);
        // Text
        ctx.font = `bold ${Math.round(20 * arTs)}px Orbitron, Arial`;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + pulse * 0.3})`;
        ctx.fillText('Tap to resume audio', width / 2, height / 2 + 20);
        ctx.restore();
      }

      return;
    }

    // Clear canvas with biome-appropriate background color
    const bgBiome = state.leftTerrain ? state.leftTerrain.getBiomeAt(state.cameraY + height * 0.5) : null;
    ctx.fillStyle = bgBiome ? bgBiome.bg : '#120e29';
    ctx.fillRect(0, 0, width, height);

    // Snap camera to whole pixels for rendering to prevent sub-pixel jitter
    // Game logic keeps the smooth float; only drawing uses the snapped value
    const renderCam = Math.round(state.cameraY);

    // Apply screen shake
    ctx.save();
    if (state.shakeIntensity > 0) {
      ctx.translate(state.shakeX, state.shakeY);
    }

    // Draw background stars (parallax effect) — batched into a single path
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    for (let i = 0; i < state.backgroundStars.length; i++) {
      const star = state.backgroundStars[i];
      const parallaxY = star.y - renderCam * 0.5;
      const screenY = parallaxY % (height + 1000) - 500;

      if (screenY > -50 && screenY < height + 50) {
        ctx.moveTo(star.x + star.radius, screenY);
        ctx.arc(star.x, screenY, star.radius, 0, Math.PI * 2);
      }
    }
    ctx.fill();

    // Draw terrain
    if (state.leftTerrain) {
      state.leftTerrain.draw(ctx, renderCam);
    }
    if (state.rightTerrain) {
      state.rightTerrain.draw(ctx, renderCam);
    }

    // Draw void storm (behind entities)
    if (state.voidStorm) {
      state.voidStorm.draw(ctx, renderCam, width, height);
    }

    // Reset shadow state before drawing entities (prevents leaked shadowBlur
    // from prior frames causing circular glow on drawImage-blitted sprites)
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Draw only on-screen entities (cull off-screen)
    const cullTop = renderCam - 200;
    const cullBottom = renderCam + height + 200;

    // Use the already-sampled bgBiome for all spikes (they're all on screen, same biome)
    state.spikes.forEach(spike => {
      if (spike.y > cullTop && spike.y < cullBottom) {
        spike.draw(ctx, renderCam, bgBiome);
      }
    });

    state.wallTraps.forEach(trap => {
      if (trap.y > cullTop && trap.y < cullBottom) trap.draw(ctx, renderCam);
    });

    state.coins.forEach(coin => {
      if (coin.y > cullTop && coin.y < cullBottom) coin.draw(ctx, renderCam);
    });

    state.powerUps.forEach(pu => {
      if (pu.y > cullTop && pu.y < cullBottom) pu.draw(ctx, renderCam);
    });

    state.enemies.forEach(enemy => {
      if (enemy.y > cullTop && enemy.y < cullBottom) enemy.draw(ctx, renderCam);
    });

    // Draw guardian
    if (state.guardian && state.guardian.active) {
      state.guardian.draw(ctx, renderCam, state.safeTop || 0);
    }

    // Draw player (hide when death dance is playing — it draws its own bird)
    if (state.player && !state.player.isDying) {
      // Blink during invincibility frames for visual feedback
      if (state.player.invincibleTimer > 0 && Math.floor(state.player.invincibleTimer * 20) % 2 === 0) {
        ctx.globalAlpha = 0.4;
      }
      state.player.draw(ctx, renderCam, graphicsRef.current);
      ctx.globalAlpha = 1;
      state.player.drawTrajectory(ctx, renderCam, state.gravity);
    }

    // Draw wall-stick particles — batched by color, no per-particle save/restore
    if (state.wallParticles && state.wallParticles.length > 0) {
      const particlesByColor = {};
      for (let i = 0; i < state.wallParticles.length; i++) {
        const p = state.wallParticles[i];
        const screenY = p.y - renderCam;
        if (screenY < -50 || screenY > height + 50) continue;
        const alpha = p.life / p.maxLife;
        const key = p.color;
        if (!particlesByColor[key]) particlesByColor[key] = [];
        particlesByColor[key].push({ x: p.x, y: screenY, r: p.radius * alpha });
      }
      for (const color in particlesByColor) {
        ctx.fillStyle = color;
        ctx.beginPath();
        const arr = particlesByColor[color];
        for (let i = 0; i < arr.length; i++) {
          ctx.moveTo(arr[i].x + arr[i].r, arr[i].y);
          ctx.arc(arr[i].x, arr[i].y, arr[i].r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }

    // Draw floating text popups (in world space)
    const ftTs = Math.min(2, Math.max(1, width / 390));
    state.floatingTexts.forEach(ft => {
      const screenY = ft.y - renderCam;
      const alpha = Math.min(1, ft.life / (ft.maxLife * 0.3)); // Fade out in last 30%
      const scale = Math.min(1, (ft.maxLife - ft.life) / 0.2); // Scale in quickly

      ctx.save();
      ctx.translate(ft.x, screenY);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      // Label (e.g. "SHIELD") — outlined (no shadowBlur for performance)
      ctx.font = `900 ${Math.round(16 * ftTs)}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.label, 0, -10);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.label, 0, -10);

      // Description (e.g. "Absorbs one hit!")
      ctx.font = `bold ${Math.round(12 * ftTs)}px Orbitron, Arial`;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.lineWidth = 2;
      ctx.strokeText(ft.desc, 0, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(ft.desc, 0, 8);

      ctx.restore();
    });

    // End screen shake transform
    ctx.restore();

    // Foreground dust motes (slight parallax for depth) — batched
    if (state.dustParticles && state.dustParticles.length > 0) {
      ctx.fillStyle = 'rgba(204, 187, 238, 0.15)';
      ctx.beginPath();
      for (let i = 0; i < state.dustParticles.length; i++) {
        const d = state.dustParticles[i];
        d.x += d.driftX * (dt || 0.016);
        d.y += d.driftY * (dt || 0.016);
        const screenY = (d.y - renderCam * d.parallax) % (height + 100) - 50;
        if (d.x < -10) d.x = width + 10;
        if (d.x > width + 10) d.x = -10;
        ctx.moveTo(d.x + d.radius, screenY);
        ctx.arc(d.x, screenY, d.radius, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Milestone flash overlay
    if (state.milestoneFlash > 0 && !isGameOver) {
      ctx.save();
      ctx.globalAlpha = state.milestoneFlash * 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Milestone celebration text — dramatic entrance with gradient and glow
    if (state.milestoneTextTimer > 0 && !isGameOver) {
      ctx.save();
      const progress = 1 - (state.milestoneTextTimer / 3.0);
      const scale = progress < 0.1 ? progress / 0.1 : 1;
      const fadeAlpha = state.milestoneTextTimer > 0.5 ? 1 : state.milestoneTextTimer / 0.5;
      // Scale font to fit screen width with padding
      const maxTitleSize = Math.min(42, Math.floor(width * 0.09));
      const titleSize = Math.floor(maxTitleSize * scale);
      const subSize = Math.floor(Math.min(22, width * 0.05) * scale);
      const my = height * 0.35;
      ctx.globalAlpha = fadeAlpha;
      ctx.textAlign = 'center';
      // Title text with gold gradient (no shadowBlur for clean iOS rendering)
      ctx.font = `900 ${titleSize}px Orbitron, Arial`;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#664400';
      ctx.lineWidth = Math.max(2, Math.floor(4 * (width / 420)));
      ctx.strokeText(state.milestoneText, width / 2, my);
      const gradHalf = Math.min(120, width * 0.3);
      const mGrad = ctx.createLinearGradient(width / 2 - gradHalf, my - 20, width / 2 + gradHalf, my + 10);
      mGrad.addColorStop(0, '#ffcc00');
      mGrad.addColorStop(0.3, '#ffffff');
      mGrad.addColorStop(0.5, '#ffee66');
      mGrad.addColorStop(0.7, '#ffffff');
      mGrad.addColorStop(1, '#ffcc00');
      ctx.fillStyle = mGrad;
      ctx.fillText(state.milestoneText, width / 2, my);
      // Subtitle distance
      ctx.font = `bold ${subSize}px Orbitron, Arial`;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 3;
      ctx.strokeText(`${state.lastMilestone}m`, width / 2, my + Math.min(38, width * 0.08));
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${state.lastMilestone}m`, width / 2, my + Math.min(38, width * 0.08));
      ctx.restore();
    }

    // Draw void storm warning overlay (on top, not affected by shake)
    if (state.voidStorm && state.player && !isGameOver) {
      const proximity = state.voidStorm.getProximity(state.player.y);
      state.voidStorm.drawWarning(ctx, width, height, proximity);
    }

    // Draw UI (not affected by shake)
    drawUI(ctx, width, height);

    // Coin collect sparkles (screen space, on top of everything) — batched
    if (state.coinCollectAnims && state.coinCollectAnims.length > 0) {
      const gfx = getGfx();
      if (gfx.enableParticleShadows) {
        // With shadows, need per-particle rendering
        state.coinCollectAnims.forEach(a => {
          if (a.delay > 0) return;
          const alpha = a.life / a.maxLife;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = a.color;
          ctx.shadowBlur = 6;
          ctx.shadowColor = a.color;
          ctx.beginPath();
          ctx.arc(a.x, a.y, a.radius * alpha, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      } else {
        // Without shadows, batch by color
        const byColor = {};
        for (let i = 0; i < state.coinCollectAnims.length; i++) {
          const a = state.coinCollectAnims[i];
          if (a.delay > 0) continue;
          if (!byColor[a.color]) byColor[a.color] = [];
          byColor[a.color].push(a);
        }
        for (const color in byColor) {
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          for (const a of byColor[color]) {
            const r = a.radius * (a.life / a.maxLife);
            ctx.moveTo(a.x + r, a.y);
            ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
          }
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  };

  const drawUI = (ctx, width, height) => {
    const state = gameStateRef.current;
    // Scale text for wider screens (iPad) so HUD remains readable
    const ts = Math.min(2, Math.max(1, width / 390));
    // Safe area offset for notched phones (iPhone X+)
    const safeTop = isMobile ? (state.safeTop || 0) : 0;

    // Only draw gameplay HUD when game is active (not on start menu)
    if (gameStarted && !isGameOver) {
      // Draw difficulty badge (top left)
      const diffLabel = (state.difficulty || 'medium').toUpperCase();
      const diffColor = diffLabel === 'EASY' ? '#44cc66' : diffLabel === 'HARD' ? '#ff4444' : '#ffaa22';
      ctx.save();
      ctx.font = `bold ${Math.round(12 * ts)}px Orbitron, Arial`;
      ctx.textAlign = 'left';
      ctx.fillStyle = diffColor;
      ctx.globalAlpha = 0.6;
      ctx.fillText(diffLabel, 12, 18 * ts + safeTop);
      ctx.restore();

      // Draw distance score — glowing outline
      ctx.save();
      ctx.font = `bold ${Math.round(30 * ts)}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.shadowBlur = getGfx().shadowBlurMed;
      ctx.shadowColor = '#4dccff';
      ctx.strokeStyle = 'rgba(77, 204, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.strokeText(`${state.currentScore}m`, width / 2, 50 * ts + safeTop);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${state.currentScore}m`, width / 2, 50 * ts + safeTop);
      ctx.restore();

      // Draw coin score with canvas-drawn coin icon
      ctx.save();
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${Math.round(24 * ts)}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.shadowBlur = getGfx().shadowBlurSmall;
      ctx.shadowColor = '#000000';
      // Draw small coin circle
      const coinIconX = width / 2 - ctx.measureText(` ${state.currentCoinScore}`).width / 2 - 10 * ts;
      ctx.beginPath();
      ctx.arc(coinIconX, 74 * ts + safeTop, 8 * ts, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.fill();
      ctx.strokeStyle = '#cc9900';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#cc9900';
      ctx.font = `bold ${Math.round(10 * ts)}px Orbitron, Arial`;
      ctx.fillText('$', coinIconX, 78 * ts + safeTop);
      // Draw score text
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${Math.round(24 * ts)}px Orbitron, Arial`;
      ctx.fillText(`${state.currentCoinScore}`, width / 2 + 5, 80 * ts + safeTop);
      ctx.restore();
    }

    // Flowing Y tracker for center HUD elements below coin score
    let hudFlowY = 102 * ts + safeTop; // default: just below mood meter bar (92+6+4)

    // Draw mood meter bar
    const player = state.player;
    if (player && gameStarted && !isGameOver) {
      ctx.save();
      const meterW = 80 * ts;
      const meterH = 6 * ts;
      const meterX = width / 2 - meterW / 2;
      const meterY = 92 * ts + safeTop;
      const moodPct = player.moodDisplay / 100;
      const tier = player.getMoodTier();

      // Background bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(meterX, meterY, meterW, meterH);

      // Mood fill — color shifts with mood
      let moodColor;
      if (tier === 'onfire') {
        const pulse = Math.sin(Date.now() / 80) * 0.15 + 0.85;
        moodColor = `rgba(255, ${Math.floor(60 + pulse * 40)}, 0, 1)`;
      } else if (tier === 'firedup') {
        moodColor = '#ffaa44';
      } else if (tier === 'chill') {
        moodColor = '#6688cc';
      } else {
        moodColor = '#88aacc';
      }
      ctx.fillStyle = moodColor;
      ctx.fillRect(meterX, meterY, meterW * moodPct, meterH);

      // Glow for high mood
      if (tier === 'onfire' || tier === 'firedup') {
        ctx.shadowBlur = tier === 'onfire' ? 8 : 4;
        ctx.shadowColor = moodColor;
        ctx.fillRect(meterX, meterY, meterW * moodPct, meterH);
        ctx.shadowBlur = 0;
      }

      // Tier markers
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      [0.2, 0.51, 0.76].forEach(mark => {
        ctx.fillRect(meterX + meterW * mark - 0.5, meterY, 1, meterH);
      });

      // Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(meterX, meterY, meterW, meterH);

      // Tier label (only when not neutral)
      if (tier !== 'neutral') {
        const tierLabels = { chill: 'CHILL', firedup: 'FIRED UP', onfire: 'ON FIRE' };
        const tierColors = { chill: '#6688cc', firedup: '#ffaa44', onfire: '#ff4400' };
        ctx.font = `bold ${Math.round(10 * ts)}px Orbitron, Arial`;
        ctx.textAlign = 'center';
        ctx.fillStyle = tierColors[tier];
        ctx.shadowBlur = 4;
        ctx.shadowColor = tierColors[tier];
        ctx.fillText(tierLabels[tier], width / 2, meterY + meterH + Math.round(12 * ts));
        ctx.shadowBlur = 0;
        // Effect hint
        const effects = {
          chill: '-5% speed',
          firedup: '+5% speed, coins x1.5',
          onfire: '+10% speed, coins x2',
        };
        ctx.font = `${Math.round(8 * ts)}px Orbitron, Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(effects[tier], width / 2, meterY + meterH + Math.round(22 * ts));
        hudFlowY = meterY + meterH + Math.round(44 * ts); // below effect hint plus font ascent + padding
      } else {
        hudFlowY = meterY + meterH + 6; // just below the bar
      }

      // Flash effect on tier change
      if (player.moodFlashTimer > 0) {
        const flashAlpha = player.moodFlashTimer * 0.5;
        ctx.globalAlpha = flashAlpha;
        ctx.fillStyle = player.moodFlashDir > 0 ? '#ffaa00' : '#4466aa';
        ctx.fillRect(meterX - 2, meterY - 2, meterW + 4, meterH + 4);
      }

      ctx.restore();
    }

    // "Approaching Best!" indicator when within 100m of high score
    if (gameStarted && !isGameOver) {
      const diff = state.difficulty || 'medium';
      const best = highScores[diff] || 0;
      if (best > 0 && state.currentScore >= best - 100 && state.currentScore < best) {
        ctx.save();
        const abPulse = 0.7 + Math.sin(Date.now() / 150) * 0.3;
        ctx.globalAlpha = abPulse;
        ctx.font = `bold ${Math.round(14 * ts)}px Orbitron, Arial`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffd700';
        ctx.fillText('APPROACHING BEST!', width / 2, hudFlowY);
        ctx.shadowBlur = 0;
        ctx.restore();
        hudFlowY += 18;
      } else if (best > 0 && state.currentScore >= best && !state.newBestScore) {
        state.newBestScore = true;
        // Fire a celebration
        state.shakeIntensity = Math.max(state.shakeIntensity, 6);
      }
    }

    // Draw combo indicator — bold outline with pulsing glow and timer bar
    if (state.combo >= 2 && state.comboTimer > 0 && gameStarted && !isGameOver) {
      ctx.save();
      const comboTier = getComboLabel(state.combo);
      const comboMult = getComboMultiplier(state.combo);
      const comboSize = Math.min(20 + state.combo * 2, 40) * ts;
      const comboScale = 1 + Math.sin(Date.now() / 80) * 0.08;
      const comboAlpha = Math.min(1, state.comboTimer);
      const comboColor = state.combo >= 15 ? '#ff2244' : state.combo >= 10 ? '#ff6600' : state.combo >= 5 ? '#ffaa00' : '#44ddff';
      // Position combo below previous elements, with extra padding for large font ascent
      const comboY = hudFlowY + Math.ceil(comboSize * 0.65);
      ctx.globalAlpha = comboAlpha;

      // Combo count and tier
      ctx.save();
      ctx.translate(width / 2, comboY);
      ctx.scale(comboScale, comboScale);
      ctx.font = `900 ${comboSize}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.shadowBlur = getGfx().shadowBlurMed > 0 ? Math.min(16, 12 + state.combo) : 0;
      ctx.shadowColor = comboColor;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = 4;
      const comboText = `${state.combo}x ${comboTier}`;
      ctx.strokeText(comboText, 0, 0);
      ctx.fillStyle = comboColor;
      ctx.fillText(comboText, 0, 0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.strokeText(comboText, 0, 0);
      ctx.restore();

      // Coin multiplier label
      if (comboMult > 1) {
        ctx.font = `bold ${Math.round(12 * ts)}px Orbitron, Arial`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#ffaa00';
        ctx.fillText(`coins x${comboMult}`, width / 2, comboY + 16 * ts);
        ctx.shadowBlur = 0;
      }

      // Timer bar
      const barW = 80;
      const barH = 3;
      const barX = width / 2 - barW / 2;
      const barY = comboY + 22;
      const timerPct = state.comboTimer / state.comboTimerMax;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = comboColor;
      ctx.fillRect(barX, barY, barW * timerPct, barH);

      ctx.restore();
    }

    // Draw active power-up indicators (left side)
    if (player && gameStarted && !isGameOver) {
      let puY = 30 + safeTop;
      const puConfigs = [
        { active: player.hasShield, timer: player.shieldTimer, label: 'SHIELD', color: '#44aaff' },
        { active: player.hasMagnet, timer: player.magnetTimer, label: 'MAGNET', color: '#ff44aa' },
        { active: player.hasSlowmo, timer: player.slowmoTimer, label: 'SLOW-MO', color: '#aa44ff' },
        { active: player.hasSpeedBoost, timer: player.speedBoostTimer, label: 'BOOST', color: '#ffaa00' },
      ];
      puConfigs.forEach((pu, idx) => {
        if (pu.active) {
          ctx.save();
          ctx.fillStyle = pu.color;
          ctx.globalAlpha = 0.8;
          ctx.fillRect(10, puY, 90, 22);

          // Draw canvas icon instead of emoji
          ctx.globalAlpha = 1;
          const ix = 22, iy = puY + 11;
          ctx.strokeStyle = '#ffffff';
          ctx.fillStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          if (idx === 0) {
            // Shield icon — circle with cross
            ctx.beginPath();
            ctx.arc(ix, iy, 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ix, iy - 4); ctx.lineTo(ix, iy + 4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ix - 4, iy); ctx.lineTo(ix + 4, iy); ctx.stroke();
          } else if (idx === 1) {
            // Magnet icon — U shape
            ctx.beginPath();
            ctx.arc(ix, iy - 1, 5, 0, Math.PI);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ix - 5, iy - 1); ctx.lineTo(ix - 5, iy + 5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(ix + 5, iy - 1); ctx.lineTo(ix + 5, iy + 5); ctx.stroke();
          } else if (idx === 2) {
            // Slowmo icon — hourglass
            ctx.beginPath();
            ctx.moveTo(ix - 4, iy - 5); ctx.lineTo(ix + 4, iy - 5);
            ctx.lineTo(ix, iy); ctx.lineTo(ix + 4, iy + 5);
            ctx.lineTo(ix - 4, iy + 5); ctx.lineTo(ix, iy);
            ctx.closePath(); ctx.stroke();
          } else {
            // Boost icon — lightning bolt
            ctx.beginPath();
            ctx.moveTo(ix + 1, iy - 6); ctx.lineTo(ix - 3, iy + 1);
            ctx.lineTo(ix, iy); ctx.lineTo(ix - 1, iy + 6);
            ctx.lineTo(ix + 3, iy - 1); ctx.lineTo(ix, iy);
            ctx.closePath(); ctx.fill();
          }

          ctx.font = `bold ${Math.round(11 * ts)}px Orbitron, Arial`;
          ctx.textAlign = 'left';
          ctx.fillText(`${Math.ceil(pu.timer)}s`, 32 * ts, puY + 16 * ts);
          ctx.restore();
          puY += 28;
        }
      });
    }

    // Draw first-run hint overlay (hide when milestone text is showing to avoid overlap)
    if (state.hints && state.hints.active && gameStarted && !isGameOver && !(state.milestoneTextTimer > 0)) {
      const hint = state.hints.active;
      const hAlpha = Math.min(1, hint.timer, hint.maxTimer - hint.timer + 0.3) * 0.95;
      ctx.save();
      ctx.globalAlpha = hAlpha;

      // Background pill
      const hintW = Math.min(280, width - 40);
      const hintH = hint.subtext ? 52 : 36;
      const hintX = width / 2 - hintW / 2;
      const hintY = height * 0.38 - hintH / 2;
      ctx.fillStyle = 'rgba(10, 8, 24, 0.85)';
      ctx.beginPath();
      ctx.roundRect(hintX, hintY, hintW, hintH, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(147, 112, 219, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Main text
      ctx.font = `bold ${Math.round(14 * ts)}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(hint.text, width / 2, hintY + (hint.subtext ? 22 : 24));

      // Subtext
      if (hint.subtext) {
        ctx.font = `${Math.round(10 * ts)}px Orbitron, Arial`;
        ctx.fillStyle = 'rgba(200, 180, 255, 0.8)';
        ctx.fillText(hint.subtext, width / 2, hintY + 42);
      }

      ctx.restore();
    }

    // Draw mute toggle button (top right)
    ctx.save();
    const btnX = width - 70;
    const btnY = 20 + safeTop;
    const muted = isMutedRef.current;
    ctx.fillStyle = muted ? 'rgba(100, 100, 100, 0.8)' : 'rgba(147, 112, 219, 0.8)';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, 50, 50, 8);
    ctx.fill();
    ctx.strokeStyle = muted ? '#666666' : '#bb88ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Speaker icon
    const sx = btnX + 16;
    const sy = btnY + 25;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(sx, sy - 5);
    ctx.lineTo(sx + 8, sy - 5);
    ctx.lineTo(sx + 15, sy - 12);
    ctx.lineTo(sx + 15, sy + 12);
    ctx.lineTo(sx + 8, sy + 5);
    ctx.lineTo(sx, sy + 5);
    ctx.closePath();
    ctx.fill();

    if (!muted) {
      // Sound waves
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx + 18, sy, 6, -0.6, 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx + 18, sy, 11, -0.7, 0.7);
      ctx.stroke();
    } else {
      // Red X for muted
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx + 20, sy - 8);
      ctx.lineTo(sx + 32, sy + 8);
      ctx.moveTo(sx + 32, sy - 8);
      ctx.lineTo(sx + 20, sy + 8);
      ctx.stroke();
    }
    ctx.restore();

    // Draw pause button (top right, left of music button)
    if (gameStarted && !isGameOver) {
      ctx.save();
      ctx.fillStyle = isPausedRef.current ? 'rgba(77, 204, 255, 0.8)' : 'rgba(100, 100, 100, 0.8)';
      ctx.fillRect(width - 130, 20 + safeTop, 50, 50);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(width - 130, 20 + safeTop, 50, 50);

      // Draw pause/play icon
      ctx.fillStyle = '#ffffff';
      if (isPausedRef.current) {
        // Play triangle
        ctx.beginPath();
        ctx.moveTo(width - 118, 32 + safeTop);
        ctx.lineTo(width - 118, 58 + safeTop);
        ctx.lineTo(width - 94, 45 + safeTop);
        ctx.closePath();
        ctx.fill();
      } else {
        // Pause bars
        ctx.fillRect(width - 120, 32 + safeTop, 8, 26);
        ctx.fillRect(width - 104, 32 + safeTop, 8, 26);
      }
      ctx.restore();
    }

    // Draw pause overlay
    if (isPausedRef.current) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      const pauseTs2 = Math.max(1, width / 390);
      const pauseSmall = width < 420;
      const pauseFontSize = pauseSmall ? Math.max(36, Math.floor(width * 0.1)) : Math.round(52 * pauseTs2);
      ctx.font = `900 ${pauseFontSize}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#1a3366';
      ctx.lineWidth = 5;
      ctx.strokeText('PAUSED', width / 2, height / 2);
      const pauseGrad = ctx.createLinearGradient(width / 2 - 100, height / 2 - 25, width / 2 + 100, height / 2 + 10);
      pauseGrad.addColorStop(0, '#44ccff');
      pauseGrad.addColorStop(0.5, '#ffffff');
      pauseGrad.addColorStop(1, '#44ccff');
      ctx.fillStyle = pauseGrad;
      ctx.fillText('PAUSED', width / 2, height / 2);
      ctx.restore();

      // Resume button
      const pBtnW = Math.min(Math.round(200 * pauseTs2), width - 40);
      const pBtnH = Math.max(44, Math.round(50 * pauseTs2 * (height < 600 ? height / 700 : 1)));
      const resumeBtnX = width / 2 - pBtnW / 2;
      const resumeBtnY = height / 2 + Math.round(40 * pauseTs2);
      ctx.fillStyle = 'rgba(30, 100, 160, 0.9)';
      ctx.fillRect(resumeBtnX, resumeBtnY, pBtnW, pBtnH);
      ctx.strokeStyle = '#4dccff';
      ctx.lineWidth = 2;
      ctx.strokeRect(resumeBtnX, resumeBtnY, pBtnW, pBtnH);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(20 * pauseTs2)}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('RESUME', width / 2, resumeBtnY + pBtnH / 2 + 7);
      gameStateRef.current._resumeBtnBounds = { x: resumeBtnX, y: resumeBtnY, w: pBtnW, h: pBtnH };

      // Main Menu button
      const menuBtnX = width / 2 - pBtnW / 2;
      const menuBtnY = resumeBtnY + pBtnH + Math.round(12 * pauseTs2);
      ctx.fillStyle = 'rgba(60, 40, 100, 0.9)';
      ctx.fillRect(menuBtnX, menuBtnY, pBtnW, pBtnH);
      ctx.strokeStyle = '#9966cc';
      ctx.lineWidth = 2;
      ctx.strokeRect(menuBtnX, menuBtnY, pBtnW, pBtnH);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(18 * pauseTs2)}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('MAIN MENU', width / 2, menuBtnY + pBtnH / 2 + 6);
      ctx.restore();
    }

    // Draw revive prompt
    if (state.pendingRevive) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, 0, width, height);

      // Draw feather particles on revive screen (2x offscreen for sharpness)
      state.explosionParticles.forEach(particle => {
        if (!particle.isFeather) return;
        const screenY = particle.y - state.cameraY;
        const alpha = Math.min(particle.life, 1.0);
        const s = particle.featherSize;
        const fScale = 2;
        const fLogSize = Math.ceil(s * 2) + 4;
        const fOffW = fLogSize * fScale;
        if (!particle._fCanvas) particle._fCanvas = document.createElement('canvas');
        const fc = particle._fCanvas;
        if (fc.width !== fOffW || fc.height !== fOffW) { fc.width = fOffW; fc.height = fOffW; }
        const f = fc.getContext('2d');
        f.clearRect(0, 0, fOffW, fOffW);
        f.save();
        f.translate(fOffW / 2, fOffW / 2);
        f.scale(fScale, fScale);
        f.strokeStyle = particle.featherColor;
        f.lineWidth = 1.5;
        f.beginPath();
        f.moveTo(0, -s); f.lineTo(0, s); f.stroke();
        f.fillStyle = particle.featherColor;
        f.beginPath();
        f.moveTo(0, -s);
        f.quadraticCurveTo(-s * 0.7, -s * 0.3, -s * 0.4, s * 0.2);
        f.quadraticCurveTo(-s * 0.2, s * 0.6, 0, s);
        f.fill();
        f.globalAlpha = 0.8;
        f.beginPath();
        f.moveTo(0, -s);
        f.quadraticCurveTo(s * 0.5, -s * 0.2, s * 0.3, s * 0.3);
        f.quadraticCurveTo(s * 0.15, s * 0.65, 0, s);
        f.fill();
        f.restore();
        const fHalf = fLogSize / 2;
        ctx.save();
        ctx.translate(particle.x, screenY);
        ctx.rotate(particle.featherRotation);
        ctx.globalAlpha = alpha;
        ctx.drawImage(fc, -fHalf, -fHalf, fLogSize, fLogSize);
        ctx.restore();
      });

      const rvTs = Math.max(1, width / 390);
      ctx.font = `900 ${Math.round(32 * rvTs)}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('SECOND CHANCE?', width / 2, height / 2 - Math.round(110 * rvTs));

      // Show wallet balance (below title, above ring)
      ctx.font = `bold ${Math.round(14 * rvTs)}px Orbitron, Arial`;
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'center';
      ctx.fillText(`Your coins: ${totalCoinsRef.current}`, width / 2, height / 2 - Math.round(80 * rvTs));

      // Countdown ring
      const ringX = width / 2;
      const ringY = height / 2 - 38;
      const ringR = 28;
      const timerPct = Math.max(0, state.reviveTimer / 5.0);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = timerPct > 0.3 ? '#44ff88' : '#ff4444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ringX, ringY, ringR, -Math.PI / 2, -Math.PI / 2 + timerPct * Math.PI * 2);
      ctx.stroke();

      ctx.font = `bold ${Math.round(22 * rvTs)}px Orbitron, Arial`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(Math.ceil(state.reviveTimer), ringX, ringY + 8);

      // Revive button
      const revBtnW = Math.round(180 * rvTs);
      const revBtnH = Math.round(50 * rvTs);
      const revBtnX = width / 2 - revBtnW / 2;
      const revBtnY = height / 2 + 12;
      const btnPulse = 0.96 + Math.sin(Date.now() / 150) * 0.04;

      ctx.save();
      ctx.translate(width / 2, revBtnY + revBtnH / 2);
      ctx.scale(btnPulse, btnPulse);
      ctx.translate(-width / 2, -(revBtnY + revBtnH / 2));

      ctx.fillStyle = '#22aa44';
      ctx.fillRect(revBtnX, revBtnY, revBtnW, revBtnH);
      ctx.strokeStyle = '#44ff88';
      ctx.lineWidth = 2;
      ctx.strokeRect(revBtnX, revBtnY, revBtnW, revBtnH);

      ctx.font = `bold ${Math.round(20 * rvTs)}px Orbitron, Arial`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('REVIVE', width / 2, revBtnY + Math.round(23 * rvTs));
      ctx.font = `bold ${Math.round(13 * rvTs)}px Orbitron, Arial`;
      ctx.fillStyle = '#aaffcc';
      ctx.fillText(`Cost: ${state.reviveCost} coins`, width / 2, revBtnY + Math.round(42 * rvTs));
      ctx.restore();

      ctx.font = `${Math.round(15 * rvTs)}px Orbitron, Arial`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('TAP ELSEWHERE TO SKIP', width / 2, height / 2 + Math.round(100 * rvTs));

      state._reviveBtnBounds = { x: revBtnX, y: revBtnY, w: revBtnW, h: revBtnH };

      // Draw dying bird on revive screen — stays in place with X eyes + stars
      if (state.player && state.player.isDying) {
        const p = state.player;
        const screenY = p.y - state.cameraY;
        const t = p.deathTime;
        const tilt = Math.sin(t * 3) * 0.15;

        // Draw bird in place using its canvas draw method
        const savedRot = p.rotation;
        p.rotation = tilt;
        p.draw(ctx, state.cameraY, state.gfxLevel || 'medium');
        p.rotation = savedRot;

        // Stars circling above the head (X eyes are drawn by the bird's face method)
        ctx.save();
        ctx.translate(p.x, screenY);
        ctx.rotate(tilt);
        const starOrbitR = 14;
        const starTopY = -22;
        const dizzyAngle = t * 4;
        for (let s = 0; s < 3; s++) {
          const starAngle = dizzyAngle + (s * Math.PI * 2) / 3;
          const sx = Math.cos(starAngle) * starOrbitR;
          const sy = starTopY + Math.sin(starAngle * 0.5) * 3;
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          const sr = 3;
          for (let i = 0; i < 10; i++) {
            const a = (i * Math.PI) / 5 - Math.PI / 2;
            const r = i % 2 === 0 ? sr : sr * 0.4;
            if (i === 0) ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
            else ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore();
    }

    // Draw game over screen
    if (isGameOver) {
      ctx.save();

      // Semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, width, height);

      // Responsive layout — scale spacing for short screens
      const goSmall = width < 420;
      const goShort = height < 600;
      const safeBot = gameStateRef.current.safeBottom || 0;
      const goScale = goShort ? height / 700 : Math.min(2, Math.max(1, width / 390));
      const goGap = Math.round(40 * goScale);
      const goLineGap = Math.round(10 * goScale);    // extra breathing room between stat lines
      const cx = width / 2;

      // Estimate total content height to vertically center everything
      const goBtnW_est = Math.min(200, width - 40);
      const goBtnH_est = Math.round(Math.max(44, 50 * goScale));
      const goBtnGap_est = Math.round(12 * goScale);
      const hasNewBest = gameStateRef.current.newBestScore;
      const hasCombo = gameStateRef.current.maxCombo >= 2;
      const hasMissionReward = gameStateRef.current.missionRewardsThisRun > 0;
      const hasStreakBonus = gameStateRef.current.streakBonusThisRun > 0;
      const goDiff_est = gameStateRef.current.difficulty || 'medium';
      const goBest_est = highScores[goDiff_est] || 0;
      const rs_est = gameStateRef.current.runStats;
      const hasStats = rs_est && (rs_est.wallBounces > 0 || rs_est.nearMisses > 0 || rs_est.guardiansDefeated > 0);
      const totalGoH = Math.round(52 * goScale)      // GAME OVER title
        + goGap
        + (hasNewBest ? Math.round(28 * goScale) : 0)
        + Math.round(36 * goScale)                    // distance
        + Math.round(34 * goScale)                    // coins
        + (hasCombo ? Math.round(30 * goScale) : 0)
        + (hasStats ? Math.round(24 * goScale) : 0)   // run stats line
        + (hasMissionReward ? Math.round(26 * goScale) : 0)
        + (hasStreakBonus ? Math.round(26 * goScale) : 0)
        + (goBest_est > 0 ? Math.round(32 * goScale) : 0)
        + goGap
        + goBtnH_est + goBtnGap_est                   // restart button
        + goBtnH_est + goBtnGap_est                   // menu button
        + Math.round(goBtnH_est * 0.8);               // share button
      const availGoH = height - safeBot - (gameStateRef.current.safeTop || 0);
      const goOffset = Math.max(60, (availGoH - totalGoH) / 2 + (gameStateRef.current.safeTop || 0));
      let goY = goOffset;

      // Game Over text — red gradient, no shadowBlur for clean iOS rendering
      ctx.save();
      const goFontSize = goSmall ? Math.max(30, Math.floor(width * 0.085)) : Math.round(52 * goScale);
      ctx.font = `900 ${goFontSize}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#660022';
      ctx.lineWidth = 5;
      ctx.strokeText('GAME OVER', cx, goY);
      const goGrad = ctx.createLinearGradient(cx - 140, goY - 25, cx + 140, goY + 10);
      goGrad.addColorStop(0, '#ff4466');
      goGrad.addColorStop(0.5, '#ffffff');
      goGrad.addColorStop(1, '#ff4466');
      ctx.fillStyle = goGrad;
      ctx.fillText('GAME OVER', cx, goY);
      ctx.restore();
      goY += goGap;

      // NEW BEST badge
      if (gameStateRef.current.newBestScore) {
        ctx.save();
        const nbPulse = 0.9 + Math.sin(Date.now() / 120) * 0.1;
        ctx.font = `900 ${Math.floor(20 * nbPulse * goScale)}px Orbitron, Arial`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.fillText('NEW BEST!', cx, goY);
        ctx.restore();
        goY += Math.round(28 * goScale);
      }

      // Final score
      ctx.save();
      ctx.font = `bold ${Math.round(28 * goScale)}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Distance: ${score}m`, cx, goY);
      ctx.restore();
      goY += Math.round(36 * goScale);

      // Coins earned
      ctx.textAlign = 'center';
      ctx.font = `${Math.round(22 * goScale)}px Orbitron, Arial`;
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`Coins: +${gameStateRef.current.currentCoinScore}`, cx, goY);
      goY += Math.round(34 * goScale);

      // Max combo
      if (gameStateRef.current.maxCombo >= 2) {
        ctx.fillStyle = '#44ddff';
        ctx.font = `${Math.round(20 * goScale)}px Orbitron, Arial`;
        ctx.fillText(`Best Combo: ${gameStateRef.current.maxCombo}x`, cx, goY);
        goY += Math.round(30 * goScale);
      }

      // Run stats summary
      const rs = gameStateRef.current.runStats;
      if (rs && (rs.wallBounces > 0 || rs.nearMisses > 0 || rs.guardiansDefeated > 0)) {
        ctx.font = `${Math.round(12 * goScale)}px Orbitron, Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        const statsLine = [
          rs.wallBounces > 0 ? `${rs.wallBounces} bounces` : null,
          rs.nearMisses > 0 ? `${rs.nearMisses} near-misses` : null,
          rs.guardiansDefeated > 0 ? `${rs.guardiansDefeated} guardians` : null,
        ].filter(Boolean).join('  |  ');
        ctx.fillText(statsLine, cx, goY);
        goY += Math.round(24 * goScale);
      }

      // Mission & streak rewards
      if (gameStateRef.current.missionRewardsThisRun > 0) {
        ctx.font = `${Math.round(14 * goScale)}px Orbitron, Arial`;
        ctx.fillStyle = '#44ff88';
        ctx.textAlign = 'center';
        ctx.fillText(`+${gameStateRef.current.missionRewardsThisRun} mission bonus`, cx, goY);
        goY += Math.round(26 * goScale);
      }
      if (gameStateRef.current.streakBonusThisRun > 0) {
        ctx.font = `${Math.round(14 * goScale)}px Orbitron, Arial`;
        ctx.fillStyle = '#ffaa44';
        ctx.textAlign = 'center';
        const streakDays = progressionRef.current ? progressionRef.current.getStreak() : 0;
        ctx.fillText(`+${gameStateRef.current.streakBonusThisRun} streak bonus (day ${streakDays})`, cx, goY);
        goY += Math.round(26 * goScale);
      }

      // High score for current difficulty
      const goDiff = gameStateRef.current.difficulty || 'medium';
      const goBest = highScores[goDiff] || 0;
      if (goBest > 0) {
        ctx.font = `${Math.round(20 * goScale)}px Orbitron, Arial`;
        ctx.fillStyle = '#4dccff';
        ctx.fillText(`Best (${goDiff.toUpperCase()}): ${goBest}m`, cx, goY);
      }

      // Buttons — flow after stats content
      goY += goGap;
      const goBtnW = Math.min(200, width - 40);
      const goBtnH = Math.round(Math.max(44, 50 * goScale));
      const goBtnGap = Math.round(12 * goScale);
      const goRestartY = goY;
      const goMenuY = goRestartY + goBtnH + goBtnGap;
      const goRestartX = cx - goBtnW / 2;

      // Restart button
      const timeSinceGO = gameOverTimeRef.current ? Date.now() - gameOverTimeRef.current : 0;
      const restartReady = timeSinceGO >= 1500;
      if (restartReady) {
        const time = Date.now() / 1000;
        const btnPulse = 0.97 + Math.sin(time * 3) * 0.03;
        ctx.save();
        ctx.translate(cx, goRestartY + goBtnH / 2);
        ctx.scale(btnPulse, btnPulse);
        ctx.translate(-cx, -(goRestartY + goBtnH / 2));
        ctx.fillStyle = 'rgba(30, 100, 160, 0.9)';
        ctx.fillRect(goRestartX, goRestartY, goBtnW, goBtnH);
        ctx.strokeStyle = '#4dccff';
        ctx.lineWidth = 2;
        ctx.strokeRect(goRestartX, goRestartY, goBtnW, goBtnH);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(18 * goScale)}px Orbitron, Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('RESTART', cx, goRestartY + goBtnH / 2 + 7);
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(40, 40, 60, 0.7)';
        ctx.fillRect(goRestartX, goRestartY, goBtnW, goBtnH);
        ctx.strokeStyle = 'rgba(77, 204, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(goRestartX, goRestartY, goBtnW, goBtnH);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = `bold ${Math.round(16 * goScale)}px Orbitron, Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(`RESTART (${Math.ceil((1500 - timeSinceGO) / 1000)}s)`, cx, goRestartY + goBtnH / 2 + 6);
      }
      gameStateRef.current._restartBtnBounds = { x: goRestartX, y: goRestartY, w: goBtnW, h: goBtnH };

      // Main Menu button
      const goMenuX = cx - goBtnW / 2;
      ctx.fillStyle = 'rgba(60, 40, 100, 0.9)';
      ctx.fillRect(goMenuX, goMenuY, goBtnW, goBtnH);
      ctx.strokeStyle = '#9966cc';
      ctx.lineWidth = 2;
      ctx.strokeRect(goMenuX, goMenuY, goBtnW, goBtnH);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(16 * goScale)}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 1;
      ctx.fillText('MAIN MENU', cx, goMenuY + goBtnH / 2 + 6);
      gameStateRef.current._goMenuBtnBounds = { x: goMenuX, y: goMenuY, w: goBtnW, h: goBtnH };

      // Share Score button
      const goShareY = goMenuY + goBtnH + goBtnGap;
      const goShareX = cx - goBtnW / 2;
      ctx.fillStyle = 'rgba(40, 120, 80, 0.9)';
      ctx.fillRect(goShareX, goShareY, goBtnW, Math.round(goBtnH * 0.8));
      ctx.strokeStyle = '#44ff88';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(goShareX, goShareY, goBtnW, Math.round(goBtnH * 0.8));
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(14 * goScale)}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('SHARE SCORE', cx, goShareY + Math.round(goBtnH * 0.4) + 5);
      gameStateRef.current._shareBtnBounds = { x: goShareX, y: goShareY, w: goBtnW, h: Math.round(goBtnH * 0.8) };

      // Leaderboard button (Game Center)
      if (isGCAuthenticated()) {
        const goLbY = goShareY + Math.round(goBtnH * 0.8) + goBtnGap;
        const goLbX = cx - goBtnW / 2;
        const goLbH = Math.round(goBtnH * 0.8);
        ctx.fillStyle = 'rgba(40, 80, 140, 0.9)';
        ctx.fillRect(goLbX, goLbY, goBtnW, goLbH);
        ctx.strokeStyle = '#4488ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(goLbX, goLbY, goBtnW, goLbH);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(14 * goScale)}px Orbitron, Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('LEADERBOARD', cx, goLbY + goLbH / 2 + 5);
        gameStateRef.current._leaderboardBtnBounds = { x: goLbX, y: goLbY, w: goBtnW, h: goLbH };
      }

      ctx.restore();

      // Draw feather particles ON TOP of game over overlay (2x offscreen for sharpness)
      const state = gameStateRef.current;
      state.explosionParticles.forEach(particle => {
        if (!particle.isFeather) return;
        const screenY = particle.y - state.cameraY;
        const alpha = Math.min(particle.life, 1.0);
        const s = particle.featherSize;
        const fScale = 2;
        const fLogSize = Math.ceil(s * 2) + 4;
        const fOffW = fLogSize * fScale;
        if (!particle._fCanvas) particle._fCanvas = document.createElement('canvas');
        const fc = particle._fCanvas;
        if (fc.width !== fOffW || fc.height !== fOffW) { fc.width = fOffW; fc.height = fOffW; }
        const f = fc.getContext('2d');
        f.clearRect(0, 0, fOffW, fOffW);
        f.save();
        f.translate(fOffW / 2, fOffW / 2);
        f.scale(fScale, fScale);
        // Feather shaft
        f.strokeStyle = particle.featherColor;
        f.lineWidth = 1.5;
        f.beginPath();
        f.moveTo(0, -s); f.lineTo(0, s); f.stroke();
        // Left vane
        f.fillStyle = particle.featherColor;
        f.beginPath();
        f.moveTo(0, -s);
        f.quadraticCurveTo(-s * 0.7, -s * 0.3, -s * 0.4, s * 0.2);
        f.quadraticCurveTo(-s * 0.2, s * 0.6, 0, s);
        f.fill();
        // Right vane
        f.globalAlpha = 0.8;
        f.fillStyle = particle.featherColor;
        f.beginPath();
        f.moveTo(0, -s);
        f.quadraticCurveTo(s * 0.5, -s * 0.2, s * 0.3, s * 0.3);
        f.quadraticCurveTo(s * 0.15, s * 0.65, 0, s);
        f.fill();
        f.restore();
        const fHalf = fLogSize / 2;
        ctx.save();
        ctx.translate(particle.x, screenY);
        ctx.rotate(particle.featherRotation);
        ctx.globalAlpha = alpha;
        ctx.drawImage(fc, -fHalf, -fHalf, fLogSize, fLogSize);
        ctx.restore();
      });

      // Draw dying bird on game over overlay — stays in place with X eyes + stars
      if (state.player && state.player.isDying) {
        const p = state.player;
        const screenY = p.y - state.cameraY;
        const t = p.deathTime;
        const tilt2 = Math.sin(t * 3) * 0.15;

        // Draw bird in place
        const savedRot2 = p.rotation;
        p.rotation = tilt2;
        p.draw(ctx, state.cameraY, state.gfxLevel || 'medium');
        p.rotation = savedRot2;

        // Stars circling above head (X eyes are drawn by the bird's face method)
        ctx.save();
        ctx.translate(p.x, screenY);
        ctx.rotate(tilt2);
        const starOrbitR2 = 14;
        const starYPos = -22;
        const dizzyAngle2 = t * 4;
        for (let s = 0; s < 3; s++) {
          const starAngle = dizzyAngle2 + (s * Math.PI * 2) / 3;
          const sx = Math.cos(starAngle) * starOrbitR2;
          const sy = starYPos + Math.sin(starAngle * 0.5) * 3;
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          const sr = 3;
          for (let i = 0; i < 10; i++) {
            const a = (i * Math.PI) / 5 - Math.PI / 2;
            const r = i % 2 === 0 ? sr : sr * 0.4;
            if (i === 0) ctx.moveTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
            else ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Draw start menu
    if (!gameStarted && !isGameOver) {
      ctx.save();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, width, height);

      if (showShopRef.current) {
        // === SHOP UI ===
        const shopSafeBot = gameStateRef.current.safeBottom || 0;
        const footerH = 80 + shopSafeBot;
        const headerH = 140; // taller to fit tabs
        const activeTab = shopTabRef.current;

        // --- Tab-dependent content ---
        const shopSmall = width < 380;
        const cols = shopSmall ? 1 : 2;
        const cardGap = shopSmall ? 10 : 15;
        const now = Date.now();

        if (activeTab === 'skins') {
          const skinKeys = Object.keys(BirdSkins);
          const cardW = shopSmall ? Math.min(width - 40, 200) : 160;
          const cardH = 80;
          const startXSk = width / 2 - (cols * cardW + (cols - 1) * cardGap) / 2;
          const gridStartY = headerH;
          const totalRows = Math.ceil(skinKeys.length / cols);
          const totalGridH = totalRows * (cardH + 12);
          const visibleH = height - headerH - footerH;
          const maxScroll = Math.max(0, totalGridH - visibleH + 10);
          if (shopScrollRef.current > maxScroll) shopScrollRef.current = maxScroll;
          if (shopScrollRef.current < 0) shopScrollRef.current = 0;
          const scrollY = shopScrollRef.current;

          ctx.save();
          ctx.beginPath();
          ctx.rect(0, headerH, width, visibleH);
          ctx.clip();

          skinKeys.forEach((key, idx) => {
            const skin = BirdSkins[key];
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const cx = startXSk + col * (cardW + cardGap);
            const cy = gridStartY + row * (cardH + 12) - scrollY;
            if (cy + cardH < headerH || cy > height - footerH) { skin._shopBounds = null; return; }
            const isUnlocked = unlockedSkins.includes(key);
            const isSelected = selectedSkinRef.current === key;
            const isPremium = skin.premium;

            ctx.save();
            if (isPremium && !isSelected) {
              const shimH = (now / 20 + idx * 40) % 360;
              ctx.fillStyle = 'rgba(30, 20, 50, 0.9)';
              ctx.fillRect(cx, cy, cardW, cardH);
              ctx.strokeStyle = `hsl(${shimH}, 70%, 55%)`;
              ctx.lineWidth = 2;
              ctx.shadowBlur = 6;
              ctx.shadowColor = `hsl(${shimH}, 70%, 55%)`;
              ctx.strokeRect(cx, cy, cardW, cardH);
            } else {
              ctx.fillStyle = isSelected ? 'rgba(147, 112, 219, 0.5)' : 'rgba(40, 30, 60, 0.8)';
              ctx.fillRect(cx, cy, cardW, cardH);
              ctx.strokeStyle = isSelected ? '#ba55d3' : isUnlocked ? '#555577' : '#333344';
              ctx.lineWidth = isSelected ? 3 : 1;
              if (isSelected) { ctx.shadowBlur = 8; ctx.shadowColor = '#ba55d3'; }
              ctx.strokeRect(cx, cy, cardW, cardH);
            }
            ctx.shadowBlur = 0;
            ctx.restore();

            ctx.save();
            Player.drawPreview(ctx, cx + 30, cy + cardH / 2 + 2, skin, now, key);
            ctx.restore();

            if (isPremium) {
              ctx.save();
              ctx.font = 'bold 9px Orbitron, Arial';
              ctx.textAlign = 'center';
              ctx.fillStyle = '#ffaa00';
              ctx.shadowBlur = 4;
              ctx.shadowColor = '#ffaa00';
              ctx.fillText('PREMIUM', cx + 30, cy + 12);
              ctx.shadowBlur = 0;
              ctx.restore();
            }

            ctx.save();
            ctx.font = 'bold 13px Orbitron, Arial';
            ctx.textAlign = 'left';
            ctx.shadowBlur = 4;
            ctx.shadowColor = isSelected ? '#ba55d3' : '#444466';
            ctx.fillStyle = isPremium ? '#ffdd88' : '#ffffff';
            ctx.fillText(skin.name, cx + 55, cy + 30);
            ctx.restore();

            ctx.save();
            ctx.font = 'bold 11px Orbitron, Arial';
            ctx.textAlign = 'left';
            if (isSelected) {
              ctx.shadowBlur = 6; ctx.shadowColor = '#44ff88';
              ctx.fillStyle = '#44ff88';
              ctx.fillText('EQUIPPED', cx + 55, cy + 50);
            } else if (isUnlocked) {
              ctx.fillStyle = '#bbbbcc';
              ctx.fillText('TAP TO EQUIP', cx + 55, cy + 50);
            } else if (totalCoinsRef.current >= skin.cost) {
              ctx.shadowBlur = 6; ctx.shadowColor = '#44ff88';
              ctx.fillStyle = '#44ff88';
              ctx.fillText(`${skin.cost} coins`, cx + 55, cy + 50);
            } else {
              ctx.shadowBlur = 4; ctx.shadowColor = '#ff4444';
              ctx.fillStyle = '#ff6666';
              ctx.fillText(`${skin.cost} coins`, cx + 55, cy + 50);
            }
            ctx.restore();

            skin._shopBounds = { x: cx, y: cy, w: cardW, h: cardH, key };
          });

          ctx.restore(); // end scroll clip

          if (maxScroll > 0) {
            if (scrollY < maxScroll - 5) {
              const fg = ctx.createLinearGradient(0, height - footerH - 30, 0, height - footerH);
              fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,0.7)');
              ctx.fillStyle = fg; ctx.fillRect(0, height - footerH - 30, width, 30);
            }
            if (scrollY > 5) {
              const fg = ctx.createLinearGradient(0, headerH, 0, headerH + 30);
              fg.addColorStop(0, 'rgba(0,0,0,0.7)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = fg; ctx.fillRect(0, headerH, width, 30);
            }
          }
        } else {
          // === TRAILS TAB ===
          const trailKeys = Object.keys(Trails);
          const cardW = shopSmall ? Math.min(width - 40, 280) : Math.min(width - 30, 340);
          const cardH = 72;
          const tCols = 1;
          const gridStartY = headerH;
          const totalRows = trailKeys.length;
          const totalGridH = totalRows * (cardH + 10);
          const visibleH = height - headerH - footerH;
          const maxScroll = Math.max(0, totalGridH - visibleH + 10);
          if (shopScrollRef.current > maxScroll) shopScrollRef.current = maxScroll;
          if (shopScrollRef.current < 0) shopScrollRef.current = 0;
          const scrollY = shopScrollRef.current;

          ctx.save();
          ctx.beginPath();
          ctx.rect(0, headerH, width, visibleH);
          ctx.clip();

          trailKeys.forEach((key, idx) => {
            const trail = Trails[key];
            const cx = width / 2 - cardW / 2;
            const cy = gridStartY + idx * (cardH + 10) - scrollY;
            if (cy + cardH < headerH || cy > height - footerH) { trail._shopBounds = null; return; }

            const isOwned = unlockedTrails.includes(key);
            const isEquipped = selectedTrailRef.current === key;
            const isPremium = trail.premium;

            // Card bg
            ctx.save();
            if (isPremium && !isEquipped) {
              const shimH = (now / 20 + idx * 50) % 360;
              ctx.fillStyle = 'rgba(30, 20, 50, 0.9)';
              ctx.fillRect(cx, cy, cardW, cardH);
              ctx.strokeStyle = `hsl(${shimH}, 70%, 55%)`;
              ctx.lineWidth = 2;
              ctx.shadowBlur = 6;
              ctx.shadowColor = `hsl(${shimH}, 70%, 55%)`;
              ctx.strokeRect(cx, cy, cardW, cardH);
            } else {
              ctx.fillStyle = isEquipped ? 'rgba(147, 112, 219, 0.5)' : 'rgba(40, 30, 60, 0.8)';
              ctx.fillRect(cx, cy, cardW, cardH);
              ctx.strokeStyle = isEquipped ? '#ba55d3' : isOwned ? '#555577' : '#333344';
              ctx.lineWidth = isEquipped ? 3 : 1;
              if (isEquipped) { ctx.shadowBlur = 8; ctx.shadowColor = '#ba55d3'; }
              ctx.strokeRect(cx, cy, cardW, cardH);
            }
            ctx.shadowBlur = 0;
            ctx.restore();

            // Trail preview — color swatches
            const previewX = cx + 12;
            const previewY = cy + cardH / 2;
            const colors = trail.colors && trail.colors.length > 0 ? trail.colors : ['#888888'];
            if (trail.type === 'default') {
              ctx.fillStyle = '#666688';
              ctx.fillRect(previewX, previewY - 10, 36, 20);
              ctx.font = 'bold 10px Orbitron, Arial';
              ctx.textAlign = 'center';
              ctx.fillStyle = '#aaaacc';
              ctx.fillText('---', previewX + 18, previewY + 4);
            } else {
              // Animated color dots
              for (let ci = 0; ci < Math.min(colors.length, 4); ci++) {
                const dotX = previewX + 6 + ci * 9;
                const dotY = previewY - 4 + Math.sin(now / 300 + ci) * 3;
                ctx.beginPath();
                ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
                ctx.fillStyle = colors[ci];
                ctx.fill();
              }
              // Small label for type
              ctx.save();
              ctx.font = '8px Orbitron, Arial';
              ctx.textAlign = 'center';
              ctx.fillStyle = 'rgba(255,255,255,0.35)';
              ctx.fillText(trail.type.toUpperCase(), previewX + 18, previewY + 14);
              ctx.restore();
            }

            // Premium badge
            if (isPremium) {
              ctx.save();
              ctx.font = 'bold 8px Orbitron, Arial';
              ctx.textAlign = 'left';
              ctx.fillStyle = '#ffaa00';
              ctx.shadowBlur = 4;
              ctx.shadowColor = '#ffaa00';
              ctx.fillText('PREMIUM', cx + 52, cy + 14);
              ctx.shadowBlur = 0;
              ctx.restore();
            }

            // Name
            ctx.save();
            ctx.font = 'bold 13px Orbitron, Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = isPremium ? '#ffdd88' : '#ffffff';
            ctx.fillText(trail.name, cx + 52, cy + 28);
            ctx.restore();

            // Description
            ctx.save();
            ctx.font = '10px Orbitron, Arial';
            ctx.textAlign = 'left';
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillText(trail.desc, cx + 52, cy + 42);
            ctx.restore();

            // Status / price (right side)
            ctx.save();
            ctx.font = 'bold 11px Orbitron, Arial';
            ctx.textAlign = 'right';
            if (isEquipped) {
              ctx.shadowBlur = 6; ctx.shadowColor = '#44ff88';
              ctx.fillStyle = '#44ff88';
              ctx.fillText('EQUIPPED', cx + cardW - 12, cy + 32);
            } else if (isOwned) {
              ctx.fillStyle = '#bbbbcc';
              ctx.fillText('TAP TO EQUIP', cx + cardW - 12, cy + 32);
            } else if (trail.cost === 0) {
              ctx.fillStyle = '#44ff88';
              ctx.fillText('FREE', cx + cardW - 12, cy + 32);
            } else if (totalCoinsRef.current >= trail.cost) {
              ctx.shadowBlur = 6; ctx.shadowColor = '#44ff88';
              ctx.fillStyle = '#44ff88';
              ctx.fillText(`${trail.cost} coins`, cx + cardW - 12, cy + 32);
            } else {
              ctx.shadowBlur = 4; ctx.shadowColor = '#ff4444';
              ctx.fillStyle = '#ff6666';
              ctx.fillText(`${trail.cost} coins`, cx + cardW - 12, cy + 32);
            }
            ctx.restore();

            trail._shopBounds = { x: cx, y: cy, w: cardW, h: cardH, key };
          });

          ctx.restore(); // end scroll clip

          if (maxScroll > 0) {
            if (scrollY < maxScroll - 5) {
              const fg = ctx.createLinearGradient(0, height - footerH - 30, 0, height - footerH);
              fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,0.7)');
              ctx.fillStyle = fg; ctx.fillRect(0, height - footerH - 30, width, 30);
            }
            if (scrollY > 5) {
              const fg = ctx.createLinearGradient(0, headerH, 0, headerH + 30);
              fg.addColorStop(0, 'rgba(0,0,0,0.7)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = fg; ctx.fillRect(0, headerH, width, 30);
            }
          }
        }

        // --- Header (drawn on top) ---
        ctx.fillStyle = 'rgba(18, 14, 41, 0.95)';
        ctx.fillRect(0, 0, width, headerH);

        // Title
        ctx.save();
        const shopTs = Math.max(1, width / 390);
        ctx.font = `900 ${Math.round(28 * shopTs)}px Orbitron, Arial`;
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ba55d3';
        ctx.strokeStyle = '#4a1a6a';
        ctx.lineWidth = 4;
        ctx.strokeText('SHOP', width / 2, Math.round(38 * shopTs));
        const shopGrad = ctx.createLinearGradient(width / 2 - 80, 15, width / 2 + 80, 45);
        shopGrad.addColorStop(0, '#ee88ff');
        shopGrad.addColorStop(0.5, '#ffffff');
        shopGrad.addColorStop(1, '#ee88ff');
        ctx.fillStyle = shopGrad;
        ctx.fillText('SHOP', width / 2, Math.round(38 * shopTs));
        ctx.restore();

        // Coins
        ctx.save();
        ctx.font = `bold ${Math.round(16 * shopTs)}px Orbitron, Arial`;
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffaa00';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`Coins: ${totalCoinsRef.current}`, width / 2, 62);
        ctx.restore();

        // Tab buttons
        const tabW = 100;
        const tabH = 36;
        const tabY = headerH - tabH - 10;
        const tabGap = 12;
        const tabs = [
          { tab: 'skins', label: 'BIRDS' },
          { tab: 'trails', label: 'TRAILS' },
        ];
        const totalTabW = tabs.length * tabW + (tabs.length - 1) * tabGap;
        const tabStartX = width / 2 - totalTabW / 2;
        const tabBounds = [];

        tabs.forEach((t, i) => {
          const tx = tabStartX + i * (tabW + tabGap);
          const isActive = activeTab === t.tab;
          ctx.save();
          ctx.fillStyle = isActive ? 'rgba(147, 112, 219, 0.7)' : 'rgba(40, 30, 60, 0.8)';
          ctx.fillRect(tx, tabY, tabW, tabH);
          ctx.strokeStyle = isActive ? '#ba55d3' : '#555577';
          ctx.lineWidth = isActive ? 2 : 1;
          ctx.strokeRect(tx, tabY, tabW, tabH);
          ctx.font = `bold 13px Orbitron, Arial`;
          ctx.textAlign = 'center';
          ctx.fillStyle = isActive ? '#ffffff' : '#888899';
          ctx.fillText(t.label, tx + tabW / 2, tabY + tabH / 2 + 5);
          ctx.restore();
          tabBounds.push({ x: tx, y: tabY, w: tabW, h: tabH, tab: t.tab });
        });
        gameStateRef.current._shopTabBounds = tabBounds;

        // Footer background
        ctx.fillStyle = 'rgba(18, 14, 41, 0.95)';
        ctx.fillRect(0, height - footerH, width, footerH);

        // Back button
        ctx.save();
        const backBtnW = 160;
        const backBtnH = 50;
        const backBtnY = height - shopSafeBot - 68;
        ctx.fillStyle = 'rgba(60, 40, 100, 0.9)';
        ctx.fillRect(width / 2 - backBtnW / 2, backBtnY, backBtnW, backBtnH);
        ctx.strokeStyle = '#9966cc';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#9966cc';
        ctx.strokeRect(width / 2 - backBtnW / 2, backBtnY, backBtnW, backBtnH);
        ctx.shadowBlur = 0;
        ctx.font = 'bold 18px Orbitron, Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('BACK', width / 2, backBtnY + 31);
        ctx.restore();

      } else {
        // === MAIN MENU ===
        const isSmallScreen = width < 420;
        const safeBot = gameStateRef.current.safeBottom || 0;
        const menuPad = isSmallScreen ? 8 : 12;

        // Vertically center menu between safe areas
        // Estimate total menu height to compute offset
        const menuTs = Math.min(1.8, Math.max(1, width / 390));
        const titleFontSize = isSmallScreen ? Math.max(28, Math.floor(width * 0.085)) : Math.round(48 * menuTs);
        const diffBtnH_est = isSmallScreen ? 44 : 50;
        const playBtnH_est = isSmallScreen ? 48 : 54;
        const shopBtnH_est = isSmallScreen ? 40 : 44;
        const missionRows = progressionRef.current ? progressionRef.current.getMissions().length : 0;
        const mRowH_est = isSmallScreen ? 26 : 28;
        const slBtnH_est = 30;
        const hasStreak = progressionRef.current && progressionRef.current.getStreak() >= 1;
        const hasDailyReward = progressionRef.current && progressionRef.current.pendingDailyReward > 0 && !state._dailyRewardClaimed;
        const hasDailyChallenge = progressionRef.current && progressionRef.current.getDailyChallenge() && !progressionRef.current.getDailyChallenge().claimed;
        const titleBaseY = isSmallScreen ? 34 : 46;
        const hasLevel = !!progressionRef.current;
        const totalMenuH = titleBaseY                        // title top offset
          + (hasLevel ? (isSmallScreen ? 40 : 44) : 0)      // LVL badge + XP bar
          + (menuPad + 8)                                    // coin row
          + (menuPad + 8)                                    // gap after coin row
          + (hasDailyReward ? (isSmallScreen ? 40 : 46) + menuPad : 0) // daily reward
          + (hasDailyChallenge ? 16 : 0)                     // daily challenge
          + diffBtnH_est + menuPad                           // difficulty
          + playBtnH_est + menuPad                           // play
          + shopBtnH_est + menuPad                           // shop/gfx row
          + (hasStreak ? 20 : 0)                             // streak
          + (missionRows > 0 ? 16 + missionRows * mRowH_est + menuPad : 0) // missions
          + ((window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ? 0 : slBtnH_est + 12);
        const availableH = height - safeTop - safeBot;
        const menuOffset = Math.max(0, (availableH - totalMenuH) / 2);

        // --- Title ---
        ctx.save();
        ctx.font = `900 ${titleFontSize}px Orbitron, Arial`;
        ctx.textAlign = 'center';
        const titleY = safeTop + menuOffset + (isSmallScreen ? 34 : 46);
        // Clip to prevent shadow glow from bleeding below title area
        ctx.beginPath();
        ctx.rect(0, 0, width, titleY + titleFontSize * 0.4);
        ctx.clip();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#6622aa';
        ctx.lineWidth = 6;
        ctx.strokeText('VOID HOPPER', width / 2, titleY);
        const titleGrad = ctx.createLinearGradient(width / 2 - titleFontSize * 3, titleY - 30, width / 2 + titleFontSize * 3, titleY + 10);
        titleGrad.addColorStop(0, '#cc66ff');
        titleGrad.addColorStop(0.3, '#ffffff');
        titleGrad.addColorStop(0.5, '#ee88ff');
        titleGrad.addColorStop(0.7, '#ffffff');
        titleGrad.addColorStop(1, '#aa44dd');
        ctx.fillStyle = titleGrad;
        ctx.fillText('VOID HOPPER', width / 2, titleY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeText('VOID HOPPER', width / 2, titleY);
        ctx.restore();

        // --- Player level badge ---
        if (progressionRef.current) {
          const lvl = progressionRef.current.getLevel();
          const xpProg = progressionRef.current.getXPProgress();
          ctx.save();
          ctx.font = `bold ${Math.round((isSmallScreen ? 10 : 11) * menuTs)}px Orbitron, Arial`;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#aa88ff';
          ctx.fillText(`LVL ${lvl}`, width / 2, titleY + Math.round((isSmallScreen ? 14 : 18) * menuTs));
          // XP bar
          const xpW = Math.round(60 * menuTs), xpH = 3;
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(width / 2 - xpW / 2, titleY + (isSmallScreen ? 18 : 22), xpW, xpH);
          ctx.fillStyle = '#aa88ff';
          ctx.fillRect(width / 2 - xpW / 2, titleY + (isSmallScreen ? 18 : 22), xpW * xpProg, xpH);
          ctx.restore();
        }

        // --- Coins + skin name row ---
        let curY = titleY + (progressionRef.current ? (isSmallScreen ? 40 : 44) : menuPad + 6);
        const currentSkin = BirdSkins[selectedSkinRef.current];
        const coinText = `${totalCoinsRef.current}`;
        const skinText = currentSkin ? currentSkin.name : '';
        // Coins — left side
        ctx.font = `${Math.round((isSmallScreen ? 14 : 16) * menuTs)}px Orbitron, Arial`;
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(coinText, width / 2 - 12, curY);
        const coinTx = width / 2 - 12 - ctx.measureText(coinText).width - 10;
        ctx.beginPath();
        ctx.arc(coinTx, curY - 5, Math.round(6 * menuTs), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cc9900';
        ctx.font = `bold ${Math.round(8 * menuTs)}px Orbitron, Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('$', coinTx, curY - 2);
        // Skin name — right side
        if (skinText) {
          ctx.font = `${Math.round((isSmallScreen ? 11 : 13) * menuTs)}px Orbitron, Arial`;
          ctx.textAlign = 'left';
          ctx.fillStyle = '#aaaacc';
          ctx.fillText(skinText, width / 2 + 12, curY);
        }
        curY += menuPad + 8;

        // --- Daily login reward popup (flows in curY) ---
        state._dailyRewardBounds = null;
        if (progressionRef.current && progressionRef.current.pendingDailyReward > 0 && !state._dailyRewardClaimed) {
          const drInfo = progressionRef.current.getDailyRewardInfo();
          const drW = Math.min(width - 40, 220), drH = isSmallScreen ? 40 : 46;
          const drX = width / 2 - drW / 2;
          const drPulse = 0.95 + Math.sin(Date.now() / 200) * 0.05;
          ctx.save();
          ctx.translate(width / 2, curY + drH / 2);
          ctx.scale(drPulse, drPulse);
          ctx.translate(-width / 2, -(curY + drH / 2));
          ctx.fillStyle = 'rgba(255, 170, 0, 0.9)';
          ctx.fillRect(drX, curY, drW, drH);
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.strokeRect(drX, curY, drW, drH);
          ctx.fillStyle = '#000000';
          ctx.font = `bold ${Math.round((isSmallScreen ? 11 : 13) * menuTs)}px Orbitron, Arial`;
          ctx.textAlign = 'center';
          ctx.fillText(`DAILY BONUS: +${drInfo.pending}`, width / 2, curY + drH / 2 - 3);
          ctx.font = `${Math.round((isSmallScreen ? 8 : 9) * menuTs)}px Orbitron, Arial`;
          ctx.fillText(`Day ${drInfo.day}/7 - Tap to claim!`, width / 2, curY + drH / 2 + 10);
          ctx.restore();
          state._dailyRewardBounds = { x: drX, y: curY, w: drW, h: drH };
          curY += drH + menuPad;
        }

        // --- Daily challenge indicator (flows in curY) ---
        if (progressionRef.current) {
          const dc = progressionRef.current.getDailyChallenge();
          if (dc && !dc.claimed) {
            ctx.save();
            ctx.font = `bold ${Math.round((isSmallScreen ? 9 : 10) * menuTs)}px Orbitron, Arial`;
            ctx.textAlign = 'center';
            ctx.fillStyle = dc.completed ? '#44ff88' : '#44ddff';
            const dcStatus = dc.completed ? 'DONE!' : `${dc.progress}/${dc.target}`;
            ctx.fillText(`DAILY: ${dc.desc} [${dcStatus}] +${dc.reward}`, width / 2, curY + 4);
            ctx.restore();
            curY += 16;
          }
        }

        // --- Difficulty row (horizontal) ---
        const difficulties = [
          { key: 'easy', label: 'EASY', color: '#44cc66', desc: 'Slower storm' },
          { key: 'medium', label: 'MED', color: '#ffaa22', desc: 'Balanced' },
          { key: 'hard', label: 'HARD', color: '#ff4444', desc: 'Fast storm' },
        ];
        const menuMaxW = Math.round(340 * menuTs);
        const diffTotalW = Math.min(width - 30, menuMaxW);
        const diffGap = 8;
        const diffBtnW = (diffTotalW - diffGap * 2) / 3;
        const diffBtnH = Math.round((isSmallScreen ? 44 : 50) * menuTs);
        const diffStartX = width / 2 - diffTotalW / 2;

        difficulties.forEach((d, i) => {
          const bx = diffStartX + i * (diffBtnW + diffGap);
          const by = curY;
          const isSelected = difficultyRef.current === d.key;
          const best = highScores[d.key] || 0;

          ctx.fillStyle = isSelected ? d.color : 'rgba(30, 20, 50, 0.9)';
          ctx.fillRect(bx, by, diffBtnW, diffBtnH);
          ctx.strokeStyle = d.color;
          ctx.lineWidth = isSelected ? 2.5 : 1;
          ctx.strokeRect(bx, by, diffBtnW, diffBtnH);

          if (isSelected) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = d.color;
            ctx.strokeRect(bx, by, diffBtnW, diffBtnH);
            ctx.shadowBlur = 0;
          }

          ctx.fillStyle = isSelected ? '#000000' : d.color;
          ctx.font = `bold ${Math.round((isSmallScreen ? 13 : 15) * menuTs)}px Orbitron, Arial`;
          ctx.textAlign = 'center';
          ctx.fillText(d.label, bx + diffBtnW / 2, by + Math.round((isSmallScreen ? 18 : 20) * menuTs));

          ctx.font = `${Math.round((isSmallScreen ? 9 : 10) * menuTs)}px Orbitron, Arial`;
          ctx.fillStyle = isSelected ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.35)';
          ctx.fillText(best > 0 ? `Best: ${best}m` : d.desc, bx + diffBtnW / 2, by + Math.round((isSmallScreen ? 36 : 40) * menuTs));

          d._bounds = { x: bx, y: by, w: diffBtnW, h: diffBtnH };
        });
        gameStateRef.current._difficultyButtons = difficulties;
        curY += diffBtnH + menuPad;

        // --- PLAY button ---
        const playBtnW = Math.min(width - 30, menuMaxW);
        const playBtnH = Math.round((isSmallScreen ? 48 : 54) * menuTs);
        const playBtnX = width / 2 - playBtnW / 2;
        const playBtnY = curY;
        const selDiff = difficulties.find(d => d.key === difficultyRef.current) || difficulties[1];
        const time = Date.now() / 1000;
        const playPulse = 0.97 + Math.sin(time * 3) * 0.03;
        ctx.save();
        ctx.translate(width / 2, playBtnY + playBtnH / 2);
        ctx.scale(playPulse, playPulse);
        ctx.translate(-width / 2, -(playBtnY + playBtnH / 2));
        ctx.fillStyle = selDiff.color;
        ctx.fillRect(playBtnX, playBtnY, playBtnW, playBtnH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = selDiff.color;
        ctx.strokeRect(playBtnX, playBtnY, playBtnW, playBtnH);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${Math.round((isSmallScreen ? 20 : 24) * menuTs)}px Orbitron, Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('PLAY', width / 2, playBtnY + playBtnH / 2 + Math.round(8 * menuTs));
        ctx.restore();
        gameStateRef.current._playBtnBounds = { x: playBtnX, y: playBtnY, w: playBtnW, h: playBtnH };
        curY += playBtnH + menuPad;

        // --- SHOP + GFX row (side by side) ---
        const rowW = Math.min(width - 30, menuMaxW);
        const rowStartX = width / 2 - rowW / 2;
        const shopBtnW = Math.floor(rowW * 0.48);
        const shopBtnH = Math.round((isSmallScreen ? 40 : 44) * menuTs);
        const gfxBtnW = rowW - shopBtnW - 8;

        // Shop button
        ctx.fillStyle = 'rgba(147, 112, 219, 0.8)';
        ctx.fillRect(rowStartX, curY, shopBtnW, shopBtnH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rowStartX, curY, shopBtnW, shopBtnH);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round((isSmallScreen ? 16 : 18) * menuTs)}px Orbitron, Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('SHOP', rowStartX + shopBtnW / 2, curY + shopBtnH / 2 + Math.round(6 * menuTs));
        gameStateRef.current._shopBtnBounds = { x: rowStartX, y: curY, w: shopBtnW, h: shopBtnH };

        // Graphics button
        const gfxLabel = graphicsRef.current.toUpperCase();
        const gfxColors = { low: '#44cc66', medium: '#ffaa22', high: '#ff4466' };
        const gfxColor = gfxColors[graphicsRef.current] || '#ffaa22';
        const gfxBtnX = rowStartX + shopBtnW + 8;
        ctx.fillStyle = 'rgba(30, 20, 50, 0.9)';
        ctx.fillRect(gfxBtnX, curY, gfxBtnW, shopBtnH);
        ctx.strokeStyle = gfxColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(gfxBtnX, curY, gfxBtnW, shopBtnH);
        ctx.font = `bold ${Math.round((isSmallScreen ? 10 : 11) * menuTs)}px Orbitron, Arial`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('GFX:', gfxBtnX + gfxBtnW / 2 - Math.round(20 * menuTs), curY + shopBtnH / 2 + 4);
        ctx.fillStyle = gfxColor;
        ctx.font = `bold ${Math.round((isSmallScreen ? 12 : 13) * menuTs)}px Orbitron, Arial`;
        ctx.fillText(gfxLabel, gfxBtnX + gfxBtnW / 2 + Math.round(22 * menuTs), curY + shopBtnH / 2 + 4);
        gameStateRef.current._gfxBtnBounds = { x: gfxBtnX, y: curY, w: gfxBtnW, h: shopBtnH };
        curY += shopBtnH + menuPad;

        // --- Leaderboard button (Game Center) ---
        if (isGCAuthenticated()) {
          const lbBtnW = Math.min(width - 30, menuMaxW);
          const lbBtnH = Math.round((isSmallScreen ? 36 : 40) * menuTs);
          const lbBtnX = width / 2 - lbBtnW / 2;
          ctx.fillStyle = 'rgba(40, 80, 140, 0.85)';
          ctx.fillRect(lbBtnX, curY, lbBtnW, lbBtnH);
          ctx.strokeStyle = '#4488ff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(lbBtnX, curY, lbBtnW, lbBtnH);
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.round((isSmallScreen ? 14 : 16) * menuTs)}px Orbitron, Arial`;
          ctx.textAlign = 'center';
          ctx.fillText('LEADERBOARD', width / 2, curY + lbBtnH / 2 + Math.round(5 * menuTs));
          gameStateRef.current._menuLeaderboardBtnBounds = { x: lbBtnX, y: curY, w: lbBtnW, h: lbBtnH };
          curY += lbBtnH + menuPad;
        }

        // --- Missions panel (main feature area) ---
        if (progressionRef.current) {
          // Daily streak inline — prominent display with flame
          if (progressionRef.current.getStreak() >= 1) {
            const streakVal = progressionRef.current.getStreak();
            const bonusPct = Math.floor(progressionRef.current.getStreakBonus() * 100);
            const streakPulse = 0.9 + Math.sin(Date.now() / 200) * 0.1;
            ctx.save();
            ctx.font = `bold ${Math.round((isSmallScreen ? 12 : 14) * menuTs)}px Orbitron, Arial`;
            ctx.textAlign = 'center';
            ctx.fillStyle = streakVal >= 5 ? '#ff6600' : '#ffaa44';
            ctx.shadowBlur = streakVal >= 5 ? 8 : 4;
            ctx.shadowColor = streakVal >= 5 ? '#ff4400' : '#ffaa00';
            ctx.globalAlpha = streakPulse;
            const flameIcon = streakVal >= 7 ? '**' : streakVal >= 3 ? '*' : '';
            ctx.fillText(`${flameIcon} Day ${streakVal} Streak${bonusPct > 0 ? ` +${bonusPct}% coins` : ''} ${flameIcon}`, width / 2, curY + 8);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            ctx.restore();
            curY += 20;
          }

          // Missions header
          ctx.save();
          ctx.font = `bold ${Math.round((isSmallScreen ? 10 : 11) * menuTs)}px Orbitron, Arial`;
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fillText('MISSIONS', width / 2, curY + Math.round(10 * menuTs));
          curY += 16;

          const missions = progressionRef.current.getMissions();
          const mBarW = Math.min(width - 30, menuMaxW);
          const mBarX = width / 2 - mBarW / 2;
          const mRowH = isSmallScreen ? 26 : 28;

          missions.forEach((m, mi) => {
            const my = curY + mi * mRowH;
            // Progress bar bg
            ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.fillRect(mBarX, my, mBarW, 4);
            // Progress fill
            const pct = m.target > 0 ? Math.min(1, m.progress / m.target) : 0;
            ctx.fillStyle = m.completed ? '#44ff88' : '#4488cc';
            ctx.fillRect(mBarX, my, mBarW * pct, 4);
            // Border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(mBarX, my, mBarW, 4);
            // Description
            ctx.font = `${Math.round((isSmallScreen ? 9 : 10) * menuTs)}px Orbitron, Arial`;
            ctx.textAlign = 'left';
            ctx.fillStyle = m.completed ? '#44ff88' : 'rgba(255, 255, 255, 0.55)';
            ctx.fillText(`${m.desc} (${m.progress}/${m.target})`, mBarX, my + Math.round(16 * menuTs));
            // Reward
            ctx.textAlign = 'right';
            ctx.fillStyle = '#ffd700';
            ctx.fillText(`+${m.reward}`, mBarX + mBarW, my + 16);
          });
          ctx.restore();
          curY += missions.length * mRowH + menuPad;
        }

        // --- Backup / Restore (web only, not needed on iOS native) ---
        const isNativePlatform = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
        if (!isNativePlatform) {
          const slBtnW = 80;
          const slBtnH = 30;
          const slGap = 8;
          const slTotalW = slBtnW * 2 + slGap;
          const slX = width / 2 - slTotalW / 2;
          const slY = curY;

          ctx.fillStyle = 'rgba(30, 60, 40, 0.7)';
          ctx.fillRect(slX, slY, slBtnW, slBtnH);
          ctx.strokeStyle = '#44aa66';
          ctx.lineWidth = 1;
          ctx.strokeRect(slX, slY, slBtnW, slBtnH);
          ctx.font = 'bold 10px Orbitron, Arial';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#66dd88';
          ctx.fillText('BACKUP', slX + slBtnW / 2, slY + 20);
          gameStateRef.current._saveBtnBounds = { x: slX, y: slY, w: slBtnW, h: slBtnH };

          const loadX = slX + slBtnW + slGap;
          ctx.fillStyle = 'rgba(40, 30, 60, 0.7)';
          ctx.fillRect(loadX, slY, slBtnW, slBtnH);
          ctx.strokeStyle = '#8866cc';
          ctx.lineWidth = 1;
          ctx.strokeRect(loadX, slY, slBtnW, slBtnH);
          ctx.fillStyle = '#aa88dd';
          ctx.fillText('RESTORE', loadX + slBtnW / 2, slY + 20);
          gameStateRef.current._loadBtnBounds = { x: loadX, y: slY, w: slBtnW, h: slBtnH };
        }
      }

      // Developer credit
      const creditSafeBot = gameStateRef.current.safeBottom || 0;
      ctx.font = `${width < 420 ? 9 : 10}px Orbitron, Arial`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillText('Developed by Kevin Delao', width / 2, height - creditSafeBot - 8);

      ctx.restore();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      margin: 0,
      padding: 0,
      overscrollBehavior: 'none',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          touchAction: 'none',
          cursor: isMobile ? 'default' : 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      />
    </div>
  );
};

export default Game;
