<script lang="ts">
  import Collapsible from "src/common/collapsible/Collapsible.svelte";
  import Slider from "src/common/slider/Slider.svelte";
  import { FractalState } from "src/main/state";
  import { categories } from "./SettingsBar";

  export let fractalState: FractalState;
</script>

{#each categories as category}
  <Collapsible title={category.name}>
    {#each category.properties as property}
      {#if property.type === "number"}
        <Slider
          title={property.name}
          min={property.min}
          max={property.max}
          bind:value={fractalState[property.key]}
          step={property.step}
        />
      {/if}
    {/each}
  </Collapsible>
{/each}

<style src="./SettingsBar.css"></style>
