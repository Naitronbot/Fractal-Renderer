import { loadQueryParams, pageState } from "state";
import { UIElements } from "ui";
import { initializeMQ } from "input";
import { Parser } from "parser";
import { RenderContext } from "render";
import 'events';
import 'debug';

loadQueryParams();
UIElements.setDefaults();
UIElements.toggleColoringActive();
const parser = new Parser(pageState.settings.equation);
parser.parse();
new RenderContext();
RenderContext.current.resize();
initializeMQ();