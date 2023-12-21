import Main from "./Main.svelte";
import "./global.css";
import "/mathquill/mathquill-basic.css";

const main = new Main({
  target: document.getElementById("Main")!,
});

export default main;
