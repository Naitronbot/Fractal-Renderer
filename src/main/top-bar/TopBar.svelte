<script lang="ts">
  import MathField from "src/common/math-field/MathField.svelte";

  export let equation: string;
</script>

<MathField bind:value={equation} />

<style src="./TopBar.css"></style>
