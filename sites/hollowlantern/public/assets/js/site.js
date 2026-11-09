// Theme: follows the system until the visitor picks one; the choice is kept in localStorage.
(function () {
  var root = document.documentElement;
  var media = window.matchMedia("(prefers-color-scheme: light)");
  var stored = null;
  try {
    stored = localStorage.getItem("theme");
  } catch {
    // Storage can be blocked; the theme still applies for this page.
  }
  if (stored !== "light" && stored !== "dark") stored = null;

  function apply(theme) {
    root.setAttribute("data-theme", theme);
  }
  apply(stored || (media.matches ? "light" : "dark"));

  media.addEventListener("change", function (event) {
    if (!stored) apply(event.matches ? "light" : "dark");
    label();
  });

  var button;
  function label() {
    if (!button) return;
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    button.setAttribute("aria-label", "Switch to " + next + " theme");
    button.setAttribute("title", "Switch to " + next + " theme");
  }

  document.addEventListener("DOMContentLoaded", function () {
    button = document.querySelector(".theme-toggle");
    if (!button) return;
    button.hidden = false;
    label();
    button.addEventListener("click", function () {
      stored = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      apply(stored);
      label();
      try {
        localStorage.setItem("theme", stored);
      } catch {
        // Storage can be blocked; the theme still applies for this page.
      }
    });
  });
})();
