<script lang="ts">
  import Collapsible from "src/common/collapsible/Collapsible.svelte";

  export let title: string;
  export let open = false;
</script>

<Collapsible {title} {open}>
  <p>Test slot</p>
</Collapsible>
