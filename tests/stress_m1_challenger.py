"""
Milestone 1 Empirical Stress Test Harness — Challenger 1
Tests:
1. Multi-Viewport Width Scan (160px, 280px, 300px, 320px, 360px, 375px, 390px, 414px, 480px) across all storefront pages
2. Rapid Drawer Toggle Stress (20 cycles via JS & click)
3. Safe-Area-Inset Behavior & Fallback Verification
"""

import sys
import os
import json
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from tests.server import LocalServer
from tests.chrome_cdp import ChromeCDP

PAGES = [
    "index.html",
    "pecas.html",
    "colecoes.html",
    "novidades.html",
    "casa-gold.html",
    "cliente.html",
    "produtos/vestido-sol-dourado.html"
]

VIEWPORTS = [160, 280, 300, 320, 360, 375, 390, 414, 480]

def run_stress_suite():
    results = {
        "header_investigation": {},
        "viewport_scan": {},
        "drawer_stress": {},
        "safe_area": {},
        "summary": {}
    }

    server = LocalServer(port=8095)
    server.start()
    print(f"Local server started on {server.base_url}")

    cdp = ChromeCDP(port=9235)
    cdp.start()
    print("Chrome CDP started on port 9235")

    try:
        # -------------------------------------------------------------
        # Part 1: Header & Shared UI DOM Structure
        # -------------------------------------------------------------
        print("\n--- PART 1: HEADER & SHARED UI INJECTION CHECK ---")
        url = f"{server.base_url}/index.html"
        cdp.navigate(url)
        time.sleep(0.5)

        header_info = cdp.evaluate("""
        (() => {
            const h = document.querySelector('.gc-header');
            const hInner = document.querySelector('.gc-header-inner');
            const menuBtn = document.querySelector('.gc-header-menu-btn');
            const logoBrand = document.querySelector('.gc-logo-brand');
            const logoImg = document.querySelector('.gc-logo-official-img');
            const actions = document.querySelector('.gc-header-actions');
            const cartTrigger = document.querySelector('#gcCartTrigger');
            const bottomBar = document.querySelector('#gcMobileBar');
            const drawer = document.querySelector('#gcMobileNavDrawer');
            const backdrop = document.getElementById('gcMobileNavBackdrop');

            const hRect = h ? h.getBoundingClientRect() : null;
            const menuRect = menuBtn ? menuBtn.getBoundingClientRect() : null;
            const logoRect = logoBrand ? logoBrand.getBoundingClientRect() : null;
            const actionsRect = actions ? actions.getBoundingClientRect() : null;

            return {
                hasHeader: Boolean(h),
                hasHeaderInner: Boolean(hInner),
                hasMenuBtn: Boolean(menuBtn),
                hasLogoBrand: Boolean(logoBrand),
                hasLogoImg: Boolean(logoImg),
                hasActions: Boolean(actions),
                hasCartTrigger: Boolean(cartTrigger),
                hasBottomBar: Boolean(bottomBar),
                hasDrawer: Boolean(drawer),
                hasBackdrop: Boolean(backdrop),
                menuBtnTargetOk: menuRect ? (menuRect.width >= 44 && menuRect.height >= 44) : false,
                cartTriggerTargetOk: cartTrigger ? (cartTrigger.getBoundingClientRect().width >= 44 && cartTrigger.getBoundingClientRect().height >= 44) : false,
                menuRect: menuRect ? { left: menuRect.left, right: menuRect.right, width: menuRect.width, height: menuRect.height } : null,
                logoRect: logoRect ? { left: logoRect.left, right: logoRect.right, width: logoRect.width, height: logoRect.height } : null,
                actionsRect: actionsRect ? { left: actionsRect.left, right: actionsRect.right, width: actionsRect.width, height: actionsRect.height } : null
            };
        })()
        """)
        results["header_investigation"] = header_info
        print(f"Header Investigation: {json.dumps(header_info, indent=2)}")

        # -------------------------------------------------------------
        # Part 2: Multi-Viewport Width Scan across all pages
        # -------------------------------------------------------------
        print("\n--- PART 2: MULTI-VIEWPORT SCAN (160px - 480px) ---")
        viewport_failures = []
        viewport_passes = 0

        for page in PAGES:
            page_url = f"{server.base_url}/{page}"
            cdp.set_viewport(390, 800, mobile=True)
            cdp.navigate(page_url)
            time.sleep(0.4)

            page_res = {}
            for w in VIEWPORTS:
                h = 800
                cdp.set_viewport(w, h, mobile=True)
                time.sleep(0.15)

                overflow_eval = cdp.evaluate("""
                (() => {
                    const docWidth = document.documentElement.clientWidth;
                    const docScroll = document.documentElement.scrollWidth;
                    const winInner = window.innerWidth;
                    const bodyScroll = document.body ? document.body.scrollWidth : 0;

                    // Elements causing overflow
                    const overflowing = [];
                    const all = document.querySelectorAll('*');
                    for (const el of all) {
                        const r = el.getBoundingClientRect();
                        if (r.right > docWidth + 1.5) {
                            overflowing.push({
                                tag: el.tagName,
                                id: el.id,
                                className: el.className ? String(el.className).slice(0, 50) : '',
                                right: Math.round(r.right),
                                width: Math.round(r.width)
                            });
                        }
                    }

                    const hasOverflow = (docScroll > winInner + 1.5) || (bodyScroll > winInner + 1.5);
                    return {
                        docWidth: docWidth,
                        docScroll: docScroll,
                        winInner: winInner,
                        bodyScroll: bodyScroll,
                        overflowCount: overflowing.length,
                        hasOverflow: hasOverflow,
                        samples: overflowing.slice(0, 5)
                    };
                })()
                """)

                passed = not overflow_eval["hasOverflow"]
                if passed:
                    viewport_passes += 1
                else:
                    viewport_failures.append({
                        "page": page,
                        "viewport": w,
                        "data": overflow_eval
                    })
                page_res[f"{w}px"] = {
                    "passed": passed,
                    "docScroll": overflow_eval["docScroll"],
                    "winInner": overflow_eval["winInner"],
                    "overflowCount": overflow_eval["overflowCount"],
                    "samples": overflow_eval["samples"]
                }
                status_str = "PASS" if passed else f"FAIL (scrollWidth: {overflow_eval['docScroll']} > innerWidth: {overflow_eval['winInner']})"
                print(f"[{status_str}] Page: {page} @ {w}px")

            results["viewport_scan"][page] = page_res

        # -------------------------------------------------------------
        # Part 3: Rapid Drawer Open/Close Stress (20 cycles)
        # -------------------------------------------------------------
        print("\n--- PART 3: RAPID DRAWER TOGGLE STRESS (20 CYCLES) ---")
        cdp.set_viewport(390, 844, mobile=True)
        cdp.navigate(f"{server.base_url}/index.html")
        time.sleep(0.4)

        drawer_stress_result = cdp.evaluate("""
        (() => {
            const btn = document.querySelector('#gcMobileNavToggle') || document.querySelector('.gc-header-menu-btn');
            const drawer = document.getElementById('gcMobileNavDrawer');
            const backdrop = document.getElementById('gcMobileNavBackdrop');
            if (!btn || !drawer || !backdrop) {
                return { error: 'Drawer elements missing', btn: Boolean(btn), drawer: Boolean(drawer), backdrop: Boolean(backdrop) };
            }

            const cycleLog = [];
            let errorDetected = false;

            for (let i = 1; i <= 20; i++) {
                // 1. OPEN
                btn.click();
                const afterOpen = {
                    drawerHasOpen: drawer.classList.contains('open'),
                    backdropHasOpen: backdrop.classList.contains('open'),
                    bodyHasScrollLocked: document.body.classList.contains('gc-scroll-locked')
                };

                if (!afterOpen.drawerHasOpen || !afterOpen.backdropHasOpen || !afterOpen.bodyHasScrollLocked) {
                    errorDetected = true;
                }

                // 2. CLOSE (vary closing method across cycles)
                if (i % 3 === 0) {
                    // ESC key
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
                } else if (i % 2 === 0) {
                    // Backdrop click
                    backdrop.click();
                } else {
                    // Close button or nav link click
                    const closeBtn = document.getElementById('gcMobileNavClose');
                    if (closeBtn) closeBtn.click();
                    else backdrop.click();
                }

                const afterClose = {
                    drawerHasOpen: drawer.classList.contains('open'),
                    backdropHasOpen: backdrop.classList.contains('open'),
                    bodyHasScrollLocked: document.body.classList.contains('gc-scroll-locked'),
                    bodyOverflow: window.getComputedStyle(document.body).overflow
                };

                if (afterClose.drawerHasOpen || afterClose.backdropHasOpen || afterClose.bodyHasScrollLocked) {
                    errorDetected = true;
                }

                if (i === 1 || i === 10 || i === 20) {
                    cycleLog.push({ cycle: i, afterOpen, afterClose });
                }
            }

            const finalBodyLocked = document.body.classList.contains('gc-scroll-locked');
            const finalDrawerOpen = drawer.classList.contains('open');
            const finalBackdropOpen = backdrop.classList.contains('open');
            const finalBodyOverflow = window.getComputedStyle(document.body).overflow;

            return {
                totalCycles: 20,
                errorDetected: errorDetected,
                finalBodyLocked: finalBodyLocked,
                finalDrawerOpen: finalDrawerOpen,
                finalBackdropOpen: finalBackdropOpen,
                finalBodyOverflow: finalBodyOverflow,
                success: !errorDetected && !finalBodyLocked && !finalDrawerOpen && !finalBackdropOpen && (finalBodyOverflow !== 'hidden'),
                cycleLog: cycleLog
            };
        })()
        """)
        results["drawer_stress"] = drawer_stress_result
        print(f"Drawer Stress Results: {json.dumps(drawer_stress_result, indent=2)}")

        # -------------------------------------------------------------
        # Part 4: Safe Area Inset Computation
        # -------------------------------------------------------------
        print("\n--- PART 4: SAFE-AREA-INSET COMPUTATION ---")
        safe_area_res = cdp.evaluate("""
        (() => {
            const root = document.documentElement;
            const cs = window.getComputedStyle(root);
            const safeTop = cs.getPropertyValue('--safe-top').trim();
            const safeBottom = cs.getPropertyValue('--safe-bottom').trim();

            const bottomBar = document.getElementById('gcMobileBar');
            const defaultBottomBarPadding = bottomBar ? window.getComputedStyle(bottomBar).paddingBottom : null;
            const defaultBodyPadding = window.getComputedStyle(document.body).paddingBottom;

            // Simulate iOS notch / home indicator: override CSS property on :root
            root.style.setProperty('--safe-bottom', '34px');
            const simulatedBottomBarPadding = bottomBar ? window.getComputedStyle(bottomBar).paddingBottom : null;

            // In luxury-core.css: body has padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px))
            // and bottom bar has padding-bottom: env(safe-area-inset-bottom, 0px)

            root.style.removeProperty('--safe-bottom');

            return {
                declaredSafeTop: safeTop,
                declaredSafeBottom: safeBottom,
                defaultBottomBarPadding: defaultBottomBarPadding,
                defaultBodyPadding: defaultBodyPadding,
                simulatedBottomBarPadding: simulatedBottomBarPadding,
                bodyHasSafePadding: parseFloat(defaultBodyPadding) >= 56
            };
        })()
        """)
        results["safe_area"] = safe_area_res
        print(f"Safe Area Results: {json.dumps(safe_area_res, indent=2)}")

        # -------------------------------------------------------------
        # Summary & Verdict Calculation
        # -------------------------------------------------------------
        total_viewport_tests = len(PAGES) * len(VIEWPORTS)
        results["summary"] = {
            "total_viewport_tests": total_viewport_tests,
            "viewport_passes": viewport_passes,
            "viewport_failures_count": len(viewport_failures),
            "viewport_failures": viewport_failures,
            "drawer_stress_passed": drawer_stress_result.get("success", False),
            "header_present": header_info.get("hasHeader", False),
            "menu_touch_target_ok": header_info.get("menuBtnTargetOk", False),
            "overall_verdict": "APPROVE" if (len(viewport_failures) == 0 and drawer_stress_result.get("success", False) and header_info.get("hasHeader", False)) else "REQUEST_CHANGES"
        }

        print("\n================== SUMMARY ==================")
        print(f"Total Viewport Tests: {total_viewport_tests}")
        print(f"Passed: {viewport_passes}, Failed: {len(viewport_failures)}")
        print(f"Drawer Stress Passed: {drawer_stress_result.get('success', False)}")
        print(f"Header Present: {header_info.get('hasHeader', False)}")
        print(f"OVERALL VERDICT: {results['summary']['overall_verdict']}")
        print("=============================================\n")

        with open("tests/stress_results.json", "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)

    finally:
        cdp.close()
        server.stop()

if __name__ == "__main__":
    run_stress_suite()
