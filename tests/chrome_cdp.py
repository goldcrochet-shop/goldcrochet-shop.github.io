"""
Chrome DevTools Protocol (CDP) client for Gold Crochet E2E Tests.
Connects directly to Headless Google Chrome over WebSocket with zero external npm dependencies.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
import urllib.error
import websocket

class ChromeCDP:
    def __init__(self, port=9228, chrome_path=None, headless=True):
        self.port = port
        self.headless = headless
        self.chrome_path = chrome_path or self._find_chrome()
        self.temp_dir = tempfile.mkdtemp(prefix="gold_crochet_cdp_")
        self.process = None
        self.ws = None
        self.msg_id = 0
        self.pending_responses = {}
        self.events = []

    def _find_chrome(self):
        candidates = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%PROGRAMFILES%\Google\Chrome\Application\chrome.exe"),
            shutil.which("chrome"),
            shutil.which("google-chrome"),
        ]
        for path in candidates:
            if path and os.path.exists(path):
                return path
        raise RuntimeError("Google Chrome executable not found on host machine.")

    def start(self):
        cmd = [
            self.chrome_path,
            f"--remote-debugging-port={self.port}",
            "--remote-allow-origins=*",
            f"--user-data-dir={self.temp_dir}",
            "--disable-extensions",
            "--disable-gpu",
            "--disable-sync",
            "--no-first-run",
            "--no-default-browser-check",
            "--window-size=375,812",
            "about:blank",
        ]
        if self.headless:
            cmd.insert(1, "--headless=new")

        self.process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Poll until CDP endpoint is ready
        version_url = f"http://127.0.0.1:{self.port}/json/version"
        start_time = time.time()
        connected = False
        while time.time() - start_time < 12.0:
            try:
                res = urllib.request.urlopen(version_url, timeout=1)
                if res.status == 200:
                    connected = True
                    break
            except Exception:
                time.sleep(0.2)
        
        if not connected:
            self.close()
            raise RuntimeError(f"Failed to connect to Chrome CDP port {self.port} within timeout.")

        # Discover page target
        list_url = f"http://127.0.0.1:{self.port}/json/list"
        res = urllib.request.urlopen(list_url, timeout=3)
        targets = json.loads(res.read().decode("utf-8"))
        page_targets = [t for t in targets if t.get("type") == "page"]
        if not page_targets:
            raise RuntimeError("No page target found in Chrome DevTools Protocol targets.")
        
        ws_url = page_targets[0]["webSocketDebuggerUrl"]
        self.ws = websocket.create_connection(ws_url, timeout=10)

        # Enable necessary CDP domains
        self.send("Page.enable")
        self.send("Runtime.enable")
        self.send("DOM.enable")

    def send(self, method, params=None, timeout=10.0):
        if not self.ws:
            raise RuntimeError("CDP WebSocket is not connected.")
        
        self.msg_id += 1
        cid = self.msg_id
        payload = {"id": cid, "method": method}
        if params is not None:
            payload["params"] = params
        
        self.ws.send(json.dumps(payload))
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if cid in self.pending_responses:
                resp = self.pending_responses.pop(cid)
                if "error" in resp:
                    raise RuntimeError(f"CDP error in {method}: {resp['error']}")
                return resp.get("result", {})
            
            try:
                raw = self.ws.recv()
                msg = json.loads(raw)
                if "id" in msg:
                    if msg["id"] == cid:
                        if "error" in msg:
                            raise RuntimeError(f"CDP error in {method}: {msg['error']}")
                        return msg.get("result", {})
                    else:
                        self.pending_responses[msg["id"]] = msg
                else:
                    self.events.append(msg)
            except websocket.WebSocketTimeoutException:
                pass
        
        raise TimeoutError(f"CDP command '{method}' (id={cid}) timed out after {timeout}s.")

    def set_viewport(self, width, height, device_scale_factor=1, mobile=True):
        self.send("Emulation.setDeviceMetricsOverride", {
            "width": int(width),
            "height": int(height),
            "deviceScaleFactor": device_scale_factor,
            "mobile": mobile,
        })
        self.send("Emulation.setTouchEmulationEnabled", {
            "enabled": mobile,
            "maxTouchPoints": 5 if mobile else 0,
        })

    def navigate(self, url, wait_load=True, timeout=10.0):
        # Drain any pending socket frames before triggering new navigation
        if self.ws:
            old_timeout = self.ws.gettimeout()
            self.ws.settimeout(0.01)
            while True:
                try:
                    raw = self.ws.recv()
                    msg = json.loads(raw)
                    if "id" in msg:
                        self.pending_responses[msg["id"]] = msg
                except (websocket.WebSocketTimeoutException, Exception):
                    break
            self.ws.settimeout(old_timeout)

        self.events.clear()
        res = self.send("Page.navigate", {"url": url}, timeout=timeout)
        
        if wait_load:
            start_time = time.time()
            loaded = False
            while time.time() - start_time < timeout:
                if any(e.get("method") == "Page.loadEventFired" for e in self.events):
                    loaded = True
                    break
                try:
                    # Drain any pending socket frames
                    raw = self.ws.recv()
                    msg = json.loads(raw)
                    if "id" in msg:
                        self.pending_responses[msg["id"]] = msg
                    else:
                        self.events.append(msg)
                        if msg.get("method") == "Page.loadEventFired":
                            loaded = True
                            break
                except websocket.WebSocketTimeoutException:
                    pass
                time.sleep(0.05)
            
            # If not about:blank, verify document.readyState is interactive or complete
            if url != "about:blank":
                ready_start = time.time()
                while time.time() - ready_start < timeout:
                    try:
                        state = self.evaluate("document.readyState", timeout=1.0)
                        if state in ("interactive", "complete"):
                            break
                    except Exception:
                        pass
                    time.sleep(0.05)

            # Settlement delay for dynamic script evaluation (e.g. shared-ui.js runtime injection)
            time.sleep(0.3)
        return res

    def evaluate(self, expression, timeout=10.0):
        res = self.send("Runtime.evaluate", {
            "expression": expression,
            "awaitPromise": True,
            "returnByValue": True,
        }, timeout=timeout)
        result = res.get("result", {})
        if "value" in result:
            return result["value"]
        if result.get("type") == "undefined":
            return None
        return result

    def get_element_rect(self, selector):
        js = f"""
        (() => {{
            const el = document.querySelector({json.dumps(selector)});
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {{
                top: r.top,
                left: r.left,
                width: r.width,
                height: r.height,
                bottom: r.bottom,
                right: r.right
            }};
        }})()
        """
        return self.evaluate(js)

    def get_computed_style(self, selector, property_name):
        js = f"""
        (() => {{
            const el = document.querySelector({json.dumps(selector)});
            if (!el) return null;
            return window.getComputedStyle(el).getPropertyValue({json.dumps(property_name)});
        }})()
        """
        return self.evaluate(js)

    def click(self, selector):
        js = f"""
        (() => {{
            const el = document.querySelector({json.dumps(selector)});
            if (!el) return false;
            el.scrollIntoView({{ block: 'center', inline: 'center' }});
            el.click();
            return true;
        }})()
        """
        return self.evaluate(js)

    def set_prefers_reduced_motion(self, reduce=True):
        self.send("Emulation.setEmulatedMedia", {
            "features": [{
                "name": "prefers-reduced-motion",
                "value": "reduce" if reduce else "no-preference"
            }]
        })

    def clear_local_storage(self):
        try:
            return self.evaluate("try { localStorage.clear(); sessionStorage.clear(); } catch(e){} true;")
        except Exception:
            return True

    def get_local_storage(self, key):
        js = f"localStorage.getItem({json.dumps(key)})"
        return self.evaluate(js)

    def set_local_storage(self, key, value):
        js = f"localStorage.setItem({json.dumps(key)}, {json.dumps(value)});"
        return self.evaluate(js)

    def close(self):
        if self.ws:
            try:
                self.ws.close()
            except Exception:
                pass
            self.ws = None
        
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=2)
            except Exception:
                try:
                    self.process.kill()
                except Exception:
                    pass
            self.process = None
            
        if self.temp_dir and os.path.exists(self.temp_dir):
            try:
                shutil.rmtree(self.temp_dir, ignore_errors=True)
            except Exception:
                pass

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

if __name__ == "__main__":
    with ChromeCDP(port=9228) as chrome:
        print("Chrome CDP successfully initialized!")
        chrome.set_viewport(375, 667)
        chrome.navigate("https://example.com")
        title = chrome.evaluate("document.title")
        print("Page title:", title)
