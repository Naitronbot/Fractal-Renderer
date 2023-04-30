declare const MathQuill: any;
const MQ = MathQuill.getInterface(2);
const MQ_CONTAINER = document.getElementById("mqInput");
const INPUT_GRID = document.getElementById("inputGrid");
const INPUT_ELEMENTS = INPUT_GRID?.children as HTMLCollection;
const MQ_FIELD = MQ.MathField(MQ_CONTAINER, {
    restrictMismatchedBrackets: true,
    autoCommands: 'pi sqrt Gamma',
    // TODO IMPLIMENT LOG
    autoOperatorNames: 'sin cos tan csc sec cot sinh cosh tanh csch sech coth arg arcsin arccos arctan arccsc arcsec arccot ln log exp cis floor round ceil conj Re Im',
    supSubsRequireOperand: true,
    handlers: {
        edit: fieldEdit
    }
});
const ERROR_BOX = document.getElementById("errorBox") as HTMLElement;

MQ_FIELD.latex(viewport.settings.equation);

function fieldEdit() {
    viewport.settings.equation = MQ_FIELD.latex();
    fixGrid();
    let ast = parse();
    if (ast) {
        currentAST = ast;
        setup(false);
    }
}

function logLatex() {
    console.log(viewport.settings.equation);
}

function logTokens() {
    let tokenStream = new TokenStream(viewport.settings.equation);
    let tokens = [];
    while (tokenStream.hasNext()) {
        let next = tokenStream.next();
        tokens.push(next);
    }
    console.log(tokens);
}

function logGLSL() {
    console.log(recursiveDecompose(parse()!));
}

function logShader() {
    console.log(getFragment(parse()!, viewport.settings));
}

function fixGrid() {
    let totalWidth = INPUT_ELEMENTS[0].clientWidth + INPUT_ELEMENTS[1].clientWidth + INPUT_ELEMENTS[2].clientWidth;
    if (totalWidth > canvas.clientWidth) {
        INPUT_GRID?.classList.add("input-correction");
    } else {
        INPUT_GRID?.classList.remove("input-correction");
    }
}