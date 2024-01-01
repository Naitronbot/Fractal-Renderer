import Main from "./main/Main.svelte";
import "./main/global.css";
import "mathquill/mathquill-basic.css";

const main = new Main({
  target: document.getElementById("Main")!,
});

export default main;
