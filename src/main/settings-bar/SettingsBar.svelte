<script lang="ts">
  import Collapsible from "src/common/collapsible/Collapsible.svelte";
  import Slider from "src/common/slider/Slider.svelte";

  let val = 9;
</script>

<Collapsible title="Open Me!">
  <Slider title="Test" min={2} max={8} bind:value={val} step={undefined} />
</Collapsible>

<style src="./SettingsBar.css"></style>
