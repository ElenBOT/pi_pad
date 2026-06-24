# Pi Pad - Developer Guide & Workspace Setup
Due to the **legacy ARM architecture and older Linux kernel** on the Orange Pi, modern remote development extensions (like VSCode Remote-SSH) cannot execute their node agents on the Pi. This document explains the development environment, synchronization workflow, diagnostics tools, and how to upload the project to GitHub.

---

## Use deploy.ps1

Open **`deploy.ps1`** on your local Windows PC and configure your Orange Pi credentials at the top:
```powershell
$OPI_IP = "op1-case"      # Orange Pi host IP or Hostname
$OPI_USER = "op1"         # Orange Pi username
```

Run the deployment script in your local PowerShell terminal to upload files via SCP:
```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

---

## Developer Diagnostics

If you need to test the server logic, you can run the diagnostics scripts directly via SSH:
- Keyboard Test: `sudo ./venv/bin/python3 test_hid_keyboard.py`
- Mouse Test: `sudo ./venv/bin/python3 test_hid_mouse.py`
