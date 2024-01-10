<script lang="ts">
  import SlidersBar from "./sliders-bar/SlidersBar.svelte";
  import FractalWindow from "./fractal-window/FractalWindow.svelte";
  import FractalSettings from "./fractal-settings/FractalSettings.svelte";
  import TopBar from "./top-bar/TopBar.svelte";
</script>

<main>
  <div id="topBar">
    <TopBar />
  </div>
  <aside id="sidebar">
    <SlidersBar />
  </aside>
  <div id="fractalWindow">
    <FractalWindow />
  </div>
  <div id="fractalSettings">
    <FractalSettings />
  </div>
</main>

<style src="./Main.css"></style>
