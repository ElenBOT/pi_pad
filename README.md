# Pi Pad - Orange Pi Web Touchpad

This project let you use your phone and an Orange Pi to emulate a touch pad.

---

## Development Workflow (Why local Windows + SCP?)

Due to the **legacy ARM architecture and older Linux kernel** on the Orange Pi, modern remote development tooling (like VSCode Remote-SSH) cannot connect or run its node agent on the Pi.

To facilitate quick iteration, the project uses a **dual-machine development loop**:
1. **Windows Local Workspace**: Write and test all FastAPI backend logic and static assets (HTML/JS/CSS).
2. **Automated SCP Deployment**: Use a PowerShell script (`deploy.ps1`) to recursively transfer updated files to the Orange Pi instantly.
3. **Background Services**: Run the server as a systemd background process on the Orange Pi for instant hot reload and testing.

---

## Directory Structure

* **`main.py`**: FastAPI server hosting static frontend assets, WebSocket messaging endpoints, and the script activation API.
* **`hid_mouse.py`**: Package formatting for the 5-byte absolute mouse pointer report (`/dev/hidg1`) and the 8-byte keyboard report (`/dev/hidg0` for scroll emulation). Includes local Windows fallback logs so that testing doesn't crash on desktop hosts.
* **`setup_gadget.sh`**: The target bash configuration script. Installs `libcomposite` and configures kernel USB HID endpoints.
* **`pi_pad.service`**: Linux systemd unit file to enable starting the service as `root` automatically on system boot.
* **`requirements.txt`**: Python third-party dependencies (`fastapi`, `uvicorn`, `websockets`).
* **`deploy.ps1`**: PowerShell script that switches directories to the script root and copies updated files using `scp`.
* **`static/` & `templates/`**: White-themed minimalist touchscreen touchpad assets with dashed quadrant grids.

---

## Deployment & Setup Instructions

### Step 1: Windows Client Syncing
1. Open **`deploy.ps1`** on your local Windows PC and configure your Orange Pi credentials at the top:
   ```powershell
   $OPI_IP = "op1-case"      # Orange Pi host IP or Hostname
   $OPI_USER = "op1"         # Orange Pi username
   ```
2. Run the deployment script in your local PowerShell terminal to upload files via SCP:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\deploy.ps1
   ```

### Step 2: Orange Pi Background Service Setup (Only required once)
Once the files are transferred, SSH into your Orange Pi to register the system service:
```bash
# 1. Navigate to the project directory
cd ~/pi_pad

# 2. Link the service file to systemd configuration
sudo ln -sf /home/op1/pi_pad/pi_pad.service /etc/systemd/system/pi_pad.service

# 3. Reload systemd daemon, enable, and restart the service
sudo systemctl daemon-reload
sudo systemctl enable pi_pad
sudo systemctl restart pi_pad
```
*Note: The FastAPI server will run continuously in the background under root privileges. Whenever the Orange Pi is powered on, the service starts automatically. You do not need to SSH in to run uvicorn again.*

---

## How to Use

1. Connect your smartphone/tablet to the same network and open a browser to `http://<orange-pi-ip>:8000` (or `http://op1-case:8000`).
2. Tap the **"ENABLE TOUCHPAD (INITIALIZE USB HID)"** button at the top of the interface.
3. Once the button displays a green checkmark **`USB HID Initialized ✓`**, the USB keyboard and absolute mouse gadgets are active on the host PC. Slide your finger inside the white area to control your host computer's cursor!
