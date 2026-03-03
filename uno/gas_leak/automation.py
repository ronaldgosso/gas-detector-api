import json
import serial, serial.tools.list_ports, requests, time, logging, threading, base64, json
from datetime import datetime, timezone
from queue import Queue, Empty
from collections import deque

SERIAL_PORT      = "COM8"
BAUD_RATE        = 9600
SERIAL_TIMEOUT   = 2
API_ENDPOINT     = "https://gas-detector-api.vercel.app"
NEXTSMS_API_KEY  = "bae6d2a965bd6e2e584c7b60c20e0cb5"
DEVICE_ID        = "arduino-nano"
NEXTSMS_SENDER   = "RMNDR"
NEXTSMS_TO       = "0763930052"
ALERT_THRESHOLD  = 800
AVERAGE_WINDOW   = 3
MAX_RETRIES      = 3
RETRY_DELAY      = 2.0
QUEUE_SIZE       = 100


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)
data_queue = Queue(maxsize=QUEUE_SIZE)


def list_ports():
    ports = serial.tools.list_ports.comports()
    if not ports:
        log.warning("No serial ports found.")
    else:
        log.info("Available ports:")
        for p in ports:
            log.info(f"  {p.device} -- {p.description}")


def parse_reading(raw_line: str):
    line = raw_line.strip()
    if line:
        log.info(f"RAW >>> {repr(line)}")
    if not line.startswith("GAS:"):
        return None
    try:
        parts = line[4:].split(",")
        if len(parts) != 2:
            return None
        value  = int(parts[0].strip())
        status = parts[1].strip().upper()
        if status not in ("NORMAL", "ALERT"):
            return None
        return (value, status)
    except (ValueError, IndexError):
        return None


def insert_to_api(value: int, status: str, average=None, readings=None) -> bool:
    payload = {
        "device_id": DEVICE_ID,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "value":     value,
        "status":    status,
    }
    if average is not None:
        payload["average_value"] = round(average, 2)
        payload["readings"]      = readings

    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if API_KEY and API_KEY != "your-api-key-here":
        headers["Authorization"] = f"Bearer {API_KEY}"

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = requests.post(API_ENDPOINT, json=payload, headers=headers, timeout=5)
            r.raise_for_status()
            log.info(f"API OK | value={value} status={status} | HTTP {r.status_code}")
            return True
        except requests.exceptions.ConnectionError:
            log.error(f"API connection failed (attempt {attempt}/{MAX_RETRIES})")
        except requests.exceptions.Timeout:
            log.error(f"API timeout (attempt {attempt}/{MAX_RETRIES})")
        except requests.exceptions.HTTPError as e:
            log.error(f"API HTTP {e.response.status_code}: {e.response.text[:200]}")
            if 400 <= e.response.status_code < 500:
                return False
        except Exception as e:
            log.error(f"API error: {e}")
        if attempt < MAX_RETRIES:
            time.sleep(RETRY_DELAY)
    return False


def get_active_number():
    url = f"{API_ENDPOINT}/api/emergency-contacts/settings/sms-selection"
    payload = ""
    headers = {
        'Content-Type': 'application/json'
    }

    response = requests.request("GET", url, headers=headers, data=payload)
    result = json.loads(response.text)
    return result['data']['phone_number']


def send_sms(average: float, readings: list) -> bool:
    message = (
        f"GAS LEAK DETECTED! PPM: {readings}. "
        f"Average PPM: {average:.1f}. "
        f"⚠️ Immediate action required! ⚠️"
    )


    NEXTSMS_TO = get_active_number() or NEXTSMS_TO

    payload = json.dumps({
    "from": NEXTSMS_SENDER,
    #! only Vodacom Numbers
    "to": NEXTSMS_TO,
    "text": message,
    "flash": 0,
    "reference": "xaefcgt"
    })
    
    headers = {
        "Content-Type":  "application/json",
        "Accept":        "application/json",
        "Authorization": f"Bearer {NEXTSMS_API_KEY}",
    }

    url = "https://messaging-service.co.tz/api/sms/v2/text/single"

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = requests.request(
                "POST",
                url,
                data=payload, headers=headers
            )
            r.raise_for_status()
            log.info(f"SMS SENT | avg={average:.1f} | to={NEXTSMS_TO} | HTTP {r.status_code} | Response {r.text}")
            return True
        except requests.exceptions.ConnectionError:
            log.error(f"SMS connection failed (attempt {attempt}/{MAX_RETRIES})")
        except requests.exceptions.Timeout:
            log.error(f"SMS timeout (attempt {attempt}/{MAX_RETRIES})")
        except requests.exceptions.HTTPError as e:
            log.error(f"SMS HTTP {e.response.status_code}: {e.response.text[:200]}")
            if 400 <= e.response.status_code < 500:
                return False
        except Exception as e:
            log.error(f"SMS error: {e}")
        if attempt < MAX_RETRIES:
            time.sleep(RETRY_DELAY)
    return False


def api_sender_thread():
    log.info("Sender thread started.")
    while True:
        try:
            item = data_queue.get(timeout=1)
            if item is None:
                break
            task, data = item
            if task == "alert":
                average, readings, last_value = data
                log.warning(f"ALERT CONFIRMED | avg={average:.1f} | readings={readings}")
                insert_to_api(last_value, "ALERT", average=average, readings=readings)
                send_sms(average, readings)
            elif task == "normal":
                value = data
                insert_to_api(value, "NORMAL")
            data_queue.task_done()
        except Empty:
            continue
        except Exception as e:
            log.error(f"Sender error: {e}")
    log.info("Sender thread stopped.")


def read_serial():
    log.info(f"Connecting to {SERIAL_PORT} at {BAUD_RATE} baud...")
    sender = threading.Thread(target=api_sender_thread, daemon=True)
    sender.start()
    buffer = deque(maxlen=AVERAGE_WINDOW)
    try:
        with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=SERIAL_TIMEOUT) as ser:
            log.info("Connected! Reading MQ sensor... (Ctrl+C to stop)\n")
            ser.reset_input_buffer()
            time.sleep(2)
            while True:
                raw_line = ser.readline().decode("utf-8", errors="replace")
                result = parse_reading(raw_line)
                if result is None:
                    continue
                value, status = result
                buffer.append(value)
                log.info(f"Buffering: {list(buffer)} ({len(buffer)}/{AVERAGE_WINDOW})")
                if len(buffer) < AVERAGE_WINDOW:
                    continue
                average = sum(buffer) / AVERAGE_WINDOW
                if average >= ALERT_THRESHOLD:
                    data_queue.put(("alert", (average, list(buffer), value)))
                else:
                    data_queue.put(("normal", value))
                buffer.clear()
    except serial.SerialException as e:
        log.error(f"Serial error: {e}")
    except KeyboardInterrupt:
        log.info("\nStopped by user.")
    finally:
        data_queue.put(None)
        sender.join(timeout=5)
        log.info("Shutdown complete.")


if __name__ == "__main__":
    # list_ports()
    # send_sms(average=100, readings=[100, 100, 100])
    # read_serial()
    get_active_number()