"""
Base Test Case for Gold Crochet E2E Test Suite.
Provides headless Chrome CDP fixture, local server management, and DOM/geometry verification helpers.
"""

import json
import re
import unittest
from tests.server import LocalServer
from tests.chrome_cdp import ChromeCDP

class BaseE2ETest(unittest.TestCase):
    server = None
    cdp = None

    @classmethod
    def setUpClass(cls):
        if cls.server is None:
            cls.server = LocalServer(port=8088)
            cls.server.start()
        if cls.cdp is None:
            cls.cdp = ChromeCDP(port=9228)
            cls.cdp.start()

    @classmethod
    def tearDownClass(cls):
        # Kept alive across tests in suite; master runner terminates if needed,
        # or closed if run standalone
        pass

    def setUp(self):
        # Default mobile viewport: iPhone 14 / modern smartphone (390x844)
        self.cdp.set_viewport(390, 844, mobile=True)
        # Reset storage
        self.cdp.navigate("about:blank")
        self.cdp.clear_local_storage()

    def navigate_page(self, path="index.html", width=390, height=844):
        self.cdp.set_viewport(width, height, mobile=True)
        url = f"{self.server.base_url}/{path.lstrip('/')}"
        self.cdp.navigate(url)
        return url

    def evaluate(self, js_code):
        return self.cdp.evaluate(js_code)

    def assert_element_exists(self, selector, msg=None):
        exists = self.evaluate(f"document.querySelector({json.dumps(selector)}) !== null")
        self.assertTrue(exists, msg or f"Expected element '{selector}' to exist in DOM")

    def assert_element_visible(self, selector, msg=None):
        js = f"""
        (() => {{
            const el = document.querySelector({json.dumps(selector)});
            if (!el) return false;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
        }})()
        """
        self.assertTrue(self.evaluate(js), msg or f"Expected element '{selector}' to be visible")

    def assert_no_horizontal_overflow(self, max_allowed_width=None):
        js = """
        (() => {
            const docWidth = document.documentElement.clientWidth;
            const docScroll = document.documentElement.scrollWidth;
            const bodyScroll = document.body ? document.body.scrollWidth : 0;
            const winInner = window.innerWidth;
            
            // Scan elements causing overflow
            const overflowing = [];
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                const r = el.getBoundingClientRect();
                if (r.right > docWidth + 1) { // 1px threshold for subpixel rounding
                    overflowing.push({
                        tag: el.tagName,
                        id: el.id,
                        className: el.className,
                        right: r.right,
                        width: r.width
                    });
                }
            }
            return {
                docWidth: docWidth,
                docScroll: docScroll,
                bodyScroll: bodyScroll,
                overflowCount: overflowing.length,
                samples: overflowing.slice(0, 5)
            };
        })()
        """
        res = self.evaluate(js)
        doc_width = res["docWidth"]
        doc_scroll = res["docScroll"]
        body_scroll = res["bodyScroll"]
        
        self.assertLessEqual(
            doc_scroll,
            doc_width + 1,
            f"Horizontal overflow detected! docScroll={doc_scroll} > docWidth={doc_width}. Samples: {res['samples']}"
        )
        self.assertLessEqual(
            body_scroll,
            doc_width + 1,
            f"Horizontal overflow in body! bodyScroll={body_scroll} > docWidth={doc_width}. Samples: {res['samples']}"
        )

    def assert_min_touch_target(self, selector, min_dimension=44):
        rect = self.cdp.get_element_rect(selector)
        self.assertIsNotNone(rect, f"Element '{selector}' not found to test touch target")
        self.assertGreaterEqual(
            rect["width"],
            min_dimension - 0.5,
            f"Touch target width for '{selector}' is {rect['width']}px, expected >= {min_dimension}px"
        )
        self.assertGreaterEqual(
            rect["height"],
            min_dimension - 0.5,
            f"Touch target height for '{selector}' is {rect['height']}px, expected >= {min_dimension}px"
        )

    def get_color_contrast_ratio(self, fg_color_str, bg_color_str):
        # Convert hex/rgb to luminance and return ratio
        js = f"""
        (() => {{
            function parseRgb(c) {{
                const d = document.createElement('div');
                d.style.color = c;
                document.body.appendChild(d);
                const rgb = window.getComputedStyle(d).color.match(/\\d+/g).map(Number);
                document.body.removeChild(d);
                return rgb;
            }}
            function lum(r, g, b) {{
                const a = [r, g, b].map(v => {{
                    v /= 255;
                    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
                }});
                return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
            }}
            const [r1, g1, b1] = parseRgb({json.dumps(fg_color_str)});
            const [r2, g2, b2] = parseRgb({json.dumps(bg_color_str)});
            const l1 = lum(r1, g1, b1);
            const l2 = lum(r2, g2, b2);
            return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        }})()
        """
        return self.evaluate(js)
