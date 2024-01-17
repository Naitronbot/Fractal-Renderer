<script lang="ts">
  import SlidersBar from "./sliders-bar/SlidersBar.svelte";
  import FractalWindow from "./fractal-window/FractalWindow.svelte";
  import TopBar from "./top-bar/TopBar.svelte";
  import SettingsBar from "./settings-bar/SettingsBar.svelte";
  import { FractalState } from "./state";

  export const fractalState = new FractalState();

  $: fractalState.equation, console.log(fractalState.equation);
</script>

<main>
  <div id="topBar">
    <TopBar bind:equation={fractalState.equation} />
  </div>
  <aside id="sidebar">
    <SlidersBar />
  </aside>
  <div id="fractalWindow">
    <FractalWindow />
  </div>
  <div id="settingsBar">
    <SettingsBar {fractalState} />
  </div>
</main>

<style src="./Main.css"></style>
