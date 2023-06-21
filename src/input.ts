declare const MathQuill: any;
const MAIN = document.getElementById("main") as HTMLElement;
const MQ = MathQuill.getInterface(2);
const MQ_CONTAINER = document.getElementById("mqInput") as HTMLElement;
const INPUT_GRID = document.getElementById("inputGrid") as HTMLElement;
const CANVAS_WRAPPER = document.getElementById("canvasWrapper")!;
const INPUT_ELEMENTS = INPUT_GRID.children as HTMLCollection;
const MQ_FIELD = MQ.MathField(MQ_CONTAINER, {
    restrictMismatchedBrackets: true,
    autoCommands: 'pi sqrt Gamma',
    autoOperatorNames: 'sin cos tan csc sec cot sinh cosh tanh csch sech coth arcsin arccos arctan arccsc arcsec arccot arcsinh arccosh arctanh arccsch arcsech arccoth ln log abs arg sign sgn exp cis floor round ceil conj Re Im',
    supSubsRequireOperand: true,
    handlers: {
        edit: fieldEdit
    }
});
let hasSidebar = true;

MQ_FIELD.latex(settings.equation);
MQ_CONTAINER.addEventListener("keypress", e => {
    if (e.key === "Enter") {
        updateSidebar();
    }
});

function fieldEdit() {
    fixGrid();
    let parsed = new Parser(MQ_FIELD.latex()).parse();
    if (parsed) {
        setup(false);
    }
}

function logLatex() {
    console.log(settings.equation);
}

function logTokens() {
    let tokenStream = new TokenStream(settings.equation);
    let tokens = [];
    while (tokenStream.hasNext()) {
        let next = tokenStream.next();
        tokens.push(next);
    }
    console.log(tokens);
}

function logAST() {
    console.log(Parser.current.ast);
}

function logGLSL() {
    console.log(recursiveDecompose(Parser.current.ast));
}

function logShader() {
    let parser = new Parser(settings.equation);
    let parsed = parser.parse()!;
    console.log(getFragment());
}

function fixGrid() {
    if (window.innerWidth >= 1000 && !hasSidebar) {
        SIDEBAR.remove();
        document.body.prepend(SIDEBAR);
        SIDEBAR.classList.remove("hidden");
        INPUT_GRID.classList.remove("hidden");
        SLIDERS_TOGGLE.style.display = "none";
        hasSidebar = true;
    } else if (window.innerWidth <= 1000 && hasSidebar) {
        SIDEBAR.remove();
        MAIN.append(SIDEBAR);
        SIDEBAR.classList.add("hidden");
        SLIDERS_TOGGLE.style.display = "";
        hasSidebar = false;
    }

    if (window.innerWidth <= 800) {
        return;
    }
    let totalWidth = INPUT_ELEMENTS[0].clientWidth + INPUT_ELEMENTS[1].clientWidth + INPUT_ELEMENTS[2].clientWidth;
    if (totalWidth + 20 > canvas.clientWidth) {
        INPUT_GRID?.classList.add("input-correction");
        CANVAS_WRAPPER?.classList.add("input-correction");
    } else {
        INPUT_GRID?.classList.remove("input-correction");
        CANVAS_WRAPPER?.classList.remove("input-correction");
    }
    requestAnimationFrame(draw);
}