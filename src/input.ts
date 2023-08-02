import { Parser } from "parser";
import { pageState, setExpressionState } from "state";
import { UIElements } from "ui";
import { RenderContext } from "render";
import { manageVariables, updateSidebar } from "sliders";

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
    let parsed = Parser.parse(MQ_FIELD.latex());
    setExpressionState(parsed);
    if (parsed.type === "error") {
        UIElements.errorBox.show(parsed.error?.name!, parsed.error?.message!);
    } else {
        UIElements.errorBox.hide();
    }
    manageVariables();
    pageState.settings.equation = MQ_FIELD.latex();
    RenderContext.current.setup(false);
}