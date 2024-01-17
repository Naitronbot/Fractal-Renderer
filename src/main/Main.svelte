<script lang="ts">
  import SlidersBar from "./sliders-bar/SlidersBar.svelte";
  import FractalWindow from "./fractal-window/FractalWindow.svelte";
  import TopBar from "./top-bar/TopBar.svelte";
  import SettingsBar from "./settings-bar/SettingsBar.svelte";

  export const fractalState = {};
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
  <div id="settingsBar">
    <SettingsBar />
  </div>
</main>

<style src="./Main.css"></style>
