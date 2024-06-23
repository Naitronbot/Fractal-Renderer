<script lang="ts">
  import SliderBar from "./slider-bar/SliderBar.svelte";

  export let title: string;
  export let value: number;
  export let min: number;
  export let max: number;
  export let step: number | undefined = undefined;
</script>

<div class="slider">
  <h3>{title}</h3>
  <SliderBar bind:value bind:min bind:max bind:step />
  <input type="number" {step} bind:value />
</div>

<style src="./Slider.css"></style>
