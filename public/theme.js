(function () {
  try {
    var saved = localStorage.getItem("mw.theme");
    if (saved === "dark" || saved === "light") {
      document.documentElement.dataset.theme = saved;
    }
  } catch (e) {}
})();