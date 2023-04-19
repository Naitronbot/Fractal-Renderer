declare const MathQuill: any;
const MQ = MathQuill.getInterface(2);
const MQ_CONTAINER = document.getElementById("mqInput");
const MQ_FIELD = MQ.MathField(MQ_CONTAINER, {
    restrictMismatchedBrackets: true,
    autoCommands: 'pi sqrt',
    autoOperatorNames: 'sin cos tan csc sec cot sinh cosh tanh csch sech coth arg arcsin arccos arctan arccsc arcsec arccot ln log exp floor round ceil Re Im',
    supSubsRequireOperand: true,
    handlers: {
        edit: parse
    }
});

function logLatex() {
    console.log(MQ_FIELD.latex());
}

function logTokens() {
    let tokenStream = new TokenStream(MQ_FIELD.latex());
    let tokens = [];
    while (tokenStream.hasNext()) {
        let next = tokenStream.next();
        tokens.push(next);
        if (next instanceof ParseError) {
            console.log(next.name + ": " + next.message);
            break;
        }
    }
    console.log(tokens);
}