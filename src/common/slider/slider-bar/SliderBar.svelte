<script lang="ts">
  export let value: number;
  export let min: number;
  export let max: number;
  export let step: number | undefined;

  let pos = valueToPos(value);
  $: pos = valueToPos(value);

  function posToValue(x: number) {
    return min + x * (max - min);
  }

  function valueToPos(x: number) {
    return (x - min) / (max - min);
  }

  function clamp(x: number) {
    if (x > 1) x = 1;
    else if (x < 0) x = 0;
    return x;
  }

  function snap(x: number) {
    if (step) {
      return step * Math.round(x / step);
    }
    return x;
  }

  function setValue(x: number) {
    x = clamp(x);
    x = posToValue(x);
    x = snap(x);
    x = Math.round(1000 * x) / 1000;
    value = x;
  }

  let wrapper: HTMLDivElement;
  let mouseDown = false;

  function moveKnob(e: MouseEvent) {
    if (!mouseDown) return;
    e.preventDefault();
    const pos =
      (e.clientX - wrapper.getBoundingClientRect().left) / wrapper.clientWidth;
    setValue(pos);
  }

  function touchMoveKnob(e: TouchEvent) {
    if (!mouseDown || e.touches.length > 1) return;
    e.preventDefault();
    const pos =
      (e.touches[0].clientX - wrapper.getBoundingClientRect().left) /
      wrapper.clientWidth;
    setValue(pos);
  }

  function setKnob(e: MouseEvent) {
    e.preventDefault();
    const pos = e.offsetX / wrapper.clientWidth;
    setValue(pos);
  }

  function keypressMoveKnob(e: KeyboardEvent) {
    const currentStep = step ?? (max - min) / 10;
    let deltaX: number;
    if (e.code === "ArrowLeft") {
      deltaX = -currentStep;
    } else if (e.code === "ArrowRight") {
      deltaX = currentStep;
    } else {
      return;
    }
    e.preventDefault();
    const x = valueToPos(value + deltaX);
    setValue(x);
  }
</script>

<svelte:window
  on:mousemove={moveKnob}
  on:touchmove={touchMoveKnob}
  on:mouseup={() => (mouseDown = false)}
  on:touchend={() => (mouseDown = false)}
/>

<div
  class="slider-wrapper"
  on:click={setKnob}
  on:mousedown={() => (mouseDown = true)}
  on:touchstart={() => (mouseDown = true)}
  on:keydown={keypressMoveKnob}
  bind:this={wrapper}
  role="slider"
  tabindex="0"
  aria-valuenow={value}
  aria-valuemin={min}
  aria-valuemax={max}
>
  <div class="slider-bar"></div>
  <div class="slider-knob" style={`left: ${100 * clamp(pos)}%`}></div>
</div>

<style src="./SliderBar.css"></style>
