import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

if (!globalThis.navigator) {
  globalThis.navigator = {};
}

if (!globalThis.navigator.clipboard) {
  globalThis.navigator.clipboard = {
    writeText: async () => {},
  };
}

if (!globalThis.HTMLElement.prototype.scrollIntoView) {
  globalThis.HTMLElement.prototype.scrollIntoView = () => {};
}
