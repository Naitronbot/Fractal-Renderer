<script lang="ts">
  import { slide } from "svelte/transition";
  import Expand from "./Expand.svelte";

  export let title: string;
  export let open = false;
</script>

<button on:click={() => (open = !open)}>
  <Expand bind:open />
  <h2>{title}</h2>
</button>
{#if open}
  <div transition:slide={{ duration: 100, delay: 0 }}>
    <slot />
  </div>
{/if}

<style src="./Collapsible.css"></style>
