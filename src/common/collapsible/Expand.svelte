<script lang="ts">
  import { tweened } from "svelte/motion";

  export let open = false;

  const rot = tweened(-90, { duration: 100, delay: 0 });
  $: rot.set(+!open * -90);
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  height="24"
  viewBox="0 -960 960 960"
  width="24"
  transform={`rotate(${$rot})`}
  fill="white"
  ><path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z" /></svg
>
