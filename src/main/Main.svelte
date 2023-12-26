<script lang="ts">
  import Sidebar from "./sidebar/Sidebar.svelte";
  import FractalWindow from "./fractal-window/FractalWindow.svelte";
  import FractalSettings from "./fractal-settings/FractalSettings.svelte";

  let mainWidth: number;
</script>

<main bind:clientWidth={mainWidth} class={mainWidth <= 750 ? "mobile" : ""}>
  <aside id="sidebar">
    <Sidebar />
  </aside>
  <div id="fractalWindow">
    <FractalWindow />
  </div>
  <div id="fractalSettings">
    <FractalSettings />
  </div>
</main>

<style src="./Main.css"></style>
