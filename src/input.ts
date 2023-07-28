import { Parser } from "parser";
import { pageState } from "state";
import { UIElements } from "ui";
import { RenderContext } from "render";
import { updateSidebar } from "sliders";

declare const MathQuill: any;
const MQ = MathQuill.getInterface(2);
const MQ_FIELD = MQ.MathField(UIElements.mqInput, {
    restrictMismatchedBrackets: true,
    autoCommands: 'pi sqrt Gamma',
    autoOperatorNames: 'sin cos tan csc sec cot sinh cosh tanh csch sech coth arcsin arccos arctan arccsc arcsec arccot arcsinh arccosh arctanh arccsch arcsech arccoth ln log abs arg sign sgn exp cis floor round ceil conj Re Im',
    supSubsRequireOperand: true,
    handlers: {
        edit: fieldEdit
    }
});

export function initializeMQ() {
    MQ_FIELD.latex(pageState.settings.equation);
    UIElements.mqInput.addEventListener("keypress", e => {
        if (e.key === "Enter") {
            updateSidebar();
        }
    });
}

function fieldEdit() {
    UIElements.fixGrid();
    let parsed = new Parser(MQ_FIELD.latex()).parse();
    if (parsed) {
        RenderContext.current.setup(false);
    }
}