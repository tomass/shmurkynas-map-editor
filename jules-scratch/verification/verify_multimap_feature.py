import re
from playwright.sync_api import sync_playwright, Page, expect

def test_multimap_feature(page: Page):
    """
    This test verifies the multi-map functionality:
    1. Checks the initial state.
    2. Creates a new map.
    3. Renames the new map.
    4. Switches back to the original map.
    5. Takes a screenshot for visual verification.
    """
    # 1. Navigate to the application.
    page.goto("http://localhost:5173")

    # 2. Verify initial state.
    # Expect the initial map name to be "unnamed".
    map_name_input = page.get_by_placeholder("Map name")
    expect(map_name_input).to_have_value("unnamed")

    # Expect the dropdown to have one option with the text "unnamed".
    map_select = page.locator("#map-select")
    expect(map_select.locator("option")).to_have_count(1)
    expect(map_select.locator("option")).to_have_text("unnamed")

    # 3. Create a new map.
    new_map_button = page.get_by_title("Create a new map")
    new_map_button.click()

    # 4. Verify the new map is created and selected.
    # The input should now show the default name for the new map.
    expect(map_name_input).to_have_value("unnamed")

    # The dropdown should now have two "unnamed" options.
    expect(map_select.locator("option")).to_have_count(2)

    # Rename the new map.
    map_name_input.fill("My Test Map")
    # Press Enter to trigger the change event
    map_name_input.press("Enter")

    # Verify the name updated in the dropdown.
    # The second option should now be "My Test Map".
    expect(map_select.locator("option").nth(1)).to_have_text("My Test Map")

    # 5. Switch back to the first map.
    map_select.select_option(index=0)

    # Verify the name input updates back to the first map's name.
    expect(map_name_input).to_have_value("unnamed")

    # 6. Take a screenshot.
    page.screenshot(path="jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        test_multimap_feature(page)
        browser.close()

if __name__ == "__main__":
    main()