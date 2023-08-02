import { loadQueryParams } from "state";
import { UIElements } from "ui";
import { initializeMQ } from "input";
import { RenderContext } from "render";
import 'events';
import 'debug';

loadQueryParams();
UIElements.setDefaults();
UIElements.toggleColoringActive();
new RenderContext();
RenderContext.current.resize();
initializeMQ();