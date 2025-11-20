from playwright.sync_api import sync_playwright
import time

def verify_map():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8080")

        # Wait for the map and prayer zones to render
        # Since data loading is async, we wait a bit or wait for element
        try:
            page.wait_for_selector(".country", timeout=5000)
            page.wait_for_selector(".prayer-zone", timeout=10000)
        except:
            print("Timed out waiting for selectors")

        # Take a screenshot
        page.screenshot(path="verification/map_screenshot.png")
        browser.close()

if __name__ == "__main__":
    verify_map()