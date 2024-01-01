<script lang="ts">
  import MQ, { type MathQuill } from "mathquill/mathquill.ts";
  import { config } from "./MathFieldConfig";

  export let value = "";
  export let mathField: MathQuill.v3.EditableMathQuill | undefined = undefined;

  let rawValue = "";

  $: if (mathField && rawValue !== value) {
    mathField.latex(value);
  }

  function createField(element: HTMLElement) {
    mathField = MQ.MathField(element, {
      handlers: {
        edited: onEdit,
      },
      ...config,
    });
  }

  function onEdit() {
    rawValue = mathField!.latex();
    value = rawValue;
  }
</script>

<div use:createField></div>

<style src="./MathField.css"></style>
