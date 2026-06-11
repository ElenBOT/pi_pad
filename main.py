from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import os
import logging
import subprocess
import platform
from hid_mouse import HIDController

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pi_pad_server")

app = FastAPI(title="Pi Pad - Touchpad Controller")

# Ensure static and templates directories exist locally
os.makedirs("static", exist_ok=True)
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)
os.makedirs("templates", exist_ok=True)

# Mount static files (HTML/JS/CSS assets)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Instantiate HID controller
hid = HIDController()

@app.post("/api/enable-hid")
async def enable_hid():
    system = platform.system().lower()
    
    # Resolve absolute path to setup_gadget.sh
    script_dir = os.path.dirname(os.path.abspath(__file__))
    script_path = os.path.join(script_dir, "setup_gadget.sh")
    
    if system == "linux":
        try:
            logger.info("Executing setup_gadget.sh script...")
            # Run the setup script with sudo
            result = subprocess.run(
                ["sudo", "bash", script_path], 
                capture_output=True, 
                text=True, 
                check=False
            )
            
            logger.info(f"Script stdout: {result.stdout}")
            if result.stderr:
                logger.error(f"Script stderr: {result.stderr}")
                
            if result.returncode == 0:
                # Re-initialize mouse and keyboard availability
                global hid
                hid = HIDController()
                return {"status": "success", "stdout": result.stdout, "stderr": result.stderr}
            else:
                return {
                    "status": "error", 
                    "message": f"Script exited with code {result.returncode}", 
                    "stdout": result.stdout, 
                    "stderr": result.stderr
                }
        except Exception as e:
            logger.error(f"Error running setup script: {e}")
            return {"status": "error", "message": str(e)}
    else:
        logger.info("[Mock] Running setup_gadget.sh on non-Linux platform")
        return {
            "status": "mock_success", 
            "stdout": "[MOCK] Successfully executed setup_gadget.sh. (Dummy interface active)", 
            "stderr": ""
        }


@app.get("/")
async def get_index():
    index_path = os.path.join("templates", "index.html")
    if not os.path.exists(index_path):
        return HTMLResponse(content="<h3>Index file not found!</h3>", status_code=404)
        
    with open(index_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info(f"WebSocket client connected from {websocket.client.host}:{websocket.client.port}")
    logger.info(f"Device status on connection: Keyboard available={hid.keyboard_available}, Mouse available={hid.mouse_available}")
    
    try:
        # Reset mouse state on connection to be clean
        hid.reset_position()
        
        while True:
            # Wait for messages from the touchscreen client
            data = await websocket.receive_json()
            event_type = data.get("type")
            
            if event_type == "move":
                dx = data.get("dx", 0)
                dy = data.get("dy", 0)
                sens = data.get("sensitivity", 1.5)
                hid.move_relative(dx, dy, sensitivity=sens)
                
            elif event_type == "click":
                button = data.get("button", "left")
                logger.info(f"Click: {button}")
                hid.click(button)
                
            elif event_type == "button":
                button = data.get("button", "left")
                state = data.get("state")
                pressed = (state == "down")
                logger.info(f"Button {button}: {'Down' if pressed else 'Up'}")
                hid.set_button(button, pressed)
                
            elif event_type == "scroll":
                direction = data.get("direction")
                logger.info(f"Scroll: {direction}")
                if direction in ["up", "down"]:
                    hid.trigger_scroll(direction)
                    
            elif event_type == "keyboard":
                key = data.get("key")
                logger.info(f"Keyboard input: {key}")
                if key:
                    hid.send_keyboard_key(key)
                    
            elif event_type == "type_string":
                text = data.get("text", "")
                logger.info(f"Typing string: {text}")
                for char in text:
                    hid.send_keyboard_key(char)

            elif event_type == "shortcut":
                name = data.get("name")
                logger.info(f"Shortcut requested: {name}")
                if name:
                    hid.send_shortcut(name)
                    
            elif event_type == "recenter":
                logger.info("Recenter requested")
                hid.reset_position()
                
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Reset position and release buttons on disconnect
        hid.reset_position()
