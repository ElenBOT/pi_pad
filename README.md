# Pi Pad - Orange Pi USB HID Web Touchpad & Keyboard

**Pi Pad** is a lightweight FastAPI web application that turns any smartphone or tablet browser into a real-time relative touchpad (with scroll wheel, left/right click, drag lock) and keyboard controller for your host PC, using an Orange Pi emulating a USB HID gadget.

---

## Features

* **Relative Touchpad**: Smooth cursor control mapping across multiple screens, utilizing the host OS's native mouse acceleration.
* **Native Mouse Scroll Wheel**: Emulates a vertical scroll wheel for smooth scrolling.
* **Preserved Virtual Keyboard**: Focus-preserved keyboard panel with segmented **Real-time** and **Buffer** typing modes.
* **IME Shift & Editing Shortcuts**: Dedicated buttons for `Shift` (toggles Chinese/English input state in Microsoft Bopomofo/Zhuyin IME), `Copy` (Ctrl+C), and `Paste` (Ctrl+V) that do not close the soft keyboard on tap.
* **Custom Precision Sensitivity**: Adjustable slider from `1.0` to `5.0` with `0.5` steps, or tap the badge to type a precise sensitivity number (e.g. `2.3` with `0.1` precision).
* **Minimalist White Design**: Sharp-cornered white-theme tiles with visual quadrant guides.
* **PWA Standalone Support**: Add the webpage to your phone's Home Screen to run in full-screen standalone mode without a browser address bar.

---

## Hardware Requirements

1. **Orange Pi**: A board supporting USB OTG device mode (e.g., Orange Pi Zero, Orange Pi 3 LTS, Orange Pi 4, etc.).
2. **USB Data Cable**: Connect the Orange Pi's **USB OTG port** (usually the USB-C or Micro-USB power/data port) to a USB port on the target host PC.
   * *Note: Ensure your USB cable supports data transfer (not a charge-only cable), and it is plugged into the correct OTG port on the board.*

---

## Deployment & Setup on Orange Pi

SSH into your Orange Pi and run the following steps to configure the software:

### Step 1: Clone the Repository
```bash
git clone https://github.com/<YOUR_GITHUB_USERNAME>/pi_pad.git
cd pi_pad
```

### Step 2: Install Python Dependencies
```bash
sudo apt update
sudo apt install -y python3-pip python3-dev
pip3 install -r requirements.txt
```

### Step 3: Register the Auto-Start systemd Service
By running the server as a systemd background service under the `root` user, the server will start automatically on boot and have the correct privileges to configure the USB gadget kernel nodes.

```bash
# Link the service configuration to systemd
sudo ln -sf $(pwd)/pi_pad.service /etc/systemd/system/pi_pad.service

# Reload daemon, enable auto-start, and launch the service
sudo systemctl daemon-reload
sudo systemctl enable pi_pad
sudo systemctl restart pi_pad
```

---

## How to Use

1. Ensure the Orange Pi is connected to the host PC via the USB OTG port.
2. Open a web browser on your smartphone or tablet (connected to the same local network) and navigate to:
   ```text
   http://<orange-pi-ip>:8000
   ```
3. Tap **"Init USB HID"** in the web interface. Once the button turns green and says **`USB HID Initialized ✓`**, the USB absolute keyboard and relative mouse nodes are active.
4. Drag your finger in the white touchpad area to move your PC's cursor!
5. Tap **"Keypad"** to open the soft keyboard panel and begin typing.

---

## Gestures Reference

* **Cursor Move**: Single-finger drag.
* **Left-Click**: Single-finger tap.
* **Right-Click**: Two-finger tap.
* **Scroll Page**: Two-finger drag up or down.
* **Drag Lock (Click-and-Hold)**: Double-tap and hold on the second tap, then drag. Tap once to release.

---

## Developer Guide
If you want to modify this codebase locally on a Windows PC and sync it to the Orange Pi via SCP, please refer to the [Development Documentation (dev_readme.md)](dev_readme.md).
