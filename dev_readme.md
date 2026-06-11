# Pi Pad - Development Documentation

This documentation describes the dual-machine development loop used to build and debug **Pi Pad** on a local Windows machine before deploying to the Orange Pi.

---

## Development & Architecture Workflow (Why local Windows + SCP?)

Due to the **legacy ARM architecture and older Linux kernel** on the Orange Pi, modern remote development tooling (like VSCode Remote-SSH) cannot connect or run its node agent on the Pi.

To facilitate quick iteration, the project uses a **dual-machine development loop**:
1. **Windows Local Workspace**: Write and test all FastAPI backend logic and static assets (HTML/JS/CSS).
2. **Automated SCP Deployment**: Use a PowerShell script (`deploy.ps1`) to recursively transfer updated files to the Orange Pi instantly.
3. **Background Services**: Run the server as a systemd background process on the Orange Pi for instant hot reload and testing.

---

## Directory Structure

* **`main.py`**: FastAPI server hosting static frontend assets, WebSocket messaging endpoints, and the script activation API.
* **`hid_mouse.py`**: Formatting for relative mouse coordinate reports (with scroll wheel) and keyboard emulation. Includes local Windows fallback logs so that testing doesn't crash on desktop hosts.
* **`setup_gadget.sh`**: The target bash configuration script. Installs `libcomposite` and configures kernel USB HID endpoints.
* **`pi_pad.service`**: Linux systemd unit file to enable starting the service as `root` automatically on system boot.
* **`requirements.txt`**: Python third-party dependencies (`fastapi`, `uvicorn`, `websockets`).
* **`deploy.ps1`**: PowerShell script that switches directories to the script root and copies updated files using `scp`.
* **`static/` & `templates/`**: White-themed minimalist touchscreen touchpad assets with dashed quadrant grids.
* **`test_hid_keyboard.py` & `test_hid_mouse.py`**: Local python test scripts to check physical USB HID writes directly on the Orange Pi.

---

## Windows Sync Setup

### Step 1: Configure Credentials
Open **`deploy.ps1`** on your local Windows PC and configure your Orange Pi credentials at the top:
```powershell
$OPI_IP = "op1-case"      # Orange Pi host IP or Hostname
$OPI_USER = "op1"         # Orange Pi username
```

### Step 2: Run deployment script
Run the deployment script in your local PowerShell terminal to upload files via SCP:
```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```
