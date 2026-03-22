const { createChromeMock } = require("./helpers/chrome-mock");

describe("popup.js", () => {
  let chromeMock;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML =
      '<input type="checkbox" id="toggle" checked>';
    chromeMock = createChromeMock();
    global.chrome = chromeMock;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete global.chrome;
  });

  test("sets toggle to checked when storage enabled is true", () => {
    chromeMock._store.enabled = true;
    const { initPopup } = require("../popup");
    const toggle = initPopup();
    expect(toggle.checked).toBe(true);
  });

  test("sets toggle to unchecked when storage enabled is false", () => {
    chromeMock._store.enabled = false;
    document.getElementById("toggle").checked = true;
    const { initPopup } = require("../popup");
    const toggle = initPopup();
    expect(toggle.checked).toBe(false);
  });

  test("updates storage when toggle is changed to unchecked", () => {
    const { initPopup } = require("../popup");
    const toggle = initPopup();
    toggle.checked = false;
    toggle.dispatchEvent(new Event("change"));
    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
      enabled: false,
    });
  });

  test("updates storage when toggle is changed to checked", () => {
    chromeMock._store.enabled = false;
    const { initPopup } = require("../popup");
    const toggle = initPopup();
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change"));
    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
      enabled: true,
    });
  });
});
