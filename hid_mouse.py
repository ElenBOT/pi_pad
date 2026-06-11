import struct
import os
import logging

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pi_pad_hid")

# Device nodes defined in the setup script
MOUSE_DEV = "/dev/hidg1"
KEYBOARD_DEV = "/dev/hidg0"

# Constants
COORD_MIN = 0
COORD_MAX = 32767
COORD_CENTER = 16384

# Key codes for scrolling / fallback keyboard simulation
KEY_PAGE_UP = 0x4B
KEY_PAGE_DOWN = 0x4E
KEY_ARROW_UP = 0x52
KEY_ARROW_DOWN = 0x51

class HIDController:
    def __init__(self, mouse_dev=MOUSE_DEV, keyboard_dev=KEYBOARD_DEV):
        self.mouse_dev_path = mouse_dev
        self.keyboard_dev_path = keyboard_dev
        
        # Virtual position for absolute mouse
        self.current_x = COORD_CENTER
        self.current_y = COORD_CENTER
        
        # Button mask (bit 0: left, bit 1: right, bit 2: middle)
        self.button_mask = 0
        
        # Check if we are running in dummy/local fallback mode
        self.mouse_available = os.path.exists(self.mouse_dev_path)
        self.keyboard_available = os.path.exists(self.keyboard_dev_path)
        
        if not self.mouse_available:
            logger.warning(f"Mouse device {self.mouse_dev_path} not found. Running in dummy mode.")
        if not self.keyboard_available:
            logger.warning(f"Keyboard device {self.keyboard_dev_path} not found. Running in dummy mode.")

    def _write_mouse_report(self, dx=0, dy=0, wheel=0):
        # Format: bbbb (1 byte buttons, 1 byte dx, 1 byte dy, 1 byte wheel)
        clamp_dx = max(-127, min(127, int(dx)))
        clamp_dy = max(-127, min(127, int(dy)))
        clamp_wheel = max(-127, min(127, int(wheel)))
        report = struct.pack('bbbb', self.button_mask, clamp_dx, clamp_dy, clamp_wheel)
        if self.mouse_available:
            try:
                with open(self.mouse_dev_path, 'wb') as fd:
                    fd.write(report)
            except Exception as e:
                logger.error(f"Failed to write mouse report: {e}")
        else:
            logger.debug(f"[DUMMY MOUSE] Buttons: {self.button_mask:03b}, dX: {clamp_dx}, dY: {clamp_dy}, Wheel: {clamp_wheel}")

    def _write_keyboard_report(self, modifiers=0, keys=[0, 0, 0, 0, 0, 0]):
        # Format: BBBBBBBB (8 bytes: modifier, reserved, key1-6)
        report = struct.pack('BBBBBBBB', modifiers, 0, *keys)
        if self.keyboard_available:
            try:
                with open(self.keyboard_dev_path, 'wb') as fd:
                    fd.write(report)
                logger.info(f"Wrote HID keyboard report to {self.keyboard_dev_path}: mod={modifiers}, keys={keys}")
            except Exception as e:
                logger.error(f"Failed to write keyboard report: {e}")
        else:
            logger.info(f"[DUMMY KEYBOARD] Modifiers: {modifiers}, Keys: {keys}")

    def move_relative(self, dx, dy, sensitivity=1.0):
        # Write relative displacement directly (wheel = 0)
        self._write_mouse_report(dx * sensitivity, dy * sensitivity, 0)

    def set_button(self, button, pressed):
        # Update button mask based on left/right/middle button state
        # left = bit 0 (value 1), right = bit 1 (value 2), middle = bit 2 (value 4)
        bit_val = 0
        if button == "left":
            bit_val = 1
        elif button == "right":
            bit_val = 2
        elif button == "middle":
            bit_val = 4
            
        if pressed:
            self.button_mask |= bit_val
        else:
            self.button_mask &= ~bit_val
            
        self._write_mouse_report(0, 0, 0)

    def click(self, button):
        # Quick press and release
        self.set_button(button, True)
        self.set_button(button, False)

    def trigger_scroll(self, direction):
        # Emulate scroll by writing relative mouse wheel scroll report
        # Positive 1 scrolls up, Negative -1 scrolls down
        val = 1 if direction == "up" else -1
        self._write_mouse_report(0, 0, val)

    def reset_position(self):
        # Reset mouse state
        self.button_mask = 0
        self._write_mouse_report(0, 0, 0)
        # Release keyboard key resets
        self._write_keyboard_report()

    def send_keyboard_key(self, key_str):
        if key_str in ASCII_TO_HID:
            modifiers, keycode = ASCII_TO_HID[key_str]
            # Write key press report
            self._write_keyboard_report(modifiers=modifiers, keys=[keycode, 0, 0, 0, 0, 0])
            # Write key release report (all zeroes)
            self._write_keyboard_report()
        else:
            logger.warning(f"Key '{key_str}' not mapped to HID code.")

    def send_shortcut(self, name):
        if name == "shift":
            # Press and release Left Shift (0x02 modifier) to toggle Chinese/English input method
            self._write_keyboard_report(modifiers=0x02)
            self._write_keyboard_report()
            logger.info("Sent Shift key toggle shortcut")
        elif name == "copy":
            # Press Ctrl+C (Left Ctrl = 0x01 modifier, 'c' = 0x06 keycode)
            self._write_keyboard_report(modifiers=0x01, keys=[0x06, 0, 0, 0, 0, 0])
            self._write_keyboard_report()
            logger.info("Sent Ctrl+C copy shortcut")
        elif name == "paste":
            # Press Ctrl+V (Left Ctrl = 0x01 modifier, 'v' = 0x19 keycode)
            self._write_keyboard_report(modifiers=0x01, keys=[0x19, 0, 0, 0, 0, 0])
            self._write_keyboard_report()
            logger.info("Sent Ctrl+V paste shortcut")


# USB HID keyboard lookup dictionary
ASCII_TO_HID = {}

# Map lower case a-z
for i in range(26):
    char = chr(ord('a') + i)
    ASCII_TO_HID[char] = (0, 0x04 + i)

# Map upper case A-Z
for i in range(26):
    char = chr(ord('A') + i)
    ASCII_TO_HID[char] = (0x02, 0x04 + i)

# Map digits 1-9
for i in range(9):
    char = chr(ord('1') + i)
    ASCII_TO_HID[char] = (0, 0x1E + i)
ASCII_TO_HID['0'] = (0, 0x27)

# Special characters
ASCII_TO_HID[' '] = (0, 0x2C)
ASCII_TO_HID['\n'] = (0, 0x28)
ASCII_TO_HID['\r'] = (0, 0x28)
ASCII_TO_HID['\t'] = (0, 0x2B)

# Symbols with Shift (for standard US keyboard layout)
ASCII_TO_HID['!'] = (0x02, 0x1E)
ASCII_TO_HID['@'] = (0x02, 0x1F)
ASCII_TO_HID['#'] = (0x02, 0x20)
ASCII_TO_HID['$'] = (0x02, 0x21)
ASCII_TO_HID['%'] = (0x02, 0x22)
ASCII_TO_HID['^'] = (0x02, 0x23)
ASCII_TO_HID['&'] = (0x02, 0x24)
ASCII_TO_HID['*'] = (0x02, 0x25)
ASCII_TO_HID['('] = (0x02, 0x26)
ASCII_TO_HID[')'] = (0x02, 0x27)
ASCII_TO_HID['_'] = (0x02, 0x2D)
ASCII_TO_HID['+'] = (0x02, 0x2E)
ASCII_TO_HID['{'] = (0x02, 0x2F)
ASCII_TO_HID['}'] = (0x02, 0x30)
ASCII_TO_HID['|'] = (0x02, 0x31)
ASCII_TO_HID[':'] = (0x02, 0x33)
ASCII_TO_HID['"'] = (0x02, 0x34)
ASCII_TO_HID['~'] = (0x02, 0x35)
ASCII_TO_HID['<'] = (0x02, 0x36)
ASCII_TO_HID['>'] = (0x02, 0x37)
ASCII_TO_HID['?'] = (0x02, 0x38)

# Symbols without Shift
ASCII_TO_HID['-'] = (0, 0x2D)
ASCII_TO_HID['='] = (0, 0x2E)
ASCII_TO_HID['['] = (0, 0x2F)
ASCII_TO_HID[']'] = (0, 0x30)
ASCII_TO_HID['\\'] = (0, 0x31)
ASCII_TO_HID[';'] = (0, 0x33)
ASCII_TO_HID["'"] = (0, 0x34)
ASCII_TO_HID['`'] = (0, 0x35)
ASCII_TO_HID[','] = (0, 0x36)
ASCII_TO_HID['.'] = (0, 0x37)
ASCII_TO_HID['/'] = (0, 0x38)

# Control/Command Keys
ASCII_TO_HID['Backspace'] = (0, 0x2A)
ASCII_TO_HID['Enter'] = (0, 0x28)
ASCII_TO_HID['Tab'] = (0, 0x2B)
ASCII_TO_HID['Escape'] = (0, 0x29)
ASCII_TO_HID['ArrowUp'] = (0, 0x52)
ASCII_TO_HID['ArrowDown'] = (0, 0x51)
ASCII_TO_HID['ArrowLeft'] = (0, 0x50)
ASCII_TO_HID['ArrowRight'] = (0, 0x4F)

