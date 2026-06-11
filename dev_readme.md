# Pi Pad - Developer Guide & Workspace Setup

This document explains the development environment, synchronization workflow, diagnostics tools, and how to upload the project to GitHub.

---

## 1. Development Architecture

Due to the **legacy ARM architecture and older Linux kernel** on the Orange Pi, modern remote development extensions (like VSCode Remote-SSH) cannot execute their node agents on the Pi.

To facilitate quick iteration, the project uses a **dual-machine development loop**:
1. **Windows Local Workspace**: Write and test all FastAPI backend logic and static assets (HTML/JS/CSS).
2. **Automated SCP Deployment**: Use a PowerShell script (`deploy.ps1`) to recursively transfer updated files to the Orange Pi instantly.
3. **Debugging Console**: Run the server manually on the Orange Pi via SSH (`sudo python3 -m uvicorn...`) to review live console output.

---

## 2. Directory Structure

* **`main.py`**: FastAPI server hosting static frontend assets, WebSocket messaging endpoints, and the USB initialization API.
* **`hid_mouse.py`**: Controller packing mouse coordinates (relative 4-byte report with vertical scroll wheel) and keyboard scan codes.
* **`setup_gadget.sh`**: The target bash configuration script. Installs `libcomposite` and configures kernel USB HID endpoints.
* **`pi_pad.service`**: Linux systemd unit file to enable starting the service as `root` automatically on system boot.
* **`requirements.txt`**: Python third-party dependencies (`fastapi`, `uvicorn`, `websockets`).
* **`deploy.ps1`**: PowerShell script that copies updated files using `scp` to the Orange Pi.
* **`static/` & `templates/`**: White-themed minimalist touchscreen touchpad assets with dashed quadrant grids.
* **`test_hid_keyboard.py`**: Diagnostics script that types `hello world!` on the host PC after a 3-second delay.
* **`test_hid_mouse.py`**: Diagnostics script that moves the cursor in a square pattern using relative coordinates.
* **`.gitignore`**: Excludes Python caches and local temporary logs.

---

## 3. Local Workspace Setup & Sync

### Step 1: Configure Credentials
Open **`deploy.ps1`** on your local Windows PC and configure your Orange Pi credentials at the top:
```powershell
$OPI_IP = "op1-case"      # Orange Pi host IP or Hostname
$OPI_USER = "op1"         # Orange Pi username
```

### Step 2: Run Deployment
Run the deployment script in your local PowerShell terminal to upload files via SCP:
```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

---

## 4. Diagnostics & Testing

If the mouse or keyboard is unresponsive, SSH into your Orange Pi, navigate to `~/pi_pad`, and run the diagnostics scripts directly to bypass the web/socket layers:

* **Keyboard Test**:
  ```bash
  sudo python3 test_hid_keyboard.py
  ```
* **Mouse Test**:
  ```bash
  sudo python3 test_hid_mouse.py
  ```

---

## 5. GitHub Repository Upload Guide

Follow these steps to upload your local repository to a new public GitHub repository:

### Step 1: Create a New Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Set the repository name to `pi_pad`.
3. Select **Public**.
4. **Do NOT** check "Add a README file", "Add .gitignore", or "Choose a license" (since these files already exist in this folder).
5. Click **Create repository**.

### Step 2: Push Local Git Commits
Open your local Windows PowerShell terminal in the project directory and run the following commands (replace `<YOUR_GITHUB_USERNAME>` with your actual GitHub username):
```powershell
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/pi_pad.git
git push -u origin main
```
