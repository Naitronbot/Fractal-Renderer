import { loadQueryParams } from "state";
import { UIElements } from "ui";
import { initializeMQ } from "input";
import { RenderContext } from "render";
import 'events';
import 'debug';

// Load URL Params
loadQueryParams();

// Update UI to match loaded query params
UIElements.setDefaults();
UIElements.toggleColoringActive();

// Initialize Rendering context
RenderContext.initialize();

// Fit Canvas to current viewport
RenderContext.resize();

// Initialize MathQuill Field
initializeMQ();