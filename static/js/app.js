// WebSocket connection
let socket = null;
let reconnectTimer = null;
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

// State variables for gesture detection
const touchpad = document.getElementById('touchpad');
const instructions = document.querySelector('.touchpad-instructions');

// Settings
let sensitivity = parseFloat(document.getElementById('sensitivity').value) || 2.0;
let scrollSpeed = parseFloat(document.getElementById('scroll-speed').value) || 1.0;

// Update settings UI values
const sensSlider = document.getElementById('sensitivity');
const sensVal = document.getElementById('sens-val');

sensSlider.addEventListener('input', (e) => {
    sensitivity = parseFloat(e.target.value);
    sensVal.textContent = sensitivity.toFixed(1);
});

// Click on the sensitivity value text to type a precise number
sensVal.addEventListener('click', () => {
    const userInput = prompt("Enter custom sensitivity (1.0 - 5.0):", sensitivity);
    if (userInput !== null) {
        const val = parseFloat(userInput);
        if (!isNaN(val)) {
            sensitivity = Math.max(1.0, Math.min(5.0, val));
            sensVal.textContent = sensitivity;
            sensSlider.value = sensitivity;
        }
    }
});

document.getElementById('scroll-speed').addEventListener('input', (e) => {
    scrollSpeed = parseFloat(e.target.value);
    document.getElementById('scroll-val').textContent = scrollSpeed.toFixed(1);
});

// Gesture Tracking State
let touchStartTime = 0;
let touchStartX = 0;
let touchStartY = 0;
let lastX = 0;
let lastY = 0;
let isMoving = false;

// Double tap & drag tracking (for left-click drag)
let lastTapTime = 0;
let isDragging = false; 
let dragStartPending = false;

// Multi-touch tracking
let startTwoFingerDist = 0;
let lastTwoFingerY = 0;
let scrollAccumulator = 0;
let lastMultiTouchTime = 0;

// Reconnection config
const WS_SCHEME = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${WS_SCHEME}//${window.location.host}/ws`;

function connectWebSocket() {
    if (socket) {
        socket.close();
    }

    console.log("Connecting to WS:", WS_URL);
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log("WebSocket connected!");
        statusDot.classList.add('connected');
        statusText.textContent = "Connected";
        if (reconnectTimer) {
            clearInterval(reconnectTimer);
            reconnectTimer = null;
        }
    };

    socket.onclose = () => {
        console.log("WebSocket disconnected. Retrying...");
        statusDot.classList.remove('connected');
        statusText.textContent = "Disconnected";
        
        // Reset dragging state if socket closes
        if (isDragging) {
            isDragging = false;
            touchpad.classList.remove('active');
        }

        if (!reconnectTimer) {
            reconnectTimer = setInterval(connectWebSocket, 3000);
        }
    };

    socket.onerror = (err) => {
        console.error("WebSocket error:", err);
    };
}

// Send helper
function sendEvent(data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    }
}

// Visual feedback: click ripple
function showRipple(e, type) {
    const rect = touchpad.getBoundingClientRect();
    let x, y;
    
    if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else if (e.clientX) {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    } else {
        x = rect.width / 2;
        y = rect.height / 2;
    }

    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    if (type === 'right') {
        ripple.style.background = 'rgba(239, 68, 68, 0.15)'; // Soft red for right click
    } else {
        ripple.style.background = 'rgba(15, 23, 42, 0.1)';   // Soft dark gray for left click
    }
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    touchpad.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 4000);
}

// Touch Event Handlers
touchpad.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const now = Date.now();
    const touches = e.touches;

    // Hide instructions on first touch
    if (!instructions.classList.contains('hidden')) {
        instructions.classList.add('hidden');
    }

    if (touches.length === 1) {
        const touch = touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        lastX = touchStartX;
        lastY = touchStartY;
        touchStartTime = now;
        isMoving = false;

        // Check for double tap (within 300ms) to start dragging (tap-and-hold)
        const timeSinceLastTap = now - lastTapTime;
        if (timeSinceLastTap < 300 && timeSinceLastTap > 50) {
            dragStartPending = true;
        } else {
            dragStartPending = false;
        }

    } else if (touches.length >= 2) {
        lastMultiTouchTime = now;
        // Prepare for scroll
        const touch1 = touches[0];
        const touch2 = touches[1];
        lastTwoFingerY = (touch1.clientY + touch2.clientY) / 2;
        scrollAccumulator = 0;
        
        // If we were dragging, release drag
        if (isDragging) {
            sendEvent({ type: "button", button: "left", state: "up" });
            isDragging = false;
            touchpad.classList.remove('active');
        }
    }
});

touchpad.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touches = e.touches;

    if (touches.length === 1) {
        const touch = touches[0];
        
        // Cooldown protection after multi-touch (prevents lift-off mouse jumps)
        if (Date.now() - lastMultiTouchTime < 200) {
            lastX = touch.clientX;
            lastY = touch.clientY;
            return;
        }

        const dx = touch.clientX - lastX;
        const dy = touch.clientY - lastY;
        
        // Check if movement is significant
        const totalDist = Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY);
        if (totalDist > 5) {
            isMoving = true;
        }

        // If tap-and-hold is pending, start drag lock
        if (dragStartPending && isMoving && !isDragging) {
            isDragging = true;
            dragStartPending = false;
            touchpad.classList.add('active');
            sendEvent({ type: "button", button: "left", state: "down" });
        }

        // Send move event
        sendEvent({
            type: "move",
            dx: dx,
            dy: dy,
            sensitivity: sensitivity
        });

        lastX = touch.clientX;
        lastY = touch.clientY;

    } else if (touches.length >= 2) {
        lastMultiTouchTime = Date.now();
        const touch1 = touches[0];
        const touch2 = touches[1];
        const currentTwoFingerY = (touch1.clientY + touch2.clientY) / 2;
        const dy = currentTwoFingerY - lastTwoFingerY;

        // Accumulate scroll distance
        scrollAccumulator += dy;

        // Scroll threshold (pixels required to trigger one scroll step)
        // Scaled by scrollSpeed: larger scrollSpeed means smaller threshold (more sensitive)
        const threshold = Math.max(5, 30 / scrollSpeed);

        if (Math.abs(scrollAccumulator) >= threshold) {
            // Determine scroll direction
            // Natural scroll: dragging fingers down scrolls content down (sends key down)
            const direction = scrollAccumulator > 0 ? "down" : "up";
            sendEvent({
                type: "scroll",
                direction: direction
            });
            // Subtract threshold from accumulator
            scrollAccumulator = scrollAccumulator > 0 
                ? scrollAccumulator - threshold 
                : scrollAccumulator + threshold;
        }

        lastTwoFingerY = currentTwoFingerY;
    }
});

touchpad.addEventListener('touchend', (e) => {
    e.preventDefault();
    const now = Date.now();
    const touches = e.touches;

    if (e.changedTouches.length > 0) {
        const changedTouch = e.changedTouches[0];
        const moveDist = Math.hypot(changedTouch.clientX - touchStartX, changedTouch.clientY - touchStartY);
        const duration = now - touchStartTime;

        // Single Finger Release
        if (touches.length === 0) {
            if (isDragging) {
                // If dragging, release the left button
                sendEvent({ type: "button", button: "left", state: "up" });
                isDragging = false;
                touchpad.classList.remove('active');
                lastTapTime = 0; // Prevent immediate double tap triggers
            } else if (!isMoving && duration < 250 && moveDist < 10) {
                // Single click
                sendEvent({ type: "click", button: "left" });
                showRipple(changedTouch, 'left');
                lastTapTime = now;
            }
            dragStartPending = false;
        }
    }

    // Two Finger Release (Right click check)
    // If we transition from 2 fingers to 0 fingers quickly
    if (touches.length === 0 && e.touches.length === 0 && e.changedTouches.length === 2) {
        // Wait, standard HTML touch events fire touchend for each finger. 
        // We can track if two fingers were released almost simultaneously
    }
});

// Detect two-finger tap (cleaner approach: check touch event counts)
touchpad.addEventListener('touchend', (e) => {
    // If the touch sequence had 2 fingers and ended quickly without moving much
    if (e.touches.length === 0 && e.changedTouches.length === 2) {
        // Check duration of the gesture
        const duration = Date.now() - touchStartTime;
        if (duration < 250) {
            sendEvent({ type: "click", button: "right" });
            showRipple(e.changedTouches[0], 'right');
        }
    }
});

// Settings buttons action
document.getElementById('recenter-btn').addEventListener('click', (e) => {
    sendEvent({ type: "recenter" });
    showRipple(e, 'left');
});

// Enable HID (Run Shell Script) action
const enableHidBtn = document.getElementById('enable-hid-btn');
enableHidBtn.addEventListener('click', () => {
    enableHidBtn.disabled = true;
    const originalText = enableHidBtn.querySelector('span').textContent;
    enableHidBtn.querySelector('span').textContent = "Initializing...";
    
    fetch('/api/enable-hid', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success' || data.status === 'mock_success') {
            enableHidBtn.classList.add('success');
            enableHidBtn.querySelector('span').textContent = "USB HID Initialized ✓";
            
            // Re-establish WebSocket to refresh HID state
            setTimeout(() => {
                connectWebSocket();
            }, 500);
            
            setTimeout(() => {
                enableHidBtn.classList.remove('success');
                enableHidBtn.querySelector('span').textContent = originalText;
                enableHidBtn.disabled = false;
            }, 3000);
        } else {
            console.error("Initialization error:", data.message || data.stderr);
            enableHidBtn.classList.add('error');
            enableHidBtn.querySelector('span').textContent = "Initialization Failed ✗";
            alert("Error: " + (data.message || data.stderr || "Unknown error"));
            
            setTimeout(() => {
                enableHidBtn.classList.remove('error');
                enableHidBtn.querySelector('span').textContent = originalText;
                enableHidBtn.disabled = false;
            }, 3000);
        }
    })
    .catch(err => {
        console.error("Fetch error:", err);
        enableHidBtn.classList.add('error');
        enableHidBtn.querySelector('span').textContent = "Network Error ✗";
        
        setTimeout(() => {
            enableHidBtn.classList.remove('error');
            enableHidBtn.querySelector('span').textContent = originalText;
            enableHidBtn.disabled = false;
        }, 3000);
    });
});

// Detect iOS (iPhone/iPad/iPod)
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Modal DOM elements
const infoModal = document.getElementById('info-modal');
const closeModalBtn = document.getElementById('close-modal-btn');

function showHelpModal() {
    infoModal.classList.add('visible');
}

function hideHelpModal() {
    infoModal.classList.remove('visible');
}

closeModalBtn.addEventListener('click', hideHelpModal);
infoModal.addEventListener('click', (e) => {
    // Hide modal if clicked outside the content box
    if (e.target === infoModal) {
        hideHelpModal();
    }
})// Exit custom fullscreen button handler
const exitFullscreenBtn = document.getElementById('exit-fullscreen-btn');
exitFullscreenBtn.addEventListener('click', () => {
    document.body.classList.remove('fullscreen-active');
    closeKeyboardPanel();
    
    // Also exit native fullscreen if active
    const isFS = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if (isFS) {
        const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (exitFS) {
            exitFS.call(document);
        }
    }
});

// Fullscreen mode handler
const fullscreenBtn = document.getElementById('fullscreen-btn');
fullscreenBtn.addEventListener('click', () => {
    // Add custom class to hide header and controls immediately
    document.body.classList.add('fullscreen-active');
    
    // If the device is iOS (iPhone/iPad), direct element.requestFullscreen is blocked,
    // but the css fullscreen-active class successfully hides the header & control panel.
    // However, if they are NOT in standalone PWA mode, we show the setup instructions modal.
    if (isIOS) {
        // Check if running in standalone mode
        const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
        if (!isStandalone) {
            showHelpModal();
        }
        return;
    }

    const docEl = document.documentElement;
    // Attempt request with vendor fallback for Android/Chrome
    const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
    if (requestFS) {
        requestFS.call(docEl)
            .catch(err => {
                console.error(`Fullscreen request failed:`, err);
                showHelpModal(); // Fallback on error
            });
    } else {
        showHelpModal(); // Fallback if API not supported
    }
});

function updateFullscreenBtn(isFS) {
    if (isFS) {
        fullscreenBtn.innerHTML = `
            <span>Exit Fullscreen</span>
        `;
    } else {
        fullscreenBtn.innerHTML = `
            <span>Fullscreen</span>
        `;
    }
}

// Monitor fullscreen state changes from system (e.g., swiping down or pressing Esc)
const fsEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
fsEvents.forEach(evt => {
    document.addEventListener(evt, () => {
        const isFS = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
        updateFullscreenBtn(!!isFS);
        if (!isFS) {
            document.body.classList.remove('fullscreen-active');
            closeKeyboardPanel();
        }
    });
});

// Keyboard Panel Toggle State Machine
let isKeyboardOpen = false;
const toggleKeyboardBtn = document.getElementById('toggle-keyboard-btn');
const keyboardPanel = document.getElementById('keyboard-panel');
const keyboardInput = document.getElementById('keyboard-input');
const closeKbdPanelBtn = document.getElementById('close-kbd-panel-btn');
const keyboardFsBtn = document.getElementById('keyboard-fs-btn');

function openKeyboardPanel() {
    isKeyboardOpen = true;
    keyboardPanel.classList.add('visible');
    toggleKeyboardBtn.classList.add('active');
    document.body.classList.add('kbd-panel-open');
    
    // Switch to smaller touchpad layout in fullscreen mode
    if (document.body.classList.contains('fullscreen-active')) {
        document.body.classList.add('kbd-open-fs');
    }

    // Initialize input field for real-time or buffer mode
    if (sendMode === 'realtime') {
        keyboardInput.value = " ";
        lastInputVal = " ";
    } else {
        keyboardInput.value = "";
        lastInputVal = "";
    }
    
    // Focus synchronously to trigger soft keyboard on mobile browsers instantly
    keyboardInput.focus();
}

function closeKeyboardPanel() {
    isKeyboardOpen = false;
    keyboardPanel.classList.remove('visible');
    toggleKeyboardBtn.classList.remove('active');
    document.body.classList.remove('kbd-panel-open');
    document.body.classList.remove('kbd-open-fs');
    keyboardInput.value = "";
    lastInputVal = "";
    keyboardInput.blur();
}

function toggleKeyboardPanel() {
    if (isKeyboardOpen) {
        closeKeyboardPanel();
    } else {
        openKeyboardPanel();
    }
}

toggleKeyboardBtn.addEventListener('click', toggleKeyboardPanel);
closeKbdPanelBtn.addEventListener('click', closeKeyboardPanel);
keyboardFsBtn.addEventListener('click', toggleKeyboardPanel);

// Typing Modes (Real-time vs Buffer)
let sendMode = 'realtime';
const modeRealtimeBtn = document.getElementById('mode-realtime');
const modeBufferBtn = document.getElementById('mode-buffer');
const sendBtn = document.getElementById('send-btn');
let lastInputVal = " ";

modeRealtimeBtn.addEventListener('click', () => {
    sendMode = 'realtime';
    modeRealtimeBtn.classList.add('active');
    modeBufferBtn.classList.remove('active');
    sendBtn.style.display = 'none';
    keyboardInput.value = " ";
    lastInputVal = " ";
    keyboardInput.focus();
});

modeBufferBtn.addEventListener('click', () => {
    sendMode = 'buffer';
    modeBufferBtn.classList.add('active');
    modeRealtimeBtn.classList.remove('active');
    sendBtn.style.display = 'inline-flex';
    keyboardInput.value = "";
    lastInputVal = "";
    keyboardInput.focus();
});

// Capture key presses and text modifications using a robust input-based mechanism
keyboardInput.addEventListener('input', (e) => {
    if (sendMode === 'realtime') {
        const currentVal = keyboardInput.value;
        
        // 1. Backspace detection (when the single-space placeholder is deleted)
        if (currentVal === "") {
            sendEvent({
                type: "keyboard",
                key: "Backspace"
            });
            keyboardInput.value = " ";
            lastInputVal = " ";
            return;
        }
        
        // 2. Enter key detection
        if (currentVal.includes("\n") || currentVal.includes("\r")) {
            sendEvent({
                type: "keyboard",
                key: "Enter"
            });
            keyboardInput.value = " ";
            lastInputVal = " ";
            return;
        }
        
        // 3. Normal typing / characters input
        if (currentVal.startsWith(" ")) {
            const added = currentVal.substring(1);
            for (let i = 0; i < added.length; i++) {
                sendEvent({
                    type: "keyboard",
                    key: added.charAt(i)
                });
            }
        } else {
            // Fallback if the space placeholder was overwritten
            for (let i = 0; i < currentVal.length; i++) {
                sendEvent({
                    type: "keyboard",
                    key: currentVal.charAt(i)
                });
            }
        }
        
        // Keep the input value as a single space for next character detection
        keyboardInput.value = " ";
        lastInputVal = " ";
    }
});

// Buffer Send Button Trigger
sendBtn.addEventListener('click', () => {
    const textToSend = keyboardInput.value;
    if (textToSend.length > 0) {
        sendEvent({
            type: "type_string",
            text: textToSend
        });
        keyboardInput.value = '';
        lastInputVal = '';
    }
    keyboardInput.focus();
});

// Shortcut Buttons Event Listeners
const shortcutShift = document.getElementById('shortcut-shift');
const shortcutCopy = document.getElementById('shortcut-copy');
const shortcutPaste = document.getElementById('shortcut-paste');

function handleShortcutTrigger(e, name) {
    e.preventDefault(); // Prevents input field from losing focus and soft keyboard from closing
    sendEvent({ type: "shortcut", name: name });
    keyboardInput.focus();
}

shortcutShift.addEventListener('mousedown', (e) => handleShortcutTrigger(e, 'shift'));
shortcutShift.addEventListener('touchstart', (e) => handleShortcutTrigger(e, 'shift'));

shortcutCopy.addEventListener('mousedown', (e) => handleShortcutTrigger(e, 'copy'));
shortcutCopy.addEventListener('touchstart', (e) => handleShortcutTrigger(e, 'copy'));

shortcutPaste.addEventListener('mousedown', (e) => handleShortcutTrigger(e, 'paste'));
shortcutPaste.addEventListener('touchstart', (e) => handleShortcutTrigger(e, 'paste'));

// Desktop Mouse Support (for testing/development on desktop browsers)
let isMouseDown = false;
let mouseStartX = 0;
let mouseStartY = 0;
let mouseStartTime = 0;

touchpad.addEventListener('mousedown', (e) => {
    // Only capture left click (button 0) or right click (button 2)
    if (e.button !== 0 && e.button !== 2) return;
    
    e.preventDefault();
    isMouseDown = true;
    const now = Date.now();
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
    lastX = mouseStartX;
    lastY = mouseStartY;
    mouseStartTime = now;
    isMoving = false;
    
    // Hide instructions on first interaction
    if (!instructions.classList.contains('hidden')) {
        instructions.classList.add('hidden');
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    e.preventDefault();
    
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    
    const totalDist = Math.hypot(e.clientX - mouseStartX, e.clientY - mouseStartY);
    if (totalDist > 5) {
        isMoving = true;
    }
    
    sendEvent({
        type: "move",
        dx: dx,
        dy: dy,
        sensitivity: sensitivity
    });
    
    lastX = e.clientX;
    lastY = e.clientY;
});

window.addEventListener('mouseup', (e) => {
    if (!isMouseDown) return;
    isMouseDown = false;
    e.preventDefault();
    
    const duration = Date.now() - mouseStartTime;
    const moveDist = Math.hypot(e.clientX - mouseStartX, e.clientY - mouseStartY);
    
    if (!isMoving && duration < 250 && moveDist < 10) {
        if (e.button === 0) {
            sendEvent({ type: "click", button: "left" });
            showRipple(e, 'left');
        } else if (e.button === 2) {
            sendEvent({ type: "click", button: "right" });
            showRipple(e, 'right');
        }
    }
});

// Prevent context menu on touchpad for right-click testing
touchpad.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Initialize WebSocket Connection
connectWebSocket();

