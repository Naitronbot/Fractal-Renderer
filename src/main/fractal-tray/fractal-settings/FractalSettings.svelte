<script lang="ts">
  import Slider from "src/common/slider/SliderBar.svelte";
  import { stateDescription } from "src/state/fractal-state";
  import type { FractalProperty } from "src/state/fractal-state-types";

  const categories: Record<
    FractalProperty["category"],
    (FractalProperty & { name: string })[]
  > = {};

  for (const [property, value] of Object.entries(stateDescription)) {
    const newVal: FractalProperty & { name: string } = {
      ...value,
      name: property,
    };
    if (value.category in categories) {
      categories[value.category].push(newVal);
    } else {
      categories[value.category] = [newVal];
    }
  }

  console.log(categories);

  let activeCategory = "Fractal Settings";
</script>

<div class="settings-wrapper">
  <div class="sidebar">
    {#each Object.keys(categories) as category}
      <button
        on:click={() => {
          activeCategory = category;
        }}>{category}</button
      >
    {/each}
  </div>
  <div>
    {#each Object.keys(categories) as category}
      {#if activeCategory === category}
        <div style="overflow-wrap: anywhere;">
          {JSON.stringify(categories[category])}
        </div>
      {/if}
    {/each}
  </div>
  <!-- <Slider min={0} max={10} value={5}></Slider> -->
</div>

<style src="./FractalSettings.css"></style>
