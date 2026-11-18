// jsdom has no layout, so it leaves out scrollIntoView and ResizeObserver. The Spartan combobox
// uses both to keep its popup in view and as wide as its input; no-ops are enough because the
// tests check choices, not scrolling or sizes.
Element.prototype.scrollIntoView ??= () => undefined;
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};
