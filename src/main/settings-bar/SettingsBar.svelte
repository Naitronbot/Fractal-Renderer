<script lang="ts">
  import Collapsible from "src/common/collapsible/Collapsible.svelte";
  import Slider from "src/common/slider/Slider.svelte";
  import { FractalState } from "src/main/FractalState";
  import defaultSettings from "./settings";

  export let fractalState: FractalState;
  export let settings = defaultSettings;
</script>

{#each settings as category}
  <Collapsible title={category.name} open>
    {#each category.properties as property}
      {#if property.type === "slider"}
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
